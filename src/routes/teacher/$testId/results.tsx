import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Attempt = Database["public"]["Tables"]["test_attempts"]["Row"];
type Test = Database["public"]["Tables"]["tests"]["Row"];

export const Route = createFileRoute("/teacher/$testId/results")({
  component: Results,
});

function Results() {
  const { testId } = useParams({ from: "/teacher/$testId/results" });
  const { user, loading } = useAuth();
  const [test, setTest] = useState<Test | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    setBusy(true);
    const [tRes, aRes] = await Promise.all([
      supabase.from("tests").select("*").eq("id", testId).maybeSingle(),
      supabase
        .from("test_attempts")
        .select("*")
        .eq("test_id", testId)
        .order("final_score", { ascending: false }),
    ]);
    if (tRes.error) toast.error(tRes.error.message);
    setTest(tRes.data ?? null);
    setAttempts(aRes.data ?? []);
    setBusy(false);
  }, [testId]);

  useEffect(() => {
    if (loading || !user) return;
    void load();
  }, [user, loading, load]);

  const exportCSV = () => {
    const rows = [
      ["Full Name", "College UID", "Status", "Code Score", "Viva Score", "Final Score", "Violations", "Submitted At"],
      ...attempts.map((a) => [
        a.student_full_name,
        a.student_college_uid,
        a.status,
        String(a.code_score ?? 0),
        String(a.viva_score ?? 0),
        String(a.final_score ?? 0),
        String(a.violation_count),
        a.submitted_at ?? "",
      ]),
    ];
    const csv = rows
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${test?.test_code ?? "results"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-10">
        <Link to="/teacher" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div>
            <p className="text-xs font-mono text-primary uppercase tracking-wider mb-1">// results</p>
            <h1 className="text-3xl font-bold">{test?.title ?? "Test"}</h1>
            <p className="text-xs font-mono text-muted-foreground mt-1">code: {test?.test_code}</p>
          </div>
          <Button onClick={exportCSV} disabled={attempts.length === 0} className="gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>

        {busy ? (
          <p className="text-muted-foreground font-mono text-sm">Loading…</p>
        ) : attempts.length === 0 ? (
          <Card className="p-12 text-center bg-gradient-card border-dashed">
            <p className="text-muted-foreground">No attempts yet.</p>
          </Card>
        ) : (
          <Card className="bg-gradient-card border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs uppercase font-mono text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Student</th>
                    <th className="px-4 py-3 text-left">UID</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Code</th>
                    <th className="px-4 py-3 text-right">Viva</th>
                    <th className="px-4 py-3 text-right">Final</th>
                    <th className="px-4 py-3 text-right">Violations</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((a) => (
                    <tr key={a.id} className="border-t border-border/30">
                      <td className="px-4 py-3 font-medium">{a.student_full_name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{a.student_college_uid}</td>
                      <td className="px-4 py-3 font-mono text-xs">{a.status}</td>
                      <td className="px-4 py-3 text-right font-mono">{Number(a.code_score ?? 0).toFixed(0)}</td>
                      <td className="px-4 py-3 text-right font-mono">{Number(a.viva_score ?? 0).toFixed(0)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-primary">
                        {Number(a.final_score ?? 0).toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{a.violation_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
