import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, AlertTriangle, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Attempt = Database["public"]["Tables"]["test_attempts"]["Row"];
type Violation = Database["public"]["Tables"]["proctor_violations"]["Row"];

export const Route = createFileRoute("/teacher/$testId/")({
  component: ManageTest,
});

function ManageTest() {
  const { testId } = useParams({ from: "/teacher/$testId/" });
  const { user, loading } = useAuth();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [violations, setViolations] = useState<Record<string, Violation[]>>({});
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    setBusy(true);
    const { data: at } = await supabase
      .from("test_attempts")
      .select("*")
      .eq("test_id", testId)
      .order("started_at", { ascending: false });
    const list = at ?? [];
    setAttempts(list);

    if (list.length > 0) {
      const ids = list.map((a) => a.id);
      const { data: vs } = await supabase
        .from("proctor_violations")
        .select("*")
        .in("attempt_id", ids)
        .eq("resolved", false);
      const grouped: Record<string, Violation[]> = {};
      (vs ?? []).forEach((v) => {
        (grouped[v.attempt_id] ??= []).push(v);
      });
      setViolations(grouped);
    } else {
      setViolations({});
    }
    setBusy(false);
  }, [testId]);

  useEffect(() => {
    if (loading || !user) return;
    void load();
    const ch = supabase
      .channel(`mgr-${testId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "test_attempts" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "proctor_violations" }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [user, loading, testId, load]);

  const resolveViolation = async (vid: string) => {
    const { error } = await supabase
      .from("proctor_violations")
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", vid);
    if (error) toast.error(error.message);
    else {
      toast.success("Violation cleared");
      void load();
    }
  };

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-10">
        <Link to="/teacher" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs font-mono text-primary uppercase tracking-wider mb-1">// live monitor</p>
            <h1 className="text-3xl font-bold">Active attempts</h1>
          </div>
          <Button variant="outline" size="sm" onClick={load} className="gap-2">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>

        {busy ? (
          <p className="text-muted-foreground font-mono text-sm">Loading…</p>
        ) : attempts.length === 0 ? (
          <Card className="p-12 text-center bg-gradient-card border-dashed">
            <p className="text-muted-foreground">No students have joined yet.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {attempts.map((a) => {
              const vs = violations[a.id] ?? [];
              return (
                <Card key={a.id} className="p-4 bg-gradient-card border-border/50">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                      <div className="font-semibold">{a.student_full_name}</div>
                      <div className="text-xs font-mono text-muted-foreground">
                        {a.student_college_uid}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={a.status} />
                      {a.violation_count > 0 && (
                        <Badge variant="outline" className="gap-1 border-warning/50 text-warning">
                          <AlertTriangle className="w-3 h-3" />
                          {a.violation_count}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {vs.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {vs.map((v) => (
                        <div
                          key={v.id}
                          className="flex items-center justify-between bg-destructive/10 border border-destructive/30 rounded-md p-3"
                        >
                          <div>
                            <div className="text-xs font-mono text-destructive uppercase">
                              {v.violation_type} — paused
                            </div>
                            <div className="text-2xl font-mono font-bold tracking-[0.3em] text-primary mt-1">
                              {v.resume_code}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              Read this code to the student to resume
                            </div>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => resolveViolation(v.id)} className="gap-1.5">
                            <Check className="w-3.5 h-3.5" /> Mark resolved
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    in_progress: { label: "in progress", cls: "border-primary/50 text-primary" },
    paused: { label: "paused", cls: "border-destructive/50 text-destructive" },
    submitted: { label: "submitted", cls: "border-success/50 text-success" },
  };
  const m = map[status] ?? map.in_progress;
  return (
    <Badge variant="outline" className={`font-mono uppercase text-[10px] ${m.cls}`}>
      {m.label}
    </Badge>
  );
}
