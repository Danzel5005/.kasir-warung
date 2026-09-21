// reportHtml.js — pembuat HTML laporan (Fase 1, fitur "Ekspor Laporan PDF").
//
// Fungsi di sini MURNI: menerima angka/array yang sudah dihitung oleh
// ViewLaporan lalu mengembalikan string HTML siap dicetak ke PDF lewat
// ipc "export-report-pdf" (Electron printToPDF + showSaveDialog).
//
// Tidak menyentuh storage, tidak butuh dependensi baru. Layout memakai
// ukuran A4 (210mm x 297mm) dengan margin cetak.

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function rupiah(n) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}

// buildReportHTML membangun dokumen HTML A4 laporan keuangan satu shift.
//
// opts:
//   warungName, warungAddress, warungPhone  -> header toko
//   shiftLabel                              -> judul periode
//   generatedAt                             -> string waktu cetak
//   rev, mod, sub, netProfit, totalExpenses -> kartu ringkasan
//   hasModal                                -> apakah modal tersedia
//   showCost                                -> sembunyikan modal/laba bila false (canViewCost)
//   insights                                -> hasil buildInsights (opsional)
//   transactions                            -> daftar trx untuk tabel detail
//   fmtTrx(trx)                             -> fungsi pemformat baris (opsional)
function buildReportHTML(opts = {}) {
  const {
    warungName = "Warung",
    warungAddress = "",
    warungPhone = "",
    shiftLabel = "",
    generatedAt = "",
    rev = 0,
    mod = 0,
    sub = 0,
    netProfit = 0,
    totalExpenses = 0,
    hasModal = false,
    showCost = true,
    insights = null,
    transactions = [],
  } = opts;

  const summaryCards = [
    { l: "Total Pendapatan", v: rupiah(rev), s: `${transactions.length} transaksi` },
    { l: "Total Pengeluaran", v: rupiah(totalExpenses), s: "biaya operasional" },
  ];
  if (showCost) {
    summaryCards.push({
      l: "Total Modal",
      v: hasModal ? rupiah(mod) : "Belum diinput",
      s: hasModal ? `dari sub ${rupiah(sub)}` : "-",
    });
    summaryCards.push({
      l: "Laba Bersih",
      v: rupiah(netProfit),
      s: hasModal && sub > 0 ? `margin ${((netProfit / sub) * 100).toFixed(1)}%` : "-",
    });
  }

  const cardsHtml = summaryCards
    .map(
      (c) =>
        `<div class="card"><div class="card-l">${escapeHtml(c.l)}</div><div class="card-v">${escapeHtml(
          c.v
        )}</div><div class="card-s">${escapeHtml(c.s)}</div></div>`
    )
    .join("");

  let insightsHtml = "";
  if (insights && insights.hasData) {
    const busiest = insights.busiest && insights.busiest.count > 0
      ? `Jam tersibuk: ${String(insights.busiest.hour).padStart(2, "0")}:00 (${insights.busiest.count} trx)`
      : "Belum ada data jam";
    const avg = `Rata-rata / transaksi: ${rupiah(insights.average?.average || 0)}`;
    const mixRows = (insights.mix || [])
      .map((m) => `<tr><td>${escapeHtml(m.label || m.key)}</td><td class="num">${m.count}</td><td class="num">${rupiah(m.revenue)}</td></tr>`)
      .join("");
    const topRows = (insights.top || [])
      .map((t) => `<tr><td>${escapeHtml(t.nama)}</td><td class="num">${t.qty}</td><td class="num">${rupiah(t.revenue)}</td></tr>`)
      .join("");
    insightsHtml = `
      <h2>Analitik Penjualan</h2>
      <p class="muted">${escapeHtml(busiest)} &middot; ${escapeHtml(avg)}</p>
      <div class="two-col">
        <div>
          <h3>Metode Bayar</h3>
          <table><thead><tr><th>Metode</th><th class="num">Trx</th><th class="num">Pendapatan</th></tr></thead><tbody>${mixRows || '<tr><td colspan="3" class="muted">-</td></tr>'}</tbody></table>
        </div>
        <div>
          <h3>Item Terlaris</h3>
          <table><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Pendapatan</th></tr></thead><tbody>${topRows || '<tr><td colspan="3" class="muted">-</td></tr>'}</tbody></table>
        </div>
      </div>`;
  }

  return `<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8">
<title>Laporan ${escapeHtml(shiftLabel)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #222; margin: 0; font-size: 12px; }
  h1 { font-size: 20px; margin: 0 0 2px; }
  h2 { font-size: 15px; margin: 20px 0 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  h3 { font-size: 13px; margin: 0 0 6px; }
  .muted { color: #777; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
  .cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 8px; }
  .card { border: 1px solid #e0e0e0; border-radius: 8px; padding: 10px 12px; }
  .card-l { font-size: 10px; color: #777; margin-bottom: 4px; }
  .card-v { font-size: 16px; font-weight: 700; }
  .card-s { font-size: 9px; color: #999; margin-top: 2px; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { text-align: left; padding: 4px 6px; border-bottom: 1px solid #eee; }
  th { background: #f6f6f6; font-weight: 600; }
  .num { text-align: right; }
  .footer { margin-top: 24px; font-size: 9px; color: #999; text-align: center; }
</style></head>
<body>
  <div class="header">
    <div>
      <h1>${escapeHtml(warungName)}</h1>
      ${warungAddress ? `<div class="muted">${escapeHtml(warungAddress)}</div>` : ""}
      ${warungPhone ? `<div class="muted">Telp: ${escapeHtml(warungPhone)}</div>` : ""}
    </div>
    <div style="text-align:right">
      <div style="font-weight:700">Laporan Keuangan Penjualan</div>
      <div class="muted">${escapeHtml(shiftLabel)}</div>
      ${generatedAt ? `<div class="muted">Dicetak: ${escapeHtml(generatedAt)}</div>` : ""}
    </div>
  </div>
  <div class="cards">${cardsHtml}</div>
  ${insightsHtml}
  <div class="footer">Dibuat oleh DEN POS</div>
</body></html>`;
}

export { buildReportHTML, escapeHtml, rupiah };
