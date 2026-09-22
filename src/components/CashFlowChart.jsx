// CashFlowChart — grafik arus kas per jam (sumbu X = Jam, sumbu Y = rupiah).
//
// Konvensi tanda:
//   - Pemasukan  : hijau, batang naik KE ATAS (positif).
//   - Pengeluaran: merah, batang turun KE BAWAH (negatif).
//   - Laba       : oranye, selisih Pemasukan - Pengeluaran (garis + titik).
//
// Komponen ini murni presentasional: menerima array `hourly` dari
// buildCashFlow(...,).hourly dan menggambar SVG tanpa dependensi baru.
//
// mode="hour" (default): sumbu X = jam 0-23 dalam satu hari.
// mode="day"           : sumbu X = tanggal, untuk shift yang berjalan
//                        lebih dari sehari (mis. shift lupa ditutup).
import { useMemo, useState } from "react";
import { G, W, LT, BD, TX, MT } from "../constants/design.js";
import { fmt } from "../utilities/receipt.js";

const EXPENSE_COLOR = "#dc2626";
const PROFIT_COLOR = "#e87c2a";
// Lebar dasar grafik (konstan). Kalau jumlah jam membuat tiap kolom lebih
// sempit dari MIN_COL_W, lebar bertambah (adaptif) dan area bisa di-scroll.
const BASE_WIDTH = 689;
const MIN_COL_W = 34;

export default function CashFlowChart({ hourly = [], hourRange = null, mode = "hour", data = null }) {
  const isDay = mode === "day";
  // hover = { i, kind } dengan kind: "income" | "expense" | "profit".
  const [hover, setHover] = useState(null);
  const hoverIndex = hover ? hover.i : null;

  const { rows, maxAbs, baselineY, chartH, hasSeries } = useMemo(() => {
    let full;
    if (isDay) {
      // Mode harian: satu batang per tanggal (tanpa gap tanggal kosong supaya
      // rentang 7 minggu tetap ringkas dan bisa di-scroll).
      const src = Array.isArray(data) ? data : [];
      full = src.map((b) => ({
        hour: b.date ?? b.label,
        label: b.label || b.date,
        income: Number(b?.income || 0),
        expense: Number(b?.expense || 0),
        profit: Number(b?.profit || 0),
      }));
    } else {
      const list = Array.isArray(hourly) ? hourly : [];
      const byHour = new Map(list.map((b) => [Number(b.hour), b]));
      // Rentang sumbu X mengikuti waktu shift berjalan (hourRange.start..end).
      // Kalau rentang tidak tersedia, fallback ke jam-jam yang punya data saja.
      // Jam tanpa data di dalam rentang tetap ditampilkan (diisi nol) sebagai gap.
      let from;
      let to;
      if (hourRange && Number.isFinite(hourRange.start) && Number.isFinite(hourRange.end) && hourRange.end >= hourRange.start) {
        from = Math.max(0, hourRange.start);
        to = Math.min(23, hourRange.end);
      } else if (list.length) {
        const hours = list.map((b) => Number(b.hour)).filter((h) => Number.isFinite(h));
        from = Math.min(...hours);
        to = Math.max(...hours);
      } else {
        from = 0;
        to = 0;
      }
      full = Array.from({ length: to - from + 1 }, (_, i) => {
        const hour = from + i;
        const b = byHour.get(hour);
        return {
          hour,
          label: b?.label || `${String(hour).padStart(2, "0")}:00`,
          income: Number(b?.income || 0),
          expense: Number(b?.expense || 0),
          profit: Number(b?.profit || 0),
        };
      });
    }
    const peak = full.reduce(
      (m, b) => Math.max(m, Math.abs(b.income), Math.abs(b.expense), Math.abs(b.profit)),
      0
    );
    const chartH = 220;
    const baselineY = chartH / 2;
    const hasSeries = full.some((b) => b.income !== 0 || b.expense !== 0 || b.profit !== 0);
    return { rows: full, maxAbs: peak || 1, baselineY, chartH, hasSeries };
  }, [hourly, hourRange, isDay, data]);

  if (!hasSeries) {
    return (
      <div style={{ background: W, border: `1px solid ${BD}`, borderRadius: 9, padding: "12px 14px", color: MT, fontSize: 12 }}>
        {isDay ? "Belum ada data arus kas per hari pada periode ini." : "Belum ada data arus kas per jam pada periode ini."}
      </div>
    );
  }

  // signedScale: besar (magnitude) dengan tanda dipertahankan, sehingga nilai
  // negatif menghasilkan offset negatif (turun di bawah garis nol).
  const signedScale = (v) => (Number(v) / maxAbs) * (chartH / 2 - 18);
  const scale = (v) => Math.abs(signedScale(v));
  // Lebar konstan 689px, kecuali sumbu X terlalu panjang (kolom jadi lebih
  // sempit dari MIN_COL_W) -> lebar adaptif agar label jam tidak bertumpuk.
  const chartWidth = Math.max(BASE_WIDTH, rows.length * MIN_COL_W);
  const colW = rows.length > 0 ? chartWidth / rows.length : chartWidth;
  const barW = Math.max(10, Math.min(18, colW * 0.28));
  // Grafik melebihi lebar kotak -> area bisa digeser horizontal.
  const scrollable = chartWidth > BASE_WIDTH;

  // Titik polyline untuk garis laba (oranye).
  const profitPoints = rows
    .map((b, i) => {
      const cx = i * colW + colW / 2;
      const cy = baselineY - signedScale(b.profit);
      return `${cx},${cy}`;
    })
    .join(" ");

  return (
    <div style={{ background: W, border: `1px solid ${BD}`, borderRadius: 9, padding: "12px 14px", width: BASE_WIDTH, maxWidth: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: TX }}>
          {isDay ? "Grafik Arus Kas per Hari" : "Grafik Arus Kas per Jam"}
        </div>
        {scrollable && (
          <div style={{ fontSize: 10, color: MT, whiteSpace: "nowrap" }}>◂ geser ▸</div>
        )}
      </div>

      {/* Legend di dalam area scroll supaya petunjuk warna (oranye = Laba)
          tetap terbaca saat grafik digeser horizontal. */}
      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: chartWidth, paddingBottom: 2 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "nowrap", marginBottom: 6 }}>
            <Legend color={G} label="Pemasukan" />
            <Legend color={EXPENSE_COLOR} label="Pengeluaran" />
            <Legend color={PROFIT_COLOR} label="Laba" />
          </div>
          <svg width={chartWidth} height={chartH + 34} role="img" aria-label={isDay ? "Grafik arus kas per hari" : "Grafik arus kas per jam"}>
            {/* Grid + sumbu nol */}
            <line x1={0} y1={baselineY} x2={chartWidth} y2={baselineY} stroke={BD} strokeWidth={1} />
            <line x1={0} y1={baselineY - (chartH / 2 - 18)} x2={chartWidth} y2={baselineY - (chartH / 2 - 18)} stroke={LT} strokeWidth={1} strokeDasharray="4 4" />
            <line x1={0} y1={baselineY + (chartH / 2 - 18)} x2={chartWidth} y2={baselineY + (chartH / 2 - 18)} stroke={LT} strokeWidth={1} strokeDasharray="4 4" />

            {rows.map((b, i) => {
              const cx = i * colW + colW / 2;
              const incH = scale(b.income);
              const expH = scale(b.expense);
              return (
                <g key={b.hour} onMouseLeave={() => setHover(null)}>
                  {/* Area hover kolom */}
                  <rect x={i * colW} y={0} width={colW} height={chartH} fill={hoverIndex === i ? "rgba(26,92,56,0.05)" : "transparent"} />
                  {/* Pemasukan: naik ke atas */}
                  <rect
                    x={cx - barW - 1} y={baselineY - incH} width={barW} height={Math.max(incH, 0)} rx={2} fill={G}
                    opacity={hover && hover.i === i && hover.kind !== "income" ? 0.55 : 0.9}
                    onMouseEnter={() => setHover({ i, kind: "income" })}
                  />
                  {/* Pengeluaran: turun ke bawah */}
                  <rect
                    x={cx + 1} y={baselineY} width={barW} height={Math.max(expH, 0)} rx={2} fill={EXPENSE_COLOR}
                    opacity={hover && hover.i === i && hover.kind !== "expense" ? 0.5 : 0.85}
                    onMouseEnter={() => setHover({ i, kind: "expense" })}
                  />
                  {/* Label jam */}
                  <text x={cx} y={chartH + 24} textAnchor="middle" fontSize={10} fill={MT}>{b.label}</text>
                </g>
              );
            })}

            {/* Garis laba (oranye) */}
            <polyline points={profitPoints} fill="none" stroke={PROFIT_COLOR} strokeWidth={2} />
            {/* Area sentuh garis laba: segmen transparan tebal di antara titik
                supaya hover tepat di garis (bukan hanya titik) tetap memicu nilai. */}
            {rows.slice(0, -1).map((b, i) => {
              const x1 = i * colW + colW / 2;
              const y1 = baselineY - signedScale(b.profit);
              const x2 = (i + 1) * colW + colW / 2;
              const y2 = baselineY - signedScale(rows[i + 1].profit);
              return (
                <line
                  key={`hit-${b.hour}`}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="transparent" strokeWidth={12} strokeLinecap="round"
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHover({ i, kind: "profit" })}
                />
              );
            })}
            {rows.map((b, i) => {
              const cx = i * colW + colW / 2;
              const cy = baselineY - signedScale(b.profit);
              return (
                <circle
                  key={`p-${b.hour}`} cx={cx} cy={cy}
                  r={hover && hover.i === i && hover.kind === "profit" ? 5 : 2.5}
                  fill={PROFIT_COLOR} stroke={W} strokeWidth={1}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHover({ i, kind: "profit" })}
                />
              );
            })}

            {/* Tooltip nilai mengikuti elemen yang di-hover */}
            {hover && rows[hover.i] && (
              <HoverTip
                row={rows[hover.i]}
                kind={hover.kind}
                cx={hover.i * colW + colW / 2}
                baselineY={baselineY}
                chartWidth={chartWidth}
                signedScale={signedScale}
                scale={scale}
              />
            )}
          </svg>
        </div>
      </div>

      {hover && rows[hover.i] && (
        <div style={{ marginTop: 10, borderTop: `1px solid ${BD}`, paddingTop: 8, display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12 }}>
          <span style={{ fontWeight: 700, color: TX }}>{isDay ? "Tanggal" : "Jam"} {rows[hover.i].label}</span>
          <span style={{ color: G, fontWeight: hover.kind === "income" ? 700 : 400 }}>Masuk: {fmt(rows[hover.i].income)}</span>
          <span style={{ color: EXPENSE_COLOR, fontWeight: hover.kind === "expense" ? 700 : 400 }}>Keluar: {fmt(rows[hover.i].expense)}</span>
          <span style={{ color: PROFIT_COLOR, fontWeight: hover.kind === "profit" ? 700 : 400 }}>Laba: {fmt(rows[hover.i].profit)}</span>
        </div>
      )}
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, color: MT }}>
      <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: "inline-block" }} />
      {label}
    </span>
  );
}

// HoverTip — label nilai yang muncul saat pointer menyentuh batang hijau,
// batang merah, atau titik oranye. Digambar di dalam SVG (bukan HTML) supaya
// posisinya tetap presisi saat grafik digeser horizontal.
function HoverTip({ row, kind, cx, baselineY, chartWidth, signedScale, scale }) {
  const CONF = {
    income: { color: G, title: "Masuk", value: row.income, off: -scale(row.income) },
    expense: { color: EXPENSE_COLOR, title: "Keluar", value: row.expense, off: scale(row.expense) },
    profit: { color: PROFIT_COLOR, title: "Laba", value: row.profit, off: -signedScale(row.profit) },
  };
  const cfg = CONF[kind];
  if (!cfg) return null;

  const textStr = `${cfg.title}: ${fmt(cfg.value)}`;
  const tipW = Math.max(58, textStr.length * 6 + 14);
  const tipH = 20;
  const gap = 8;
  // Untuk income/profit tooltip di atas elemen, untuk expense di bawah elemen.
  const above = kind !== "expense";
  const y = above
    ? Math.max(2, baselineY + cfg.off - gap - tipH)
    : Math.min(baselineY + cfg.off + gap, baselineY + 108 - tipH);
  // Jaga tooltip tetap di dalam area grafik.
  const x = Math.max(2, Math.min(cx - tipW / 2, chartWidth - tipW - 2));

  return (
    <g pointerEvents="none">
      <line x1={cx} y1={baselineY + cfg.off} x2={cx} y2={above ? y + tipH : y} stroke={cfg.color} strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />
      <rect x={x} y={y} width={tipW} height={tipH} rx={4} fill={TX} opacity={0.92} />
      <text x={x + tipW / 2} y={y + tipH / 2 + 3.5} textAnchor="middle" fontSize={10} fontWeight={700} fill={W}>
        {textStr}
      </text>
    </g>
  );
}
