import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Plus } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Attempt = Database["public"]["Tables"]["test_attempts"]["Row"] & {
  tests: Pick<Database["public"]["Tables"]["tests"]["Row"], "title" | "test_code" | "language"> | null;
};

export const Route = createFileRoute("/student/")({
  component: StudentDashboard,
});

function StudentDashboard() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
    else if (!loading && role && role !== "student") navigate({ to: "/teacher" });
  }, [user, role, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("test_attempts")
        .select("*, tests(title, test_code, language)")
        .order("started_at", { ascending: false });
      setAttempts((data as Attempt[]) ?? []);
      setBusy(false);
    })();
  }, [user]);

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs font-mono text-primary uppercase tracking-wider mb-1">// student console</p>
            <h1 className="text-3xl font-bold">Your tests</h1>
          </div>
          <Button asChild className="gap-2 shadow-glow">
            <Link to="/student/join">
              <Plus className="w-4 h-4" /> Join with code
            </Link>
          </Button>
        </div>

        {busy ? (
          <p className="text-muted-foreground font-mono text-sm">Loading…</p>
        ) : attempts.length === 0 ? (
          <Card className="p-12 text-center bg-gradient-card border-dashed">
            <p className="text-muted-foreground mb-4">No tests joined yet.</p>
            <Button asChild>
              <Link to="/student/join">Enter your test code</Link>
            </Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {attempts.map((a) => (
              <Card key={a.id} className="p-5 bg-gradient-card border-border/50 hover:border-primary/40 transition-smooth">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="font-semibold">{a.tests?.title ?? "Test"}</h2>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">
                      code: {a.tests?.test_code} · {a.tests?.language}
                    </p>
                  </div>
                  <Badge variant="outline" className="font-mono uppercase text-[10px]">
                    {a.status.replace("_", " ")}
                  </Badge>
                </div>

                {a.status === "submitted" ? (
                  <div className="space-y-1 text-sm font-mono">
                    <div>code: <span className="text-primary">{Number(a.code_score ?? 0).toFixed(0)}</span></div>
                    <div>viva: <span className="text-primary">{Number(a.viva_score ?? 0).toFixed(0)}</span></div>
                    <div className="text-lg font-bold">
                      final: <span className="text-gradient-neon">{Number(a.final_score ?? 0).toFixed(1)}</span>
                    </div>
                  </div>
                ) : (
                  <Button asChild variant="outline" className="w-full gap-1.5">
                    <Link to="/student/exam/$attemptId" params={{ attemptId: a.id }}>
                      Resume <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
