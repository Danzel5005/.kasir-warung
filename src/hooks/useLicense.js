import { useState, useCallback } from "react";

// useLicense — license check + aktivasi. Tidak depend ke hook lain.
function useLicense() {
  const [licenseStatus, setLicenseStatus] = useState(null);
  const [hardwareId, setHardwareId]       = useState("");
  const [licKey, setLicKey]               = useState("");
  const [licErr, setLicErr]               = useState("");
  const [licLoad, setLicLoad]             = useState(false);
  const [copied, setCopied]               = useState(false);

  // deps kosong aman: hanya setter, tidak baca state apapun.
  const checkLicenseOnLoad = useCallback(async () => {
    if (window.kasirAPI?.checkLicense) {
      const [status, hwid] = await Promise.all([
        window.kasirAPI.checkLicense(),
        window.kasirAPI.getHardwareId(),
      ]);
      setHardwareId(hwid || "");
      setLicenseStatus(status);
    } else {
      // Dev mode (browser biasa) — skip license
      setLicenseStatus({ valid: true });
    }
  }, []);

  // PENTING: membaca licKey LANGSUNG dari closure. Wajib [licKey] di deps,
  // atau tombol "Aktifkan" akan selalu kirim key dari render pertama (kosong).
  const doActivate = useCallback(async () => {
    if (!licKey.trim()) return;
    setLicLoad(true);
    setLicErr("");
    const r = await window.kasirAPI.activateLicense(licKey.trim());
    if (r.ok) setLicenseStatus({ valid: true });
    else setLicErr(r.error || "Aktivasi gagal");
    setLicLoad(false);
  }, [licKey]);

  // PENTING: membaca hardwareId LANGSUNG dari closure. Wajib [hardwareId].
  const copyHwid = useCallback(() => {
    navigator.clipboard.writeText(hardwareId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [hardwareId]);

  return {
    licenseStatus, hardwareId, licKey, licErr, licLoad, copied,
    setLicKey, setLicErr,
    checkLicenseOnLoad, doActivate, copyHwid,
  };
}

export { useLicense };
