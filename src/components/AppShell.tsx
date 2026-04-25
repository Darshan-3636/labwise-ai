import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Terminal, LogOut } from "lucide-react";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, role, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background relative">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-md bg-gradient-neon flex items-center justify-center shadow-glow group-hover:animate-pulse-glow">
              <Terminal className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-mono font-bold tracking-tight">
              labcode<span className="text-primary">.ai</span>
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            {user ? (
              <>
                {role === "teacher" && (
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/teacher">Dashboard</Link>
                  </Button>
                )}
                {role === "student" && (
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/student">Tests</Link>
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={signOut}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/auth">Sign in</Link>
                </Button>
                <Button asChild size="sm" variant="default">
                  <Link to="/auth">Get started</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="relative z-10">{children}</main>
    </div>
  );
}
