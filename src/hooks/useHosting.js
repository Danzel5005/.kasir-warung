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
  const pairingBridgeAvailable = hasBridge() && typeof window.kasirAPI.pairingList === "function";
  const [status, setStatus] = useState({ hosting: false, listening: false, port: null, hostId: null, followers: [], clientCount: 0 });
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [lastEvent, setLastEvent] = useState(null);
  // Fase 3: daftar pending join-request (dikelola pairing.cjs di main process)
  // + akun non-admin yang bisa di-assign.
  const [requests, setRequests] = useState([]);
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [busyHwid, setBusyHwid] = useState(null);

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

  const refreshPairing = useCallback(async () => {
    if (!pairingBridgeAvailable) return;
    try {
      const [listRes, usersRes] = await Promise.all([
        window.kasirAPI.pairingList(),
        window.kasirAPI.pairingAssignableUsers(),
      ]);
      if (listRes?.ok) setRequests(listRes.requests || []);
      if (usersRes?.ok) setAssignableUsers(usersRes.users || []);
    } catch (err) { console.warn("[useHosting] pairing refresh error:", err?.message || err); }
  }, [pairingBridgeAvailable]);

  // approve({ hwid, userId }) — assign akun non-admin + kirim snapshot awal.
  const approveRequest = useCallback(async ({ hwid, userId }) => {
    if (!pairingBridgeAvailable) return { ok: false, error: "Pairing hanya tersedia di aplikasi desktop." };
    setBusyHwid(hwid);
    setError("");
    try {
      const res = await window.kasirAPI.pairingApprove({ hwid, userId });
      if (!res?.ok) { setError(res?.error || "Gagal menerima perangkat"); return res || { ok: false }; }
      await Promise.all([refreshStatus(), refreshPairing()]);
      return res;
    } catch (err) {
      setError(err?.message || "Gagal menerima perangkat");
      return { ok: false, error: err?.message };
    } finally { setBusyHwid(null); }
  }, [pairingBridgeAvailable, refreshStatus, refreshPairing]);

  const rejectRequest = useCallback(async ({ hwid, reason }) => {
    if (!pairingBridgeAvailable) return { ok: false };
    setBusyHwid(hwid);
    try {
      const res = await window.kasirAPI.pairingReject({ hwid, reason });
      await Promise.all([refreshStatus(), refreshPairing()]);
      return res;
    } catch (err) {
      setError(err?.message || "Gagal menolak perangkat");
      return { ok: false, error: err?.message };
    } finally { setBusyHwid(null); }
  }, [pairingBridgeAvailable, refreshStatus, refreshPairing]);

  // Ambil status awal sekali saat hook dipasang.
  useEffect(() => { refreshStatus(); refreshPairing(); }, [refreshStatus, refreshPairing]);

  // Subscribe event live dari main process.
  useEffect(() => {
    if (typeof window === "undefined" || !window.kasirAPI || typeof window.kasirAPI.onHostingEvent !== "function") return noop;
    const off = window.kasirAPI.onHostingEvent((evt) => {
      setLastEvent(evt);
      // join-request / disconnect mengubah daftar follower → sinkronkan.
      if (evt && ["join-request", "follower-disconnected", "hosting-started", "hosting-error"].includes(evt.kind)) {
        refreshStatus();
        refreshPairing();
      }
      // approve/reject dari event pairing juga perlu refresh daftar pending.
      if (evt && ["request", "approved", "rejected"].includes(evt.kind)) refreshPairing();
      if (evt?.kind === "hosting-error") setError(evt.error || "Terjadi error pada hosting");
    });
    return typeof off === "function" ? off : noop;
  }, [refreshStatus, refreshPairing]);

  return {
    status, starting, error, lastEvent, startHosting, stopHosting, refreshStatus, hostBridgeAvailable,
    requests, assignableUsers, busyHwid, refreshPairing, approveRequest, rejectRequest, pairingBridgeAvailable,
  };
}
