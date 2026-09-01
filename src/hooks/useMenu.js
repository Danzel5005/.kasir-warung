import { useState, useMemo, useCallback } from "react";
import { SEED } from "../constants/menu.js";
import { DEFAULT_CATS } from "../constants/categories.js";
import { api } from "../utilities/utils.js";

// useMenu — menu CRUD, kategori CRUD, displayMenu filter+memo.
// `addUndo`/`toast_` diterima sebagai parameter (dari useToast via App.jsx),
// bukan diimport langsung.
function useMenu({ toast_, addUndo }) {
  const [menu, setMenu]   = useState([]);
  const [cats, setCats]   = useState([]);
  const [kategori, setKategori] = useState("semua");
  const [search, setSearch]     = useState("");

  // modal tambah/edit item — murni milik domain menu
  const [itemModal, setItemModal]   = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({ menuId: "", nama: "", harga: "", modal: "", kategori: "kopi", desc: "", stok: "" });

  // modal kelola kategori
  const [catModal, setCatModal]       = useState(false);
  const [newCatLabel, setNewCatLabel] = useState("");

  // deps kosong aman: hanya setter, tidak baca state apapun.
  const loadInitial = useCallback((savedMenu, savedCats) => {
    setMenu(savedMenu || SEED);
    setCats(savedCats && savedCats.length ? savedCats : DEFAULT_CATS);
  }, []);

  // ── Categories (semua = always prepended) — expression, pakai useMemo bukan useCallback
  const allCats = useMemo(() => [{ key: "semua", label: "Semua Menu" }, ...cats], [cats]);

  const displayMenu = useMemo(() => menu.filter(m => {
    const matchK = kategori === "semua" || m.kategori === kategori;
    const haystack = `${m.nama || ""} ${m.menuId || ""}`.toLowerCase();
    const matchQ = haystack.includes(search.toLowerCase());
    return matchK && matchQ;
  }), [menu, kategori, search]);

  // ── Menu CRUD
  // PENTING: membaca cats[0] LANGSUNG dari closure. Wajib [cats] di deps.
  const openAdd = useCallback(() => {
    setForm({ menuId: "", nama: "", harga: "", modal: "", kategori: cats[0]?.key || "kopi", desc: "", foto: null, stok: "" });
    setEditTarget(null);
    setItemModal(true);
  }, [cats]);

  // deps kosong aman: `item` datang sebagai argumen panggilan, tidak baca state luar.
  const openEdit = useCallback((item) => {
    setForm({ menuId: item.menuId || "", nama: item.nama, harga: String(item.harga), modal: String(item.modal || 0), kategori: item.kategori, desc: item.desc || "", stok: item.stok === null ? "" : String(item.stok) });
    setEditTarget(item);
    setItemModal(true);
  }, []);

  // PENTING: membaca form, editTarget, menu LANGSUNG dari closure. Wajib
  // [form, editTarget, menu, toast_] — tanpa form/editTarget, saveItem akan
  // selalu menyimpan data form dari render pertama (kosong/stale).
  const saveItem = useCallback(async () => {
    const nama = form.nama.trim();
    const menuId = form.menuId.trim();
    const harga = parseInt(form.harga.replace(/\D/g, "")) || 0;
    const modal = parseInt(form.modal.replace(/\D/g, "")) || 0;
    if (!nama) { toast_("Nama wajib diisi", "err"); return; }
    if (harga <= 0) { toast_("Harga tidak valid", "err"); return; }

    if (menuId) {
      const duplicate = menu.some(item => {
        if (editTarget && item.id === editTarget.id) return false;
        return String(item.menuId || "").trim().toLowerCase() === menuId.toLowerCase();
      });
      if (duplicate) { toast_("Menu ID sudah dipakai", "err"); return; }
    }

    const stok = form.stok === "" ? null : parseInt(form.stok) || 0;
    const next = editTarget
      ? menu.map(m => m.id === editTarget.id ? { ...m, menuId: menuId || undefined, nama, harga, modal, kategori: form.kategori, desc: form.desc.trim(), stok } : m)
      : [...menu, { id: `c_${Date.now()}`, menuId: menuId || undefined, nama, harga, modal, kategori: form.kategori, desc: form.desc.trim(), stok }];
    await api.saveMenu(next); setMenu(next); setItemModal(false);
    toast_(`"${nama}" ${editTarget ? "diperbarui" : "ditambahkan"}`, "ok");
  }, [form, editTarget, menu, toast_]);

  // deleteItem dipanggil dari App.jsx setelah confirmDel dikonfirmasi (lihat App.jsx)
  // PENTING: membaca menu LANGSUNG dari closure. Wajib [menu, addUndo].
  const deleteItem = useCallback(async (id) => {
    const snap = [...menu];
    const next = menu.filter(m => m.id !== id);
    await api.saveMenu(next); setMenu(next);
    addUndo("Hapus Menu", async () => { await api.saveMenu(snap); setMenu(snap); });
  }, [menu, addUndo]);

  // ── Categories CRUD
  // PENTING: membaca newCatLabel, cats LANGSUNG dari closure. Wajib
  // [newCatLabel, cats, toast_].
  const addCat = useCallback(async () => {
    const label = newCatLabel.trim();
    if (!label) { toast_("Nama kategori wajib diisi", "err"); return; }
    const key = `cat_${Date.now()}`;
    const next = [...cats, { key, label, tags: [] }];
    await api.saveCats(next); setCats(next); setNewCatLabel("");
    toast_(`Kategori "${label}" ditambahkan`, "ok");
  }, [newCatLabel, cats, toast_]);

  // PENTING: membaca cats LANGSUNG dari closure. Wajib [cats, addUndo].
  const deleteCat = useCallback(async (key) => {
    const snap = [...cats];
    const next = cats.filter(c => c.key !== key);
    await api.saveCats(next); setCats(next);
    addUndo("Hapus Kategori", async () => { await api.saveCats(snap); setCats(snap); });
  }, [cats, addUndo]);

  // PENTING: membaca cats LANGSUNG dari closure. Wajib [cats, toast_].
  const addTagToCategory = useCallback(async (catKey, tag) => {
    const updated = cats.map(c => {
      if (c.key === catKey) {
        const tags = c.tags || [];
        if (!tags.includes(tag)) {
          return { ...c, tags: [...tags, tag] };
        }
        return c;
      }
      return c;
    });
    await api.saveCats(updated);
    setCats(updated);
    toast_(`Tag "${tag}" ditambahkan`, "ok");
  }, [cats, toast_]);

  // PENTING: membaca cats LANGSUNG dari closure. Wajib [cats, toast_].
  const removeTagFromCategory = useCallback(async (catKey, tag) => {
    const updated = cats.map(c => {
      if (c.key === catKey) {
        const tags = c.tags || [];
        return { ...c, tags: tags.filter(t => t !== tag) };
      }
      return c;
    });
    await api.saveCats(updated);
    setCats(updated);
    toast_(`Tag "${tag}" dihapus`, "ok");
  }, [cats, toast_]);

  // Hanya MENGHITUNG updatedMenu — TIDAK setMenu di sini.
  // Kode asli (processPayment) baru setMenu(updatedMenu) SETELAH
  // api.processPayment() sukses. Kalau di-setMenu di sini (sebelum IPC
  // selesai), UI akan terlihat stok sudah terkurangi walau pembayaran
  // gagal di main process — itu bug baru yang tidak ada di kode asli.
  // App.jsx yang panggil setMenu(updatedMenu) setelah IPC confirm ok.
  // PENTING: membaca menu LANGSUNG dari closure. Wajib [menu] —
  // tanpa ini, deduksi stok saat payment akan selalu pakai snapshot
  // menu dari render pertama, salah hitung stok untuk item yang stoknya
  // sudah berubah sejak app dibuka.
  const computeStockDeduction = useCallback((cartItems) => {
    return menu.map(m => {
      const o = cartItems[m.id];
      if (!o || m.stok === null) return m;
      return { ...m, stok: Math.max(0, (m.stok || 0) - o.qty) };
    });
  }, [menu]);

  // Restore stock when open bill is cancelled (without payment)
  const computeStockRestoration = useCallback((billItems) => {
    return menu.map(m => {
      const item = billItems.find(i => i.id === m.id);
      if (!item || m.stok === null) return m;
      return { ...m, stok: (m.stok || 0) + (item.qty || 0) };
    });
  }, [menu]);

// PENTING: membaca menu LANGSUNG dari closure untuk snapshot undo. Wajib [menu, addUndo].
const clearAllMenu = useCallback(async () => {
  const snap = [...menu];
  await api.saveMenu([]); setMenu([]);
  addUndo("Hapus Semua Menu", async () => { await api.saveMenu(snap); setMenu(snap); });
}, [menu, addUndo]);

  return {
    menu, cats, kategori, search, allCats, displayMenu,
    itemModal, editTarget, form, catModal, newCatLabel,
    setKategori, setSearch, setItemModal, setForm, setCatModal, setNewCatLabel,
    setMenu, // diperlukan App.jsx untuk commit stok SETELAH IPC processPayment sukses
    loadInitial, openAdd, openEdit, saveItem, deleteItem,
    addCat, deleteCat, addTagToCategory, removeTagFromCategory, computeStockDeduction, computeStockRestoration, clearAllMenu
  };
}

export { useMenu };
