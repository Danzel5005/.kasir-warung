# CHANGELOG

Semua perubahan penting pada proyek ini didokumentasikan di file ini.

## v1.2.2

Rilis ini adalah lompatan besar. Fokus utamanya adalah **Sync Cloud (Web Sync)** — menghubungkan aplikasi kasir desktop ke backend cloud berbasis Supabase sehingga penjualan dapat dipantau dari web-app terpisah. Selain itu ada fitur **Meja & Pax**, peringatan **Stok Bahan Baku**, optimasi **Arus Kas**, perombakan **laporan**, serta perbaikan **CSV** dan **resubahan tampilan resi**.

---

###  Fitur Utama Baru

#### 1. Sync Cloud / Web Sync (Fitur Terbesar)

Menghubungkan aplikasi kasir desktop (POS) dengan backend cloud berbasis **Supabase**, agar transaksi yang terjadi di warung dapat dipantau dari **web-app terpisah** (folder `monitoring-frontend/`). Fitur ini bersifat **opsional** — tanpa URL backend dan pairing, aplikasi tetap berjalan normal secara lokal.

**Side POS (aplikasi kasir desktop):**

- **Identitas Perangkat** — modul baru `electron/device-identity.cjs`:
  - Membuat dan menyimpan `deviceId` + `device_secret` pada file `userData/.pos_device` dengan permission ketat.
  - Kredensial `signingKey = hexLower(sha256(device_secret))`.
  - Fungsi `rotate()` untuk mengganti `deviceId` + secret (otomatis membatalkan pairing dan harus pairing ulang).
- **Klien Sync** — modul baru `electron/device-sync-client.cjs`:
  - Menandatangani request dengan **HMAC-SHA256**: `sign = hex(HMAC-SHA256(signingKey, `${ts}.${nonce}.${rawBody}`))`.
  - Mengirim header `ts`, `nonce`, dan `sign`.
  - Memanggil Edge Function POS: `/devices-register`, `/devices-status/<id>`, `/devices-heartbeat`, dan `/sync-upload`.
  - Request GET **tidak** mengirim body, tetapi tetap ditandatangani atas `"{}"`.
- **Layanan Sync** — modul baru `electron/device-sync-service.cjs`:
  - Orkestrasi pairing, heartbeat, dan push transaksi bertanda `synced_at`.
  - Retry saat offline; data tidak hilang ketika internet mati.
- **Auto-Sync setiap 5 menit** — transaksi baru dikirim otomatis selama perangkat sudah dipaired dan URL backend terisi.
- **Bookkeeping `synced_at`** di `electron/db.cjs`:
  - Kolom baru `synced_at DATETIME` pada tabel `transactions`.
  - Migrasi ringan `ensureColumn()` (idempoten) + indeks `idx_trx_synced`.
  - Handler IPC baru: `trx-count-unsynced`, `trx-list-unsynced`, `trx-mark-synced`.
  - Transaksi dianggap belum terkirim selama `synced_at IS NULL`. Transaksi **void tetap dikirim** agar web-app tahu ada koreksi/void.
- **Hook baru `src/hooks/useDeviceSync.js`** — state + aksi UI (register, cek pairing, push manual, ubah URL) dan langganan notifikasi sync.
- **Tab pengaturan baru** `CloudSyncSettingsTab.jsx` — URL Backend, Perangkat Ini (Nama, Device ID + Salin, Dibuat), Pairing Perangkat (tombol "Daftarkan & Minta Kode" → kode pairing 6 karakter), indikator status (Terhubung / Belum terhubung / Gagal kirim), dan status auto-sync "(5 menit)".
- **Perbaikan peringatan perangkat dicabut (revoke)** — commit `7be2e334` menambahkan peringatan yang jelas saat perangkat sudah tidak lagi terhubung.

**Side Cloud (Supabase — folder `supabase/`):**

- **Migration** `0001_init.sql` — tabel `stores`, `devices`, `pairing_codes`, `store_users`, `synced_transactions`, `device_nonces`, beserta RLS dan RPC `pair_device(code)`.
- **Migration** `0002_device_management.sql` — RPC `revoke_device(text)` dan `activate_device(text)`.
- **Migration** `0003_fix_search_path.sql` — perbaikan `search_path` (`public, extensions`) untuk fungsi security definer (pgcrypto).
- **Edge Functions**:
  - `devices-register` — registrasi perangkat.
  - `devices-status` — cek status perangkat.
  - `devices-heartbeat` — keep-alive perangkat.
  - `sync-upload` — unggah batch transaksi.
  - Shared: `_shared/verify.ts` (verifikasi signature + nonce), `_shared/cors.ts`, `_shared/supabase.ts`.
- **`config.toml`** — konfigurasi `verify_jwt=false` untuk keempat fungsi mesin.
- **`sync-parity.test.mjs`** — tes keccocokan/parity skema sinkronisasi.
- **Skrip bantu** di `scripts/`: `sign-request.mjs`, `test-register.mjs`, `test-status.mjs`.

**Side Web-App (folder `monitoring-frontend/`):**

- Integrasi **Supabase Auth + RLS** pada project yang sama.
- Halaman utama: **Laporan**, **Riwayat**, **Data Tersinkron**, **Perangkat** (pairing/revoke), dan **Akun**.
- Perbaikan halaman login agar lebih rapi (commit `5d533f48`).
- Panduan integrasi: `monitoring-frontend/PANDUAN-WEBAPP-SYNC.md` dan `supabase/PANDUAN-PHASE-B.md`.
- Dokumen desain: `updates/PLAN-WEBSYNC.md` dan `updates/PLAN-WEBSYNC-UI-CLOUD.md`.

> ⚠️ **Catatan operasional:** Endpoint Edge Function **tidak** diperbarui otomatis. Setelah mengubah `supabase/functions/**`, jalankan `supabase functions deploy <nama>`. Untuk perubahan `electron/*.cjs`, restart aplikasi POS.

#### 2. Meja & Pax

- Kolom **Table (nomor meja)** dan **Pax (jumlah orang)** kini bisa muncul di halaman Kasir.
- Diaktifkan lewat **Pengaturan → Resi** (`receiptTableEnabled` / `receiptPaxEnabled`).
- Nilai Table & Pax tercetak di struk (baris `Table` dan `Pax`).
- Implementasi: `src/hooks/settings/warung.js` (handler `setReceiptPartyField`), `src/views/ViewKasir.jsx`, dan `src/utilities/receipt.js`.

#### 3. Peringatan Stok Bahan Baku

- Menampilkan peringatan saat stok **bahan baku** sudah menipis.
- Panel peringatan stok terintegrasi sehingga staf tahu bahan apa yang perlu segera ditambah.
- Implementasi: commit `c96611a6`, terkait `src/components/AdvancedDataPanel.jsx`, `src/components/modals/BahanListModal.jsx`, dan utilitas bahan baku.

#### 4. Optimasi Grafik Arus Kas (Cash Flow)

- Komponen baru `src/components/CashFlowShifts.jsx`:
  - Arus kas **per shift aktif**.
  - Modal **"Tampilkan Semua Shift"** dengan pencarian dan paginasi.
  - Menampilkan **Pemasukan per Sumber**, **Pengeluaran per Kategori**, dan **Piutang (outstanding)**.
- Ditambah test `CashFlowShifts.test.jsx`.
- Implementasi: commit `dd5498eb`.

#### 5. Perombakan Laporan (Removal and Renaming)

- Penghapusan dan penamaan ulang beberapa laporan untuk merapikan halaman Laporan.
- `src/views/ViewLaporan.jsx` dirampingkan (perubahan besar).
- Implementasi: commit `a8f03762`.

#### 6. Komponen & Utilitas Baru Lainnya

- **`src/components/modals/ConfirmationModal.jsx`** (baru) — modal konfirmasi yang konsisten.
- **`src/utilities/recipeStock.js`** (baru) — logika murni `producibleQty()`: menghitung berapa porsi sebuah menu yang bisa dibuat dari stok bahan baku (`min floor(bahan.stok / qty)`).
- **`src/views/ViewOpenBill-new.jsx`** (baru) — versi baru tampilan Open Bill.

---

### Perbaikan (Bug Fixes)

- **Perbaikan CSV** (commit `d4bc4015`):
  - `csvLaporan` kini menghitung **opening cash** dan **total expenses** per hari berdasarkan shift yang benar-benar terjadi pada hari tersebut (bukan dari `meta` global).
  - Penanganan angka lebih aman (`Number(...) || 0`) untuk total, modal, dan qty.
  - Perhitungan `cashFinal` dan `totCashFinal` diperbaiki agar konsisten dengan total revenue.
- **Peringatan perangkat dicabut (revoked)** (commit `7be2e334`) — menampilkan peringatan yang jelas saat perangkat sudah tidak terhubung.
- **Perbaikan tampilan resi**:
  - Ringkasan **TOTAL per kategori** dan blok **TAGGED** di footer resi dihapus.
  - Baris item disederhanakan menjadi format `qty x nama` (label kategori tidak lagi disisipkan di nama item).
  - Baris **Table** dan **Pax** ditambahkan pada resi akhir maupun pratinjau.
- **Perbaikan open bill** — penyesuaian alur dan tampilan (`apply-openbill-fix.ps1`, `fix-openbill.ps1`, `ViewOpenBill.jsx`).
- **Perbaikan warung settings** — `useSettings.js` dan `src/hooks/settings/warung.js` diperluas untuk field Meja/Pax.

### ️ Perubahan Teknis & Internal

- `electron/main.cjs` dan `electron/preload.js` — wiring untuk modul device/ sync.
- `src/App.jsx` dan `src/screens/Workspace/ModalStack.jsx` — integrasi hook `useDeviceSync` dan modal baru.
- `src/components/modals/SettingsModal.jsx` — penambahan tab **Sync Cloud**.
- `src/hooks/useCart.js` — penyesuaian untuk alur baru.
- `src/utilities/utils.js` — utilitas baru (±50 baris).
- `src/utilities/resepHpp.js` — penyesuaian.
- Dokumentasi baru: `MONITORING-README.md`, `monitoring-plan.md`, `start-monitor.bat`.
- Test baru/perluasan: `device-identity.test.cjs`, `device-sync-client.test.cjs`, `device-sync-service.test.cjs`, `db.test.cjs`, `CashFlowShifts.test.jsx`.

---

###  Dependensi

- Tidak ada dependensi runtime baru pada paket utama; perubahan `package.json` hanya berkaitan dengan metadata/versi (`1.2.2`).
- Backend cloud memakai **Supabase** (Auth, RLS, Edge Functions, migrations) dan **pgcrypto** (schema `extensions`).

---

### ️ Upgrade dari v1.2.1

- **Database** — saat pertama membuka v1.2.2, kolom `transactions.synced_at` akan ditambahkan otomatis lewat `ensureColumn()` (aman dan idempoten). Tidak perlu langkah manual.
- **Cloud Sync** — fitur baru bersifat opsional. Untuk mengaktifkannya: buka **Pengaturan → Sync Cloud**, isi URL Backend, lalu lakukan pairing perangkat.
- **Meja & Pax** — untuk menampilkan kolom Table/Pax, aktifkan di **Pengaturan → Resi**.
- Setelah update, disarankan **buat backup** sebelum perubahan besar.

---


