import { useState } from "react";
import { G, W, LT, BD, TX, MT, inp, RADIUS } from "../constants/design.js";
import { filterCustomers } from "../utilities/customerSearch.js";

// Batas jumlah saran yang ditampilkan pada dropdown.
const SUGGESTION_LIMIT = 8;

export default function CustomerPicker({ customers = [], selectedCustomer, setSelectedCustomerId, upsertCustomer }) {
  const [query, setQuery] = useState("");
  // Dropdown terbuka otomatis saat keyboard masuk ke input (onFocus),
  // lalu menutup saat blur / setelah memilih pelanggan.
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", phone: "" });

  // Pelanggan tersimpan, berurutan alfabet, disaring sesuai ketikan.
  const matches = filterCustomers(customers, query, SUGGESTION_LIMIT);
  const itemCount = matches.length + 1; // +1 untuk opsi "Tambah pelanggan"

  // Pilih pelanggan: set id lalu tutup dropdown.
  const choose = (customer) => {
    setSelectedCustomerId(customer.id);
    setQuery("");
    setHighlight(0);
    setOpen(false);
  };

  // Simpan pelanggan baru, lalu pilih otomatis.
  const saveNewCustomer = async () => {
    const customer = await upsertCustomer(draft);
    if (customer) {
      setDraft({ name: "", phone: "" });
      setAdding(false);
      setQuery("");
      setOpen(false);
    }
  };

  // Navigasi keyboard pada dropdown (ArrowUp/Down/Enter/Escape).
  const onKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlight((h) => (itemCount ? (h + 1) % itemCount : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setHighlight((h) => (itemCount ? (h - 1 + itemCount) % itemCount : 0));
    } else if (event.key === "Enter") {
      if (!open) return;
      event.preventDefault();
      if (highlight < matches.length) {
        const customer = matches[highlight];
        if (customer) choose(customer);
      } else {
        setAdding(true);
        setOpen(false);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return <div style={{ padding: "8px 12px", background: "#f9faf9", borderBottom: `1px solid ${BD}` }}>
    <div style={{ fontSize: 10, color: MT, fontWeight: 700, marginBottom: 4 }}>PELANGGAN / MEMBER</div>
    {selectedCustomer ? <div style={{ display: "flex", gap: 6, alignItems: "center" }}><span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: G }}>{selectedCustomer.name}{selectedCustomer.phone ? ` · ${selectedCustomer.phone}` : ""}</span><button onClick={() => setSelectedCustomerId(null)} style={{ border: "none", background: "transparent", color: MT, cursor: "pointer" }}>Ganti</button></div> : <>
      <input
        id="customer-search"
        name="customerSearch"
        autoComplete="off"
        value={query}
        onChange={(event) => { setQuery(event.target.value); setHighlight(0); setOpen(true); }}
        onFocus={() => { setOpen(true); setHighlight(0); }}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        placeholder="Ketik nama/nomor pelanggan"
        style={{ ...inp, fontSize: 11 }}
      />
      {open && (
        <div style={{ background: W, border: `1px solid ${BD}`, borderRadius: RADIUS.md, marginTop: 4, overflow: "hidden", maxHeight: 210, overflowY: "auto" }}>
          {matches.map((customer, index) => (
            <button
              key={customer.id}
              type="button"
              onMouseDown={(event) => { event.preventDefault(); choose(customer); }}
              onMouseEnter={() => setHighlight(index)}
              style={{ display: "block", width: "100%", textAlign: "left", border: "none", borderBottom: `1px solid ${LT}`, background: index === highlight ? LT : W, padding: "6px 8px", color: TX, cursor: "pointer", fontFamily: "inherit", fontSize: 11 }}
            >
              {customer.name} {customer.phone && <span style={{ color: MT }}>· {customer.phone}</span>}
            </button>
          ))}
          {matches.length === 0 && (
            <div style={{ padding: "6px 8px", color: MT, fontSize: 11 }}>Pelanggan tidak ditemukan</div>
          )}
          <button
            type="button"
            onMouseDown={(event) => { event.preventDefault(); setAdding(true); setOpen(false); }}
            style={{ width: "100%", border: "none", background: highlight === matches.length ? LT : "#f2f6f2", padding: "6px 8px", color: G, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 11, textAlign: "left" }}
          >
            + Tambah pelanggan{query ? ` "${query.trim()}"` : ""}
          </button>
        </div>
      )}
      {!open && <button onClick={() => setAdding(true)} style={{ marginTop: 5, border: `1px solid ${BD}`, borderRadius: RADIUS.sm, background: W, color: G, padding: "4px 8px", cursor: "pointer", fontFamily: "inherit", fontSize: 10 }}>+ Pelanggan baru</button>}
    </>}
    {adding && <div style={{ display: "grid", gap: 5, marginTop: 7 }}><input id="customer-new-name" name="customerName" autoComplete="name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Nama pelanggan" style={inp} /><input id="customer-new-phone" name="customerPhone" autoComplete="tel" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} placeholder="Nomor telepon (opsional)" style={inp} /><div style={{ display: "flex", gap: 5 }}><button onClick={() => setAdding(false)} style={{ flex: 1, padding: 6, border: `1px solid ${BD}`, background: W, borderRadius: RADIUS.sm, cursor: "pointer" }}>Batal</button><button onClick={saveNewCustomer} style={{ flex: 1, padding: 6, border: "none", background: G, color: W, borderRadius: RADIUS.sm, cursor: "pointer", fontWeight: 700 }}>Simpan</button></div></div>}
  </div>;
}
