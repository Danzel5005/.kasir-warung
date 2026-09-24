# LAN Sync Update

Tanggal: 2026-09-24

Dokumen ini mencatat hasil implementasi `updates/PLAN_LAN_SYNC.md` dari Fase 0 sampai Fase 5.

## Ringkasan status

| Fase | Status | Hasil utama |
|---|---|---|
| 0 | ✅ Selesai | Perbaikan ID transaksi harian dan bug laporan shift |
| 1 | ✅ Selesai | Host LAN, WebSocket, mDNS discovery, UI Hosting |
| 2 | ✅ Selesai | Aktivasi melalui Device A, discovery, join-request, waiting state |
| 3 | ✅ Selesai | Pairing, assign akun kasir, grant HMAC, snapshot awal |
| 4 | ✅ Selesai | Reserve stok synchronous, delta broadcast, offline outbox |
| 5 | ✅ Selesai | Relay transaksi Client ke Host dan riwayat terpusat |

## Detail perubahan

### Fase 0 — stabilisasi transaksi dan laporan

- ID transaksi harian dihitung dari total transaksi di backend, bukan jumlah item yang sedang tampil di halaman.
- Riwayat laporan mengambil seluruh halaman data sebelum agregasi.
- Perilaku lisensi standalone tetap dipertahankan.

### Fase 1 — Hosting LAN

- Device admin dapat memulai dan menghentikan hosting dari Settings → Hosting LAN.
- Host memakai WebSocket dan mDNS advertisement.
- Status Host menampilkan port, Host ID, dan jumlah device yang terhubung.
- UI menyediakan state desktop-only, loading, error, aktif, dan nonaktif.

### Fase 2 — Aktivasi melalui Device A

- License screen memiliki opsi kedua: **Aktifkan Aplikasi Melalui Device Lain**.
- Client dapat menemukan Host melalui jaringan LAN.
- UI menampilkan:
  - pencarian Host,
  - empty state bila tidak ditemukan,
  - state menunggu persetujuan,
  - tombol batal,
  - state berhasil.
- Grant disimpan di `.ykk_hostlic`, terpisah dari `.ykk_lic`.

### Fase 3 — Pairing dan snapshot awal

- Host melihat daftar perangkat yang menunggu persetujuan.
- Admin dapat memilih akun kasir non-admin lalu menerima atau menolak perangkat.
- Host mengirim snapshot awal menu, pengaturan, open-bill, resep, dan bahan baku.
- Client menerapkan snapshot lokal dan menampilkan status pairing.
- Grant menggunakan signature HMAC agar approval tidak dapat dipalsukan.

### Fase 4 — Otoritas stok dan offline fallback

- Semua pengurangan stok melalui `reserve-stock` ketika Host tersedia.
- Reserve bersifat synchronous dan all-or-nothing.
- Host memproses request secara serial.
- Host mengirim delta final stok saja, bukan seluruh tabel.
- Open-bill item-add dan pembayaran langsung menggunakan jalur reserve stok.
- `stockReserved` mencegah pengurangan stok dua kali.
- Saat Host offline:
  - transaksi tetap dapat diselesaikan lokal,
  - stok lokal tetap digunakan sesuai keputusan plan,
  - perubahan dicatat di outbox JSONL,
  - risiko stok minus diterima untuk rekonsiliasi manual.
- Tombol bayar menampilkan **Memeriksa stok…** dan tidak dapat ditekan dua kali.

### Fase 5 — Riwayat terpusat

- Client mengirim transaksi yang sudah berhasil disimpan lokal ke Host melalui `transaction-sync`.
- Host menyimpan transaksi dengan `INSERT OR IGNORE`, sehingga retry aman dan tidak menggandakan riwayat.
- Host tetap menjadi sumber riwayat transaksi lintas-device.
- Bila Host offline atau timeout, transaksi lokal tetap dipertahankan dan user diberi pesan:
  - **Transaksi tersimpan lokal — belum tersinkron ke Device A**.
- Riwayat Host memakai pagination, filter tanggal, filter shift, sort, dan export CSV yang sudah tersedia.
- Ditambahkan indikator UI ringkas di workspace:
  - **LAN tersinkron** saat Client terhubung tanpa antrean.
  - **N transaksi menunggu sinkron** saat ada outbox pending.
- Indikator hanya muncul ketika relevan agar tidak mengganggu kasir standalone.

## UI/UX wiring audit

| Fitur | UI/UX | State yang tersedia |
|---|---|---|
| Hosting | Settings → Hosting LAN | nonaktif, loading, aktif, error, desktop-only |
| Discovery | License screen | mencari, kosong, ditemukan, error |
| Pairing | Join modal + Hosting tab | waiting, approved, rejected, busy |
| Reserve stok | Pay modal + cart flow | checking, insufficient, error, offline |
| Offline outbox | workspace status pill | tersembunyi jika kosong, pending count jika ada |
| Riwayat | Riwayat transaksi | loading, empty, pagination, filter, shift grouping |
| Relay transaksi | transparan pada payment flow | sukses lokal, pending sync warning |

## Validasi terakhir

- Test suite: **592/592 passed** sebelum perubahan Fase 5.
- Production build terakhir: berhasil, **140 modules transformed**.
- Setelah implementasi Fase 5, jalankan kembali `npx vitest run` dan `npm run build` sebagai gate rilis.
- Diagnostics editor telah diperiksa pada file utama yang dimodifikasi.

## Batasan yang dipertahankan

- Tidak ada WAN sync.
- Tidak ada Client-to-Client sync.
- Tidak ada auto-correction stok minus saat Host offline.
- Tidak mengubah `.ykk_lic`, `checkLicense`, atau `activateLicense`.
- Snapshot penuh hanya digunakan saat assignment awal; sinkronisasi berjalan memakai event/delta.
