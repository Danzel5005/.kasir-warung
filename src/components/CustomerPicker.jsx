import { useState } from "react";
import { G, W, LT, BD, TX, MT, inp, RADIUS, TYPOGRAPHY } from "../constants/design.js";

export default function CustomerPicker({ customers = [], selectedCustomer, setSelectedCustomerId, upsertCustomer }) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", phone: "" });
  const matches = customers.filter((customer) => `${customer.name} ${customer.phone}`.toLowerCase().includes(query.toLowerCase())).slice(0, 8);
  return <div style={{ padding: "8px 12px", background: "#f9faf9", borderBottom: `1px solid ${BD}` }}>
    <div style={{ fontSize: 10, color: MT, fontWeight: 700, marginBottom: 4 }}>PELANGGAN / MEMBER</div>
    {selectedCustomer ? <div style={{ display: "flex", gap: 6, alignItems: "center" }}><span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: G }}>{selectedCustomer.name}{selectedCustomer.phone ? ` · ${selectedCustomer.phone}` : ""}</span><button onClick={() => setSelectedCustomerId(null)} style={{ border: "none", background: "transparent", color: MT, cursor: "pointer" }}>Ganti</button></div> : <>
      <input id="customer-search" name="customerSearch" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama/nomor pelanggan" style={{ ...inp, fontSize: 11 }} />
      {query && <div style={{ background: W, border: `1px solid ${BD}`, borderRadius: RADIUS.md, marginTop: 4, overflow: "hidden" }}>{matches.map((customer) => <button key={customer.id} onClick={() => { setSelectedCustomerId(customer.id); setQuery(""); }} style={{ display: "block", width: "100%", textAlign: "left", border: "none", borderBottom: `1px solid ${LT}`, background: W, padding: "6px 8px", color: TX, cursor: "pointer", fontFamily: "inherit", fontSize: 11 }}>{customer.name} {customer.phone && <span style={{ color: MT }}>· {customer.phone}</span>}</button>)}<button onClick={() => setAdding(true)} style={{ width: "100%", border: "none", background: LT, padding: "6px 8px", color: G, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 11 }}>+ Tambah pelanggan</button></div>}
      {!query && <button onClick={() => setAdding(true)} style={{ marginTop: 5, border: `1px solid ${BD}`, borderRadius: RADIUS.sm, background: W, color: G, padding: "4px 8px", cursor: "pointer", fontFamily: "inherit", fontSize: 10 }}>+ Pelanggan baru</button>}
    </>}
    {adding && <div style={{ display: "grid", gap: 5, marginTop: 7 }}><input id="customer-new-name" name="customerName" autoComplete="name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Nama pelanggan" style={inp} /><input id="customer-new-phone" name="customerPhone" autoComplete="tel" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} placeholder="Nomor telepon (opsional)" style={inp} /><div style={{ display: "flex", gap: 5 }}><button onClick={() => setAdding(false)} style={{ flex: 1, padding: 6, border: `1px solid ${BD}`, background: W, borderRadius: RADIUS.sm, cursor: "pointer" }}>Batal</button><button onClick={async () => { const customer = await upsertCustomer(draft); if (customer) { setDraft({ name: "", phone: "" }); setAdding(false); setQuery(""); } }} style={{ flex: 1, padding: 6, border: "none", background: G, color: W, borderRadius: RADIUS.sm, cursor: "pointer", fontWeight: 700 }}>Simpan</button></div></div>}
  </div>;
}
