import { useEffect, useState } from "react";
import { BD, G, LT, MT, W } from "../constants/design.js";
import { api } from "../utilities/utils.js";

// Compact, always-visible LAN state. It avoids hiding important offline and
// pending-sync conditions inside Settings.
export default function LanSyncStatus() {
  const [state, setState] = useState({ connected: false, pending: 0 });
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      if (!alive) return;
      const client = window.kasirAPI?.clientStatus ? await window.kasirAPI.clientStatus() : { connected: false };
      const outbox = await api.outboxStatus();
      const host = await window.kasirAPI?.hostingStatus?.();
      if (alive) setState({ connected: !!client?.connected, target: client?.target, hosting: !!host?.hosting, clientCount: host?.clientCount || 0, pending: Number(outbox?.pending) || 0 });
    };
    refresh();
    const timer = setInterval(refresh, 5000);
    const off = window.kasirAPI?.onClientEvent?.((event) => {
      if (["connected", "approved", "disconnected", "reserve-offline", "reserve-timeout"].includes(event?.kind)) refresh();
    });
    const offHost = window.kasirAPI?.onHostingEvent?.(refresh);
    return () => { alive = false; clearInterval(timer); if (typeof off === "function") off(); if (typeof offHost === "function") offHost(); };
  }, []);
  if (!state.hosting && !state.connected && !state.pending) return null;
  const synced = (state.hosting || state.connected) && !state.pending;
  return <div title={synced ? "Terhubung ke Device A" : "Ada transaksi yang menunggu sinkronisasi"}
    style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 9px", border: `1px solid ${synced ? "#b8d8c8" : "#f0c36d"}`, borderRadius: 999, background: synced ? "#e8f5ee" : "#fff8e0", color: synced ? G : "#8a5a00", fontSize: 10, fontWeight: 700 }}>
    <span style={{ width: 7, height: 7, borderRadius: "50%", background: synced ? G : "#d99000" }} />
    {state.hosting ? `Hosting aktif · ${state.clientCount} perangkat` : state.connected ? `Terhubung ke Device A · ${state.target?.name || state.target?.host || "Host"}` : "Device A terputus"}
    {state.pending > 0 && ` · ${state.pending} perubahan menunggu sinkron`}
  </div>;
}