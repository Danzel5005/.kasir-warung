import { useCallback, useEffect, useMemo, useState } from "react";
import { G, W, BD, MT, LT, TX, row, RADIUS, TYPOGRAPHY, COLOR_PALETTE } from "../constants/design.js";
import { api } from "../utilities/utils.js";
import { validateBackup } from "../utilities/backup.js";

// BackupPanel — full backup & restore for the desktop app.
//
// Flow
//  1. "Backup Sekarang"  → main process gathers every store (+ SQLite) and asks
//                          the user where to save. An internal copy is always
//                          kept in the data folder as well.
//  2. "Pulihkan dari File"→ file picker → validation + summary → explicit
//                          confirmation → restore. A pre-restore snapshot of the
//                          CURRENT state is written first, so a mistake is
//                          always recoverable.
//  3. "Pulihkan Internal" → one-click restore from the newest internal snapshot.
//
// Everything is guarded: the panel refuses to run in browser (localStorage)
// mode and explains why, because there is no data folder to read there.

const LABELS = {
  menu: "Menu",
  categories: "Kategori",
  settings: "Pengaturan",
  users: "Pengguna",
  customers: "Pelanggan",
  qris: "Gambar QRIS",
  bills: "Bon Terbuka",
  shifts: "Shift",
  transactions: "Transaksi",
  logo: "Logo",
  resep: "Resep Menu",
  bahanBaku: "Bahan Baku",
  supplier: "Supplier",
  loyaltyTiers: "Tier Loyalty",
};

const describeCounts = (counts = {}) =>
  Object.keys(LABELS)
    .filter((k) => Number(counts[k]) > 0)
    .map((k) => `${counts[k]} ${LABELS[k].toLowerCase()}`);

const fmtDateTime = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function ConfirmBox({ title, body, confirmLabel, onConfirm, onCancel, danger }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400 }}>
      <div style={{ background: W, borderRadius: RADIUS.lg, padding: 18, width: 400, maxWidth: "92vw", boxShadow: "0 18px 50px rgba(0,0,0,0.3)" }}>
        <div style={{ fontSize: TYPOGRAPHY.body.fontSize, fontWeight: 700, color: danger ? COLOR_PALETTE.danger : G, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: TYPOGRAPHY.small.fontSize, color: TX, lineHeight: 1.55, marginBottom: 16, whiteSpace: "pre-wrap" }}>{body}</div>
        <div style={{ ...row, gap: 8 }}>
          <button onClick={onCancel} style={{ marginLeft: "auto", padding: "8px 14px", background: LT, color: TX, border: "none", borderRadius: RADIUS.md, cursor: "pointer", fontFamily: "inherit", fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 600 }}>Batal</button>
          <button onClick={onConfirm} style={{ padding: "8px 14px", background: danger ? COLOR_PALETTE.danger : G, color: W, border: "none", borderRadius: RADIUS.md, cursor: "pointer", fontFamily: "inherit", fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 700 }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function StatGrid({ counts, dbTransactions, dbShifts }) {
  const items = useMemo(() => {
    const out = Object.keys(LABELS)
      .filter((k) => k !== "settings" && k !== "logo" && k !== "qris")
      .map((k) => [LABELS[k], Number(counts?.[k] || 0)]);
    if (dbTransactions !== null && dbTransactions !== undefined) out.unshift(["Transaksi (DB)", dbTransactions]);
    if (dbShifts !== null && dbShifts !== undefined) out.push(["Shift (DB)", dbShifts]);
    return out.filter(([, v]) => v > 0 || true);
  }, [counts, dbTransactions, dbShifts]);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 7, marginBottom: 14 }}>
      {items.map(([label, value]) => (
        <div key={label} style={{ background: LT, borderRadius: RADIUS.md, padding: "7px 9px" }}>
          <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT }}>{label}</div>
          <div style={{ fontSize: TYPOGRAPHY.body.fontSize, fontWeight: 700, color: TX }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

export default function BackupRestorePanel({ toast_, onRestored }) {
  const [stats, setStats] = useState(null);
  const [busy, setBusy] = useState(null); // "backup" | "restore" | "internal"
  const [pending, setPending] = useState(null); // validated backup awaiting confirmation
  const [internal, setInternal] = useState([]);
  const [restartNeeded, setRestartNeeded] = useState(false);
  const [bridgeWarn, setBridgeWarn] = useState(null); // main process is stale (handler missing)
  const desktop = api.isDesktop();

  const notify = useCallback((msg, kind = "ok") => { if (toast_) toast_(msg, kind); }, [toast_]);

  // A missing handler means the RUNNING main process predates this feature.
  // Flag it once so the panel can explain the fix instead of failing silently.
  const noteResult = useCallback((res) => {
    if (res?.needsRestart) setBridgeWarn(res.error || "Aplikasi perlu dimulai ulang.");
  }, []);

  const refresh = useCallback(async () => {
    if (!desktop) return;
    try {
      const [s, list] = await Promise.all([api.backupStats(), api.backupListInternal()]);
      noteResult(s);
      noteResult(list);
      if (s?.ok) { setStats(s); setBridgeWarn(null); }
      if (list?.ok) setInternal(list.backups || []);
    } catch (err) {
      // Should not happen now that api.* is guarded, but never let a passive
      // effect reject — an uncaught promise here blanks the settings modal.
      console.error("[BackupRestorePanel] refresh failed:", err?.message || err);
    }
  }, [desktop, noteResult]);

  useEffect(() => { refresh(); }, [refresh]);

  const doBackup = async () => {
    setBusy("backup");
    try {
      const res = await api.backupCreate();
      noteResult(res);
      if (res?.needsRestart) { notify(res.error, "err"); return; }
      if (res?.canceled) notify("Backup dibatalkan", "err");
      else if (res?.ok) notify(`Backup tersimpan: ${describeCounts(res.counts).join(", ") || "kosong"}`, "ok");
      else notify(res?.error || "Gagal membuat backup", "err");
      await refresh();
    } catch (err) {
      notify(err?.message || "Gagal membuat backup", "err");
    } finally { setBusy(null); }
  };

  const pickFile = async () => {
    setBusy("restore");
    try {
      const res = await api.backupSummary();
      noteResult(res);
      if (res?.needsRestart) { notify(res.error, "err"); return; }
      if (res?.canceled) return;
      if (!res?.ok) return notify(res?.error || "File backup tidak valid", "err");
      const check = validateBackup({ format: "kasir-warung-backup", data: Object.fromEntries(Object.keys(res.counts || {}).map((k) => [k, new Array(Number(res.counts[k]) || 0).fill(0)])) });
      setPending({ ...res, summary: check.ok ? describeCounts(res.counts) : [] });
    } catch (err) {
      notify(err?.message || "Gagal membaca file backup", "err");
    } finally { setBusy(null); }
  };

  const confirmRestore = async () => {
    const target = pending;
    setPending(null);
    if (!target) return;
    setBusy("restore");
    try {
      const res = await api.backupRestore(target.filePath);
      noteResult(res);
      if (res?.needsRestart) { notify(res.error, "err"); return; }
      if (res?.ok) {
        notify(`Data dipulihkan: ${describeCounts(res.restored).join(", ") || "kosong"}`, "ok");
        setRestartNeeded(true);
        onRestored?.();
        await refresh();
      } else notify(res?.error || "Gagal memulihkan data", "err");
    } catch (err) {
      notify(err?.message || "Gagal memulihkan data", "err");
    } finally { setBusy(null); }
  };

  const restoreInternal = async (entry) => {
    setBusy("internal");
    try {
      const res = await api.backupRestore(entry.path);
      noteResult(res);
      if (res?.needsRestart) { notify(res.error, "err"); return; }
      if (res?.ok) {
        notify("Data dipulihkan dari backup internal", "ok");
        setRestartNeeded(true);
        onRestored?.();
        await refresh();
      } else notify(res?.error || "Gagal memulihkan data", "err");
    } catch (err) {
      notify(err?.message || "Gagal memulihkan data", "err");
    } finally { setBusy(null); }
  };

  const btn = (disabled) => ({ padding: "9px 14px", background: disabled ? "#aaa" : G, color: W, border: "none", borderRadius: RADIUS.md, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 700 });

  if (!desktop) {
    return (
      <div>
        <div style={{ fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 700, color: G, marginBottom: 8 }}>Backup &amp; Restore</div>
        <div style={{ fontSize: TYPOGRAPHY.small.fontSize, color: MT, lineHeight: 1.6 }}>
          Fitur ini hanya tersedia di aplikasi desktop Kasir Warung, karena membutuhkan akses langsung ke folder data.
          Saat dijalankan di browser, data disimpan di penyimpanan lokal browser dan tidak bisa dicadangkan dari sini.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 700, color: G, marginBottom: 4 }}>Backup &amp; Restore</div>
      <div style={{ fontSize: TYPOGRAPHY.small.fontSize, color: MT, marginBottom: 12, lineHeight: 1.55 }}>
        Cadangkan seluruh data warung (menu, transaksi, pengguna, pengaturan, pelanggan, dan lainnya) ke satu file,
        lalu pulihkan kembali kapan saja. Backup otomatis juga disimpan di folder data setiap kali Anda menekan tombol backup.
      </div>

      {bridgeWarn && (
        <div style={{ background: COLOR_PALETTE.dangerLight || "#fdecea", border: `1px solid ${COLOR_PALETTE.danger || "#d93025"}`, borderRadius: RADIUS.md, padding: "9px 11px", marginBottom: 12 }}>
          <div style={{ fontSize: TYPOGRAPHY.small.fontSize, color: TX, marginBottom: 8, lineHeight: 1.5 }}>
            <strong>Fitur backup belum aktif di proses aplikasi ini.</strong><br />
            Proses utama (main process) aplikasi masih versi lama, sehingga perintah backup belum terdaftar.
            Tutup aplikasi lalu jalankan ulang agar fitur ini tersedia.
          </div>
          <button onClick={() => api.backupRelaunch()} style={{ padding: "7px 12px", background: COLOR_PALETTE.danger || "#d93025", color: W, border: "none", borderRadius: RADIUS.md, cursor: "pointer", fontFamily: "inherit", fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 700 }}>Muat Ulang Aplikasi</button>
        </div>
      )}

      {stats && <StatGrid counts={stats.counts} dbTransactions={stats.dbTransactions} dbShifts={stats.dbShifts} />}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <button onClick={doBackup} disabled={!!busy} style={btn(!!busy)}>
          {busy === "backup" ? "Menyimpan..." : "Backup Sekarang"}
        </button>
        <button onClick={pickFile} disabled={!!busy} style={{ ...btn(!!busy), background: busy ? "#aaa" : COLOR_PALETTE.info || G }}>
          {busy === "restore" ? "Membaca..." : "Pulihkan dari File..."}
        </button>
        <button onClick={() => api.backupOpenFolder()} style={{ padding: "9px 14px", background: LT, color: TX, border: `1px solid ${BD}`, borderRadius: RADIUS.md, cursor: "pointer", fontFamily: "inherit", fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 600 }}>Buka Folder Data</button>
      </div>

      {stats?.dataDir && <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, marginBottom: 12, wordBreak: "break-all" }}>Folder data: {stats.dataDir}</div>}

      {restartNeeded && (
        <div style={{ background: COLOR_PALETTE.warningLight || "#fff8e1", border: `1px solid ${COLOR_PALETTE.warning || "#e0a800"}`, borderRadius: RADIUS.md, padding: "9px 11px", marginBottom: 12 }}>
          <div style={{ fontSize: TYPOGRAPHY.small.fontSize, color: TX, marginBottom: 8, lineHeight: 1.5 }}>
            Pemulihan selesai. Muat ulang aplikasi agar semua tampilan memakai data yang baru.
          </div>
          <button onClick={() => api.backupRelaunch()} style={{ padding: "7px 12px", background: COLOR_PALETTE.warning || "#e0a800", color: W, border: "none", borderRadius: RADIUS.md, cursor: "pointer", fontFamily: "inherit", fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 700 }}>Muat Ulang Aplikasi</button>
        </div>
      )}

      <div style={{ borderTop: `1px solid ${BD}`, paddingTop: 12 }}>
        <div style={{ fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 700, color: G, marginBottom: 8 }}>
          Backup Otomatis di Folder Data ({internal.length})
        </div>
        {internal.length === 0 ? (
          <div style={{ fontSize: TYPOGRAPHY.small.fontSize, color: MT, fontStyle: "italic" }}>Belum ada backup otomatis. Tekan "Backup Sekarang" untuk membuatnya.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
            {internal.map((entry, index) => (
              <div key={entry.file} style={{ ...row, padding: "7px 10px", background: LT, borderRadius: RADIUS.md }}>
                <div>
                  <div style={{ fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 600 }}>{fmtDateTime(entry.at)}{index === 0 ? " (terbaru)" : ""}</div>
                  <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT }}>{Math.max(1, Math.round((entry.size || 0) / 1024))} KB · {entry.file}</div>
                </div>
                <button onClick={() => setPending({ filePath: entry.path, internalEntry: entry })} style={{ marginLeft: "auto", padding: "5px 10px", background: LT, color: G, border: `1px solid ${G}`, borderRadius: RADIUS.sm, cursor: "pointer", fontFamily: "inherit", fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 700 }}>Pulihkan</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {pending && (
        <ConfirmBox
          danger
          title="Pulihkan data dari backup?"
          confirmLabel="Ya, Pulihkan"
          onCancel={() => setPending(null)}
          onConfirm={() => (pending.internalEntry ? (setPending(null), restoreInternal(pending.internalEntry)) : confirmRestore())}
          body={`Seluruh data saat ini akan DIGANTI dengan isi backup berikut:\n\n${describeCounts(pending.counts).join(", ") || "data kosong"}\n\nDibuat: ${fmtDateTime(pending.exportedAt)}\n\nSalinan data saat ini otomatis disimpan lebih dulu, jadi pemulihan ini masih bisa dibatalkan dengan memulihkan backup "pre-restore".`}
        />
      )}
    </div>
  );
}
