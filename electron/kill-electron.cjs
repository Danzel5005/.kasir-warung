// kill-electron.cjs — reap stale Electron processes before starting dev.
//
// WHY THIS EXISTS
// Ctrl-C on Windows does NOT reliably kill the process tree
// (concurrently → npm/npx → electron → gpu/renderer helpers). A leftover
// Electron keeps holding Chromium's singleton lock on userData
// (%APPDATA%/kasir-warung). The next `electron .` then fails to acquire the
// lock, exits with code 1, and prints NOTHING — no [Main] logs — so it looks
// like the app is broken when it is really just a stale process.
//
// free-port.cjs handles the same class of problem for the Vite port; this
// script does it for Electron. It ONLY kills electron.exe processes whose
// command line points at THIS project, so an unrelated Electron app (VS Code,
// Postman, another project) is never touched.
//
// Usage:  node electron/kill-electron.cjs   (wired into `preelectron:dev`)
// Safe to run when nothing is running: it just prints and exits 0. It never
// blocks the dev server — failures are reported and ignored.

const { execFileSync } = require("child_process");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const isWin = process.platform === "win32";

function log(msg) {
  console.log(`[kill-electron] ${msg}`);
}

// PIDs + command lines of every electron process. Win: CIM; Unix: ps.
function electronProcesses() {
  try {
    if (isWin) {
      const out = execFileSync(
        "powershell",
        [
          "-NoProfile",
          "-Command",
          "Get-CimInstance Win32_Process -Filter \"Name='electron.exe'\" | " +
            "Select-Object ProcessId,CommandLine | ConvertTo-Csv -NoTypeInformation",
        ],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
      );
      return out
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && !/^"ProcessId"/.test(l))
        .map(parseCsvLine)
        .filter((row) => row && /^\d+$/.test(row[0]))
        .map((row) => ({ pid: Number(row[0]), cmd: row[1] || "" }));
    }
    const out = execFileSync("ps", ["-ax", "-o", "pid=,args="], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const m = l.match(/^(\d+)\s+(.*)$/);
        return m ? { pid: Number(m[1]), cmd: m[2] } : null;
      })
      .filter((p) => p && /electron/i.test(p.cmd));
  } catch {
    return [];
  }
}

// Minimal CSV row parser for the 2-column ConvertTo-Csv output. A field is
// either bare or wrapped in double quotes with "" escaping.
function parseCsvLine(line) {
  const cells = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

// Only kill Electron processes that clearly belong to THIS repo.
function isOurs(cmd) {
  if (!cmd) return false;
  const normalized = cmd.replace(/\\/g, "/").toLowerCase();
  const root = ROOT.replace(/\\/g, "/").toLowerCase();
  return normalized.includes(root);
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
  const procs = electronProcesses();
  if (!procs.length) {
    log("no leftover electron processes");
    return;
  }

  let killed = 0;
  let skipped = 0;

  for (const { pid, cmd } of procs) {
    if (pid === process.pid) continue;
    if (!isOurs(cmd)) {
      skipped++;
      const short = cmd.length > 120 ? `${cmd.slice(0, 120)}…` : cmd || "<unreadable>";
      log(`PID ${pid} is not this project's Electron — leaving it alone (${short})`);
      continue;
    }
    log(`killing stale Electron PID ${pid}`);
    if (killTree(pid)) killed++;
    else log(`  could not kill PID ${pid} (already gone?)`);
  }

  if (killed) log(`killed ${killed} stale electron process(es)`);
  if (skipped) log(`left ${skipped} unrelated electron process(es) untouched`);
}

try {
  main();
} catch (err) {
  // Never block the dev server because cleanup failed.
  console.warn(`[kill-electron] skipped cleanup: ${err.message}`);
}
