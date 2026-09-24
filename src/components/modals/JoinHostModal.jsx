import { useEffect } from "react";
import { G, W, LT, BD, MT, TX, OR } from "../../constants/design.js";
import { SnakeLoader } from "../SnakeLoader.jsx";

// JoinHostModal — modal "Aktifkan Aplikasi Melalui Device Lain" (Fase 2).
//
// Menampilkan Host DEN POS yang lagi hosting di LAN yang sama (hasil mDNS browse).
// User pilih salah satu lalu tekan "Ikuti" → kirim join-request → tunggu approval
// Device A. Semua state datang dari hook useLicenseHost (hostH).
export default function JoinHostModal({ open, onClose, hostH, onApproved }) {
  // Mulai browse saat modal dibuka, hentikan saat ditutup.
  useEffect(() => {
    if (!open) return undefined;
    hostH.startBrowse();
    return () => { hostH.stopBrowse(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Saat approved, beri tahu parent supaya layar license bisa lanjut.
  useEffect(() => {
    if (open && hostH.phase === "approved" && typeof onApproved === "function") {
      onApproved(hostH.joinedHost);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hostH.phase]);

  if (!open) return null;

  const overlay = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
  };
  const card = {
    background: W, borderRadius: 16, padding: "26px 24px", width: 430,
    maxWidth: "94vw", boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
    fontFamily: "'Segoe UI',sans-serif",
  };
  const btnPrimary = {
    padding: "9px 14px", background: G, color: W, border: "none",
    borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700,
  };
  const btnGhost = {
    padding: "9px 14px", background: LT, color: TX, border: `1px solid ${BD}`,
    borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600,
  };

  const waiting = hostH.phase === "waiting" || hostH.phase === "searching";

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget && !waiting) onClose(); }}>
      <div style={card} role="dialog" aria-modal="true" aria-label="Aktivasi melalui Device Lain">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: G }}>Aktivasi Lewat Device Lain</div>
            <div style={{ fontSize: 11, color: MT, marginTop: 2 }}>Hubungkan ke Device A (admin) di jaringan yang sama.</div>
          </div>
          <button
            onClick={onClose}
            disabled={waiting}
            aria-label="Tutup"
            style={{ background: "transparent", border: "none", cursor: waiting ? "not-allowed" : "pointer", fontSize: 18, color: MT, lineHeight: 1 }}
          >×</button>
        </div>

        {/* Daftar Host yang ditemukan */}
        {hostH.phase !== "approved" && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "16px 0 8px" }}>
              <div style={{ fontSize: 10, color: MT, fontWeight: 600 }}>DEVICE A TERDETEKSI</div>
              {hostH.browsing && <SnakeLoader visible={true} minDuration={400} size={16} color={G} />}
            </div>

            <div style={{ minHeight: 96, maxHeight: 240, overflowY: "auto", border: `1px solid ${BD}`, borderRadius: 10, background: LT }}>
              {hostH.hosts.length === 0 ? (
                <div style={{ padding: "28px 14px", textAlign: "center", fontSize: 11, color: MT, lineHeight: 1.7 }}>
                  {hostH.browsing ? "Mencari Device A di jaringan..." : "Tidak ada Device A yang hosting."}
                  <br />Pastikan Device A sudah menekan <b>Mulai Hosting</b> di Settings → Hosting.
                </div>
              ) : (
                hostH.hosts.map((h) => {
                  const key = h.hostId || `${h.host}:${h.port}`;
                  const disabled = waiting;
                  return (
                    <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 13px", borderBottom: `1px solid ${BD}` }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: TX }}>{h.name || "DEN POS"}</div>
                        <div style={{ fontSize: 10, color: MT, fontFamily: "monospace" }}>{h.host}:{h.port} · {h.hostId || "-"}</div>
                      </div>
                      <button
                        style={{ ...btnPrimary, opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
                        disabled={disabled}
                        onClick={() => hostH.join(h)}
                      >Ikuti</button>
                    </div>
                  );
                })
              )}
            </div>

            {hostH.phase === "waiting" && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, padding: "12px 14px", background: "#fff8e0", border: `1px solid ${OR}`, borderRadius: 10 }}>
                <SnakeLoader visible={true} minDuration={600} size={18} color={OR} />
                <div style={{ fontSize: 11.5, color: "#8a5a00", lineHeight: 1.5 }}>
                  Menunggu persetujuan Device A...<br />
                  <span style={{ fontSize: 10.5 }}>Admin perlu meng-assign akun untuk perangkat ini di Settings → Hosting.</span>
                </div>
              </div>
            )}

            {hostH.error && (
              <div style={{ marginTop: 12, fontSize: 11.5, color: "#d32f2f", fontWeight: 600 }}>❌ {hostH.error}</div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              {hostH.phase === "waiting" && (
                <button style={btnGhost} onClick={() => hostH.cancel()}>Batal</button>
              )}
              <button style={btnGhost} onClick={onClose} disabled={waiting}>Tutup</button>
            </div>
          </>
        )}

        {/* Sukses */}
        {hostH.phase === "approved" && (
          <>
            <div style={{ margin: "22px 0 8px", textAlign: "center" }}>
              <div style={{ fontSize: 40 }}>✅</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: G, marginTop: 8 }}>Perangkat ini sudah diterima!</div>
              <div style={{ fontSize: 11.5, color: MT, marginTop: 6, lineHeight: 1.7 }}>
                Aktivasi via Device A tersimpan. Aplikasi akan dimuat ulang memakai data dari Device A.
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
              <button style={btnPrimary} onClick={onClose}>Lanjut</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
