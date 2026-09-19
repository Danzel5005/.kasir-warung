import { useCallback } from "react";
import { api } from "../../utilities/utils.js";

// Factory for pricing (tax/service/discount patch) and low-stock handlers. NOT a hook.
export function createPricingHandlers({ settings, setSettings, toast_, onChange }) {
  // Low-stock alert threshold — the stock level at or below which an item is
  // flagged as "stok menipis". Clamped to 1–999 so the alert list stays useful.
  const setLowStockThreshold = useCallback(async (value) => {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n) || n < 1 || n > 999) {
      toast_("Batas stok menipis harus antara 1-999", "err");
      return;
    }
    const s = { ...settings, lowStockThreshold: n };
    await api.saveSettings(s);
    setSettings(s);
    toast_("Batas stok menipis disimpan", "ok");
  }, [settings, toast_]);

  const savePricing = useCallback(async (patch) => {
    const s = { ...settings, ...patch };
    await api.saveSettings(s);
    setSettings(s);
    onChange?.(s);
  }, [settings, onChange]);

  return { setLowStockThreshold, savePricing };
}
