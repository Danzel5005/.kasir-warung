# Perubahan Sejak Versi 1.2.0

Dokumen ini merangkum **semua perubahan** yang terjadi pada repo sejak `package.json`
di-bump ke versi `1.2.0`.


- **Baseline (versi 1.2.0):** `359b7ec7` — *ITS 1.2.0 PRE-RELEASE* (21 Sep 2026)
- **HEAD sekarang:** `d7b8b6a0` — *graph for arus kas* (23 Sep 2026)
- **Jumlah commit:** 15 commit
- **Total diff:** 104 file berubah (termasuk node_modules & dokumentasi) —
  **+5.224 / −3.279 baris**

Daftar commit (terbaru → terlama):

```
d7b8b6a0 graph for arus kas
bcc3fef1 HOLY PUSH "CUMA" NAMAIN SAMA KASIH ID BUAT FORM DOANG
0615ee3e minimal changes
74c1f009 excel import tutorial
d9bd7030 new import menu's and hpp from excel feature added
e637f8bf Hpp dan Bahan Baku feature added
2d56f92c BUKU HUTANG DONE
3607834d testcom2
b5192c14 minor change
e537ed8a testcom 1
d9def9c1 auto-update fix
42ee6316 test commit 2
a9155ded test commit
e0ad1609 wrong url problems
0fc8363d hehe i forgor
```

---

## 1. Fitur Baru Utama

### 1.1 Fitur Tingkat Lanjut (Advanced Features) — saklar induk + halaman baru
Seluruh fitur lanjutan sekarang dikendalikan satu **master switch** di Settings
("Nyalakan Fitur Tingkat Lanjut") dan punya **halaman sendiri** (`Fitur Lanjutan`).

- **`src/constants/advancedFeatures.js`** (baru) — definisi grup fitur, default
  flag, `normalizeAdvancedFeatures()`, dan guard `isAdvancedFeatureOn()`.
  Sub-flag: `insights`, `pdfReport`, `cashFlow`, `loyalty`, `bahanBaku`,
  `supplier`, `canViewCost`, `resepHpp`, plus `enabled` sebagai induk.
- **`src/hooks/settings/advancedFeatures.js`** (baru) — handler
  `setAdvancedEnabled()`, `toggleAdvancedFeature()`, `isAdvancedActive()`.
  Mematikan induk **tidak** menghapus sub-flag (hanya menggerbangi).
- **`src/views/ViewFiturLanjutan.jsx`** (baru) — halaman ringkasan status +
  panel data lanjutan. Hanya muncul saat induk aktif **dan** user admin.
- Menu **Fitur Lanjutan** di header (hotkey **F**) hanya tampil bila induk aktif.
- `ModalStack.jsx`, `Header.jsx`, `App.jsx` disesuaikan.
- `src/hooks/useSettings.js`, `src/hooks/settings/index.js` — integrasi.

### 1.2 Resep & HPP Otomatis
- **`src/utilities/resepHpp.js`** (baru) — `hppFromResep()`, `hppForMenus()`,
  `marginFromResep()`, `bahanDeltasFromItems()`. HPP dihitung dari komposisi
  bahan baku × harga satuan, **bukan** input manual.
- Data resep disimpan di `settings.advancedData.resep` (map `menuId -> [{bahanId, qty}]`).

### 1.3 Bahan Baku (Stok Bahan Mentah)
- **`src/utilities/bahanBaku.js`** (baru) — pelacakan stok bahan mentah terpisah
  dari menu jual, termasuk pemakaian bahan dari penjualan (via resep) dan
  pemulihan saat void/hapus/clear transaksi.
- **`src/hooks/useAdvancedData.js`** (baru) — state & CRUD bahan baku, resep,
  supplier, loyalty tier.
- **`src/components/AdvancedDataPanel.jsx`** (baru, ±650 baris) — UI pengelolaan
  bahan baku, supplier, resep/HPP, loyalty tier, dan import Excel.

### 1.4 Database Supplier
- **`src/utilities/supplier.js`** (baru) — relasi supplier ke stock-in & riwayat
  pembelian.

### 1.5 Loyalty Tier
- **`src/utilities/loyalty.js`** (baru) — tingkatan pelanggan (Bronze–Platinum)
  beserta diskon per tier.

### 1.6 Import Menu & HPP dari Excel
- **`src/utilities/excelImport.js`** (baru, ±463 baris) — modul murni parsing &
  validasi 3 sheet: `Menu`, `BahanBaku`, `Resep`. Status per baris:
  `new` / `conflict` / `error`. Aturan: kategori baru **dibuat otomatis**,
  stok menu existing **tidak pernah ditimpa**, sheet Resep menang atas kolom
  `modal`.
- **`src/hooks/useExcelImport.js`** (baru, ±199 baris) — orkestrasi import di UI.
- **`electron/db.cjs`** — handler IPC baru **`menu-bulk-upsert`** + `bulkUpsertMenu()`
  (upsert ratusan baris dalam **satu transaksi** SQLite; ada fallback JSON).
- **`electron/preload.js`** — expose `bulkUpsertMenu(items)`.
- **`package.json`** — tambah dependensi **`xlsx@^0.18.5`**.
- **`updates/EXCEL_TEMPLATE.md`** (baru) + **`updates/PLAN_IMPORT_EXCEL_MENU_HPP.md`** (baru).

### 1.7 Buku Hutang / Settle Transaksi
- IPC baru **`trx-settle`** (`electron/db.cjs`) + `settleTrx(id, actor)` di
  `preload.js`. Menandai transaksi `settled` + `settledAt` + `settledBy`, dengan
  validasi transaksi void.
- `src/utilities/cashflow.js` — pelacakan hutang & laba rugi.

### 1.8 Laporan: Insight Penjualan, Cash Flow Lanjutan, Ekspor PDF
- **`src/utilities/insights.js`** (baru) — analitik turunan: distribusi
  transaksi/pendapatan per jam (jam ramai) & rata-rata per order. Voided
  dikecualikan.
- **`src/utilities/cashflow.js`** (baru) — analitik arus kas lanjutan:
  pemasukan/pengeluaran per sumber, laba rugi, pelacakan hutang, pengelompokan
  per hari (tahan shift lintas-hari).
- **`src/components/CashFlowChart.jsx`** (baru, ±269 baris) — grafik arus kas
  (commit terakhir "graph for arus kas").
- **`src/utilities/reportHtml.js`** (baru) — generate HTML laporan.
- **Ekspor PDF:** IPC baru **`export-report-pdf`** di `electron/printing.cjs`
  (render HTML → `printToPDF` → dialog simpan) + `exportReportPdf(data)` di
  `preload.js`.
- `src/views/ViewLaporan.jsx` — integrasi insight, cash flow, hutang, ekspor PDF.
- `src/views/ViewKelola.jsx` — hook cash flow.

### 1.9 Auto-Update (perbaikan)
- **`electron/update-check.cjs`** — URL manifest diperbaiki dari
  `danzeltampilang/kasir-warung/main` → **`Danzel5005/.kasir-warung/master`**
  (memperbaiki "wrong url problems").
- **`electron/main.cjs`** — hasil `checkForUpdate()` sekarang di-cache & diekspos
  lewat IPC **`update-check`** (bukan lagi push event `update-available` saja),
  sehingga startup tidak pernah gagal.
- **`electron/preload.js`** — tambah `checkUpdate()`.
- **`updates/latest.json`** — versi naik ke `1.2.0`, catatan
  *"full upgrade to v1.2.0-alpha"*, URL repo diperbarui.

---

## 2. Perubahan Backend (Electron)

### `electron/main.cjs`
- Storage file baru: `resep.json`, `bahan-baku.json`, `supplier.json`,
  `loyalty-tiers.json`.
- IPC handler baru: `resep-load/save`, `bahan-baku-load/save`,
  `supplier-load/save`, `loyalty-tiers-load/save`.
- Update-check di-refactor menjadi IPC `update-check`.

### `electron/db.cjs`
- Handler baru: `menu-bulk-upsert`, `trx-settle`.
- `stock-set` kini mengembalikan `{ stock: { id: value } }`.
- `trx-void` kini mengembalikan `items` (untuk pemulihan stok bahan baku).
- `trx-clear` kini mengembalikan `cleared` (untuk memulihkan stok bahan baku,
  karena bahan baku ada di renderer).

### `electron/printing.cjs`
- Handler baru `export-report-pdf`.
- Baca lebar kertas distandarkan (helper `normalizePaperWidthMm` /
  `charsPerLineForWidth`); kembali memakai `printer.execute()`.

### `electron/preload.js`
- Expose API baru: `settleTrx`, `bulkUpsertMenu`, `loadResep`/`saveResep`,
  `loadBahanBaku`/`saveBahanBaku`, `loadSupplier`/`saveSupplier`,
  `loadLoyaltyTiers`/`saveLoyaltyTiers`, `exportReportPdf`, `checkUpdate`.

---

## 3. Perubahan Frontend

- **`src/App.jsx`** — wiring `useAdvancedData`, view `fitur-lanjutan`, hotkey `F`,
  props advanced ke ViewLaporan/ViewKelola/ViewFiturLanjutan.
- **`src/screens/Workspace/Header.jsx`** — nav dinamis + tombol "Fitur Lanjutan"
  (muncul hanya saat induk aktif); `id`/`name` untuk aksesibilitas.
- **`src/screens/Workspace/ModalStack.jsx`** — `id`/`name` pada input modal
  (kas awal, pengeluaran).
- **Hooks:** `useBills.js`, `useCart.js`, `useHistory.js`, `useHistoryVoid.js`,
  `useSettings.js` — menyesuaikan pemulihan stok bahan baku & data lanjutan.
- **`src/utilities/permissions.js`** — penyesuaian akses view.
- `id`/`name` aksesibilitas ditambahkan di berbagai modal
  (ItemModal, CatModal, UserModal, VoidModal, StockInModal, OpnameModal,
  PaymentSettingsTab, PricingSettingsTab, dsb.).
- `src/views/ViewKasir.jsx`, `ViewKelola.jsx`, `ViewRiwayat.jsx` — penyesuaian.

---

## 4. Pengujian (Tests)

Test baru:
- `src/utilities/advancedData.test.js`
- `src/utilities/cashflow.test.js`
- `src/utilities/excelImport.test.js`
- `src/utilities/insights.test.js`
- `src/utilities/reportHtml.test.js`

Test disesuaikan: `electron/db.test.cjs`, `src/utilities/permissions.test.js`,
`src/utilities/ipc-guard.test.js`.

---

## 5. Dokumentasi & Pembersihan

- **Ditambah:** `updates/EXCEL_TEMPLATE.md`, `updates/PLAN_IMPORT_EXCEL_MENU_HPP.md`,
  `updates/PLANNING.md` (diperbarui).
- **Dihapus:** banyak dokumen perencanaan lama (`updates/120826.md`,
  `180926Update.md`, `2.4-KASIR-UPDATE-IMPLEMENTATION.md`, `BUGTEST1.md`,
  `BottleneckCheck.md`, `DESIGN_SYSTEM.md`, `DRINKS-FEATURE.md`, `FutureUpdates.md`,
  `GAPCLOSING.md`, `GalihFeatureFinalization*.md`, `ImplementasiBottleneckFix1.md`,
  `Preview_Kasir_Galih.html`, `RECEIPTFORMAT.md`, `RENCANA-PECAH-APP-JSX.md`,
  `RENCANA-PECAH-SETTINGS.md`, `RESISTRUCTUREUPDATE.md`, `TODO.md`,
  `Update18826.md`) — sebagian dipindahkan ke memory repo.
- **Dihapus:** script stress-test lama (`stress-test-console.js`,
  `stress-test-node.cjs`, `stress-test.js`), `test-printer.js`,
  `TestResi40.pdf`.

---

## Ringkasan Singkat

Sejak versi di-bump ke **1.2.0** (`359b7ec7`), repo berkembang dari sekadar
"pre-release" menjadi kumpulan fitur besar:

1. **Fitur Tingkat Lanjut** dengan saklar induk + halaman & hook sendiri.
2. **Resep & HPP Otomatis**, **Bahan Baku**, **Supplier**, **Loyalty Tier**.
3. **Import Menu & HPP dari Excel** (dependensi `xlsx`, bulk-upsert SQLite).
4. **Buku Hutang / Settle** transaksi.
5. **Laporan lanjutan**: Insight Penjualan, Cash Flow + grafik, Ekspor PDF.
6. **Perbaikan auto-update** (URL repo benar + IPC `update-check`).
7. Backend: 8 file storage baru, banyak IPC handler baru, preload diperluas.
8. Banyak test baru + pembersihan dokumentasi & script lama.
