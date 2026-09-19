import { useCallback } from "react";
import { api } from "../../utilities/utils.js";

// Factory for QRIS image upload/delete handlers. NOT a hook.
export function createQrisHandlers({ settings, setSettings, toast_ }) {
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

  return { handleQrisImageUpload, deleteQrisImage };
}
