// HostingSettingsTab — tab "Hosting LAN" di modal Pengaturan (Fase 1).
//
// Tab ini muncul untuk semua user, tetapi hanya admin yang bisa MENYALAKAN
// hosting (device Host = Device A). Non-admin hanya melihat penjelasan supaya
// mereka paham alur "Aktifkan Aplikasi Melalui Device Lain".
import { useState } from "react";
import { BD, COLOR_PALETTE, LT, MT, RADIUS, TYPOGRAPHY, W, G, row, inp } from "../../../constants/design.js";
import { isAdmin } from "../../../utilities/permissions.js";
import { useHosting } from "../../../hooks/useHosting.js";

const P = COLOR_PALETTE;

function StatusPill({ active, children }) {
  const bg = active ? P.primaryLight : P.surfaceAlt;
  const tc = active ? P.primary : MT;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: RADIUS.full, background: bg, color: tc, fontSize: TYPOGRAPHY.caption.fontSize, fontWeight: 700 }}>
    <span style={{ width: 7, height: 7, borderRadius: "50%", background: active ? P.primary : "#bbb" }} />
    {children}
  </span>;
}

function CopyField({ label, value }) {
  return <div style={{ marginBottom: 10 }}>
    <div style={{ fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 600, color: G, marginBottom: 4 }}>{label}</div>
    <div style={{ display: "flex", gap: 6 }}>
      <input readOnly value={value || "-"} style={{ ...inp, flex: 1, fontFamily: "monospace", fontSize: TYPOGRAPHY.small.fontSize }} onFocus={(event) => event.target.select()} />
      <button onClick={() => value && navigator.clipboard?.writeText(value)} disabled={!value} style={{ padding: "8px 12px", background: LT, border: `1px solid ${BD}`, borderRadius: RADIUS.md, cursor: value ? "pointer" : "not-allowed", fontFamily: "inherit", fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 600, color: G }}>Salin</button>
    </div>
  </div>;
}

export function HostingSettingsTab({ authH }) {
  const {
    status, starting, error, startHosting, stopHosting, hostBridgeAvailable,
    requests, assignableUsers, busyHwid, approveRequest, rejectRequest,
  } = useHosting();
  // Pilihan akun per-hwid (dropdown "assign akun kasir"). Default: akun pertama.
  const [pickedUser, setPickedUser] = useState({});
  const canHost = isAdmin(authH?.currentUser);
  const hosting = !!status.hosting;
  const followers = status.followers || [];
  const firstUser = assignableUsers[0]?.username || "";

  const userFor = (hwid) => pickedUser[hwid] ?? firstUser;

  if (!canHost) {
    return <div>
      <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, fontWeight: 600, marginBottom: 10 }}>
        Hosting LAN hanya dapat dinyalakan oleh akun admin (Device A).
      </div>
      <div style={{ ...row, justifyContent: "flex-start", gap: 8, padding: 12, background: LT, borderRadius: RADIUS.md }}>
        <StatusPill active={false}>Non-admin</StatusPill>
        <span style={{ fontSize: TYPOGRAPHY.small.fontSize, color: MT }}>
          Untuk memakai perangkat ini sebagai kasir tambahan, gunakan tombol <b>&quot;Aktifkan Aplikasi Melalui Device Lain&quot;</b> di layar lisensi.
        </span>
      </div>
    </div>;
  }

  return <div>
    <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, fontWeight: 600, marginBottom: 10 }}>
      Nyalakan perangkat ini sebagai <b>Device A (Host)</b> agar kasir lain di jaringan WiFi yang sama bisa terhubung dan mencatat transaksi.
    </div>

    {!hostBridgeAvailable && <div style={{ padding: "8px 10px", background: P.warningLight, color: P.warning, borderRadius: RADIUS.md, fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 600, marginBottom: 10 }}>
      Hosting hanya tersedia di aplikasi desktop (Electron).
    </div>}

    {error && <div style={{ padding: "8px 10px", background: P.dangerLight, color: P.danger, borderRadius: RADIUS.md, fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 600, marginBottom: 10 }}>{error}</div>}

    {/* Kontrol utama */}
    <div style={{ ...row, padding: 12, background: hosting ? P.primaryLight : LT, border: `1px solid ${hosting ? "#b8d8c8" : BD}`, borderRadius: RADIUS.md, marginBottom: 12 }}>
      <div>
        <div style={{ fontSize: TYPOGRAPHY.body.fontSize, fontWeight: 700, color: G, marginBottom: 4 }}>{hosting ? "Hosting Aktif" : "Hosting Nonaktif"}</div>
        <StatusPill active={hosting}>{hosting ? `Port ${status.port} · ${status.clientCount || 0} terhubung` : "Belum menyala"}</StatusPill>
      </div>
      {hosting
        ? <button onClick={stopHosting} disabled={starting} style={{ padding: "9px 16px", background: P.danger, color: W, border: "none", borderRadius: RADIUS.md, cursor: starting ? "wait" : "pointer", fontFamily: "inherit", fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 700 }}>{starting ? "Menghentikan..." : "Hentikan Hosting"}</button>
        : <button onClick={() => startHosting({ name: "DEN POS" })} disabled={starting || !hostBridgeAvailable} style={{ padding: "9px 16px", background: (!hostBridgeAvailable || starting) ? "#aaa" : G, color: W, border: "none", borderRadius: RADIUS.md, cursor: (!hostBridgeAvailable || starting) ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 700 }}>{starting ? "Menyalakan..." : "Mulai Hosting"}</button>}
    </div>

    {/* Info identitas — dipakai saat pairing (Fase 2/3) */}
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 600, color: G, marginBottom: 8 }}>Informasi Host:</div>
      <CopyField label="ID Host (Host ID):" value={status.hostId} />
      <div style={{ fontSize: TYPOGRAPHY.caption.fontSize, color: MT, marginTop: -4, marginBottom: 8 }}>Bagikan ID ini jika pairing dilakukan manual.</div>
    </div>

    {/* Daftar device terhubung / pending */}
    <div style={{ paddingTop: 12, borderTop: `1px solid ${BD}` }}>
      <div style={{ fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 600, color: G, marginBottom: 8 }}>Perangkat Menunggu Persetujuan ({requests.length}):</div>
      {requests.length === 0
        ? <div style={{ fontSize: TYPOGRAPHY.small.fontSize, color: MT, fontStyle: "italic", padding: "8px 0" }}>Belum ada perangkat yang mengikuti. Ketika kasir lain membuka aplikasi dan memilih &quot;Aktifkan via Device Lain&quot;, namanya akan muncul di sini untuk disetujui.</div>
        : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {requests.map((r) => {
            const approved = r.status === "approved";
            const rejected = r.status === "rejected";
            const busy = busyHwid === r.hwid;
            return <div key={r.hwid || r.deviceName} style={{ padding: "10px", background: LT, borderRadius: RADIUS.md, border: `1px solid ${BD}` }}>
              <div style={{ ...row, marginBottom: approved || rejected ? 0 : 8 }}>
                <div>
                  <div style={{ fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 600, color: G }}>{r.deviceName || "Perangkat"}</div>
                  <div style={{ fontSize: TYPOGRAPHY.caption.fontSize, color: MT, fontFamily: "monospace" }}>{r.hwid || "-"}</div>
                </div>
                <StatusPill active={approved}>{approved ? "Aktif" : rejected ? "Ditolak" : "Menunggu"}</StatusPill>
              </div>
              {!approved && !rejected && <div style={{ ...row, gap: 6 }}>
                {assignableUsers.length === 0
                  ? <span style={{ fontSize: TYPOGRAPHY.caption.fontSize, color: P.warning, fontWeight: 600, flex: 1 }}>Belum ada akun kasir non-admin. Buat akun dulu di tab Pengguna.</span>
                  : <select
                      value={userFor(r.hwid)}
                      onChange={(e) => setPickedUser((prev) => ({ ...prev, [r.hwid]: e.target.value }))}
                      disabled={busy}
                      style={{ ...inp, flex: 1, fontSize: TYPOGRAPHY.small.fontSize }}
                    >
                      {assignableUsers.map((u) => <option key={u.username} value={u.username}>{u.nama} ({u.username})</option>)}
                    </select>}
                <button
                  onClick={() => approveRequest({ hwid: r.hwid, userId: userFor(r.hwid) })}
                  disabled={busy || assignableUsers.length === 0 || !userFor(r.hwid)}
                  style={{ padding: "8px 14px", background: (busy || assignableUsers.length === 0) ? "#aaa" : P.primary, color: W, border: "none", borderRadius: RADIUS.md, cursor: (busy || assignableUsers.length === 0) ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 700 }}
                >{busy ? "Memproses..." : "Terima"}</button>
                <button
                  onClick={() => rejectRequest({ hwid: r.hwid })}
                  disabled={busy}
                  style={{ padding: "8px 12px", background: "transparent", color: P.danger, border: `1px solid ${P.danger}`, borderRadius: RADIUS.md, cursor: busy ? "wait" : "pointer", fontFamily: "inherit", fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 600 }}
                >Tolak</button>
              </div>}
              {approved && <div style={{ fontSize: TYPOGRAPHY.caption.fontSize, color: MT, marginTop: 4 }}>Akun: <b>{assignableUsers.find(u => u.username === r.userId)?.nama || r.userId || "-"}</b> · data menu, kasir, &amp; open-bill sudah dikirim.</div>}
            </div>;
          })}
        </div>}
    </div>
  </div>;
}
