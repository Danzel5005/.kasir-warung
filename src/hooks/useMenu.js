import { useState, useMemo, useCallback } from "react";
import { SEED } from "../constants/menu.js";
import { DEFAULT_CATS } from "../constants/categories.js";
import { updateCategoryLabel } from "../utilities/categoryManagement.js";
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
  // Langkah 3: `satuan`, `units`, `priceTiers` ikut di form supaya editor
  // multi-satuan & tier bisa dipasang di ItemModal.
  const [form, setForm] = useState({ menuId: "", nama: "", harga: "", modal: "", kategori: "kopi", desc: "", stok: "", satuan: "", units: [], priceTiers: [] });

  // modal kelola kategori
  const [catModal, setCatModal]       = useState(false);
  const [newCatLabel, setNewCatLabel] = useState("");

  // deps kosong aman: hanya setter, tidak baca state apapun.
  const loadInitial = useCallback((savedMenu, savedCats) => {
    setMenu(savedMenu || SEED);
    setCats(savedCats && savedCats.length ? savedCats : DEFAULT_CATS);
  }, []);

  // Muat ulang menu + kategori DARI PENYIMPANAN (SQLite/localStorage).
  // Dipakai setelah operasi yang mengubah data di luar useMenu (mis. import
  // Excel memakai api.bulkUpsertMenu langsung) supaya state React ikut
  // ter-update tanpa perlu restart aplikasi.
  const refreshFromStore = useCallback(async () => {
    const [savedMenu, savedCats] = await Promise.all([api.loadMenu(), api.loadCats()]);
    if (Array.isArray(savedMenu)) setMenu(savedMenu);
    if (Array.isArray(savedCats) && savedCats.length) setCats(savedCats);
    return savedMenu;
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
    setForm({ menuId: "", nama: "", harga: "", modal: "", kategori: cats[0]?.key || "kopi", desc: "", foto: null, stok: "", satuan: "", units: [], priceTiers: [] });
    setEditTarget(null);
    setItemModal(true);
  }, [cats]);

  // deps kosong aman: `item` datang sebagai argumen panggilan, tidak baca state luar.
  const openEdit = useCallback((item) => {
    setForm({
      menuId: item.menuId || "", nama: item.nama, harga: String(item.harga), modal: String(item.modal || 0),
      kategori: item.kategori, desc: item.desc || "", stok: item.stok === null ? "" : String(item.stok),
      satuan: item.satuan || "",
      units: Array.isArray(item.units) ? item.units.map(u => ({ ...u })) : [],
      priceTiers: Array.isArray(item.priceTiers) ? item.priceTiers.map(t => ({ ...t })) : [],
    });
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

    // ── Langkah 3: normalisasi + validasi satuan & tier ────────────────
    // Validasi: factor satuan >= 2; minQty tier naik dan unik; peringatan
    // (bukan blokir) kalau harga tier >= harga dasar.
    const satuan = (form.satuan || "").trim();
    const units = (form.units || [])
      .map(u => ({
        key: String(u.key || "").trim().toLowerCase().replace(/\s+/g, "_"),
        label: String(u.label || "").trim(),
        factor: parseInt(u.factor) || 0,
        harga: parseInt(u.harga) || 0,
        ...(u.modal !== undefined && u.modal !== "" ? { modal: parseInt(u.modal) || 0 } : {}),
      }))
      .filter(u => u.key && u.label);
    for (const u of units) {
      if (u.factor < 2) { toast_(`Faktor satuan "${u.label}" minimal 2`, "err"); return; }
    }
    const unitKeys = units.map(u => u.key);
    if (new Set(unitKeys).size !== unitKeys.length) { toast_("Kode satuan duplikat", "err"); return; }

    const priceTiers = (form.priceTiers || [])
      .map(t => ({ minQty: parseInt(t.minQty) || 0, harga: parseInt(t.harga) || 0 }))
      .filter(t => t.minQty > 0 && t.harga > 0)
      .sort((a, b) => a.minQty - b.minQty);
    for (let i = 1; i < priceTiers.length; i++) {
      if (priceTiers[i].minQty === priceTiers[i - 1].minQty) { toast_("minQty tier harus unik", "err"); return; }
    }
    if (priceTiers.some(t => t.harga >= harga)) {
      toast_("Harga tier >= harga dasar, tier tidak akan dipakai", "err");
    }

    const record = editTarget
      ? { ...editTarget, menuId: menuId || undefined, nama, harga, modal, kategori: form.kategori, desc: form.desc.trim(), stok, satuan, units, priceTiers }
      : { id: `c_${Date.now()}`, menuId: menuId || undefined, nama, harga, modal, kategori: form.kategori, desc: form.desc.trim(), stok, satuan, units, priceTiers };
    // upsert di main process; stok baris yang sudah ada TIDAK ditimpa
    // (Langkah 2). Field `stok` dari form hanya berlaku untuk item baru.
    await api.upsertMenu(record);
    // Langkah 6: perubahan stok item lama dikirim terpisah dari upsert.
    // Peralihan null (tak terbatas) <-> angka diset langsung tanpa log;
    // perubahan angka ke angka dicatat sebagai mutasi `adjust`.
    let stockPatch = {};
    if (editTarget) {
      const before = editTarget.stok === undefined ? null : editTarget.stok;
      const after = stok;
      if (before === null || after === null) {
        if (before !== after) { const res = await api.stockSet(editTarget.id, after); if (res?.ok && res.stock) stockPatch = res.stock; }
      } else if (Number(before) !== Number(after)) {
        const diff = Number(after) - Number(before);
        const res = await api.adjustStock({ [editTarget.id]: diff }, { type: "adjust", note: "edit item" });
        if (res?.ok && res.stock) stockPatch = res.stock;
      }
    }
    const next = editTarget
      ? menu.map(m => m.id === editTarget.id ? { ...record, stok: stockPatch[m.id] === undefined ? m.stok : stockPatch[m.id] } : m)
      : [...menu, record];
    setMenu(next); setItemModal(false);
    toast_(`"${nama}" ${editTarget ? "diperbarui" : "ditambahkan"}`, "ok");
  }, [form, editTarget, menu, toast_]);

  // deleteItem dipanggil dari App.jsx setelah confirmDel dikonfirmasi (lihat App.jsx)
  // PENTING: membaca menu LANGSUNG dari closure. Wajib [menu, addUndo].
  const deleteItem = useCallback(async (id) => {
    const snap = [...menu];
    const next = menu.filter(m => m.id !== id);
    await api.deleteMenu(id); setMenu(next);
    addUndo("Hapus Menu", async () => { await api.replaceMenu(snap); setMenu(snap); });
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

  // PENTING: membaca cats dan menu LANGSUNG dari closure. Wajib [cats, menu, addUndo, toast_].
  const deleteCat = useCallback(async (key) => {
    if (menu.some(item => item.kategori === key)) {
      toast_("Kategori masih dipakai menu. Pindahkan menu ke kategori lain terlebih dahulu", "err");
      return;
    }
    const snap = [...cats];
    const next = cats.filter(c => c.key !== key);
    await api.saveCats(next); setCats(next);
    addUndo("Hapus Kategori", async () => { await api.saveCats(snap); setCats(snap); });
  }, [cats, menu, addUndo, toast_]);

  const editCat = useCallback(async (key, nextLabel) => {
    try {
      const updated = updateCategoryLabel(cats, key, nextLabel);
      await api.saveCats(updated);
      setCats(updated);
      toast_("Kategori diperbarui", "ok");
      return true;
    } catch (error) {
      toast_(error.message || "Gagal mengubah kategori", "err");
      return false;
    }
  }, [cats, toast_]);

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

  // computeStockDeduction/computeStockRestoration DIHAPUS (Langkah 2): stok
  // sekarang dihitung di main process lewat applyStockDelta. Jika perlu
  // menyesuaikan tampilan setelah delta diterapkan, pakai `applyStockView`.
  // Terapkan peta `{id: stok}` hasil IPC ke state menu.
  const applyStockView = useCallback((stock) => {
    if (!stock || !Object.keys(stock).length) return;
    setMenu(prev => prev.map(m => (stock[m.id] === undefined ? m : { ...m, stok: stock[m.id] })));
  }, []);

// PENTING: membaca menu LANGSUNG dari closure untuk snapshot undo. Wajib [menu, addUndo].
const clearAllMenu = useCallback(async () => {
  const snap = [...menu];
  await api.replaceMenu([]); setMenu([]);
  addUndo("Hapus Semua Menu", async () => { await api.replaceMenu(snap); setMenu(snap); });
}, [menu, addUndo]);

  return {
    menu, cats, kategori, search, allCats, displayMenu,
    itemModal, editTarget, form, catModal, newCatLabel,
    setKategori, setSearch, setItemModal, setForm, setCatModal, setNewCatLabel,
    setMenu, // diperlukan App.jsx untuk commit stok SETELAH IPC processPayment sukses
    applyStockView,
    refreshFromStore,
    loadInitial, openAdd, openEdit, saveItem, deleteItem,
    addCat, editCat, deleteCat, addTagToCategory, removeTagFromCategory, clearAllMenu
  };
}

export { useMenu };
