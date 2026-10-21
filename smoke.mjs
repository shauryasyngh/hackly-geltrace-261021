// Keep the kit's production build and HTTP check. CHROME_BIN also exercises
// the judge's demo in a real browser, without adding any npm dependencies.
import { spawn, execFileSync } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { runBrowserSmoke } from "./scripts/browser-smoke.mjs";
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://placeholder.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "placeholder";
const next = "node_modules/next/dist/bin/next";
execFileSync(process.execPath, [next, "build"], { stdio: "inherit" });
const socket = createServer();
socket.listen(0, "127.0.0.1");
await once(socket, "listening");
const port = socket.address().port;
await new Promise((resolve) => socket.close(resolve));
const baseUrl = `http://localhost:${port}`;
const srv = spawn(process.execPath, [next, "start", "-p", String(port)], { stdio: "inherit" });
try {
  let status = 0;
  for (let i = 0; i < 30 && status !== 200; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    status = await fetch(baseUrl, { signal: AbortSignal.timeout(10000) }).then((r) => r.status).catch(() => 0);
  }
  if (status !== 200) throw new Error(`smoke failed: / returned ${status}`);
  console.log("smoke ok: / returned 200");
  if (process.env.CHROME_BIN) {
    await runBrowserSmoke(baseUrl, process.env.CHROME_BIN);
  } else {
    console.log("browser checks skipped: set CHROME_BIN to a Chrome/Chromium executable to run the full demo checks");
  }
} finally {
  if (srv.exitCode === null) {
    const stopped = once(srv, "exit");
    srv.kill();
    await stopped;
  }
}
