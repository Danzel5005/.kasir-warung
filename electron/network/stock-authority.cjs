// stock-authority.cjs — otoritas stok di sisi Host (Fase 4 LAN sync).
//
// Kenapa harus "request-through-host" (plan §5.1): kalau Client boleh
// decrement stok lokal dulu lalu sync belakangan, race condition "2 device
// rebutan stok 1" tidak bisa dicegah — dua-duanya merasa berhasil sebelum tahu
// ada konflik. Karena itu SEMUA aksi yang mengurangi stok (finalisasi
// transaksi & simpan open-bill) dikirim ke Host sebagai `reserve-stock`,
// ditunggu balasannya (synchronous), dan hanya diterapkan lokal kalau Host
// bilang `ok`.
//
// Modul ini TIDAK memegang koneksi sendiri. Ia disuntik:
//   - applyStockDelta(deltas, meta) — fungsi satu-pintu milik db.cjs (SQLite
//     transaction, single-process → otomatis serial, tak butuh lock tambahan).
//   - loadStock(ids) — pembaca stok opsional (untuk membalas `newStock`).
//   - broadcastDelta(rows) — broadcast HANYA baris yang berubah (§5.2).
//
// Handler `reserve-stock` mengembalikan:
//   { ok: true,  reserved: { [productId]: newStock }, updatedAt }
//   { ok: false, reason: "insufficient", shortfalls: [{ productId, available, needed }] }
//
// Semua operasi dijalankan dalam SATU charge per request supaya Host serial
// dan tidak ada dua reserve yang saling menimpa.

const DEFAULT_TIMEOUT_MS = 5000;

function createStockAuthority({
  applyStockDelta,
  loadStock = null,
  broadcastDelta = () => {},
  onEvent = () => {},
  now = () => new Date().toISOString(),
} = {}) {
  // Antrean serial supaya request dari beberapa Client diproses satu per satu
  // pada proses yang sama (mirip single-writer). Ini melengkapi jaminan
  // "single SQLite transaction" milik db.cjs.
  let chain = Promise.resolve();

  function serialize(fn) {
    const run = chain.then(fn, fn); // jalankan apa pun status sebelumnya
    // Jangan biarkan satu kegagalan memutus rantai.
    chain = run.then(() => undefined, () => undefined);
    return run;
  }

  // Terapkan satu reserve-stock. `deltas` peta {productId: qtyNegatif}.
  // Kalau ada item yang stoknya tidak cukup, TIDAK ada yang diterapkan
  // (all-or-nothing) supaya transaksi tidak setengah jalan.
  function reserve({ deltas, meta = {} } = {}) {
    const map = deltas && typeof deltas === "object" ? deltas : {};
    const ids = Object.keys(map).filter((id) => Number(map[id]) !== 0);
    if (!ids.length) return { ok: true, reserved: {}, updatedAt: now() };

    const shortfalls = [];
    if (loadStock && typeof loadStock === "function") {
      const current = loadStock(ids) || {};
      for (const id of ids) {
        const delta = Number(map[id]) || 0;
        if (delta >= 0) continue; // hanya peduli yang mengurangi
        const row = current[id];
        if (row === null || row === undefined) continue; // stok tak terbatas → selalu boleh
        const available = Number(row);
        if (!Number.isFinite(available)) continue;
        const needed = Math.abs(delta);
        if (available < needed) shortfalls.push({ productId: String(id), available, needed });
      }
    }

    if (shortfalls.length) {
      const payload = { ok: false, reason: "insufficient", shortfalls };
      onEvent({ kind: "reserve-denied", shortfalls });
      return payload;
    }

    let reserved = {};
    try {
      reserved = applyStockDelta(map, { type: "sale", ...meta }) || {};
    } catch (err) {
      const payload = { ok: false, reason: "error", error: err?.message || String(err) };
      onEvent({ kind: "reserve-error", error: payload.error });
      return payload;
    }

    // §5.2 — broadcast HANYA baris yang berubah, bukan seluruh tabel.
    const updatedAt = now();
    const rows = Object.keys(reserved).map((productId) => ({ productId, newStock: reserved[productId], updatedAt }));
    if (rows.length) {
      try { broadcastDelta(rows); } catch (err) { onEvent({ kind: "broadcast-error", error: err?.message || String(err) }); }
    }
    onEvent({ kind: "reserved", rows });
    return { ok: true, reserved, updatedAt };
  }

  // Titik masuk dari host-server (pesan WebSocket). Serial per-process.
  function handleReserveRequest({ deltas, meta } = {}) {
    return serialize(() => reserve({ deltas, meta }));
  }

  return { handleReserveRequest, reserve };
}

module.exports = { createStockAuthority, DEFAULT_TIMEOUT_MS };
