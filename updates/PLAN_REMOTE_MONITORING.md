# Rencana Implementasi — Remote Monitoring via Hosting (WAN)

Status: **Rencana, belum ada kode ditulis.** Disusun dari inspeksi langsung repo
`https://github.com/Danzel5005/.kasir-warung` (branch master), di atas fitur LAN Sync
yang sudah selesai (lihat `LANSYNC_UPDATE.md`, `updates/PLAN_LAN_SYNC.md`).
Dokumen ini jadi acuan sebelum eksekusi via Engineer Agent.

Konteks: LAN Sync sudah menyelesaikan sinkronisasi multi-device **dalam satu jaringan
lokal**. Sekarang ada leads yang butuh monitoring **dari luar jaringan** (WAN) —
fitur ini scope-nya sengaja dibatasi ketat, bukan WAN sync penuh.

---

## 1. Ruang Lingkup

**Tetap tidak berubah (constraint keras):**
- Aktivasi License (`.ykk_lic`) tetap murni lokal, offline-verifiable — tidak disentuh.
- Aktivasi non-admin via Device A (`.ykk_hostlic`, protokol pairing LAN) tetap **hanya
  bisa dari device dalam satu jaringan lokal yang sama** — tidak boleh bisa diakses
  atau di-tunnel dari luar jaringan lewat cara apa pun, termasuk lewat relay baru ini.

**Baru, dari luar jaringan (WAN) *dan* dari Device B (LAN, non-admin), lewat channel
write yang sama:**
1. Monitoring Stok (read-only, live) — dari luar jaringan.
2. Edit Item Menu dan Resep — **tambah dan hapus** (bukan hanya tambah), bisa dilakukan
   dari luar jaringan maupun dari Device B (device LAN yang sudah di-pairing).
3. Monitoring Riwayat dan Laporan Penjualan (read-only, live) — dari luar jaringan.
4. Live update hanya saat ada riwayat baru masuk (stok berkurang, laporan bertambah) —
   bukan polling berkala.
5. **Notifikasi real-time ke Device Manager** (admin/Device A) setiap kali ada Device
   (remote atau Device B) yang melakukan edit pada item menu atau stok.

> **Catatan arsitektur:** poin 2 memperluas cakupan LAN Sync (`lan-sync.md`), bukan cuma
> fitur remote — sebelumnya Device B (non-admin) hanya konsumen data menu yang di-push
> dari Device A, tidak pernah jadi sumber perubahan menu/stok. Sekarang Device B jadi
> sumber tulis juga. Device A tetap satu-satunya otoritas yang **memvalidasi dan
> mengeksekusi** perubahan (konsisten dengan keputusan LAN Sync bahwa Device A sole
> arbiter untuk stok), tapi siapa yang *boleh memicu* perubahan itu jadi lebih luas —
> ini menambah blast radius (Rule "Protect Data": hapus item berisiko, terutama kalau
> item masih dipakai di open bill/resep device lain yang sedang berjalan). Notifikasi
> ke admin (poin 5) jadi mitigasi utamanya di fase ini, bukan approval-gate — kalau ke
> depan diperlukan approval sebelum hapus diterapkan, itu perubahan scope terpisah.

Di luar scope: WAN sync transaksi (kasir tetap hanya bisa transaksi dari device yang
sudah di-pairing LAN), dan aktivasi/pairing device baru dari luar jaringan.

---

## 2. Kondisi Sistem Saat Ini yang Relevan (hasil inspeksi repo)

- **License system** (`electron/license.cjs`): Hardware ID lokal, validasi murni
  offline, tersimpan di `.ykk_lic`. Tidak ada pemanggilan server sama sekali.
- **Host LAN** (`electron/network/host-server.cjs`, `discovery.cjs`, `pairing.cjs`,
  `host-license.cjs`): WebSocket server + mDNS, grant HMAC disimpan di `.ykk_hostlic`
  terpisah dari `.ykk_lic`. Server ini di-bind ke interface LAN, tidak pernah
  diekspos ke internet — desain ini yang membuat constraint #1 di atas otomatis
  aman selama channel baru **tidak** numpang di server/port yang sama.
- **Delta broadcast** (`stock-authority.cjs`, `sync-outbox.cjs`): stok dikirim sebagai
  delta per transaksi, bukan dump tabel — pola ini yang di-reuse untuk channel WAN,
  bukan dibuat ulang.
- **Riwayat/Laporan**: bug agregasi dari data paginasi sudah pernah terjadi
  (`ViewLaporan.jsx`) dan sudah diperbaiki dengan query dedicated full-scope. Channel
  WAN untuk laporan harus reuse query yang sama ini, bukan menghitung ulang di jalur baru.
- **Database**: SQLite lokal per device (`kasir.db`), tidak ada database terpusat/cloud
  hari ini — semua data penjualan tetap fisik di toko.

---

## 3. Keputusan Arsitektur

**Kenapa relay, bukan port-forward langsung ke Device A:**
Warung tidak punya IP publik stabil (ISP rumahan/bisnis kecil di Indonesia umumnya IP
dinamis), dan expose `host-server.cjs` langsung ke internet berarti jalur yang sama
persis dengan protokol pairing/aktivasi ikut terbuka ke luar — risiko langsung melanggar
constraint #1 begitu ada bug atau salah konfigurasi router pelanggan. Ini juga tidak
scalable untuk banyak leads sekaligus (tiap toko butuh setup jaringan manual).

**Solusi: relay server, koneksi outbound dari Device A.**
Device A membuka koneksi keluar (bukan menerima koneksi masuk) ke relay yang di-hosting
terpusat. Dashboard remote juga connect ke relay yang sama. Relay hanya menyalurkan
pesan antara pasangan Device A ↔ dashboard-nya sendiri (per shop ID) — tidak menyimpan
data penjualan sama sekali, murni pass-through. Data tetap berdaulat di toko.

---

## 4. Fase Implementasi

### Fase 0 — Kredensial terpisah
- Token baru `.ykk_remote`, format dan alur berbeda total dari `.ykk_lic`/`.ykk_hostlic`.
- Endpoint relay untuk channel ini di route/namespace terpisah dari apa pun yang
  berhubungan dengan pairing LAN — walau relay diserang, tidak ada jalur balik ke
  aktivasi lisensi.

### Fase 1 — Relay server (bagian hosting)
- Service Node.js kecil, reuse library `ws` (sama seperti `host-server.cjs`).
- Stateless pass-through per shop ID, autentikasi Device A via token, autentikasi
  dashboard remote via kredensial Danzel/pemilik toko.
- Tidak ada persistence data transaksi di relay.

### Fase 2 — Read channel (Stok, Riwayat, Laporan)
- Device A broadcast delta yang sama (stock-movements, transaction insert) ke relay
  sebagai target tambahan, selain LAN.
- Dashboard remote (web app ringan, terpisah dari Electron app) subscribe live via relay.
- Query laporan reuse endpoint full-scope yang sudah ada, bukan hitung ulang.

### Fase 3 — Write channel (Item Menu & Resep: tambah/hapus)
- Berlaku dari dua sumber: dashboard remote (via relay) dan Device B (via WS LAN yang
  sudah ada) — dua channel transport beda, tapi satu jalur validasi di Device A.
- Device A validasi & eksekusi lewat handler IPC yang sudah ada untuk `saveItem`/
  `deleteItem` (`src/hooks/useMenu.js`, reuse — tidak duplikasi validasi), lalu broadcast
  hasil ke semua device (LAN + relay) untuk konfirmasi.
- Perlu handler request/result baru di `host-server.cjs` untuk `menu-edit`/`menu-delete`,
  simetris dengan pola `reserve-stock` yang sudah ada (Device A proses serial, all-or-nothing).
- Kalau Device A offline: request dari Device B fallback ke perilaku LAN Sync yang sudah
  ada (lokal dulu, masuk outbox); request dari remote ditolak/di-queue dengan status jelas
  — bukan silently gagal.
- `deleteItem` saat ini (`useMenu.js`) belum ada guard seperti `deleteCat` untuk item yang
  masih dipakai di open bill/resep aktif di device lain — ini risiko yang sudah ada
  sebelumnya, tapi jadi lebih penting begitu Device B/remote bisa memicunya tanpa
  konfirmasi langsung dari admin. Perlu diputuskan terpisah apakah guard ini ditambah,
  atau cukup diandalkan ke notifikasi (Fase 6) + fitur undo yang sudah ada di `useMenu.js`.

### Fase 6 — Notifikasi ke Device Manager
- Setiap `menu-edit`/`menu-delete`/perubahan stok manual yang berasal dari Device B atau
  remote, Device A tampilkan notifikasi real-time (toast/banner) di layar Device A:
  isi minimal — device asal, jenis perubahan, item terdampak, waktu.
- Dicatat juga ke audit log lokal (sama seperti Fase 5) supaya bisa ditinjau walau admin
  sedang tidak melihat layar Device A saat kejadian — perlu semacam "notification center"
  ringan (daftar notifikasi belum-dibaca) di Device A, bukan cuma toast yang hilang.

### Fase 4 — Live update
- Push-only saat transaksi baru masuk (stok berkurang, laporan bertambah). Tidak
  menambah beban baru — reuse mekanisme broadcast, cuma tambah target.

### Fase 5 — Keamanan
- WSS (TLS) end-to-end.
- Token per-toko, rotate-able.
- Rate limit di write endpoint.
- Audit log lokal: perubahan berasal dari luar jaringan ditandai ("diubah dari luar
  jaringan, oleh <akun>, jam <x>") — penting karena ini menyentuh stok (Rule "Protect Data").

---

## 5. UX yang Perlu Ada

| Area | State yang wajib ada |
|---|---|
| Settings → Remote Monitoring | nonaktif, connecting, aktif, error, token-invalid |
| Dashboard remote | loading, kosong, live/tersambung, terputus ("Device A offline — data terakhir jam X"), reconnect |
| Edit/hapus menu dari remote atau Device B | mengirim, berhasil, gagal (Device A offline), ditolak |
| Notifikasi di Device A | banner real-time saat edit masuk, notification center (belum-dibaca), riwayat notifikasi |

---

## 6. Scalability Check

- Beban per toko: pesan JSON kecil, tidak ada komputasi berat di relay — 1 vCPU/1GB
  cukup untuk puluhan toko live bersamaan.
- Relay multi-tenant by design (routing per shop ID) — menambah lead baru tidak
  menambah kompleksitas arsitektur, hanya menambah trafik linear.
- Kalau leads tumbuh signifikan, upgrade instance atau tambah instance di belakang
  load balancer — tidak perlu redesign.

---

## 7. Riset Harga Hosting

Untuk beban seperti ini (WebSocket ringan, pesan kecil, bukan komputasi berat):

| Opsi | Spek | Harga |
|---|---|---|
| VPS lokal Indonesia (promo, mis. tipe IDCloudHost/sejenis) | 1 vCPU / 1–2GB | ~Rp48.000–96.000/bulan |
| DigitalOcean Basic Droplet (Singapore, dekat Indonesia) | 1 vCPU / 512MB–1GB | mulai $4/bulan (~Rp65rb) |

Rekomendasi mulai: 1 vCPU/1GB RAM, kisaran **Rp50.000–100.000/bulan**, cukup untuk
puluhan toko live sekaligus. Upgrade instance kalau jumlah leads bertambah signifikan.

---

## 8. Batasan yang Dipertahankan

- Tidak ada perubahan pada `.ykk_lic`, `checkLicense`, `activateLicense`.
- Tidak ada perubahan pada protokol pairing/aktivasi LAN (`.ykk_hostlic`) — tetap
  hanya bisa dari jaringan lokal yang sama.
- Edit/hapus item menu dari luar jaringan maupun Device B tetap wajib divalidasi dan
  dieksekusi lewat Device A — tidak ada device lain yang jadi sumber kebenaran sendiri.
- Tidak ada data penjualan yang disimpan di relay — relay murni pass-through.
- Tidak ada WAN sync transaksi/kasir — kasir tetap hanya via device yang sudah
  di-pairing LAN (scope ini di luar dokumen ini).