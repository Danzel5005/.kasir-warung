// useHosting — state hosting LAN (Fase 1) untuk tab "Hosting" di Settings.
//
// Menyatukan:
//   - start/stop hosting (main process WebSocket server + mDNS advertise)
//   - status poll ringan (hostId, port, daftar follower yang terhubung)
//   - event live dari main process ("hosting:event") untuk join-request /
//     disconnect, supaya daftar pending bisa update tanpa refresh manual.
//
// Semua akses lewat window.kasirAPI (Electron). Di browser/dev tanpa Electron
// hook ini jadi no-op yang aman (hostingAvailable=false) supaya UI tidak crash.
import { useCallback, useEffect, useState } from "react";

const noop = () => {};

function hasBridge() {
  return typeof window !== "undefined" && !!window.kasirAPI && typeof window.kasirAPI.hostingStatus === "function";
}

export function useHosting() {
  const hostBridgeAvailable = hasBridge() && typeof window.kasirAPI.hostingStart === "function";
  const [status, setStatus] = useState({ hosting: false, listening: false, port: null, hostId: null, followers: [], clientCount: 0 });
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [lastEvent, setLastEvent] = useState(null);

  const refreshStatus = useCallback(async () => {
    if (!hasBridge()) return;
    try {
      const res = await window.kasirAPI.hostingStatus();
      if (res) setStatus((prev) => ({ ...prev, ...res }));
    } catch (err) { console.warn("[useHosting] status error:", err?.message || err); }
  }, []);

  const startHosting = useCallback(async ({ name, port } = {}) => {
    if (!hostBridgeAvailable) { setError("Hosting hanya tersedia di aplikasi desktop."); return { ok: false }; }
    setStarting(true);
    setError("");
    try {
      const res = await window.kasirAPI.hostingStart({ name, port });
      if (!res?.ok) { setError(res?.error || "Gagal memulai hosting"); return res || { ok: false }; }
      await refreshStatus();
      return res;
    } catch (err) {
      setError(err?.message || "Gagal memulai hosting");
      return { ok: false, error: err?.message };
    } finally {
      setStarting(false);
    }
  }, [hostBridgeAvailable, refreshStatus]);

  const stopHosting = useCallback(async () => {
    if (!hasBridge()) return { ok: false };
    setStarting(true);
    try {
      const res = await window.kasirAPI.hostingStop();
      await refreshStatus();
      return res;
    } catch (err) {
      setError(err?.message || "Gagal menghentikan hosting");
      return { ok: false, error: err?.message };
    } finally {
      setStarting(false);
    }
  }, [refreshStatus]);

  // Ambil status awal sekali saat hook dipasang.
  useEffect(() => { refreshStatus(); }, [refreshStatus]);

  // Subscribe event live dari main process.
  useEffect(() => {
    if (typeof window === "undefined" || !window.kasirAPI || typeof window.kasirAPI.onHostingEvent !== "function") return noop;
    const off = window.kasirAPI.onHostingEvent((evt) => {
      setLastEvent(evt);
      // join-request / disconnect mengubah daftar follower → sinkronkan.
      if (evt && ["join-request", "follower-disconnected", "hosting-started", "hosting-error"].includes(evt.kind)) {
        refreshStatus();
      }
      if (evt?.kind === "hosting-error") setError(evt.error || "Terjadi error pada hosting");
    });
    return typeof off === "function" ? off : noop;
  }, [refreshStatus]);

  return { status, starting, error, lastEvent, startHosting, stopHosting, refreshStatus, hostBridgeAvailable };
}
