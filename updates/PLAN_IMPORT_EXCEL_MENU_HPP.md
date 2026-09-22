# Rencana Implementasi — Import Data dari Excel (Menu & HPP)

Status: **Rencana, belum ada kode ditulis.** Disusun dari inspeksi langsung repo
`https://github.com/Danzel5005/.kasir-warung` (branch master, commit saat plan ini dibuat).
Dokumen ini jadi acuan sebelum eksekusi via Engineer Agent.

Keputusan yang sudah dikonfirmasi:
- Import HPP mendukung **dua-duanya**: kolom `modal` langsung per menu, dan bahan baku + resep (HPP otomatis).
- Konflik `menuId`/bahan yang sudah ada di database → **konfirmasi per baris** di layar preview, bukan overwrite/skip blanket.
- Titik masuk UI: `AdvancedDataPanel.jsx`.

---

## 1. Ruang Lingkup

Import satu file `.xlsx` berisi hingga 3 sheet:

1. **Menu** — data menu jual (nama, harga, kategori, modal, stok, satuan).
2. **BahanBaku** — master bahan mentah (nama, satuan, harga satuan, stok, min stok).
3. **Resep** — relasi menu ↔ bahan baku (baris per pasangan, banyak-ke-banyak).

Sheet **Menu** wajib ada. Sheet **BahanBaku** dan **Resep** opsional — kalau user cuma
mau import menu + modal manual, tidak perlu isi dua sheet itu.

Di luar scope: import gambar/foto menu, import supplier, import loyalty tier, import
transaksi/riwayat.

---

## 2. Template Excel

### Sheet `Menu` (wajib)

| Kolom (header persis) | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `menuId` | teks | tidak | Kode unik menu. Kosong = dianggap item baru, ID digenerate otomatis (`c_<timestamp>`, pola sama seperti `useMenu.js:117`). Diisi = dipakai untuk deteksi konflik dengan menu existing. |
| `nama` | teks | **ya** | Nama menu. Baris tanpa nama → error, tidak diproses. |
| `kategori` | teks | **ya** | Harus match `key` atau `label` kategori yang sudah ada (case-insensitive). Kategori yang tidak dikenal → error baris (lihat §5), **tidak** auto-create kategori baru. |
| `harga` | angka | **ya** | Harga jual. `<= 0` → error baris (aturan sama seperti `useMenu.js:73`). |
| `modal` | angka | tidak | HPP manual langsung. Kosongkan kalau menu ini pakai resep (lihat §4.3 soal field mana yang menang). |
| `stok` | angka | tidak | Kosong = stok tak terbatas (`null`), sama seperti form existing. Untuk menu yang **sudah ada**, kolom ini tidak pernah dipakai untuk overwrite otomatis — stok cuma boleh berubah lewat konfirmasi eksplisit per baris (lihat §5.2), meniru aturan `upsertMenuRow` yang sengaja tidak menimpa stok saat upsert biasa. |
| `satuan` | teks | tidak | Label satuan dasar (mis. "pcs", "gelas"). |

### Sheet `BahanBaku` (opsional)

| Kolom | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `namaBahan` | teks | **ya** | Kunci pencocokan bahan existing (case-insensitive, trim) — bahan baku tidak punya kode bisnis seperti `menuId`, jadi nama adalah satu-satunya kunci alami. |
| `satuan` | teks | tidak | Mis. "gram", "ml", "pcs". |
| `hargaSatuan` | angka | **ya** | Harga per satuan, dipakai untuk hitung HPP resep. |
| `stok` | angka | tidak | Default 0 kalau kosong. |
| `minStok` | angka | tidak | Ambang stok menipis. Default 0. |

### Sheet `Resep` (opsional, butuh sheet `BahanBaku` dan/atau bahan existing)

| Kolom | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `menuId` atau `namaMenu` | teks | **ya** (salah satu) | Cocokkan ke menu di sheet `Menu` (baris baru) atau menu existing di database. Kalau pakai `namaMenu`, cocokkan case-insensitive ke `nama`. |
| `namaBahan` | teks | **ya** | Cocokkan ke sheet `BahanBaku` (baris baru) atau bahan existing. |
| `qty` | angka | **ya** | Jumlah bahan per satu unit menu. `<= 0` → baris resep itu diabaikan (aturan sama seperti `hppFromResep` di `resepHpp.js:14`). |

Satu `menuId`/`namaMenu` boleh muncul di banyak baris (satu baris = satu bahan dalam
resepnya) — ini yang bikin resep beda dari 2 sheet lain yang satu baris = satu entitas.

**Contoh isi sheet `Resep`:**

```
menuId     | namaBahan      | qty
kopi_susu  | Kopi Bubuk     | 15
kopi_susu  | Susu           | 100
kopi_susu  | Gula           | 10
```

---

## 3. Titik Masuk UI — `AdvancedDataPanel.jsx`

Tambah panel baru **`ImportExcelPanel`**, ditaruh **paling atas** di `AdvancedDataPanel`
(sebelum `ResepPanel`), karena ini aksi, bukan data domain — user harus lihat tombol
import dulu sebelum scroll ke data yang sudah ada.

Perubahan di `src/components/AdvancedDataPanel.jsx`:

- Tambah fungsi komponen baru `ImportExcelPanel({ menu, advancedData, toast_ })` — pola sama
  seperti `BahanBakuPanel`/`ResepPanel` yang sudah ada (§ sekitar baris 86 & 322).
- Di `AdvancedDataPanel` (baris 435–454): render `<ImportExcelPanel ... />` di dalam
  wrapper `<div style={{ padding: "10px 16px 0", flexShrink: 0 }}>` (baris 445), sebelum
  `{showResep && <ResepPanel .../>}` (baris 446).
- **Tidak digerbang oleh `isAdvancedFeatureOn`** — import adalah aksi satu kali, bukan
  toggle fitur berjalan terus. Selalu tampil selama panel `AdvancedDataPanel` aktif
  (`anyOn` di baris 441 sudah butuh minimal satu advanced feature nyala; kalau mau import
  bisa dipakai walau semua flag mati, itu keputusan terpisah yang perlu didiskusikan —
  lihat §8).

UI panel: tombol "Import dari Excel" → buka `<input type="file" accept=".xlsx">` tersembunyi
(pola sama seperti `Header.jsx:15`) → begitu file dipilih, langsung masuk ke alur parse →
validasi → preview (bukan modal terpisah dulu, tapi state di dalam panel yang sama, supaya
tidak nambah 1 lapis modal-di-dalam-modal).

---

## 4. Arsitektur & Alur Data

### 4.1 File baru: `src/utilities/excelImport.js`

Modul murni (tanpa React, tanpa IPC) — pola sama seperti `resepHpp.js`/`bahanBaku.js`,
supaya gampang ditest terpisah dari UI. Isinya:

- `parseImportWorkbook(fileArrayBuffer)` — pakai `XLSX.read`, kembalikan `{ menuRows, bahanRows, resepRows }` mentah (belum divalidasi).
- `validateMenuRows(rows, existingMenu, existingCats)` — per baris: cek nama/harga/kategori, tandai `status: "new" | "conflict" | "error"`, kalau conflict sertakan objek existing untuk dibandingkan di preview.
- `validateBahanRows(rows, existingBahan)` — sama, kunci pencocokan `nama` (case-insensitive).
- `validateResepRows(rows, resolvedMenuIds, resolvedBahanIds)` — resolve `namaMenu`/`namaBahan` ke id (dari baris baru di sheet yang sama ATAU dari existing), tandai baris yang bahan/menu-nya tidak ketemu di mana pun sebagai error.
- `buildImportPlan(validatedMenu, validatedBahan, validatedResep, decisions)` — `decisions` = pilihan user per baris konflik (`"keep" | "overwrite"`), hasil akhirnya 3 array siap-commit: `menuToUpsert`, `bahanToUpsert`, `resepToSet`.

### 4.2 Hook baru: `useExcelImport` (bisa jadi bagian dari `AdvancedDataPanel.jsx` sendiri
kalau state-nya kecil, atau file hook terpisah `src/hooks/useExcelImport.js` kalau makin
kompleks — putuskan saat implementasi berdasar jumlah baris state yang dibutuhkan)

State: `parsedRows`, `validationResult`, `rowDecisions` (map baris konflik → keputusan),
`step` (`"idle" | "preview" | "committing" | "done"`).

Commit dipanggil hanya kalau **semua** baris konflik sudah punya keputusan (tombol
"Terapkan" disabled sampai itu terpenuhi) — sesuai keputusan "konfirmasi per baris".

### 4.3 Field yang menang: `modal` manual vs resep

Karena kamu pilih dua-duanya didukung, aturan yang dipakai (ikuti perilaku
`resepHpp.js` yang sudah ada, jangan bikin sumber kebenaran baru):

- Kalau sebuah `menuId` **punya baris di sheet Resep** → HPP-nya dihitung otomatis dari
  resep (`hppFromResep`), kolom `modal` di sheet Menu untuk baris itu **diabaikan** saat
  commit (resep adalah sumber kebenaran begitu ada, sama seperti UI existing di
  `ResepPanel.jsx` yang selalu tampilkan HPP hasil hitung, bukan field manual).
- Kalau `menuId` **tidak** punya baris resep → `modal` dari sheet Menu dipakai apa adanya,
  masuk ke field `modal` di `products.data` lewat `menu-upsert` seperti biasa.
- Ini harus ditampilkan jelas di layar preview (§5) supaya user tidak bingung kenapa
  kolom `modal` yang diisi di Excel "hilang" untuk menu yang juga punya resep.

### 4.4 Commit ke storage — **butuh IPC handler baru, jangan reuse loop `menu-upsert` satu-satu**

Alasan (Engineer Agent, peringatan skalabilitas dari plan sebelumnya): ratusan baris lewat
`menu-upsert` satu-satu = ratusan transaksi SQLite terpisah, tidak atomic, dan lambat.

Tambah:

- **`electron/db.cjs`**: fungsi baru `bulkUpsertMenu(items)` — mirror pola `replaceMenuList`
  (baris ~121) tapi **upsert**, bukan delete-all-lalu-insert:
  ```js
  function bulkUpsertMenu(items) {
    const run = db.transaction((rows) => {
      for (const item of rows) upsertMenuRow(item); // reuse fungsi existing baris 94
    });
    run(items);
  }
  ```
  Ditambah handler IPC baru `ipcMain.handle("menu-bulk-upsert", ...)` di dekat handler
  `menu-replace` (baris ~256), return `{ ok, menu: loadMenuList() }` sama seperti pola lain.
- **`electron/preload.js`**: expose `bulkUpsertMenu: (items) => ipcRenderer.invoke("menu-bulk-upsert", items)` di dekat baris 25/27.
- Bahan baku & resep **tidak** butuh handler IPC baru — keduanya sudah disimpan sebagai satu
  blob JSON lewat `api.saveBahanBaku`/`api.saveResep` (`useAdvancedData.js` baris ~46 & ~37),
  jadi commit-nya tinggal `setBahanBaku`/`setResep` dengan array/map gabungan (existing +
  hasil import), sudah otomatis 1 write.

---

## 5. Layar Preview & Aturan Konflik

Sebelum tombol "Terapkan" aktif, tampilkan tabel ringkas per sheet:

- **Baru**: baris yang `menuId`/nama-nya belum ada di database → langsung siap commit, tidak butuh keputusan.
- **Konflik**: `menuId` (untuk Menu/Resep) atau `nama` (untuk BahanBaku) sudah match ke data existing → **setiap baris ini butuh pilihan eksplisit**: "Pakai data lama" atau "Timpa dengan data Excel". Tombol "Terapkan" tetap disabled sampai semua baris konflik punya pilihan (bukan default tersirat).
- **Error**: nama kosong / harga ≤ 0 / kategori tak dikenal / bahan-di-resep tak ketemu → baris ini **tidak pernah ikut commit**, ditampilkan sebagai daftar terpisah dengan alasan errornya, tapi tidak menghalangi baris lain yang valid untuk diproses.

### 5.2 Field-level, bukan cuma row-level, untuk kasus stok

Karena `stok` sengaja tidak ditimpa otomatis oleh `upsertMenuRow` (baris 94–108 di
`db.cjs`), perilaku ini **wajib dipertahankan** walau user pilih "Timpa dengan data Excel"
untuk baris menu itu: field lain (`harga`, `modal`, `kategori`, dst.) ikut tertimpa, tapi
`stok` tetap lewat jalur `api.stockSet`/`api.adjustStock` terpisah kalau memang mau diubah
(mirror logika `saveItem` di `useMenu.js` baris 124–135) — bukan langsung overwrite lewat
`data` JSON. Ini penting supaya import tidak diam-diam merusak stok yang sedang jalan.

---

## 6. Perubahan File — Checklist

| File | Perubahan |
|---|---|
| `package.json` | Tambah dependency `xlsx` (SheetJS) |
| `src/utilities/excelImport.js` | **Baru.** Parsing + validasi + build plan (murni, testable) |
| `src/hooks/useExcelImport.js` | **Baru** (atau state lokal di panel, putuskan saat coding) — orkestrasi parse→preview→commit |
| `src/components/AdvancedDataPanel.jsx` | Tambah komponen `ImportExcelPanel`, render di root panel sebelum `ResepPanel` |
| `electron/db.cjs` | Tambah `bulkUpsertMenu()` + handler IPC `menu-bulk-upsert` (transaksi tunggal) |
| `electron/preload.js` | Expose `api.bulkUpsertMenu` |
| `src/hooks/useAdvancedData.js` | Tidak perlu fungsi baru — `saveBahanBaku`/`saveResep` yang ada sudah cukup, dipanggil dengan array/map gabungan dari hasil import |

---

## 7. Blast Radius & Risiko

- **`upsertMenuRow` (db.cjs:94)** — dipanggil ulang di dalam transaksi baru `bulkUpsertMenu`, tidak diubah sendiri. Perilaku "tidak menimpa stok" di fungsi ini otomatis ikut berlaku untuk semua baris import — bagus, tapi berarti kalau user memang mau import stok awal untuk menu **baru**, itu tetap jalan (fungsi ini cuma proteksi untuk menu yang **sudah ada**, insert baru tetap set stok apa adanya).
- **`resepHpp.js` `hppFromResep`** — tidak diubah. Resep hasil import langsung kebaca oleh `ResepPanel` yang sudah ada begitu `saveResep` commit, tidak perlu sentuh file ini.
- **Kategori tak dikenal** — sengaja **tidak** auto-create untuk menghindari typo Excel ("Minuman" vs "minuman ") diam-diam bikin kategori duplikat. Kalau nanti user memang mau auto-create, itu perubahan kebijakan terpisah, bukan bagian plan ini.
- **`priceTiers`/`units`** — sheet Menu di plan ini **tidak** mencakup kolom itu (di luar scope "Menu & HPP" yang diminta). Baris yang "Timpa dengan data Excel" harus tetap **mempertahankan** `priceTiers`/`units` lama lewat spread, bukan menghapusnya — sama seperti catatan §4.3 soal `modal` vs resep, field yang tidak ada di template Excel tidak boleh ikut ke-null-kan.

---

## 8. Yang Masih Perlu Diputuskan Sebelum Coding

1. Import boleh dipakai walau semua advanced feature flag mati (`enabled: false` di `advancedFeatures.js`)? Kalau ya, `ImportExcelPanel` harus render di luar guard `anyOn` (baris 442) — butuh sedikit restrukturisasi kondisi render `AdvancedDataPanel`.
2. Kategori tak dikenal di Excel: tetap block sebagai error (default plan ini), atau kasih opsi "buat kategori baru" di layar preview?
3. `useExcelImport` sebagai hook terpisah atau state lokal di `AdvancedDataPanel.jsx` — tergantung seberapa besar state preview-nya nanti pas ditulis.
