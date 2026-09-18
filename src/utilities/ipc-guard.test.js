import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { safeIpc, isMissingHandlerError, missingHandlerChannel, RESTART_HINT } from "./ipc-guard.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(path.join(here, rel), "utf8");

const noHandlerError = (channel) =>
  new Error(`Error invoking remote method '${channel}': Error: No handler registered for '${channel}'`);

describe("ipc-guard: detection", () => {
  it("mengenali error 'No handler registered'", () => {
    expect(isMissingHandlerError(noHandlerError("backup-stats"))).toBe(true);
  });

  it("mengabaikan error lain", () => {
    expect(isMissingHandlerError(new Error("disk penuh"))).toBe(false);
    expect(isMissingHandlerError(undefined)).toBe(false);
  });

  it("mengambil nama channel dari pesan error", () => {
    expect(missingHandlerChannel(noHandlerError("backup-create"))).toBe("backup-create");
    expect(missingHandlerChannel(new Error("lain"))).toBe(null);
  });
});

describe("ipc-guard: safeIpc", () => {
  let warn;
  let errorSpy;
  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    warn.mockRestore();
    errorSpy.mockRestore();
  });

  it("mengembalikan hasil apa adanya saat sukses", async () => {
    const res = await safeIpc("test", async () => ({ ok: true, value: 7 }));
    expect(res).toEqual({ ok: true, value: 7 });
  });

  it("mengubah 'No handler registered' menjadi needsRestart (bukan throw)", async () => {
    const res = await safeIpc("Backup stats", async () => { throw noHandlerError("backup-stats"); });
    expect(res.ok).toBe(false);
    expect(res.needsRestart).toBe(true);
    expect(res.error).toContain(RESTART_HINT);
    expect(res.error).toContain("backup-stats");
  });

  it("mempertahankan shape fallback (mis. backups: [])", async () => {
    const res = await safeIpc("Daftar", async () => { throw noHandlerError("backup-list-internal"); }, { fallback: { backups: [] } });
    expect(res.ok).toBe(false);
    expect(res.backups).toEqual([]);
  });

  it("error biasa jadi { ok:false } tanpa needsRestart", async () => {
    const res = await safeIpc("Backup", async () => { throw new Error("gagal menulis file"); });
    expect(res.ok).toBe(false);
    expect(res.needsRestart).toBeUndefined();
    expect(res.error).toBe("gagal menulis file");
  });

  it("tidak pernah reject walaupun fn throw non-Error", async () => {
    await expect(safeIpc("x", async () => { throw "boom"; })).resolves.toMatchObject({ ok: false });
  });
});

describe("wiring: ErrorBoundary terpasang", () => {
  it("main.jsx membungkus App dengan ErrorBoundary", () => {
    const src = read("../main.jsx");
    expect(src).toContain("ErrorBoundary");
    expect(src).toMatch(/<ErrorBoundary>[\s\S]*<App\s*\/>[\s\S]*<\/ErrorBoundary>/);
  });

  it("ErrorBoundary punya getDerivedStateFromError + componentDidCatch", () => {
    const src = read("../components/ErrorBoundary.jsx");
    expect(src).toContain("getDerivedStateFromError");
    expect(src).toContain("componentDidCatch");
  });
});

describe("wiring: dev runner untuk main process", () => {
  it("package.json memakai dev-runner (bukan electron langsung)", () => {
    const pkg = JSON.parse(read("../../package.json"));
    expect(pkg.scripts["electron:dev"]).toContain("dev-runner.cjs");
    // jalur lama tetap tersedia sebagai escape hatch
    expect(pkg.scripts["electron:plain"]).toContain("electron .");
  });

  it("dev-runner memantau folder electron/", () => {
    const src = read("../../electron/dev-runner.cjs");
    expect(src).toContain("fs.watch");
    expect(src).toContain("restartElectron");
    // harus mengecualikan dirinya sendiri agar tidak restart-loop
    expect(src).toContain('entry.name === "dev-runner.cjs"');
  });
});

// Regresi dari bug nyata: `toast_ is not defined` dan `TX is not defined`.
// Konstanta desain yang dipakai tapi tidak di-import = crash saat render.
describe("regresi: konstanta desain harus di-import", () => {
  const CONSTANTS = ["G", "W", "BD", "MT", "LT", "TX", "OR", "BG", "RADIUS", "TYPOGRAPHY", "COLOR_PALETTE"];

  const files = [
    "../components/BackupRestorePanel.jsx",
    "../components/ErrorBoundary.jsx",
    "../components/modals/SettingsPanels.jsx",
    "../components/modals/SettingsModal.jsx",
    "../views/ViewKelola.jsx",
  ];

  it.each(files)("%s mengimpor setiap konstanta desain yang dipakai", (rel) => {
    const src = read(rel);
    const importLine = (src.split("\n").find((l) => l.includes("constants/design")) || "");
    const missing = CONSTANTS.filter((c) => {
      const used = new RegExp(`\\b${c}\\b`).test(src);
      if (!used) return false;
      return !new RegExp(`\\b${c}\\b`).test(importLine);
    });
    expect(missing, `konstanta dipakai tapi tidak di-import: ${missing.join(", ")}`).toEqual([]);
  });
});
