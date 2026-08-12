# PANDUAN LENGKAP — KASIR WARUNG NUSANTARA

OminRoute API

## STRUKTUR FILE (WAJIB LENGKAP)

```
kasir-warung/               ← taruh semua file di sini
 ├── BUILD-EXE.bat
 ├── JALANKAN-DEV.bat
 ├── package.json
 ├── vite.config.js
 ├── index.html
 ├── src/
 │    ├── App.jsx
 │    └── main.jsx
 └── electron/
      ├── main.js
      └── preload.js
```

---

## PRASYARAT (Install sekali saja)

### Node.js
- Download: https://nodejs.org → pilih versi **LTS**
- Setelah install, **restart PC**
- Cek berhasil: buka CMD → ketik `node -v`

### VSCode (untuk edit kode)
- Download: https://code.visualstudio.com

---

## CARA PAKAI

### Opsi A — Langsung jalankan (tanpa .exe, cocok untuk harian)
1. Buka CMD atau Terminal VSCode di folder ini
2. Jalankan sekali: `npm install --legacy-peer-deps`
3. Setelah itu: klik dua kali **`JALANKAN-DEV.bat`**
4. Aplikasi akan terbuka sebagai jendela desktop

### Opsi B — Build jadi file .exe (installer Windows)
1. Klik dua kali **`BUILD-EXE.bat`**
2. Tunggu selesai (5–15 menit)
3. Hasil ada di folder `release/`
4. File: `Kasir Warung Nusantara Setup 1.0.0.exe`
5. Klik dua kali → install → shortcut muncul di Desktop

---

## PENYIMPANAN DATA

Data tersimpan otomatis di:
```
C:\Users\[nama-anda]\AppData\Roaming\kasir-warung-nusantara\data\
  ├── transactions.json   ← semua riwayat transaksi
  └── custom-menu.json    ← menu tambahan + foto
```

- **Transaksi** disimpan selama **3 hari terakhir**, lalu otomatis terhapus
- **Menu custom** tersimpan permanen sampai dihapus manual
- Folder `AppData` bisa dibuka via: `Win + R` → ketik `%AppData%`

---

## EXPORT CSV

Klik tombol **UNDUH CSV** di header aplikasi.
Nama file otomatis: `Transaksi_Senin_01-01-2025_14-30-00.csv`

Kolom yang tersimpan:
- No. Transaksi, Hari, Tanggal, Bulan, Tahun, Jam Transaksi
- No. Meja, Nama Item, Qty, Harga Satuan, Subtotal Item
- Total Transaksi, Pajak, Bayar, Kembalian
- Waktu Unduh Data (lengkap dengan hari/tanggal/jam)

> Buka dengan Microsoft Excel: pastikan encoding UTF-8 (sudah otomatis)

---

## MENAMBAH MENU CUSTOM (dengan foto)

1. Klik tombol **KELOLA MENU** di header
2. Klik **+ Tambah Menu**
3. Upload foto (JPEG/PNG, maks 2MB) — opsional
4. Isi nama, harga, deskripsi, pilih kategori
5. Klik **Tambahkan ke Menu**
6. Menu langsung muncul di halaman kasir

---

## TROUBLESHOOTING

| Masalah | Solusi |
|---|---|
| `node` tidak dikenal di CMD | Restart PC setelah install Node.js |
| Install gagal / error | Jalankan: `npm install --legacy-peer-deps` |
| Layar putih saat .exe dibuka | Pastikan `vite.config.js` ada `base: "./"` |
| Build gagal di electron-builder | Coba: `npx electron-builder --win --x64` |
| CSV tidak terbaca di Excel | Buka Excel → Data → From Text/CSV → pilih UTF-8 |
| Data hilang setelah update app | Normal — data di AppData tidak terpengaruh update |

---

## CATATAN

- Tidak perlu internet setelah install (offline penuh)
- Data transaksi **tidak hilang** meski aplikasi ditutup
- Menu custom + foto tersimpan permanen di PC
- Untuk backup: copy folder `%AppData%\kasir-warung-nusantara\data\`
