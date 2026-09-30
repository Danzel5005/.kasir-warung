import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../utilities/utils.js";

function normalizeCustomer(input = {}) {
  return {
    id: String(input.id || `cust_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
    name: String(input.name || "").trim(),
    phone: String(input.phone || "").trim(),
    notes: String(input.notes || "").trim(),
    points: Number(input.points || 0),
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// useCustomers — domain pelanggan: daftar pelanggan (CRUD) + total belanja
// kumulatif per pelanggan (untuk basis tier loyalty "lifetime").
//
// customerTotals dimuat lewat IPC agregat (`loadCustomerTotals`), bukan dengan
// memuat seluruh riwayat transaksi. Peta di-refresh setiap kali `refreshKey`
// berubah — App.jsx mengoper jumlah riwayat transaksi agar tier pelanggan
// langsung mengikuti total terbaru setelah pembayaran.
function useCustomers({ toast_, refreshKey = 0 }) {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [customerTotals, setCustomerTotals] = useState({});

  const loadInitial = useCallback((saved) => {
    setCustomers(Array.isArray(saved) ? saved : []);
  }, []);

  const selectedCustomer = useMemo(() => customers.find((customer) => customer.id === selectedCustomerId) || null, [customers, selectedCustomerId]);

  const save = useCallback(async (next) => {
    const result = await api.saveCustomers(next);
    if (result?.ok === false) throw new Error(result.error || "Gagal menyimpan pelanggan");
    setCustomers(next);
  }, []);

  const upsertCustomer = useCallback(async (input) => {
    const customer = normalizeCustomer(input);
    if (!customer.name) { toast_("Nama pelanggan wajib diisi", "err"); return null; }
    if (customer.phone && customers.some((item) => item.phone === customer.phone && item.id !== customer.id)) {
      toast_("Nomor telepon pelanggan sudah terdaftar", "err"); return null;
    }
    const exists = customers.some((item) => item.id === customer.id);
    const next = exists ? customers.map((item) => item.id === customer.id ? { ...item, ...customer, createdAt: item.createdAt } : item) : [...customers, customer];
    await save(next);
    setSelectedCustomerId(customer.id);
    toast_(exists ? "Pelanggan diperbarui" : "Pelanggan ditambahkan", "ok");
    return customer;
  }, [customers, save, toast_]);

  const deleteCustomer = useCallback(async (id) => {
    await save(customers.filter((customer) => customer.id !== id));
    if (selectedCustomerId === id) setSelectedCustomerId(null);
    toast_("Pelanggan dihapus", "ok");
  }, [customers, save, selectedCustomerId, toast_]);

  // loadCustomerTotalsMap — muat total belanja kumulatif per pelanggan
  // (basis tier "lifetime"). Gagal memuat dibiarkan kosong: tier basis
  // lifetime jatuh ke 0 / Bronze, bukan crash.
  const loadCustomerTotalsMap = useCallback(async () => {
    try {
      const rows = (await api.loadCustomerTotals()) || [];
      const map = {};
      for (const r of rows) {
        if (!r?.customerId) continue;
        map[r.customerId] = Number(r.total) || 0;
      }
      setCustomerTotals(map);
    } catch {
      /* biarkan kosong — tier basis lifetime jatuh ke 0 / Bronze */
    }
  }, []);

  useEffect(() => { loadCustomerTotalsMap(); }, [loadCustomerTotalsMap, refreshKey]);

  return {
    customers, selectedCustomer, selectedCustomerId, setSelectedCustomerId,
    loadInitial, upsertCustomer, deleteCustomer,
    customerTotals, loadCustomerTotalsMap,
  };
}

export { useCustomers };
