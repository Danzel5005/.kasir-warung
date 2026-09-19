import { useCallback } from "react";
import { api } from "../../utilities/utils.js";

// Helper to auto-detect QRIS payment methods by name (case insensitive).
// Treated as a pure function — no state read.
export function normalizePaymentMethodCategory(methods) {
  if (!Array.isArray(methods)) return methods;
  return methods.map((m) => {
    // If label contains "QRIS" (case insensitive) and category is not already "qris", auto-set it
    if (m.label && m.label.toLowerCase().includes("qris") && m.category !== "qris") {
      return { ...m, category: "qris" };
    }
    return m;
  });
}

// Factory for payment-method CRUD handlers. NOT a hook.
export function createPaymentMethodHandlers({ settings, setSettings, toast_, newPaymentLabel, setNewPaymentLabel }) {
  // ── Payment Methods CRUD ──────────────────────────────────────────────────────
  // PENTING: membaca settings & newPaymentLabel LANGSUNG dari closure.
  // Wajib [settings, newPaymentLabel, toast_] di deps.
  const addPaymentMethod = useCallback(async () => {
    const label = newPaymentLabel.trim();
    if (!label) { toast_("Nama metode pembayaran wajib diisi", "err"); return; }

    // Check if label already exists
    if (settings.paymentMethods.some(p => p.label.toLowerCase() === label.toLowerCase())) {
      toast_("Metode pembayaran sudah ada", "err");
      return;
    }

    // Auto-detect QRIS category based on label (case insensitive)
    const isQris = label.toLowerCase().includes("qris");

    const newMethod = {
      key: `custom_${Date.now()}`,
      label: label,
      category: isQris ? "qris" : "custom"
    };

    const updated = [...settings.paymentMethods, newMethod];
    const s = { ...settings, paymentMethods: updated };
    await api.saveSettings(s);
    setSettings(s);
    setNewPaymentLabel("");
    toast_(`Metode "${label}" ditambahkan`, "ok");
  }, [settings, newPaymentLabel, toast_]);

  // PENTING: membaca settings LANGSUNG dari closure.
  // Wajib [settings, toast_] di deps.
  const deletePaymentMethod = useCallback(async (key) => {
    const updated = settings.paymentMethods.filter(p => p.key !== key);
    const s = { ...settings, paymentMethods: updated };
    await api.saveSettings(s);
    setSettings(s);
    toast_("Metode pembayaran dihapus", "ok");
  }, [settings, toast_]);

  return { addPaymentMethod, deletePaymentMethod };
}
