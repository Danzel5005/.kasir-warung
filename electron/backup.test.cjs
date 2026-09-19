import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";

const require = createRequire(import.meta.url);
const { createBackupService } = require("./backup.cjs");

// ---------------------------------------------------------------------------
// Gap #2 — tes unit main process tanpa dependency baru.
// backup.cjs memakai fs/path murni, jadi cukup diarahkan ke folder sementara.
// ---------------------------------------------------------------------------

let dir;
let files;
let svc;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "kasir-backup-test-"));
  files = {
    dataDir: dir,
    trx: path.join(dir, "transactions.json"),
    wal: path.join(dir, "trx.wal"),
    backups: path.join(dir, "backups"),
  };
  svc = createBackupService({ dataDir: dir, files });
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("backup.cjs: ensureDir & rJSON", () => {
  it("membuat dataDir bila belum ada", () => {
    const nested = path.join(dir, "a", "b");
    const s = createBackupService({ dataDir: nested, files: { wal: path.join(nested, "w"), trx: path.join(nested, "t"), backups: nested } });
    s.ensureDir();
    expect(fs.existsSync(nested)).toBe(true);
  });

  it("mengembalikan null untuk file yang tidak ada", () => {
    expect(svc.rJSON(files.trx)).toBeNull();
  });

  it("mengembalikan null (bukan throw) untuk JSON rusak", () => {
    fs.writeFileSync(files.trx, "{ ini bukan json", "utf-8");
    expect(() => svc.rJSON(files.trx)).not.toThrow();
    expect(svc.rJSON(files.trx)).toBeNull();
  });

  it("membaca JSON yang valid", () => {
    svc.atomicWrite(files.trx, [{ id: "a" }]);
    expect(svc.rJSON(files.trx)).toEqual([{ id: "a" }]);
  });
});

describe("backup.cjs: atomicWrite", () => {
  it("menulis data dan TIDAK meninggalkan file .tmp", () => {
    svc.atomicWrite(files.trx, [{ id: "t1" }]);
    expect(JSON.parse(fs.readFileSync(files.trx, "utf-8"))).toEqual([{ id: "t1" }]);
    expect(fs.existsSync(files.trx + ".tmp")).toBe(false);
  });

  it("menimpa data lama secara utuh (tidak setengah tertulis)", () => {
    svc.atomicWrite(files.trx, [1, 2, 3]);
    svc.atomicWrite(files.trx, [4]);
    expect(svc.rJSON(files.trx)).toEqual([4]);
  });
});

describe("backup.cjs: write-ahead log", () => {
  it("walAppend menambah baris dan walRecover memindahkannya ke transactions", () => {
    svc.atomicWrite(files.trx, [{ id: "lama" }]);
    svc.walAppend({ id: "baru" });

    expect(fs.existsSync(files.wal)).toBe(true);
    svc.walRecover();

    const trx = svc.rJSON(files.trx);
    expect(trx.map((t) => t.id).sort()).toEqual(["baru", "lama"]);
    // WAL dikosongkan setelah recovery supaya tidak diproses dua kali.
    expect(fs.existsSync(files.wal)).toBe(false);
  });

  it("walRecover tidak menggandakan transaksi yang sudah ada (de-dupe by id)", () => {
    svc.atomicWrite(files.trx, [{ id: "sama" }]);
    svc.walAppend({ id: "sama" });
    svc.walRecover();
    expect(svc.rJSON(files.trx)).toHaveLength(1);
  });

  it("walRecover melewati baris WAL rusak tanpa melempar", () => {
    svc.atomicWrite(files.trx, []);
    fs.appendFileSync(files.wal, "bukan json\n", "utf-8");
    svc.walAppend({ id: "baik" });
    expect(() => svc.walRecover()).not.toThrow();
    expect(svc.rJSON(files.trx).map((t) => t.id)).toEqual(["baik"]);
  });

  it("walRecover pada WAL kosong hanya membersihkan file", () => {
    fs.writeFileSync(files.wal, "   \n", "utf-8");
    svc.walRecover();
    expect(fs.existsSync(files.wal)).toBe(false);
  });

  it("walClear aman dipanggil saat WAL tidak ada", () => {
    expect(() => svc.walClear()).not.toThrow();
  });
});

describe("backup.cjs: dailyBackup", () => {
  it("tidak membuat apa pun bila transactions.json belum ada", () => {
    svc.dailyBackup();
    expect(fs.existsSync(files.backups)).toBe(false);
  });

  it("membuat salinan harian sekali saja per hari", () => {
    svc.atomicWrite(files.trx, [{ id: "x" }]);
    svc.dailyBackup();
    const entries = fs.readdirSync(files.backups);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatch(/^trx_\d{4}-\d{2}-\d{2}\.json$/);
    // Panggilan kedua di hari yang sama tidak menimpa / menambah file.
    svc.dailyBackup();
    expect(fs.readdirSync(files.backups)).toHaveLength(1);
  });

  it("memangkas backup lama sehingga tersisa maksimal 30 file", () => {
    svc.atomicWrite(files.trx, []);
    fs.mkdirSync(files.backups, { recursive: true });
    for (let i = 0; i < 35; i += 1) {
      const name = `trx_2000-01-${String((i % 28) + 1).padStart(2, "0")}_${i}.json`;
      fs.writeFileSync(path.join(files.backups, name), "[]", "utf-8");
    }
    svc.dailyBackup();
    const remaining = fs.readdirSync(files.backups).filter((f) => f.startsWith("trx_"));
    expect(remaining.length).toBeLessThanOrEqual(30);
  });

  it("hanya menghapus file ber-pola trx_*.json, bukan file lain", () => {
    svc.atomicWrite(files.trx, []);
    fs.mkdirSync(files.backups, { recursive: true });
    fs.writeFileSync(path.join(files.backups, "catatan-penting.txt"), "jangan hapus", "utf-8");
    for (let i = 0; i < 32; i += 1) {
      fs.writeFileSync(path.join(files.backups, `trx_2000-01-01_${i}.json`), "[]", "utf-8");
    }
    svc.dailyBackup();
    expect(fs.existsSync(path.join(files.backups, "catatan-penting.txt"))).toBe(true);
  });
});
