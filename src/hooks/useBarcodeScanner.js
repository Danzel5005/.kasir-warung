import { useCallback, useEffect, useRef } from "react";
import { findMenuByMenuId, normalizeBarcodeInput } from "../utilities/barcode.js";

function useBarcodeScanner({ menu, search, setSearch, setView, addToCart, toast_ }) {
  const scanBufferRef = useRef("");
  const scanTimeoutRef = useRef(null);
  const lastScanRef = useRef({ code: "", time: 0 });

  const handleBarcodeScanned = useCallback((rawCode) => {
    const code = normalizeBarcodeInput(rawCode);
    if (!code) return;

    const now = Date.now();
    if (code === lastScanRef.current.code && now - lastScanRef.current.time < 300) return;
    lastScanRef.current = { code, time: now };
    setSearch(code);
  }, [setSearch]);

  useEffect(() => {
    const trimmed = search.trim();
    if (!trimmed) return;

    const match = findMenuByMenuId(menu, trimmed);
    if (!match) return;

    setView("menu");
    addToCart(match);
    toast_(`+1 ${match.nama}`, "ok");
    setSearch("");
  }, [addToCart, menu, search, setSearch, setView, toast_]);

  useEffect(() => {
    const flushScan = () => {
      const code = normalizeBarcodeInput(scanBufferRef.current);
      scanBufferRef.current = "";
      if (code) handleBarcodeScanned(code);
    };

    const onKeyDown = (event) => {
      const targetTag = event.target?.tagName || "";
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      if (targetTag === "INPUT" || targetTag === "TEXTAREA" || targetTag === "SELECT" || event.target?.isContentEditable) return;
      if (event.key === "Enter") {
        flushScan();
        return;
      }
      if (event.key.length !== 1) return;

      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
      scanBufferRef.current += event.key;
      scanTimeoutRef.current = setTimeout(flushScan, 80);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    };
  }, [handleBarcodeScanned]);

  useEffect(() => {
    if (!window.kasirAPI?.onBarcodeScanned) return undefined;
    return window.kasirAPI.onBarcodeScanned(handleBarcodeScanned);
  }, [handleBarcodeScanned]);
}

export { useBarcodeScanner };
