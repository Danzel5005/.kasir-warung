# 📖 DEN POS — Buku Panduan Pengguna

**Versi dokumen:** 1.2.2
**Aplikasi:** DEN POS (aplikasi kasir untuk warung, toko, dan usaha kecil)
**Bahasa:** Indonesia
**Untuk:** Pemilik warung, kasir, dan staf — **bukan** untuk programmer.

---

## Selamat Datang 👋

Buku ini adalah **panduan lengkap** cara memakai DEN POS, mulai dari pertama kali menyalakan aplikasi sampai memakai fitur-fitur canggih seperti Cloud Sync dan Loyalty Tier.

Buku ini ditulis dengan bahasa yang **mudah dipahami**. Setiap fitur dijelaskan dengan tiga hal:

1. **Apa itu** fitur ini.
2. **Kapan** kamu memakainya.
3. **Bagaimana** cara memakainya, langkah demi langkah.

> 💡 **Tips:** Kamu tidak perlu membaca dari awal sampai akhir. Kalau bingung dengan satu fitur, langsung lompat ke bagiannya pakai daftar isi di bawah.

---

## Daftar Isi

1. [Kenalan Dulu dengan DEN POS](#1-kenalan-dulu-dengan-den-pos)
2. [Aktivasi Lisensi (Pertama Kali Buka)](#2-aktivasi-lisensi-pertama-kali-buka)
3. [Halaman Login & Mulai Shift](#3-halaman-login--mulai-shift)
4. [Halaman Kasir](#4-halaman-kasir)
5. [Open Bill (Pesanan Belum Dibayar)](#5-open-bill-pesanan-belum-dibayar)
6. [Riwayat Transaksi](#6-riwayat-transaksi)
7. [Laporan](#7-laporan)
8. [Menu (Kelola Menu & Kategori)](#8-menu-kelola-menu--kategori)
9. [Fitur Lanjutan (dan Cara Mengaktifkannya)](#9-fitur-lanjutan-dan-cara-mengaktifkannya)
10. [Cloud Sync (Sync ke Awan / Web Sync)](#10-cloud-sync-sync-ke-awan--web-sync)
11. [Pengaturan (Semua Tab Dijelaskan)](#11-pengaturan-semua-tab-dijelaskan)
12. [Tanya Jawab (FAQ) & Pemecahan Masalah](#12-tanya-jawab-faq--pemecahan-masalah)
13. [Hotkey (Tombol Pintas)](#13-hotkey-tombol-pintas)

---

## 1. Kenalan Dulu dengan DEN POS

### Apa itu DEN POS?

**DEN POS** adalah aplikasi kasir (*Point of Sale*) yang berjalan di komputer/laptop Windows. Aplikasi ini membantu kamu:

- Mencatat penjualan dengan cepat.
- Menghitung total belanja, kembalian, dan diskon otomatis.
- Membuat laporan harian dan laporan per-shift.
- Mencetak struk ke printer thermal.
- Mengelola menu, stok bahan baku, dan resep (supaya tahu keuntungan sebenarnya).
- (Opsional) Mengirim data ke awan (cloud) agar bisa dipantau dari HP/komputer lain melalui web.

### Hal Penting yang Perlu Kamu Tahu

| Istilah | Artinya |
| --- | --- |
| **Shift** | Satu sesi kerja kasir (misalnya shift pagi). Setiap shift punya laporan sendiri. |
| **Open Bill** | Pesanan yang belum dibayar. Bisa ditambahkan pesanan lagi sebelum dibayar. |
| **Void** | Membatalkan transaksi yang sudah dibayar (misalnya pelanggan minta batal). |
| **HPP** | Harga Pokok Penjualan — modal dari sebuah menu. Dipakai untuk menghitung laba. |
| **Bahan Baku** | Bahan mentah untuk membuat menu (misalnya gula, kopi, susu). |
| **Resep** | Daftar bahan baku + jumlahnya untuk membuat 1 menu. |
| **Cloud Sync** | Fitur mengirim data ke server online (Supabase) untuk dipantau dari web. |
| **Fitur Lanjutan** | Fitur-fitur "bonus" yang **harus dinyalakan dulu** sebelum bisa dipakai. |

### Tampilan Umum Aplikasi

Setelah login, kamu akan melihat bagian atas layar yang berisi:

- **Logo warung** (klik logo untuk menggantinya).
- **Menu navigasi:** Kasir, Open Bill, Riwayat, Laporan, Menu, dan (muncul saat fitur lanjutan aktif) Fitur Lanjutan.
- **Badge Shift** — menunjukkan shift yang sedang berjalan.
- **Tombol "Tutup Shift"** — untuk mengakhiri sesi kerja.
- **Tombol "⚙️ Pengaturan"** — **hanya muncul untuk akun admin.**

---

## 2. Aktivasi Lisensi (Pertama Kali Buka)

Saat aplikasi pertama kali dibuka, kamu akan melihat halaman **"Aktivasi Software"**. Ini adalah pengaman agar aplikasi hanya berjalan di komputer yang sudah dibeli lisensinya.

### Langkah-langkah Aktivasi

1. **Lihat HARDWARE ID.**
   Di halaman ini akan muncul **HARDWARE ID** — kode unik yang mewakili komputer ini.

2. **Salin kode.** Klik tombol **Salin** di sebelah Hardware ID. Kode akan tersalin ke clipboard.

3. **Kirim ke penjual.**
   Kirim Hardware ID tersebut ke penjual/vendor tempat kamu membeli DEN POS.

4. **Terima LICENSE KEY.**
   Penjual akan mengirimkan **License Key** dengan format seperti ini:

   ```
   YKK-XXXXX-XXXXX-XXXXX-XXXXX
   ```

5. **Masukkan License Key.**
   Ketik (atau *paste*) License Key ke kolom **LICENSE KEY**.

6. **Klik "Aktifkan Software".**
   Kalau kode benar, aplikasi akan terbuka dan kamu dibawa ke halaman login.

> ⚠️ **Penting:** Lisensi **terikat pada perangkat ini**. Kalau kamu pindah ke komputer/PC lain, lisensi tidak akan berfungsi. Hubungi penjual untuk **reset aktivasi** bila ingin pindah perangkat.

---

## 3. Halaman Login & Mulai Shift

Setelah lisensi aktif, kamu akan masuk ke **halaman login**. Halaman ini juga tempat memulai shift.

### Apa yang Ada di Halaman Login?

- **Logo & nama warung** di bagian tengah.
- Tulisan **"Powered by DEN POS"** di bawah nama warung.
- Kotak **"Shift terakhir"** — menampilkan informasi shift yang terakhir dijalankan (berguna untuk mengetahui kapan terakhir buka).
- Kolom **Username** dan **Password**.
- Ikon **mata (👁)** untuk menampilkan/menyembunyikan password.
- Tombol **"Mulai Shift"**.

### Cara Login

1. Ketik **Username** kamu.
2. Ketik **Password** kamu.
3. (Opsional) Klik ikon mata kalau ingin melihat password yang diketik.
4. Klik tombol **"Mulai Shift"**.

Setelah berhasil, kamu akan masuk ke **halaman Kasir** dan shift akan tercatat mulai berjalan.

### Akun Bawaan (Default)

Saat pertama kali memakai aplikasi, gunakan akun default ini:

| Username | Password | Peran |
| --- | --- | --- |
| `admin` | `admin123` | Administrator (bisa semua hal) |

> 🔒 **Wajib dilakukan:** Segera ganti password default lewat **Pengaturan → Kelola Pengguna → Ganti Password Saya**. Password `admin123` tidak aman untuk dipakai jangka panjang.

### Peran Pengguna (Role)

Ada dua peran di DEN POS:

- **Admin** — bisa membuka **Pengaturan**, mengelola pengguna, melihat laba/modal, dan memakai semua fitur.
- **Kasir (non-admin)** — hanya bisa mengakses Kasir, Open Bill, Riwayat, dan Laporan. **Tidak bisa** membuka Pengaturan.

---

## 4. Halaman Kasir

Ini halaman yang paling sering kamu pakai. Di sini kamu memilih menu dan memproses pembayaran.

### Bagian-bagian Halaman Kasir

1. **Daftar Kategori (kiri).** Menyaring menu berdasarkan kategori (misalnya Makanan, Minuman, Snack).
2. **Kolom Pencarian.** Ketik nama menu untuk menemukannya dengan cepat.
3. **Grid Menu (tengah).** Semua menu ditampilkan sebagai kartu. Setiap kartu menunjukkan nama, harga, dan **Badge Stok** (jumlah stok tersisa).
4. **Tombol Keranjang (FAB).** Tombol bulat untuk membuka keranjang belanja.
5. **Keranjang (Cart Drawer).** Daftar item yang akan dibeli.

### Cara Melakukan Transaksi

1. **Cari menu** dengan klik kategori atau ketik di kolom pencarian.
2. **Klik menu** untuk menambahkannya ke keranjang. Bisa klik beberapa kali untuk menambah jumlah.
3. **Buka keranjang** (klik tombol FAB atau tekan **P**).
4. Periksa daftar belanjaan. Kamu bisa:
   - Mengubah jumlah (qty).
   - Menghapus item.
   - Mengatur **diskon** bila perlu.
5. Isi **pelanggan** (opsional) — bisa untuk pelanggan biasa atau member.
6. Isi **Table** (nomor meja) dan **Pax** (jumlah orang) — **kalau fitur ini diaktifkan** (lihat bab Resi/Pengaturan).
7. Klik tombol **Bayar**.
8. Pilih **Metode Bayar** (Cash, QRIS, Transfer, dll.).
9. Untuk pembayaran **Cash**:
   - Masukkan **jumlah uang diterima**.
   - Aplikasi akan menghitung **kembalian** otomatis.
10. Klik **Konfirmasi** untuk menyelesaikan pembayaran.
11. Struk akan muncul. Klik cetak untuk mencetak ke printer.

### Minuman (Kategori "Drinks")

Menu dengan tag **Drinks** punya perlakuan khusus:

- Saat diklik, akan muncul **Modal Additionals**.
- Di sana kamu memilih:
  - **Ukuran cup** (misalnya Regular, Large).
  - **Tingkat gula** (misalnya Normal, Less Sugar).
  - **Suhu** (misalnya Panas, Dingin).
- Pilihan ini ikut tercatat di struk.

### Peringatan Stok Menipis

- Kalau stok sebuah menu sudah menipis (di bawah batas yang kamu atur di **Pengaturan → Harga → Batas Stok Menipis**), akan muncul **badge peringatan**.
- Ada juga **panel peringatan stok** yang merangkum semua menu yang hampir habis, sehingga kamu tahu apa yang perlu segera ditambah.

---

## 5. Open Bill (Pesanan Belum Dibayar)

**Open Bill** dipakai saat pesanan **belum dibayar**. Cocok untuk warung makan/cafe di mana pelanggan memesan dulu lalu bayar setelah selesai.

### Apa yang Bisa Kamu Lakukan?

- Melihat daftar semua bill yang masih terbuka.
- Melihat berapa lama bill sudah terbuka (contoh: **"12 mnt lalu"**).
- Melihat pratinjau item pada setiap bill.
- **Menambah pesanan** ke bill yang sudah ada.
- **Membayar** bill.
- **Menghapus** satu bill.
- **Menghapus semua** bill sekaligus (hati-hati!).

### Cara Membuat Open Bill

1. Di halaman Kasir, isi keranjang seperti biasa.
2. Alih-alih klik "Bayar", klik tombol untuk **membuat Open Bill**.
3. Bill akan tersimpan dan muncul di daftar **Open Bill**.

### Cara Membayar Open Bill

1. Buka halaman **Open Bill**.
2. Klik bill yang ingin dibayar.
3. Klik **Bayar**.
4. Pilih metode bayar, masukkan uang diterima (untuk cash), lalu konfirmasi.
5. Transaksi pindah ke **Riwayat** dan struk bisa dicetak.

### Cara Menambah Pesanan ke Open Bill

1. Buka bill yang ingin ditambah.
2. Klik **Tambah Pesanan**.
3. Pilih menu tambahan.
4. Simpan — bill akan diperbarui.

---

## 6. Riwayat Transaksi

Halaman **Riwayat** menampilkan semua transaksi yang sudah terjadi. Ini tempat untuk mengecek, mengoreksi, dan mengekspor.

### Fitur-filter dan Tampilan

- **Filter Tanggal** — pilih rentang atau tanggal tertentu.
- **Filter Shift** — lihat transaksi per shift.
- **Kolom per Hari** — daftar bisa dikelompokkan per hari dan bisa dilipat (collapse).
- **Tampilan per Shift** — kalau satu shift punya lebih dari 5 transaksi, daftarnya otomatis dilipat untuk kerapian.
- **Paginasi** — halaman dibagi per halaman agar tidak berat.
- **Ekspor CSV** — unduh data ke file Excel/CSV.

### Void (Membatalkan Transaksi)

Kalau ada transaksi yang perlu dibatalkan (misalnya pelanggan minta batal), gunakan fitur **Void**.

1. Cari transaksi di Riwayat.
2. Klik tombol **Void**.
3. Pilih **alasan void**:

   | Alasan | Keterangan |
   | --- | --- |
   | Pembatalan pelanggan | Pelanggan membatalkan pesanan. |
   | Pengembalian | Uang dikembalikan ke pelanggan. |
   | Kesalahan input | Kasir salah memasukkan pesanan. |
   | Promo gratis | Transaksi digratiskan karena promo. |
   | Lainnya | Alasan lain. |

4. Konfirmasi. Transaksi akan ditandai sebagai **void** dan tercatat di laporan.

> 📝 Transaksi void **tetap tercatat** untuk audit, tetapi tidak dihitung sebagai penjualan.

---

## 7. Laporan

Halaman **Laporan** adalah tempat kamu melihat "kesehatan" usaha: berapa penjualan, apa yang laku, dan berapa labanya.

### Jenis Laporan

- **Laporan per Shift** — menampilkan hasil satu shift tertentu.
- **Laporan Semua Shift** — gabungan dari semua shift.

### Ringkasan yang Ditampilkan

- **Total Penjualan** — total uang masuk dari penjualan.
- **Jumlah Transaksi** — berapa kali transaksi terjadi.
- **Metode Pembayaran** — rincian penjualan per metode bayar (Cash, QRIS, Transfer, dll.).
- **Per Menu** — menu apa saja yang paling banyak terjual.
- **Stok** — informasi stok menu.
- **Sales Rate** — kecepatan/laju penjualan.

### Ekspor CSV

Kamu bisa mengunduh beberapa jenis laporan sebagai CSV (bisa dibuka di Excel):

- CSV per hari.
- CSV laporan lengkap.
- CSV sales rate.
- CSV per menu.
- CSV metode bayar.
- CSV stok.

### Laporan Lanjutan (Harus Dinyalakan Dulu)

Kalau **Fitur Lanjutan** aktif, akan muncul laporan tambahan:

- **Insights (Wawasan Penjualan)** — analisis otomatis tentang polа penjualan.
- **Cash Flow (Arus Kas)** — grafik pemasukan dan pengeluaran per jam/shift.
- **Laporan PDF** — ekspor laporan ke PDF.

> 🔒 **Info:** Untuk akun **kasir (non-admin)**, laporan laba dan modal **disembunyikan**. Hanya **admin** yang bisa melihat angka laba/modal.

---

## 8. Menu (Kelola Menu & Kategori)

Halaman **Menu** dipakai untuk mengatur semua jualanmu: menambah, mengedit, dan menghapus menu serta kategori.

### Mengelola Kategori

1. Buka tab **Kategori**.
2. **Tambah kategori** dengan mengisi nama.
3. Kategori bisa memiliki **tag**, termasuk tag **Drinks** (untuk fitur minuman khusus).
4. Klik kategori untuk **mengedit** atau **menghapus**.

### Mengelola Menu

1. Buka tab **Menu**.
2. Klik **Tambah Menu** dan isi:
   - **Nama menu.**
   - **Harga jual.**
   - **Harga modal** (untuk hitung laba — hanya admin yang bisa lihat).
   - **Stok.**
   - **Barcode** (opsional, kalau pakai scanner).
   - **Kategori.**
   - **Foto menu** (opsional).
3. Simpan. Menu langsung muncul di halaman Kasir.

### Impor Menu & HPP dari Excel

Kalau kamu punya banyak menu, kamu tidak perlu memasukkannya satu per satu. Gunakan **impor Excel**:

1. Siapkan file Excel dengan sheet yang sesuai: **Menu**, **BahanBaku**, dan **Resep**.
2. Buka fitur impor Excel (ada di halaman **Fitur Lanjutan**).
3. Unggah file Excel.
4. Aplikasi akan memberi tahu baris mana yang berhasil dan mana yang ditolak.
5. Setelah selesai, **daftar menu akan otomatis diperbarui** (tidak perlu restart).

Template dan penjelasan format Excel bisa dilihat pada `updates/EXCEL_TEMPLATE.md` dan `updates/TUTORIAL-MENAMBAH-MENU.md`.

---

## 9. Fitur Lanjutan (dan Cara Mengaktifkannya)

Bagian ini **sangat penting**. Banyak fitur keren di DEN POS **dimatikan secara default** agar tampilan tetap sederhana. Untuk memakainya, kamu harus **menyalakan** dulu.

### ➡️ Cara Mengaktifkan Fitur Lanjutan

1. Login sebagai **admin**.
2. Klik tombol **"⚙️ Pengaturan"** di kanan atas.
3. Pilih tab **"Fitur Lanjutan"**.
4. Nyalakan **sakelar utama** ("Nyalakan Fitur Tingkat Lanjut" / *master switch*).
5. Setelah menyala:
   - Muncul menu baru **"Fitur Lanjutan"** di navigasi atas.
   - Muncul tab-tab tambahan di dalamnya.
6. Kamu juga bisa menyalakan/mematikan fitur satu per satu sesuai kebutuhan.

### Fitur-fitur Lanjutan & Kegunaannya

Fitur lanjutan dibagi menjadi beberapa kelompok:

#### 🍳 Bahan Baku, Supplier, dan Resep (HPP)

- **Bahan Baku** — catat bahan mentah (misalnya gula, kopi, susu) beserta satuan, harga beli, dan stoknya.
  - Saat kamu menjual menu, stok bahan baku **otomatis berkurang** sesuai resep.
  - Ada **kolom pencarian**, fitur **lipat semua (collapse all)**, dan **modal detail** untuk setiap bahan.
- **Supplier** — catat daftar pemasok beserta kontak dan catatan.
  - Dilengkapi **pencarian** dan **lipat semua**.
- **Resep & HPP** — tentukan bahan + jumlah untuk membuat 1 menu.
  - Aplikasi menghitung **HPP (modal)** dan **laba** secara otomatis.
  - Ada **panel Resep/HPP** dengan **bar pencarian**.
  - Ada indikator **"bisa dibuat berapa porsi"** berdasarkan stok bahan yang ada.
- **canViewCost** — pengaturan untuk membatasi siapa yang boleh melihat modal/harga pokok (biasanya hanya admin).

#### 🎁 Fitur Pelanggan Tambahan (Loyalty)

- **Loyalty Tier** — program pelanggan setia.
  - Buat tingkatan (misalnya Bronze, Silver, Gold).
  - Setiap tingkatan punya **ambang total belanja** dan **persentase diskon**.
  - Kamu bisa memilih **dasar perhitungan tier**:
    - **Per Transaksi** — berdasarkan nilai transaksi saat itu.
    - **Lifetime** — berdasarkan total belanja seumur hidup pelanggan.
  - Diskon tier otomatis diterapkan saat checkout.

#### 📊 Laporan Tambahan

- **Insights** — wawasan/analisis penjualan otomatis.
- **PDF Report** — ekspor laporan ke PDF.
- **Cash Flow** — arus kas per shift + modal **"Tampilkan Semua Shift"** dengan pencarian dan paginasi. Menampilkan Pemasukan per Sumber, Pengeluaran per Kategori, dan Piutang (outstanding).

#### 📥 Impor Excel

- Impor menu, bahan baku, dan resep sekaligus dari file Excel.

### Piutang dan Penyelesaian Transaksi

- **Buku Hutang / Piutang** — catat pelanggan yang berutang.
- **Settle (Penyelesaian)** — tandai piutang sebagai lunas ketika pelanggan membayar.

---

## 10. Cloud Sync (Sync ke Awan / Web Sync)

**Cloud Sync** menghubungkan aplikasi kasir desktop ini dengan **server online (cloud)**. Tujuannya agar kamu bisa **memantau penjualan dari web** (HP atau komputer lain), walaupun kamu tidak sedang di depan komputer kasir.

> 💡 Fitur ini **opsional**. Tanpa Cloud Sync, aplikasi tetap berjalan normal secara lokal. Aktifkan hanya kalau kamu memang ingin memantau dari jarak jauh.

### Cara Kerjanya (Singkat)

- Aplikasi kasir menyimpan data secara lokal (di komputer).
- Kalau perangkat sudah **dipasangkan (paired)** dan URL backend sudah diisi, aplikasi akan **mengirim transaksi baru ke cloud otomatis setiap 5 menit**.
- Data yang terkirim bisa dilihat di **web-app** (folder `monitoring-frontend`).

### ➡️ Cara Mengaktifkan Cloud Sync

1. Login sebagai **admin**.
2. Buka **Pengaturan → Sync Cloud**.
3. **Isi URL Backend.** Masukkan alamat server cloud (diberikan oleh pihak teknis/penjual). Klik **Simpan**.
4. **Lihat bagian "Perangkat Ini".** Di sana tampil:
   - **Nama perangkat** — kamu bisa ubah sesuai keinginan (misalnya "Kasir Depan").
   - **Device ID** — kode unik perangkat, dengan tombol **Salin**.
   - **Dibuat** — tanggal perangkat didaftarkan.
5. **Pairing Perangkat.**
   - Klik tombol **"Daftarkan & Minta Kode"**.
   - Aplikasi akan menampilkan **kode pairing 6 karakter**.
   - Buka **web-app** pemantau, pilih menu **"Hubungkan Perangkat"**, lalu masukkan kode tersebut.
   - Setelah cocok, perangkat resmi terhubung.
6. **Cek Status.** Di halaman Sync Cloud ada indikator status:

   | Tampilan Status | Artinya |
   | --- | --- |
   | 🟢 **Terhubung** | Perangkat sudah terhubung dan siap mengirim data. |
   | ⚪ **Belum terhubung** | Belum pairing atau belum diisi URL backend. |
   | 🔴 **Gagal kirim** | Ada masalah saat mengirim (misalnya internet mati atau server bermasalah). |

7. **Auto-Sync.** Setelah terhubung, akan muncul keterangan **"(5 menit)"** yang berarti data dikirim otomatis setiap 5 menit. Kamu juga bisa memicu **push manual** kapan saja.

### Kalau Perangkat Dicabut (Revoked)

Kalau admin web melakukan **revoke** (mencabut) perangkat, aplikasi akan menampilkan **peringatan** bahwa perangkat sudah tidak lagi terhubung. Untuk menghubungkan kembali:

1. Lakukan **Pairing Perangkat** ulang dari halaman Sync Cloud (minta kode baru).
2. Masukkan lagi kode pairing di web-app.

### Yang Bisa Dilihat di Web-App Pemantau

Web pemantau (dibuka di browser) punya halaman:

- **Laporan** — ringkasan penjualan.
- **Riwayat** — daftar transaksi yang tersinkron.
- **Data Tersinkron** — semua data yang sudah terkirim dari kasir.
- **Perangkat** — daftar perangkat, pairing, dan revoke.
- **Akun** — pengaturan akun web.

### Catatan Penting untuk Cloud Sync

> ⚠️ **Jangan ubah password akun admin kasir sembarangan** kalau belum yakin — akun web dan kasir saling terkait. Ikuti panduan dari pihak teknis.

- Data yang sudah tersinkron ditandai dengan `synced_at` (waktu sinkron) di sistem.
- Kalau internet mati, transaksi tetap tersimpan lokal dan akan dikirim saat internet kembali.

---

## 11. Pengaturan (Semua Tab Dijelaskan)

Halaman **Pengaturan** **hanya bisa dibuka oleh admin**. Ada 10 tab, dari kiri ke kanan:

1. Printer
2. Nama Warung
3. Metode Bayar
4. QRIS
5. Resi
6. Harga
7. Backup
8. Kelola Pengguna
9. Fitur Lanjutan
10. Sync Cloud

Berikut penjelasan satu per satu.

### 11.1 Tab Printer 🖨️

Mengatur printer thermal untuk mencetak struk.

- **Pilih Printer** — pilih printer yang terhubung ke komputer.
- **Lebar Kertas (mm)** — atur lebar kertas printer, dari **30 sampai 210 mm** (nilai default: **80 mm**).
- Test cetak untuk memastikan printer bekerja.

### 11.2 Tab Nama Warung 🏪

Identitas usaha kamu.

- **Nama Warung** — nama yang tampil di aplikasi dan struk.
- **Alamat** — alamat warung.
- **Telepon** — nomor telepon/WA.

> 💡 Logo warung bisa diganti dengan **mengklik logo** di bagian atas aplikasi.

### 11.3 Tab Metode Bayar 💳

Mengatur cara pelanggan membayar.

- Tambah/edit/hapus **metode pembayaran** (misalnya Cash, QRIS, Transfer, E-Wallet).
- Urutkan metode bayar sesuai keinginan.

### 11.4 Tab QRIS 📱

Mengatur gambar QRIS.

- Upload **gambar QRIS** untuk setiap metode pembayaran yang menggunakan QRIS.
- Gambar ini akan tampil saat pelanggan memilih bayar QRIS.

### 11.5 Tab Resi 🧾

Mengatur tampilan struk.

- **Header Resi** — teks yang muncul di bagian atas struk (misalnya nama warung + ucapan).
- **Footer Resi** — teks di bagian bawah struk (misalnya "Terima kasih telah berbelanja!").
- **Fitur Pelanggan** — nyalakan/matikan fitur pencatatan pelanggan.
- **Pax & Meja** — aktifkan supaya muncul kolom **Table** (meja) dan **Pax** (jumlah orang) di halaman Kasir.
- **Field Resi** — tambah/hapus **field khusus** yang ingin ditampilkan di struk. Setiap field bisa ditandai **Wajib** (harus diisi).

### 11.6 Tab Harga 💰

Mengatur harga dan pajak.

- **Batas Stok Menipis** — batas kapan sebuah menu dianggap "stok menipis" (nilai default: **5**). Kalau stok di bawah angka ini, akan muncul peringatan.
- **Pajak / Service** — atur pajak dan biaya layanan.
- **Diskon Bertingkat** — atur diskon berdasarkan tingkatan (berlapis).

### 11.7 Tab Backup 💾

Melindungi datamu dari kehilangan.

- **Membuat Backup** — simpan salinan data.
- **Melihat Pratinjau Backup** — cek isi backup sebelum restore.
- **Restore Backup** — kembalikan data dari backup (aplikasi otomatis membuat **snapshot keamanan** dulu sebelum restore).
- **Backup Internal** — melihat daftar backup internal.
- **Backup Harian Otomatis** — aplikasi membuat backup harian, dengan **retensi maksimal 30 file** (yang paling lama otomatis dihapus).

> 📌 **Kebiasaan baik:** Buat backup sebelum melakukan perubahan besar (misalnya impor Excel atau restore).

### 11.8 Tab Kelola Pengguna 👥

Mengatur akun yang bisa memakai aplikasi.

- **Ganti Password Saya** — ubah password akunmu sendiri.
- **Tambah Pengguna** — buat akun baru dengan **username**, **password**, **nama**, dan **role** (admin/kasir).
- **Hapus Pengguna** — hapus akun yang tidak diperlukan.
- **Manajemen Pengguna bersifat admin-only** — hanya admin yang bisa mengelola.

### 11.9 Tab Fitur Lanjutan ⭐

Ini sakelar utama untuk fitur-fitur bonus (lihat [Bab 9](#9-fitur-lanjutan-dan-cara-mengaktifkannya)).

- **Master Switch "Nyalakan Fitur Tingkat Lanjut"** — menyalakan/mematikan semua fitur lanjutan.
- **Sakelar per fitur** — untuk menyalakan fitur tertentu saja, seperti bahan baku, supplier, loyalty, insights, dll.

### 11.10 Tab Sync Cloud ☁️

Mengatur koneksi ke cloud (lihat [Bab 10](#10-cloud-sync-sync-ke-awan--web-sync)).

- **URL Backend** — alamat server cloud.
- **Perangkat Ini** — nama, Device ID, dan tanggal dibuat.
- **Pairing Perangkat** — daftar & minta kode pairing.
- **Status** — Terhubung / Belum terhubung / Gagal kirim.
- **Auto-Sync (5 menit)**.

---

## 12. Tanya Jawab (FAQ) & Pemecahan Masalah

### ❓ Lisensi tidak cocok setelah pindah perangkat

Lisensi terikat pada satu perangkat. **Hubungi penjual** untuk reset aktivasi, lalu masukkan License Key baru di perangkat baru.

### ❓ Printer thermal gagal mencetak

1. Pastikan printer sudah **terhubung** dan menyala.
2. Cek **Pengaturan → Printer** — pilih printer yang benar.
3. Sesuaikan **lebar kertas** dengan kertas printer (default 80 mm).
4. Coba test cetak.

### ❓ Scanner barcode tidak mendeteksi

1. Pastikan scanner terhubung dan menyala.
2. Pastikan menu sudah punya **barcode** yang tersimpan.
3. Klik kolom pencarian dulu, baru scan.

### ❓ Data tidak tampil / transaksi hilang

1. Cek file data dan backup.
2. Buka **Pengaturan → Backup**, lakukan **restore** dari backup terakhir kalau perlu.

### ❓ Fitur lanjutan tidak muncul

Pastikan kamu sudah login sebagai **admin** dan sudah menyalakan **master switch** di **Pengaturan → Fitur Lanjutan**. Coba keluar dan masuk lagi kalau masih belum muncul.

### ❓ Impor Excel gagal sebagian

- Pastikan nama sheet benar: **Menu**, **BahanBaku**, **Resep**.
- Pastikan format kolom sesuai template (`updates/EXCEL_TEMPLATE.md`).
- Aplikasi akan memberi tahu baris mana yang ditolak — perbaiki dan ulangi.

### ❓ Transaksi void tidak muncul/hilang dari laporan

Transaksi void **tetap tercatat** tapi tidak dihitung sebagai penjualan. Cek filter tanggal/shift di halaman Riwayat.

### ❓ Cloud Sync tidak terhubung

1. Pastikan **URL Backend** sudah diisi dan disimpan.
2. Lakukan **Pairing Perangkat** ulang bila statusnya "Belum terhubung".
3. Cek koneksi internet.
4. Kalau perangkat pernah di-**revoke**, pairing ulang dengan kode baru.

### ❓ Lupa password admin

Hubungi penjual/pihak teknis untuk bantuan pemulihan akun.

---

## 13. Hotkey (Tombol Pintas)

Supaya lebih cepat, gunakan tombol pintas berikut saat aplikasi aktif:

| Tombol | Fungsi |
| --- | --- |
| **K** | Buka halaman **Kasir** |
| **O** | Buka halaman **Open Bill** |
| **R** | Buka halaman **Riwayat** |
| **L** | Buka halaman **Laporan** |
| **M** | Buka halaman **Menu** |
| **F** | Buka halaman **Fitur Lanjutan** (hanya kalau sudah diaktifkan) |
| **P** | Buka **Keranjang** di halaman Kasir |

> 💡 Tombol pintas ini membuatmu kerja lebih cepat, apalagi saat jam sibuk.

---

## Penutup

Selamat! Kamu sekarang sudah mengenal seluruh fitur DEN POS versi **1.2.2**, mulai dari:

- ✅ Aktivasi lisensi
- ✅ Login & shift
- ✅ Kasir & pembayaran
- ✅ Open Bill
- ✅ Riwayat & Void
- ✅ Laporan & ekspor
- ✅ Kelola Menu & Kategori
- ✅ Fitur Lanjutan (dan cara menyalakannya)
- ✅ Cloud Sync ke web
- ✅ Semua tab Pengaturan

### Saran Penggunaan Sehari-hari

1. **Selalu mulai dengan login** agar shift tercatat.
2. **Tutup shift** di akhir kerja supaya laporan rapi.
3. **Buat backup** setiap hari atau sebelum perubahan besar.
4. **Ganti password default** sesegera mungkin.
5. Kalau stok menipis, **tambah stok** lewat halaman Menu atau impor Excel.

Semoga DEN POS membantu usahamu makin lancar! 🚀

---

*Dokumen ini dibuat untuk DEN POS versi 1.2.2. Fitur bisa berubah pada versi berikutnya — periksa changelog untuk pembaruan.*
