# Tutorial: Menambahkan Menu di Kasir Warung

Dokumen ini menjelaskan cara menambahkan **menu (item jualan)** di aplikasi Kasir Warung.

Isi dokumen dibagi menjadi dua bagian supaya bisa dibaca oleh dua audiens berbeda:

- **Bagian A — Untuk Pengguna (awam).** Langkah-langkah klik-klik di aplikasi. Tidak perlu paham kode.
- **Bagian B — Untuk Developer.** Cara kerja data, alur kode, skema database, IPC, dan cara berkontribusi.

> Konvensi: semua nama tombol dan label di dokumen ini ditulis sama persis dengan yang tampil di aplikasi.

---

## Daftar isi

- [Bagian A — Untuk Pengguna (awam)](#bagian-a--untuk-pengguna-awam)
  - [A.1 Apa itu "menu" di aplikasi ini](#a1-apa-itu-menu-di-aplikasi-ini)
  - [A.2 Menambah 1 menu sederhana (paling cepat)](#a2-menambah-1-menu-sederhana-paling-cepat)
  - [A.3 Arti setiap isian di form Tambah Menu](#a3-arti-setiap-isian-di-form-tambah-menu)
  - [A.4 Mengelompokkan menu dengan Kategori](#a4-mengelompokkan-menu-dengan-kategori)
  - [A.5 Memberi tag **Drinks** (pilihan cup, gula, es/hot)](#a5-memberi-tag-drinks-pilihan-cup-gula-eshot)
  - [A.6 Satuan tambahan (dus, pack, lusin)](#a6-satuan-tambahan-dus-pack-lusin)
  - [A.7 Tier harga (harga grosir / harga borongan)](#a7-tier-harga-harga-grosir--harga-borongan)
  - [A.8 Mengubah dan menghapus menu](#a8-mengubah-dan-menghapus-menu)
  - [A.9 Stok, stok masuk, dan opname](#a9-stok-stok-masuk-dan-opname)
  - [A.10 Tips dan kesalahan umum](#a10-tips-dan-kesalahan-umum)
- [Bagian B — Untuk Developer](#bagian-b--untuk-developer)
  - [B.1 Peta file yang terlibat](#b1-peta-file-yang-terlibat)
  - [B.2 Bentuk data menu (skema)](#b2-bentuk-data-menu-skema)
  - [B.3 Alur lengkap: dari klik "Tambah Menu" sampai tersimpan](#b3-alur-lengkap-dari-klik-tambah-menu-sampai-tersimpan)
  - [B.4 Lapisan IPC dan fallback browser](#b4-lapisan-ipc-dan-fallback-browser)
  - [B.5 Aturan stok: upsert tidak menimpa stok](#b5-aturan-stok-upsert-tidak-menimpa-stok)
  - [B.6 Multi-satuan dan tier: modul `units.js`](#b6-multi-satuan-dan-tier-modul-unitsjs)
  - [B.7 Database: tabel `products`](#b7-database-tabel-products)
  - [B.8 Cara menambah field baru ke menu](#b8-cara-menambah-field-baru-ke-menu)
  - [B.9 Cara menambah menu lewat kode (seed / impor massal)](#b9-cara-menambah-menu-lewat-kode-seed--impor-massal)
  - [B.10 Testing dan checklist kontribusi](#b10-testing-dan-checklist-kontribusi)

---

# Bagian A — Untuk Pengguna (awam)

## A.1 Apa itu "menu" di aplikasi ini

"Menu" adalah daftar barang atau jasa yang bisa Anda jual. Setiap menu memiliki:

- **Nama** — yang muncul di layar kasir dan di struk.
- **Harga jual** — harga yang dibayar pelanggan.
- **Harga modal** (opsional) — harga beli/patokan Anda, dipakai untuk menghitung laba.
- **Stok** (opsional) — jumlah barang yang tersisa. Boleh dikosongkan bila jumlahnya tak terbatas (misalnya jasa atau makanan yang selalu bisa dibuat).
- **Kategori** — pengelompokan, misalnya "Kopi", "Makanan", "Rokok".

Menu disimpan di perangkat Anda sendiri (lokal). Tidak perlu internet.

## A.2 Menambah 1 menu sederhana (paling cepat)

1. Buka tab **Kelola** (menu "Kelola Menu & Kategori").
2. Klik tombol **+ Tambah Menu** di kanan atas.
3. Isi:
   - **Nama Menu \*** → misalnya `Kopi Susu Gula Aren`
   - **Harga Jual (Rp) \*** → misalnya `18000`
   - **Harga Modal (Rp)** → misalnya `8000` (boleh dikosongkan)
   - **Stok** → misalnya `20` (kosongkan bila tidak dibatasi)
4. Pilih **KATEGORI** dengan mengklik salah satu tombol, misalnya `Kopi`.
5. Klik tombol **Tambahkan ke Menu** di bagian bawah.

Selesai. Menu langsung muncul di daftar Kelola dan bisa dipilih di layar kasir.

> Tombol bertanda **\*** wajib diisi. Nama tidak boleh kosong, dan harga jual harus lebih besar dari 0.

## A.3 Arti setiap isian di form Tambah Menu

| Isian | Wajib? | Arti |
| --- | --- | --- |
| **Menu ID** | Tidak | Kode unik opsional untuk menu, mis. `M-1001`. Berguna bila Anda memakai barcode atau ingin mencocokkan dengan daftar harga lain. Tidak boleh sama dengan menu lain. |
| **Nama Menu \*** | Ya | Nama yang tampil di kasir dan dicetak di struk. |
| **Harga Jual (Rp) \*** | Ya | Harga normal yang dibayar pelanggan per 1 satuan dasar. |
| **Harga Modal (Rp)** | Tidak | Harga beli Anda. Dipakai untuk laporan laba/rugi. Bila kosong dianggap 0. |
| **Deskripsi** | Tidak | Teks bebas, misalnya `Bestseller`. Tidak mempengaruhi harga. |
| **Stok** | Tidak | Jumlah tersisa. **Kosong = tidak terbatas.** Angka `0` berarti habis. |
| **KATEGORI** | Ya (ada default) | Kelompok menu. Lihat [A.4](#a4-mengelompokkan-menu-dengan-kategori). |
| **SATUAN DASAR** | Tidak | Nama satuan terkecil, mis. `pcs` atau `botol`. Hanya label; berguna sebagai penjelasan bila Anda memakai satuan tambahan. |
| **SATUAN TAMBAHAN** | Tidak | Satuan besar, mis. `dus` berisi 24 pcs. Lihat [A.6](#a6-satuan-tambahan-dus-pack-lusin). |
| **TIER HARGA** | Tidak | Harga khusus bila membeli banyak. Lihat [A.7](#a7-tier-harga-harga-grosir--harga-borongan). |

Di bagian bawah form, aplikasi menampilkan ringkasan **Jual / Modal / Est. laba per item** agar Anda bisa langsung memeriksa bahwa angkanya benar sebelum menyimpan.

## A.4 Mengelompokkan menu dengan Kategori

Kategori membuat daftar menu di kasir terbagi menjadi beberapa kelompok, sehingga kasir lebih cepat mencari.

**Melihat kategori:** di layar kasir, kategori muncul sebagai deretan tombol penyaring (`Semua Menu`, lalu kategori-kategori Anda).

**Menambah kategori baru:**

1. Di tab **Kelola**, klik **Kelola Kategori**.
2. Di bagian bawah modal, isi **Nama kategori baru**, mis. `Snack`.
3. Klik **+ Tambah** (atau tekan Enter).
4. Tutup modal.

**Mengubah nama kategori:** klik nama kategori di modal **Kelola Kategori**, ubah teksnya, lalu simpan.

**Menghapus kategori:** klik tombol **Hapus** di samping kategori. Kategori **tidak bisa dihapus selama masih dipakai** oleh menu. Pindahkan dulu semua menu di dalamnya ke kategori lain.

## A.5 Memberi tag **Drinks** (pilihan cup, gula, es/hot)

Bila sebuah kategori diberi tag **Drinks**, maka setiap menu di kategori itu akan **menanyakan pilihan tambahan** saat dimasukkan ke keranjang:

- **Cup Size**: Small / Medium / Large
- **Sugar**: Less / Normal / More
- **Temperature**: Ice (Less / Normal / More) atau Hot

Pilihan ini **tidak menambah harga**, tetapi membuat baris keranjang terpisah (Kopi Ice dan Kopi Hot dianggap dua baris berbeda) dan tercetak di struk.

**Cara memasang:**

1. Tab **Kelola** → **Kelola Kategori**.
2. Cari kategori yang diinginkan (mis. `Kopi`), klik tombol **Add tag**.
3. Pilih **Drinks (Cupsize, Sugar, Ice/Hot)**.
4. Badge `🥤 Drinks` akan muncul di samping nama kategori.

Untuk menghapus tag: klik tanda silang kecil pada badge tersebut.

> Cocok dipakai untuk kategori minuman. Untuk makanan/rokok, biarkan tanpa tag.

## A.6 Satuan tambahan (dus, pack, lusin)

Fitur ini berguna bila Anda menjual barang yang sama dalam dua ukuran, misalnya per **pcs** dan per **dus**.

Contoh: Anda menjual **Air Mineral** per botol (Rp 4.000) dan per dus isi 24 botol (Rp 90.000).

Isi bagian **SATUAN DASAR** dan **SATUAN TAMBAHAN**:

1. **SATUAN DASAR** → `botol`
2. Klik **+ Satuan**, lalu isi satu baris:
   - **kode** → `dus` (kode singkat; huruf kecil, tanpa spasi)
   - **label** → `Dus` (nama yang tampil di keranjang dan struk)
   - **faktor** → `24` (jumlah botol dalam 1 dus; **minimal 2**)
   - **harga** → `90000` (harga per 1 dus; boleh berbeda dari 24 × harga botol)

Setelah disimpan, di baris keranjang muncul tombol kecil **botol / Dus**. Kasir tinggal mengklik satuan yang dipakai.

**Yang perlu dipahami:**

- Stok tetap dihitung dalam **satuan dasar**. 1 dus akan **memotong stok sebanyak 24**.
- Kasir boleh mengetik jumlah dalam satuan apa pun; aplikasi otomatis mengubahnya.
- Bila satuan di tengah transaksi diganti (mis. dari botol ke dus), isi keranjang otomatis dibulatkan ke atas ke kelipatan dus.

**Aturan validasi:**

- **faktor minimal 2.** Faktor 1 tidak berguna karena sama dengan satuan dasar.
- **kode satuan tidak boleh sama** dengan kode satuan lain pada menu yang sama.

## A.7 Tier harga (harga grosir / harga borongan)

Tier harga memberi harga satuan yang lebih murah bila pelanggan membeli dalam jumlah banyak — tanpa perlu membuat menu terpisah.

Contoh untuk **Kopi Susu Gula Aren** (harga normal Rp 18.000):

| min. qty | harga/pcs |
| --- | --- |
| 12 | 17.000 |
| 48 | 15.000 |

Cara mengisi:

1. Klik **+ Tier**.
2. Isi **min. qty** → `12` dan **harga/pcs** → `17000`.
3. Klik **+ Tier** lagi, isi `48` dan `15000`.
4. Simpan.

**Cara tier bekerja:**

- Tier dihitung dari **total qty dalam satu baris keranjang, dalam satuan dasar**.
- Bila qty belum mencapai tier pertama, harga kembali ke harga jual normal.
- Bila melewati beberapa tier, yang dipakai adalah tier **dengan min. qty terbesar yang masih terpenuhi**.
- Bila pelanggan membeli dalam satuan tambahan (mis. dus), tier **tidak berlaku**; yang dipakai adalah harga satuan tambahan.
- **min. qty harus berbeda** antara tier yang satu dan yang lain.

**Peringatan yang mungkin muncul:** bila harga tier Anda **sama atau lebih mahal** dari harga jual normal, aplikasi menampilkan peringatan. Tier tersebut tidak berguna dan sebaiknya diperbaiki.

## A.8 Mengubah dan menghapus menu

**Mengubah:** di tab **Kelola**, temukan menunya, klik tombol **Edit**, ubah isian, lalu klik **Simpan Perubahan**.

**Menghapus:** klik tombol hapus pada baris menu. Setelah konfirmasi, menu dihapus dan Anda punya waktu sekitar **9 detik** untuk membatalkan lewat tombol **Undo** pada notifikasi.

**Menghapus semua menu:** tombol **Hapus Semua Menu** di kanan atas. Juga bisa dibatalkan dalam 9 detik.

> Menghapus menu **tidak menghapus riwayat transaksi lama**. Struk dan laporan lama tetap menyimpan nama menu yang sudah terjual, agar pembukuan lama tidak rusak.

## A.9 Stok, stok masuk, dan opname

- **Stok menipis** — panel peringatan di atas daftar Kelola Menu memisahkan barang **habis** dan barang **menipis**. Ambang batasnya diatur di **Settings → Harga** (default 5, rentang 1–999).
- **Stok tak terbatas** — menu yang stoknya dikosongkan (`null`) tidak pernah muncul di peringatan.
- **Stok Masuk (restock)** — tombol pada panel peringatan stok. Isi jumlah masuk, dan **harga modal terbaru** bila harga beli berubah. Harga modal default mengikuti **harga beli terakhir**, bukan rata-rata.
- **Opname** — menyesuaikan stok dengan hasil hitung fisik. Selisihnya dicatat sebagai mutasi `opname`, sehingga jejak perubahan stok tetap terlihat.
- **Riwayat mutasi stok** — setiap perubahan stok tercatat: penjualan, stok masuk, opname, penyesuaian, dan pembatalan.

## A.10 Tips dan kesalahan umum

| Gejala | Kemungkinan penyebab & solusi |
| --- | --- |
| Menu tidak muncul di kasir | Menu ada di kategori yang sedang tidak dipilih. Klik **Semua Menu**. |
| Kategori tidak bisa dihapus | Masih ada menu memakai kategori itu. Pindahkan menunya dulu. |
| Faktor satuan ditolak | Faktor harus angka **≥ 2**. |
| "Kode satuan duplikat" | Ada dua satuan dengan kode sama pada menu yang sama. Ganti salah satunya. |
| "minQty tier harus unik" | Ada dua tier dengan min. qty sama. Ubah salah satunya. |
| Peringatan harga tier | Harga tier ≥ harga normal, jadi tier tidak akan pernah dipakai. Perbaiki harganya. |
| "Menu ID sudah dipakai" | Menu ID harus unik di seluruh menu. Ganti kodenya. |
| Stok tidak berubah padahal menu diedit | Perilaku sengaja: menyunting menu **tidak** menimpa stok. Ubah stok lewat **Stok Masuk** atau **Opname**. |

---

# Bagian B — Untuk Developer

## B.1 Peta file yang terlibat

| Lapisan | File | Tanggung jawab |
| --- | --- | --- |
| Form & state menu | `src/hooks/useMenu.js` | State form, validasi, CRUD menu & kategori, pemanggilan API. |
| Form UI | `src/components/modals/ItemModal.jsx` | Form tambah/edit menu termasuk editor satuan & tier. |
| Modal kategori | `src/components/modals/CatModal.jsx` | CRUD kategori dan tag (mis. `drinks`). |
| Modal satuan minuman | `src/components/modals/AdditionalsModal.jsx` | Pilihan cup/sugar/ice untuk kategori bertag `drinks`. |
| Halaman | `src/views/ViewKelola.jsx` | Daftar menu per kategori, panel stok, tombol aksi. |
| Stok masuk | `src/components/modals/StockInModal.jsx` | Restock + pembaruan harga modal terakhir. |
| Logika satuan/tier | `src/utilities/units.js` | Modul murni: `baseUnit`, `findUnit`, `unitOptions`, `stockQty`, `tierPrice`, `resolveLine`, `cartKeyFor`. |
| Jembatan API | `src/utilities/utils.js` | Objek `api` dengan fallback `localStorage` untuk mode browser. |
| Jembatan IPC | `electron/preload.js` | `contextBridge` mengekspos `window.kasirAPI`. |
| Handler IPC | `electron/db.cjs` | `registerHandlers()`, statement SQL, migrasi. |
| Skema DB | `electron/db.cjs` | Tabel `products`, `stock_movements`, `transactions`, `shifts`. |
| Seed | `src/constants/menu.js`, `src/constants/categories.js` | Data awal (saat ini kosong). |
| Test | `src/utilities/units.test.js`, `electron/db.test.cjs` | Unit test logika satuan/tier dan DB. |

## B.2 Bentuk data menu (skema)

Sejak **Langkah 2**, menu disimpan di tabel SQLite `products`. Kolom yang di-query (untuk filter/indeks) dipisah, dan **seluruh objek menu disimpan sebagai JSON** pada kolom `data`:

```jsonc
{
  "id": "c_1726800000000",       // ID internal, dibuat renderer: `c_` + Date.now()
  "menuId": "M-1001",            // opsional, unik (COLLATE NOCASE)
  "nama": "Kopi Susu Gula Aren",
  "harga": 18000,                // harga per SATUAN DASAR, integer rupiah
  "modal": 8000,                 // harga beli terakhir (bukan rata-rata)
  "kategori": "cat_1726...",     // key kategori
  "desc": "Bestseller",
  "stok": 20,                    // null = tak terbatas; angka 0 = habis
  "satuan": "pcs",               // label satuan dasar (informatif)
  "units": [                     // satuan tambahan, opsional
    { "key": "dus", "label": "Dus", "factor": 24, "harga": 90000, "modal": 66000 }
  ],
  "priceTiers": [                // tier harga, minQty dalam SATUAN DASAR
    { "minQty": 12, "harga": 17000 },
    { "minQty": 48, "harga": 15000 }
  ]
}
```

Catatan penting:

- `id` adalah kunci utama internal. Jangan mengubahnya setelah dibuat.
- `menuId` **berbeda** dari `id`. `menuId` adalah kode bisnis opsional dan unik.
- `harga` dan `modal` selalu **per satuan dasar**, dalam rupiah bulat (integer).
- `stok` hidup di kolom terpisah, **bukan** di dalam `data` (lihat B.5).

## B.3 Alur lengkap: dari klik "Tambah Menu" sampai tersimpan

```
ViewKelola "+ Tambah Menu"
   └─> menuH.openAdd()                       // useMenu.js
         setForm({ ...default, units:[], priceTiers:[] })
         setItemModal(true)

ItemModal  ── ubah isian ──> menuH.setForm(prev => ({ ...prev, [field]: value }))
   │                          (harga & modal: v.replace(/\D/g,""), hanya digit)
   │
   └─> klik "Tambahkan ke Menu"
         └─> menuH.saveItem()                // useMenu.js, async
               1. trim & validasi nama/harga/menuId
               2. normalisasi + validasi `units` dan `priceTiers`
               3. bangun `record`
               4. await api.upsertMenu(record)
               5. patch stok (khusus mode edit; lihat B.5)
               6. setMenu(next); setItemModal(false); toast_("...", "ok")
```

Poin yang sering jadi bug:

- `saveItem` di-`useCallback` dan **membaca `form`, `editTarget`, `menu` dari closure**, jadi deps-nya `[form, editTarget, menu, toast_]`. Bila deps dikurangi, `saveItem` akan memakai data form yang basi.
- **Hook tidak boleh saling mengimpor.** `useMenu` menerima `toast_` dan `addUndo` sebagai parameter dari `App.jsx`, bukan `import` dari `useToast`.
- Validasi yang **memblokir** memakai `return` setelah toast; validasi yang hanya **memperingatkan** (harga tier) tetap melanjutkan penyimpanan.

## B.4 Lapisan IPC dan fallback browser

Semua panggilan menu melewati satu objek `api` di `src/utilities/utils.js`:

```js
async upsertMenu(item) {
  if (window.kasirAPI?.upsertMenu) return window.kasirAPI.upsertMenu(item);
  // fallback mode browser (tanpa Electron)
  const list = LS("ykk_menu") || [];
  const idx = list.findIndex((m) => String(m.id) === String(item?.id));
  if (idx >= 0) list[idx] = { ...item, stok: list[idx].stok }; else list.push(item);
  LS("ykk_menu", list);
  return { ok: true };
}
```

Rantai lengkapnya:

```
useMenu.saveItem
  → api.upsertMenu                      (src/utilities/utils.js)
    → window.kasirAPI.upsertMenu        (electron/preload.js, contextBridge)
      → ipcMain.handle("menu-upsert")   (electron/db.cjs, registerHandlers)
        → upsertMenuRow(item)           (tulis ke tabel `products`)
```

Handler IPC menu yang tersedia:

| Channel IPC | Method `api` | Kegunaan |
| --- | --- | --- |
| `menu-load` | `api.loadMenu()` | Ambil seluruh daftar menu. |
| `menu-upsert` | `api.upsertMenu(item)` | Tambah atau perbarui satu menu. |
| `menu-delete` | `api.deleteMenu(id)` | Hapus satu menu. |
| `menu-replace` | `api.replaceMenu(list)` | Ganti seluruh daftar (undo, restore, clear). |
| `stock-*` | `api.applyStock/adjustStock/stockIn/stockSet/stockOpname/stockMovements` | Semua perubahan stok. |

**Aturan berkontribusi:** setiap method baru **wajib** punya (1) handler `ipcMain.handle` di `db.cjs`, (2) baris di `preload.js`, dan (3) method di objek `api` dengan **fallback `localStorage`** agar mode browser tidak rusak.

## B.5 Aturan stok: upsert tidak menimpa stok

Ini perilaku sengaja dan mudah terlewat:

- `upsertMenuRow(item)` **tidak menulis** kolom `stok` untuk baris yang sudah ada (hanya `kategori` dan `data`). Lihat `electron/db.cjs`:

  ```js
  db.prepare("UPDATE products SET kategori = ?, data = ? WHERE menu_id = ?")
    .run(kategori, data, menuId);
  ```

- Karena itu, `menuH.saveItem()` mengirim perubahan stok **secara terpisah**:
  - Peralihan `null` (tak terbatas) ↔ angka → `api.stockSet(id, value)` (tanpa log mutasi).
  - Angka → angka yang berbeda → `api.adjustStock(diff, { type:"adjust", note:"edit item" })` (tercatat sebagai mutasi).

- Semua perubahan stok **harus** lewat satu pintu: tabel `stock_movements` diisi otomatis oleh main process.

## B.6 Multi-satuan dan tier: modul `units.js`

`src/utilities/units.js` adalah modul **murni** — tidak mengimpor React, hook, atau `api` — sehingga bisa dites tanpa DOM/IPC.

| Fungsi | Kegunaan |
| --- | --- |
| `baseUnit(item)` | Objek satuan dasar: `{ key:"", label, factor:1, harga, modal }`. |
| `findUnit(item, key)` | Cari satuan tambahan berdasarkan key; `null` bila tidak ada. |
| `unitOptions(item)` | Daftar satuan yang bisa dipilih (dasar + tambahan). |
| `stockQty(item, qty?, unitKey?)` | Konversi qty baris ke **satuan dasar** (`qty × factor`). |
| `tierPrice(item, baseQty)` | Harga per satuan dasar dari tier, atau `null`. |
| `resolveLine(item, unitKey?, qty?)` | Baris siap pakai: `{ unit, harga, modal, baseQty, tierHarga, subtotal }`. |
| `cartKeyFor(itemId, unitKey)` | Kunci keranjang: `id` (dasar) atau `id@unitKey`. |

**Invarian yang harus dijaga:**

1. **`harga` selalu per satuan dasar.** Ini membuat `i.harga * i.qty` tetap konsisten di seluruh aplikasi (diskon, CSV, laporan) tanpa perubahan.
2. **Qty keranjang selalu disimpan dalam satuan dasar.** Satu klik "dus" menambahkan `factor` ke qty.
3. **Tier hanya berlaku untuk satuan dasar**, dihitung dari `baseQty` satu baris. Satuan non-dasar memakai harganya sendiri tanpa tier.
4. **`modal` selalu modal satuan dasar.** Ini batasan yang didokumentasikan, bukan bug.
5. **Item lama tanpa `units`/`priceTiers` tetap berjalan persis seperti sebelumnya** (backward compatible).

## B.7 Database: tabel `products`

```sql
CREATE TABLE IF NOT EXISTS products (
  id         TEXT PRIMARY KEY,
  menu_id    TEXT UNIQUE COLLATE NOCASE,
  kategori   TEXT,
  stok       REAL,
  data       TEXT NOT NULL,         -- JSON objek menu lengkap
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_products_menu_id  ON products(menu_id);
CREATE INDEX idx_products_kategori ON products(kategori);
```

- `menu_id` = `String(item.id)`; unik dan case-insensitive.
- `kategori` dan `stok` dikeluarkan dari JSON agar bisa difilter/di-`UPDATE` cepat.
- `stok = NULL` berarti tak terbatas.
- Migrasi lama: `migrateMenuToProducts()` memindahkan `menu.json` ke tabel ini saat pertama kali dijalankan.

Perubahan stok juga menulis ke:

```sql
CREATE TABLE IF NOT EXISTS stock_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT, nama TEXT, type TEXT NOT NULL,
  delta REAL NOT NULL, stok_after REAL, ref TEXT,
  actor TEXT, note TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## B.8 Cara menambah field baru ke menu

Misalkan Anda menambah field `barcode`. Langkah lengkap — **semua lapisan harus disentuh**:

1. **Form state** — `src/hooks/useMenu.js`: tambahkan `barcode: ""` pada inisialisasi `form` di **tiga tempat** (`useState`, `openAdd`, `openEdit`), lalu sertakan `barcode` pada `record` di `saveItem`.
2. **UI form** — `src/components/modals/ItemModal.jsx`: tambahkan entri pada array field teks (`{ l:"Barcode", k:"barcode", p:"..." }`) atau blok input sendiri.
3. **Editor tambahan** (bila perlu) — ikuti pola multi-satuan/tier: tombol `+ X`, grid baris, dan validasi di `saveItem`.
4. **Skema DB** (hanya bila perlu difilter/di-query) — tambahkan kolom pada `CREATE TABLE products` **plus** cabang `ALTER TABLE ... ADD COLUMN` untuk database yang sudah ada, di dalam blok `CREATE TABLE IF NOT EXISTS`/migrasi.
5. **Validasi** — di `saveItem`, blokir dengan `toast_(..., "err")` atau peringatkan sesuai kebutuhan.
6. **Konsumsi** — bila field dipakai di keranjang/struk, tambahkan di `src/utilities/receipt.js` (HTML) **dan** `electron/printing.cjs` (ESC/POS).
7. **Test** — tambahkan kasus di `src/utilities/units.test.js` atau test DB yang relevan.
8. **Dokumentasi** — perbarui `README.md` dan dokumen ini.

> Bila field hanya informasi (tidak untuk filter), cukup simpan di dalam JSON `data` — tidak perlu kolom baru.

## B.9 Cara menambah menu lewat kode (seed / impor massal)

**Data awal (seed):** `src/constants/menu.js` mengekspor `SEED` (saat ini array kosong). Isi dengan objek menu sesuai skema [B.2](#b2-bentuk-data-menu-skema). `useMenu.loadInitial()` memakai `SEED` hanya bila belum ada data tersimpan.

**Impor massal:** jangan menulis langsung ke SQLite saat aplikasi berjalan. Gunakan salah satu cara resmi:

- `api.replaceMenu(list)` — mengganti seluruh daftar menu (juga dipakai untuk undo/restore).
- `api.upsertMenu(item)` berulang — menambah/memperbarui satu per satu.

Keduanya otomatis menulis ke `products` **dan** mencerminkan ke `menu.json`, sehingga backup lama tetap kompatibel.

Contoh skrip batch di sisi renderer:

```js
for (const item of daftarMenu) {
  const record = {
    id: item.id || `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    nama: item.nama,
    harga: Number(item.harga) || 0,
    modal: Number(item.modal) || 0,
    kategori: item.kategori,
    desc: item.desc || "",
    stok: item.stok === "" || item.stok == null ? null : Number(item.stok),
    satuan: item.satuan || "",
    units: item.units || [],
    priceTiers: item.priceTiers || [],
  };
  const res = await window.kasirAPI.upsertMenu(record);
  if (!res?.ok) console.error("Gagal:", record.nama, res?.error);
}
```

> Jangan memakai `Date.now()` tanpa pembeda pada loop cepat — bisa menghasilkan `id` kembar. Tambahkan sufiks acak atau gunakan item id yang sudah ada.

## B.10 Testing dan checklist kontribusi

Jalankan sebelum mengirim perubahan:

```powershell
npx vitest run      # seluruh unit test
npm run build       # pastikan bundling hijau
npm run dev         # uji manual di aplikasi Electron
```

Catatan teknis:

- `better-sqlite3` di-*rebuild* untuk ABI Electron, sehingga **tidak bisa** di-`require` dari Node/Vitest biasa. Test meng-*inject* `FakeBetterSqlite3` lewat `require.cache` (lihat `electron/db.test.cjs`).
- `FakeDatabase` hanya memahami sebagian SQL. Bila Anda menambah statement baru di `db.cjs`, kemungkinan besar test perlu diperbarui.

Checklist menambah fitur menu:

- [ ] Form state diinisialisasi di `useState`, `openAdd`, **dan** `openEdit`.
- [ ] `saveItem` deps `useCallback` diperbarui bila membaca state baru.
- [ ] Validasi memblokir vs memperingatkan jelas; toast memakai tipe `"ok"` / `"err"` saja (tidak ada `"warn"`).
- [ ] Handler IPC + `preload.js` + `api` (dengan fallback `localStorage`) lengkap.
- [ ] Perubahan stok lewat satu pintu (`applyStock`/`stockIn`/`stockSet`/`stockOpname`), bukan tulis langsung.
- [ ] `units.js`/`receipt.js` tetap murni dan tidak mengimpor hook.
- [ ] Teks JSX tidak memuat `<`, `<=`, `>=` mentah di node teks (pakai `&lt;`, `&le;`, `&ge;`) — esbuild akan gagal.
- [ ] Test + `npm run build` hijau.
- [ ] `README.md` dan `updates/TUTORIAL-MENAMBAH-MENU.md` diperbarui.

Uji manual wajib (gerbang setiap langkah):

1. **Bayar** — tambah menu baru, jual, cek struk.
2. **Open bill → batal → restart** — buat open bill, batalkan, restart aplikasi, cek konsistensi.
3. **Void** — void transaksi, pastikan stok kembali.
4. **Restore backup** — restore backup, pastikan menu dan stok pulih.
5. **Multi-satuan** — jual 1 dus, pastikan stok berkurang sebesar `factor`.
6. **Tier** — jual melebihi `minQty`, pastikan harga satuan turun.

---

## Referensi

- `README.md` — ruang lingkup fitur dan struktur repository.
- `updates/GAPCLOSING.md` — rencana remediasi (Langkah 1b–6).
- `updates/TESTING-CHECKLIST.md` — contoh format checklist pengujian.
- `updates/RECEIPTFORMAT.md` — format struk.
- `updates/DESIGN_SYSTEM.md` — token warna, radius, dan tipografi.
