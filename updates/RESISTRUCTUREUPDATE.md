# Penjelasan Struktur Data Pesanan

Tabel berikut memiliki 4 kolom dengan arti sebagai berikut:

| Kolom | Isi | Keterangan |
|---|---|---|
| Kiri (angka: 3, 5) | Jumlah item yang dipesan | Berapa banyak unit item tersebut dibeli |
| SLF | Kategori | Kategori/kode kelompok produk |
| FILTER 12 / SUPER 12 | Nama item | Nama produk yang dipesan |
| (di bawah nama item: 517000, 228500) | Harga satuan | Harga per 1 unit item tersebut |
| Kanan (1,551,000 / 1,142,500) | Total harga | Jumlah x Harga satuan |

## Rincian per Baris

### Baris 1
- Jumlah: **3**
- Kategori: **SLF**
- Nama item: **FILTER 12**
- Harga satuan: **517,000**
- Total harga: **1,551,000**
- Perhitungan: 3 × 517,000 = 1,551,000 ✅

### Baris 2
- Jumlah: **5**
- Kategori: **SLF**
- Nama item: **SUPER 12**
- Harga satuan: **228,500**
- Total harga: **1,142,500**
- Perhitungan: 5 × 228,500 = 1,142,500 ✅

## Ringkasan

Setiap baris merepresentasikan satu jenis item yang dipesan, dengan format:

```
[Jumlah] [Kategori] [Nama Item]
                    [Harga Satuan]   [Total Harga]
```

Total harga selalu merupakan hasil kali antara **jumlah item** dan **harga satuan**.