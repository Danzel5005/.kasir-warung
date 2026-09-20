import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";

const require = createRequire(import.meta.url);

// ---------------------------------------------------------------------------
// better-sqlite3 adalah native module yang di-rebuild untuk ABI Electron
// (lihat script postinstall `@electron/rebuild`), jadi binary-nya TIDAK bisa
// di-require dari Node biasa yang dipakai Vitest. Supaya tes tetap deterministik
// di mesin mana pun, kita suntik implementasi in-memory dengan semantik SQL
// terbatas yang benar-benar dipakai db.cjs (lihat FakeStatement/FakeDatabase).
// ---------------------------------------------------------------------------
class FakeStatement {
  constructor(db, sql) { this.db = db; this.sql = sql; }
  run(...params) { return this.db._run(this.sql, params); }
  get(...params) { return this.db._all(this.sql, params)[0]; }
  all(...params) { return this.db._all(this.sql, params); }
}

const DATE_EXPR = String.raw`date\(created_at\)`;
const SHIFT_EXPR = String.raw`json_extract\(data, '\$\.shiftId'\)`;
const NUM = /^-?\d+(\.\d+)?$/;

class FakeDatabase {
  constructor() { this.tables = { transactions: [], shifts: [] }; this.closed = false; this.nextRowid = 1; }
  pragma() { return "wal"; }
  exec(sql) {
    for (const stmt of String(sql).split(";").map((s) => s.trim()).filter(Boolean)) {
      const del = /^DELETE\s+FROM\s+(\w+)$/i.exec(stmt);
      if (del) { this.tables[del[1]] = []; continue; }
      if (/^(CREATE|PRAGMA|BEGIN|COMMIT)/i.test(stmt)) continue; // DDL di tidak diuji
      throw new Error(`FakeDatabase.exec belum mendukung: ${stmt}`);
    }
  }
  prepare(sql) { return new FakeStatement(this, sql.replace(/\s+/g, " ").trim()); }
  transaction(fn) { return (...args) => fn(...args); }
  close() { this.closed = true; }

  _rows(table) { return this.tables[table] || []; }

  // Mengevaluasi ekspresi SELECT/WHERE yang dipakai db.cjs terhadap satu baris.
  _value(row, expr) {
    const e = expr.trim();
    if (e === "id") return row.id;
    if (e === "data") return row.data;
    if (e === "created_at") return row.created_at;
    if (e === "menu_id") return row.menu_id;
    if (e === "kategori") return row.kategori;
    if (e === "stok") return row.stok;
    if (new RegExp(`^${DATE_EXPR}$`).test(e)) return row.created_at.slice(0, 10);
    const j = new RegExp(`^json_extract\\(data, '\\$\\.(\\w+)'\\)$`).exec(e);
    if (j) { try { return JSON.parse(row.data)?.[j[1]]; } catch { return undefined; } }
    if (e === "COUNT(*) as total" || e === "COUNT(*) as count") return null;
    if (/^SUM\(/.test(e)) return null;
    throw new Error(`FakeDatabase._value belum mendukung ekspresi: ${e}`);
  }

  _sort(rows, clause) {
    const m = /ORDER BY (.+?)(?: LIMIT|$)/i.exec(clause || "");
    if (!m) return rows;
    const desc = /DESC/i.test(m[1]);
    const lower = m[1].toLowerCase();
    const sorted = [...rows].sort((a, b) => {
      if (lower.includes("json_extract")) {
        const av = this._value(a, `json_extract(data, '$.shiftId')`) ?? "";
        const bv = this._value(b, `json_extract(data, '$.shiftId')`) ?? "";
        return av === bv ? 0 : (av < bv ? -1 : 1);
      }
      if (lower.includes("date(created_at)")) {
        const av = a.created_at.slice(0, 10); const bv = b.created_at.slice(0, 10);
        return av === bv ? 0 : (av < bv ? -1 : 1);
      }
      const av = lower === "id" ? a.id : a.created_at;
      const bv = lower === "id" ? b.id : b.created_at;
      return av === bv ? 0 : (av < bv ? -1 : 1);
    });
    return desc ? sorted.reverse() : sorted;
  }

  _where(row, clause) {
    const m = /WHERE (.+?)(?: GROUP BY| ORDER BY| LIMIT|$)/i.exec(clause || "");
    if (!m || m[1].trim() === "") return true;
    const cond = m[1].trim();

    const isNull = new RegExp(`^${SHIFT_EXPR} IS NOT NULL$`, "i").exec(cond);
    if (isNull) {
      const v = this._value(row, `json_extract(data, '$.shiftId')`);
      return v !== undefined && v !== null;
    }

    const cmp = /^(.+?)\s*(>=|<=|!=|=)\s*(\?|\d+|'[^']*')$/i.exec(cond);
    if (cmp) {
      const left = this._value(row, cmp[1]);
      const op = cmp[2];
      const right = cmp[3] === "?" ? this._lastParams?.[this._popped++] : cmp[3].replace(/^'|'$/g, "");
      if (op === "=") return String(left) === String(right);
      if (op === "!=") return String(left) !== String(right);
      if (op === ">=") return String(left) >= String(right);
      if (op === "<=") return String(left) <= String(right);
    }
    throw new Error(`FakeDatabase._where belum mendukung kondisi: ${cond}`);
  }

  _all(sql, params) {
    const table = /FROM\s+(\w+)/i.exec(sql)?.[1];
    if (!table) throw new Error(`FakeDatabase: tidak menemukan tabel di: ${sql}`);
    this._lastParams = params;
    // PENTING: tiap baris membaca ulang parameter `?` yang sama, jadi pointer
    // parameter harus di-reset PER BARIS. Kalau hanya di-reset sekali di sini,
    // WHERE yang cocok bukan dengan baris pertama akan salah menilai (bug laten
    // yang muncul begitu ada query `WHERE id = ?` pada tabel berisi >1 baris).
    let rows = this._rows(table).filter((row) => { this._popped = 0; return this._where(row, sql); });

    if (/GROUP BY/i.test(sql)) {
      const grouped = new Map();
      for (const row of rows) {
        const key = row.created_at.slice(0, 10);
        const cur = grouped.get(key) || { date: key, count: 0, total: 0, pax: 0, subtotal: 0 };
        cur.count += 1;
        try {
          const d = JSON.parse(row.data) || {};
          cur.total += Number(d.total) || 0;
          cur.pax += Number(d.pax) || 0;
          cur.subtotal += Number(d.subtotal) || 0;
        } catch { /* baris rusak diabaikan */ }
        grouped.set(key, cur);
      }
      return this._sort([...grouped.values()], sql);
    }

    const select = sql.slice(0, sql.search(/\s+FROM\s/i)).replace(/^SELECT\s+/i, "");
    if (select.trim() !== "*") {
      // trx-get-shift-ids: SELECT DISTINCT json_extract(data, '$.shiftId') as shiftId
      // Dicek SEBELUM regex generik supaya tidak salah masuk jalur proyeksi kolom.
      if (new RegExp(`^DISTINCT\\s+${SHIFT_EXPR} as shiftId$`, "i").test(select.trim())) {
        const seen = new Set();
        const out = [];
        for (const row of rows) {
          const v = this._value(row, `json_extract(data, '$.shiftId')`);
          if (v !== undefined && v !== null && !seen.has(v)) { seen.add(v); out.push({ shiftId: v }); }
        }
        return out.sort((a, b) => (a.shiftId === b.shiftId ? 0 : (a.shiftId < b.shiftId ? 1 : -1)));
      }
      const wants = (expr) => new RegExp(`(^|,\\s*)${expr}(\\s*(as\\s+\\w+)?)?\\s*(,|$)`).test(select);
      const projection = {};
      if (wants("id")) projection.id = (row) => row.id;
      if (wants("menu_id")) projection.menu_id = (row) => row.menu_id;
      if (wants("kategori")) projection.kategori = (row) => row.kategori;
      if (wants("stok")) projection.stok = (row) => row.stok;
      if (wants("data")) projection.data = (row) => row.data;
      if (wants("created_at")) projection.created_at = (row) => row.created_at;
      // COUNT(*) as total / as count — dipakai trx-load-filtered.
      if (/^COUNT\(\*\) as (total|count)$/i.test(select.trim())) {
        const alias = /\bas\s+(total|count)$/i.exec(select.trim())[1];
        return [{ [alias]: rows.length }];
      }
      const done = new RegExp(`(^|,\\s*)(COUNT|SUM|${DATE_EXPR}|${SHIFT_EXPR})`, "i");
      if (done.test(select)) {
        // Query agregat/ekspresi khusus: hanya trx-get-shift-ids yang dipakai.
        if (new RegExp(`^${SHIFT_EXPR} as shiftId$`, "i").test(select.trim())) {
          const seen = new Set();
          const out = [];
          for (const row of rows) {
            const v = this._value(row, `json_extract(data, '$.shiftId')`);
            if (v !== undefined && v !== null && !seen.has(v)) { seen.add(v); out.push({ shiftId: v }); }
          }
          return out.sort((a, b) => (a.shiftId === b.shiftId ? 0 : (a.shiftId < b.shiftId ? 1 : -1)));
        }
        throw new Error(`FakeDatabase: SELECT tidak didukung: ${select}`);
      }
      rows = rows.map((row) => {
        const out = {};
        for (const [key, fn] of Object.entries(projection)) out[key] = fn(row);
        return out;
      });
    } else {
      rows = rows.map((row) => ({ id: row.id, data: row.data, created_at: row.created_at }));
    }

    rows = this._sort(rows, sql);

    // LIMIT ? OFFSET ?, atau LIMIT <n> [OFFSET <n>]. Nilai "?" diambil dari
    // parameter SETELAH parameter WHERE yang sudah dikonsumsi.
    const limit = /LIMIT\s+(\?|\d+)\s*(?:OFFSET\s+(\?|\d+))?/i.exec(sql);
    if (limit) {
      const pick = (token, index) => (token === "?" ? params[index] : Number(token));
      let size = pick(limit[1], this._popped);
      let offset = limit[2] ? pick(limit[2], this._popped + (limit[1] === "?" ? 1 : 0)) : 0;
      size = Number(size);
      if (Number.isFinite(size) && Number.isFinite(offset)) rows = rows.slice(offset, offset + size);
    }
    return rows;
  }

  _run(sql, params) {
    const insert = /^INSERT (OR IGNORE )?INTO\s+(\w+)\s*\((.*?)\)\s*VALUES\s*\((.*?)\)$/i.exec(sql);
    if (insert) {
      const [, ignore, table, colsRaw, valsRaw] = insert;
      const cols = colsRaw.split(",").map((c) => c.trim());
      const rows = this.tables[table] || (this.tables[table] = []);
      const row = { rowid: this.nextRowid++, created_at: new Date().toISOString() };
      cols.forEach((col, i) => { row[col] = params[i]; });
      if (ignore && cols.includes("id") && rows.some((r) => r.id === row.id)) return { changes: 0 };
      if (cols.includes("id") && rows.some((r) => r.id === row.id)) {
        const err = new Error("UNIQUE constraint failed");
        err.code = "SQLITE_CONSTRAINT_PRIMARYKEY";
        throw err;
      }
      rows.push(row);
      return { changes: 1 };
    }

    const update = /^UPDATE\s+(\w+)\s+SET\s+data\s*=\s*\?\s+WHERE\s+id\s*=\s*\?$/i.exec(sql);
    if (update) {
      const rows = this.tables[update[1]] || [];
      const target = rows.find((r) => r.id === params[1]);
      if (!target) return { changes: 0 };
      target.data = params[0];
      return { changes: 1 };
    }

    // UPDATE products: dua bentuk (upsertMenuRow) — dengan & tanpa stok.
    const updStock = /^UPDATE\s+(\w+)\s+SET\s+kategori\s*=\s*\?\s*,\s*stok\s*=\s*\?\s*,\s*data\s*=\s*\?\s+WHERE\s+menu_id\s*=\s*\?$/i.exec(sql);
    if (updStock) {
      const rows = this.tables[updStock[1]] || [];
      const target = rows.find((r) => String(r.menu_id) === String(params[3]));
      if (!target) return { changes: 0 };
      target.kategori = params[0]; target.stok = params[1]; target.data = params[2];
      return { changes: 1 };
    }
    const updNoStock = /^UPDATE\s+(\w+)\s+SET\s+kategori\s*=\s*\?\s*,\s*data\s*=\s*\?\s+WHERE\s+menu_id\s*=\s*\?$/i.exec(sql);
    if (updNoStock) {
      const rows = this.tables[updNoStock[1]] || [];
      const target = rows.find((r) => String(r.menu_id) === String(params[2]));
      if (!target) return { changes: 0 };
      target.kategori = params[0]; target.data = params[1];
      return { changes: 1 };
    }
    const updStockOnly = /^UPDATE\s+(\w+)\s+SET\s+stok\s*=\s*\?\s+WHERE\s+menu_id\s*=\s*\?$/i.exec(sql);
    if (updStockOnly) {
      const rows = this.tables[updStockOnly[1]] || [];
      const target = rows.find((r) => String(r.menu_id) === String(params[1]));
      if (!target) return { changes: 0 };
      target.stok = params[0];
      return { changes: 1 };
    }

    const del = /^DELETE\s+FROM\s+(\w+)\s+WHERE\s+id\s*=\s*\?$/i.exec(sql);
    if (del) {
      const rows = this.tables[del[1]] || [];
      const before = rows.length;
      this.tables[del[1]] = rows.filter((r) => r.id !== params[0]);
      return { changes: before - this.tables[del[1]].length };
    }
    const delMenu = /^DELETE\s+FROM\s+(\w+)\s+WHERE\s+menu_id\s*=\s*\?$/i.exec(sql);
    if (delMenu) {
      const rows = this.tables[delMenu[1]] || [];
      const before = rows.length;
      this.tables[delMenu[1]] = rows.filter((r) => String(r.menu_id) !== String(params[0]));
      return { changes: before - this.tables[delMenu[1]].length };
    }

    throw new Error(`FakeDatabase: statement tidak didukung: ${sql}`);
  }
}

class FakeBetterSqlite3 {
  static instances = [];
  constructor() { this.inner = new FakeDatabase(); FakeBetterSqlite3.instances.push(this.inner); }
  pragma(sql) { return this.inner.pragma(sql); }
  exec(sql) { return this.inner.exec(sql); }
  prepare(sql) { return this.inner.prepare(sql); }
  transaction(fn) { return this.inner.transaction(fn); }
  close() { return this.inner.close(); }
}

const dbPath = require.resolve("better-sqlite3");
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true, exports: FakeBetterSqlite3,
  children: [], paths: [],
};

const { createDatabaseService } = require("./db.cjs");

// ---------------------------------------------------------------------------
// Gap #2 — tes unit db.cjs memakai better-sqlite3 yang asli (sudah jadi
// dependency) dan `ipcMain` palsu berbentuk registry nama->handler.
// ---------------------------------------------------------------------------

let dir;
let files;
let services;

function makeService({ withWal = true } = {}) {
  const registry = {};
  const services = {
    registry,
    writes: [],
    wal: [],
    walCleared: 0,
  };
  const svc = createDatabaseService({
    ipcMain: { handle: (name, fn) => { registry[name] = fn; } },
    files,
    ensureDir: () => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); },
    rJSON: (file) => {
      if (!fs.existsSync(file)) return null;
      try { return JSON.parse(fs.readFileSync(file, "utf-8")); } catch { return null; }
    },
    atomicWrite: (file, data) => {
      services.writes.push({ file, data });
      fs.writeFileSync(file, JSON.stringify(data), "utf-8");
    },
    walAppend: withWal ? (trx) => services.wal.push(trx) : undefined,
    walClear: withWal ? () => { services.walCleared += 1; } : undefined,
  });
  // Nilai primitif (walCleared) TIDAK boleh di-spread: spread menyalin nilainya
  // saat itu juga, jadi closure yang menaikkan counter tidak akan terlihat oleh
  // tes. Kembalikan objek hidup yang sama.
  services.svc = svc;
  return services;
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "kasir-db-test-"));
  files = {
    dataDir: dir,
    db: path.join(dir, "kasir.db"),
    trx: path.join(dir, "transactions.json"),
    shifts: path.join(dir, "shifts.json"),
    menu: path.join(dir, "menu.json"),
    bills: path.join(dir, "open-bills.json"),
    jsonBackups: path.join(dir, "json-backups"),
  };
  // PENTING: hasilnya harus di-assign balik ke variabel module-level `services`.
  // Kalau tidak, badan tes membaca objek lama (counter walCleared tetap 0)
  // sementara handler menulis ke objek baru -> assertion gagal palsu.
  const built = makeService();
  services = built;
});

afterEach(() => {
  try { services.svc.closeDB(); } catch { /* sudah tertutup */ }
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("db.cjs: initDB & registerHandlers", () => {
  it("initDB mengembalikan true dan mendaftarkan seluruh handler", () => {
    expect(services.svc.initDB()).toBe(true);
    services.svc.registerHandlers();
    expect(Object.keys(services.registry).sort()).toEqual([
      "apply-stock", "menu-delete", "menu-load", "menu-replace", "menu-upsert",
      "process-payment", "shifts-load", "shifts-save",
      "trx-clear", "trx-delete", "trx-get-daily-stats", "trx-get-shift-ids",
      "trx-load", "trx-load-filtered", "trx-restore", "trx-restore-cleared",
      "trx-save", "trx-void",
    ]);
  });

  it("handler aman dipanggil sebelum initDB (db null) tanpa melempar", () => {
    services.svc.registerHandlers();
    expect(services.registry["trx-load"]()).toEqual([]);
    expect(services.registry["shifts-load"]()).toEqual([]);
    expect(services.registry["trx-get-shift-ids"]()).toEqual([]);
    expect(services.registry["trx-get-daily-stats"](null, {})).toEqual([]);
  });
});

describe("db.cjs: CRUD transaksi (jalur SQLite)", () => {
  beforeEach(() => {
    services.svc.initDB();
    services.svc.registerHandlers();
  });

  const call = (name, ...args) => services.registry[name](null, ...args);

  it("trx-save lalu trx-load mengembalikan transaksi utuh", () => {
    expect(call("trx-save", { id: "t1", total: 25000, shiftId: "s1" })).toEqual({ ok: true });
    const loaded = call("trx-load");
    expect(loaded).toHaveLength(1);
    expect(loaded[0]).toEqual({ id: "t1", total: 25000, shiftId: "s1" });
  });

  it("id duplikat ditolak sebagai error, bukan crash", () => {
    call("trx-save", { id: "t1", total: 1 });
    const dup = call("trx-save", { id: "t1", total: 2 });
    expect(dup.ok).toBe(false);
    expect(call("trx-load")).toHaveLength(1);
  });

  it("trx-delete menghapus tepat satu transaksi", () => {
    call("trx-save", { id: "a", total: 1 });
    call("trx-save", { id: "b", total: 2 });
    expect(call("trx-delete", "a")).toMatchObject({ ok: true });
    expect(call("trx-load").map((t) => t.id)).toEqual(["b"]);
  });

  it("trx-void mem-patch data dan menandai status voided", () => {
    call("trx-save", { id: "v1", total: 5000 });
    const res = call("trx-void", "v1", { reason: "salah input", actor: "admin", note: "n" });
    expect(res.ok).toBe(true);
    const [trx] = call("trx-load");
    expect(trx.status).toBe("voided");
    expect(trx.voidReason).toBe("salah input");
    expect(trx.voidedBy).toBe("admin");
    expect(trx.total).toBe(5000);
  });

  it("trx-void untuk id tak dikenal mengembalikan ok:false", () => {
    expect(call("trx-void", "tidak-ada", {})).toMatchObject({ ok: false });
  });

  it("trx-void mengembalikan stok item (baseQty) dan mengembalikan menu terbaru", () => {
    call("menu-replace", [
      { id: "m1", nama: "Kopi", stok: 3 },
      { id: "m2", nama: "Teh", stok: 10 },
      { id: "m3", nama: "Air", stok: null }, // stok tak terbatas -> dilewati
    ]);
    call("trx-save", {
      id: "v-stok",
      items: [
        { id: "m1", qty: 2, baseQty: 2 }, // 3 + 2 = 5
        { id: "m2", qty: 1 },             // tanpa baseQty -> pakai qty -> 11
        { id: "m3", qty: 1 },             // stok null -> dilewati
        { id: "m-hapus", qty: 5 },        // tidak ada di menu -> dilewati
      ],
    });
    const res = call("trx-void", "v-stok", { reason: "refund" });
    expect(res.ok).toBe(true);
    const menu = call("menu-load");
    const byId = Object.fromEntries(menu.map((m) => [m.id, m]));
    expect(byId.m1.stok).toBe(5);
    expect(byId.m2.stok).toBe(11);
    expect(byId.m3.stok).toBe(null);
  });

  it("trx-void dua kali ditolak supaya stok tidak kembali dua kali", () => {
    call("menu-replace", [{ id: "m1", nama: "Kopi", stok: 3 }]);
    call("trx-save", { id: "v2x", items: [{ id: "m1", qty: 2 }] });
    expect(call("trx-void", "v2x", {}).ok).toBe(true);
    const second = call("trx-void", "v2x", {});
    expect(second.ok).toBe(false);
    const byId = Object.fromEntries(call("menu-load").map((m) => [m.id, m]));
    expect(byId.m1.stok).toBe(5); // bukan 7
  });

  it("trx-restore mengganti SELURUH isi tabel", () => {
    call("trx-save", { id: "lama", total: 1 });
    expect(call("trx-restore", [{ id: "x", total: 9 }])).toEqual({ ok: true });
    expect(call("trx-load").map((t) => t.id)).toEqual(["x"]);
  });

  it("trx-clear mengosongkan tabel", () => {
    call("trx-save", { id: "a", total: 1 });
    expect(call("trx-clear")).toMatchObject({ ok: true });
    expect(call("trx-load")).toEqual([]);
  });

  it("trx-get-shift-ids mengembalikan shift unik dan mengabaikan yang kosong", () => {
    call("trx-save", { id: "a", shiftId: "s1" });
    call("trx-save", { id: "b", shiftId: "s1" });
    call("trx-save", { id: "c", shiftId: "s2" });
    call("trx-save", { id: "d" });
    const ids = call("trx-get-shift-ids");
    expect([...ids].sort()).toEqual(["s1", "s2"]);
  });

  it("trx-get-daily-stats mengagregasi total per hari", () => {
    call("trx-save", { id: "a", total: 1000, pax: 2, subtotal: 900, shiftId: "s1" });
    call("trx-save", { id: "b", total: 2000, pax: 3, subtotal: 1800, shiftId: "s1" });
    const stats = call("trx-get-daily-stats", {});
    expect(stats).toHaveLength(1);
    expect(stats[0].count).toBe(2);
    expect(stats[0].total).toBe(3000);
    expect(stats[0].pax).toBe(5);
  });

  it("trx-load-filtered memfilter berdasarkan shiftId", () => {
    call("trx-save", { id: "a", total: 1, shiftId: "s1" });
    call("trx-save", { id: "b", total: 2, shiftId: "s2" });
    const result = call("trx-load-filtered", { shiftId: "s1", page: 0, pageSize: 10 });
    expect(result.total).toBe(1);
    expect(result.transactions.map((t) => t.id)).toEqual(["a"]);
  });

  it("trx-load-filtered mem-paginate dan melaporkan total keseluruhan", () => {
    for (let i = 0; i < 5; i += 1) call("trx-save", { id: `t${i}`, total: i });
    const page1 = call("trx-load-filtered", { page: 0, pageSize: 2 });
    const page2 = call("trx-load-filtered", { page: 1, pageSize: 2 });
    expect(page1.total).toBe(5);
    expect(page1.transactions).toHaveLength(2);
    expect(page2.transactions).toHaveLength(2);
    expect(page1.transactions.map((t) => t.id)).not.toEqual(page2.transactions.map((t) => t.id));
  });
});

// Regresi bug "undo hapus bisa menghapus data": dulu undo memakai trx-restore,
// yang menimpa SELURUH tabel dengan satu halaman riwayat dari renderer. Sekarang
// undo hapus-satu memakai trx-save (INSERT tunggal) dan undo hapus-semua memakai
// snapshot penuh yang ditulis main process sebelum DELETE.
describe("db.cjs: undo hapus transaksi tidak menghapus data lain", () => {
  beforeEach(() => {
    services.svc.initDB();
    services.svc.registerHandlers();
  });
  const call = (name, ...args) => services.registry[name](null, ...args);

  it("trx-delete mengembalikan baris yang dihapus supaya bisa di-undo via trx-save", () => {
    call("trx-save", { id: "a", total: 1 });
    call("trx-save", { id: "b", total: 2 });
    const res = call("trx-delete", "a");
    expect(res.ok).toBe(true);
    expect(res.trx).toEqual({ id: "a", total: 1 });
    expect(call("trx-load").map((t) => t.id)).toEqual(["b"]);

    // Undo: INSERT tunggal, bukan restore yang menimpa tabel.
    call("trx-save", res.trx);
    expect(call("trx-load").map((t) => t.id).sort()).toEqual(["a", "b"]);
  });

  it("trx-delete id tak dikenal mengembalikan trx null tanpa melempar", () => {
    const res = call("trx-delete", "tidak-ada");
    expect(res.ok).toBe(true);
    expect(res.trx).toBeNull();
  });

  it("baris di luar halaman renderer tetap aman: hapus 1 lalu simpan ulang, total tetap", () => {
    for (let i = 0; i < 3; i += 1) call("trx-save", { id: `t${i}`, total: i });
    const res = call("trx-delete", "t1");
    call("trx-save", res.trx); // undo
    expect(call("trx-load").map((t) => t.id).sort()).toEqual(["t0", "t1", "t2"]);
  });

  it("trx-clear menulis snapshot SEMUA baris ke jsonBackups lalu mengosongkan tabel", () => {
    for (let i = 0; i < 3; i += 1) call("trx-save", { id: `t${i}`, total: i });
    const res = call("trx-clear");
    expect(res.ok).toBe(true);
    expect(typeof res.backupFile).toBe("string");
    expect(res.backupFile).toContain("trx-cleared-");
    expect(fs.existsSync(res.backupFile)).toBe(true);
    expect(call("trx-load")).toEqual([]);

    const snap = JSON.parse(fs.readFileSync(res.backupFile, "utf-8"));
    expect(snap.map((t) => t.id).sort()).toEqual(["t0", "t1", "t2"]);
  });

  it("trx-restore-cleared mengembalikan SEMUA baris snapshot (bukan cuma satu halaman)", () => {
    for (let i = 0; i < 3; i += 1) call("trx-save", { id: `t${i}`, total: i });
    const { backupFile } = call("trx-clear");
    const res = call("trx-restore-cleared", backupFile);
    expect(res.ok).toBe(true);
    expect(res.restored).toBe(3);
    expect(call("trx-load").map((t) => t.id).sort()).toEqual(["t0", "t1", "t2"]);
  });

  it("trx-restore-cleared bersifat idempotent (INSERT OR IGNORE)", () => {
    call("trx-save", { id: "a", total: 1 });
    const { backupFile } = call("trx-clear");
    expect(call("trx-restore-cleared", backupFile).restored).toBe(1);
    expect(call("trx-restore-cleared", backupFile).restored).toBe(0);
    expect(call("trx-load")).toHaveLength(1);
  });

  it("trx-restore-cleared menolak file di luar folder jsonBackups", () => {
    const outside = path.join(dir, "jahat.json");
    fs.writeFileSync(outside, JSON.stringify([{ id: "x" }]), "utf-8");
    const res = call("trx-restore-cleared", outside);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/di luar folder backup/i);
  });

  it("trx-restore-cleared menolak path traversal lewat '..'", () => {
    const res = call("trx-restore-cleared", path.join(files.jsonBackups, "..", "transactions.json"));
    expect(res.ok).toBe(false);
  });

  it("trx-clear tanpa transaksi tidak membuat file backup", () => {
    const res = call("trx-clear");
    expect(res.ok).toBe(true);
    expect(res.backupFile).toBeNull();
  });
});

describe("db.cjs: shifts", () => {
  beforeEach(() => {
    services.svc.initDB();
    services.svc.registerHandlers();
  });
  const call = (name, ...args) => services.registry[name](null, ...args);

  it("shifts-save mengganti isi tabel dan shifts-load membacanya kembali", () => {
    call("shifts-save", [{ id: "s1", status: "open" }]);
    expect(call("shifts-load")).toEqual([{ id: "s1", status: "open" }]);
    call("shifts-save", [{ id: "s2", status: "closed" }]);
    expect(call("shifts-load").map((s) => s.id)).toEqual(["s2"]);
  });
});

describe("db.cjs: process-payment", () => {
  const call = (name, ...args) => services.registry[name](null, ...args);

  it("jalur SQLite menulis trx, menu, bill, dan memakai WAL", () => {
    services.svc.initDB();
    services.svc.registerHandlers();
    // Seed satu produk berstok supaya deduksi stok benar-benar terjadi.
    call("menu-upsert", { id: "m1", nama: "Kopi", stok: 10 });
    const res = call("process-payment", {
      trx: { id: "p1", total: 100, items: [{ id: "m1", nama: "Kopi", qty: 2 }] },
    });
    expect(res.ok).toBe(true);
    expect(res.stock).toEqual({ m1: 8 }); // 10 - 2
    expect(call("trx-load").map((t) => t.id)).toEqual(["p1"]);
    // Menu di tabel products ikut ter-deduksi.
    expect(call("menu-load").find((m) => m.id === "m1").stok).toBe(8);
    // WAL ditulis lalu dibersihkan setelah transaksi sukses.
    expect(services.wal.map((t) => t.id)).toEqual(["p1"]);
    expect(services.walCleared).toBe(1);
  });

  it("jalur fallback (tanpa SQLite) memakai JSON store dan tetap sukses", () => {
    services.svc.registerHandlers();
    fs.writeFileSync(files.menu, JSON.stringify([{ id: "m2", nama: "Teh", stok: 5 }]), "utf-8");
    // Bill aktif ikut ditulis supaya penghapusan bill juga terverifikasi.
    fs.writeFileSync(files.bills, JSON.stringify([{ id: "bill-2" }, { id: "bill-9" }]), "utf-8");
    const res = call("process-payment", {
      trx: { id: "p2", total: 50, items: [{ id: "m2", nama: "Teh", qty: 3 }] },
      activeBillId: "bill-2",
    });
    expect(res.ok).toBe(true);
    expect(services.wal).toHaveLength(0);
    expect(fs.existsSync(files.trx)).toBe(true);
    expect(JSON.parse(fs.readFileSync(files.trx, "utf-8")).map((t) => t.id)).toEqual(["p2"]);
    expect(JSON.parse(fs.readFileSync(files.bills, "utf-8")).map((b) => b.id)).toEqual(["bill-9"]);
  });
});

describe("db.cjs: migrateJSONToSQLite", () => {
  it("memindahkan transactions.json ke SQLite lalu membuat cadangan", () => {
    fs.writeFileSync(files.trx, JSON.stringify([{ id: "j1", total: 10 }, { id: "j2", total: 20 }]), "utf-8");
    services.svc.initDB();
    services.svc.registerHandlers();
    services.svc.migrateJSONToSQLite();

    expect(services.registry["trx-load"]().map((t) => t.id).sort()).toEqual(["j1", "j2"]);
    expect(fs.existsSync(files.jsonBackups)).toBe(true);
    expect(fs.readdirSync(files.jsonBackups).some((f) => f.startsWith("transactions_"))).toBe(true);
  });

  it("INSERT OR IGNORE: migrasi dua kali tidak menggandakan data", () => {
    fs.writeFileSync(files.trx, JSON.stringify([{ id: "j1", total: 10 }]), "utf-8");
    services.svc.initDB();
    services.svc.registerHandlers();
    services.svc.migrateJSONToSQLite();
    services.svc.migrateJSONToSQLite();
    expect(services.registry["trx-load"]()).toHaveLength(1);
  });

  it("tidak melakukan apa pun bila db belum diinisialisasi atau file JSON kosong", () => {
    expect(() => services.svc.migrateJSONToSQLite()).not.toThrow();
    services.svc.initDB();
    expect(() => services.svc.migrateJSONToSQLite()).not.toThrow();
  });
});

describe("db.cjs: closeDB", () => {
  it("idempoten dan membuat handler kembali ke mode fallback JSON", () => {
    services.svc.initDB();
    services.svc.registerHandlers();
    services.registry["trx-save"](null, { id: "a", total: 1 });
    services.svc.closeDB();
    expect(() => services.svc.closeDB()).not.toThrow();
    // Setelah closeDB, db null -> jalur JSON dipakai dan tidak melempar.
    expect(services.registry["trx-save"](null, { id: "b", total: 2 })).toEqual({ ok: true });
  });
});
