<div style={{ ...row, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: SPACING.sm }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 120 }}>
        <span style={{ fontSize: TYPOGRAPHY.caption.fontSize, color: MT }}>Subtotal</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: G }}>
          {fmt(sub)}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 120, textAlign: "right" }}>
        <span style={{ fontSize: TYPOGRAPHY.caption.fontSize, color: MT }}>Total</span>
        <span style={{ fontSize: 20, fontWeight: 800, color: OR }}>
          {fmt(tot)}
        </span>
      </div>

      {/* Action buttons — always visible, styled like BillDetailModal */}
      <div style={{ display: "flex", gap: SPACING.xs, flexShrink: 0 }}>
        <button
          aria-label="Tambah Pesanan"
          onClick={() => handleAddOrder(bill)}
          style={{
            padding: `${SPACING.xs} ${SPACING.md}`,
            background: COLOR_PALETTE.primaryLight,
            color: G,
            border: `1px solid #a8d5b8`,
            borderRadius: RADIUS.md,
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 12,
            fontWeight: 700,
            whiteSpace: "nowrap"
          }}
        >Tambah Pesanan</button>
        <button
          aria-label="Bayar"
          onClick={(e) => { e.stopPropagation(); handlePay(bill); }}
          style={{
            padding: `${SPACING.xs} ${SPACING.md}`,
            background: OR,
            color: W,
            border: "none",
            borderRadius: RADIUS.md,
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 12,
            fontWeight: 700,
            whiteSpace: "nowrap",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
          }}
        >Bayar</button>
        <button
          aria-label="Hapus"
          onClick={(e) => { e.stopPropagation(); handleDelete(bill); }}
          style={{
            padding: `${SPACING.xs} ${SPACING.md}`,
            background: COLOR_PALETTE.dangerLight,
            color: COLOR_PALETTE.danger,
            border: "none",
            borderRadius: RADIUS.md,
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 12,
            fontWeight: 700,
            whiteSpace: "nowrap",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
          }}
        >Hapus</button>
      </div>
    </div>

