import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Copy, Users, FileSpreadsheet, Trash2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Test = Database["public"]["Tables"]["tests"]["Row"];

export const Route = createFileRoute("/teacher/")({
  component: TeacherDashboard,
});

function TeacherDashboard() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [tests, setTests] = useState<Test[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
    else if (!loading && role && role !== "teacher") navigate({ to: "/student" });
  }, [user, role, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const load = async () => {
    setBusy(true);
    const { data, error } = await supabase
      .from("tests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setTests(data ?? []);
    setBusy(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this test and all attempts?")) return;
    const { error } = await supabase.from("tests").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Test deleted");
      void load();
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Copied ${code}`);
  };

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs font-mono text-primary uppercase tracking-wider mb-1">
              // teacher console
            </p>
            <h1 className="text-3xl font-bold">Your tests</h1>
          </div>
          <Button asChild className="gap-2 shadow-glow">
            <Link to="/teacher/new">
              <Plus className="w-4 h-4" /> New test
            </Link>
          </Button>
        </div>

        {busy ? (
          <p className="text-muted-foreground font-mono text-sm">Loading…</p>
        ) : tests.length === 0 ? (
          <Card className="p-12 text-center bg-gradient-card border-dashed">
            <p className="text-muted-foreground mb-4">No tests yet.</p>
            <Button asChild>
              <Link to="/teacher/new">Create your first test</Link>
            </Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {tests.map((t) => (
              <Card key={t.id} className="p-5 bg-gradient-card border-border/50 hover:border-primary/40 transition-smooth">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="font-semibold">{t.title}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t.branch || "—"} · {t.section || "—"} · {t.exam_date || "no date"}
                    </p>
                  </div>
                  <Badge variant="outline" className="font-mono uppercase text-[10px]">
                    {t.language}
                  </Badge>
                </div>

                <button
                  onClick={() => copyCode(t.test_code)}
                  className="group w-full text-left bg-terminal rounded-md p-3 mb-3 border border-border/50 hover:border-primary/50 transition-smooth"
                >
                  <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
                    test code
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-2xl font-bold text-primary tracking-[0.3em]">
                      {t.test_code}
                    </span>
                    <Copy className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-smooth" />
                  </div>
                </button>

                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mb-3">
                  <span>strictness: <span className="text-foreground">{t.strictness}</span></span>
                  <span>·</span>
                  <span>weights: {t.code_weight}/{t.viva_weight}</span>
                </div>

                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline" className="flex-1 gap-1.5">
                    <Link to="/teacher/$testId" params={{ testId: t.id }}>
                      <Users className="w-3.5 h-3.5" /> Manage
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="flex-1 gap-1.5">
                    <Link to="/teacher/$testId/results" params={{ testId: t.id }}>
                      <FileSpreadsheet className="w-3.5 h-3.5" /> Results
                    </Link>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(t.id)}
                    aria-label="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
