# Rencana Implementasi — Sinkronisasi Multi-Device via Jaringan Lokal (LAN)

Status: **Rencana, belum ada kode ditulis.** Disusun dari inspeksi langsung repo
`https://github.com/Danzel5005/.kasir-warung` (branch master, commit saat plan ini dibuat).
Dokumen ini jadi acuan sebelum eksekusi via Engineer Agent.

Keputusan yang sudah dikonfirmasi (revisi terbaru):
- Topologi **Host–Client**. Device A (admin) selalu jadi Host. Bukan role yang bisa
  saling tukar/auto-election — Device A eksplisit "Mulai Hosting" dari Settings.
- **Pairing/aktivasi device baru menyatu dengan alur License Key**, bukan mekanisme
  terpisah — device non-admin yang belum punya License Key diaktifkan lewat Device A,
  bukan lewat license key mandiri.
- **Device A jadi satu-satunya sumber kebenaran untuk stok** (produk & bahan baku).
  Semua device lain query/patuh ke angka stok Device A, bukan punya salinan otoritatif sendiri.
- Device A **wajib menyala selama toko beroperasi** — ini diterima sebagai constraint operasional,
  bukan hal yang perlu direkayasa supaya hilang.
- Kalau Device A offline, non-admin **fallback ke data lokal miliknya sendiri** (sudah
  diputuskan/diterima risikonya oleh Danzel — lihat §5.3, tidak perlu solusi tambahan di luar itu).
- Sinkronisasi stok **hanya delta transaksi**, bukan dump seluruh tabel stok — minimalkan
  data yang berpindah demi performa.

---

## 1. Ruang Lingkup

1. Device A (Host, admin, sudah login) menemukan device lain yang menjalankan DEN POS
   tapi **belum** punya License Key.
2. Device tanpa License Key punya opsi baru di halaman aktivasi: **"Aktifkan Aplikasi
   Melalui Device Lain"** — alternatif dari input License Key manual.
3. Device tersebut menemukan Device A via LAN, menekan **"Ikuti"**, lalu menunggu di-terima.
4. Device A melihat daftar device yang "mengikuti", dan **assign akun non-admin** (yang
   sudah dibuat di Device A) ke tiap device yang diterima.
5. Setelah di-assign: device tersebut menerima data awal (menu, kasir, open-bill) dari
   Device A, lalu beroperasi sebagai kasir non-admin yang tersambung ke Device A.
6. Device A menerima transaksi & perubahan open-bill dari semua device yang sudah di-assign.
7. Stok (produk & bahan baku) diotorisasi oleh Device A — device lain tidak pernah jadi
   sumber kebenaran stok, hanya menampilkan angka yang disinkronkan dari Device A.

Di luar scope: multi-lokasi via internet (WAN), akun admin kedua sebagai Host cadangan,
dan resolusi otomatis stok minus saat Device A sempat offline (lihat §5.3 — ini sengaja
tidak diotomasi, cukup ditampilkan untuk direkonsiliasi manual).

---

## 2. Kondisi Sistem Saat Ini yang Relevan (hasil inspeksi repo)

- **License system** (`electron/license.cjs`, `src/screens/LicenseScreen.jsx`,
  `src/hooks/useLicense.js`): device generate Hardware ID lokal (`node-machine-id`),
  license key divalidasi murni lokal (`generateKey(hwid) === key`, disimpan di file
  `.ykk_lic`). Tidak ada pemanggilan server apa pun — ini murni offline-verifiable.
  **Alur aktivasi-via-device-lain yang baru harus jadi jalur kedua yang terpisah**, tidak
  boleh mengubah format `.ykk_lic` atau logika `checkLicense`/`activateLicense` yang sudah
  ada (Rule "preserve existing behavior") — device yang lisensinya standalone harus tetap
  jalan seperti sekarang.
- `LicenseScreen.jsx` saat ini: input Hardware ID (read-only, tombol salin) + input License
  Key + tombol aktivasi. Tombol baru **"Aktifkan Aplikasi Melalui Device Lain"** ditaruh di
  bawah tombol aktivasi existing, sebagai opsi kedua — bukan menggantikan.
- Storage tetap `better-sqlite3` per device (`kasir.db`), `transactions`/`shifts` sebagai
  blob JSON, `products` sudah kolom granular (termasuk stok) — cocok untuk kirim delta
  per-kolom, bukan blob.
- Bug P0 belum kefix: `ViewLaporan.jsx` salah hitung total shift karena data terpaginasi.
  Tetap jadi prasyarat sebelum fase agregasi Riwayat (§7 Fase 0) — sekarang risikonya lebih
  kecil karena semua data memang sudah ngumpul di Device A, tapi bug ini tetap harus beres
  dulu supaya tidak ikut ke perhitungan Riwayat lintas-device.

---

## 3. Alur Pairing & Aktivasi (detail teknis dari 9 langkah)

| # | Langkah | Detail teknis |
|---|---|---|
| 1 | Device A login sebagai admin | tidak ada perubahan di flow login existing |
| 2 | Device A: Settings → seksi baru **"Hosting"** → tombol **"Mulai Hosting"** | Menjalankan: WebSocket server (`ws`) + mDNS advertise (`bonjour-service`) dengan nama device + `hostId` (turunan `node-machine-id` Device A, namespace terpisah dari license) |
| 3 | Device A menemukan device lain yang **belum** punya License Key | Sebetulnya arahnya kebalik: Device A tidak scan device lain aktif — yang terjadi adalah device *lain* yang scan/discover Device A (mDNS resolve dari sisi client, §langkah 4-5). Device A cukup pasif "advertise" saat hosting aktif. |
| 4 | Device tanpa License Key: tombol **"Aktifkan Aplikasi Melalui Device Lain"** di `LicenseScreen.jsx` | Tombol baru, di bawah tombol aktivasi existing |
| 5 | Modal mendeteksi Device A + tombol **"Ikuti"** | mDNS resolve dari Client, render daftar Host yang lagi hosting di LAN yang sama |
| 6 | Client menekan "Ikuti" → menunggu diterima | Client kirim `join-request {hwid, deviceName}` ke Host via WebSocket, status di Client: "Menunggu persetujuan Device A..." |
| 7 | Device A lihat daftar yang "ikut", assign akun non-admin per device | UI baru di seksi Hosting: daftar pending join request, tiap baris ada dropdown pilih user non-admin (dari user yang sudah ada di Device A) + tombol "Terima" |
| 8 | Device yang di-assign menerima data menu, kasir, open-bill | Host push **snapshot penuh sekali saat assignment**: `products` (termasuk stok saat itu), pengaturan kasir/payment methods, daftar open-bill aktif. Ini satu-satunya full-dump yang boleh terjadi (bukan periodik) |
| 9 | Device A menerima transaksi & open-bill dari device yang di-assign | Lihat §4 & §5 untuk mekanisme live |

**Hasil aktivasi tersimpan di Client**: file baru `.ykk_hostlic` (terpisah dari `.ykk_lic`,
tidak menyentuh skema license standalone) berisi `{hwid, hostId, assignedUserId,
grantSignature, activatedAt}`. `grantSignature` di-generate Host saat approve (HMAC pakai
secret yang cuma ada di sesi hosting Device A), supaya Client tidak bisa asal klaim
"sudah di-approve" tanpa benar-benar melalui Device A.

Saat startup, Client cek `.ykk_hostlic`: kalau Host reachable → re-validate live (device
masih ter-assign?) sekaligus jadi titik reconnect WebSocket. Kalau Host tidak reachable →
pakai grant yang tersimpan (offline-first, §5.3), tidak minta aktivasi ulang.

---

## 4. Alur Data Berjalan (setelah pairing)

- **Host → Client** (push, hanya delta kecuali snapshot awal §3 langkah 8):
  - Perubahan `products` (harga/stok/kategori) yang di-edit admin di Device A
  - Perubahan open-bill yang dibuat/di-update Device A atau device lain (biar semua device
    lihat status open-bill yang sama)
  - Update stok hasil transaksi dari device manapun (lihat §5 — ini yang bikin device lain
    ikut lihat "stok tinggal 0" begitu device lain habisin stok itu)
- **Client → Host** (push, live saat kejadian):
  - Transaksi baru (selesai bayar)
  - Perubahan open-bill yang dibuat/di-edit dari device itu

Tidak ada sinkronisasi Client ↔ Client langsung — semua lewat Device A (konsisten dengan
"Device A satu-satunya sumber kebenaran").

---

## 5. Otoritas Stok & Race Condition

### 5.1 Kenapa harus request-through-host, bukan tulis-lokal-lalu-sync

Kalau Client boleh decrement stok lokal dulu baru sync belakangan, race condition di catatan
#2 (2 device rebutan stok 1) **tidak bisa dicegah** — kedua device akan sama-sama merasa
berhasil sebelum tahu ada konflik. Karena itu, **khusus aksi yang mengurangi stok**
(finalisasi transaksi, bukan sekadar tambah ke keranjang), Client wajib:

1. Kirim `reserve-stock {productId, qty}` ke Host via WebSocket, **synchronous** (tunggu balasan).
2. Host decrement stok di `products` miliknya sendiri dalam satu SQLite transaction
   (single-process, jadi otomatis serial — tidak butuh locking tambahan).
3. Host balas `ok` (dengan stok terbaru) atau `insufficient` (stok sudah habis duluan).
4. Client baru finalisasi transaksi lokal kalau dapat `ok`. Kalau `insufficient` → tampilkan
   pesan kegagalan yang jelas, misal *"Stok habis — item ini baru saja terjual di device
   lain."* (state kegagalan eksplisit, bukan silent fail).

Latency di LAN normal (<50ms) — ini tidak akan berasa lag untuk kasir dalam kondisi Host
online, tapi tetap butuh state "menunggu konfirmasi stok" di UI (loading singkat pada tombol
bayar) supaya jelas ini bukan macet.

### 5.2 Delta-only, bukan broadcast tabel penuh

Setelah Host decrement, Host broadcast **hanya baris yang berubah** (`{productId,
newStock, updatedAt}`) ke semua Client tersambung lain — bukan seluruh tabel `products`.
Berlaku sama untuk `stock_movements` (bahan baku): hanya baris movement yang benar-benar
tercatat akibat transaksi itu yang dikirim, bukan snapshot penuh tabel stok bahan baku.

### 5.3 Kalau Device A (Host) offline — fallback yang sudah disepakati

Ini **diterima secara eksplisit oleh Danzel sebagai batas scope**, jadi rencana ini tidak
mencoba menyelesaikan lebih jauh dari yang diminta:

- Client kehilangan koneksi ke Host → tidak bisa lagi `reserve-stock` synchronous → Client
  jatuh ke mode lokal: pakai angka stok terakhir yang tersinkron, decrement lokal, transaksi
  tetap tersimpan di device itu sendiri (outbox lokal, pola sama seperti `walAppend` di
  `backup.cjs`).
- Risiko oversell selama Host offline **diterima sebagai tradeoff yang sudah dipikirkan** —
  tidak perlu resolusi konflik otomatis. Saat Host kembali online, outbox di-flush; kalau
  hasilnya bikin stok di Host jadi negatif, Host cukup **menampilkan** stok minus itu untuk
  direkonsiliasi manual (bukan auto-correct/rollback transaksi).
- Tidak perlu P2P antar Client saat Host mati — sesuai flow, Client memang tidak pernah
  saling kenal satu sama lain, semua koneksi cuma ke Host.

---

## 6. Perubahan Skema & Komponen Baru

| Item | Keterangan |
|---|---|
| `electron/network/host-server.cjs` | WebSocket server, jalan hanya saat "Mulai Hosting" ditekan |
| `electron/network/discovery.cjs` | mDNS advertise (Host) & resolve (Client) |
| `electron/network/pairing.cjs` | Kelola `join-request`, daftar pending, assign akun, generate `grantSignature` |
| `electron/network/stock-authority.cjs` | Handler `reserve-stock` di sisi Host (SQLite transaction + broadcast delta) |
| `electron/network/sync-outbox.cjs` | Outbox lokal untuk mode Host-offline (§5.3), pola `walAppend`/`walClear`/`walRecover` |
| File baru `.ykk_hostlic` | Grant aktivasi-via-host di Client, terpisah dari `.ykk_lic` |
| Kolom baru di `products` | `updated_at` (buat Client tahu delta mana yang lebih baru saat reconnect) |
| Tabel baru `devices` (di Host) | `hwid, name, assigned_user_id, status, last_seen` |
| Dependency baru | `ws` (pure JS), `bonjour-service`/`multicast-dns` (cek pure-JS dulu) |

---

## 7. Peringatan & Batasan (Engineer Agent style)

- Jangan sentuh `.ykk_lic`/`checkLicense`/`activateLicense` sama sekali — jalur baru harus
  100% paralel, supaya device yang pakai license key standalone tidak kena efek samping.
- `reserve-stock` synchronous berarti UX tombol bayar butuh state loading eksplisit — ini
  bagian dari fitur, bukan detail kosmetik (Rule 6: failure/loading states).
- Jangan implementasi apa pun untuk "mencegah" stok minus saat Host offline — itu di luar
  scope yang diminta, cukup tampilkan untuk direkonsiliasi manual.
- Open-bill sync ikut jalur delta yang sama seperti stok (bukan full-dump periodik) — perlu
  dikonfirmasi saat masuk fase 3: apakah menambah item ke open-bill ikut memotong stok
  (butuh `reserve-stock` juga) atau stok baru terpotong saat open-bill dibayar/ditutup.
  **Ini masih perlu dicek ke kode `useCart.js`/open-bill existing sebelum fase 3 dimulai.**
- Tetap prasyarat: fix bug P0 `ViewLaporan.jsx` sebelum fase Riwayat lintas-device (Fase 5).

---

## 8. Roadmap Bertahap

| Fase | Isi |
|---|---|
| 0 | ✅ DONE — Fix bug P0 `generateTrxId` (laporan shift scope sudah beres sebelumnya) |
| 1 | ✅ DONE — Settings → "Hosting": tombol Mulai Hosting, WebSocket server, mDNS advertise |
| 2 | ✅ DONE — `LicenseScreen.jsx`: tombol "Aktifkan Aplikasi Melalui Device Lain" + modal discover/Ikuti + `join-request` |
| 3 | Host: UI daftar pending follower + assign akun non-admin + generate `.ykk_hostlic` di Client + push snapshot awal (menu/kasir/open-bill) |
| 4 | `reserve-stock` synchronous (§5.1–5.2) + outbox fallback saat Host offline (§5.3) |
| 5 | Riwayat hari/shift admin (agregasi otomatis karena semua data memang sudah di Device A) |

---

## 9. Keputusan yang Masih Terbuka

- Open-bill: apakah pemotongan stok terjadi saat item ditambah ke open-bill, atau baru saat
  dibayar? Saat item ditambahkan ke open-bill
  — perlu mockup sebelum Fase 2–3 dikerjakan.
- Apakah admin di Device A bisa un-assign / cabut akses device yang sudah di-assign (revoke
  `.ykk_hostlic`)? Iya bisa
