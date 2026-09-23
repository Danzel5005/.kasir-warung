// customerSearch.js — pencarian & pengurutan daftar pelanggan (fungsi murni).
//
// Dipakai oleh CustomerPicker pada keranjang Kasir: saat keyboard masuk ke
// input nama pelanggan, daftar pelanggan tersimpan ditampilkan berurutan
// secara alfabet dan bisa diklik, lalu menyempit sesuai ketikan pengguna.

// Urutkan pelanggan secara alfabet berdasarkan nama (case-insensitive).
// localeCompare dengan "id" agar urutan sesuai abjad Indonesia.
export function sortCustomersAlphabetically(customers = []) {
  return [...customers].sort((a, b) => {
    const nameA = String(a?.name || "").trim();
    const nameB = String(b?.name || "").trim();
    const cmp = nameA.localeCompare(nameB, "id", { sensitivity: "base" });
    if (cmp !== 0) return cmp;
    // Tie-break stabil: nomor telepon lalu id.
    return String(a?.phone || "").localeCompare(String(b?.phone || ""), "id", { sensitivity: "base" })
      || String(a?.id || "").localeCompare(String(b?.id || ""));
  });
}

// Filter pelanggan berdasarkan kata kunci (nama atau nomor telepon).
// Query kosong => SEMUA pelanggan (sudah terurut alfabet).
// Hasil dipotong sebanyak `limit` agar dropdown tetap ringkas.
export function filterCustomers(customers = [], query = "", limit = 8) {
  const sorted = sortCustomersAlphabetically(customers);
  const q = String(query || "").trim().toLowerCase();
  const matched = q
    ? sorted.filter((customer) =>
        `${customer?.name || ""} ${customer?.phone || ""}`.toLowerCase().includes(q),
      )
    : sorted;
  const max = Number.isFinite(limit) && limit >= 0 ? limit : matched.length;
  return matched.slice(0, max);
}
