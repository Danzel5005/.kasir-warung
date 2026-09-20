

**Temuan baru saat baca kode**

- **Stok open bill tidak tersimpan ke disk.** `commitMenu` = `menuH.setMenu` (`App.jsx:332,342`), hanya state React. Lihat `useCart.js:217-220` dan `useBills.js:52-55,65-70`. Setelah restart, stok kembali ke nilai lama.
- **Tiap pembayaran menulis ulang seluruh `menu.json`** dari snapshot renderer (`db.cjs:143,149`). Ini lambat di ribuan SKU dan rawan menimpa data (*lost update*).
- **Backup hanya membaca file JSON** (`backup-restore.cjs:45-57`). Setelah menu pindah ke SQLite, backup jadi basi kalau tidak diubah. Transaksi dan shift yang ada di SQLite tampaknya sudah tidak ikut backup. Ini belum saya jalankan, jadi cek terpisah.

**Fondasi: satu pintu stok.** Buat `applyStockDelta(deltas, meta)` di `db.cjs`. Semua perubahan stok lewat sini, berupa delta (bukan overwrite), dalam satu transaksi SQLite, dan tetap di-clamp ke 0 seperti sekarang. Renderer berhenti menghitung `updatedMenu`.

---

**Langkah 1: Void mengembalikan stok** (Troubleshooter, kerjakan sekarang, masih JSON)

- **Root cause:** `trx-void` (`db.cjs:110-127`) hanya mengubah status. `voidTrx` (`useHistoryVoid.js:28-35`) hanya refresh riwayat.
- **Fix:**

- `db.cjs` di kedua cabang: tolak jika `status === "voided"` (cegah restore ganda). Setelah patch, baca menu, tambah `item.baseQty ?? item.qty` untuk item dengan `stok !== null`, tulis lagi, lalu return `{ok, menu}`.
- `useHistoryVoid.js:35` menjadi `onVoided?.(id, res.menu)`. Di `App.jsx:128` pakai ref seperti `historyRefreshRef` (baris 125-135) untuk memanggil `setMenu`.
- **Blast radius:** `trx-delete` dan `trx-clear` tidak restore stok (sengaja). Item yang sudah dihapus dari menu dilewati. Transaksi dari open bill tetap benar karena stok dipotong saat bill dibuat.
- **Check yang ditinggalkan:** di `db.test.cjs` dekat baris 358, void mengembalikan stok, dan void dua kali hanya restore sekali.

**Langkah 2: Menu pindah ke SQLite**

- Tabel `products(id PK, menu_id UNIQUE NOCASE, kategori, stok REAL NULL, data TEXT)` di `db.cjs:19-25`. `data` berisi JSON field lain, jadi Langkah 3 tidak perlu migrasi skema.
- `migrateMenuToProducts()` idempotent (`INSERT OR IGNORE`), `menu.json` tidak dihapus supaya bisa rollback. Panggil di `main.cjs:148` dan `backup-restore.cjs:283-284`.
- IPC baru: `menu-load`, `menu-upsert` (baris yang sudah ada tidak menimpa stok), `menu-delete`, `menu-replace` (untuk clear, undo, restore). Hapus handler lama di `main.cjs:68-69`, sesuaikan `preload.js:21-22` dan `utils.js:103-104`. Fallback localStorage tetap.
- `process-payment` (`db.cjs` ~138-152) menerima `{trx, activeBillId}`. `applyStockDelta` jalan dalam transaksi yang sama dengan INSERT trx, dan dilewati kalau bayar dari open bill. Hasilnya `{ok, stock:{id:stok}}`.
- Renderer:

- `useCart.js:325-335`: buang `updatedMenu`, ganti dengan `setMenu(m => patch)`.
- `useCart.js:217-220` dan `useBills.js:52-55,65-70`: pakai `api.applyStock(deltas, {type})`. Ini menutup temuan 1.
- `useMenu.js:79,88-89,190-191`: pakai upsert/delete/replace.
- `useMenu.js:170-186`: hapus `computeStockDeduction/Restoration` setelah tidak ada pemanggil.
- Backup: `collectStores` membaca key `menu` dari `products`.
- **Check:** migrasi idempotent; bayar memotong stok, bayar open bill tidak. Catatan: `FakeDatabase` di `db.test.cjs` hanya paham SQL terbatas, jadi tiap statement baru perlu ditambahkan. Rollback transaksi tidak bisa diuji di Fake.

**Langkah 6: `stock_movements` dan stok masuk**

- Tabel `stock_movements(id, product_id, nama, type, delta, stok_after, ref, actor, note, created_at)` dengan index `(product_id, created_at)`. Type: sale, void, bill_hold, bill_cancel, in, adjust, opname. Hanya ditulis di dalam `applyStockDelta`, jadi log tidak bisa lepas dari stok.
- IPC baru: `stock-in({id, qty, modalBaru?, note})`, `stock-opname([{id, counted}])`, `stock-movements`.
- `saveItem` (`useMenu.js:75-78`): edit stok item yang sudah ada dikirim sebagai `adjust`, bukan lewat upsert. Perubahan antara null (tak terbatas) dan angka di-set langsung tanpa log.
- UI: `StockInModal.jsx` baru, dibuka dari `StockAlertPanel.jsx:77` (dekat "saran +N") dan baris item. Opname berupa daftar stok fisik dengan selisih. Pisahkan jadi komponen sendiri supaya `ViewKelola.jsx` (139 baris) tidak membengkak.
- **Check:** stok awal + Σdelta = stok akhir.

**Langkah 3: Multi-satuan dan tier (stack)**

- Data di `data` JSON: `satuan`, `units:[{key,label,factor,harga,modal?}]`, `priceTiers:[{minQty,harga}]`.
- File baru murni `src/utilities/units.js`: `resolveLine(item, unitKey, qty)` mengembalikan `{unit, harga, modal, baseQty}`, plus `stockQty(item)`. Tier hanya berlaku untuk satuan dasar, dihitung per baris pakai `baseQty`.
- `useCart.js`:

- 66-99 (`addToCart`): `cartKey` = `id` untuk satuan dasar, `id@unitKey` untuk satuan lain. Cek stok pakai jumlah `baseQty` (78-86).
- 103-109: tambah `setUnit(cartKey, unitKey)`.
- 231 (`loadBillToCart`): ubah jadi `c[i.cartKey || i.id]`. Bug ini sudah ada untuk *additionals*, dan akan sering kena kalau ada satuan.
- Delta stok di 181-212 dan 322-327 pakai `stockQty(item)`.
- **Diskon:** `calculations.js` dan `useCart.js:46,268` tidak diedit. Diskon membaca `harga`, `qty`, `id` baris, jadi otomatis stack. Catatan perilaku: `minQty` diskon dibandingkan dengan qty di satuan baris (1 dus dihitung 1, bukan 24).
- `ItemModal.jsx` (setelah baris 60) dapat editor satuan dan tier. Validasi: factor ≥ 2, minQty naik dan unik, harga tier < harga dasar (peringatan). State form di `useMenu.js:19,44,51`.
- `ViewKasir.jsx:182-198`: chip satuan di baris keranjang, hanya muncul kalau item punya `units`. Tile grid tidak berubah.
- Struk: tambah `unitLabel`. Ada dua jalur print terpisah, jadi edit dan verifikasi keduanya: `src/utilities/receipt.js` (HTML) dan `electron/printing.cjs` (ESC/POS).
- Laporan: `modal` baris sudah per satuan, jadi `csvbuild.js` tidak berubah. Rangkuman per item menjumlah qty lintas satuan (batas yang dicatat, tambah kolom satuan nanti).
- **Check:** `units.test.js` baru (batas tier, faktor, item lama tanpa units), plus satu test `calcPrice` dengan harga tier dan diskon (hanya import).

---

**Gerbang tiap langkah:** satu commit, `npm test` hijau, lalu uji manual: bayar, open bill → batal → restart, void, restore backup.

**Keputusan default** (bilang kalau mau beda):

- Harga modal saat restock = harga beli terakhir, bukan rata-rata.

[IMPORTANT]
saya menemukan satu bug yang harus diperbaiki lebih dulu. Semuanya dari kode, belum saya jalankan.

**Temuan: undo hapus transaksi bisa menghapus data**

- `deleteTrx` dan `clearAllTrx` mengambil snapshot dari `history` (`useHistory.js:149,167`). `history` hanya satu halaman (maks 100, atau hasil filter), bukan seluruh transaksi.
- Undo memanggil `trx-restore` (`db.cjs:129-131`) yang menjalankan `DELETE FROM transactions`, lalu mengisi ulang hanya dari snapshot itu.
- Jadi undo "Hapus Transaksi" menghapus semua transaksi di luar halaman yang sedang dimuat.
- `restoreTrx` hanya dipakai di dua tempat itu (`useHistory.js:155,173`).

**Langkah 1b: perbaiki undo (Troubleshooter, kerjakan setelah Langkah 1)**

- **Undo hapus satu transaksi:** ambil objek transaksi dari `history` di awal `deleteTrx` (baris 149). Undo memakai `api.saveTrx(trx)`, yang berupa INSERT tunggal (`db.cjs:100-104`), lalu `refresh()`.
- **Undo hapus semua:**

- `trx-clear` (`db.cjs:134-137`) menulis semua baris ke `files.jsonBackups/trx-cleared-<ts>.json` sebelum DELETE, lalu mengembalikan `{ok, backupFile}`.
- Handler baru `trx-restore-cleared(backupFile)` melakukan INSERT OR IGNORE semua baris. Validasi bahwa file berada di dalam `jsonBackups`.
- Bonus: file ini jadi jaring pengaman setelah jendela 9 detik lewat.
- Handler `trx-restore` dibiarkan.
- **Check:** di `db.test.cjs`, buat 3 transaksi, hapus 1, `saveTrx` → 3 baris. Clear lalu `restore-cleared` → semua kembali.

**Langkah 2b: opsi kembalikan stok (setelah Langkah 2, memakai `applyStockDelta`)**

Main process:

- `trx-delete(id, {restoreStock})` (`db.cjs:105-109`) membaca baris dulu, menghapus, lalu menambah stok bila `restoreStock` dan status bukan `voided`. Mengembalikan `{ok, trx, applied, stock}`.
- `trx-clear({restoreStock})` (`db.cjs:134-137`) mengagregasi semua transaksi non-void di main, bukan dari `history` yang cuma satu halaman.
- `trx-restore-preview({id | all})` bersifat baca-saja. Mengembalikan `{trxCount, totalQty, skipped}` untuk teks konfirmasi.

Renderer:

- `ConfirmDelModal.jsx` dapat langkah kedua untuk tipe `trx` dan `all`, tanpa komponen modal baru.

- Teks: "Apakah anda ingin mengembalikan stok untuk item pada transaksi ini?" (untuk `all`: "…pada semua transaksi?"), plus ringkasan "+N unit dari M transaksi".
- Tombol: [Ya, kembalikan] [Tidak] [Batal].
- Jika preview menunjukkan `totalQty` = 0 (semua void atau tanpa stok), pertanyaan dilewati.
- `executeConfirmDel(restoreStock)` di `App.jsx:436-457`. `deleteTrx` dan `clearAllTrx` menerima `{restoreStock, commitMenu}`, mengikuti pola `cancelBill`, karena hook tidak boleh saling import.
- **Undo:** `saveTrx` atau `restore-cleared`, lalu `applyStock` dengan delta dinegasikan (`applied` dari main). Di sini clamp 0 bisa meleset kalau ada penjualan dalam 9 detik itu, dan itu bisa diabaikan.

Aturan dan risiko:

- **Transaksi void selalu dilewati.** Stoknya sudah kembali saat void (Langkah 1). Kalau tidak, stok akan dobel.
- **Item dengan stok tak terbatas dan item yang sudah dihapus dari menu dilewati.** Baris satuan memakai `baseQty ?? qty`.
- **Risiko:** untuk transaksi lama, apalagi "hapus semua", barangnya sudah keluar dari rak, jadi restore bisa menggelembungkan stok. Karena itu ringkasan "+N unit" selalu tampil dan fokus awal tombol di "Tidak". Hanya admin yang bisa menghapus (sudah ada).
- **Check:** hapus dengan opsi menambah stok; hapus transaksi void tidak menambah; hapus tanpa opsi tidak mengubah stok; clear dengan opsi menambah sebesar Σ transaksi non-void.