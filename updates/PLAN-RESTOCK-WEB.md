# PLAN — Restock Bahan Baku dari Software + Web App

Tanggal: 2026-10-01 · Branch acuan: `ykk-trial2` (software), `master` (Monitoring)
Status: perencanaan (belum ada kode yang diubah)

---

## 0. Ringkasan keputusan

1. **Restock = event penambahan (delta), bukan menimpa stok.** POS terus mengurangi stok karena penjualan, jadi "set stok = 50" dari web akan menghapus penjualan yang terjadi selama jeda sinkron.
2. **Device A (POS host) tetap arbiter.** Web tidak mengubah angka stok. Web hanya membuat `restock_events` berstatus `pending`; POS yang menarik, menerapkan, lalu mengirim ack. Stok baru baru tampil di web setelah POS mengonfirmasi.
3. **Satu penulis untuk stok bahan baku: renderer.** Alasannya ada di bagian 2.2 (risiko lost update).
4. **Satu Edge Function baru `stock-exchange`** untuk tiga hal sekaligus (kirim snapshot/delta stok, tarik restock pending, kirim ack). Tidak menambah jumlah panggilan dibanding heartbeat terpisah.
5. **Restock dari software memakai jalur yang sama** dengan restock dari web (satu fungsi, satu log), sehingga sekaligus menutup rencana stock-in / `stock_movements`.
6. **Kuota numerik free Supabase cukup** untuk 1–10 toko (bagian 7). Yang menghalangi bukan kuota, tapi: (a) Vercel Hobby tidak boleh untuk komersial, (b) Supabase free tanpa backup otomatis dan bisa pause 7 hari, (c) pola baca web saat ini boros egress.

---

## 1. Temuan dari kode (terverifikasi dengan membaca repo)

Software (`ykk-trial2`):
- Bahan baku disimpan di `bahan-baku.json` lewat IPC `bahan-baku-load` / `bahan-baku-save` (`electron/main.cjs` baris ~112). `bahan-baku-save` menulis **seluruh array**.
- Bentuk data (`src/utilities/bahanBaku.js`): `id, nama, satuan, stok, minStok, hargaSatuan, supplierId, updatedAt`. Tidak ada field versi/revisi.
- `applyBahanDelta` sudah ada: menerapkan delta dan meng-clamp stok ke >= 0. Restock cukup memanggil fungsi ini dengan delta positif.
- Penjualan memotong stok bahan lewat `applyBahanUsage` di `src/hooks/useAdvancedData.js` (renderer).
- Tidak ada log pergerakan stok untuk bahan baku.
- Sync cloud sekarang **satu arah** (POS → cloud) dan hanya untuk transaksi: `device-sync-service.cjs` → `device-sync-client.cjs` → Edge Function `sync-upload`. Timer 5 menit, hanya mengirim jika ada transaksi `synced_at IS NULL`. POS tidak pernah menarik apa pun dari cloud.
- Fungsi `devices-heartbeat` ada di server dan client, tetapi saya tidak menemukan pemanggilnya di `main.cjs` / service (kemungkinan belum dipakai; perlu dikonfirmasi).
- Catatan kecil: komentar di `bahanBaku.js` menyebut data ada di `settings.advancedData.bahanBaku`, sedangkan `main.cjs` memakai file `bahan-baku.json`. Cek mana yang benar sebelum mengerjakan.

Web (`DEN-POS-Monitoring`):
- Membaca Supabase langsung dari browser (PostgREST + RLS). Tidak ada Realtime.
- `RiwayatView` dan `LaporanView` memanggil ulang data tiap 5 menit selama tab terbuka.
- `listTransactions` memilih kolom `payload` penuh (limit default 200); `summary()` memuat limit 5000 baris.
- Hosting: Vercel (`vercel.json` hanya rewrite SPA).

Supabase (migrasi 0001–0003): `stores, devices, pairing_codes, store_users, synced_transactions, device_nonces`, helper RLS `can_access_store()`, RPC `pair_device / revoke_device / activate_device`. Auth mesin = HMAC di Edge Function (`_shared/verify.ts`), JWT dimatikan untuk fungsi mesin.

---

## 2. Desain inti

### 2.1 Alur restock dari web

```
Web (owner/staff)
  └─ RPC submit_restock(batch)            → restock_events (status = pending)
POS (tiap 60 detik, atau segera bila ada hasil)
  └─ POST stock-exchange                  ← daftar pending
  └─ main → renderer: "restock-incoming"
  └─ renderer: applyBahanDelta(+qty) + simpan + catat movement
  └─ POST stock-exchange { ack: [...] }   → restock_events (applied | rejected)
                                          → ingredients (stok terbaru)
Web (Realtime) ← status berubah, stok baru tampil
```

Status: `pending → applied | rejected | cancelled`.
- `cancelled`: hanya dari web, hanya saat masih `pending`.
- `rejected`: dari POS, dengan alasan (`BAHAN_NOT_FOUND`, `INVALID_QTY`).
- POS offline: event tetap `pending` tanpa kedaluwarsa otomatis; web menampilkan banner "POS offline, akan diterapkan saat online".

### 2.2 Aturan penulis tunggal (risiko terbesar)

Hook `useAdvancedData` menyimpan daftar bahan di state React dan menyimpan **seluruh daftar** setiap perubahan. Jika main process menulis `bahan-baku.json` langsung saat menerapkan restock web, state renderer yang lama akan menimpanya pada penyimpanan berikutnya (lost update, restock hilang diam-diam).

Maka:
- Main process hanya **menarik dan meneruskan** event ke renderer lewat IPC (`restock-incoming`).
- Renderer menerapkan lewat jalur yang sama dengan restock manual, menyimpan, lalu memanggil `restock-ack` ke main.
- Main baru mengirim ack ke cloud setelah renderer mengonfirmasi tersimpan.

### 2.3 Idempotensi

- `restock_events.id` (uuid) dibuat di web sebelum kirim → tombol kirim ganda dan retry tidak membuat event ganda.
- Pengiriman event ke POS bersifat at-least-once; penerapan harus exactly-once. POS menyimpan `event_id` di tabel SQLite `ingredient_movements` (kolom `event_id UNIQUE`).
- Urutan di POS: **catat movement dulu (INSERT OR IGNORE), baru terapkan stok.** Jika crash di antara keduanya, hasilnya stok kurang (terlihat di log, mudah dikoreksi), bukan stok lebih (diam-diam salah). Beri komentar `ponytail:` di kodenya: celah ini hilang kalau bahan baku dipindah ke SQLite satu transaksi.

### 2.4 Selaras dengan rencana yang sudah ada

- `ingredient_movements` (lokal, SQLite) = versi minimal dari `stock_movements` yang sudah direncanakan. v1 hanya mencatat `restock`, `adjust`, dan `undo`. Pemotongan karena penjualan **tidak** dicatat di sini (sudah ada di transaksi).
- Restock dari Device B (LAN, non-admin) masuk lewat kanal LAN yang sudah ada ke host, lalu diproses sama seperti restock lokal. Device A tetap menerima notifikasi real-time untuk setiap perubahan stok oleh device lain (sesuai revisi sebelumnya).
- Tidak menyentuh: `sync-upload`, `.ykk_lic`, alur lisensi, fitur diskon, protokol LAN.

---

## 3. UX Software (Device A)

Lokasi: Fitur Lanjutan → Bahan Baku (admin; Device B non-admin hanya jika diberi izin).

1. **Tombol "Restock" per baris** → modal kecil:
   - Bahan (terisi), jumlah tambahan (angka, satuan ditampilkan read-only), catatan (opsional), harga beli per satuan (opsional; kotak centang "perbarui harga satuan", default mati).
   - Setelah simpan: toast "Gula +10 kg → stok 25 kg" dengan **Undo 9 detik** (pola yang sama dengan hapus semua transaksi). Undo = movement koreksi negatif, bukan menghapus log.
2. **Restock massal**: tombol "Restock Banyak" → tabel isian multi-baris (cari bahan, jumlah) → satu simpan.
3. **Panel "Perlu restock"**: memakai `lowStockBahan` yang sudah ada. Saran jumlah = `targetStok - stok` bila `targetStok` terisi, kalau tidak `minStok × 2 - stok` (butuh konfirmasi, lihat bagian 10).
4. **Kotak masuk "Restock dari Web"**: daftar event yang masuk, dengan status (diterapkan / ditolak + alasan). Toast + badge saat ada yang baru: "Restock dari Web: Gula +10 kg".
5. **State wajib**: loading (sedang menerapkan), kosong ("Belum ada restock"), sukses, gagal (pesan jelas, tidak mengubah stok), tombol nonaktif saat proses (cegah klik ganda).
6. Sync Cloud (Settings): tambah baris status "Stok terakhir terkirim: 2 menit lalu" dan "Restock web menunggu: N".

---

## 4. UX Web (Monitoring)

Tab baru **"Stok Bahan"** di `Dashboard.jsx` (mobile-first; pemilik kemungkinan memakai ponsel).

**Daftar stok**
- Pencarian + filter chip: Semua / Menipis / Habis.
- Baris: nama, stok + satuan, minimum, badge status. Chip kuning "+10 menunggu POS" bila ada event pending.
- **Indikator kesegaran**: "Data dari POS 2 menit lalu" (dari `ingredients.pos_updated_at` / `devices.last_seen_at`). Merah bila > 15 menit atau POS offline, supaya pemilik tidak percaya angka basi.

**Restock**
- Tombol "Restock" per baris → bottom sheet: jumlah (stepper + chip +1/+5/+10), catatan, harga beli opsional.
- **Keranjang restock**: bar bawah "3 bahan · Kirim". Satu kirim = satu `batch_id`. Ringkasan konfirmasi sebelum kirim.
- Setelah kirim: tab **Riwayat Restock** dengan timeline status (menunggu → diterapkan/ditolak), tombol "Batalkan" selama masih pending.
- Hak akses: `owner` dan `staff` boleh restock; `viewer` hanya membaca (diambil dari `store_users.permission`).
- Error: POS offline (banner, tetap boleh kirim), gagal kirim (data keranjang tidak hilang, bisa coba lagi), sesi habis (arahkan login).

**Import / Export (web)**
- Export `.xlsx` (reuse `utils/excelExport.js`, SheetJS sudah ada):
  - Sheet `Stok`: id, nama, satuan, stok, minStok, hargaSatuan, status.
  - Sheet `Daftar Belanja`: bahan menipis + saran jumlah, dikelompokkan per supplier.
  - Riwayat Restock (filter tanggal).
- Import `.xlsx` template **Restock**: kolom `bahanId` (atau `nama`), `qty`, `hargaSatuan` (opsional), `catatan`.
  - Pencocokan: `bahanId` dulu, lalu nama persis (tidak peka huruf besar). Ambigu atau tidak ketemu = baris error.
  - **Pratinjau** sebelum kirim, mengikuti pola impor Excel di software: baris valid / error / peringatan. `qty` selalu berarti **tambahan**, tidak pernah menimpa stok.
  - Batas 500 baris per berkas. Hasil submit sebagai satu batch.
  - Tombol "Unduh template" (berisi bahan saat ini dengan qty kosong).

**Import/Export (software)**: v1 cukup form UI. Impor Excel restock di software (sheet `Restock` di `src/utilities/excelImport.js`) ditunda ke v1.1 karena pola dan validatornya sudah ada dan bisa dipakai ulang.

---

## 5. Supabase

### 5.1 Migrasi `0004_restock.sql` (additive, tidak mengubah tabel lama)

```sql
create table ingredients (
  store_id uuid not null references stores(id) on delete cascade,
  ingredient_id text not null,
  nama text not null, satuan text,
  stok numeric(14,3) not null default 0,
  min_stok numeric(14,3) not null default 0,
  harga_satuan numeric(14,2) not null default 0,
  supplier_id text, supplier_nama text,
  pos_updated_at timestamptz, synced_at timestamptz not null default now(),
  primary key (store_id, ingredient_id)
);

create table restock_events (
  id uuid primary key,                       -- dibuat client = kunci idempotensi
  store_id uuid not null references stores(id) on delete cascade,
  batch_id uuid not null,
  ingredient_id text not null,
  qty numeric(14,3) not null check (qty > 0),
  harga_satuan numeric(14,2), note text,
  status text not null default 'pending',    -- pending|applied|rejected|cancelled
  reject_reason text, stok_after numeric(14,3),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  applied_at timestamptz, applied_by_device text
);
create index on restock_events (store_id, status, created_at);
```

- RLS: `select` untuk anggota store (`can_access_store`). **Tidak ada policy insert/update/delete** untuk web.
- RPC `submit_restock(p_batch jsonb)` (`security definer`, `search_path = public, extensions`): cek `can_access_store` + permission owner/staff; validasi `0 < qty <= 1_000_000`, bahan ada di `ingredients`, maksimal 200 baris per panggilan, maksimal 500 event `pending` per store; insert; kembalikan `batch_id`.
- RPC `cancel_restock(p_id uuid)`: hanya bila `status = 'pending'`.
- Realtime: tambahkan `ingredients` dan `restock_events` ke publication `supabase_realtime` (RLS tetap berlaku).
- Retensi (pg_cron): hapus `restock_events` berstatus `applied/rejected/cancelled` lebih dari 180 hari; bersihkan `device_nonces` (sudah ada catatannya di 0001).

### 5.2 Edge Function `stock-exchange` (HMAC, `verify_jwt = false`, daftarkan di `config.toml`)

Request (POS → cloud), memakai `verifySignedRequest` yang sudah ada:
```json
{
  "deviceId": "dev_xxx",
  "mode": "delta | full",
  "rows":    [{ "id","nama","satuan","stok","minStok","hargaSatuan","supplierId","updatedAt" }],
  "deletedIds": ["..."],
  "ack":     [{ "eventId","status":"applied|rejected","reason","stokAfter" }]
}
```
Response:
```json
{ "ok": true, "needFull": false,
  "pending": [{ "id","ingredientId","qty","hargaSatuan","note","createdAt" }] }
```
Perilaku:
1. `upsert` ke `ingredients` (kunci `store_id, ingredient_id`); `deletedIds` dihapus.
2. `ack`: `update restock_events set status=… where id=… and store_id=… and status='pending'` (idempotent; ack ulang tidak berdampak).
3. Balikan maksimal 100 event `pending` tertua.
4. `needFull = true` bila tabel `ingredients` store masih kosong (pairing baru atau data hilang), sehingga cloud bisa pulih sendiri dari POS.
5. Perbarui `devices.last_seen_at` (menggantikan kebutuhan heartbeat terpisah).
6. Batas: body 256 KB, `rows` maksimal 2000 (sama dengan `sync-upload`).

### 5.3 Yang tidak diubah / dikurangi
- `sync-upload`, `devices-register`, `devices-status`: **tidak diubah** (menjaga blast radius).
- `devices-heartbeat`: tidak perlu dipanggil terpisah (digantikan `stock-exchange`).

---

## 6. Perubahan kode per file

Software:
- `electron/device-sync-client.cjs`: tambah `stockExchange(payload)` (pola sama dengan `push`).
- `electron/device-sync-service.cjs`: tambah `exchangeStock()` + timer 60 detik (hanya jika paired). Backoff 60 → 120 → 300 detik saat gagal; jika respons berisi `pending`, ulangi segera (maksimal 5 putaran). Notifikasi gagal memakai `notify` yang sudah ada.
- `electron/main.cjs`: provider delta stok (bandingkan hash per bahan dengan `stock-sync-state.json`, jadi tidak perlu flag dirty di setiap penyimpanan), IPC `restock-ack`, kirim `restock-incoming` ke renderer, tabel `ingredient_movements`.
- `electron/preload.js`: ekspos `onRestockIncoming`, `restockAck`.
- `src/hooks/useAdvancedData.js`: `restockBahan(lines, { source })` memakai `applyBahanDelta` delta positif; satu jalur untuk manual, web, dan Device B.
- `src/utilities/bahanBaku.js`: field opsional `targetStok` (bila disetujui).
- View Bahan Baku di `src/views/` (cek nama berkas saat implementasi): modal restock, restock massal, panel "Perlu restock", kotak masuk web.
- Flag fitur: `advancedFeatures.remoteRestock` (default mati) agar bisa dimatikan tanpa rilis ulang.
- Test: `bahanBaku` (delta positif, clamp), `device-sync-service` (exchange, backoff, ack hanya setelah renderer konfirmasi), idempotensi `event_id`.

Web:
- Baru: `components/StokView.jsx`, `RestockSheet.jsx`, `RestockImportModal.jsx`, `services/stockService.js`, `utils/restockExcel.js`.
- Ubah: `Dashboard.jsx` (tab), `services/syncService.js` (tidak dipakai langsung; stok punya service sendiri).
- Perbaiki (lihat bagian 7.3): `RiwayatView`, `LaporanView`, `listTransactions`, `summary()`.

---

## 7. Perhitungan data dan kecukupan plan free

### 7.1 Asumsi (ubah sesuai kondisi nyata)
- 1 toko, 1 POS host (Device B LAN tidak berbicara ke cloud), menyala 14 jam/hari, 30 hari/bulan.
- 300 transaksi/hari, ±2 KB per transaksi di Postgres (JSONB + indeks).
- 150 bahan baku, ±180 byte per baris.
- Pemilik membuka web ±10 kali/hari; 20 restock/hari.

### 7.2 Per toko per bulan

**Invocation Edge Function** (batas free: 500.000)

| Sumber | Hitungan | Per bulan |
|---|---|---|
| `stock-exchange` tiap 60 dtk | 14 × 60 × 30 | 25.200 |
| `sync-upload` (maks. tiap 5 mnt) | 14 × 12 × 30 | 5.040 |
| Panggilan web (RPC / PostgREST) | bukan Edge Function | 0 |
| **Total (terburuk)** | | **≈ 30.200 (6%)** |

Kapasitas ≈ 16 toko. Dengan interval 120 detik: 17.640/bulan → ≈ 28 toko.

**Data masuk dari POS** (ingress, gratis): transaksi ±13,5 MB + delta stok (±100 push/hari × ±2 KB) ±6 MB + snapshot penuh ±2,4 MB + permintaan kosong ±10 MB ≈ **±32 MB/bulan**.

**Egress Supabase** (batas free: 5 GB)

| Sumber | Per bulan |
|---|---|
| Respons `stock-exchange` (±0,5 KB × 840/hari) | ±13 MB |
| Web: tab Stok (±35 KB × 10/hari) | ±10 MB |
| Web: Riwayat/Laporan **setelah perbaikan** 7.3 | ±60 MB |
| **Total** | **±85 MB (±2% dari 5 GB)** |

**Ukuran database** (batas free: 500 MB)
- Transaksi: 300 × 30 × 2 KB ≈ **18 MB/bulan** ≈ 216 MB/tahun.
- `ingredients` ≈ 60 KB; `restock_events` ≈ 2 MB/tahun. Diabaikan.
- Sensitivitas transaksi: 100/hari ≈ 6 MB/bln · 300/hari ≈ 18 MB/bln · 1000/hari ≈ 60 MB/bln (500 MB habis < 8 bulan).
- Dengan retensi `payload` mentah 90 hari + agregat harian (`daily_sales`): ±54 MB per toko → ±6–8 toko muat di 500 MB (sisakan ruang untuk overhead dasar Postgres).

**Realtime** (batas free: 200 koneksi, 2 juta pesan/bulan): ±800 perubahan baris/hari × 30 × ±3 penonton ≈ 72.000 pesan (±3,6%). Koneksi: hanya tab web yang terbuka.

### 7.3 Masalah egress yang sudah ada di web (perlu diperbaiki, tidak terkait restock)

- `listTransactions` memilih `payload` penuh: ±200 × 1,5 KB ≈ **300 KB per muat**. Dengan refresh 5 menit selama 14 jam = 168 muat ≈ **±50 MB/hari ≈ 1,5 GB/bulan untuk satu tab yang dibiarkan terbuka**. Dua tab = 3 GB.
- `summary()` memuat limit 5000 baris ≈ **±7,5 MB per panggilan**. Bila Dashboard memanggilnya berkala, 5 GB habis dalam hitungan hari (cek apakah dipanggil).
- Perbaikan (tanpa menyentuh software):
  1. Pilih hanya kolom yang dipakai daftar (id, waktu, total, metode, status); ambil `payload` hanya saat detail dibuka.
  2. Paginasi 50 baris.
  3. Hentikan refresh saat tab tersembunyi (`document.visibilityState`) atau ganti dengan Realtime insert.
  4. Laporan: RPC agregat sisi server (harian/per metode/top produk) alih-alih menarik ribuan baris.

### 7.4 Hosting web (Vercel)

- Beban Vercel hanya berkas statis SPA (Supabase dipanggil langsung dari browser, tidak lewat Vercel). Bundel perkiraan ±1 MB (React + recharts + xlsx + supabase-js; **ukur dengan `npm run build`**). 5 pengguna × 3 muat/hari × 30 ≈ 450 muat ≈ **±0,5 GB/bulan** dari 100 GB; Edge Requests jauh di bawah 1 juta.
- **Masalah lisensi, bukan kuota:** per sumber yang saya temukan, plan Hobby Vercel hanya untuk penggunaan personal non-komersial, dan produk ini sudah dijual. Pilihan: (a) Vercel Pro $20/seat/bulan; (b) Cloudflare Pages atau Netlify free (sumber menyebut komersial diizinkan; bandwidth Cloudflare tidak dibatasi). Migrasi mudah karena ini SPA statis: ganti `vercel.json` dengan aturan fallback (`/* /index.html 200`) dan arahkan DNS `kasir-masak.my.id`. Verifikasi syarat layanan terbaru sebelum memutuskan.

### 7.5 Kesimpulan kecukupan

| Aspek | Free cukup? |
|---|---|
| Edge invocations, egress, Realtime (1–10 toko) | Ya, dengan desain di atas |
| Database 500 MB | Ya untuk 1–2 toko tanpa retensi; 6–8 toko dengan retensi 90 hari |
| Hosting Vercel Hobby | **Tidak sah untuk produk komersial** → pindah host atau Pro |
| Backup & keandalan Supabase free | **Risiko**: tanpa backup otomatis, tanpa SLA, pause bila 7 hari tanpa aktivitas |

Soal risiko Supabase: karena Device A arbiter dan cloud hanya mirror, kehilangan data cloud tidak menghilangkan data toko. Stok pulih otomatis dari POS (`needFull`), riwayat transaksi pulih dengan menandai ulang `synced_at`. Pause terjadi bila toko tutup > 7 hari; POS yang menyala setiap hari menjaga proyek tetap aktif. Naik ke Pro ($25/bulan) disarankan begitu ada pelanggan berbayar yang bergantung pada monitoring, atau bila salah satu terpenuhi: egress > 4 GB, DB > 400 MB, invocation > 400.000/bulan, atau ≥ ±10 toko.

---

## 8. Fase implementasi

| Fase | Isi | Selesai bila |
|---|---|---|
| 0 | Perbaikan egress web (7.3) + keputusan hosting | Egress web terukur turun; host sesuai lisensi |
| 1 | Restock lokal di software: modal, massal, `ingredient_movements`, Undo | Restock dari software tercatat dan bisa di-undo; test lulus |
| 2 | Migrasi `0004` (tabel `ingredients`) + `stock-exchange` mode kirim saja + tab Stok web **read-only** | Stok di web mengikuti POS, ada indikator kesegaran |
| 3 | `restock_events` + RPC + tarik/ack + penulis tunggal renderer + Realtime status | Restock web masuk ke POS tepat sekali, termasuk saat POS offline lalu online |
| 4 | Import/export Excel web (+ opsional software v1.1) | Template, pratinjau, dan batch berjalan |
| 5 | Notifikasi ke Device A, restock dari Device B lewat LAN | Notifikasi real-time muncul untuk setiap perubahan stok |

Rollback: semua migrasi additive; fitur di balik flag `remoteRestock`; `sync-upload` tidak disentuh sehingga sinkron transaksi tetap berjalan bila fitur dimatikan.

---

## 9. Risiko dan peringatan

1. **Lost update stok** bila main process menulis `bahan-baku.json` langsung (2.2). Wajib satu penulis.
2. **Stok web basi** menyesatkan pemilik. Indikator kesegaran wajib ada, dan stok tidak berubah sebelum POS menge-ack.
3. **Restock tanpa persetujuan** bisa tidak sesuai barang fisik yang datang. v1: langsung diterapkan + notifikasi + Undo/koreksi di POS. Mode "perlu persetujuan di POS" bisa ditambah nanti (tidak dibuat sekarang agar tidak menambah kompleksitas).
4. **Crash di antara catat movement dan terapkan stok** menyebabkan stok kurang (disengaja; terlihat di log).
5. **Satuan desimal** (kg, liter): `numeric(14,3)` di cloud; di POS `stok` sudah `Number`, hati-hati pembulatan floating point saat penjumlahan (bulatkan ke 3 desimal setelah delta).
6. **Anon key ada di browser**: RLS dan RPC `security definer` adalah satu-satunya pengaman. Uji dengan dua user di dua store berbeda sebelum rilis.
7. **Beban 60 detik per perangkat**: dikalikan jumlah toko. Pantau invocation; interval bisa dinaikkan jadi 120 detik lewat konfigurasi tanpa rilis ulang (simpan di `device-sync.json`).

---

## 10. Keputusan yang masih dibutuhkan

1. Restock web langsung diterapkan (usulan) atau perlu persetujuan di POS? persetujuan lagi di POS, munculkan di atas "BAHAN BAKU" bahwa ada restock datang, jika di pencet akan memunculkan semua stok yang akan datang, lalu pilih terima/tidak
2. Tambah field `targetStok` per bahan, atau saran restock cukup `minStok × 2 - stok`?
3. Saat restock, apakah harga beli boleh memperbarui `hargaSatuan` (usulan: opsional, default mati)? Catatan: `hargaSatuan` memengaruhi HPP resep: iya
4. Siapa yang boleh restock di web: `owner` + `staff` (usulan) atau hanya `owner`?: owner + staff, sekalian dari POS bisa melihat akun siapa yang terhubung dari web, dan menentukan otoritasnya (manager, staff, admin), jadi muncul "Terima [nama-user] sebagai manager/staff/admin yang nyangkut di POS dan akun web app
5. Interval tarik 60 detik sudah cukup, atau perlu lebih cepat (lebih boros invocation)?
