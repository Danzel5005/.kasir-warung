import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";

const require = createRequire(import.meta.url);
const { createBackupRestoreService } = require("./backup-restore.cjs");

// ---------------------------------------------------------------------------
// Gap #2 (prioritas 3) — backup-restore.cjs adalah modul paling kompleks dan
// paling berharga untuk dites: satu bug di sini bisa menghapus data warung.
// Semua dependency Electron disuntik sebagai stub lewat factory pattern.
// ---------------------------------------------------------------------------

let dir;
let files;
let harness;

function makeFiles(dir) {
  return {
    dataDir: dir,
    menu: path.join(dir, "menu.json"),
    cats: path.join(dir, "categories.json"),
    settings: path.join(dir, "settings.json"),
    users: path.join(dir, "users.json"),
    customers: path.join(dir, "customers.json"),
    qris: path.join(dir, "qris.json"),
    bills: path.join(dir, "open-bills.json"),
    shifts: path.join(dir, "shifts.json"),
    trx: path.join(dir, "transactions.json"),
    logo: path.join(dir, "logo.json"),
    resep: path.join(dir, "resep.json"),
    bahanBaku: path.join(dir, "bahan-baku.json"),
    supplier: path.join(dir, "supplier.json"),
    loyaltyTiers: path.join(dir, "loyalty-tiers.json"),
    db: path.join(dir, "kasir.db"),
    wal: path.join(dir, "trx.wal"),
    backups: path.join(dir, "backups"),
  };
}

function makeHarness({ saveDialog, openDialog } = {}) {
  const registry = {};
  const events = [];
  let closed = 0;
  let inited = 0;
  let migrated = 0;

  const svc = createBackupRestoreService({
    app: { relaunch: () => events.push("relaunch"), exit: (c) => events.push(`exit:${c}`) },
    ipcMain: { handle: (name, fn) => { registry[name] = fn; } },
    dialog: {
      showSaveDialog: saveDialog || (async () => ({ canceled: true })),
      showOpenDialog: openDialog || (async () => ({ canceled: true })),
    },
    files,
    ensureDir: () => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); },
    rJSON: (file) => {
      if (!fs.existsSync(file)) return null;
      try { return JSON.parse(fs.readFileSync(file, "utf-8")); } catch { return null; }
    },
    closeDB: () => { closed += 1; },
    initDB: () => { inited += 1; },
    migrateJSONToSQLite: () => { migrated += 1; },
  });

  return {
    svc,
    registry,
    events,
    getClosed: () => closed,
    getInited: () => inited,
    getMigrated: () => migrated,
  };
}

function seedFiles() {
  fs.writeFileSync(files.menu, JSON.stringify([{ id: "m1", nama: "Kopi" }, { id: "m2", nama: "Teh" }]), "utf-8");
  fs.writeFileSync(files.trx, JSON.stringify([{ id: "t1", total: 10000 }]), "utf-8");
  fs.writeFileSync(files.settings, JSON.stringify({ warungName: "Warung Bu Tini" }), "utf-8");
  fs.writeFileSync(files.users, JSON.stringify([{ username: "admin", password: "scrypt:x:y" }]), "utf-8");
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "kasir-restore-test-"));
  files = makeFiles(dir);
  harness = makeHarness();
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("backup-restore.cjs: STORES", () => {
  it("mencakup semua store yang dipersistensikan termasuk data fitur lanjutan (14 pasangan key/file)", () => {
    expect(harness.svc.STORES).toHaveLength(14);
    expect(harness.svc.STORES.map(([key]) => key)).toEqual([
      "menu", "categories", "settings", "users", "customers",
      "qris", "bills", "shifts", "transactions", "logo",
      "resep", "bahanBaku", "supplier", "loyaltyTiers",
    ]);
  });
});

describe("backup-restore.cjs: stats", () => {
  it("melaporkan jumlah tiap store dan dataDir", () => {
    seedFiles();
    const res = harness.svc.stats();
    expect(res.ok).toBe(true);
    expect(res.dataDir).toBe(dir);
    expect(res.counts.menu).toBe(2);
    expect(res.counts.transactions).toBe(1);
    expect(res.counts.settings).toBe(1);
    expect(res.dbExists).toBe(false);
  });

  it("store yang belum ada dianggap kosong (array -> 0, objek -> 0), bukan error", () => {
    const res = harness.svc.stats();
    expect(res.ok).toBe(true);
    expect(res.counts.menu).toBe(0);
    expect(res.counts.settings).toBe(0);
    expect(res.counts.logo).toBe(0);
  });
});

describe("backup-restore.cjs: createBackup", () => {
  it("menulis file backup yang bisa dibaca kembali dan melaporkan counts", async () => {
    seedFiles();
    const target = path.join(dir, "out.json");
    const res = await harness.svc.createBackup(target, { keepInternal: false });

    expect(res.ok).toBe(true);
    expect(res.filePath).toBe(target);
    expect(res.counts.menu).toBe(2);
    expect(res.total).toBeGreaterThanOrEqual(4);
    expect(fs.existsSync(target)).toBe(true);

    const written = JSON.parse(fs.readFileSync(target, "utf-8"));
    expect(written.format).toBe("kasir-warung-backup");
    expect(written.version).toBe(1);
    expect(written.data.menu).toHaveLength(2);
    expect(written.data.transactions[0].id).toBe("t1");
    // Tidak ada sisa file .tmp setelah atomic write.
    expect(fs.existsSync(`${target}.tmp`)).toBe(false);
  });

  it("membuat salinan internal di folder backups secara default", async () => {
    seedFiles();
    const res = await harness.svc.createBackup(path.join(dir, "out.json"));
    expect(res.internalCopy).toBeTruthy();
    expect(fs.existsSync(res.internalCopy)).toBe(true);
    expect(path.basename(res.internalCopy)).toMatch(/^full_/);
  });

  it("store kosong tetap ditulis dengan bentuk yang benar (array vs objek)", async () => {
    const target = path.join(dir, "empty.json");
    const res = await harness.svc.createBackup(target, { keepInternal: false });
    expect(res.ok).toBe(true);
    const written = JSON.parse(fs.readFileSync(target, "utf-8"));
    expect(written.data.menu).toEqual([]);
    expect(written.data.settings).toEqual({});
    expect(written.data.transactions).toEqual([]);
  });

  it("dialog dibatalkan -> ok:false canceled:true tanpa menulis file", async () => {
    seedFiles();
    const target = path.join(dir, "should-not-exist.json");
    const res = await harness.svc.createBackup(undefined, { keepInternal: false });
    expect(res).toEqual({ ok: false, canceled: true });
    expect(fs.existsSync(target)).toBe(false);
  });

  it("memakai path dari dialog bila target tidak diberikan", async () => {
    seedFiles();
    const chosen = path.join(dir, "from-dialog.json");
    const h = makeHarness({ saveDialog: async () => ({ canceled: false, filePath: chosen }) });
    const res = await h.svc.createBackup(undefined, { keepInternal: false });
    expect(res.ok).toBe(true);
    expect(res.filePath).toBe(chosen);
    expect(fs.existsSync(chosen)).toBe(true);
  });
});

describe("backup-restore.cjs: listInternalBackups", () => {
  it("mengembalikan daftar kosong bila folder belum ada", () => {
    expect(harness.svc.listInternalBackups()).toEqual({ ok: true, backups: [] });
  });

  it("hanya menampilkan full_*.json, terbaru lebih dulu", async () => {
    seedFiles();
    await harness.svc.createBackup(path.join(dir, "a.json"));
    await harness.svc.createBackup(path.join(dir, "b.json"));
    // File lain di folder yang sama tidak boleh ikut terdaftar.
    fs.writeFileSync(path.join(files.backups, "trx_2026-01-01.json"), "[]", "utf-8");

    const res = harness.svc.listInternalBackups();
    expect(res.ok).toBe(true);
    expect(res.backups).toHaveLength(2);
    expect(res.backups.every((b) => b.file.startsWith("full_"))).toBe(true);
    expect(res.backups[0].at >= res.backups[1].at).toBe(true);
  });
});

describe("backup-restore.cjs: previewBackup", () => {
  it("meringkas file backup tanpa menyentuh data hidup", async () => {
    seedFiles();
    const target = path.join(dir, "b.json");
    await harness.svc.createBackup(target, { keepInternal: false });

    const res = await harness.svc.previewBackup(target);
    expect(res.ok).toBe(true);
    expect(res.counts.menu).toBe(2);
    expect(res.empty).toBe(false);
    expect(res.version).toBe(1);
    expect(res.exportedAt).toBeTruthy();
    // Data hidup tidak berubah.
    expect(JSON.parse(fs.readFileSync(files.menu, "utf-8"))).toHaveLength(2);
  });

  it("menerima file JSON mentah (tanpa envelope format)", async () => {
    const bare = path.join(dir, "bare.json");
    fs.writeFileSync(bare, JSON.stringify({ menu: [{ id: 1 }, { id: 2 }, { id: 3 }], users: [] }), "utf-8");
    const res = await harness.svc.previewBackup(bare);
    expect(res.ok).toBe(true);
    expect(res.counts.menu).toBe(3);
    expect(res.counts.users).toBe(0);
  });

  it("menandai backup kosong sebagai empty", async () => {
    const empty = path.join(dir, "empty.json");
    fs.writeFileSync(empty, JSON.stringify({ menu: [], settings: {} }), "utf-8");
    const res = await harness.svc.previewBackup(empty);
    expect(res.ok).toBe(true);
    expect(res.empty).toBe(true);
  });

  it("file tidak ada / JSON rusak -> ok:false dengan pesan, tidak melempar", async () => {
    const missing = await harness.svc.previewBackup(path.join(dir, "tidak-ada.json"));
    expect(missing.ok).toBe(false);
    expect(missing.error).toMatch(/Gagal membaca file backup/);

    const broken = path.join(dir, "broken.json");
    fs.writeFileSync(broken, "{ bukan json", "utf-8");
    const res = await harness.svc.previewBackup(broken);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/Gagal membaca file backup/);
  });

  it("file berisi array (bukan objek) ditolak", async () => {
    const arr = path.join(dir, "arr.json");
    fs.writeFileSync(arr, JSON.stringify([1, 2, 3]), "utf-8");
    const res = await harness.svc.previewBackup(arr);
    expect(res.ok).toBe(false);
    expect(res.error).toBe("File backup tidak berisi data");
  });

  it("dialog dibatalkan -> ok:false canceled:true", async () => {
    const res = await harness.svc.previewBackup(undefined);
    expect(res).toEqual({ ok: false, canceled: true });
  });
});

describe("backup-restore.cjs: restoreBackup", () => {
  async function backupFrom(seedFn) {
    seedFn();
    const target = path.join(dir, "backup.json");
    await harness.svc.createBackup(target, { keepInternal: false });
    return target;
  }

  it("KUNCI: membuat safety snapshot sebelum menimpa data apa pun", async () => {
    const target = await backupFrom(seedFiles);
    fs.writeFileSync(files.menu, JSON.stringify([{ id: "BARU", nama: "Rusak" }]), "utf-8");

    const res = await harness.svc.restoreBackup(target);
    expect(res.ok).toBe(true);
    expect(res.safetyPath).toBeTruthy();
    expect(fs.existsSync(res.safetyPath)).toBe(true);
    expect(path.basename(res.safetyPath)).toMatch(/^pre-restore_/);

    // Safety snapshot merekam kondisi SEBELUM restore (menu yang "Rusak").
    const safety = JSON.parse(fs.readFileSync(res.safetyPath, "utf-8"));
    expect(safety.data.menu[0].id).toBe("BARU");
  });

  it("KUNCI: memulihkan seluruh store ke isi backup", async () => {
    const target = await backupFrom(seedFiles);
    // Rusak semua setelah backup.
    fs.writeFileSync(files.menu, "[]", "utf-8");
    fs.writeFileSync(files.trx, "[]", "utf-8");
    fs.writeFileSync(files.settings, "{}", "utf-8");

    const res = await harness.svc.restoreBackup(target);
    expect(res.ok).toBe(true);
    expect(JSON.parse(fs.readFileSync(files.menu, "utf-8")).map((m) => m.id)).toEqual(["m1", "m2"]);
    expect(JSON.parse(fs.readFileSync(files.trx, "utf-8")).map((t) => t.id)).toEqual(["t1"]);
    expect(JSON.parse(fs.readFileSync(files.settings, "utf-8")).warungName).toBe("Warung Bu Tini");
    expect(res.restored.menu).toBe(2);
  });

  it("KUNCI: data fitur lanjutan (resep, bahan baku, supplier, loyalty) ikut backup & restore", async () => {
    // Seed data fitur lanjutan ke file-file terpisahnya.
    fs.writeFileSync(files.menu, JSON.stringify([{ id: "m1", nama: "Kopi" }]), "utf-8");
    fs.writeFileSync(files.resep, JSON.stringify({ m1: [{ bahanId: "b1", qty: 2 }] }), "utf-8");
    fs.writeFileSync(files.bahanBaku, JSON.stringify([{ id: "b1", nama: "Gula", stok: 10 }]), "utf-8");
    fs.writeFileSync(files.supplier, JSON.stringify([{ id: "s1", nama: "Toko A" }]), "utf-8");
    fs.writeFileSync(files.loyaltyTiers, JSON.stringify([{ nama: "Gold", min: 100000 }]), "utf-8");

    const target = path.join(dir, "backup.json");
    await harness.svc.createBackup(target, { keepInternal: false });

    // Rusak/ kosongkan setelah backup.
    fs.writeFileSync(files.resep, "{}", "utf-8");
    fs.writeFileSync(files.bahanBaku, "[]", "utf-8");
    fs.writeFileSync(files.supplier, "[]", "utf-8");
    fs.writeFileSync(files.loyaltyTiers, "[]", "utf-8");

    const res = await harness.svc.restoreBackup(target);
    expect(res.ok).toBe(true);
    expect(JSON.parse(fs.readFileSync(files.resep, "utf-8"))).toEqual({ m1: [{ bahanId: "b1", qty: 2 }] });
    expect(JSON.parse(fs.readFileSync(files.bahanBaku, "utf-8"))).toEqual([{ id: "b1", nama: "Gula", stok: 10 }]);
    expect(JSON.parse(fs.readFileSync(files.supplier, "utf-8"))).toEqual([{ id: "s1", nama: "Toko A" }]);
    expect(JSON.parse(fs.readFileSync(files.loyaltyTiers, "utf-8"))).toEqual([{ nama: "Gold", min: 100000 }]);
    expect(res.restored.resep).toBe(1);
    expect(res.restored.bahanBaku).toBe(1);
    expect(res.restored.supplier).toBe(1);
    expect(res.restored.loyaltyTiers).toBe(1);
  });

  it("menutup DB, menghapus file sqlite, lalu init+migrate ulang", async () => {
    const target = await backupFrom(seedFiles);
    fs.writeFileSync(files.db, "db-bohongan", "utf-8");
    fs.writeFileSync(`${files.db}-wal`, "wal", "utf-8");
    fs.writeFileSync(`${files.db}-shm`, "shm", "utf-8");

    const res = await harness.svc.restoreBackup(target);
    expect(res.ok).toBe(true);
    expect(harness.getClosed()).toBe(1);
    expect(harness.getInited()).toBe(1);
    expect(harness.getMigrated()).toBe(1);
    expect(res.dbReopened).toBe(true);
    expect(fs.existsSync(res.filePath)).toBe(true);
  });

  it("menghapus WAL dan mengembalikan restartRecommended", async () => {
    const target = await backupFrom(seedFiles);
    fs.writeFileSync(files.wal, "{}\n", "utf-8");
    const res = await harness.svc.restoreBackup(target);
    expect(fs.existsSync(files.wal)).toBe(false);
    expect(res.restartRecommended).toBe(true);
  });

  it("key store yang TIDAK ada di file backup dibiarkan apa adanya", async () => {
    seedFiles();
    fs.writeFileSync(files.logo, JSON.stringify({ data: "logo-lama" }), "utf-8");
    // Backup sengaja hanya berisi `menu` -> `logo` bukan bagian dari restore.
    const partial = path.join(dir, "partial.json");
    fs.writeFileSync(partial, JSON.stringify({ menu: [{ id: "X" }] }), "utf-8");

    const res = await harness.svc.restoreBackup(partial);
    expect(res.ok).toBe(true);
    // `menu` ditimpa, tetapi `logo` harus tetap utuh.
    expect(JSON.parse(fs.readFileSync(files.menu, "utf-8"))).toEqual([{ id: "X" }]);
    expect(JSON.parse(fs.readFileSync(files.logo, "utf-8")).data).toBe("logo-lama");
  });

  it("menerima file JSON mentah tanpa envelope", async () => {
    const bare = path.join(dir, "bare.json");
    fs.writeFileSync(bare, JSON.stringify({ menu: [{ id: "X" }] }), "utf-8");
    const res = await harness.svc.restoreBackup(bare);
    expect(res.ok).toBe(true);
    expect(JSON.parse(fs.readFileSync(files.menu, "utf-8"))).toEqual([{ id: "X" }]);
  });

  it("file backup rusak -> ok:false dan data hidup TIDAK tersentuh", async () => {
    seedFiles();
    const before = fs.readFileSync(files.menu, "utf-8");
    const broken = path.join(dir, "broken.json");
    fs.writeFileSync(broken, "{ bukan json", "utf-8");

    const res = await harness.svc.restoreBackup(broken);
    expect(res.ok).toBe(false);
    expect(res.error).toBeTruthy();
    expect(fs.readFileSync(files.menu, "utf-8")).toBe(before);
  });

  it("file berisi array ditolak tanpa menyentuh data", async () => {
    seedFiles();
    const arr = path.join(dir, "arr.json");
    fs.writeFileSync(arr, "[1,2,3]", "utf-8");
    const res = await harness.svc.restoreBackup(arr);
    expect(res.ok).toBe(false);
    expect(res.error).toBe("File backup tidak berisi data");
  });

  it("dialog dibatalkan -> ok:false canceled:true", async () => {
    seedFiles();
    expect(await harness.svc.restoreBackup(undefined)).toEqual({ ok: false, canceled: true });
  });
});

describe("backup-restore.cjs: registerHandlers", () => {
  it("mendaftarkan semua kanal backup", () => {
    harness.svc.registerHandlers();
    expect(Object.keys(harness.registry).sort()).toEqual([
      "backup-create", "backup-list-internal", "backup-open-folder",
      "backup-preview", "backup-relaunch", "backup-restore", "backup-stats", "backup-summary",
    ]);
  });

  it("backup-relaunch memanggil relaunch lalu exit(0)", () => {
    harness.svc.registerHandlers();
    expect(harness.registry["backup-relaunch"]()).toEqual({ ok: true });
    expect(harness.events).toEqual(["relaunch", "exit:0"]);
  });

  it("backup-open-folder melaporkan error dengan rapi (tanpa Electron asli)", async () => {
    harness.svc.registerHandlers();
    const res = await harness.registry["backup-open-folder"]();
    // `require("electron")` di luar runtime Electron tidak punya .shell -> error
    // ditangkap, bukan dilempar ke renderer.
    expect(res.ok).toBe(false);
    expect(typeof res.error).toBe("string");
  });
});
