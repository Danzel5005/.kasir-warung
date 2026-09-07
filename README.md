# Kasir Warung

Aplikasi Point of Sale (POS) desktop untuk warung dan usaha makanan/minuman. Aplikasi berjalan sebagai aplikasi Windows berbasis Electron dengan antarmuka React, menyimpan data transaksi secara lokal, dan mendukung pencetakan struk thermal maupun PDF.

Dokumen ini mengikuti struktur dan perilaku kode yang ada di repository. Versi aplikasi saat ini adalah `1.1.0`.

## Ruang Lingkup Fitur

### Kasir dan transaksi

- Login pengguna dan pemilihan operator aktif.
- Shift kerja dengan nomor shift, uang kas awal, pengeluaran, status aktif/tertutup, dan ringkasan penutupan.
- Pencarian menu, filter kategori, keranjang, ubah kuantitas, hapus item, dan drawer keranjang.
- Dukungan barcode melalui keyboard wedge. Pada Windows, aplikasi juga mencoba membaca scanner USB HID secara langsung melalui `node-hid`.
- Harga menu, harga modal, stok terbatas atau stok tanpa batas.
- Diskon bertingkat berdasarkan kuantitas item.
- Pajak dan service yang dapat diaktifkan serta dikonfigurasi dari Settings.
- Field tambahan checkout dan struk yang dapat dibuat, diubah, diwajibkan, disembunyikan, atau dihapus.
- Open bill untuk menyimpan pesanan yang belum dibayar, melanjutkan pesanan, menambah atau menghapus item, membayar, serta membatalkan dengan pengembalian stok.
- Pembayaran tunai, QRIS, metode debit, transfer, dan metode custom yang dikelola dari Settings.
- Perhitungan kembalian untuk pembayaran tunai.
- Pencegahan pemotongan stok ganda ketika open bill dibayar.

### Minuman dan kategori

Kategori dapat diberi tag `Drinks`. Item pada kategori tersebut meminta pilihan tambahan saat dimasukkan ke keranjang:

- Ukuran cup: Small, Medium, atau Large.
- Gula: Less, Normal, atau More.
- Suhu: Ice dengan tingkat Less, Normal, atau More, atau Hot.

Pilihan tambahan tidak mengubah harga dan item dengan pilihan berbeda menjadi baris keranjang yang berbeda. Data tambahan ditampilkan di keranjang, preview, dan struk.

### Riwayat, laporan, dan ekspor

- Riwayat transaksi dengan filter tanggal, filter shift, pengurutan, pagination, dan tampilan per hari atau per shift.
- Detail transaksi dan penghapusan transaksi individual.
- Penghapusan seluruh transaksi dengan buffer undo selama 9 detik.
- Laporan keuangan per shift atau seluruh shift: pendapatan, modal, laba/rugi, dan margin.
- Sales rate: item terlaris, item paling sedikit terjual, serta item yang belum pernah terjual.
- Rangkuman per item: kuantitas, pendapatan, modal, laba, dan margin.
- Laporan stok.
- Rincian transaksi.
- Ringkasan berdasarkan metode pembayaran.
- Ekspor laporan ke CSV melalui dialog penyimpanan Windows.

### Struk dan printer

- Preview struk sebelum transaksi dicetak.
- Printer thermal melalui ESC/POS dan `node-thermal-printer`.
- Printer sistem atau printer PDF melalui API print Electron.
- Lebar kertas yang dapat diatur. Kode printer membatasi nilai ke rentang 30 sampai 210 mm, dengan default 80 mm.
- Kompatibilitas format 58 mm dan 80 mm melalui jumlah karakter per baris yang disesuaikan.
- Isi struk dapat mencakup logo, nama warung, alamat, telepon, waktu, nomor transaksi, kasir, metode pembayaran, item, tambahan minuman, subtotal, pajak, service, diskon, total, pembayaran, kembalian, gambar QRIS, dan catatan footer.
- Printer dipilih dari Settings. Printer PDF tidak diproses sebagai printer thermal ESC/POS.

### Settings

Settings mencakup:

- Nama warung, alamat, dan nomor telepon.
- Logo.
- Printer dan lebar kertas struk.
- Metode pembayaran beserta kategori cash, QRIS, atau custom.
- Gambar QRIS untuk metode yang sesuai.
- Field tambahan checkout dan struk.
- Diskon bertingkat.
- Pajak dan service.
- Kategori pengeluaran shift.

### Lisensi

Aplikasi memeriksa lisensi sebelum memuat workspace utama. Lisensi terikat ke hardware ID yang dibaca dari `node-machine-id`.

- Hardware ID ditampilkan dalam format empat kelompok karakter.
- License key dibuat untuk hardware ID tertentu menggunakan HMAC-SHA256 pada modul generator internal.
- Lisensi yang aktif disimpan sebagai payload JSON yang di-encode Base64 di file `.ykk_lic` pada direktori user-data Electron.
- Kunci lisensi dan `electron/license-secret.cjs` adalah artefak sensitif. Jangan menaruh secret produksi di repository publik.

## Teknologi dan Dependensi

Versi di bawah ini adalah versi yang tercatat di `package.json` saat dokumentasi ini dibuat.

### Dependensi runtime

| Paket | Versi | Kegunaan |
| --- | --- | --- |
| `react` | `^18.3.1` | Komponen dan state antarmuka |
| `react-dom` | `^18.3.1` | Render React ke halaman aplikasi |
| `better-sqlite3` | `^11.8.1` | Database SQLite lokal untuk transaksi dan shift |
| `node-hid` | `^2.0.0` | Pembacaan scanner USB HID sebagai fallback |
| `node-machine-id` | `^1.1.12` | Pembentukan hardware ID untuk lisensi |
| `node-thermal-printer` | `^4.6.1` | Pembuatan dan pengiriman data ESC/POS |

### Dependensi pengembangan dan build

| Paket | Versi | Kegunaan |
| --- | --- | --- |
| `electron` | `^31.7.7` | Shell desktop dan Electron main process |
| `vite` | `^5.4.10` | Development server dan bundling renderer |
| `@vitejs/plugin-react` | `^4.3.1` | Integrasi React untuk Vite |
| `electron-builder` | `^25.1.8` | Pembuatan installer Windows NSIS |
| `@electron/rebuild` | `^3.6.0` | Rebuild native module untuk Electron |
| `node-gyp` | `^13.0.1` | Toolchain native module |
| `concurrently` | `^8.2.2` | Menjalankan Vite dan Electron bersamaan |
| `wait-on` | `^8.0.1` | Menunggu Vite siap sebelum Electron dijalankan |
| `vitest` | `^4.1.10` | Unit test |

`npm install` menjalankan `postinstall`, yaitu `npx @electron/rebuild -f -w node-hid`. Native dependency dapat memerlukan toolchain Windows yang sesuai.

## Persyaratan Sistem

### Minimum praktis untuk menjalankan aplikasi

- Windows 10 atau Windows 11 64-bit.
- CPU dua inti 64-bit, sekitar 2 GHz atau lebih.
- RAM 4 GB.
- Ruang kosong 1 GB untuk aplikasi, cache, dan data operasi awal. Sediakan ruang tambahan untuk database, gambar, backup, serta installer.
- Layar minimal 1020 x 680 piksel. Ukuran minimum ini sesuai dengan `BrowserWindow` aplikasi.
- Hak akses untuk memasang aplikasi dan mengakses direktori user-data.

### Perangkat tambahan

- Printer thermal 58 mm atau 80 mm jika ingin mencetak struk fisik.
- Scanner barcode USB yang mendukung keyboard wedge atau USB HID.
- Koneksi internet tidak diperlukan untuk transaksi lokal setelah aplikasi dan lisensi tersedia. Internet mungkin diperlukan untuk distribusi installer, dukungan, atau proses lisensi di luar aplikasi.

Persyaratan RAM dan ruang di atas adalah batas operasional yang disarankan untuk Windows dan Electron, bukan hasil benchmark formal. Database dan jumlah gambar yang besar membutuhkan ruang tambahan.

## Struktur Repository

### File root

| File | Isi dan fungsi |
| --- | --- |
| `package.json` | Metadata aplikasi, versi, dependensi, script development/test/build, serta konfigurasi electron-builder. |
| `index.html` | Dokumen HTML entry point untuk renderer Vite. |
| `vite.config.js` | Konfigurasi Vite dan plugin React. |
| `vitest.config.mjs` | Konfigurasi Vitest. |
| `menuandcat.json` | Data atau fixture menu dan kategori yang digunakan untuk kebutuhan repository tertentu, bukan lokasi data runtime utama. |
| `generator.cjs` | Generator license key berbasis runtime CommonJS. Gunakan hanya di lingkungan yang dipercaya. |
| `generator.py` | Generator atau utilitas license key berbasis Python untuk kebutuhan operasional pengembang. |
| `fix_photo.py` | Utilitas Python untuk perbaikan atau pemrosesan foto menu. |
| `stress-test.js` | Skrip stress test sisi JavaScript. |
| `stress-test-console.js` | Varian stress test yang ditujukan untuk console. |
| `stress-test-node.cjs` | Varian stress test untuk Node.js CommonJS. |
| `test-app-printer.js` | Skrip pengujian integrasi aplikasi/printer. |
| `test-db.js` | Skrip pengujian akses database. |
| `test-printer.js` | Skrip pengujian printer. |
| `LICENSE` | Lisensi repository. |
| `README.md` | Dokumentasi penggunaan, build, dan pemeliharaan. |

### `electron/`

| File | Isi dan fungsi |
| --- | --- |
| `main.cjs` | Electron main process: membuat window, mendaftarkan IPC, menginisialisasi database, migrasi, recovery WAL, backup harian, lisensi, scanner, dan printing. |
| `preload.js` | Context bridge terisolasi yang mengekspos API `kasirAPI` dan alias `api` ke renderer. |
| `db.cjs` | SQLite service, tabel transaksi/shift, query terfilter, pagination, penyimpanan, pembayaran atomik, dan migrasi data JSON lama. |
| `backup.cjs` | Pembacaan JSON, atomic write, WAL recovery, dan backup transaksi harian dengan retensi 30 file. |
| `printing.cjs` | Printer enumeration, print HTML/PDF, print thermal ESC/POS, normalisasi lebar kertas, dan format struk langsung. |
| `print-manager.cjs` | Modul pendukung alur manajemen printing. |
| `license.cjs` | Pembacaan hardware ID, validasi license key, aktivasi, dan penyimpanan lisensi. |
| `license-secret.cjs` | Implementasi secret/generator kunci lisensi. Lindungi dari publikasi. |
| `category-label.cjs` | Resolusi label kategori untuk output printer. |

### `src/`

| Lokasi | Isi dan fungsi |
| --- | --- |
| `App.jsx` | Koordinator aplikasi: lifecycle lisensi/login/shift, pemuatan data, navigasi, hotkey, pembayaran, printing, dan wiring antar-hook. |
| `main.jsx` | Entry point React renderer. |
| `assets/` | Ikon dan aset statis, termasuk ikon aplikasi. |
| `components/` | Komponen UI bersama seperti detail bill, jam, loader, badge stok, dan tag. |
| `components/modals/` | Modal item, kategori, additionals minuman, pembayaran, struk, printer, settings, pengguna, konfirmasi, dan tutup shift. |
| `components/modals/settings/` | Tab Settings untuk printer, pembayaran, QRIS, receipt, dan pricing. |
| `constants/` | Konfigurasi kategori, menu, pembayaran, additionals, receipt fields, dan design tokens. `design.js` adalah sumber token visual utama saat ini. |
| `hooks/` | Domain state dan operasi untuk auth/shift, barcode, bills, cart, history, license, menu, settings, dan toast/undo. |
| `utilities/` | Logika murni dan adapter untuk barcode, kalkulasi harga, kategori, CSV, i18n, printer, receipt, shift, user, dan IPC API. Banyak utilitas memiliki file test berdekatan. |
| `views/` | Layar Kasir, Open Bill, Riwayat, Laporan, dan Kelola Menu/Kategori. |

### `updates/`

Dokumentasi internal perubahan, desain, rencana, checklist pengujian, format struk, dan catatan implementasi. Berkas di folder ini membantu memahami keputusan historis, tetapi source code dan `package.json` tetap menjadi sumber kebenaran untuk perilaku saat ini.

### Direktori generated atau distribusi

- `dist/` dibuat oleh `npm run build` dan berisi renderer production.
- `release/` dibuat oleh electron-builder dan berisi installer, artefak update, serta output packaging lainnya.
- `license-key-generator-android/` adalah project Android terpisah untuk generator lisensi; tidak digunakan sebagai dependency runtime aplikasi Electron.

## Data Runtime dan Persistensi

Data runtime tidak disimpan di folder repository. Electron menggunakan `app.getPath("userData")`, lalu membuat subfolder `data`.

Pada Windows, lokasi umumnya adalah:

```text
%APPDATA%\kasir-warung\data\
```

Lokasi aktual dapat dilihat dari aplikasi melalui API `getDataPath`.

| Path | Isi |
| --- | --- |
| `kasir.db` | Database SQLite untuk tabel `transactions` dan `shifts`. SQLite menggunakan journal mode WAL. |
| `transactions.json` | Format lama atau fallback transaksi ketika database tidak tersedia. |
| `shifts.json` | Format lama atau fallback shift ketika database tidak tersedia. |
| `menu.json` | Daftar menu, harga, harga modal, stok, barcode, kategori, dan metadata menu. |
| `categories.json` | Kategori menu dan tags, termasuk tag `Drinks`. |
| `open-bills.json` | Open bill yang belum dibayar. |
| `settings.json` | Identitas warung, printer, payment methods, QRIS, receipt fields, pricing, dan expense categories. |
| `users.json` | Akun pengguna dan role. |
| `logo.json` | Logo dalam bentuk data yang disimpan aplikasi. |
| `qris.json` | Gambar QRIS per metode pembayaran. |
| `trx.wal` | Catatan transaksi sementara untuk recovery setelah crash saat pembayaran. |
| `backups/` | Backup harian transaksi dengan retensi maksimal 30 file. |
| `json-backups/` | Salinan `transactions.json` dan `shifts.json` saat migrasi ke SQLite. |
| `receipt-print.html` | HTML sementara yang digunakan alur print HTML/PDF. |

Penulisan JSON menggunakan file temporary, `fsync`, lalu rename. Saat startup, urutannya adalah inisialisasi SQLite, migrasi JSON lama, recovery WAL, backup harian, lalu pembuatan window.

## Menyiapkan Development

### Prasyarat

1. Windows 10/11 64-bit untuk pengujian Electron dan build installer.
2. Node.js versi LTS. Node.js 20 LTS adalah pilihan yang disarankan; versi yang kompatibel harus dapat memasang Electron 31, `better-sqlite3`, dan `node-hid`.
3. npm yang ikut bersama Node.js.
4. Untuk native module di Windows, siapkan toolchain yang dibutuhkan `node-gyp` jika prebuilt binary tidak tersedia, termasuk Python dan Visual Studio Build Tools dengan workload C++.

### Instalasi

```powershell
git clone <url-repository>
Set-Location .kasir-warung
npm install
```

Jangan menyalin data runtime ke repository. Untuk mempertahankan data pengguna, backup direktori user-data aplikasi sebelum mengganti build.

### Menjalankan

```powershell
# Vite renderer saja; cocok untuk pekerjaan UI
npm run dev

# Vite dan Electron bersamaan; gunakan untuk menguji IPC, database, lisensi,
# barcode, dan printer
npm run electron:dev
```

`npm run dev` hanya menjalankan renderer. API Electron seperti SQLite, printer, scanner HID, dan lisensi tidak tersedia sepenuhnya di browser biasa.

## Testing dan Pemeriksaan

```powershell
# Menjalankan seluruh test Vitest satu kali
npm test

# Mode watch
npm run test:watch

# Build renderer tanpa membuat installer
npm run build
```

Test unit utama berada di `src/utilities/` dan mencakup barcode, kalkulasi, category management, CSP, CSV, printer, receipt, dan utilitas IPC. Skrip `test-db.js`, `test-printer.js`, dan `test-app-printer.js` adalah pemeriksaan manual/integrasi terpisah dari script `npm test`.

## Build Installer Windows

Build production saat ini didefinisikan sebagai:

```powershell
npm run electron:build
```

Script tersebut menjalankan `vite build`, lalu `electron-builder --win`. Konfigurasi packaging berada di `package.json`:

- Product name: `Kasir Warung`.
- App ID: `com.warung.kasir`.
- Target: installer NSIS Windows x64.
- Output: `release/`.
- Ikon: `src/assets/icon.ico`.
- Installer bukan one-click; pengguna dapat memilih folder instalasi.
- Desktop shortcut dan Start Menu shortcut dibuat otomatis.
- Nama shortcut: `Kasir WRG`.
- File yang dipaketkan: `dist/**/*`, `electron/**/*`, secret lisensi yang ditentukan konfigurasi, `node_modules/**/*`, dan `package.json`.

File installer yang dihasilkan mengikuti versi `package.json`, sehingga nama file tidak boleh diasumsikan selalu sama. Periksa isi `release/` setelah build.

## Prosedur Update dan Release

1. Backup direktori `%APPDATA%\kasir-warung\data\` pada komputer pengguna. Pastikan backup mencakup `kasir.db`, JSON konfigurasi, `open-bills.json`, dan folder `backups`.
2. Catat perubahan dan naikkan `version` di `package.json` sesuai jenis release.
3. Perbarui source code secara lokal dan jangan menghapus file data pengguna.
4. Jalankan `npm install` jika dependency berubah. `postinstall` akan melakukan Electron rebuild untuk `node-hid`.
5. Jalankan `npm test`.
6. Jalankan `npm run build` untuk memastikan renderer production berhasil dibundel.
7. Jalankan `npm run electron:build` pada Windows x64 untuk membuat installer.
8. Uji installer di komputer bersih: instalasi, startup, license screen, login, shift, tambah menu, transaksi, open bill, pembayaran, laporan, ekspor CSV, dan printing.
9. Uji printer thermal pada lebar yang dipakai dan uji printer PDF secara terpisah.
10. Simpan installer dan checksum internal sesuai prosedur distribusi. Jangan memasukkan license secret atau license key pelanggan ke repository.
11. Saat upgrade pada komputer pengguna, tutup aplikasi lebih dahulu, pasang installer baru, lalu verifikasi data dan lisensi. Migrasi JSON ke SQLite dilakukan saat startup dan membuat salinan migrasi di `json-backups`.

## Pemeliharaan dan Troubleshooting

### Data tidak tampil atau transaksi perlu dipulihkan

1. Tutup aplikasi.
2. Salin seluruh `%APPDATA%\kasir-warung\data\` sebagai backup baru.
3. Periksa `kasir.db`, `trx.wal`, dan `backups/`.
4. Jalankan aplikasi kembali. Recovery WAL dilakukan saat startup.
5. Jangan mengedit SQLite atau JSON secara manual sebelum membuat salinan.

### Printer thermal gagal

- Pastikan printer terlihat di Windows dan dipilih dari Settings.
- Pastikan printer bukan printer PDF atau virtual ketika memakai jalur ESC/POS.
- Pastikan ukuran kertas Settings sesuai dengan printer.
- Gunakan `test-printer.js` atau `test-app-printer.js` untuk pemeriksaan terarah.
- Periksa log Electron untuk pesan koneksi printer atau driver RAW.

### Scanner barcode gagal

- Pastikan scanner mengirim input keyboard dengan suffix Enter atau terdeteksi sebagai USB HID.
- Pastikan barcode menu tersimpan sesuai nilai yang dipindai.
- Jalur keyboard wedge adalah jalur utama; pembacaan HID mentah hanya fallback dan bergantung pada perangkat serta driver.

### Native dependency gagal dipasang

- Hapus `node_modules` hanya setelah memastikan tidak ada perubahan lokal yang perlu disimpan, lalu jalankan `npm install` kembali.
- Pastikan Node.js, Python, dan Visual Studio Build Tools kompatibel dengan `node-gyp`.
- Jalankan `npm rebuild` atau `npx @electron/rebuild -f -w node-hid` setelah perubahan versi Electron.

### Lisensi tidak cocok setelah pindah perangkat

Lisensi memang terikat hardware ID. Catat hardware ID yang tampil pada layar aktivasi dan gunakan proses reset atau penerbitan ulang lisensi yang dikelola pemilik sistem. Jangan menyalin file `.ykk_lic` dari komputer lain sebagai solusi.

## Hotkey Aplikasi

Hotkey hanya diproses ketika fokus tidak berada di input, textarea, atau select:

| Tombol | Aksi |
| --- | --- |
| `K` | Buka Kasir |
| `O` | Buka Open Bill |
| `R` | Buka Riwayat |
| `L` | Buka Laporan |
| `M` | Buka Kelola Menu |
| `P` | Buka atau tutup drawer keranjang |
| `/` | Buka Kasir dan fokus ke pencarian |

## Keamanan dan Operasional

- Context isolation dan `nodeIntegration: false` digunakan pada window utama.
- Renderer mengakses kemampuan native melalui preload bridge, bukan melalui akses Node.js langsung.
- Jangan mengirim `electron/license-secret.cjs`, license key, file `.ykk_lic`, database produksi, atau data pelanggan ke repository publik.
- Backup harus dilakukan sebelum upgrade, migrasi, pemindahan komputer, atau tindakan pemulihan.
- `package.json` dan source code adalah sumber kebenaran untuk script, versi, dependensi, dan konfigurasi packaging.

## Lisensi dan Kontak

Repository menyertakan file `LICENSE`. Pemilik dan kontak yang tercatat di `package.json`:

- Danzel Tampilang
- `danzeltampilang@gmail.com`
- `https://wa.me/6289502417252`
