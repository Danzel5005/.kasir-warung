import { useState } from "react";
import { BD, MT, LT, W, G, inp, row, RADIUS, TYPOGRAPHY, COLOR_PALETTE } from "../../../constants/design.js";
import { isAdmin } from "../../../utilities/permissions.js";
import { PasswordInput } from "./shared.jsx";

function SelfPasswordPanel({ authH }) {
  const [draft, setDraft] = useState({ current: "", next: "", confirmation: "" });
  const valid = draft.current && draft.next.length >= 4 && draft.next === draft.confirmation;
  return <div style={{ paddingTop: 12, borderTop: `1px solid ${BD}`, marginBottom: 12 }}>
    <div style={{ fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 700, color: G, marginBottom: 8 }}>Ganti Password Saya</div>
    <div style={{ display: "grid", gap: 7 }}>
      <PasswordInput value={draft.current} onChange={(event) => setDraft({ ...draft, current: event.target.value })} placeholder="Password saat ini" style={inp} />
      <PasswordInput value={draft.next} onChange={(event) => setDraft({ ...draft, next: event.target.value })} placeholder="Password baru (minimal 4 karakter)" style={inp} />
      <PasswordInput value={draft.confirmation} onChange={(event) => setDraft({ ...draft, confirmation: event.target.value })} placeholder="Ulangi password baru" style={inp} />
      <button onClick={async () => { if (await authH.changeOwnPassword(draft.current, draft.next, draft.confirmation)) setDraft({ current: "", next: "", confirmation: "" }); }} disabled={!valid} style={{ padding: "8px 14px", background: valid ? G : "#aaa", color: W, border: "none", borderRadius: RADIUS.md, cursor: valid ? "pointer" : "not-allowed", fontFamily: "inherit", fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 700 }}>Simpan Password Saya</button>
    </div>
  </div>;
}

export function UsersSettingsTab({ authH }) {
  const [newUser, setNewUser] = useState({ username: "", password: "", nama: "" });
  const [passwordDrafts, setPasswordDrafts] = useState({});
  const canManage = isAdmin(authH?.currentUser);
  const submit = async () => { const user = { username: newUser.username.trim(), password: newUser.password.trim(), nama: newUser.nama.trim() }; if (!user.username || !user.password || !user.nama) return; if (await authH.addUser(user)) setNewUser({ username: "", password: "", nama: "" }); };
  return <div>
    <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, fontWeight: 600, marginBottom: 10 }}>
        Kelola pengguna yang bisa login ke sistem kasir.
        </div>
    {canManage
      ? <SelfPasswordPanel authH={authH} />
      : <div style={{ paddingTop: 12, borderTop: `1px solid ${BD}`, marginBottom: 12, fontSize: TYPOGRAPHY.label.fontSize, color: MT, fontStyle: "italic" }}>
          Ganti password hanya dapat dilakukan oleh admin melalui fitur &quot;Ganti Password Saya&quot;. Hubungi admin untuk mengubah password Anda.
        </div>}
    <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 600, color: G, marginBottom: 8 }}>
        Daftar Pengguna ({authH?.users?.length || 0}):
        </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {authH?.users?.map((user) => 
        <div key={user.username} style={{ ...row, padding: "7px 10px", background: LT, borderRadius: RADIUS.md }}>
            <div>
        <div style={{ fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 600 }}>
                {user.nama}{user.username === authH?.currentUser?.username ? " (Anda)" : ""}
        </div>
            <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT }}>
                @{user.username}
                </div>
            </div>{!canManage ? <span style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, fontStyle: "italic" }}>Hanya admin</span> : user.username === authH?.currentUser?.username ? <span style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, fontStyle: "italic" }}>Ganti via &quot;Ganti Password Saya&quot;</span> : <div style={{ display: "flex", gap: 5, alignItems: "center" }}><div style={{ width: 130 }}><PasswordInput compact value={passwordDrafts[user.username] || ""} onChange={(event) => setPasswordDrafts({ ...passwordDrafts, [user.username]: event.target.value })} placeholder="Password baru" style={{ ...inp, width: "100%", boxSizing: "border-box", padding: "5px 7px" }} /></div><button onClick={async () => { if (await authH.changePassword(user.username, passwordDrafts[user.username])) setPasswordDrafts({ ...passwordDrafts, [user.username]: "" }); }} disabled={(passwordDrafts[user.username] || "").length < 4} style={{ padding: "5px 8px", background: (passwordDrafts[user.username] || "").length >= 4 ? G : "#aaa", color: W, border: "none", borderRadius: RADIUS.sm, cursor: (passwordDrafts[user.username] || "").length >= 4 ? "pointer" : "not-allowed", fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 600 }}>Ubah Password</button>{user.username !== "admin" && <button onClick={() => authH.deleteUser(user.username)} style={{ background: COLOR_PALETTE.dangerLight, color: COLOR_PALETTE.danger, border: "none", borderRadius: RADIUS.sm, padding: "4px 8px", cursor: "pointer", fontFamily: "inherit", fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 600 }}>Hapus</button>}</div>}</div>)}</div></div><div style={{ paddingTop: 12, borderTop: `1px solid ${BD}` }}><div style={{ fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 600, color: G, marginBottom: 8 }}>Tambah Pengguna Baru:</div><div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{[["nama", "Nama Lengkap (e.g., Kasir Budi)"], ["username", "Username (e.g., kasir1)"], ["password", "Password (min. 4 karakter)"]].map(([key, placeholder]) => <input key={key} type={key === "password" ? "password" : "text"} placeholder={placeholder} value={newUser[key]} onChange={(event) => setNewUser({ ...newUser, [key]: event.target.value })} onKeyDown={(event) => event.key === "Enter" && key === "password" && submit()} style={inp} />)}<button onClick={submit} disabled={!newUser.username.trim() || !newUser.password.trim() || !newUser.nama.trim()} style={{ padding: "8px 14px", background: newUser.username.trim() && newUser.password.trim() && newUser.nama.trim() ? G : "#aaa", color: W, border: "none", borderRadius: RADIUS.md, cursor: newUser.username.trim() && newUser.password.trim() && newUser.nama.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 700 }}>+ Tambah Pengguna</button></div></div></div>;
}
