
# Kasir Warung — POS Desktop

**Aplikasi kasir (Point of Sale) desktop untuk warung/kedai kopi**, dibangun dengan **React 18 + Electron 31 + Vite 5**.

Mendukung manajemen menu, open bill, shift kerja, berbagai metode pembayaran (Tunai, Debit, QRIS), cetak struk thermal, laporan penjualan lengkap, dan sistem lisensi berbasis hardware ID — didesain agar mudah dijalankan sebagai aplikasi Windows (.exe) mandiri.

---

## Fitur Utama

### Kasir & Keranjang
- Pencarian menu real-time, filter kategori, grid menu responsif
- **Customisasi Minuman (Drinks Tag System)** — item kategori "Drinks" otomatis menampilkan modal pilihan:
  - Cupsize (Small/Medium/Large)
  - Sugar (Less/Normal/More)
  - Temperature — Ice (Less/Normal/More) atau Hot
- Tambahan pada resi (receipt additionals) dinamis — bisa dikonfigurasi di Settings: Nomor Meja, Jumlah Pax, Catatan, dll.
- Keranjang samping (drawer) dengan qty control, preview item, dan ringkasan harga
- Perhitungan otomatis: Subtotal, Pajak (10%), Service (5%), Total
- Print Preview sebelum cetak struk

### Open Bill
- Simpan pesanan yang belum dibayar (status "open") dan lanjutkan transaksi nanti
- Update item pada open bill yang sudah ada (tambah/kurangi/hapus) dengan deduksi stok delta
- Hapus open bill (batalkan) dengan restore stok otomatis
- Bayar open bill langsung dari daftar — stock sudah dipotong saat buat bill, tidak double deduct

### Manajemen Shift & Pengguna
- Login multi-user dengan role Admin/Kasir
- Mulai shift baru — otomatis menentukan nomor urut shift harian
- Tutup shift dengan ringkasan: jam buka/tutup, operator, total transaksi, omset
- **Open bill TIDAK dihapus otomatis saat tutup shift** — hanya dihapus jika sudah dibayar
- Kelola pengguna (Admin only): tambah/hapus user, password, nama tampilan
- Riwayat shift dengan status (Aktif/Tertutup) dan ringkasan per shift

### Kelola Menu & Kategori
- CRUD item menu: nama, harga, harga modal (untuk laporan laba/rugi), kategori, deskripsi, foto, stok (null = unlimited)
- CRUD kategori: label, key, **tags** (mis. "drinks", "rokok") untuk fitur khusus
  - Tag "Drinks" → otomatis munculkan customisasi minuman di kasir
  - Tag "Rokok" → ditampilkan terpisah di footer struk (Total ROKOK)
- Pencarian & filter kategori di halaman Kelola

### Riwayat Transaksi
- Filter per rentang tanggal (Dari - Sampai)
- **Dua mode tampilan**:
  - Per Hari (default, collapse/expand per hari)
  - Per Shift — menampilkan: nomor shift, operator, jam, total transaksi, total pax
- Klik transaksi → buka modal detail struk lengkap
- Hapus transaksi individu atau hapus semua (dengan **undo 9 detik**)
- Unduh CSV transaksi (detail per hari dalam 1 file)

### Laporan & Ekspor CSV
Pilih shift (Semua / Shift tertentu / Shift aktif) untuk memfilter laporan:

- **Laporan Keuangan** — ringkasan per hari: pendapatan, modal, laba/rugi, margin %
- **Sales Rate** — Top 10 terlaris, Bottom 10, menu tidak terjual sama sekali
- **Rangkuman Per Item** — qty, pendapatan, modal, laba, margin % per item
- **Laporan Stok** — daftar stok semua menu dengan kategori, harga, status ketersediaan
- **Semua Transaksi Detail** — detail setiap transaksi terpisah per hari
- **Laporan Per Metode Bayar** — rincian jumlah transaksi & total per metode pembayaran

### Cetak Struk Thermal
- Dukungan printer thermal 80mm dan 58mm (ukuran customizable sesuai kebutuhan) via Electron `webContents.print()`
- Pilih printer langsung dari aplikasi (modal Printer)
- Format struk memiliki: logo, nama warung, alamat, telepon, no transaksi, waktu, kasir, metode bayar, item, total, kembalian, QRIS image (jika QRIS), footer kategori, catatan "Barang yang sudah dibeli tidak bisa dikembalikan"
- Cetak preview (Print Preview) sebelum cetak aktual

### Lisensi & Hardware Binding
- Aktivasi lisensi terikat ke perangkat menggunakan `node-machine-id` (hardware fingerprint)
- Format License Key: `YKK-XXXXX-XXXXX-XXXXX-XXXXX` (20 karakter hex dari HMAC-SHA256)
- Hardware ID ditampilkan saat aktivasi (format: `XXXX-XXXX-XXXX-XXXX`)
- Lisensi disimpan terenkripsi (Base64) di `app.getPath("userData")/.ykk_lic`
- Pindah PC? Hubungi penjual untuk reset aktivasi

### Settings & Customization
- **Nama Warung, Alamat, Nomor Telepon** — tampil di header struk
- **Metode Pembayaran** — CRUD custom methods (label, kategori: cash/qris/custom), auto-detect QRIS dari nama
- **QRIS Image Upload** — upload gambar QRIS per metode pembayaran (maks 2MB)
- **Receipt Additionals** — CRUD field tambahan di resi (text/number, required/optional, visible/hidden, kategori receipt/bill)
- **Printer** — pilih printer thermal default

### Design System & i18n
- Design System terpusat di `src/constants/theme.js`: 8-step color palette, 6-step typographic scale, 5 radius tokens, 4-step spacing
- Multi-bahasa (i18n) ringan di `src/utilities/i18n.js` — Bahasa Indonesia & English

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18.3, Vite 5.4 |
| **Desktop Shell** | Electron 31.7 |
| **Database** | SQLite (better-sqlite3) + JSON fallback + WAL (Write-Ahead Log) |
| **Testing** | Vitest 4.1 |
| **Packaging** | electron-builder 25.1 (Windows NSIS installer x64) |
| **License Security** | `node-machine-id` 1.1 (hardware fingerprinting) |
| **Concurrency** | `concurrently` 8.2, `wait-on` 8.0 |
| **Build Tool** | `node-gyp` 13.0 (native modules rebuild) |

---

## Arsitektur Data & Persistensi

### SQLite (Primary) — `data/kasir.db`
- **transactions** — tabel transaksi (id, data JSON, created_at) dengan index `created_at`
- **shifts** — tabel shift (id, data JSON, created_at) dengan index `created_at`
- Migrasi otomatis dari JSON lama ke SQLite saat pertama kali jalan (backup JSON disimpan di `data/json-backups/`)

### JSON Files (Fallback & Config) — `data/`

| File | Fungsi |
|------|--------|
| `menu.json` | Daftar menu item |
| `categories.json` | Kategori & tags |
| `open-bills.json` | Open bills |
| `settings.json` | Printer, payment methods, receipt additionals, warung info, QRIS images |
| `users.json` | Akun pengguna |
| `logo.json` | Logo warung (base64) |
| `qris.json` | QRIS images per metode (base64) |

### Keamanan Data
- **Atomic Write** — tulis ke `.tmp` → fsync → rename (atomic di OS level)
- **Write-Ahead Log (WAL)** — `trx.wal` mencatat transaksi sebelum commit; recovery otomatis saat startup jika crash
- **Daily Backup** — `data/backups/trx_YYYY-MM-DD.json` (retensi 30 hari)

---

## Struktur Proyek

```

.
├── electron/                    # Main process Electron
│   ├── main.cjs                 # Window, IPC handlers, SQLite, License, WAL, Backup, Print
│   └── preload.js               # Context bridge (kasirAPI) ke renderer
├── src/
│   ├── App.jsx                  # Root component, coordinator hooks, routing view, modals
│   ├── main.jsx                 # Entry point React
│   ├── assets/                  # Ikon, gambar statis
│   ├── components/              # UI Components
│   │   ├── BillDetailModal.jsx
│   │   ├── ClockBadge.jsx       # Jam real-time di header
│   │   ├── StockBadge.jsx       # Badge stok (habis/tersisa)
│   │   ├── Tag.jsx              # Tag label generik
│   │   └── modals/              # Semua modal (Pay, Receipt, Item, Cat, Settings, Printer, CloseShift, ConfirmDel, Additionals, User)
│   ├── constants/               # Konstanta & Design Tokens
│   │   ├── additionals.js       # Konfigurasi additionals minuman (cupsize, sugar, temperature)
│   │   ├── categories.js        # Default kategori (kosong, user-defined)
│   │   ├── colors.js            # Warna per metode bayar, alias G/OR/W/LT/BD/TX/MT
│   │   ├── menu.js              # Seed menu default (kosong)
│   │   ├── payments.js          # METODE_LABELS mapping key→label
│   │   ├── receiptAdditionals.js # Default receipt additionals (kosong)
│   │   ├── styles.js            # Style helpers (row, inp, dll.)
│   │   └── theme.js             # Design System tokens (COLOR_PALETTE, TYPOGRAPHY, RADIUS, SPACING)
│   ├── hooks/                   # Custom React Hooks (domain-separated)
│   │   ├── useAuth.js           # Login, shift lifecycle, user management
│   │   ├── useBills.js          # Open bills CRUD, persist, cancel
│   │   ├── useCart.js           # Keranjang, activeBill, processPayment, additionals
│   │   ├── useHistory.js        # Riwayat transaksi, filter, CSV, viewMode (day/shift)
│   │   ├── useLicense.js        # Cek/aktivasi lisensi, hardware ID
│   │   ├── useMenu.js           # Menu & kategori CRUD, stock deduction/restoration
│   │   ├── useSettings.js       # Settings, logo, printer, payment methods, QRIS, receipt additionals
│   │   └── useToast.js          # Toast notification + Undo buffer (9 detik)
│   ├── utilities/               # Pure utilities
│   │   ├── calculations.js      # Hitung pajak (10%), service (5%), total
│   │   ├── csvbuild.js          # Builder CSV untuk semua laporan
│   │   ├── i18n.js              # i18n engine (id/en)
│   │   ├── receipt.js           # buildReceiptHTML, buildPreviewHTML, category totals
│   │   ├── users.js             # DEFAULT_USERS, isAdminUser
│   │   └── utils.js             # api wrapper (ipcRenderer.invoke)
│   └── views/                   # Halaman utama (React.memo)
│       ├── ViewKasir.jsx        # Kasir: sidebar kategori, grid menu, cart drawer
│       ├── ViewKelola.jsx       # Kelola Menu & Kategori
│       ├── ViewLaporan.jsx      # Laporan & CSV export per shift
│       ├── ViewOpenBill.jsx     # Daftar open bill, bayar/tambah/hapus
│       └── ViewRiwayat.jsx      # Riwayat transaksi (per hari / per shift)
├── updates/                     # Dokumentasi internal pengembangan
│   ├── DESIGN_SYSTEM.md         # Dokumentasi Design System
│   ├── DRINKS-FEATURE.md        # Implementasi Drinks Tag & Additionals
│   ├── GalihFeatureFinalization.md # Bug fixes & feature requests
│   ├── RECEIPTFORMAT.md         # Format struk detail
│   ├── PLANNING.md, TODO.md, TESTING-CHECKLIST.md, dll.
├── index.html
├── vite.config.js
├── vitest.config.mjs
├── package.json
└── generator.cjs / test-*.js    # Script generator lisensi & test printer/db

```

---

## Menjalankan Secara Lokal

### Prasyarat
- **Node.js 18+** (direkomendasikan 20 LTS)
- **npm** atau **yarn**
- Windows 10/11 (target build), macOS/Linux untuk development

### Instalasi

```bash
# Clone & masuk folder
git clone https://github.com/Danzel5005/.kasir-warung.git
cd kasir-warung

# Install dependencies (termasuk native module better-sqlite3 & node-machine-id)
npm install
```

Development Mode

```bash
# Browser only (Vite dev server, no Electron)
npm run dev

# Full Electron + Vite HMR (concurrently)
npm run electron:dev
```

Testing

```bash
# Run once
npm test

# Watch mode
npm run test:watch
```

---

 Build Aplikasi Windows (.exe)

```bash
# Build production (Vite build + electron-builder NSIS)
npm run electron:build
```

Output: release/Kasir Warung Setup 1.1.0.exe (NSIS installer)

· One-click install: tidak (user bisa pilih folder)
· Desktop shortcut: ya
· Start Menu shortcut: ya
· Shortcut name: Kasir WRG
· App ID: com.warung.kasir
· Ikon: src/assets/icon.ico

---

 Catatan Penting

· Data Directory: %APPDATA%/kasir-warung/data/ (SQLite, JSON, backup, license)
· File .env, kunci lisensi, dan berkas generator (generator.cjs, generator.test.js) diabaikan oleh .gitignore — jangan dikomit
· Migrasi Data: Saat pertama kali jalan versi SQLite, JSON lama otomatis dimigrasi ke SQLite dan dibackup ke data/json-backups/
· Recovery: Jika aplikasi crash saat bayar, transaksi tertangguh di trx.wal dan dipulihkan otomatis saat startup berikutnya

---

 Hotkeys (Keyboard Shortcuts)

Key Aksi
K Buka Kasir (Menu)
O Buka Open Bill
R Buka Riwayat
L Buka Laporan
M Buka Kelola Menu
P Toggle Cart Drawer
/ Fokus Search Menu

---

 Lisensi

Proyek internal/pribadi — MIT License.

---

Author: Danzel Tampilang
Contact: danzeltampilang@gmail.com / WhatsApp
Version: 1.1.0

```