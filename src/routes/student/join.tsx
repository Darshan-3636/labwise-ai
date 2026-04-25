import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, KeyRound } from "lucide-react";

export const Route = createFileRoute("/student/join")({
  component: JoinTest,
});

function JoinTest() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [collegeUid, setCollegeUid] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
    else if (!loading && role && role !== "student") navigate({ to: "/teacher" });
  }, [user, role, loading, navigate]);

  // Pre-fill from profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, college_uid")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.full_name) setFullName(data.full_name);
        if (data?.college_uid) setCollegeUid(data.college_uid);
      });
  }, [user]);

  const join = async () => {
    if (!user) return;
    if (!fullName.trim() || !collegeUid.trim() || !code.trim()) {
      toast.error("All fields required");
      return;
    }
    setBusy(true);
    try {
      const { data: test, error: tErr } = await supabase
        .from("tests")
        .select("id, is_active")
        .eq("test_code", code.trim().toUpperCase())
        .maybeSingle();
      if (tErr || !test) {
        toast.error("Invalid test code");
        return;
      }
      if (!test.is_active) {
        toast.error("Test is no longer active");
        return;
      }

      // Update profile
      await supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), college_uid: collegeUid.trim() })
        .eq("user_id", user.id);

      // Find or create attempt
      const { data: existing } = await supabase
        .from("test_attempts")
        .select("id")
        .eq("test_id", test.id)
        .eq("student_id", user.id)
        .maybeSingle();

      let attemptId = existing?.id;
      if (!attemptId) {
        const { data: created, error } = await supabase
          .from("test_attempts")
          .insert({
            test_id: test.id,
            student_id: user.id,
            student_full_name: fullName.trim(),
            student_college_uid: collegeUid.trim(),
          })
          .select("id")
          .single();
        if (error || !created) {
          toast.error(error?.message ?? "Could not start attempt");
          return;
        }
        attemptId = created.id;
      }

      navigate({ to: "/student/exam/$attemptId", params: { attemptId } });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="container max-w-md mx-auto px-4 py-10">
        <Link to="/student" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <Card className="p-6 bg-gradient-card border-border/50 space-y-5">
          <div className="text-center">
            <KeyRound className="w-10 h-10 mx-auto text-primary mb-3" />
            <h1 className="text-2xl font-bold">Join a test</h1>
            <p className="text-xs font-mono text-muted-foreground mt-1">// confirm details &amp; enter code</p>
          </div>
          <Field label="Full name">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ada Lovelace" />
          </Field>
          <Field label="College UID">
            <Input value={collegeUid} onChange={(e) => setCollegeUid(e.target.value)} placeholder="1XX23CSE001" />
          </Field>
          <Field label="Test code">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABCD12"
              maxLength={6}
              className="font-mono text-2xl tracking-[0.3em] text-center uppercase"
            />
          </Field>
          <Button onClick={join} disabled={busy} className="w-full shadow-glow">
            {busy ? "Joining…" : "Enter exam"}
          </Button>
        </Card>
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
