import { useCallback } from "react";
import { api } from "../../utilities/utils.js";
import { normalizeLoyaltyTierBasis, LOYALTY_TIER_BASIS } from "../../constants/advancedFeatures.js";

// Factory for warung identity handlers (name/address/phone). NOT a hook.
export function createWarungHandlers({ settings, setSettings, toast_, onChange }) {
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

  // Customer/member feature toggle — when off, the customer picker, the
  // "Pelanggan" block in the bill detail, and the PELANGGAN receipt line
  // are all hidden. Defaults to enabled for backward compatibility.
  const setCustomerEnabled = useCallback(async (enabled) => {
    const next = !!enabled;
    const s = { ...settings, customerEnabled: next };
    await api.saveSettings(s);
    setSettings(s);
    onChange?.(s);
    toast_(next ? "Fitur pelanggan diaktifkan" : "Fitur pelanggan dimatikan", "ok");
  }, [settings, toast_, onChange]);

  // Basis loyalty tier: "transaction" (total transaksi saat ini) atau
  // "lifetime" (total belanja kumulatif pelanggan). Hanya relevan saat fitur
  // loyalty menyala; perubahan langsung memengaruhi diskon di keranjang.
  const setLoyaltyTierBasis = useCallback(async (basis) => {
    const next = normalizeLoyaltyTierBasis(basis);
    const s = { ...settings, loyaltyTierBasis: next };
    await api.saveSettings(s);
    setSettings(s);
    onChange?.(s);
    toast_(
      next === LOYALTY_TIER_BASIS.LIFETIME
        ? "Basis tier: total belanja pelanggan (lifetime)"
        : "Basis tier: total transaksi saat ini",
      "ok"
    );
  }, [settings, toast_, onChange]);

  return { setWarungName, setWarungAddress, setWarungPhone, setCustomerEnabled, setLoyaltyTierBasis };
}
