import { useCallback, useMemo, useState } from "react";
import { api } from "../utilities/utils.js";

const VOID_REASONS = [
  { key: "cancel", label: "Pembatalan pelanggan" },
  { key: "refund", label: "Pengembalian" },
  { key: "error", label: "Kesalahan input" },
  { key: "promotion", label: "Promo gratis" },
  { key: "other", label: "Lainnya" },
];

function useHistoryVoid({ toast_, addUndo }) {
  const [voidModal, setVoidModal] = useState(false);
  const [voidTargetId, setVoidTargetId] = useState(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidNote, setVoidNote] = useState("");

  const isVoiding = useMemo(() => !!voidTargetId, [voidTargetId]);

  const voidTrx = useCallback(async (id, reason, actor) => {
    try {
      await api.voidTrx(id, { reason, actor, note: voidNote });
      setVoidModal(false);
      setVoidTargetId(null);
      setVoidReason("");
      setVoidNote("");
      toast_("Transaksi ditandai void", "ok");
      return true;
    } catch (err) {
      toast_(err.message || "Gagal void transaksi", "err");
      return false;
    }
  }, [toast_, voidNote]);

  const openVoidModal = useCallback((id) => {
    setVoidTargetId(id);
    setVoidReason("");
    setVoidNote("");
    setVoidModal(true);
  }, []);

  return { voidModal, setVoidModal, voidTargetId, setVoidTargetId, isVoiding, voidReason, setVoidReason, voidNote, setVoidNote, voidTrx, openVoidModal };
}

export { useHistoryVoid, VOID_REASONS };
