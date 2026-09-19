import { useCallback } from "react";
import { api } from "../../utilities/utils.js";

// Factory for receipt-additional-field CRUD handlers. NOT a hook.
export function createReceiptFieldHandlers({
  settings,
  setSettings,
  toast_,
  onChange,
  newReceiptFieldLabel,
  setNewReceiptFieldLabel,
  newReceiptFieldType,
  setNewReceiptFieldType,
}) {
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

  return { toggleReceiptAdditionalRequired, deleteReceiptAdditional, addReceiptField };
}
