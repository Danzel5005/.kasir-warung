import { useState, useRef, useCallback } from "react";
import { api } from "../utilities/utils.js";
import { DEFAULT_RECEIPT_ADDITIONALS } from "../constants/receiptAdditionals.js";

// Default payment methods — Tunai and Qris always available initially
const DEFAULT_PAYMENT_METHODS = [
  { key: "cash", label: "Tunai", category: "cash" },
  { key: "qris-bca", label: "QRIS BCA", category: "qris" },
  { key: "qris-bni", label: "QRIS BNI", category: "qris" },
];

// useSettings — logo, settings (printer, payment methods), modals.
// Tidak depend ke hook lain. Expose `printHTML(html)` generik supaya
// useCart/useHistory bisa cetak tanpa import hook ini langsung — mereka
// menerima `printHTML` sebagai parameter dari App.jsx.
// Optional onChange callback to notify when settings change (e.g., receiptAdditionals)
function useSettings({ toast_, onChange }) {
  const [logo, setLogo]               = useState(null);
  const [settings, setSettings]       = useState({ 
    printerName: "", 
    paymentMethods: DEFAULT_PAYMENT_METHODS,
    receiptAdditionals: DEFAULT_RECEIPT_ADDITIONALS,
    warungName: "",
    warungAddress: "",
    warungPhone: "",
  });
  const [settingsModal, setSettingsModal] = useState(false);
  const [printerModal, setPrinterModal] = useState(false);
  const [printerList, setPrinterList]   = useState([]);
  const [newPaymentLabel, setNewPaymentLabel] = useState("");
  const [newReceiptFieldLabel, setNewReceiptFieldLabel] = useState("");
  const [newReceiptFieldType, setNewReceiptFieldType] = useState("text");
  const [warungNameInput, setWarungNameInput] = useState("");
  const [warungAddressInput, setWarungAddressInput] = useState("");
  const [warungPhoneInput, setWarungPhoneInput] = useState("");
  const logoRef = useRef();

  // Helper to auto-detect QRIS payment methods by name (case insensitive)
  const normalizePaymentMethodCategory = (methods) => {
    if (!Array.isArray(methods)) return methods;
    return methods.map((m) => {
      // If label contains "QRIS" (case insensitive) and category is not already "qris", auto-set it
      if (m.label && m.label.toLowerCase().includes("qris") && m.category !== "qris") {
        return { ...m, category: "qris" };
      }
      return m;
    });
  };

  // deps kosong aman: hanya setter, tidak baca state apapun.
  const loadInitial = useCallback((savedLogo, savedSettings) => {
    setLogo(savedLogo || null);
    const s = savedSettings || {};
    // Ensure paymentMethods exist; if not, use defaults
    if (!s.paymentMethods || !Array.isArray(s.paymentMethods) || s.paymentMethods.length === 0) {
      s.paymentMethods = DEFAULT_PAYMENT_METHODS;
    } else {
      // Auto-detect QRIS payment methods by name
      s.paymentMethods = normalizePaymentMethodCategory(s.paymentMethods);
    }
    // Ensure receiptAdditionals exist; if not, use defaults
    if (!s.receiptAdditionals || !Array.isArray(s.receiptAdditionals) || s.receiptAdditionals.length === 0) {
      s.receiptAdditionals = DEFAULT_RECEIPT_ADDITIONALS;
    }
    // Ensure new fields exist
    if (!s.warungAddress) s.warungAddress = "";
    if (!s.warungPhone) s.warungPhone = "";
    setSettings(s);
    onChange?.(s);
  }, [onChange]);

  // deps kosong aman: hanya setter, tidak baca state apapun.
  const handleLogoUpload = useCallback((e) => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = async (ev) => {
      setLogo(ev.target.result);
      await api.saveLogo(ev.target.result);
    };
    r.readAsDataURL(f);
  }, []);

  // PENTING: membaca settings.printerName LANGSUNG dari closure, bukan lewat
  // functional setState. Wajib [settings, toast_] di deps, atau printHTML akan
  // selalu cetak ke printer dari state pertama kali hook mount (stale).
  const printHTML = useCallback(async (html, successMsg = "Mencetak...") => {
    const res = await api.printReceipt({ html, printerName: settings.printerName || "" });
    if (res?.ok) toast_(successMsg, "ok");
    else toast_(res?.error || "Gagal cetak", "err");
    return res;
  }, [settings, toast_]);

  // deps kosong aman: hanya setter, tidak baca state apapun.
  const openPrinterModal = useCallback(async () => {
    const list = await api.getPrinters();
    setPrinterList(list);
    setPrinterModal(true);
  }, []);

  // PENTING: men-spread `settings` langsung dari closure ({...settings, ...}).
  // Wajib [settings, toast_] di deps — tanpa ini, ganti printer kedua kalinya
  // akan menghapus balik field settings lain yang sudah berubah di antaranya
  // (overwrite dengan snapshot settings yang stale).
  const selectPrinter = useCallback(async (name) => {
    const s = { ...settings, printerName: name };
    await api.saveSettings(s);
    setSettings(s);
    setPrinterModal(false);
    toast_(`Printer: ${name || "Default"}`, "ok");
  }, [settings, toast_]);

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

  // ── QRIS Image Upload ─────────────────────────────────────────────────────────
  // Handle QRIS image upload for each QRIS payment method
  const handleQrisImageUpload = useCallback(async (methodKey, file) => {
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast_("Hanya JPEG/PNG untuk QRIS", "err");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast_("Ukuran QRIS maks 2MB", "err");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const imageData = ev.target.result;
      // Initialize qrisImages if not exist
      if (!settings.qrisImages) settings.qrisImages = {};
      const qrisImages = { ...settings.qrisImages, [methodKey]: imageData };
      const s = { ...settings, qrisImages };
      await api.saveSettings(s);
      setSettings(s);
      toast_(`QRIS image untuk "${methodKey}" berhasil disimpan`, "ok");
    };
    reader.readAsDataURL(file);
  }, [settings, toast_]);

  // Delete QRIS image for a payment method
  const deleteQrisImage = useCallback(async (methodKey) => {
    if (!settings.qrisImages) return;
    const qrisImages = { ...settings.qrisImages };
    delete qrisImages[methodKey];
    const s = { ...settings, qrisImages };
    await api.saveSettings(s);
    setSettings(s);
    toast_(`QRIS image untuk "${methodKey}" dihapus`, "ok");
  }, [settings, toast_]);

  // ── Receipt Additionals CRUD ──────────────────────────────────────────────────
  // Toggle "Wajib di isi" (required) for a receipt additional field
  const toggleReceiptAdditionalRequired = useCallback(async (key) => {
    const updated = settings.receiptAdditionals.map(field => {
      if (field.key === key) {
        return { ...field, required: !field.required };
      }
      return field;
    });
    const s = { ...settings, receiptAdditionals: updated };
    await api.saveSettings(s);
    setSettings(s);
    onChange?.(s);
  }, [settings, toast_, onChange]);

  // Delete a custom receipt additional field
  const deleteReceiptAdditional = useCallback(async (key) => {
    // No default fields to protect anymore
    const defaultKeys = [];
    if (defaultKeys.includes(key)) {
      toast_("Field default tidak bisa dihapus", "err");
      return;
    }
    
    const updated = settings.receiptAdditionals.filter(f => f.key !== key);
    const s = { ...settings, receiptAdditionals: updated };
    await api.saveSettings(s);
    setSettings(s);
    onChange?.(s);
    toast_("Field dihapus", "ok");
  }, [settings, toast_, onChange]);

  // Add a new custom receipt additional field
  const addReceiptField = useCallback(async () => {
    const label = newReceiptFieldLabel.trim();
    if (!label) { toast_("Nama field wajib diisi", "err"); return; }
    
    // Check if label already exists
    if (settings.receiptAdditionals.some(f => f.label.toLowerCase() === label.toLowerCase())) {
      toast_("Field dengan nama sama sudah ada", "err"); 
      return;
    }
    
    const newField = {
      key: `custom_${Date.now()}`,
      label: label,
      type: newReceiptFieldType,
      required: false,
      visible: true,
      category: "receipt",
    };
    
    const updated = [...settings.receiptAdditionals, newField];
    const s = { ...settings, receiptAdditionals: updated };
    await api.saveSettings(s);
    setSettings(s);
    onChange?.(s);
    setNewReceiptFieldLabel("");
    setNewReceiptFieldType("text");
    toast_(`Field "${label}" ditambahkan`, "ok");
  }, [settings, newReceiptFieldLabel, newReceiptFieldType, toast_, onChange]);

  // Toggle warung name
  const setWarungName = useCallback(async (name) => {
    const s = { ...settings, warungName: name };
    await api.saveSettings(s);
    setSettings(s);
    toast_("Nama warung disimpan", "ok");
  }, [settings, toast_]);

  // Toggle warung address
  const setWarungAddress = useCallback(async (address) => {
    const s = { ...settings, warungAddress: address };
    await api.saveSettings(s);
    setSettings(s);
    toast_("Alamat warung disimpan", "ok");
  }, [settings, toast_]);

  // Toggle warung phone
  const setWarungPhone = useCallback(async (phone) => {
    const s = { ...settings, warungPhone: phone };
    await api.saveSettings(s);
    setSettings(s);
    toast_("Nomor telepon warung disimpan", "ok");
  }, [settings, toast_]);

  return {
    logo, settings, settingsModal, setSettingsModal,
    printerModal, printerList, logoRef,
    newPaymentLabel, setNewPaymentLabel,
    newReceiptFieldLabel, setNewReceiptFieldLabel,
    newReceiptFieldType, setNewReceiptFieldType,
    warungNameInput, setWarungNameInput,
    warungAddressInput, setWarungAddressInput,
    warungPhoneInput, setWarungPhoneInput,
    loadInitial, handleLogoUpload, printHTML,
    openPrinterModal, selectPrinter, setPrinterModal,
    addPaymentMethod, deletePaymentMethod,
    handleQrisImageUpload, deleteQrisImage,
    toggleReceiptAdditionalRequired, deleteReceiptAdditional, addReceiptField,
    setWarungName, setWarungAddress, setWarungPhone,
  };
}

export { useSettings };
