import { useState } from "react";
import { G, W, LT, BD, MT, row, inp, RADIUS, TYPOGRAPHY, COLOR_PALETTE } from "../../constants/design.js";

export default function UserModal({ authH, setUserModal }) {
  const { users, addUser, deleteUser, currentUser } = authH;
  const isAdmin = currentUser && currentUser.role === "admin";
  const [newUser, setNewUser] = useState({ username: "", password: "", nama: "" });

  const handleAdd = async () => {
    const u = newUser.username.trim();
    const p = newUser.password.trim();
    const n = newUser.nama.trim();
    if (!u || !p || !n) return;
    const ok = await addUser({ username: u, password: p, nama: n });
    if (ok) setNewUser({ username: "", password: "", nama: "" });
  };

  return (
    <div
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300 }}
      onClick={e => { if (e.target === e.currentTarget) setUserModal(false); }}
    >
      <div style={{ background:W, borderRadius:RADIUS.lg, padding:"18px", width:420, maxWidth:"95vw", boxShadow:"0 20px 60px rgba(0,0,0,0.3)", maxHeight:"92vh", overflowY:"auto" }}>

        {/* Header */}
        <div style={{ ...row, marginBottom:14 }}>
          <span style={{ fontSize:TYPOGRAPHY.body.fontSize, fontWeight:700, color:G }}>Kelola Pengguna</span>
          <button
            onClick={() => setUserModal(false)}
            style={{ background:"none", border:`1px solid ${BD}`, borderRadius:RADIUS.sm, width:24, height:24, cursor:"pointer", fontSize:TYPOGRAPHY.small.fontSize }}
          >&#10005;</button>
        </div>

        {/* Daftar pengguna */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:TYPOGRAPHY.label.fontSize, color:MT, fontWeight:600, marginBottom:6 }}>DAFTAR PENGGUNA ({users.length})</div>
          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            {users.map(u => (
              <div key={u.username} style={{ ...row, padding:"7px 10px", background:LT, borderRadius:RADIUS.md }}>
                <div>
                  <div style={{ fontSize:TYPOGRAPHY.small.fontSize, fontWeight:600 }}>{u.nama}{u.username === currentUser?.username ? " (Anda)" : ""}</div>
                  <div style={{ fontSize:TYPOGRAPHY.label.fontSize, color:MT }}>@{u.username}</div>
                </div>
                {!isAdmin ? (
                  <span style={{ fontSize:TYPOGRAPHY.label.fontSize, color:MT, fontStyle:"italic" }}>Hanya admin</span>
                ) : u.username === "admin" ? (
                  <span style={{ fontSize:TYPOGRAPHY.label.fontSize, color:MT, fontStyle:"italic" }}>Utama (tidak bisa dihapus)</span>
                ) : u.username === currentUser?.username ? (
                  <span style={{ fontSize:TYPOGRAPHY.label.fontSize, color:MT, fontStyle:"italic" }}>Akun sendiri</span>
                ) : (
                  <button
                    onClick={() => deleteUser(u.username)}
                    style={{ background:COLOR_PALETTE.dangerLight, color:COLOR_PALETTE.danger, border:"none", borderRadius:RADIUS.sm, padding:"4px 8px", cursor:"pointer", fontFamily:"inherit", fontSize:TYPOGRAPHY.label.fontSize, fontWeight:600 }}
                  >Hapus</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tambah pengguna */}
        <div style={{ borderTop:`1px solid ${BD}`, paddingTop:14 }}>
          <div style={{ fontSize:TYPOGRAPHY.label.fontSize, color:MT, fontWeight:600, marginBottom:8 }}>TAMBAH PENGGUNA BARU</div>
          <div style={{ marginBottom:8 }}>
            <label style={{ fontSize:TYPOGRAPHY.label.fontSize, color:MT, fontWeight:600, display:"block", marginBottom:3 }}>Nama Lengkap</label>
            <input
              type="text"
              placeholder="Contoh: Kasir Budi"
              value={newUser.nama}
              onChange={e => setNewUser(f => ({ ...f, nama: e.target.value }))}
              style={inp}
            />
          </div>
          <div style={{ marginBottom:8 }}>
            <label style={{ fontSize:TYPOGRAPHY.label.fontSize, color:MT, fontWeight:600, display:"block", marginBottom:3 }}>Username</label>
            <input
              type="text"
              placeholder="Contoh: kasir1"
              value={newUser.username}
              onChange={e => setNewUser(f => ({ ...f, username: e.target.value }))}
              style={inp}
            />
          </div>
          <div style={{ marginBottom:8 }}>
            <label style={{ fontSize:TYPOGRAPHY.label.fontSize, color:MT, fontWeight:600, display:"block", marginBottom:3 }}>Password</label>
            <input
              type="password"
              placeholder="Min. 4 karakter"
              value={newUser.password}
              onChange={e => setNewUser(f => ({ ...f, password: e.target.value }))}
              onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
              style={inp}
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!newUser.username.trim() || !newUser.password.trim() || !newUser.nama.trim()}
            style={{ width:"100%", padding:9, background:(newUser.username.trim() && newUser.password.trim() && newUser.nama.trim()) ? G : "#aaa", color:W, border:"none", borderRadius:RADIUS.md, cursor:(newUser.username.trim() && newUser.password.trim() && newUser.nama.trim()) ? "pointer" : "not-allowed", fontFamily:"inherit", fontSize:TYPOGRAPHY.small.fontSize, fontWeight:700 }}
          >+ Tambah Pengguna</button>
        </div>
      </div>
    </div>
  );
}

