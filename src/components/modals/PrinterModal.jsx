import { G, W, BD, MT, row, RADIUS, TYPOGRAPHY, COLOR_PALETTE } from "../../constants/design.js";

export default function PrinterModal({ settingsH }) {
  return (
    <div
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300 }}
      onClick={e => { if (e.target === e.currentTarget) settingsH.setPrinterModal(false); }}
    >
      <div style={{ background:W, borderRadius:RADIUS.lg, padding:"20px", width:380, maxWidth:"95vw", boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>

        {/* Header */}
        <div style={{ ...row, marginBottom:14 }}>
          <span style={{ fontSize:TYPOGRAPHY.body.fontSize, fontWeight:700, color:G }}>Pilih Printer Thermal</span>
          <button
            onClick={() => settingsH.setPrinterModal(false)}
            style={{ background:"none", border:`1px solid ${BD}`, borderRadius:RADIUS.sm, width:24, height:24, cursor:"pointer", fontSize:TYPOGRAPHY.small.fontSize }}
          >&#10005;</button>
        </div>

        <div style={{ fontSize:TYPOGRAPHY.label.fontSize, color:MT, marginBottom:10 }}>
          Pastikan driver printer sudah terinstall. Pilih printer yang sesuai:
        </div>

        {/* Default system printer */}
        <button
          onClick={() => settingsH.selectPrinter("")}
          style={{ width:"100%", padding:"8px 10px", border:`2px solid ${!settingsH.settings.printerName ? G : BD}`, borderRadius:RADIUS.md, background:!settingsH.settings.printerName ? COLOR_PALETTE.primaryLight : W, cursor:"pointer", fontFamily:"inherit", fontSize:TYPOGRAPHY.small.fontSize, fontWeight:600, textAlign:"left", marginBottom:6 }}
        >
          Default Printer Sistem
        </button>

        {/* Printer list */}
        {settingsH.printerList.length === 0
          ? <div style={{ fontSize:TYPOGRAPHY.small.fontSize, color:MT, textAlign:"center", padding:"10px 0" }}>
              Tidak ada printer terdeteksi. Pastikan driver terinstall.
            </div>
          : settingsH.printerList.map(p => (
            <button
              key={p.name}
              onClick={() => settingsH.selectPrinter(p.name)}
              style={{ width:"100%", padding:"8px 10px", border:`2px solid ${settingsH.settings.printerName===p.name ? G : BD}`, borderRadius:RADIUS.md, background:settingsH.settings.printerName===p.name ? COLOR_PALETTE.primaryLight : W, cursor:"pointer", fontFamily:"inherit", fontSize:TYPOGRAPHY.small.fontSize, fontWeight:600, textAlign:"left", marginBottom:6, ...row }}
            >
              <span>{p.name}</span>
              {settingsH.settings.printerName === p.name && <span style={{ fontSize:TYPOGRAPHY.label.fontSize, color:G }}>Aktif</span>}
            </button>
          ))
        }
      </div>
    </div>
  );
}
