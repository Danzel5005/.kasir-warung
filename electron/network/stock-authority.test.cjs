import { describe, expect, it, vi } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { createStockAuthority, DEFAULT_TIMEOUT_MS } = require("./stock-authority.cjs");

// ---------------------------------------------------------------------------
// Fase 4 — stock-authority: otoritas stok sisi Host (plan §5.1–5.2).
// Modul ini murni logika: applyStockDelta/loadStock/broadcastDelta disuntik,
// jadi kita bisa menguji all-or-nothing, delta-only broadcast, dan serialisasi
// tanpa SQLite/WebSocket nyata.
// ---------------------------------------------------------------------------

// Helper: applyStockDelta palsu yang meniru db.cjs — mengembalikan peta
// { productId: newStock } dan mencatat panggilan.
function makeFakeApply(initial = {}) {
  const stock = { ...initial };
  const calls = [];
  const applyStockDelta = (deltas, meta) => {
    calls.push({ deltas, meta });
    const out = {};
    for (const [id, delta] of Object.entries(deltas)) {
      if (stock[id] === null || stock[id] === undefined) continue; // tak terbatas
      stock[id] = Number(stock[id]) + Number(delta);
      out[id] = stock[id];
    }
    return out;
  };
  return { applyStockDelta, calls, stock };
}

describe("stock-authority: reserve", () => {
  it("menerapkan delta & mengembalikan reserved + updatedAt", () => {
    const { applyStockDelta } = makeFakeApply({ a: 10 });
    const auth = createStockAuthority({ applyStockDelta, loadStock: (ids) => ({ a: 10 }), now: () => "T0" });
    const res = auth.reserve({ deltas: { a: -3 }, meta: { type: "sale" } });
    expect(res.ok).toBe(true);
    expect(res.reserved).toEqual({ a: 7 });
    expect(res.updatedAt).toBe("T0");
  });

  it("all-or-nothing: stok kurang → tidak ada yang diterapkan", () => {
    const { applyStockDelta, calls } = makeFakeApply({ a: 10, b: 1 });
    const auth = createStockAuthority({
      applyStockDelta,
      loadStock: () => ({ a: 10, b: 1 }),
    });
    const res = auth.reserve({ deltas: { a: -3, b: -5 } });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("insufficient");
    expect(res.shortfalls).toEqual([{ productId: "b", available: 1, needed: 5 }]);
    // TIDAK ada panggilan apply — transaksi tidak setengah jalan.
    expect(calls.length).toBe(0);
  });

  it("lewatkan item dengan stok null/undefined (tak terbatas)", () => {
    const { applyStockDelta } = makeFakeApply({ a: null });
    const auth = createStockAuthority({ applyStockDelta, loadStock: () => ({ a: null }) });
    const res = auth.reserve({ deltas: { a: -100 } });
    expect(res.ok).toBe(true);
  });

  it("deltas kosong / nol → ok tanpa apply", () => {
    const { applyStockDelta, calls } = makeFakeApply({ a: 5 });
    const auth = createStockAuthority({ applyStockDelta });
    expect(auth.reserve({ deltas: {} }).ok).toBe(true);
    expect(auth.reserve({ deltas: { a: 0 } }).ok).toBe(true);
    expect(calls.length).toBe(0);
  });

  it("mengembalikan error kalau applyStockDelta throw", () => {
    const auth = createStockAuthority({
      applyStockDelta: () => { throw new Error("db rusak"); },
    });
    const res = auth.reserve({ deltas: { a: -1 } });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("error");
    expect(res.error).toBe("db rusak");
  });
});

describe("stock-authority: broadcast delta-only (§5.2)", () => {
  it("membroadcast HANYA baris yang berubah", () => {
    const { applyStockDelta } = makeFakeApply({ a: 10, b: 5 });
    const broadcast = vi.fn();
    const auth = createStockAuthority({
      applyStockDelta,
      loadStock: () => ({ a: 10, b: 5 }),
      broadcastDelta: broadcast,
      now: () => "T9",
    });
    auth.reserve({ deltas: { a: -2, b: -1 } });
    expect(broadcast).toHaveBeenCalledTimes(1);
    const rows = broadcast.mock.calls[0][0];
    expect(rows).toEqual([
      { productId: "a", newStock: 8, updatedAt: "T9" },
      { productId: "b", newStock: 4, updatedAt: "T9" },
    ]);
  });

  it("tidak broadcast kalau tidak ada baris berubah", () => {
    const broadcast = vi.fn();
    const auth = createStockAuthority({
      applyStockDelta: () => ({}),
      loadStock: () => ({ a: 10 }),
      broadcastDelta: broadcast,
    });
    auth.reserve({ deltas: { a: -1 } });
    expect(broadcast).not.toHaveBeenCalled();
  });
});

describe("stock-authority: serialisasi", () => {
  it("handleReserveRequest diproses satu per satu (tidak interleave)", async () => {
    const order = [];
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    const applyStockDelta = (deltas) => {
      const id = Object.keys(deltas)[0];
      order.push(`start:${id}`);
      return { [id]: 0 };
    };
    // Request pertama memblokir sampai gate dibuka.
    const auth = createStockAuthority({
      applyStockDelta: (deltas) => {
        const id = Object.keys(deltas)[0];
        if (id === "a") { order.push("start:a"); return gate.then(() => { order.push("end:a"); return { a: 0 }; }); }
        order.push(`start:${id}`);
        return { [id]: 0 };
      },
    });
    const p1 = auth.handleReserveRequest({ deltas: { a: -1 } });
    const p2 = auth.handleReserveRequest({ deltas: { b: -1 } });
    // b belum boleh mulai selama a belum selesai.
    await Promise.resolve();
    expect(order).toEqual(["start:a"]);
    release();
    await Promise.all([p1, p2]);
    expect(order).toEqual(["start:a", "end:a", "start:b"]);
  });

  it("satu request gagal tidak memutus antrean berikutnya", async () => {
    let n = 0;
    const auth = createStockAuthority({
      applyStockDelta: () => {
        n += 1;
        if (n === 1) throw new Error("boom");
        return { b: 1 };
      },
    });
    const r1 = await auth.handleReserveRequest({ deltas: { a: -1 } });
    const r2 = await auth.handleReserveRequest({ deltas: { b: -1 } });
    expect(r1.ok).toBe(false);
    expect(r2.ok).toBe(true);
  });
});

describe("stock-authority: konstanta", () => {
  it("DEFAULT_TIMEOUT_MS adalah 5000", () => {
    expect(DEFAULT_TIMEOUT_MS).toBe(5000);
  });
});
