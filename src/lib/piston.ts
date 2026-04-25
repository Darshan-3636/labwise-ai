/**
 * Piston public code execution API.
 * https://github.com/engineer-man/piston
 */

const PISTON_URL = "https://emkc.org/api/v2/piston/execute";

const LANGUAGE_MAP: Record<string, { language: string; version: string; filename: string }> = {
  python: { language: "python", version: "3.10.0", filename: "main.py" },
  c: { language: "c", version: "10.2.0", filename: "main.c" },
  java: { language: "java", version: "15.0.2", filename: "Main.java" },
};

export interface PistonResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  output: string;
}

export async function runCode(
  language: "python" | "c" | "java",
  code: string,
  stdin = ""
): Promise<PistonResult> {
  const cfg = LANGUAGE_MAP[language];
  if (!cfg) throw new Error(`Unsupported language: ${language}`);

  const res = await fetch(PISTON_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: cfg.language,
      version: cfg.version,
      files: [{ name: cfg.filename, content: code }],
      stdin,
      compile_timeout: 10000,
      run_timeout: 5000,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Piston error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const run = data.run ?? {};
  const compile = data.compile ?? {};
  const stdout = run.stdout ?? "";
  const stderr = (compile.stderr || "") + (run.stderr || "");
  return {
    stdout,
    stderr,
    exitCode: run.code ?? 0,
    output: run.output ?? stdout,
  };
}
