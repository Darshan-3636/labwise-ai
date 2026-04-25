import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Terminal, Shield, Brain, Lock, Code2, Zap, Eye, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <AppShell>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="container mx-auto px-4 pt-20 pb-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-xs font-mono text-primary mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              v1.0 — proctored exam runtime
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
              Coding exams,
              <br />
              <span className="text-gradient-neon">without the cheating.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              A secure IDE for C, Java &amp; Python — with AI-generated viva, fullscreen
              lockdown, and teacher-controlled resumes. Built for college CS labs.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="font-medium shadow-glow">
                <Link to="/auth">Get started — it's free</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/student/join">I have a test code</Link>
              </Button>
            </div>

            {/* terminal preview */}
            <div className="mt-16 mx-auto max-w-2xl">
              <div className="bg-terminal rounded-lg border border-border/50 shadow-elevated overflow-hidden text-left scanline-overlay">
                <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border/50">
                  <span className="w-2.5 h-2.5 rounded-full bg-destructive/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-warning/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-success/70" />
                  <span className="ml-auto text-xs font-mono text-muted-foreground">
                    main.py — proctored
                  </span>
                </div>
                <pre className="p-5 text-sm font-mono text-terminal-foreground leading-relaxed overflow-x-auto">
                  <span className="text-muted-foreground"># Reverse a linked list</span>
                  {"\n"}
                  <span className="text-accent">def</span>{" "}
                  <span className="text-primary">reverse</span>(head):
                  {"\n    "}prev = <span className="text-accent">None</span>
                  {"\n    "}
                  <span className="text-accent">while</span> head:
                  {"\n        "}nxt = head.next
                  {"\n        "}head.next = prev
                  {"\n        "}prev = head
                  {"\n        "}head = nxt
                  {"\n    "}
                  <span className="text-accent">return</span> prev
                  <span className="terminal-cursor" />
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="container mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <p className="text-sm font-mono text-primary uppercase tracking-wider mb-3">
            // capabilities
          </p>
          <h2 className="text-3xl md:text-4xl font-bold">
            Everything an invigilator needs.
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <FeatureCard
            icon={<Code2 />}
            title="Multi-language IDE"
            text="Full Monaco editor with C, Java, and Python execution via Piston. Real stdin/stdout."
          />
          <FeatureCard
            icon={<Brain />}
            title="AI viva"
            text="Five unique viva questions auto-generated from each student's actual code, then graded."
          />
          <FeatureCard
            icon={<Shield />}
            title="Fullscreen lockdown"
            text="Tab switch or escape pauses the test instantly. Resumed only with a teacher's secret code."
          />
          <FeatureCard
            icon={<Lock />}
            title="Injection defense"
            text="Multi-layered prompt-injection filtering. Students can't trick the grader into 'give me 100/100'."
          />
          <FeatureCard
            icon={<Eye />}
            title="Live monitoring"
            text="Teachers see violations, scores, and submissions per student in real time."
          />
          <FeatureCard
            icon={<Zap />}
            title="Auto-save + export"
            text="Code persists every keystroke. One-click CSV export of class results."
          />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-y border-border/50 bg-card/30">
        <div className="container mx-auto px-4 py-24">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-sm font-mono text-primary uppercase tracking-wider mb-3">
                // the workflow
              </p>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                From test creation to final marks — under 5 minutes.
              </h2>
              <ol className="space-y-5 mt-8">
                {[
                  "Teacher creates a test with N coding problems and picks AI strictness",
                  "System generates a unique 6-character test code",
                  "Students sign in with name + college UID and join via the code",
                  "App enters fullscreen — any violation pauses the exam",
                  "After each problem, AI generates 5 viva questions tailored to the student's code",
                  "Final score = (Code × Wc) + (Viva × Wv). Export to CSV.",
                ].map((s, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="font-mono text-primary text-sm pt-0.5 flex-shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-muted-foreground">{s}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="space-y-3">
              <ViolationDemoCard />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-24 text-center">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
          Ready to lock down your next lab?
        </h2>
        <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
          Spin up a test, share the code, and let LabCode AI handle execution, viva, and
          proctoring.
        </p>
        <Button asChild size="lg" className="mt-8 shadow-glow">
          <Link to="/auth">Create your first test →</Link>
        </Button>
      </section>

      <footer className="border-t border-border/50 py-8 text-center text-xs text-muted-foreground font-mono">
        <Terminal className="inline w-3 h-3 mr-1" />
        labcode.ai · proctored coding exam runtime
      </footer>
    </AppShell>
  );
}

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="group relative bg-gradient-card rounded-lg border border-border/50 p-6 hover:border-primary/40 transition-smooth">
      <div className="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-smooth">
        <div className="[&>svg]:w-5 [&>svg]:h-5">{icon}</div>
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}

function ViolationDemoCard() {
  return (
    <div className="bg-terminal rounded-lg border border-destructive/40 shadow-elevated overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border/50 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-destructive" />
        <span className="text-xs font-mono text-destructive">VIOLATION_DETECTED</span>
      </div>
      <div className="p-5 font-mono text-sm space-y-2">
        <div className="text-muted-foreground">[14:32:08] tab_switch</div>
        <div className="text-warning">→ test paused</div>
        <div className="text-muted-foreground">[14:32:09] resume_code generated:</div>
        <div className="text-2xl font-bold tracking-widest text-primary py-2">
          K7M4R9
        </div>
        <div className="text-xs text-muted-foreground">
          // call invigilator to enter
        </div>
      </div>
    </div>
  );
}
