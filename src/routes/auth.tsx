import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Terminal, GraduationCap, UserSquare2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

const signupSchema = z.object({
  full_name: z.string().trim().min(2, "Full name required").max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(6, "Min 6 characters").max(72),
  college_uid: z.string().trim().min(1, "Required").max(50).optional(),
});

function AuthPage() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && role) {
      navigate({ to: role === "teacher" ? "/teacher" : "/student" });
    }
  }, [user, role, loading, navigate]);

  return (
    <AppShell>
      <div className="container max-w-md mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <Terminal className="w-10 h-10 mx-auto text-primary mb-3" />
          <h1 className="text-2xl font-bold">Sign in to labcode.ai</h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">
            // choose your role
          </p>
        </div>

        <Card className="p-6 bg-gradient-card border-border/50">
          <Tabs defaultValue="student">
            <TabsList className="grid grid-cols-2 mb-6">
              <TabsTrigger value="student" className="gap-2">
                <UserSquare2 className="w-4 h-4" /> Student
              </TabsTrigger>
              <TabsTrigger value="teacher" className="gap-2">
                <GraduationCap className="w-4 h-4" /> Teacher
              </TabsTrigger>
            </TabsList>
            <TabsContent value="student">
              <AuthForm role="student" />
            </TabsContent>
            <TabsContent value="teacher">
              <AuthForm role="teacher" />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </AppShell>
  );
}

function AuthForm({ role }: { role: "student" | "teacher" }) {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    college_uid: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const parsed = signupSchema.safeParse(form);
        if (!parsed.success) {
          toast.error(parsed.error.issues[0].message);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: parsed.data.full_name,
              college_uid: role === "student" ? parsed.data.college_uid : null,
              role,
            },
          },
        });
        if (error) {
          if (error.message.toLowerCase().includes("already")) {
            toast.error("Account exists — try signing in instead.");
          } else toast.error(error.message);
          return;
        }
        toast.success("Welcome! Redirecting…");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success("Signed in.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === "signup" && (
        <>
          <Field label="Full name">
            <Input
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="Ada Lovelace"
            />
          </Field>
          {role === "student" && (
            <Field label="College UID">
              <Input
                required
                value={form.college_uid}
                onChange={(e) => setForm({ ...form, college_uid: e.target.value })}
                placeholder="1XX23CSE001"
              />
            </Field>
          )}
        </>
      )}
      <Field label="Email">
        <Input
          required
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="you@college.edu"
        />
      </Field>
      <Field label="Password">
        <Input
          required
          type="password"
          minLength={6}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder="••••••"
        />
      </Field>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Working…" : mode === "signup" ? "Create account" : "Sign in"}
      </Button>
      <button
        type="button"
        onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
        className="block w-full text-center text-xs text-muted-foreground hover:text-foreground font-mono"
      >
        {mode === "signup" ? "Have an account? Sign in" : "New here? Create an account"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
        {label}
      </Label>
      {children}
    </div>
  );
}
