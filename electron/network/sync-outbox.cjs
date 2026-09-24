// sync-outbox.cjs — outbox lokal untuk mode Host-offline (Fase 4, plan §5.3).
//
// Kalau Client kehilangan koneksi ke Host, ia tidak bisa lagi `reserve-stock`
// synchronous. Client jatuh ke mode lokal: pakai angka stok terakhir yang
// tersinkron, decrement lokal, transaksi tetap tersimpan di device itu, dan
// perubahan stok yang belum terkirim dicatat di outbox ini.
//
// Risiko oversell selama Host offline DITERIMA sebagai tradeoff (plan §5.3).
// Tidak ada resolusi konflik otomatis. Saat Host kembali online, outbox
// di-flush; kalau hasilnya bikin stok Host negatif, Host cukup MENAMPILKAN
// stok minus itu untuk direkonsiliasi manual (bukan auto-rollback).
//
// Pola sama seperti `walAppend`/`walClear`/`walRecover` di backup.cjs:
//   - append line JSON per entri (tahan crash, tidak menimpa seluruh file),
//   - flush → kirim semua entri, sukses → clear,
//   - recover → baca ulang entri yang belum sempat terkirim.
//
// Modul ini murni file I/O. Tidak tahu soal WebSocket/IPC.

const fs = require("fs");
const path = require("path");

function createSyncOutbox({ dataDir, file = "sync-outbox.jsonl" } = {}) {
  const outboxPath = path.join(dataDir, file);

  function ensureDir() {
    try { if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true }); }
    catch { /* not fatal; append akan gagal & dilaporkan oleh caller */ }
  }

  // Tambahkan satu entri ke outbox. `entry` bebas bentuknya (mis.
  // { kind:"stock", deltas, meta, ts }).
  function walAppend(entry) {
    ensureDir();
    const line = JSON.stringify({ ts: Date.now(), ...entry }) + "\n";
    fs.appendFileSync(outboxPath, line, "utf-8");
  }

  function walClear() {
    try { if (fs.existsSync(outboxPath)) fs.unlinkSync(outboxPath); }
    catch { /* not fatal */ }
  }

  function walRecover() {
    if (!fs.existsSync(outboxPath)) return [];
    let raw = "";
    try { raw = fs.readFileSync(outboxPath, "utf-8").trim(); }
    catch { return []; }
    if (!raw) { walClear(); return []; }
    const entries = [];
    for (const line of raw.split("\n")) {
      if (!line) continue;
      try { entries.push(JSON.parse(line)); }
      catch { /* lewati baris korup */ }
    }
    return entries;
  }

  function count() {
    return walRecover().length;
  }

  function hasPending() {
    return fs.existsSync(outboxPath) && count() > 0;
  }

  // Flush: panggil `sender(entry)` untuk tiap entri (biasanya kirim lewat
  // hostClient). Entri yang sukses dikumpulkan lalu outbox dibersihkan.
  // Kalau ada yang gagal, entri gagal DITULIS ULANG ke outbox supaya tidak
  // hilang. Mengembalikan { ok, flushed, failed }.
  async function flush(sender) {
    const entries = walRecover();
    if (!entries.length) return { ok: true, flushed: 0, failed: 0 };
    const failed = [];
    let flushed = 0;
    for (const entry of entries) {
      try {
        // sender boleh async; false/throwed = gagal.
        const res = await sender(entry);
        if (res === false) { failed.push(entry); continue; }
        flushed += 1;
      } catch {
        failed.push(entry);
      }
    }
    // Tulis ulang hanya entri yang belum terkirim (urutan dijaga).
    try {
      if (fs.existsSync(outboxPath)) fs.unlinkSync(outboxPath);
      if (failed.length) {
        ensureDir();
        fs.writeFileSync(outboxPath, failed.map((e) => JSON.stringify(e) + "\n").join(""), "utf-8");
      }
    } catch { /* not fatal */ }
    return { ok: failed.length === 0, flushed, failed: failed.length };
  }

  return { walAppend, walClear, walRecover, flush, count, hasPending, getPath: () => outboxPath };
}

module.exports = { createSyncOutbox };
