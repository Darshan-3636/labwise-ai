import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import Editor from "@monaco-editor/react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  enterFullscreen,
  exitFullscreen,
  isFullscreen,
  generateResumeCode,
} from "@/lib/proctor";
import { runCode } from "@/lib/piston";
import {
  generateVivaQuestions,
  gradeCode,
  gradeVivaAnswer,
} from "@/lib/ai.functions";
import {
  Play,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertTriangle,
  Lock,
  Brain,
  Loader2,
  Terminal,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Test = Database["public"]["Tables"]["tests"]["Row"];
type Question = Database["public"]["Tables"]["test_questions"]["Row"];
type Attempt = Database["public"]["Tables"]["test_attempts"]["Row"];
type Submission = Database["public"]["Tables"]["code_submissions"]["Row"];
type Viva = Database["public"]["Tables"]["viva_responses"]["Row"];

export const Route = createFileRoute("/student/exam/$attemptId")({
  component: ExamIDE,
});

function ExamIDE() {
  const { attemptId } = useParams({ from: "/student/exam/$attemptId" });
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [code, setCode] = useState("");
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState("");
  const [stderr, setStderr] = useState("");
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [pauseCode, setPauseCode] = useState("");
  const [resumeInput, setResumeInput] = useState("");
  const [vivaList, setVivaList] = useState<Viva[]>([]);
  const [generatingViva, setGeneratingViva] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<"problem" | "viva">("problem");
  const [started, setStarted] = useState(false);

  const codeStartRef = useRef<number>(0);
  const lastSavedRef = useRef<string>("");

  /* ─────────── load ─────────── */
  useEffect(() => {
    if (loading || !user) return;
    (async () => {
      const { data: a } = await supabase
        .from("test_attempts")
        .select("*")
        .eq("id", attemptId)
        .maybeSingle();
      if (!a) {
        toast.error("Attempt not found");
        navigate({ to: "/student" });
        return;
      }
      setAttempt(a);
      setPaused(a.status === "paused");
      if (a.status === "submitted") {
        toast.info("Already submitted");
        navigate({ to: "/student" });
        return;
      }

      const { data: t } = await supabase.from("tests").select("*").eq("id", a.test_id).maybeSingle();
      setTest(t);
      const { data: qs } = await supabase
        .from("test_questions")
        .select("*")
        .eq("test_id", a.test_id)
        .order("position");
      setQuestions(qs ?? []);

      const { data: subs } = await supabase
        .from("code_submissions")
        .select("*")
        .eq("attempt_id", a.id);
      const map: Record<string, Submission> = {};
      (subs ?? []).forEach((s) => (map[s.question_id] = s));
      setSubmissions(map);
    })();
  }, [user, loading, attemptId, navigate]);

  /* ─────────── set code when question changes ─────────── */
  useEffect(() => {
    const q = questions[qIndex];
    if (!q) return;
    const sub = submissions[q.id];
    setCode(sub?.code ?? q.starter_code ?? "");
    setStdin(q.sample_input ?? "");
    setOutput(sub?.last_output ?? "");
    setStderr(sub?.last_stderr ?? "");
    codeStartRef.current = Date.now();
    lastSavedRef.current = sub?.code ?? "";
    void loadViva(sub?.id);
  }, [qIndex, questions, submissions]);

  const loadViva = async (subId?: string) => {
    if (!subId) {
      setVivaList([]);
      return;
    }
    const { data } = await supabase
      .from("viva_responses")
      .select("*")
      .eq("submission_id", subId)
      .order("question_index");
    setVivaList(data ?? []);
  };

  /* ─────────── proctoring ─────────── */
  const triggerViolation = useCallback(
    async (type: string) => {
      if (!attempt || paused) return;
      const rc = generateResumeCode();
      setPauseCode(rc);
      setPaused(true);
      await Promise.all([
        supabase
          .from("test_attempts")
          .update({ status: "paused", pause_code: rc, violation_count: attempt.violation_count + 1 })
          .eq("id", attempt.id),
        supabase.from("proctor_violations").insert({
          attempt_id: attempt.id,
          violation_type: type,
          resume_code: rc,
        }),
      ]);
      setAttempt({ ...attempt, status: "paused", violation_count: attempt.violation_count + 1, pause_code: rc });
      void exitFullscreen();
    },
    [attempt, paused],
  );

  useEffect(() => {
    if (!started || paused || !attempt) return;
    const onFs = () => {
      if (!isFullscreen()) void triggerViolation("fullscreen_exit");
    };
    const onVis = () => {
      if (document.hidden) void triggerViolation("tab_switch");
    };
    const onBlur = () => void triggerViolation("window_blur");
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
    };
  }, [started, paused, attempt, triggerViolation]);

  /* ─────────── auto-save code ─────────── */
  useEffect(() => {
    if (!started || paused) return;
    const q = questions[qIndex];
    if (!q || !attempt) return;
    if (code === lastSavedRef.current) return;

    const t = setTimeout(async () => {
      const existing = submissions[q.id];
      if (existing) {
        await supabase
          .from("code_submissions")
          .update({ code })
          .eq("id", existing.id);
        setSubmissions({ ...submissions, [q.id]: { ...existing, code } });
      } else {
        const { data } = await supabase
          .from("code_submissions")
          .insert({
            attempt_id: attempt.id,
            question_id: q.id,
            code,
            language: test?.language ?? "python",
          })
          .select()
          .single();
        if (data) setSubmissions({ ...submissions, [q.id]: data });
      }
      lastSavedRef.current = code;
    }, 800);
    return () => clearTimeout(t);
  }, [code, qIndex, questions, submissions, attempt, test, started, paused]);

  /* ─────────── start exam ─────────── */
  const beginExam = async () => {
    setStarted(true);
    await enterFullscreen();
  };

  /* ─────────── resume from pause ─────────── */
  const handleResume = async () => {
    if (!attempt || resumeInput.trim().toUpperCase() !== pauseCode) {
      toast.error("Wrong resume code");
      return;
    }
    await supabase
      .from("test_attempts")
      .update({ status: "in_progress", pause_code: null })
      .eq("id", attempt.id);
    setPaused(false);
    setPauseCode("");
    setResumeInput("");
    setAttempt({ ...attempt, status: "in_progress", pause_code: null });
    await enterFullscreen();
    toast.success("Resumed");
  };

  /* ─────────── run code ─────────── */
  const handleRun = async () => {
    if (!test) return;
    setRunning(true);
    setOutput("");
    setStderr("");
    try {
      const r = await runCode(test.language, code, stdin);
      setOutput(r.stdout);
      setStderr(r.stderr);
      const q = questions[qIndex];
      const sub = submissions[q.id];
      if (sub) {
        const tts = Math.floor((Date.now() - codeStartRef.current) / 1000);
        await supabase
          .from("code_submissions")
          .update({
            last_output: r.stdout,
            last_stderr: r.stderr,
            time_to_solve_seconds: tts,
            paste_flagged: tts < 5 && code.length > 200,
          })
          .eq("id", sub.id);
      }
    } catch (e) {
      setStderr(e instanceof Error ? e.message : "Run failed");
    } finally {
      setRunning(false);
    }
  };

  /* ─────────── generate viva ─────────── */
  const handleGenerateViva = async () => {
    const q = questions[qIndex];
    const sub = submissions[q.id];
    if (!sub || !test) return;
    if (!code.trim()) {
      toast.error("Write some code first");
      return;
    }
    setGeneratingViva(true);
    try {
      const res = await generateVivaQuestions({
        data: {
          code,
          language: test.language,
          questionTitle: q.title,
          strictness: test.strictness,
        },
      });
      if (res.error || !res.questions.length) {
        if (res.error === "RATE_LIMIT") toast.error("AI rate limit reached. Try again in a minute.");
        else if (res.error === "PAYMENT_REQUIRED") toast.error("AI credits exhausted. Contact admin.");
        else toast.error("Could not generate viva questions");
        return;
      }
      // delete any prior, insert fresh
      await supabase.from("viva_responses").delete().eq("submission_id", sub.id);
      const inserts = res.questions.map((qt, i) => ({
        submission_id: sub.id,
        question_index: i,
        question_text: qt,
      }));
      const { data } = await supabase.from("viva_responses").insert(inserts).select();
      setVivaList(data ?? []);
      setTab("viva");
      toast.success("Viva questions ready");
    } finally {
      setGeneratingViva(false);
    }
  };

  const updateVivaAnswer = async (vivaId: string, answer: string) => {
    setVivaList(vivaList.map((v) => (v.id === vivaId ? { ...v, student_answer: answer } : v)));
    await supabase.from("viva_responses").update({ student_answer: answer }).eq("id", vivaId);
  };

  /* ─────────── final submit ─────────── */
  const handleFinalSubmit = async () => {
    if (!attempt || !test) return;
    if (!confirm("Submit your final test? You cannot edit after this.")) return;
    setSubmitting(true);
    try {
      // Grade every submission's code & viva
      const subs = Object.values(submissions);
      let totalCode = 0;
      let codeCount = 0;
      let totalViva = 0;
      let vivaCount = 0;

      for (const sub of subs) {
        const q = questions.find((x) => x.id === sub.question_id);
        if (!q) continue;
        // grade code
        const cg = await gradeCode({
          data: {
            code: sub.code,
            language: test.language,
            questionTitle: q.title,
            questionDescription: q.description,
            expectedOutput: q.expected_output ?? "",
            actualOutput: sub.last_output ?? "",
            strictness: test.strictness,
          },
        });
        await supabase
          .from("code_submissions")
          .update({ ai_score: cg.score, ai_feedback: cg.feedback })
          .eq("id", sub.id);
        totalCode += cg.score;
        codeCount++;

        // grade viva for this submission
        const { data: vs } = await supabase
          .from("viva_responses")
          .select("*")
          .eq("submission_id", sub.id);
        for (const v of vs ?? []) {
          const vg = await gradeVivaAnswer({
            data: {
              question: v.question_text,
              answer: v.student_answer ?? "",
              code: sub.code,
              strictness: test.strictness,
            },
          });
          await supabase
            .from("viva_responses")
            .update({
              ai_score: vg.score,
              ai_feedback: vg.feedback,
              flagged_injection: vg.flagged_injection,
              needs_review: vg.needs_review,
            })
            .eq("id", v.id);
          totalViva += vg.score;
          vivaCount++;
        }
      }

      const codeAvg = codeCount ? totalCode / codeCount : 0;
      const vivaAvg = vivaCount ? totalViva / vivaCount : 0;
      const final = codeAvg * Number(test.code_weight) + vivaAvg * Number(test.viva_weight);

      await supabase
        .from("test_attempts")
        .update({
          status: "submitted",
          submitted_at: new Date().toISOString(),
          code_score: codeAvg,
          viva_score: vivaAvg,
          final_score: final,
        })
        .eq("id", attempt.id);

      void exitFullscreen();
      toast.success("Test submitted!");
      navigate({ to: "/student" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  /* ─────────── render ─────────── */
  if (loading || !attempt || !test) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!started) {
    return <PreExamGate test={test} attempt={attempt} onStart={beginExam} />;
  }

  if (paused) {
    return (
      <PausedScreen
        attempt={attempt}
        resumeInput={resumeInput}
        setResumeInput={setResumeInput}
        onResume={handleResume}
      />
    );
  }

  const q = questions[qIndex];
  if (!q) return <div className="p-10 text-center">No questions</div>;

  const sub = submissions[q.id];
  const monacoLang = test.language === "c" ? "c" : test.language === "java" ? "java" : "python";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* exam header */}
      <header className="border-b border-border/50 bg-background/95 backdrop-blur z-50">
        <div className="px-4 h-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Terminal className="w-4 h-4 text-primary" />
            <span className="font-mono text-sm font-bold">labcode.ai</span>
            <Badge variant="outline" className="font-mono text-[10px] uppercase border-destructive/40 text-destructive">
              <Lock className="w-3 h-3 mr-1" /> proctored
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-muted-foreground">{attempt.student_full_name}</span>
            <span className="text-muted-foreground">·</span>
            <span>
              Q{qIndex + 1}/{questions.length}
            </span>
            {attempt.violation_count > 0 && (
              <Badge variant="outline" className="gap-1 text-warning border-warning/50">
                <AlertTriangle className="w-3 h-3" /> {attempt.violation_count}
              </Badge>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 grid lg:grid-cols-2 gap-0 overflow-hidden">
        {/* LEFT: problem / viva */}
        <div className="border-r border-border/50 flex flex-col overflow-hidden">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="rounded-none border-b border-border/50 bg-transparent justify-start px-2">
              <TabsTrigger value="problem">Problem</TabsTrigger>
              <TabsTrigger value="viva" className="gap-1.5">
                <Brain className="w-3.5 h-3.5" /> Viva {vivaList.length > 0 && `(${vivaList.length})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="problem" className="flex-1 overflow-y-auto p-5 m-0">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-mono text-primary uppercase tracking-wider mb-1">
                    Question {qIndex + 1}
                  </p>
                  <h2 className="text-xl font-bold">{q.title}</h2>
                </div>
                <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-foreground/90">
                  {q.description}
                </div>
                {q.sample_input && (
                  <Card className="bg-terminal p-3 border-border/50">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Sample input</p>
                    <pre className="text-xs font-mono whitespace-pre-wrap">{q.sample_input}</pre>
                  </Card>
                )}
                {q.expected_output && (
                  <Card className="bg-terminal p-3 border-border/50">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Expected output</p>
                    <pre className="text-xs font-mono whitespace-pre-wrap">{q.expected_output}</pre>
                  </Card>
                )}
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleGenerateViva}
                  disabled={generatingViva || !sub?.last_output}
                >
                  {generatingViva ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                  {generatingViva
                    ? "Generating viva…"
                    : sub?.last_output
                      ? vivaList.length
                        ? "Regenerate viva"
                        : "Generate viva from your code"
                      : "Run your code first to unlock viva"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="viva" className="flex-1 overflow-y-auto p-5 m-0 space-y-3">
              {vivaList.length === 0 ? (
                <p className="text-sm text-muted-foreground font-mono">
                  // generate viva from the Problem tab
                </p>
              ) : (
                vivaList.map((v, i) => (
                  <Card key={v.id} className="p-4 bg-gradient-card border-border/50 space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="font-mono text-xs text-primary mt-0.5">Q{i + 1}</span>
                      <p className="text-sm font-medium flex-1">{v.question_text}</p>
                    </div>
                    <Textarea
                      placeholder="Your answer…"
                      value={v.student_answer ?? ""}
                      onChange={(e) => updateVivaAnswer(v.id, e.target.value)}
                      rows={3}
                      className="text-sm"
                    />
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* RIGHT: editor + I/O */}
        <div className="flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/50 px-3 py-2 bg-card/50">
            <span className="text-xs font-mono text-muted-foreground uppercase">
              main.{test.language === "c" ? "c" : test.language === "java" ? "java" : "py"}
            </span>
            <Button size="sm" onClick={handleRun} disabled={running} className="gap-1.5 h-7">
              {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              Run
            </Button>
          </div>
          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              language={monacoLang}
              theme="vs-dark"
              value={code}
              onChange={(v) => setCode(v ?? "")}
              options={{
                fontSize: 14,
                fontFamily: "JetBrains Mono, Fira Code, monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                contextmenu: false,
                automaticLayout: true,
              }}
            />
          </div>
          <div className="border-t border-border/50 grid grid-cols-2 max-h-64 min-h-32">
            <div className="border-r border-border/50 flex flex-col">
              <div className="text-[10px] font-mono text-muted-foreground uppercase px-3 py-1.5 border-b border-border/50">
                stdin
              </div>
              <Textarea
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                className="flex-1 rounded-none border-0 resize-none font-mono text-xs bg-terminal"
                placeholder="(input)"
              />
            </div>
            <div className="flex flex-col bg-terminal">
              <div className="text-[10px] font-mono text-muted-foreground uppercase px-3 py-1.5 border-b border-border/50">
                output
              </div>
              <pre className="flex-1 overflow-auto p-3 text-xs font-mono text-terminal-foreground whitespace-pre-wrap">
                {output}
                {stderr && <span className="text-destructive">{"\n"}{stderr}</span>}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* footer / nav */}
      <footer className="border-t border-border/50 bg-card/50 px-4 py-2.5 flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setQIndex(Math.max(0, qIndex - 1))}
            disabled={qIndex === 0}
            className="gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setQIndex(Math.min(questions.length - 1, qIndex + 1))}
            disabled={qIndex === questions.length - 1}
            className="gap-1"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
        <Button onClick={handleFinalSubmit} disabled={submitting} className="gap-1.5 shadow-glow">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {submitting ? "Grading…" : "Submit final"}
        </Button>
      </footer>
    </div>
  );
}

/* ─────────── pre-exam consent ─────────── */
function PreExamGate({
  test,
  attempt,
  onStart,
}: {
  test: Test;
  attempt: Attempt;
  onStart: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-hero">
      <Card className="max-w-lg w-full p-8 bg-gradient-card border-border/50">
        <div className="text-center mb-6">
          <Lock className="w-10 h-10 mx-auto text-primary mb-3" />
          <h1 className="text-2xl font-bold">{test.title}</h1>
          <p className="text-xs font-mono text-muted-foreground mt-1">// you are about to enter a proctored exam</p>
        </div>

        <ul className="space-y-2 text-sm text-muted-foreground mb-6">
          <li className="flex gap-2">
            <span className="text-primary font-mono">›</span>
            The app will enter <strong className="text-foreground">fullscreen</strong>.
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-mono">›</span>
            Exiting fullscreen, switching tabs, or losing focus pauses the test.
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-mono">›</span>
            To resume, ask your invigilator for a one-time resume code.
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-mono">›</span>
            Your code is auto-saved. Don't worry about losing work.
          </li>
        </ul>

        <div className="bg-terminal rounded-md p-3 border border-border/50 mb-6 text-xs font-mono">
          <div className="text-muted-foreground">student: <span className="text-foreground">{attempt.student_full_name}</span></div>
          <div className="text-muted-foreground">uid: <span className="text-foreground">{attempt.student_college_uid}</span></div>
          <div className="text-muted-foreground">language: <span className="text-foreground">{test.language}</span></div>
          <div className="text-muted-foreground">strictness: <span className="text-foreground">{test.strictness}</span></div>
        </div>

        <Button onClick={onStart} className="w-full shadow-glow">
          Enter fullscreen &amp; begin
        </Button>
      </Card>
    </div>
  );
}

/* ─────────── paused overlay ─────────── */
function PausedScreen({
  attempt,
  resumeInput,
  setResumeInput,
  onResume,
}: {
  attempt: Attempt;
  resumeInput: string;
  setResumeInput: (s: string) => void;
  onResume: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-destructive/5">
      <Card className="max-w-md w-full p-8 bg-gradient-card border-destructive/40 shadow-elevated">
        <div className="text-center mb-6">
          <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-3 animate-pulse-glow" />
          <h1 className="text-2xl font-bold text-destructive">Test paused</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Proctoring violation detected. Call your invigilator to receive a resume code.
          </p>
          <p className="text-xs font-mono text-muted-foreground mt-3">
            violations: {attempt.violation_count}
          </p>
        </div>
        <div className="space-y-3">
          <Input
            value={resumeInput}
            onChange={(e) => setResumeInput(e.target.value.toUpperCase())}
            placeholder="ENTER CODE"
            maxLength={6}
            className="font-mono text-2xl tracking-[0.3em] text-center uppercase"
          />
          <Button onClick={onResume} className="w-full">
            Resume test
          </Button>
        </div>
      </Card>
    </div>
  );
}
