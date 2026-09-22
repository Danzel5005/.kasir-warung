import { G, W, LT, BD, MT } from "../constants/design.js";
import { SnakeLoader } from "../components/SnakeLoader.jsx";

export default function LoginScreen({
  authH,
  settingsH,
  handleLogin,
  showPw,
  setShowPw,
  showSnakeLoader,
  snakeLoaderTrigger,
}) {
  return (
    <div style={{minHeight:"100vh",background:`linear-gradient(135deg,${G} 0%,#0f3d24 100%)`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Segoe UI',sans-serif"}}>
      <div style={{background:W,borderRadius:18,padding:"36px 32px",width:360,maxWidth:"95vw",boxShadow:"0 24px 80px rgba(0,0,0,0.4)"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          {settingsH.logo&&<img src={settingsH.logo} alt="logo" style={{width:64,height:64,borderRadius:12,objectFit:"cover",marginBottom:10}}/>}
          <div style={{fontSize:18,fontWeight:700,color:G}}>{settingsH.settings.warungName || "Warung"}</div>
          <div style={{fontSize:12,color:MT,marginTop:2}}>Powered by DEN POS</div>
        </div>

        {authH.shifts.filter(s=>s.status==="closed").slice(-1).map(s=>(
          <div key={s.id} style={{background:"#e8f5ee",border:"1px solid #a8d5b8",borderRadius:8,padding:"9px 12px",marginBottom:16,fontSize:10,color:"#1a5c38"}}>
            <b>Shift terakhir:</b> Shift {s.shiftNum} · {s.hari} {s.tgl} {s.bln} {s.thn} · {s.startJam}–{s.endJam||"?"} · {s.operator}
          </div>
        ))}

        <div style={{marginBottom:11}}>
          <label style={{fontSize:10,color:MT,fontWeight:600,display:"block",marginBottom:4}}>USERNAME</label>
          <input
            id="login-username"
            name="username"
            autoComplete="username"
            autoFocus
            type="text" value={authH.loginForm.username}
            onChange={e=>authH.setLoginForm(f=>({...f,username:e.target.value,error:""}))}
            onKeyDown={e=>e.key==="Enter"&&document.getElementById("pw-input")?.focus()}
            placeholder="Masukkan username..."
            style={{width:"100%",padding:"10px 12px",boxSizing:"border-box",border:`1.5px solid ${authH.loginForm.error?"#e84040":BD}`,borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none",marginBottom:10}}
          />
          <label style={{fontSize:10,color:MT,fontWeight:600,display:"block",marginBottom:4}}>PASSWORD</label>
          <div style={{position:"relative",width:"100%"}}>
            <input
              id="pw-input"
              name="password"
              autoComplete="current-password"
              type={showPw ? "text" : "password"}
              value={authH.loginForm.password}
              onChange={e=>authH.setLoginForm(f=>({...f,password:e.target.value,error:""}))}
              onKeyDown={e=>e.key==="Enter"&&handleLogin()}
              placeholder="Masukkan password..."
              style={{width:"100%",padding:"10px 44px 10px 12px",boxSizing:"border-box",border:`1.5px solid ${authH.loginForm.error?"#e84040":BD}`,borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none"}}
            />
            <button
              type="button"
              onMouseDown={() => setShowPw(true)}
              onMouseUp={() => setShowPw(false)}
              onMouseLeave={() => setShowPw(false)}
              onTouchStart={(e) => { e.preventDefault(); setShowPw(true); }}
              onTouchEnd={() => setShowPw(false)}
              onTouchCancel={() => setShowPw(false)}
              style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",cursor:"pointer",padding:4,display:"flex",alignItems:"center",justifyContent:"center",color:MT}}
              aria-label={showPw ? "Sembunyikan password" : "Tampilkan password"}
            >
              {showPw ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </div>
        </div>
        {authH.loginForm.error&&<div style={{color:"#e84040",fontSize:11,fontWeight:600,marginBottom:10,textAlign:"center"}}>{authH.loginForm.error}</div>}
        <div style={{ position: "relative", width: "100%" }}>
          <button
            onClick={handleLogin}
            disabled={!authH.loginForm.username||!authH.loginForm.password||showSnakeLoader}
            style={{width:"100%",padding:"12px",background:authH.loginForm.username&&authH.loginForm.password&&!showSnakeLoader?G:"#aaa",color:W,border:"none",borderRadius:9,cursor:authH.loginForm.username&&authH.loginForm.password&&!showSnakeLoader?"pointer":"not-allowed",fontFamily:"inherit",fontSize:13,fontWeight:700,transition:"background 0.2s",display:"flex",alignItems:"center",justifyContent:"center"}}
          >
            {showSnakeLoader && snakeLoaderTrigger === "login" ? <SnakeLoader visible={true} minDuration={1200} size={24} color="#fff" /> : "Mulai Shift"}
          </button>
        </div>

        {authH.shifts.length>0&&(
          <div style={{marginTop:20}}>
            <div style={{fontSize:10,color:MT,fontWeight:600,marginBottom:7}}>RIWAYAT SHIFT</div>
            <div style={{maxHeight:140,overflowY:"auto",display:"flex",flexDirection:"column",gap:4}}>
              {[...authH.shifts].reverse().slice(0,5).map(s=>(
                <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",background:LT,borderRadius:6,fontSize:10}}>
                  <span><b style={{color:G}}>Shift {s.shiftNum}</b> · {s.tgl} {s.bln} {s.thn}</span>
                  <span style={{color:MT}}>{s.startJam}{s.endJam?`–${s.endJam}`:""} · {s.operator}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
