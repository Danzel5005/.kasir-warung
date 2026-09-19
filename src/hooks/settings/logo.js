import { useCallback } from "react";
import { api } from "../../utilities/utils.js";

// Factory for logo upload/remove handlers. NOT a hook — uses the shared
// `setLogo` setter owned by useSettings.
export function createLogoHandlers({ setLogo }) {
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

  // deps kosong aman: hanya setter, tidak baca state apapun.
  const handleLogoRemove = useCallback(async () => {
    setLogo(null);
    await api.saveLogo(null);
  }, []);

  return { handleLogoUpload, handleLogoRemove };
}
