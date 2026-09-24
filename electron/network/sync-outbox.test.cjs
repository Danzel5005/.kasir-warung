import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createRequire } from "module";
import os from "os";
import fs from "fs";
import path from "path";

const require = createRequire(import.meta.url);
const { createSyncOutbox } = require("./sync-outbox.cjs");

// ---------------------------------------------------------------------------
// Fase 4 — sync-outbox: fallback Host-offline (plan §5.3).
// Menguji pola WAL (append/recover/clear) + flush sebagian gagal.
// ---------------------------------------------------------------------------

let dataDir;

beforeEach(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "outbox-test-"));
});

afterEach(() => {
  try { fs.rmSync(dataDir, { recursive: true, force: true }); } catch { /* ok */ }
});

describe("sync-outbox: WAL dasar", () => {
  it("append & recover mengembalikan entri berurutan", () => {
    const ob = createSyncOutbox({ dataDir });
    ob.walAppend({ kind: "stock", deltas: { a: -1 } });
    ob.walAppend({ kind: "stock", deltas: { b: -2 } });
    const entries = ob.walRecover();
    expect(entries.length).toBe(2);
    expect(entries[0].deltas).toEqual({ a: -1 });
    expect(entries[1].deltas).toEqual({ b: -2 });
    expect(typeof entries[0].ts).toBe("number");
  });

  it("count & hasPending konsisten", () => {
    const ob = createSyncOutbox({ dataDir });
    expect(ob.hasPending()).toBe(false);
    expect(ob.count()).toBe(0);
    ob.walAppend({ kind: "stock" });
    expect(ob.hasPending()).toBe(true);
    expect(ob.count()).toBe(1);
  });

  it("walClear menghapus outbox", () => {
    const ob = createSyncOutbox({ dataDir });
    ob.walAppend({ kind: "stock" });
    ob.walClear();
    expect(ob.hasPending()).toBe(false);
    expect(fs.existsSync(ob.getPath())).toBe(false);
  });

  it("membuat dataDir kalau belum ada", () => {
    const nested = path.join(dataDir, "a", "b");
    const ob = createSyncOutbox({ dataDir: nested });
    ob.walAppend({ kind: "stock" });
    expect(fs.existsSync(ob.getPath())).toBe(true);
  });

  it("melewati baris korup saat recover", () => {
    const ob = createSyncOutbox({ dataDir });
    fs.writeFileSync(ob.getPath(), `${JSON.stringify({ kind: "ok" })}\n{bukan json\n`, "utf-8");
    const entries = ob.walRecover();
    expect(entries.length).toBe(1);
    expect(entries[0].kind).toBe("ok");
  });
});

describe("sync-outbox: flush", () => {
  it("semua sukses → outbox kosong, flushed = jumlah entri", async () => {
    const ob = createSyncOutbox({ dataDir });
    ob.walAppend({ kind: "stock", deltas: { a: -1 } });
    ob.walAppend({ kind: "stock", deltas: { b: -1 } });
    const sent = [];
    const res = await ob.flush(async (entry) => { sent.push(entry); return true; });
    expect(res).toEqual({ ok: true, flushed: 2, failed: 0 });
    expect(sent.length).toBe(2);
    expect(ob.hasPending()).toBe(false);
  });

  it("outbox kosong → no-op", async () => {
    const ob = createSyncOutbox({ dataDir });
    const res = await ob.flush(async () => true);
    expect(res).toEqual({ ok: true, flushed: 0, failed: 0 });
  });

  it("gagal sebagian → entri gagal ditulis ulang & urutan dijaga", async () => {
    const ob = createSyncOutbox({ dataDir });
    ob.walAppend({ kind: "stock", id: 1 });
    ob.walAppend({ kind: "stock", id: 2 });
    ob.walAppend({ kind: "stock", id: 3 });
    // id 2 gagal (return false), id 1 & 3 sukses.
    const res = await ob.flush(async (entry) => entry.id !== 2);
    expect(res).toEqual({ ok: false, flushed: 2, failed: 1 });
    const remaining = ob.walRecover();
    expect(remaining.length).toBe(1);
    expect(remaining[0].id).toBe(2);
  });

  it("sender yang throw dianggap gagal, tidak menghentikan sisanya", async () => {
    const ob = createSyncOutbox({ dataDir });
    ob.walAppend({ kind: "stock", id: 1 });
    ob.walAppend({ kind: "stock", id: 2 });
    const res = await ob.flush(async (entry) => {
      if (entry.id === 1) throw new Error("net down");
      return true;
    });
    expect(res).toEqual({ ok: false, flushed: 1, failed: 1 });
    expect(ob.walRecover()[0].id).toBe(1);
  });

  it("flush bisa diulang: kirim ulang entri yang gagal lalu clear", async () => {
    const ob = createSyncOutbox({ dataDir });
    ob.walAppend({ kind: "stock", id: 1 });
    ob.walAppend({ kind: "stock", id: 2 });
    await ob.flush(async (entry) => entry.id !== 1); // id 1 gagal
    const res = await ob.flush(async () => true);     // sekarang sukses semua
    expect(res.ok).toBe(true);
    expect(ob.hasPending()).toBe(false);
  });
});
