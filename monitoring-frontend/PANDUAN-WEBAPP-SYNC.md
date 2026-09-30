# PANDUAN — Integrasi Web-App (monitoring-frontend) dengan Cloud Sync

> Lanjutan `PANDUAN-PHASE-B.md`. Phase B (backend Supabase) + Phase A (POS) sudah
> selesai. Dokumen ini = cara menjalankan & memakai **web-app** DEN POS Monitor
> yang kini memakai **Supabase Auth + RLS**.

---

## 0. Prinsip (penting)

- **SATU project Supabase milik Anda** untuk semua user. User TIDAK membuat
  project Supabase sendiri — mereka hanya membuat **akun** (username+password)
  di web-app.
- **Isolasi data lewat RLS** di database, bukan di React. User hanya bisa
  membaca store miliknya, walau mengutak-atik `storeId` di browser.
- POS tetap pemilik data; Supabase menerima & menyajikan.

---

## 1. Yang sudah dibuat di web-app

```
monitoring-frontend/
├── .env.example                     # contoh konfigurasi
└── src/
    ├── services/
    │   ├── supabaseClient.js        # client + konversi username→email
    │   ├── authService.js           # daftar, login, logout, ganti password
    │   └── syncService.js           # pairing, daftar perangkat, data sync
    └── components/
        ├── AuthScreen.jsx           # Login + Daftar (ganti Login.jsx lama)
        ├── DevicesView.jsx          # "Hubungkan Perangkat" + daftar/revoke
        ├── SyncDataView.jsx         # transaksi tersinkron
        └── AccountView.jsx          # ganti password sendiri
```

Nav: **Laporan · Riwayat · Data Tersinkron · Perangkat · Akun**

Perubahan arsitektur: **SEMUA halaman** kini membaca dari Supabase —
`App.jsx` memakai sesi Supabase (bukan `localStorage` + Express), dan
Laporan/Riwayat dihitung dari tabel `synced_transactions` (via `reportService`
& `historyService` di `syncService.js`).

✅ **Backend Express (`monitoring-backend`) sudah TIDAK diperlukan** untuk
web-app ini. Tidak perlu menjalankannya. (Kalau sebelumnya error
`Request failed with status code 500`, itu karena web-app masih memanggil
`/api` yang tak ada — sekarang sudah tidak.)

---

## 2. Jalankan migrasi terbaru (WAJIB)

Ada migrasi **baru** `0002_device_management.sql` (RPC revoke/activate device).
Jalankan:

```powershell
supabase db push
```

> Tanpa ini, tombol "Cabut"/"Aktifkan" di halaman Perangkat akan gagal.

Verifikasi di SQL Editor:
```sql
select proname from pg_proc where proname in ('pair_device','revoke_device','activate_device');
-- harus 3 baris
```

---

## 3. Konfigurasi web-app (.env)

Buat file **`monitoring-frontend/.env`** (salin dari `.env.example`):

```env
VITE_SUPABASE_URL=https://uopfinlwlvichryukvng.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key project Anda>
```

Ambil `anon key`: dashboard Supabase → **Settings → API → anon public**.

> ⚠️ Pakai **anon key**, JANGAN `service_role`. Anon key memang untuk browser
> dan aman karena dilindungi RLS.

---

## 4. Setelan Supabase Auth (sekali saja)

### 4a. Matikan konfirmasi email (agar langsung bisa login)
Dashboard → **Authentication → Providers → Email**:
- **Enable Email provider**: ON
- **Confirm email**: **OFF**  ← supaya user bisa langsung login setelah daftar
  (tanpa kirim email). Kalau dibiarkan ON, user harus klik link di email dulu.

> Karena kita memakai email internal (`username@pos.local`) yang bukan email
> sungguhan, **Confirm email sebaiknya OFF**.

### 4b. (Opsional) Auto-confirm untuk uji cepat
Kalau tetap ingin Confirm email ON, konfirmasi manual lewat dashboard:
**Authentication → Users → klik user → Confirm**.

---

## 5. Jalankan web-app

```powershell
cd monitoring-frontend
npm run dev
```

Buka **http://localhost:3000** (port sudah disetel di `vite.config.js`).

---

## 6. Alur pemakaian (dari sisi user)

### 6a. Daftar akun
1. Klik **Daftar** di halaman login.
2. Isi Nama, Username (mis. `admin`), Password (min ≥6), Ulangi password.
3. Klik **Daftar** → langsung masuk dashboard.

> Username otomatis jadi email internal `admin@pos.local`. Anda & user tidak
> perlu tahu detail ini — cukup ketik `admin`.

### 6b. Hubungkan perangkat (pairing)
1. Buka tab **Perangkat**.
2. Di aplikasi POS: **Pengaturan → Sync Cloud → "Daftarkan & Minta Kode"**
   → muncul kode 8 karakter (mis. `9WMF3J99`).
3. Masukkan kode itu di web-app → **Hubungkan**.
4. Berhasil → muncul nama toko; POS mendeteksi dalam ≤5 detik → **auto-sync
   tiap 5 menit mulai jalan**.

### 6c. Lihat data
Tab **Data Tersinkron** menampilkan transaksi yang dikirim POS.

### 6d. Ganti password
Tab **Akun** → isi password baru → Simpan.

---

## 7. Uji isolasi (WAJIB — bukti RLS bekerja)

1. Buat **akun A**, hubungkan **device A** → dapat store A.
2. Buat **akun B** (toko berbeda, device B).
3. Login sebagai **B**, buka **Data Tersinkron** → harus **kosong** (tidak
   melihat data store A).
4. Uji nakal: di console browser (akun B) jalankan:
   ```js
   // tempel di DevTools console saat login sebagai B
   const { data } = await supabase.from('synced_transactions').select('*');
   console.log(data); // HARUS hanya data store B (kosong bila belum ada)
   ```
   Karena RLS, hasilnya tetap terbatas ke store B.

---

## 8. Troubleshooting

| Gejala | Penyebab & solusi |
|---|---|
| "Supabase belum dikonfigurasi" | `.env` belum dibuat / salah. Restart `npm run dev` setelah mengubah `.env`. |
| Login gagal terus padahal password benar | **Confirm email** masih ON. Matikan (langkah 4a) atau konfirmasi user manual. |
| "Username atau password salah" | Cek ejaan; username tidak case-sensitive (otomatis huruf kecil). |
| Kode pairing "Kode salah atau kedaluwarsa" | Kode berlaku 10 menit; minta kode baru di POS. |
| `function digest(text, unknown) does not exist` saat pairing | Bug search_path: `pgcrypto` ada di schema `extensions`, bukan `public`. **Jalankan migrasi terbaru**: `supabase db push` (migrasi `0003_fix_search_path.sql` memperbaikinya). |
| Tombol Cabut/Aktifkan gagal | Migrasi `0002` belum dijalankan (`supabase db push`). |
| Data Tersinkron kosong padahal POS sudah kirim | 1) Perangkat belum paired; 2) cek `select count(*) from synced_transactions` di SQL Editor; 3) pastikan POS sudah `synced_at` terisi. |
| `Request failed with status code 500` / 404 di Laporan/Riwayat | Sudah TIDAK berlaku — semua halaman kini baca Supabase. Kalau masih muncul, **build ulang** (`npm run build`) & **restart** `npm run dev`, lalu hard-refresh browser (Ctrl+Shift+R). |

---

## 9. Catatan & batasan

- **Semua halaman sudah pakai Supabase.** `monitoring-backend` (Express) kini
  tidak dipakai web-app ini. File `services/api.js`, `components/Login.jsx`,
  dan `hooks/useDataSync.js` menjadi *kode lama yang tidak terpakai* — boleh
  dihapus nanti, atau dibiarkan sebagai referensi.
- **Interval auto-update** di footer masih teks statis.
- **Realtime**: belum aktif. Data tersinkron muncul saat halaman dimuat ulang.
  Bisa ditambah dengan `supabase.channel(...)` nanti.
- **Lupa password**: belum ada (butuh email sungguhan / reset manual admin di
  dashboard Supabase → Authentication → Users).
- Satu device → satu store. Bila di-pair oleh user kedua, user itu ikut menjadi
  anggota store yang sama (`store_users`), bukan membuat store baru.
