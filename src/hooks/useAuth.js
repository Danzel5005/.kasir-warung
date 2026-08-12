import { useState, useCallback } from "react";
import { DEFAULT_USERS } from "../utilities/users.js";
import { api } from "../utilities/utils.js";

// useAuth — login & shift lifecycle.
// Constraint: tidak import useBills/useCart langsung. Saat shift ditutup,
// dia HARUS mengosongkan open bills + cart — tapi itu didapat lewat
// `onShiftClosed({clearBills, clearCart})` yang dipanggil App.jsx, BUKAN
// import langsung. Ini menjaga data-flow tetap terlihat di satu tempat (App.jsx).
//
// CATATAN PERILAKU (tidak diubah dari App.jsx asli, sengaja dipertahankan):
// confirmCloseShift menghapus SEMUA open bill tanpa undo — ini "silent
// destructive operation" yang sudah pernah diflag sebelumnya (lihat
// YKK-Dev-Log catatan internal), TIDAK diperbaiki di sini karena di luar
// scope migrasi murni. Kalau mau ditambah undo, itu perubahan behavior
// terpisah yang butuh keputusan eksplisit kamu.
function useAuth({ getNow, toast_ }) {
  const [activeShift, setActiveShift] = useState(null);
  const [shifts, setShifts]           = useState([]);
  const [loginForm, setLoginForm]     = useState({ username: "", password: "", error: "" });
  const [closingShift, setClosingShift] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState(null); // null = aktif
  const [users, setUsers]             = useState([]); // dynamic users from storage

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
    if (!u) { setLoginForm(f => ({ ...f, error: "Username atau password salah" })); return; }
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
    };
    const next = [...shifts, shift];
    await api.saveShifts(next);
    setShifts(next);
    setActiveShift(shift);
    setSelectedShiftId(shift.id);
    setLoginForm({ username: "", password: "", error: "" });
  }, [loginForm, users, shifts, getNow]);

  // onShiftClosed: {clearBills, clearCart} — dipass dari App.jsx SAAT DIPANGGIL
  // (argumen panggilan, bukan closure dependency), jadi TIDAK masuk deps array.
  // PENTING: membaca activeShift dan shifts LANGSUNG dari closure. Wajib
  // [activeShift, shifts, getNow, toast_] di deps.
  const confirmCloseShift = useCallback(async ({ clearBills, clearCart }) => {
    const t = getNow();
    const closed = { ...activeShift, endTime: t.timestamp, endJam: `${t.jam}:${t.mnt}`, status: "closed" };
    const next = shifts.map(s => s.id === closed.id ? closed : s);
    await api.saveShifts(next);
    setShifts(next);
    setActiveShift(null);
    setClosingShift(false);
    setSelectedShiftId(null);
    // Clear open bills saat shift ditutup (perilaku asli dipertahankan, lihat catatan di atas)
    await clearBills();
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

  // PENTING: membaca users LANGSUNG dari closure. Wajib [users, toast_] di deps.
  const deleteUser = useCallback(async (username) => {
    // Cegah hapus admin utama
    if (username === "admin") {
      toast_("Tidak dapat menghapus pengguna utama", "err");
      return;
    }
    const next = users.filter(u => u.username !== username);
    await api.saveUsers(next);
    setUsers(next);
    toast_(`Pengguna "${username}" dihapus`, "ok");
  }, [users, toast_]);

  return {
    activeShift, shifts, loginForm, closingShift, selectedShiftId, users,
    setLoginForm, setClosingShift, setSelectedShiftId,
    loadInitial, doLogin, confirmCloseShift,
    addUser, deleteUser,
  };
}

export { useAuth };
