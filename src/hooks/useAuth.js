import { useState, useCallback } from "react";
import { DEFAULT_USERS, isAdminUser } from "../utilities/users.js";
import { api } from "../utilities/utils.js";

// useAuth — login & shift lifecycle.
// Constraint: tidak import useBills/useCart langsung. Saat shift ditutup,
// cart dikosongkan lewat clearCart (dipanggil App.jsx), BUKAN import langsung.
// PENTING: open bill TIDAK PERNAH dihapus otomatis saat tutup shift — hanya
// dihapus jika user sudah membayar (processPayment -> removeBillLocal).
//

function useAuth({ getNow, toast_ }) {
  const [activeShift, setActiveShift] = useState(null);
  const [shifts, setShifts]           = useState([]);
  const [loginForm, setLoginForm]     = useState({ username: "", password: "", error: "" });
  const [closingShift, setClosingShift] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState(null); // null = aktif
  const [users, setUsers]             = useState([]); // dynamic users from storage
  const [currentUser, setCurrentUser] = useState(null); // logged-in user object

  // deps kosong aman: hanya setter, tidak baca state apapun.
  const loadInitial = useCallback((savedShifts, savedUsers) => {
    const allShifts = savedShifts || [];
    setShifts(allShifts);
    const openShift = allShifts.find(s => s.status === "open");
    if (openShift) setActiveShift(openShift);
    // Load users: jika storage kosong, pakai default
    const userList = savedUsers && savedUsers.length ? savedUsers : DEFAULT_USERS;
    setUsers(userList);
  }, []);

  // PENTING: membaca loginForm, users, dan shifts LANGSUNG dari closure. Wajib
  // [loginForm, users, shifts, getNow] di deps — tanpa shifts, nomor urut shift
  // hari ini (shiftNum) akan selalu dihitung dari snapshot shifts kosong.
  const doLogin = useCallback(async () => {
    const u = users.find(u => u.username === loginForm.username.trim() && u.password === loginForm.password);
    if (!u) { setLoginForm(f => ({ ...f, error: "Username atau password salah" })); return false; }
    const t = getNow();
    const todayKey = `${t.tgl}-${t.blnNum}-${t.thn}`;
    const todayShifts = shifts.filter(s => s.dateKey === todayKey);
    const shiftNum = todayShifts.length + 1;
    const shift = {
      id: `shift_${Date.now()}`,
      shiftNum,
      dateKey: todayKey,
      hari: t.hari, tgl: t.tgl, bln: t.bln, blnNum: t.blnNum, thn: t.thn,
      startTime: t.timestamp,
      startJam: `${t.jam}:${t.mnt}`,
      endTime: null,
      endJam: null,
      operator: u.nama,
      username: u.username,
      status: "open",
      openingCash: 0,
      expenses: [],
    };
    const next = [...shifts, shift];
    await api.saveShifts(next);
    setShifts(next);
    setActiveShift(shift);
    setSelectedShiftId(shift.id);
    // Simpan user yang login saat ini (untuk cek hak admin saat kelola pengguna)
    setCurrentUser(u);
    setLoginForm({ username: "", password: "", error: "" });
    return true;
  }, [loginForm, users, shifts, getNow]);

  const updateShift = useCallback(async (shiftId, patch) => {
    if (!shiftId) return false;
    const next = shifts.map(s => s.id === shiftId ? { ...s, ...patch } : s);
    await api.saveShifts(next);
    setShifts(next);
    setActiveShift(current => current && current.id === shiftId ? { ...current, ...patch } : current);
    setSelectedShiftId(current => current === shiftId ? shiftId : current);
    return true;
  }, [shifts]);

  // onShiftClosed: {clearCart} — dipass dari App.jsx SAAT DIPANGGIL
  // (argumen panggilan, bukan closure dependency), jadi TIDAK masuk deps array.
  // PENTING: membaca activeShift dan shifts LANGSUNG dari closure. Wajib
  // [activeShift, shifts, getNow, toast_] di deps.
  // CATATAN: clearBills DIHAPUS — open bill TIDAK PERNAH dihapus otomatis saat tutup shift.
  // Open bill hanya dihapus jika user sudah membayar/bayar (proses payment).
  const confirmCloseShift = useCallback(async ({ clearCart }) => {
    const t = getNow();
    const closed = { ...activeShift, endTime: t.timestamp, endJam: `${t.jam}:${t.mnt}`, status: "closed" };
    const next = shifts.map(s => s.id === closed.id ? closed : s);
    await api.saveShifts(next);
    setShifts(next);
    setActiveShift(null);
    setClosingShift(false);
    setSelectedShiftId(null);
    // HAPUS: clearBills() — open bill TIDAK dihapus otomatis
    // Open bill hanya dihapus melalui proses bayar (processPayment) yang memanggil removeBillLocal
    clearCart();
    toast_(`Shift ${closed.shiftNum} ditutup — ${closed.startJam} s/d ${closed.endJam}`, "ok");
  }, [activeShift, shifts, getNow, toast_]);

  // ── User management (admin only) ──
  // PENTING: membaca users LANGSUNG dari closure. Wajib [users, toast_] di deps.
  const addUser = useCallback(async ({ username, password, nama }) => {
    if (users.find(u => u.username === username.trim())) {
      toast_("Username sudah terdaftar", "err");
      return false;
    }
    const newUser = { username: username.trim(), password, nama: nama.trim() };
    const next = [...users, newUser];
    await api.saveUsers(next);
    setUsers(next);
    toast_(`Pengguna "${nama}" ditambahkan`, "ok");
    return true;
  }, [users, toast_]);

  // PENTING: membaca users & currentUser LANGSUNG dari closure. Wajib [users, currentUser, toast_] di deps.
  const deleteUser = useCallback(async (username) => {
    // Hanya admin yang boleh hapus pengguna.
    if (!isAdminUser(currentUser)) {
      toast_("Hanya admin yang dapat menghapus pengguna", "err");
      return;
    }
    // Cegah hapus admin utama
    if (username === "admin") {
      toast_("Tidak dapat menghapus pengguna utama", "err");
      return;
    }
    // Admin tidak bisa hapus dirinya sendiri
    if (currentUser && currentUser.username === username) {
      toast_("Tidak dapat menghapus akun sendiri", "err");
      return;
    }
    const next = users.filter(u => u.username !== username);
    await api.saveUsers(next);
    setUsers(next);
    toast_(`Pengguna "${username}" dihapus`, "ok");
  }, [users, currentUser, toast_]);

  return {
    activeShift, shifts, loginForm, closingShift, selectedShiftId, users, currentUser,
    setLoginForm, setClosingShift, setSelectedShiftId,
    loadInitial, doLogin, updateShift, confirmCloseShift,
    addUser, deleteUser,
  };
}

export { useAuth };
