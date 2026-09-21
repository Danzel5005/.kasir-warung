import { useState, useRef, useCallback } from "react";
import { DEFAULT_RECEIPT_ADDITIONALS } from "../constants/receiptAdditionals.js";
import { DEFAULT_ADVANCED_FEATURES, normalizeAdvancedFeatures } from "../constants/advancedFeatures.js";
import {
  createPrinterHandlers,
  createWarungHandlers,
  createPaymentMethodHandlers,
  normalizePaymentMethodCategory,
  createQrisHandlers,
  createReceiptFieldHandlers,
  createPricingHandlers,
  createExpenseCategoryHandlers,
  createLogoHandlers,
  createAdvancedFeatureHandlers,
} from "./settings/index.js";

// Default payment methods — Tunai and Qris always available initially
const DEFAULT_PAYMENT_METHODS = [
  { key: "cash", label: "Tunai", category: "cash" },
  { key: "qris-bca", label: "QRIS BCA", category: "qris" },
  { key: "qris-bni", label: "QRIS BNI", category: "qris" },
];

const DEFAULT_EXPENSE_CATEGORIES = [
  { key: "operasional", label: "Operasional" },
  { key: "bahan-baku", label: "Bahan Baku" },
  { key: "listrik", label: "Listrik" },
  { key: "transport", label: "Transport" },
  { key: "lainnya", label: "Lainnya" },
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
    expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
    warungName: "",
    warungAddress: "",
    warungPhone: "",
    receiptPaperWidthMm: 80,
    discounts: [],
    pajak: { enabled: false, value: 0 },
    service: { enabled: false, value: 0 },
    customerEnabled: true,
    advancedFeatures: DEFAULT_ADVANCED_FEATURES,
  });
  const [settingsModal, setSettingsModal] = useState(false);
  const [printerModal, setPrinterModal] = useState(false);
  const [printerList, setPrinterList]   = useState([]);
  const [newPaymentLabel, setNewPaymentLabel] = useState("");
  const [newExpenseCategoryLabel, setNewExpenseCategoryLabel] = useState("");
  const [newReceiptFieldLabel, setNewReceiptFieldLabel] = useState("");
  const [newReceiptFieldType, setNewReceiptFieldType] = useState("text");
  const [warungNameInput, setWarungNameInput] = useState("");
  const [warungAddressInput, setWarungAddressInput] = useState("");
  const [warungPhoneInput, setWarungPhoneInput] = useState("");
  const logoRef = useRef();

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
    if (!s.expenseCategories || !Array.isArray(s.expenseCategories) || s.expenseCategories.length === 0) {
      s.expenseCategories = DEFAULT_EXPENSE_CATEGORIES;
    }
    if (!Array.isArray(s.discounts)) s.discounts = [];
    if (!s.pajak || typeof s.pajak !== "object") s.pajak = { enabled: false, value: 0 };
    if (!s.service || typeof s.service !== "object") s.service = { enabled: false, value: 0 };
    // Ensure new fields exist
    if (!s.warungAddress) s.warungAddress = "";
    if (!s.warungPhone) s.warungPhone = "";
    // Customer/member feature — enabled by default, must be a boolean
    if (typeof s.customerEnabled !== "boolean") s.customerEnabled = true;
    // Fitur Tingkat Lanjut — selalu objek yang sudah dinormalisasi (semua
    // kunci ada, nilai non-boolean diperbaiki). Ini juga jalur migrasi untuk
    // settings lama yang belum punya field ini sama sekali.
    s.advancedFeatures = normalizeAdvancedFeatures(s.advancedFeatures);
    // Receipt paper width — migrate older settings; invalid values fall back to 80mm
    const pw = Math.round(Number(s.receiptPaperWidthMm));
    if (!Number.isFinite(pw) || pw < 30 || pw > 210) s.receiptPaperWidthMm = 80;
    else s.receiptPaperWidthMm = pw;
    setSettings(s);
    onChange?.(s);
  }, [onChange]);

  // Semua handler per-domain dibangun ulang tiap render dengan snapshot
  // `settings`/setter terbaru. Factory ini bukan hook — tidak ada state kedua,
  // jadi pola `{...settings, ...patch}` tetap aman (tidak ada stale closure).
  const deps = {
    settings, setSettings, toast_, onChange,
    setLogo,
    setPrinterList, setPrinterModal,
    newPaymentLabel, setNewPaymentLabel,
    newExpenseCategoryLabel, setNewExpenseCategoryLabel,
    newReceiptFieldLabel, setNewReceiptFieldLabel,
    newReceiptFieldType, setNewReceiptFieldType,
  };

  return {
    toast_,
    logo, settings, setSettings,
    settingsModal, setSettingsModal,
    printerModal, printerList, logoRef,
    newPaymentLabel, setNewPaymentLabel,
    newExpenseCategoryLabel, setNewExpenseCategoryLabel,
    newReceiptFieldLabel, setNewReceiptFieldLabel,
    newReceiptFieldType, setNewReceiptFieldType,
    warungNameInput, setWarungNameInput,
    warungAddressInput, setWarungAddressInput,
    warungPhoneInput, setWarungPhoneInput,
    loadInitial,
    ...createLogoHandlers(deps),
    ...createPrinterHandlers(deps),
    ...createPaymentMethodHandlers(deps),
    ...createExpenseCategoryHandlers(deps),
    ...createQrisHandlers(deps),
    ...createReceiptFieldHandlers(deps),
    ...createWarungHandlers(deps),
    ...createPricingHandlers(deps),
    ...createAdvancedFeatureHandlers(deps),
  };
}

export { useSettings };
