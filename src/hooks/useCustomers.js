import { useCallback, useMemo, useState } from "react";
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

function useCustomers({ toast_ }) {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

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

  return { customers, selectedCustomer, selectedCustomerId, setSelectedCustomerId, loadInitial, upsertCustomer, deleteCustomer };
}

export { useCustomers };
