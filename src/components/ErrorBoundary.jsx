import React from "react";
import { G, W, BD, MT, LT, TX, RADIUS, TYPOGRAPHY } from "../constants/design.js";

// ErrorBoundary — keeps a render-time crash from blanking the whole app.
//
// Why: earlier bugs (`toast_ is not defined`, `TX is not defined`) threw inside
// KasirWorkspace and, with no boundary, React unmounted the entire tree — the
// window went blank/white and the only clue was the console. A boundary turns
// that into a readable message plus a recovery action.
//
// Scope: catches errors thrown during RENDER / lifecycle / constructors of the
// subtree. It does NOT catch event handlers, async rejections, or IPC errors —
// those are handled by the `safeIpc` guard in utilities/ipc-guard.js.

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Keep the full detail in the console for debugging; the UI stays friendly.
    console.error("[ErrorBoundary] caught render error:", error);
    if (info?.componentStack) console.error("[ErrorBoundary] component stack:", info.componentStack);
    this.setState({ info });
  }

  reset = () => this.setState({ error: null, info: null });

  handleReload = () => {
    if (typeof window !== "undefined" && window.location?.reload) window.location.reload();
    else this.reset();
  };

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    const message = String(error?.message || error || "Terjadi kesalahan");
    const stack = info?.componentStack || error?.stack || "";

    return (
      <div style={{ minHeight: "100vh", background: LT, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "inherit" }}>
        <div style={{ background: W, border: `1px solid ${BD}`, borderRadius: RADIUS.lg, padding: 22, maxWidth: 620, width: "100%", boxShadow: "0 18px 50px rgba(0,0,0,0.14)" }}>
          <div style={{ fontSize: TYPOGRAPHY.body.fontSize, fontWeight: 700, color: G, marginBottom: 6 }}>
            Terjadi kesalahan pada tampilan
          </div>
          <div style={{ fontSize: TYPOGRAPHY.small.fontSize, color: MT, lineHeight: 1.6, marginBottom: 14 }}>
            Aplikasi menangkap masalah ini agar data Anda tetap aman. Coba muat ulang tampilan.
            Jika masalah berlanjut, tutup lalu jalankan ulang aplikasi.
          </div>

          <div style={{ background: LT, border: `1px solid ${BD}`, borderRadius: RADIUS.md, padding: "9px 11px", marginBottom: 14 }}>
            <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, marginBottom: 4 }}>Pesan</div>
            <div style={{ fontSize: TYPOGRAPHY.small.fontSize, color: TX, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", wordBreak: "break-word" }}>{message}</div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <button onClick={this.handleReload} style={{ padding: "9px 14px", background: G, color: W, border: "none", borderRadius: RADIUS.md, cursor: "pointer", fontFamily: "inherit", fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 700 }}>
              Muat Ulang Tampilan
            </button>
            <button onClick={this.reset} style={{ padding: "9px 14px", background: LT, color: TX, border: `1px solid ${BD}`, borderRadius: RADIUS.md, cursor: "pointer", fontFamily: "inherit", fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 600 }}>
              Coba Lagi
            </button>
          </div>

          {stack && (
            <details style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT }}>
              <summary style={{ cursor: "pointer", marginBottom: 6 }}>Detail teknis</summary>
              <pre style={{ margin: 0, padding: 10, background: LT, border: `1px solid ${BD}`, borderRadius: RADIUS.md, overflowX: "auto", whiteSpace: "pre-wrap", fontSize: TYPOGRAPHY.label.fontSize, color: TX }}>{stack}</pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}
