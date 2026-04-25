import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { generateTestCode } from "@/lib/proctor";
import { toast } from "sonner";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/teacher/new")({
  component: NewTest,
});

interface QDraft {
  title: string;
  description: string;
  starter_code: string;
  sample_input: string;
  expected_output: string;
}

const emptyQ: QDraft = {
  title: "",
  description: "",
  starter_code: "",
  sample_input: "",
  expected_output: "",
};

const titleSchema = z.string().trim().min(2).max(200);

function NewTest() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [branch, setBranch] = useState("");
  const [section, setSection] = useState("");
  const [examDate, setExamDate] = useState("");
  const [duration, setDuration] = useState(60);
  const [language, setLanguage] = useState<"c" | "java" | "python">("python");
  const [strictness, setStrictness] = useState<"low" | "medium" | "high">("medium");
  const [codeWeight, setCodeWeight] = useState(70);
  const [questions, setQuestions] = useState<QDraft[]>([{ ...emptyQ }]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
    else if (!loading && role && role !== "teacher") navigate({ to: "/student" });
  }, [user, role, loading, navigate]);

  const updateQ = (i: number, patch: Partial<QDraft>) =>
    setQuestions(questions.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));

  const addQ = () => setQuestions([...questions, { ...emptyQ }]);
  const removeQ = (i: number) =>
    setQuestions(questions.length > 1 ? questions.filter((_, idx) => idx !== i) : questions);

  const submit = async () => {
    if (!user) return;
    const t = titleSchema.safeParse(title);
    if (!t.success) {
      toast.error("Test title required (2–200 chars)");
      return;
    }
    if (questions.some((q) => !q.title.trim() || !q.description.trim())) {
      toast.error("Every question needs a title and description");
      return;
    }

    setBusy(true);
    try {
      const { data: test, error } = await supabase
        .from("tests")
        .insert({
          teacher_id: user.id,
          test_code: generateTestCode(),
          title: t.data,
          branch: branch || null,
          section: section || null,
          exam_date: examDate || null,
          duration_minutes: duration,
          language,
          strictness,
          code_weight: codeWeight / 100,
          viva_weight: (100 - codeWeight) / 100,
        })
        .select()
        .single();
      if (error || !test) throw error ?? new Error("Could not create test");

      const { error: qerr } = await supabase.from("test_questions").insert(
        questions.map((q, i) => ({
          test_id: test.id,
          position: i + 1,
          title: q.title.trim(),
          description: q.description.trim(),
          starter_code: q.starter_code,
          sample_input: q.sample_input,
          expected_output: q.expected_output,
        })),
      );
      if (qerr) throw qerr;

      toast.success(`Test created — code ${test.test_code}`);
      navigate({ to: "/teacher" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="container max-w-3xl mx-auto px-4 py-10">
        <Link to="/teacher" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <h1 className="text-3xl font-bold mb-1">New test</h1>
        <p className="text-sm text-muted-foreground font-mono mb-8">
          // configure your exam, then publish
        </p>

        <Card className="p-6 bg-gradient-card border-border/50 space-y-5">
          <Field label="Test title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Data Structures Lab — Midsem" />
          </Field>
          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Branch">
              <Input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="CSE" />
            </Field>
            <Field label="Section">
              <Input value={section} onChange={(e) => setSection(e.target.value)} placeholder="A" />
            </Field>
            <Field label="Date">
              <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
            </Field>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Language">
              <Select value={language} onValueChange={(v) => setLanguage(v as typeof language)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="c">C</SelectItem>
                  <SelectItem value="java">Java</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Duration (min)">
              <Input type="number" min={5} max={240} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
            </Field>
            <Field label="AI strictness">
              <Select value={strictness} onValueChange={(v) => setStrictness(v as typeof strictness)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low — output only</SelectItem>
                  <SelectItem value="medium">Medium — structure + correctness</SelectItem>
                  <SelectItem value="high">High — complexity + naming</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label={`Score weights — Code ${codeWeight}% / Viva ${100 - codeWeight}%`}>
            <Slider value={[codeWeight]} onValueChange={(v) => setCodeWeight(v[0])} min={30} max={90} step={5} />
          </Field>
        </Card>

        <h2 className="text-lg font-semibold mt-8 mb-3 flex items-center justify-between">
          Questions
          <Button size="sm" variant="outline" onClick={addQ} className="gap-1">
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        </h2>

        <div className="space-y-4">
          {questions.map((q, i) => (
            <Card key={i} className="p-5 bg-gradient-card border-border/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-primary uppercase tracking-wider">Q{i + 1}</span>
                {questions.length > 1 && (
                  <Button size="icon" variant="ghost" onClick={() => removeQ(i)} aria-label="Remove">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
              <Input value={q.title} onChange={(e) => updateQ(i, { title: e.target.value })} placeholder="Question title" />
              <Textarea
                value={q.description}
                onChange={(e) => updateQ(i, { description: e.target.value })}
                placeholder="Problem statement…"
                rows={4}
              />
              <div className="grid md:grid-cols-2 gap-3">
                <Textarea
                  value={q.sample_input}
                  onChange={(e) => updateQ(i, { sample_input: e.target.value })}
                  placeholder="Sample input (stdin)"
                  rows={3}
                  className="font-mono text-xs"
                />
                <Textarea
                  value={q.expected_output}
                  onChange={(e) => updateQ(i, { expected_output: e.target.value })}
                  placeholder="Expected output"
                  rows={3}
                  className="font-mono text-xs"
                />
              </div>
              <Textarea
                value={q.starter_code}
                onChange={(e) => updateQ(i, { starter_code: e.target.value })}
                placeholder="Starter code (optional)"
                rows={4}
                className="font-mono text-xs"
              />
            </Card>
          ))}
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <Button asChild variant="outline">
            <Link to="/teacher">Cancel</Link>
          </Button>
          <Button onClick={submit} disabled={busy} className="shadow-glow">
            {busy ? "Creating…" : "Create test"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{label}</Label>
      {children}
    </div>
  );
}
