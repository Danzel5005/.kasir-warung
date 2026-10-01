import { useEffect, useRef, useState } from "react";
import "./RestockInbox.css";

const api = () => window.kasirAPI;

export default function RestockInbox({ advancedData, menuH, canApprove, toast_ }) {
  const [events, setEvents] = useState([]);
  const [open, setOpen] = useState(false);
  const [busyIds, setBusyIds] = useState(() => new Set());
  const [eventErrors, setEventErrors] = useState({});
  const [acceptingAll, setAcceptingAll] = useState(false);
  const [message, setMessage] = useState("");
  const seenEvents = useRef(new Set());
  const processingIds = useRef(new Set());

  useEffect(() => {
    const unsubscribe = api()?.onDeviceSyncEvent?.((payload) => {
      if (payload?.kind !== "restock-incoming" || !Array.isArray(payload.events)) return;
      const incoming = payload.events.filter((event) => !seenEvents.current.has(event.id));
      incoming.forEach((event) => seenEvents.current.add(event.id));
      if (!incoming.length) return;
      setEvents((current) => [...current, ...incoming].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
      setOpen(true);
    });
    return () => unsubscribe?.();
  }, []);

  const removeEvent = (eventId) => setEvents((current) => current.filter((event) => event.id !== eventId));

  const sendAck = async (event, status, extra = {}) => {
    const result = await api()?.deviceRestockAck?.({ eventId: event.id, status, ...extra });
    if (result && !result.ok) toast_?.("Keputusan tersimpan di POS; konfirmasi cloud akan dicoba ulang saat online.", "err");
    removeEvent(event.id);
  };

  const claimEvent = async (event) => {
    const claim = await api()?.deviceClaimRestock?.(event.id);
    if (!claim?.ok) throw new Error(claim?.error || "POS gagal mengunci permintaan.");
    if (!claim.claimed) {
      removeEvent(event.id);
      setMessage("Permintaan sudah dibatalkan atau sedang diproses di perangkat lain.");
      return false;
    }
    return true;
  };

  const reject = async (event) => {
    if (processingIds.current.has(event.id)) return;
    processingIds.current.add(event.id);
    setBusyIds((current) => new Set(current).add(event.id));
    setEventErrors((current) => { const next = { ...current }; delete next[event.id]; return next; });
    try {
      if (!await claimEvent(event)) return;
      await sendAck(event, "rejected", { reason: "Ditolak di POS" });
      toast_?.(`Permintaan stok ${event.item_name} ditolak`, "ok");
    } catch (err) {
      setEventErrors((current) => ({ ...current, [event.id]: err?.message || "Gagal menyimpan keputusan." }));
    } finally {
      processingIds.current.delete(event.id);
      setBusyIds((current) => { const next = new Set(current); next.delete(event.id); return next; });
    }
  };

  const accept = async (event) => {
    if (processingIds.current.has(event.id)) return;
    processingIds.current.add(event.id);
    setBusyIds((current) => new Set(current).add(event.id));
    setEventErrors((current) => { const next = { ...current }; delete next[event.id]; return next; });
    try {
      if (!await claimEvent(event)) return;
      if (event.item_type === "menu") {
        const result = await api()?.deviceApplyMenuRestock?.(event);
        if (!result?.ok) {
          if (result?.rejected) {
            await sendAck(event, "rejected", { reason: result.error || "Item menu tidak dapat ditambah" });
            toast_?.(result.error || "Item menu tidak dapat ditambah", "err");
            return;
          }
          throw new Error(result?.error || "Gagal menerapkan stok menu.");
        }
        menuH.applyStockView({ [event.item_id]: result.stockAfter });
        await sendAck(event, "applied", { stockAfter: result.stockAfter });
      } else {
        const item = advancedData.bahanBaku.find((row) => String(row.id) === String(event.item_id));
        if (!item) {
          await sendAck(event, "rejected", { reason: "BAHAN_NOT_FOUND" });
          toast_?.(`Bahan baku ${event.item_name} tidak ditemukan`, "err");
          return;
        }
        const claim = await api()?.deviceClaimIngredientRestock?.(event);
        if (!claim?.ok) throw new Error(claim?.error || "Gagal mencatat permintaan lokal.");
        if (claim.duplicate && claim.status === "applied") {
          const current = advancedData.bahanBaku.find((row) => String(row.id) === String(event.item_id));
          await sendAck(event, "applied", { stockAfter: current?.stok });
          return;
        }
        if (claim.duplicate) {
          setMessage(`${event.item_name}: event ini sudah dicatat, tetapi penyimpanannya belum terkonfirmasi. Periksa stok lokal sebelum memprosesnya lagi.`);
          return;
        }
        const saved = await advancedData.applyIncomingRestock(event.item_id, event.qty);
        if (!saved.ok) throw new Error(saved.error || "Gagal menyimpan bahan baku.");
        const completed = await api()?.deviceCompleteIngredientRestock?.(event.id);
        if (!completed?.ok) throw new Error("Stok tersimpan, tetapi pencatatan lokal belum selesai. Jangan proses ulang; periksa lalu sinkronkan lagi.");
        await sendAck(event, "applied", { stockAfter: saved.stockAfter });
      }
      toast_?.(`Restock ${event.item_name} diterapkan`, "ok");
    } catch (err) {
      setEventErrors((current) => ({ ...current, [event.id]: err?.message || "Gagal menerapkan permintaan." }));
    } finally {
      processingIds.current.delete(event.id);
      setBusyIds((current) => { const next = new Set(current); next.delete(event.id); return next; });
    }
  };

  const acceptAll = async () => {
    if (acceptingAll || !canApprove) return;
    const pending = events.filter((event) => !processingIds.current.has(event.id));
    if (!pending.length) return;
    setAcceptingAll(true);
    await Promise.allSettled(pending.map((event) => accept(event)));
    setAcceptingAll(false);
  };

  if (!events.length) return null;

  return (
    <>
      <div className="restock-inbox-banner">
        <span><strong>{events.length} permintaan restock dari web</strong><small>Stok belum berubah sampai disetujui di POS.</small></span>
        <button type="button" onClick={() => setOpen(true)}>Tinjau</button>
      </div>
      {open && (
        <div className="restock-inbox-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && busyIds.size === 0) setOpen(false); }}>
          <section className="restock-inbox-dialog" role="dialog" aria-modal="true" aria-labelledby="restock-inbox-title">
            <header>
              <div><p>KOTAK MASUK POS</p><h2 id="restock-inbox-title">Permintaan restock</h2></div>
              <div className="restock-inbox-header-actions">
                <button type="button" className="restock-accept-all" disabled={!canApprove || acceptingAll || events.every((event) => busyIds.has(event.id))} onClick={acceptAll}>
                  {acceptingAll ? "Menerima…" : `Terima Semua (${events.length})`}
                </button>
                <button type="button" onClick={() => setOpen(false)} disabled={busyIds.size > 0} aria-label="Tutup">×</button>
              </div>
            </header>
            {!canApprove && <p className="restock-inbox-warning">Masuk sebagai admin untuk menerima atau menolak permintaan.</p>}
            {message && <p className="restock-inbox-error" role="alert">{message}</p>}
            <div className="restock-inbox-list">
              {events.map((event) => (
                <article key={event.id}>
                  <div className="restock-inbox-item">
                    <span className="restock-inbox-type">{event.item_type === "ingredient" ? "B" : "M"}</span>
                    <div><strong>{event.item_name}</strong><small>{event.item_type === "ingredient" ? "Bahan Baku" : "Item Menu"} · tambah {event.qty} {event.unit || "pcs"}</small>
                      <small>{event.requester_name || event.requester_email || "Akun web"} · {new Date(event.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</small>
                      {event.note && <small>Catatan: {event.note}</small>}
                    </div>
                  </div>
                  <div className="restock-inbox-actions">
                    <button type="button" className="restock-reject" disabled={!canApprove || busyIds.has(event.id)} onClick={() => reject(event)}>Tolak</button>
                    <button type="button" className="restock-accept" disabled={!canApprove || busyIds.has(event.id)} onClick={() => accept(event)}>{busyIds.has(event.id) ? "Memproses…" : "Terima"}</button>
                  </div>
                  {eventErrors[event.id] && <p className="restock-inbox-error restock-inbox-item-error" role="alert">{eventErrors[event.id]}</p>}
                </article>
              ))}
            </div>
            <footer><span>Persetujuan menambah stok; tidak menimpa stok berjalan.</span><button type="button" onClick={() => setOpen(false)} disabled={busyIds.size > 0}>Selesai</button></footer>
          </section>
        </div>
      )}
    </>
  );
}