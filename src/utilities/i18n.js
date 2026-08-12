// i18n — Lightweight, reactive Internationalization Engine for restaurant / Kasir Warung Nusantara

const translations = {
  id: {
    // Nav & Header
    "app.title": "Kasir — restaurant",
    "nav.kasir": "Kasir",
    "nav.bills": "Open Bill",
    "nav.history": "Riwayat",
    "nav.laporan": "Laporan",
    "nav.kelola": "Kelola Menu",
    "shift.active": "Shift Aktif",
    "shift.none": "Belum ada shift",
    "shift.close": "Tutup Shift",
    "shift.start": "Mulai Shift",

    // View Kasir
    "kasir.searchPlaceholder": "Cari nama menu atau deskripsi...",
    "kasir.allCategories": "Semua Kategori",
    "kasir.cartTitle": "Pesanan Saat Ini",
    "kasir.table": "Meja",
    "kasir.pax": "Pax",
    "kasir.emptyCart": "Keranjang Kosong",
    "kasir.emptyCartSub": "Klik item menu di sebelah kiri untuk menambahkan ke keranjang pesanan.",
    "kasir.saveBill": "Simpan Open Bill",
    "kasir.payNow": "Bayar Sekarang",
    "kasir.subtotal": "Subtotal",
    "kasir.service": "Service 6%",
    "kasir.tax": "Pajak 10%",
    "kasir.total": "Total",

    // View Open Bill
    "bills.title": "Open Bill — Tagihan Berjalan",
    "bills.unpaidCount": "tagihan belum dibayar",
    "bills.deleteAll": "Hapus Semua",
    "bills.empty": "Tidak ada tagihan terbuka",
    "bills.unpaidTag": "BELUM DIBAYAR",
    "bills.addItems": "+ Tambah Pesanan",
    "bills.pay": "Bayar",
    "bills.delete": "Hapus",

    // View Riwayat
    "history.title": "Riwayat Transaksi",
    "history.allTime": "Semua Riwayat",
    "history.byShift": "Per Shift",
    "history.byDate": "Per Tanggal",
    "history.filterFrom": "Dari:",
    "history.filterTo": "Sampai:",
    "history.downloadCsv": "Download CSV",
    "history.clearHistory": "Hapus Riwayat",
    "history.empty": "Belum ada transaksi tercatat",
    "history.trxCount": "transaksi",

    // View Laporan
    "reports.title": "Laporan Penjualan & Performa",
    "reports.shiftFilter": "Pilih Shift:",
    "reports.allShifts": "Semua Shift (Total Keseluruhan)",
    "reports.omset": "Total Omset",
    "reports.laba": "Estimasi Laba Bersih",
    "reports.trxQty": "Total Transaksi",
    "reports.itemQty": "Item Terjual",
    "reports.exportCsv": "Ekspor Laporan CSV",
    "reports.topItems": "Menu Terlaris",

    // View Kelola
    "manage.title": "Kelola Menu & Kategori",
    "manage.manageCat": "Kelola Kategori",
    "manage.manageUser": "Kelola Pengguna",
    "manage.addMenu": "+ Tambah Menu",
    "manage.edit": "Edit",
    "manage.delete": "Hapus",
    "manage.noCost": "Belum diisi",

    // Modals & Common Buttons
    "modal.cancel": "Batal",
    "modal.save": "Simpan",
    "modal.confirm": "Konfirmasi",
    "modal.delete": "Hapus",
    "modal.close": "Tutup",
    "modal.print": "Cetak Resi",
    "modal.printing": "Mencetak...",
    "modal.printSuccess": "Resi selesai",
    "modal.payTitle": "Pembayaran",
    "modal.payMethod": "METODE PEMBAYARAN",
    "modal.cash": "Tunai",
    "modal.debit": "Debit",
    "modal.qris": "QRIS",
    "modal.payAmount": "JUMLAH BAYAR (Rp)",
    "modal.change": "Kembalian",
    "modal.confirmPay": "Konfirmasi Bayar",
    "modal.closeShiftTitle": "Tutup Shift",
    "modal.closeShiftWarning": "⚠️ Semua open bill akan dihapus. Pastikan semua transaksi sudah diproses sebelum menutup shift.",
    "modal.confirmDelTitle": "Hapus transaksi / item ini?",
    "modal.confirmDelNotice": "Tindakan ini dapat di-undo dalam 9 detik.",

    // Badges & Status
    "status.outOfStock": "Habis",
    "status.stock": "Stok:",
    "status.active": "Aktif",
    "status.language": "Bahasa",

    // Payments
    "pay.cash": "Tunai",
    "pay.debitBca": "Debit BCA",
    "pay.debitBni": "Debit BNI",
    "pay.qrisBca": "QRIS BCA",
    "pay.qrisBni": "QRIS BNI",
  },

  en: {
    // Nav & Header
    "app.title": "POS — Yan Coffee Shop",
    "nav.kasir": "Register",
    "nav.bills": "Open Bills",
    "nav.history": "History",
    "nav.laporan": "Reports",
    "nav.kelola": "Manage Menu",
    "shift.active": "Active Shift",
    "shift.none": "No active shift",
    "shift.close": "Close Shift",
    "shift.start": "Start Shift",

    // View Kasir
    "kasir.searchPlaceholder": "Search menu item or description...",
    "kasir.allCategories": "All Categories",
    "kasir.cartTitle": "Current Order",
    "kasir.table": "Table",
    "kasir.pax": "Pax",
    "kasir.emptyCart": "Cart is Empty",
    "kasir.emptyCartSub": "Click menu items on the left to add them to the current order.",
    "kasir.saveBill": "Save Open Bill",
    "kasir.payNow": "Pay Now",
    "kasir.subtotal": "Subtotal",
    "kasir.service": "Service 6%",
    "kasir.tax": "Tax 10%",
    "kasir.total": "Total",

    // View Open Bill
    "bills.title": "Open Bills — Ongoing Orders",
    "bills.unpaidCount": "unpaid bills",
    "bills.deleteAll": "Delete All",
    "bills.empty": "No open bills",
    "bills.unpaidTag": "UNPAID",
    "bills.addItems": "+ Add Items",
    "bills.pay": "Pay",
    "bills.delete": "Delete",

    // View Riwayat
    "history.title": "Transaction History",
    "history.allTime": "All History",
    "history.byShift": "By Shift",
    "history.byDate": "By Date",
    "history.filterFrom": "From:",
    "history.filterTo": "To:",
    "history.downloadCsv": "Export CSV",
    "history.clearHistory": "Clear History",
    "history.empty": "No transactions recorded yet",
    "history.trxCount": "transactions",

    // View Laporan
    "reports.title": "Sales & Performance Reports",
    "reports.shiftFilter": "Select Shift:",
    "reports.allShifts": "All Shifts (Grand Total)",
    "reports.omset": "Total Revenue",
    "reports.laba": "Estimated Net Profit",
    "reports.trxQty": "Total Transactions",
    "reports.itemQty": "Items Sold",
    "reports.exportCsv": "Export CSV Report",
    "reports.topItems": "Top Selling Items",

    // View Kelola
    "manage.title": "Manage Menu & Categories",
    "manage.manageCat": "Manage Categories",
    "manage.manageUser": "Manage Users",
    "manage.addMenu": "+ Add Menu Item",
    "manage.edit": "Edit",
    "manage.delete": "Delete",
    "manage.noCost": "Not specified",

    // Modals & Common Buttons
    "modal.cancel": "Cancel",
    "modal.save": "Save",
    "modal.confirm": "Confirm",
    "modal.delete": "Delete",
    "modal.close": "Close",
    "modal.print": "Print Receipt",
    "modal.printing": "Printing...",
    "modal.printSuccess": "Receipt completed",
    "modal.payTitle": "Payment",
    "modal.payMethod": "PAYMENT METHOD",
    "modal.cash": "Cash",
    "modal.debit": "Debit",
    "modal.qris": "QRIS",
    "modal.payAmount": "AMOUNT PAID",
    "modal.change": "Change",
    "modal.confirmPay": "Confirm Payment",
    "modal.closeShiftTitle": "Close Shift",
    "modal.closeShiftWarning": "⚠️ All open bills will be removed. Make sure all orders are settled before closing the shift.",
    "modal.confirmDelTitle": "Delete this transaction / item?",
    "modal.confirmDelNotice": "This action can be undone within 9 seconds.",

    // Badges & Status
    "status.outOfStock": "Out of stock",
    "status.stock": "Stock:",
    "status.active": "Active",
    "status.language": "Language",

    // Payments
    "pay.cash": "Cash",
    "pay.debitBca": "BCA Debit",
    "pay.debitBni": "BNI Debit",
    "pay.qrisBca": "BCA QRIS",
    "pay.qrisBni": "BNI QRIS",
  }
};

let currentLang = "id";
const listeners = new Set();

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  if (translations[lang] && currentLang !== lang) {
    currentLang = lang;
    listeners.forEach((fn) => fn(lang));
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = getDirection(lang);
    }
  }
}

export function subscribeLang(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function t(key, fallback = "") {
  const dict = translations[currentLang] || translations.id;
  return dict[key] ?? fallback ?? key;
}

export function getDirection(lang = currentLang) {
  // RTL ready for Arabic (ar) or Persian (fa) or Hebrew (he)
  return ["ar", "fa", "he", "ur"].includes(lang) ? "rtl" : "ltr";
}

/**
 * Locale-aware currency formatting
 */
export function fmtCurrency(amount, lang = currentLang) {
  const num = Number(amount || 0);
  if (lang === "en") {
    return `Rp ${num.toLocaleString("en-US")}`;
  }
  return `Rp ${num.toLocaleString("id-ID")}`;
}

/**
 * Locale-aware date formatting
 */
export function fmtDate(dateInput, lang = currentLang) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return String(dateInput);

  const locale = lang === "en" ? "en-US" : "id-ID";
  return date.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

/**
 * Locale-aware time formatting
 */
export function fmtTime(dateInput, lang = currentLang) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return String(dateInput);

  const locale = lang === "en" ? "en-US" : "id-ID";
  return date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}
