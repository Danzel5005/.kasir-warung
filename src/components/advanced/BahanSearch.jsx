import { useMemo, useState } from "react";
import { BD, LT, MT, W, RADIUS, TYPOGRAPHY } from "../../constants/design.js";
import { input } from "./PanelStyles.js";

// ---------------------------------------------------------------------------
// Dropdown bahan baku dengan search bar. Dipakai pada tiap baris resep supaya
// user bisa mencari nama bahan (bukan scroll <select> panjang). Menampilkan
// label terpilih saat fokus, dan daftar saran yang disaring saat mengetik.
// ---------------------------------------------------------------------------
export function BahanSearchSelect({ value, bahanList, onChange, id, name }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const selected = (bahanList || []).find((b) => b.id === value) || null;
  const display = open ? text : selected ? `${selected.nama} (${selected.satuan || "-"})` : "";

  const filtered = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return bahanList || [];
    return (bahanList || []).filter((b) => String(b.nama || "").toLowerCase().includes(q));
  }, [bahanList, text]);

  const choose = (b) => {
    onChange(b.id);
    setText("");
    setOpen(false);
  };

  return (
    <div style={{ position: "relative" }}>
      <input
        id={id}
        name={name}
        style={input}
        value={display}
        autoComplete="off"
        placeholder="Cari nama bahan..."
        onFocus={() => {
          setOpen(true);
          setText("");
        }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
      />
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 30,
            background: W,
            border: `1px solid ${BD}`,
            borderRadius: RADIUS.sm,
            marginTop: 2,
            maxHeight: 200,
            overflowY: "auto",
            boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
          }}
        >
          {filtered.map((b) => (
            <div
              key={b.id}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(b);
              }}
              style={{
                padding: "6px 10px",
                cursor: "pointer",
                fontSize: TYPOGRAPHY.small.fontSize,
                borderBottom: `1px solid ${LT}`,
                background: b.id === value ? LT : W,
              }}
            >
              {b.nama} <span style={{ color: MT }}>({b.satuan || "-"})</span>
              {b.id === value ? " \u2713" : ""}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: "6px 10px", fontSize: TYPOGRAPHY.label.fontSize, color: MT }}>
              Tidak ada bahan cocok.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BahanSearchSelect;
