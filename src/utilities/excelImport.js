// excelImport.js — parsing & validasi import Excel (Menu, BahanBaku, Resep).
//
// Modul MURNI: tanpa React, tanpa IPC, tanpa akses storage. Semua fungsi di
// sini hanya mengubah data yang diberikan sebagai argumen, sehingga bisa
// dites terpisah dari UI (mirror pola resepHpp.js / bahanBaku.js).
//
// Alur: parseImportWorkbook() -> validate*() -> buildImportPlan().
//
// Kebijakan yang sudah dikonfirmasi pemilik produk:
//  - Kategori di Excel yang belum ada di database -> DIBUAT OTOMATIS
//    (bukan error baris). Lihat validateMenuRows + buildImportPlan.
//  - Konflik menuId/nama bahan -> keputusan per baris ("keep" | "overwrite").
//  - Stok menu existing TIDAK pernah ditimpa lewat import (aturan upsertMenuRow
//    di db.cjs). Stok hanya di-set untuk menu baru.
//  - Field yang tidak ada di template Excel (units/priceTiers/desc/foto)
//    dipertahankan apa adanya saat "overwrite".
//  - Sheet Resep menang atas kolom `modal` bila menu punya baris resep.

export const SHEET_MENU = "Menu";
export const SHEET_BAHAN = "BahanBaku";
export const SHEET_RESEP = "Resep";

// Status per baris hasil validasi.
export const ROW_NEW = "new";
export const ROW_CONFLICT = "conflict";
export const ROW_ERROR = "error";

// ── Helper kecil ───────────────────────────────────────────────────────────

// Normalisasi kunci pencocokan: trim + lowercase + rapikan spasi ganda.
export function normKey(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

// Angka dari sel Excel: kosong/NaN -> null (supaya bisa dibedakan dari 0).
function toNum(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(String(value).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function toStr(value) {
  return String(value ?? "").trim();
}

// ── 1. Parsing ─────────────────────────────────────────────────────────────

// Baca workbook dari ArrayBuffer. Mengembalikan baris mentah (belum divalidasi)
// per sheet. Sheet yang tidak ada -> array kosong. `sheetNames` mengembalikan
// daftar sheet yang benar-benar ditemukan, supaya UI bisa memberi tahu user
// kalau sheet opsional tidak ada.
export async function parseImportWorkbook(arrayBuffer) {
  // xlsx dimuat dinamis: hanya diambil saat user benar-benar mengimpor file,
  // sehingga tidak membengkakkan bundle utama (xlsx ~ besar). Fungsi ini jadi
  // async — pemanggil WAJIB await.
  const XLSX = await import("xlsx");
  const wb = XLSX.read(arrayBuffer, { type: "array" });
  const pick = (candidates) => {
    for (const name of candidates) {
      const found = wb.SheetNames.find((s) => normKey(s) === normKey(name));
      if (found) return found;
    }
    return null;
  };

  const readSheet = (candidates) => {
    const name = pick(candidates);
    if (!name) return [];
    const ws = wb.Sheets[name];
    if (!ws) return [];
    // defval: "" supaya sel kosong tetap muncul sebagai properti (bukan hilang),
    // sehingga header yang tidak konsisten antar baris tetap terbaca.
    return XLSX.utils.sheet_to_json(ws, { defval: "", raw: true });
  };

  const menuRows = readSheet([SHEET_MENU, "Menu ", "menu"]);
  const bahanRows = readSheet([SHEET_BAHAN, "Bahan Baku", "bahanbaku", "bahan"]);
  const resepRows = readSheet([SHEET_RESEP, "Recipe", "resep"]);

  const found = [];
  if (pick([SHEET_MENU, "menu"])) found.push(SHEET_MENU);
  if (pick([SHEET_BAHAN, "Bahan Baku", "bahanbaku"])) found.push(SHEET_BAHAN);
  if (pick([SHEET_RESEP, "Recipe"])) found.push(SHEET_RESEP);

  return {
    menuRows,
    bahanRows,
    resepRows,
    sheetNames: wb.SheetNames,
    foundSheets: found,
  };
}

// Baca satu field dengan toleransi nama header (case-insensitive, spasi
// diabaikan). row adalah objek hasil sheet_to_json.
function field(row, ...names) {
  if (!row || typeof row !== "object") return "";
  const normed = {};
  for (const k of Object.keys(row)) normed[normKey(k).replace(/\s+/g, "")] = row[k];
  for (const n of names) {
    const key = normKey(n).replace(/\s+/g, "");
    if (key in normed) return normed[key];
  }
  return "";
}

// ── 2. Validasi Menu ───────────────────────────────────────────────────────

// existingMenu : array menu saat ini (dari database).
// existingCats : array kategori saat ini [{ key, label }].
// Mengembalikan { rows, newCategories, errors }.
//  - rows: [{ index, status, data, existing?, categoryAction }]
//    status: "new" (siap commit) | "conflict" (butuh keputusan user) | "error"
//    categoryAction: "existing" | "create" | null
//  - newCategories: [{ key, label }] kategori baru yang perlu dibuat.
export function validateMenuRows(rows, existingMenu = [], existingCats = []) {
  const list = Array.isArray(rows) ? rows : [];
  const byId = new Map();
  const byName = new Map();
  for (const m of Array.isArray(existingMenu) ? existingMenu : []) {
    if (m?.id !== undefined && m?.id !== null) byId.set(String(m.id), m);
    if (m?.menuId) byId.set(String(m.menuId), m);
    if (m?.nama) byName.set(normKey(m.nama), m);
  }

  // Peta kategori: cocokkan ke key ATAU label (case-insensitive).
  const catByKey = new Map();
  for (const c of Array.isArray(existingCats) ? existingCats : []) {
    if (c?.key) catByKey.set(normKey(c.key), c);
    if (c?.label) catByKey.set(normKey(c.label), c);
  }

  const out = [];
  const seenNewIds = new Set();
  const newCategories = [];
  const newCatKeys = new Set();

  list.forEach((raw, index) => {
    const nama = toStr(field(raw, "nama", "name", "menu"));
    const menuIdRaw = toStr(field(raw, "menuId", "menu_id", "id", "kode"));
    const kategoriRaw = toStr(field(raw, "kategori", "category"));
    const harga = toNum(field(raw, "harga", "price", "hargaJual"));
    const modal = toNum(field(raw, "modal", "hpp", "hargaPokok"));
    const stok = toNum(field(raw, "stok", "stock"));
    const satuan = toStr(field(raw, "satuan", "unit", "uom"));

    const errors = [];
    if (!nama) errors.push("Nama wajib diisi");
    if (harga === null || harga <= 0) errors.push("Harga harus > 0");
    if (!kategoriRaw) errors.push("Kategori wajib diisi");

    if (errors.length) {
      out.push({ index, status: ROW_ERROR, errors, data: { nama, menuId: menuIdRaw, kategori: kategoriRaw, harga, modal, stok, satuan }, categoryAction: null });
      return;
    }

    // Resolusi kategori: existing atau buat baru.
    const catMatch = catByKey.get(normKey(kategoriRaw));
    let categoryKey;
    let categoryAction;
    if (catMatch) {
      categoryKey = catMatch.key;
      categoryAction = "existing";
    } else {
      // Buat kategori baru. Key mengikuti pola `cat_<timestamp>` seperti
      // addCat di useMenu.js, tapi index dipakai sebagai pembeda agar unik
      // dalam satu file. Label memakai teks asli user.
      const key = `cat_imp_${Date.now()}_${index}`;
      categoryKey = key;
      categoryAction = "create";
      if (!newCatKeys.has(normKey(kategoriRaw))) {
        newCatKeys.add(normKey(kategoriRaw));
        newCategories.push({ key, label: kategoriRaw });
      } else {
        // Kategori ini sudah direncanakan dibuat oleh baris lain di file yang
        // sama — pakai key yang sama agar tidak jadi kategori duplikat.
        const planned = newCategories.find((c) => normKey(c.label) === normKey(kategoriRaw));
        categoryKey = planned?.key || key;
      }
    }

    const existing = (menuIdRaw && byId.get(menuIdRaw)) || (!menuIdRaw && byName.get(normKey(nama))) || null;
    const id = menuIdRaw || existing?.id || `c_${Date.now()}_${index}`;

    // Cegah dua baris di file yang sama memakai id yang sama.
    if (seenNewIds.has(String(id))) {
      out.push({ index, status: ROW_ERROR, errors: ["ID/ nama duplikat di dalam file"], data: { nama, menuId: menuIdRaw, kategori: kategoriRaw, harga, modal, stok, satuan }, categoryAction: null });
      return;
    }
    seenNewIds.add(String(id));

    const data = { id, menuId: menuIdRaw || undefined, nama, kategori: categoryKey, kategoriLabel: kategoriRaw, harga: Math.round(harga), modal: modal === null ? undefined : Math.round(modal), stok, satuan };

    out.push({
      index,
      status: existing ? ROW_CONFLICT : ROW_NEW,
      data,
      existing: existing || null,
      categoryAction,
    });
  });

  return { rows: out, newCategories, errors: out.filter((r) => r.status === ROW_ERROR) };
}

// ── 3. Validasi Bahan Baku ─────────────────────────────────────────────────

// Kunci pencocokan bahan = nama (case-insensitive). Bahan baru diberi id
// mengikuti pola upsertBahan di useAdvancedData.js (`bahan_<ts>_<rand>`).
export function validateBahanRows(rows, existingBahan = []) {
  const list = Array.isArray(rows) ? rows : [];
  const byName = new Map();
  for (const b of Array.isArray(existingBahan) ? existingBahan : []) {
    if (b?.nama) byName.set(normKey(b.nama), b);
  }

  const out = [];
  const seen = new Set();

  list.forEach((raw, index) => {
    const nama = toStr(field(raw, "namaBahan", "nama", "bahan", "name"));
    const satuan = toStr(field(raw, "satuan", "unit", "uom"));
    const hargaSatuan = toNum(field(raw, "hargaSatuan", "harga", "harga_satuan", "price"));
    const stok = toNum(field(raw, "stok", "stock"));
    const minStok = toNum(field(raw, "minStok", "min", "min_stok", "minimal"));

    const errors = [];
    if (!nama) errors.push("Nama bahan wajib diisi");
    if (hargaSatuan === null || hargaSatuan < 0) errors.push("Harga satuan tidak valid");

    if (errors.length) {
      out.push({ index, status: ROW_ERROR, errors, data: { nama, satuan, hargaSatuan, stok, minStok } });
      return;
    }

    if (seen.has(normKey(nama))) {
      out.push({ index, status: ROW_ERROR, errors: ["Nama bahan duplikat di dalam file"], data: { nama, satuan, hargaSatuan, stok, minStok } });
      return;
    }
    seen.add(normKey(nama));

    const existing = byName.get(normKey(nama)) || null;
    const data = {
      id: existing?.id || `bahan_${Date.now()}_${index}`,
      nama,
      satuan,
      hargaSatuan: Math.round(hargaSatuan),
      stok: stok === null ? 0 : stok,
      minStok: minStok === null ? 0 : minStok,
      supplierId: existing?.supplierId || "",
    };

    out.push({ index, status: existing ? ROW_CONFLICT : ROW_NEW, data, existing });
  });

  return { rows: out, errors: out.filter((r) => r.status === ROW_ERROR) };
}

// ── 4. Validasi Resep ──────────────────────────────────────────────────────

// Resolusi id menu & bahan memakai gabungan baris baru (dari sheet Menu /
// BahanBaku yang valid) DAN data existing. Return { rows, errors }.
//  - resolvedMenuIds: map normKey(menuId|nama) -> { id, nama, source }
//  - resolvedBahanIds: map normKey(nama bahan) -> { id, nama, source }
export function validateResepRows(rows, resolvedMenuIds, resolvedBahanIds) {
  const list = Array.isArray(rows) ? rows : [];
  const menuMap = resolvedMenuIds instanceof Map ? resolvedMenuIds : new Map(Object.entries(resolvedMenuIds || {}));
  const bahanMap = resolvedBahanIds instanceof Map ? resolvedBahanIds : new Map(Object.entries(resolvedBahanIds || {}));

  const out = [];
  list.forEach((raw, index) => {
    const menuRef = toStr(field(raw, "menuId", "menu_id", "namaMenu", "menu", "id"));
    const bahanRef = toStr(field(raw, "namaBahan", "bahan", "bahanId", "bahan_id"));
    const qty = toNum(field(raw, "qty", "jumlah", "quantity"));

    const errors = [];
    if (!menuRef) errors.push("Menu (menuId/namaMenu) wajib diisi");
    if (!bahanRef) errors.push("Nama bahan wajib diisi");
    if (qty === null || qty <= 0) errors.push("qty harus > 0");

    const menuHit = menuRef ? menuMap.get(normKey(menuRef)) : null;
    const bahanHit = bahanRef ? bahanMap.get(normKey(bahanRef)) : null;

    if (menuRef && !menuHit) errors.push(`Menu "${menuRef}" tidak ditemukan`);
    if (bahanRef && !bahanHit) errors.push(`Bahan "${bahanRef}" tidak ditemukan`);

    if (errors.length) {
      out.push({ index, status: ROW_ERROR, errors, data: { menuRef, bahanRef, qty } });
      return;
    }

    out.push({
      index,
      status: ROW_NEW, // baris resep tidak pernah "konflik" — selalu digabung
      data: { menuId: menuHit.id, bahanId: bahanHit.id, qty, menuRef, bahanRef },
    });
  });

  return { rows: out, errors: out.filter((r) => r.status === ROW_ERROR) };
}

// Bangun peta resolusi dari baris menu & bahan hasil validasi (tanpa error).
// Dipakai sebelum validateResepRows. `source` menandai asal data untuk UI.
export function buildResolvers(validatedMenu, validatedBahan, existingMenu = [], existingBahan = []) {
  const menuMap = new Map();
  const bahanMap = new Map();

  for (const m of Array.isArray(existingMenu) ? existingMenu : []) {
    if (m?.nama) menuMap.set(normKey(m.nama), { id: m.id, nama: m.nama, source: "existing" });
    if (m?.menuId) menuMap.set(normKey(m.menuId), { id: m.id, nama: m.nama, source: "existing" });
    if (m?.id) menuMap.set(normKey(m.id), { id: m.id, nama: m.nama, source: "existing" });
  }
  for (const r of validatedMenu?.rows || []) {
    if (r.status === ROW_ERROR) continue;
    const d = r.data;
    menuMap.set(normKey(d.nama), { id: d.id, nama: d.nama, source: "import" });
    if (d.menuId) menuMap.set(normKey(d.menuId), { id: d.id, nama: d.nama, source: "import" });
    menuMap.set(normKey(d.id), { id: d.id, nama: d.nama, source: "import" });
  }

  for (const b of Array.isArray(existingBahan) ? existingBahan : []) {
    if (b?.nama) bahanMap.set(normKey(b.nama), { id: b.id, nama: b.nama, source: "existing" });
  }
  for (const r of validatedBahan?.rows || []) {
    if (r.status === ROW_ERROR) continue;
    bahanMap.set(normKey(r.data.nama), { id: r.data.id, nama: r.data.nama, source: "import" });
  }

  return { menuMap, bahanMap };
}

// ── 5. Build Plan ──────────────────────────────────────────────────────────

// Gabungkan validasi + keputusan user menjadi rencana commit final.
//   decisions: { menu: { [index]: "keep"|"overwrite" }, bahan: { [index]: ... } }
// Return:
//   { menuToUpsert, bahanToUpsert, resepToSet, newCategories, stats, hasPendingDecisions }
//  - menuToUpsert: array record siap dikirim ke bulkUpsertMenu.
//  - bahanToUpsert: array bahan siap disimpan (existing + import digabung oleh
//    pemanggil dengan state saat ini; di sini hanya berisi entri yang berubah).
//  - resepToSet: map menuId -> [{ bahanId, qty }] hasil import (untuk digabung
//    dengan resep existing oleh pemanggil).
//  - newCategories: kategori baru yang harus dibuat sebelum upsert menu.
export function buildImportPlan(validatedMenu, validatedBahan, validatedResep, decisions = {}) {
  const menuDecisions = decisions.menu || {};
  const bahanDecisions = decisions.bahan || {};

  const menuToUpsert = [];
  const bahanToUpsert = [];
  const resepToSet = {};
  let pending = 0;
  let keptMenu = 0;
  let keptBahan = 0;

  const menuByRefId = new Map(); // id -> data final (untuk resolusi resep)
  const conflictMenuIds = new Set();

  for (const r of validatedMenu?.rows || []) {
    if (r.status === ROW_ERROR) continue;
    if (r.status === ROW_CONFLICT) {
      const d = menuDecisions[r.index];
      if (d === undefined || d === null) { pending += 1; continue; }
      if (d === "keep") {
        keptMenu += 1;
        menuByRefId.set(String(r.data.id), r.existing);
        continue;
      }
      // overwrite: pertahankan field yang tidak ada di template Excel.
      const merged = { ...r.existing, ...r.data };
      // Stok TIDAK ditimpa untuk menu existing (aturan upsertMenuRow).
      delete merged.stok;
      merged.stok = r.existing?.stok ?? null;
      menuToUpsert.push(merged);
      menuByRefId.set(String(r.data.id), merged);
      conflictMenuIds.add(String(r.data.id));
    } else {
      menuToUpsert.push(r.data);
      menuByRefId.set(String(r.data.id), r.data);
    }
  }

  const bahanByRefId = new Map();
  for (const r of validatedBahan?.rows || []) {
    if (r.status === ROW_ERROR) continue;
    if (r.status === ROW_CONFLICT) {
      const d = bahanDecisions[r.index];
      if (d === undefined || d === null) { pending += 1; continue; }
      if (d === "keep") {
        keptBahan += 1;
        bahanByRefId.set(String(r.data.id), r.existing);
        continue;
      }
      bahanToUpsert.push({ ...r.existing, ...r.data });
      bahanByRefId.set(String(r.data.id), { ...r.existing, ...r.data });
    } else {
      bahanToUpsert.push(r.data);
      bahanByRefId.set(String(r.data.id), r.data);
    }
  }

  // Resep: hanya baris valid. Menu yang di-"keep" tetap boleh punya resep baru
  // (keputusan "keep" hanya menyangkut field menu, bukan resep).
  const resepSkipped = [];
  for (const r of validatedResep?.rows || []) {
    if (r.status === ROW_ERROR) { resepSkipped.push({ index: r.index, errors: r.errors }); continue; }
    const menuId = String(r.data.menuId);
    if (!resepToSet[menuId]) resepToSet[menuId] = [];
    resepToSet[menuId].push({ bahanId: String(r.data.bahanId), qty: Number(r.data.qty) });
  }

  // Menu yang punya resep -> modal diabaikan (resep sumber kebenaran).
  const menusWithResep = new Set(Object.keys(resepToSet));
  for (const item of menuToUpsert) {
    if (menusWithResep.has(String(item.id))) delete item.modal;
  }

  return {
    menuToUpsert,
    bahanToUpsert,
    resepToSet,
    newCategories: validatedMenu?.newCategories || [],
    resepSkipped,
    conflictMenuIds: [...conflictMenuIds],
    stats: {
      menuNew: (validatedMenu?.rows || []).filter((r) => r.status === ROW_NEW).length,
      menuConflict: (validatedMenu?.rows || []).filter((r) => r.status === ROW_CONFLICT).length,
      menuError: (validatedMenu?.rows || []).filter((r) => r.status === ROW_ERROR).length,
      menuKept: keptMenu,
      bahanNew: (validatedBahan?.rows || []).filter((r) => r.status === ROW_NEW).length,
      bahanConflict: (validatedBahan?.rows || []).filter((r) => r.status === ROW_CONFLICT).length,
      bahanError: (validatedBahan?.rows || []).filter((r) => r.status === ROW_ERROR).length,
      bahanKept: keptBahan,
      resepOk: (validatedResep?.rows || []).filter((r) => r.status !== ROW_ERROR).length,
      resepError: (validatedResep?.rows || []).filter((r) => r.status === ROW_ERROR).length,
      menusWithResep: menusWithResep.size,
    },
    hasPendingDecisions: pending > 0,
    pendingCount: pending,
  };
}

// Gabungkan resep hasil import ke resep existing. Resep import MENGGANTIKAN
// baris untuk menuId yang sama (perilaku "set"), bukan menambah di atasnya —
// supaya import tidak menghasilkan baris bahan ganda. Menu lain tidak tersentuh.
export function mergeResep(existingResep = {}, resepToSet = {}) {
  const out = { ...(existingResep || {}) };
  for (const [menuId, lines] of Object.entries(resepToSet || {})) {
    out[menuId] = lines.map((l) => ({ bahanId: String(l.bahanId), qty: Number(l.qty) }));
  }
  return out;
}

// Gabungkan bahan hasil import ke daftar existing berdasarkan id.
export function mergeBahan(existingBahan = [], bahanToUpsert = []) {
  const byId = new Map();
  for (const b of Array.isArray(existingBahan) ? existingBahan : []) {
    if (b?.id) byId.set(String(b.id), b);
  }
  for (const b of Array.isArray(bahanToUpsert) ? bahanToUpsert : []) {
    if (b?.id) byId.set(String(b.id), b);
  }
  return [...byId.values()];
}
