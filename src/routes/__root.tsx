import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center font-mono">
        <p className="text-primary text-sm">$ cat ./route</p>
        <h1 className="text-7xl font-bold text-foreground mt-2">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Route not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The path you requested does not resolve in this build.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Return home
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "LabCode AI — Secure Coding Exams with AI Viva" },
      {
        name: "description",
        content:
          "A proctored coding exam platform for CS labs. Multi-language IDE, AI-generated viva, fullscreen lockdown, and teacher-controlled resumes.",
      },
      { name: "author", content: "LabCode AI" },
      { property: "og:title", content: "LabCode AI — Secure Coding Exams" },
      {
        property: "og:description",
        content: "Proctored multi-language coding exams with AI viva and integrity defense.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <Outlet />
      <Toaster />
    </AuthProvider>
  );
}
