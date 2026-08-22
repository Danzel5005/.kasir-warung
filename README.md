# Kasir Warung Nusantara 

Aplikasi kasir (POS) desktop untuk warung/kedai kopi, dibangun dengan **React + Electron**. Mendukung manajemen menu, open bill, shift kerja, banyak metode pembayaran, cetak struk thermal, dan laporan penjualan — didesain agar mudah dijalankan sebagai aplikasi Windows (.exe) mandiri.

## Fitur

- **Kasir & Keranjang** — pencarian menu, kategori, tambahan pada resi, dan alur pembayaran cepat
- **Open Bill** — simpan pesanan yang belum dibayar dan lanjutkan transaksi nanti (ngutang lah)
- **Manajemen Shift** — mulai/tutup shift dengan ringkasan penjualan per shift
- **Manajemen Pengguna & Akses** — login, tambah/hapus user (hanya admin)
- **Kelola Menu** — CRUD kategori dan item menu, harga, stok
- **Riwayat Transaksi** — filter per hari atau per shift, dengan tampilan yang bisa dilipat (collapse)
- **Laporan** — ekspor data penjualan ke CSV
- **Cetak Struk Thermal** — terhubung ke printer thermal via Electron (mendukung printer seperti Bixolon SRP-350, 80mm), pilih printer langsung dari aplikasi
- **Lisensi & Hardware Binding** — aktivasi lisensi terikat ke perangkat (hardware ID) menggunakan `node-machine-id`
- **Multi-bahasa (i18n)** — engine i18n ringan untuk teks antarmuka (Indonesia)
- **Design System** — token warna, tipografi, dan radius terpusat (`src/constants/theme.js`) untuk konsistensi visual

## Tech Stack

- **Frontend**: React 18, Vite
- **Desktop shell**: Electron
- **Testing**: Vitest
- **Packaging**: electron-builder (target Windows NSIS installer)
- **Keamanan lisensi**: `node-machine-id` untuk hardware fingerprinting

## Struktur Proyek

```
.
├── electron/            # Main process Electron (window, IPC, printer, lisensi)
│   ├── main.js
│   └── preload.js
├── src/
│   ├── components/      # Komponen UI & modal (Pay, Receipt, Printer, Settings, dll.)
│   ├── constants/        # Menu, kategori, metode pembayaran, tema/design tokens
│   ├── hooks/            # useAuth, useCart, useBills, useHistory, useLicense, useMenu, dll.
│   ├── utilities/         # Kalkulasi, build CSV, format struk, i18n, helper umum
│   └── views/             # Halaman utama (Kasir, Kelola, Laporan, Open Bill, Riwayat)
├── updates/              # Catatan pengembangan, planning, checklist testing
├── index.html
├── vite.config.js
└── package.json
```

## Menjalankan Secara Lokal

Instal dependencies:

```bash
npm install
```

Mode pengembangan (browser saja, tanpa Electron):

```bash
npm run dev
```

Mode pengembangan penuh (Electron + hot reload Vite):

```bash
npm run electron:dev
```

Menjalankan test:

```bash
npm test
```

## Build Aplikasi Windows (.exe)

```bash
npm run electron:build
```

Installer NSIS akan dihasilkan di folder `release/`.

## Catatan

- Direktori `updates/` berisi dokumentasi internal proses pengembangan (planning, checklist, catatan fitur) — berguna sebagai referensi histori perubahan.
- File `.env`, kunci lisensi, dan berkas *generator* sengaja diabaikan oleh `.gitignore` dan tidak boleh dikomit.

## Lisensi

Proyek internal/pribadi — MIT.
