# Panduan Import Menu dari Excel

Dokumen ini menjelaskan cara mengimpor **menu, bahan baku, resep, dan HPP** sekaligus
ke Kasir Warung / DEN POS lewat satu file Excel (`.xlsx`).

> **Cara cepat**: klik **Import dari Excel** di halaman **Kelola Menu** → pilih file `.xlsx`
> → periksa pratinjau → klik **Terapkan Import**.

---

## Daftar Isi

1. [Ringkasan alur](#1-ringkasan-alur)
2. [Aturan umum](#2-aturan-umum)
3. [Sheet `Menu`](#3-sheet-menu)
4. [Sheet `BahanBaku`](#4-sheet-bahanbaku)
5. [Sheet `Resep`](#5-sheet-resep)
6. [Contoh lengkap 1 menu (harga + resep + HPP)](#6-contoh-lengkap-1-menu)
7. [Resolusi kategori (otomatis dibuat)](#7-resolusi-kategori)
8. [Konflik & keputusan (Simpan lama / Timpa)](#8-konflik--keputusan)
9. [Aturan stok dan modal/HPP](#9-aturan-stok-dan-modalhpp)
10. [Format tipe angka & teks](#10-format-tipe-angka--teks)
11. [Pesan error umum](#11-pesan-error-umum)
12. [Checklist sebelum import](#12-checklist-sebelum-import)
13. [Batas & hal yang belum didukung](#13-batas--hal-yang-belum-didukung)

---

## 1. Ringkasan alur

1. Buka **Kelola Menu** → panel **Import dari Excel**.
2. Klik **Pilih File Excel**, pilih file `.xlsx`.
3. Aplikasi menampilkan **pratinjau**: berapa menu/bahan/resep baru, berapa konflik,
   berapa baris yang error, dan kategori baru yang akan dibuat.
4. Untuk setiap **konflik** (data sudah ada), pilih **Simpan lama** atau **Timpa**.
5. Klik **Terapkan Import** (tombol terkunci bila masih ada konflik yang belum diputuskan).
6. Selesai — ringkasan hasil ditampilkan.

File yang diimpor **tidak** menyentuh data di luar isinya: menu/bahan yang tidak
disebut di Excel dibiarkan apa adanya.

---

## 2. Aturan umum

- **Format file**: `.xlsx` (atau `.xls` lama).
- **Nama sheet**: `Menu`, `BahanBaku`, `Resep`. Tidak harus ada ketiganya — impor
  sheet yang ada saja. Minimal satu sheet dikenali.
- **Nama sheet toleran** terhadap variasi huruf besar/kecil dan spasi:
  - Menu → `Menu`
  - BahanBaku → `BahanBaku`, `Bahan Baku`, `bahanbaku`, `bahan`
  - Resep → `Resep`, `Recipe`
- **Baris ke-1 setiap sheet = header kolom.** Data mulai baris ke-2.
- **Nama kolom toleran**: huruf besar/kecil dan spasi diabaikan.
  Jadi `Nama Bahan`, `namaBahan`, dan `NAMABAHAN` dianggap sama.
- Header harus cukup unik dalam satu sheet (jangan ada dua kolom yang setelah
  dinormalisasi jadi sama).
- Baris kosong diabaikan otomatis.
- Baris yang tidak lolos validasi **tidak menggagalkan** baris lain — ia hanya
  dilaporkan sebagai "baris dilewati".

### Header yang dikenali per sheet

| Sheet | Kolom | Nama header yang diterima (salah satu) |
|-------|-------|----------------------------------------|
| Menu | Nama menu **(wajib)** | `Nama`, `Name`, `Menu` |
| Menu | Kode menu | `menuId`, `menu_id`, `Id`, `Kode` |
| Menu | Kategori **(wajib)** | `Kategori`, `Category` |
| Menu | Harga jual **(wajib)** | `Harga`, `Price`, `HargaJual` |
| Menu | Modal/HPP awal | `Modal`, `HPP`, `HargaPokok` |
| Menu | Stok awal | `Stok`, `Stock` |
| Menu | Satuan | `Satuan`, `Unit`, `Uom` |
| BahanBaku | Nama bahan **(wajib)** | `NamaBahan`, `Nama`, `Bahan`, `Name` |
| BahanBaku | Satuan | `Satuan`, `Unit`, `Uom` |
| BahanBaku | Harga satuan *(wajib ≥ 0)* | `HargaSatuan`, `Harga`, `Harga_satuan`, `Price` |
| BahanBaku | Stok | `Stok`, `Stock` |
| BahanBaku | Stok minimum | `MinStok`, `Min`, `Min_stok`, `Minimal` |
| Resep | Menu **(wajib)** | `menuId`, `menu_id`, `NamaMenu`, `Menu`, `Id` |
| Resep | Bahan **(wajib)** | `NamaBahan`, `Bahan`, `bahanId`, `bahan_id` |
| Resep | Qty **(wajib > 0)** | `qty`, `Jumlah`, `Quantity` |

---

## 3. Sheet `Menu`

Satu baris = satu menu.

| Nama | Menu | Kategori | Harga | Modal | Stok | Satuan |
|------|------|----------|-------|-------|------|--------|
| Kopi Susu | Kopi Susu Gula Aren | Minuman | 18000 | 7000 | 50 | pcs |

Keterangan kolom:

- **Nama** — wajib. Dipakai sebagai kunci pencocokan bila `menuId` kosong.
- **Menu / menuId** — opsional, tapi **sangat disarankan diisi** karena menjadi
  kunci utama pencocokan (lebih andal daripada nama). Bila dikosongkan dan
  namanya sama dengan menu yang ada, akan dianggap konflik.
- **Kategori** — wajib. Boleh kategori yang sudah ada **atau** baru (lihat [bagian 7](#7-resolusi-kategori)).
- **Harga** — wajib, harus **> 0**. Harga jual per satuan utama.
- **Modal** — opsional. Diabaikan bila menu tersebut punya resep (lihat [bagian 9](#9-aturan-stok-dan-modalhpp)).
- **Stok** — opsional. **Hanya berpengaruh untuk menu baru.** Stok menu yang
  sudah ada **tidak** akan ditimpa.
- **Satuan** — opsional, mis. `pcs`, `porsi`, `gelas`.

> Kolom lanjutan (multi-satuan `units`, harga bertingkat `priceTiers`, deskripsi,
> dan foto) **tidak** didukung lewat Excel. Fitur itu tetap ada dan **dipertahankan**
> saat Anda memilih **Timpa** pada menu yang sudah ada.

---

## 4. Sheet `BahanBaku`

Satu baris = satu bahan. Diperlukan bila Anda memakai sheet `Resep`.

| NamaBahan | Satuan | HargaSatuan | Stok | MinStok |
|-----------|--------|-------------|------|---------|
| Biji Kopi | gram | 120 | 5000 | 1000 |
| Susu UHT | ml | 18 | 8000 | 1500 |
| Gula Aren | gram | 25 | 3000 | 500 |

Keterangan:

- Kunci pencocokan = **NamaBahan** (huruf besar/kecil diabaikan). Nama bahan
  duplikat di dalam file = error.
- **HargaSatuan** dipakai untuk menghitung HPP dari resep.
- **Stok** dan **MinStok** default `0` bila kosong.
- Bila bahan sudah ada (nama sama) → muncul sebagai konflik, pilih Simpan lama / Timpa.

---

## 5. Sheet `Resep`

Satu baris = satu **baris bahan** untuk sebuah menu. Jika satu menu memakai 3 bahan,
tulis 3 baris dengan `Menu` yang sama.

| Menu | NamaBahan | qty |
|------|-----------|-----|
| Kopi Susu Gula Aren | Biji Kopi | 18 |
| Kopi Susu Gula Aren | Susu UHT | 150 |
| Kopi Susu Gula Aren | Gula Aren | 20 |

Keterangan:

- **Menu** boleh berupa `menuId` **atau** nama menu. Harus bisa dicocokkan ke
  menu yang ada di file (sheet Menu) atau yang sudah ada di database.
- **NamaBahan** boleh berupa nama bahan **atau** `bahanId`. Harus bisa dicocokkan
  ke bahan di sheet BahanBaku atau yang sudah ada.
- **qty** = jumlah bahan yang dipakai untuk 1 porsi menu, harus **> 0**.
- Resep di file **menggantikan** seluruh resep menu tersebut (bukan menambah).
  Menu lain yang tidak disebut tidak terpengaruh.

---

## 6. Contoh lengkap 1 menu

Berikut contoh **Kopi Susu Gula Aren** lengkap dengan harga, bahan, resep, dan HPP.

### Sheet `Menu`

| Nama | Menu | Kategori | Harga | Modal | Stok | Satuan |
|------|------|----------|-------|-------|------|--------|
| Kopi Susu Gula Aren | KOPI-AREN | Minuman | 18000 | | 50 | gelas |

> `Modal` sengaja dikosongkan karena menu ini punya resep — HPP akan dihitung
> otomatis dari resep.

### Sheet `BahanBaku`

| NamaBahan | Satuan | HargaSatuan | Stok | MinStok |
|-----------|--------|-------------|------|---------|
| Biji Kopi | gram | 120 | 5000 | 1000 |
| Susu UHT | ml | 18 | 8000 | 1500 |
| Gula Aren | gram | 25 | 3000 | 500 |
| Cup 16oz | pcs | 800 | 500 | 100 |

### Sheet `Resep`

| Menu | NamaBahan | qty |
|------|-----------|-----|
| KOPI-AREN | Biji Kopi | 18 |
| KOPI-AREN | Susu UHT | 150 |
| KOPI-AREN | Gula Aren | 20 |
| KOPI-AREN | Cup 16oz | 1 |

### Hasil perhitungan HPP (otomatis)

| Bahan | qty × HargaSatuan | Subtotal |
|-------|-------------------|----------|
| Biji Kopi | 18 × 120 | 2.160 |
| Susu UHT | 150 × 18 | 2.700 |
| Gula Aren | 20 × 25 | 500 |
| Cup 16oz | 1 × 800 | 800 |
| **HPP total** | | **6.160** |

Dengan harga jual **18.000**:

- **Laba kotor** = 18.000 − 6.160 = **11.840**
- **Margin** = 11.840 / 18.000 ≈ **65,8 %**

> HPP dan margin ini dihitung **otomatis** oleh aplikasi dari resep dan harga bahan.
> Anda **tidak** mengisi HPP secara manual saat memakai resep.

---

## 7. Resolusi kategori

- Kategori yang **sudah ada** di aplikasi → langsung dipakai (Bisa ditulis
  sebagai label, mis. `Minuman`).
- Kategori yang **belum ada** → **dibuat otomatis** sebagai kategori baru.
  Tidak perlu membuat kategori dulu sebelum import.
- Kategori yang sama ditulis berulang di banyak baris tetap menjadi **satu**
  kategori (tidak duplikat).
- Pencocokan nama kategori mengabaikan huruf besar/kecil dan spasi berlebih.

---

## 8. Konflik & keputusan

Sebuah baris dianggap **konflik** bila datanya sudah ada (menu dicocokkan lewat
`menuId`/nama; bahan dicocokkan lewat nama).

Untuk setiap konflik, pilih salah satu:

- **Simpan lama** — data existing dibiarkan; baris Excel untuk menu/bahan itu
  tidak disimpan. (Resep baru untuk menu itu tetap bisa masuk.)
- **Timpa** — perbarui data existing dengan data dari Excel.

Tombol **Terapkan Import** tidak aktif hingga semua konflik diputuskan. Ada juga
tombol **Semua: Simpan lama / Semua: Timpa** untuk memutuskan sekaligus.

Saat **Timpa**, kolom yang tidak ada di Excel (deskripsi, foto, multi-satuan,
harga bertingkat) tetap dipertahankan.

---

## 9. Aturan stok dan modal/HPP

Tiga aturan penting yang dijaga aplikasi:

1. **Stok menu existing tidak pernah ditimpa.** Nilai `Stok` di Excel hanya
   dipakai untuk menu yang benar-benar baru. Menu yang sudah ada tetap memakai
   stoknya saat ini, sekalipun Anda memilih **Timpa** (supaya hasil stok opname
   tidak tertimpa balik oleh template lama).
2. **Resep menang atas `Modal`.** Bila sebuah menu punya baris di sheet `Resep`,
   kolom `Modal` di sheet Menu untuk menu itu **diabaikan** — HPP dihitung dari
   resep. `Modal` hanya dipakai untuk menu yang **tidak** punya resep.
3. **Resep menggantikan, bukan menambah.** Baris resep di file menjadi satu-satunya
   sumber resep untuk menu tersebut.

---

## 10. Format tipe angka & teks

- **Angka** boleh memakai pemisah ribuan/titik/`Rp` — pembersih otomatis akan
  mengambil angkanya: `Rp 18.000`, `18,000`, `18000` → `18000`.
- Nilai negatif tidak relevan; pastikan harga dan qty positif.
- Sel berisi formula Excel dibaca sebagai **nilai hasilnya**, bukan formulanya.
- Teks dibersihkan dari spasi di awal/akhir.

---

## 11. Pesan error umum

Baris dengan masalah ditampilkan sebagai **baris dilewati** (tidak menghalangi
baris lain). Contoh pesan:

| Pesan | Arti & solusi |
|-------|----------------|
| `Nama wajib diisi` | Kolom Nama pada baris itu kosong. |
| `Harga harus > 0` | Kolom Harga kosong atau 0/negatif. |
| `Kategori wajib diisi` | Kolom Kategori kosong. |
| `ID/ nama duplikat di dalam file` | Dua baris Menu memakai id/nama sama. |
| `Nama bahan duplikat di dalam file` | Dua baris BahanBaku memakai nama sama. |
| `Harga satuan tidak valid` | HargaSatuan bahan kosong/negatif. |
| `Menu "..." tidak ditemukan` | Nama/`menuId` pada sheet Resep tidak ada di sheet Menu maupun database. |
| `Bahan "..." tidak ditemukan` | NamaBahan/`bahanId` pada sheet Resep tidak ada di sheet BahanBaku maupun database. |
| `qty harus > 0` | Kolom qty resep kosong atau ≤ 0. |

Pesan fatal (menghentikan proses):

- `Sheet tidak dikenali...` — nama sheet bukan Menu/BahanBaku/Resep.
- `Gagal membaca file Excel...` — file rusak atau bukan `.xlsx` valid.

---

## 12. Checklist sebelum import

- [ ] Sheet `Menu` memiliki minimal kolom **Nama, Kategori, Harga**.
- [ ] Setiap baris Menu punya Nama dan Kategori terisi, Harga > 0.
- [ ] Bila memakai resep: sheet `BahanBaku` sudah memuat semua bahan yang dipakai.
- [ ] Nama bahan di sheet `Resep` sama persis dengan di sheet `BahanBaku`
      (atau memakai `bahanId`).
- [ ] Kolom `Menu` di sheet `Resep` cocok dengan `menuId`/nama di sheet `Menu`.
- [ ] Tidak ada `menuId`/nama bahan yang duplikat di dalam file.
- [ ] Sudah memutuskan strategi untuk data yang mungkin konflik (Simpan lama / Timpa).
- [ ] Sudah backup data (Menu → Backup) bila akan menimpa banyak data.

---

## 13. Batas & hal yang belum didukung

Lewat Excel **belum** bisa mengisi/mengubah:

- Multi-satuan (`units`) dan harga bertingkat (`priceTiers`).
- Deskripsi menu (`desc`) dan foto menu.
- Supplier bahan (`supplierId`) — dipertahankan dari data existing saat Timpa.
- Loyalty tier.
- Pengaturan hutang/piutang.

Untuk hal-hal di atas, gunakan editor yang tersedia di aplikasi setelah import.
