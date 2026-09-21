import { useCallback } from "react";
import { api } from "../../utilities/utils.js";
import { DEFAULT_ADVANCED_FEATURES } from "../../constants/advancedFeatures.js";

// Factory for "Nyalakan Fitur Tingkat Lanjut" handlers. NOT a hook — receives
// the single shared `settings`/`setSettings` owned by useSettings so the
// `{...settings, ...patch}` spread always reads the latest snapshot.
//
// Two operations:
//   setAdvancedEnabled(bool)  — the master switch (turns the whole set on/off)
//   toggleAdvancedFeature(key) — a single sub-feature flag
// Both persist through the same `api.saveSettings` path as every other setting,
// and call `onChange` so App.jsx can react (e.g. hide HPP immediately).
export function createAdvancedFeatureHandlers({ settings, setSettings, toast_, onChange }) {
  const persist = useCallback(async (next, message) => {
    const s = { ...settings, advancedFeatures: next };
    await api.saveSettings(s);
    setSettings(s);
    onChange?.(s);
    if (message) toast_(message, "ok");
  }, [settings, toast_, onChange]);

  // Master switch. Turning it OFF does NOT wipe the sub-flags — it just gates
  // them, so a user who turns advanced features back on keeps their choices.
  const setAdvancedEnabled = useCallback(async (enabled) => {
    const current = settings.advancedFeatures || DEFAULT_ADVANCED_FEATURES;
    const next = { ...current, enabled: !!enabled };
    await persist(next, enabled ? "Fitur Tingkat Lanjut dinyalakan" : "Fitur Tingkat Lanjut dimatikan");
  }, [settings, persist]);

  // Flip one sub-feature. Requires the master switch to be on (guarded here so
  // a stray call can never enable a feature while the master is off).
  const toggleAdvancedFeature = useCallback(async (key, value) => {
    if (!(key in DEFAULT_ADVANCED_FEATURES)) return;
    const current = settings.advancedFeatures || DEFAULT_ADVANCED_FEATURES;
    if (!current.enabled) {
      toast_("Nyalakan Fitur Tingkat Lanjut dulu", "err");
      return;
    }
    const next = { ...current, [key]: value !== undefined ? !!value : !current[key] };
    await persist(next);
  }, [settings, persist, toast_]);

  // Guard read used by the UI: a feature is active only when both the master
  // switch and the sub-flag are on.
  const isAdvancedActive = useCallback((key) => {
    const a = settings.advancedFeatures || DEFAULT_ADVANCED_FEATURES;
    return !!a.enabled && !!a[key];
  }, [settings]);

  return { setAdvancedEnabled, toggleAdvancedFeature, isAdvancedActive };
}
