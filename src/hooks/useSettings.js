import { useState, useRef, useCallback } from "react";
import { api } from "../utilities/utils.js";

// useSettings — logo, printer config, printer-picker modal.
// Tidak depend ke hook lain. Expose `printHTML(html)` generik supaya
// useCart/useHistory bisa cetak tanpa import hook ini langsung — mereka
// menerima `printHTML` sebagai parameter dari App.jsx.
function useSettings({ toast_ }) {
  const [logo, setLogo]               = useState(null);
  const [settings, setSettings]       = useState({ printerName: "" });
  const [printerModal, setPrinterModal] = useState(false);
  const [printerList, setPrinterList]   = useState([]);
  const logoRef = useRef();

  // deps kosong aman: hanya setter, tidak baca state apapun.
  const loadInitial = useCallback((savedLogo, savedSettings) => {
    setLogo(savedLogo || null);
    setSettings(savedSettings || { printerName: "" });
  }, []);

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

  return {
    logo, settings, printerModal, printerList, logoRef,
    loadInitial, handleLogoUpload, printHTML,
    openPrinterModal, selectPrinter,
    setPrinterModal, // dibutuhkan untuk tombol close modal di JSX
  };
}

export { useSettings };
