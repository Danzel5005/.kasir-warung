// dev-runner.cjs — supervisor for `electron .` in development.
//
// WHY THIS EXISTS
// Vite hot-reloads everything under `src/**`, but the Electron MAIN process
// (electron/*.cjs) is evaluated only once, when `electron .` starts. Editing
// main.cjs / backup-restore.cjs / printing.cjs etc. therefore has no effect
// until the whole app is restarted — and it fails silently, as "No handler
// registered for '<channel>'" errors in the renderer, which look like bugs.
//
// This wrapper spawns Electron as a child process and watches electron/**.
// When a .cjs/.js file changes it kills and respawns Electron, so main-process
// edits behave like the rest of the dev loop.
//
// Usage:  node electron/dev-runner.cjs   (wired into `npm run electron:dev`)
//
// Notes:
//  • Only used in dev; packaged builds launch electron/main.cjs directly.
//  • Restarts are debounced so an editor's multi-file save only restarts once.
//  • Exit code 0 from Electron (e.g. window closed) stops the supervisor so
//    `concurrently` can shut the Vite side down too.

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const ROOT = path.join(__dirname, "..");
const WATCH_DIR = __dirname;
const DEBOUNCE_MS = 250;
// A stale-Electron lock crash happens before main.cjs can log anything and
// returns almost immediately. These bounds let us tell it apart from a normal
// window close (which is also code 0/1 but comes much later, after output).
const FAST_EXIT_MS = 5000;
const MAX_AUTO_RETRIES = 1;

let child = null;
let restartTimer = null;
let shuttingDown = false;
let sawOutput = false;
let autoRetries = 0;

function log(msg) {
  console.log(`[dev-runner] ${msg}`);
}

// Kill leftover Electron from THIS repo so a stale Chromium singleton lock
// cannot make the next launch exit 1 with no output. Mirrors kill-electron.cjs
// but runs in-process so the retry is immediate.
function reapStaleElectron(done) {
  if (process.platform !== "win32") return done();
  const ps =
    "Get-CimInstance Win32_Process -Filter \"Name='electron.exe'\" | " +
    "Select-Object ProcessId,CommandLine | ConvertTo-Csv -NoTypeInformation";
  const kill = spawn("powershell", ["-NoProfile", "-Command", ps], { stdio: ["ignore", "pipe", "ignore"] });
  let out = "";
  kill.stdout.on("data", (d) => { out += d.toString(); });
  const finish = () => {
    const root = ROOT.replace(/\\/g, "/").toLowerCase();
    for (const line of out.split(/\r?\n/)) {
      const m = line.match(/^"?(\d+)"?,"(.*)"\s*$/);
      if (!m) continue;
      const pid = Number(m[1]);
      const cmd = m[2].replace(/""/g, '"').replace(/\\/g, "/").toLowerCase();
      if (pid === process.pid) continue;
      if (!cmd.includes(root)) continue;
      try { spawn("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" }); } catch { /* gone */ }
    }
    done();
  };
  kill.on("exit", finish);
  kill.on("error", () => done());
  setTimeout(finish, 3000);
}

function startElectron() {
  if (shuttingDown) return;
  log("starting electron...");

  const startedAt = Date.now();
  sawOutput = false;

  child = spawn(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["electron", "."],
    { cwd: ROOT, stdio: ["inherit", "pipe", "pipe"], shell: process.platform === "win32" }
  );

  // Forward child output to our own streams, and remember that we saw some —
  // that is what distinguishes a real startup from a stale-lock crash.
  const forward = (stream, dest) => {
    stream.on("data", (chunk) => {
      sawOutput = true;
      dest.write(chunk);
    });
  };
  forward(child.stdout, process.stdout);
  forward(child.stderr, process.stderr);

  child.on("exit", (code, signal) => {
    // If we killed it ourselves for a restart, ignore this exit.
    if (shuttingDown) return;
    if (restartTimer) return; // a pending restart owns the lifecycle

    // Stale-lock signature: dies almost instantly, code 1, produced no output.
    // Reap leftovers and retry once before giving up.
    const fast = Date.now() - startedAt < FAST_EXIT_MS;
    if (code === 1 && fast && !sawOutput && autoRetries < MAX_AUTO_RETRIES) {
      autoRetries++;
      log(`electron exited (code=1) with no output after ${Date.now() - startedAt}ms — likely a stale instance; clearing and retrying...`);
      child = null;
      return reapStaleElectron(() => startElectron());
    }

    log(`electron exited (code=${code}, signal=${signal || "none"})`);
    shutdown(code ?? 0);
  });

  child.on("error", (err) => {
    log(`failed to spawn electron: ${err.message}`);
    shutdown(1);
  });
}

function restartElectron(reason) {
  if (shuttingDown) return;
  log(`change detected (${reason}) — restarting electron...`);
  clearTimeout(restartTimer);
  restartTimer = setTimeout(() => {
    restartTimer = null;
    stopElectron(() => startElectron());
  }, DEBOUNCE_MS);
}

function stopElectron(done) {
  const proc = child;
  child = null;
  if (!proc || proc.exitCode !== null) return done();

  let finished = false;
  const finish = () => { if (!finished) { finished = true; done(); } };
  proc.once("exit", finish);

  if (process.platform === "win32") {
    // On Windows Electron spawns a tree (gpu/renderer helpers); taskkill /T
    // is the only reliable way to take the whole thing down.
    spawn("taskkill", ["/pid", String(proc.pid), "/T", "/F"], { stdio: "ignore" })
      .on("exit", finish)
      .on("error", () => { try { proc.kill("SIGKILL"); } catch { /* already gone */ } finish(); });
  } else {
    try { proc.kill("SIGTERM"); } catch { /* already gone */ }
  }

  // Safety net: never hang the restart loop on a stuck process.
  setTimeout(finish, 4000);
}

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  clearTimeout(restartTimer);
  watchers.forEach((w) => { try { w.close(); } catch { /* ignore */ } });
  if (child) {
    const proc = child;
    child = null;
    try {
      if (process.platform === "win32") spawn("taskkill", ["/pid", String(proc.pid), "/T", "/F"], { stdio: "ignore" });
      else proc.kill("SIGTERM");
    } catch { /* ignore */ }
  }
  // Give taskkill a moment to run before we hand the exit code back.
  setTimeout(() => process.exit(code ?? 0), 150);
}

// ── Watch electron/** for main-process changes ──────────────────────────────
const watchers = [];

function watchDir(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      watchDir(full);
      continue;
    }
    // Watch the source files that the main process actually loads.
    if (!/\.(cjs|js|json)$/i.test(entry.name)) continue;
    if (entry.name === "dev-runner.cjs") continue; // don't restart on our own edits
    if (entry.name === "free-port.cjs") continue; // runs before vite; not part of main
    if (entry.name === "license-secret.cjs") continue; // secrets: never a dev edit

    try {
      const watcher = fs.watch(full, { persistent: true }, () => {
        restartElectron(path.relative(ROOT, full));
      });
      watchers.push(watcher);
    } catch { /* file might be locked; skip */ }
  }
}

watchDir(WATCH_DIR);
log(`watching ${path.relative(ROOT, WATCH_DIR)}/** for changes`);

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

startElectron();
