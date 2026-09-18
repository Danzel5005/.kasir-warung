// free-port.cjs — make sure the Vite dev port is actually OURS before starting.
//
// WHY THIS EXISTS
// `electron:dev` is:
//   concurrently "vite" "wait-on http://localhost:5173 && node electron/dev-runner.cjs"
//
// Ctrl-C on Windows does NOT reliably kill the process tree (concurrently →
// npm/npx → vite → esbuild helpers). A previous run can therefore leave an
// ORPHANED Vite server still listening on 5173. On the next run:
//   • the fresh `vite` cannot bind 5173 (fails, or silently moves to 5174)
//   • `wait-on` still succeeds — it connects to the ZOMBIE server
//   • concurrently sees a non-zero exit ⇒ `electron:dev` exits 1
// Nothing in the source is wrong; it just *looks* like the config broke.
//
// This script runs BEFORE vite, via the `predev` hook. It finds whatever owns
// the port, verifies it is a leftover dev process of THIS project, and kills it.
// It refuses to touch anything it does not recognize — we never want a helper
// like this killing an unrelated app that happens to use the port.
//
// Usage:  node electron/free-port.cjs   (wired into `npm run predev`)
// Safe to run when the port is already free: it just prints and exits 0.

const { execFileSync } = require("child_process");
const path = require("path");

const PORT = 5173;
const ROOT = path.join(__dirname, "..");
const isWin = process.platform === "win32";

function log(msg) {
  console.log(`[free-port] ${msg}`);
}

// PowerShell: list PIDs listening on the port (may be several, incl. IPv6 ::1).
function pidsOnPortWin() {
  try {
    const out = execFileSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        `Get-NetTCPConnection -LocalPort ${PORT} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique`,
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    );
    return out
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => /^\d+$/.test(s))
      .map(Number);
  } catch {
    return [];
  }
}

// lsof/ss fallback for macOS and Linux.
function pidsOnPortUnix() {
  const cmds = [
    ["lsof", ["-ti", `tcp:${PORT}`, "-sTCP:LISTEN"]],
    ["ss", ["-lptnH", `sport = :${PORT}`]],
  ];
  for (const [cmd, args] of cmds) {
    try {
      const out = execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
      const pids = (out.match(/\b\d+\b/g) || []).map(Number).filter((n) => n > 1);
      if (pids.length) return [...new Set(pids)];
    } catch {
      /* command missing or no match; try the next one */
    }
  }
  return [];
}

// Full command line of a PID, or "" if it cannot be read / is gone.
function commandLine(pid) {
  try {
    if (isWin) {
      const out = execFileSync(
        "powershell",
        ["-NoProfile", "-Command", `(Get-CimInstance Win32_Process -Filter "ProcessId=${pid}").CommandLine`],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
      );
      return out.trim();
    }
    const out = execFileSync("ps", ["-p", String(pid), "-o", "args="], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out.trim();
  } catch {
    return "";
  }
}

// Only ever kill a process that is clearly a leftover dev server for THIS repo.
// Anything unrecognized is reported and left alone.
function isOurs(pid, cmd) {
  if (!cmd) return false;
  const normalized = cmd.replace(/\\/g, "/").toLowerCase();
  const root = ROOT.replace(/\\/g, "/").toLowerCase();
  const looksLikeViteOrNode = /(^|[\s"/])node(\.exe)?(["'\s]|$)/i.test(cmd) || /vite/i.test(cmd);
  return looksLikeViteOrNode && normalized.includes(root);
}

function killTree(pid) {
  try {
    if (isWin) execFileSync("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" });
    else process.kill(pid, "SIGTERM");
    return true;
  } catch {
    return false;
  }
}

function main() {
  const pids = isWin ? pidsOnPortWin() : pidsOnPortUnix();

  if (!pids.length) {
    log(`port ${PORT} is free`);
    return;
  }

  let killed = 0;
  let skipped = 0;

  for (const pid of pids) {
    if (pid === process.pid) continue;
    const cmd = commandLine(pid);

    if (!isOurs(pid, cmd)) {
      skipped++;
      log(`port ${PORT} held by PID ${pid} — NOT recognized as this project's dev server, leaving it alone`);
      log(`  cmd: ${cmd || "<unreadable>"}`);
      continue;
    }

    const short = cmd.length > 120 ? `${cmd.slice(0, 120)}…` : cmd;
    log(`reclaiming port ${PORT} from stale dev process PID ${pid}`);
    log(`  cmd: ${short}`);
    if (killTree(pid)) killed++;
    else log(`  could not kill PID ${pid} (already gone?)`);
  }

  if (killed && skipped === 0) log(`port ${PORT} reclaimed (${killed} process(es) stopped)`);
  else if (skipped) log(`note: ${skipped} unrecognized process(es) still on port ${PORT}; vite may pick another port`);
}

try {
  main();
} catch (err) {
  // Never block the dev server because cleanup failed.
  console.warn(`[free-port] skipped cleanup: ${err.message}`);
}
