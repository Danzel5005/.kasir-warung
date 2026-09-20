import { G, W, LT, BD } from "../constants/design.js";


export function AppSkeleton() {
  const bar = (w, h = 12, radius = 999) => (
    <div style={{ width:w, height:h, borderRadius:radius, background:"linear-gradient(90deg, #e9ecef 0%, #f5f7fa 50%, #e9ecef 100%)", backgroundSize:"200% 100%", animation:"shimmer 1.2s linear infinite" }} />
  );

  return (
    <div style={{ minHeight:"100vh", background:`linear-gradient(135deg,${G} 0%,#0f3d24 100%)`, display:"flex", flexDirection:"column", fontFamily:"'Segoe UI',sans-serif" }}>
      <style>{"@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}"}</style>
      <header style={{ background:W, borderBottom:`1px solid ${BD}`, padding:"0 16px", height:56, display:"flex", alignItems:"center", gap:10, boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
        <div style={{ width:38, height:38, borderRadius:7, background:"#e9ecef", animation:"shimmer 1.2s linear infinite", backgroundSize:"200% 100%" }} />
        <div style={{ flex:1, display:"grid", gap:4 }}>
          {bar("110px", 12)}
          {bar("70px", 10)}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {bar("90px", 28, 6)}
          {bar("70px", 28, 6)}
        </div>
      </header>

      <div style={{ flex:1, padding:16, display:"grid", gridTemplateColumns:"1.4fr 0.8fr", gap:16, background:LT }}>
        <div style={{ background:W, borderRadius:14, padding:16, boxShadow:"0 12px 28px rgba(0,0,0,0.08)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
            {bar("140px", 14)}
            {bar("70px", 14)}
          </div>
          <div style={{ display:"grid", gap:10, marginBottom:16 }}>
            {bar("100%", 44, 10)}
            {bar("85%", 44, 10)}
            {bar("92%", 44, 10)}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:10 }}>
            {bar("100%", 80, 10)}
            {bar("100%", 80, 10)}
            {bar("100%", 80, 10)}
          </div>
        </div>
        <div style={{ background:W, borderRadius:14, padding:16, boxShadow:"0 12px 28px rgba(0,0,0,0.08)" }}>
          {bar("120px", 14)}
          <div style={{ display:"grid", gap:10, marginTop:14 }}>
            {bar("100%", 36, 8)}
            {bar("88%", 36, 8)}
            {bar("92%", 36, 8)}
            {bar("76%", 36, 8)}
          </div>
        </div>
      </div>

      <footer style={{ background:W, borderTop:`1px solid ${BD}`, padding:"10px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        {bar("180px", 10)}
        {bar("60px", 10)}
      </footer>
    </div>
  );
}

export default AppSkeleton;
