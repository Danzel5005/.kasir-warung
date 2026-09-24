import { useState, useCallback, useEffect, useRef } from "react";

// useLicenseHost — aktivasi-via-host (Fase 2).
//
// Dua tanggung jawab:
//   1. Browse Host di LAN yang sama (mDNS) — pakai discovery-browse-start.
//   2. Join ke Host terpilih — kirim join-request (hello), tunggu approved,
//      lalu grant tersimpan di `.ykk_hostlic` (backend).
//
// Hook ini TIDAK menyentuh jalur license standalone (`useLicense`). Kalau
// dijalankan di browser biasa (tanpa bridge Electron), semua API jadi no-op.
export function useLicenseHost() {
  const [hosts, setHosts]           = useState([]);
  const [browsing, setBrowsing]     = useState(false);
  const [phase, setPhase]           = useState("idle"); // idle | searching | waiting | approved | rejected | error
  const [joinedHost, setJoinedHost] = useState(null);
  const [error, setError]           = useState("");
  const unsubRefs = useRef([]);

  const bridge = typeof window !== "undefined" ? window.kasirAPI : null;
  const available = !!(bridge && bridge.discoveryBrowseStart && bridge.clientJoin);

  const cleanupSubs = useCallback(() => {
    unsubRefs.current.forEach((fn) => { try { fn(); } catch (_) { /* ignore */ } });
    unsubRefs.current = [];
  }, []);

  // Master subscription setup sekali saja saat hook dipakai.
  useEffect(() => {
    if (!available) return undefined;
    const offHosts = bridge.onDiscoveryHosts((list) => {
      setHosts(Array.isArray(list) ? list : []);
    });
    const offClient = bridge.onClientEvent((evt) => {
      switch (evt.kind) {
        case "connecting":
          setPhase("searching");
          break;
        case "connected":
          setPhase("waiting");
          setJoinedHost(evt.hostId || null);
          break;
        case "waiting":
          setPhase("waiting");
          break;
        case "approved":
          setPhase("approved");
          setJoinedHost((evt.grant && evt.grant.hostId) || null);
          break;
        case "rejected":
          setPhase("rejected");
          setError(evt.reason || "Ditolak Device A");
          break;
        case "error":
          setPhase("error");
          setError(evt.error || "Terjadi kesalahan koneksi");
          break;
        case "disconnected":
          setPhase((p) => (p === "approved" ? p : "idle"));
          break;
        default:
          break;
      }
    });
    unsubRefs.current = [offHosts, offClient];
    return cleanupSubs;
  }, [available, bridge, cleanupSubs]);

  const startBrowse = useCallback(async () => {
    if (!available) return;
    setHosts([]);
    setBrowsing(true);
    setPhase("idle");
    await bridge.discoveryBrowseStart({});
  }, [available, bridge]);

  const stopBrowse = useCallback(async () => {
    if (!available) return;
    setBrowsing(false);
    await bridge.discoveryBrowseStop();
  }, [available, bridge]);

  const join = useCallback(async (hostInfo) => {
    if (!available) return { ok: false, error: "Bridge tidak tersedia" };
    setError("");
    setPhase("searching");
    const res = await bridge.clientJoin(hostInfo);
    if (!res || !res.ok) {
      setPhase("error");
      setError((res && res.error) || "Gagal terhubung ke Device A");
    }
    return res;
  }, [available, bridge]);

  const cancel = useCallback(async () => {
    if (!available) return;
    await bridge.clientDisconnect();
    setPhase("idle");
    setJoinedHost(null);
  }, [available, bridge]);

  const reset = useCallback(() => {
    setPhase("idle");
    setError("");
    setJoinedHost(null);
  }, []);

  return {
    available,
    hosts,
    browsing,
    phase,
    joinedHost,
    error,
    startBrowse,
    stopBrowse,
    join,
    cancel,
    reset,
  };
}
