import { useState } from "react";
import { G, W, BD, MT, row, RADIUS, TYPOGRAPHY, COLOR_PALETTE } from "../../constants/design.js";
import PrinterTab from "./settings/PrinterTab.jsx";
import WarungTab from "./settings/WarungTab.jsx";
import PaymentTab from "./settings/PaymentTab.jsx";
import QrisTab from "./settings/QrisTab.jsx";
import ReceiptTab from "./settings/ReceiptTab.jsx";
import PricingTab from "./settings/PricingTab.jsx";
import UsersTab from "./settings/UsersTab.jsx";
const tabs = [["printer", "Printer"], ["warung", "Nama Warung"], ["payment", "Metode Bayar"], ["qris", "QRIS"], ["receipt", "Resi"], ["pricing", "Harga"], ["users", "Kelola Pengguna"]];
export default function SettingsModal({ settingsH, authH, menu = [], cats = [] }) {
  const [tab, setTab] = useState("printer");
  const content = { printer: <PrinterTab settingsH={settingsH} />, warung: <WarungTab settingsH={settingsH} />, payment: <PaymentTab settingsH={settingsH} />, qris: <QrisTab settingsH={settingsH} />, receipt: <ReceiptTab settingsH={settingsH} />, pricing: <PricingTab settingsH={settingsH} menu={menu} cats={cats} />, users: <UsersTab authH={authH} /> }[tab];
  const close = () => settingsH.setSettingsModal(false);
  return <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }} onClick={(event) => event.target === event.currentTarget && close()}><div style={{ background: W, borderRadius: RADIUS.lg, padding: 20, maxWidth: "95vw", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column", maxHeight: "80vh" }}><div style={{ ...row, marginBottom: 14 }}><span style={{ fontSize: TYPOGRAPHY.body.fontSize, fontWeight: 700, color: G }}>Pengaturan</span><button onClick={close} style={{ background: "none", border: `1px solid ${BD}`, borderRadius: RADIUS.sm, width: 24, height: 24 }}>×</button></div><div style={{ display: "flex", gap: 6, marginBottom: 14, borderBottom: `1px solid ${BD}`, paddingBottom: 10 }}>{tabs.map(([key, label]) => <TabButton key={key} active={tab === key} onClick={() => setTab(key)}>{label}</TabButton>)}</div><div style={{ flex: 1, overflowY: "auto", marginBottom: 14 }}>{content}</div><div style={row}><button onClick={close} style={{ marginLeft: "auto", padding: "8px 16px", background: COLOR_PALETTE.primaryLight, color: G, border: 0, borderRadius: RADIUS.md }}>Tutup</button></div></div></div>;
}
function TabButton({ active, onClick, children }) { return <button onClick={onClick} style={{ background: "none", border: `2px solid ${active ? G : MT}`, padding: "6px 12px", borderBottom: active ? `2px solid ${G}` : "none", cursor: "pointer", fontFamily: "inherit", fontSize: TYPOGRAPHY.small.fontSize, fontWeight: active ? 700 : 600, color: active ? G : MT }}>{children}</button>; }
