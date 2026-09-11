import { useState } from "react";
import { G, W, BD, MT, row, RADIUS, TYPOGRAPHY, COLOR_PALETTE } from "../../constants/design.js";
import {
  PrinterSettingsTab,
  WarungSettingsTab,
  PaymentSettingsTab,
  QrisSettingsTab,
  ReceiptSettingsTab,
  PricingSettingsTab,
  UsersSettingsTab,
} from "./SettingsPanels.jsx";

const SETTINGS_TABS = [
  ["printer", "Printer"],
  ["warung", "Nama Warung"],
  ["payment", "Metode Bayar"],
  ["qris", "QRIS"],
  ["receipt", "Resi"],
  ["pricing", "Harga"],
  ["users", "Kelola Pengguna"],
];

function SettingsTabButton({ tab, activeTab, onSelect, children }) {
  return <button onClick={() => onSelect(tab)} style={{ background: "none", border: `2px solid ${activeTab === tab ? G : MT}`, padding: "6px 12px", borderBottom: activeTab === tab ? `2px solid ${G}` : "none", cursor: "pointer", fontFamily: "inherit", fontSize: TYPOGRAPHY.small.fontSize, fontWeight: activeTab === tab ? 700 : 600, color: activeTab === tab ? G : MT, paddingBottom: 6 }}>{children}</button>;
}

function SettingsPanel({ tab, settingsH, authH, menu, cats }) {
  const panelProps = { settingsH, menu, cats };
  switch (tab) {
    case "printer": return <PrinterSettingsTab {...panelProps} />;
    case "warung": return <WarungSettingsTab {...panelProps} />;
    case "payment": return <PaymentSettingsTab {...panelProps} />;
    case "qris": return <QrisSettingsTab {...panelProps} />;
    case "receipt": return <ReceiptSettingsTab {...panelProps} />;
    case "pricing": return <PricingSettingsTab {...panelProps} />;
    case "users": return <UsersSettingsTab authH={authH} />;
    default: return null;
  }
}

export default function SettingsModal({ settingsH, authH, menu = [], cats = [] }) {
  const [tab, setTab] = useState("printer");
  const close = () => settingsH.setSettingsModal(false);

  return <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }} onClick={(event) => event.target === event.currentTarget && close()}>
    <div style={{ background: W, borderRadius: RADIUS.lg, padding: 20, width: "flex", maxWidth: "95vw", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column", maxHeight: "80vh" }}>
      <div style={{ ...row, marginBottom: 14 }}>
        <span style={{ fontSize: TYPOGRAPHY.body.fontSize, fontWeight: 700, color: G }}>Pengaturan</span>
        <button onClick={close} aria-label="Tutup pengaturan" style={{ background: "none", border: `1px solid ${BD}`, borderRadius: RADIUS.sm, width: 24, height: 24, cursor: "pointer", fontSize: TYPOGRAPHY.small.fontSize }}>&#10005;</button>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14, borderBottom: `1px solid ${BD}`, paddingBottom: 10 }}>
        {SETTINGS_TABS.map(([key, label]) => <SettingsTabButton key={key} tab={key} activeTab={tab} onSelect={setTab}>{label}</SettingsTabButton>)}
      </div>
      <div style={{ flex: 1, overflowY: "auto", marginBottom: 14 }}>
        <SettingsPanel tab={tab} settingsH={settingsH} authH={authH} menu={menu} cats={cats} />
      </div>
      <div style={{ ...row }}><button onClick={close} style={{ marginLeft: "auto", padding: "8px 16px", background: COLOR_PALETTE.primaryLight, color: G, border: "none", borderRadius: RADIUS.md, cursor: "pointer", fontFamily: "inherit", fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 700 }}>Tutup</button></div>
    </div>
  </div>;
}
