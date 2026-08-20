import { memo, useMemo } from "react";
import { fmt } from "../utilities/receipt.js";
import { G, W, BD, MT } from "../constants/colors.js";
import { row, RADIUS, TYPOGRAPHY, COLOR_PALETTE } from "../constants/theme.js";
import StockBadge from "../components/StockBadge.jsx";

// ViewKelola — kelola menu, kategori (CRUD).
function ViewKelola({
  menu, cats, allCats,                  // menuH
  setCatModal, openAdd, openEdit,       // menuH
  setConfirmDel,                        // App.jsx local
}) {
  // Group items by their actual category (kategori field), not just categories in cats array
  // This ensures ALL items show even if their category is missing from cats
  const groupedItems = useMemo(() => {
    const groups = {};
    menu.forEach(item => {
      const catKey = item.kategori || "unknown";
      if (!groups[catKey]) groups[catKey] = [];
      groups[catKey].push(item);
    });
    return groups;
  }, [menu]);

  // Get category labels from cats array, fallback to key if not found
  const getCatLabel = (key) => {
    const cat = cats.find(c => c.key === key);
    return cat ? cat.label : key;
  };

  // Sort category keys for consistent ordering (default cats first, then alphabetical)
  const catKeys = useMemo(() => {
    const defaultOrder = ["kopi", "teh", "non-kopi", "sandwich", "indomie", "snack", "main-course"];
    const keys = Object.keys(groupedItems);
    return keys.sort((a, b) => {
      const ai = defaultOrder.indexOf(a);
      const bi = defaultOrder.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [groupedItems]);

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{padding:"9px 16px",background:W,borderBottom:`1px solid ${BD}`,...row,flexShrink:0}}>
        <div>
          <div style={{fontSize:TYPOGRAPHY.body.fontSize,fontWeight:700,color:G}}>Kelola Menu & Kategori</div>
          <div style={{fontSize:TYPOGRAPHY.label.fontSize,color:MT}}>{menu.length} item · {cats.length} kategori</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setCatModal(true)} style={{background:COLOR_PALETTE.infoLight,color:COLOR_PALETTE.info,border:"none",borderRadius:RADIUS.md,padding:"6px 12px",cursor:"pointer",fontFamily:"inherit",fontSize:TYPOGRAPHY.small.fontSize,fontWeight:700}}>Kelola Kategori</button>
          <button onClick={openAdd} style={{background:G,color:W,border:"none",borderRadius:RADIUS.md,padding:"6px 12px",cursor:"pointer",fontFamily:"inherit",fontSize:TYPOGRAPHY.small.fontSize,fontWeight:700}}>+ Tambah Menu</button>
        {menu.length>0 && (
         <button onClick={()=>setConfirmDel({type:"allMenu"})}
          style={{background:"#fef0f0",color:"#e84040",border:"none",borderRadius:7,padding:"6px 12px",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:700}}>
           Hapus Semua Menu
         </button>)}
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"10px 16px"}}>
        {catKeys.map(catKey => {
          const items_ = groupedItems[catKey];
          return(
            <div key={catKey} style={{marginBottom:16}}>
              <div style={{fontSize:TYPOGRAPHY.small.fontSize,fontWeight:700,color:G,padding:"3px 8px",background:COLOR_PALETTE.primaryLight,borderRadius:RADIUS.sm,marginBottom:6}}>{getCatLabel(catKey)} ({items_.length})</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(185px,1fr))",gap:8}}>
                {items_.map(item=>
                  <div key={item.id} style={{background:W,border:`1px solid ${BD}`,borderRadius:RADIUS.md,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
                    {item.foto?<img src={item.foto} alt={item.nama} style={{width:"100%",height:80,objectFit:"cover"}}/>:<div style={{height:50,background:"linear-gradient(135deg,#e8f5ee,#d4ead8)",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:TYPOGRAPHY.label.fontSize,color:"#5a8a6a",fontWeight:600,textAlign:"center",padding:"0 6px"}}>{item.nama}</span></div>}
                    <div style={{padding:"6px 9px"}}>
                      <div style={{...row,marginBottom:1}}><span style={{fontSize:TYPOGRAPHY.small.fontSize,fontWeight:700}}>{item.nama}</span><StockBadge stok={item.stok}/></div>
                      {item.desc&&<div style={{fontSize:TYPOGRAPHY.label.fontSize,color:MT,marginBottom:2}}>{item.desc}</div>}
                      <div style={{fontSize:TYPOGRAPHY.small.fontSize,fontWeight:700,color:G}}>{fmt(item.harga)}</div>
                      <div style={{fontSize:TYPOGRAPHY.label.fontSize,color:MT}}>Modal: {item.modal?fmt(item.modal):<span style={{color:"#e8a040"}}>Belum diisi</span>}</div>
                      <div style={{display:"flex",gap:5,marginTop:6}}>
                        <button onClick={()=>openEdit(item)} style={{flex:1,background:COLOR_PALETTE.infoLight,color:COLOR_PALETTE.info,border:"none",borderRadius:RADIUS.sm,padding:"4px 0",cursor:"pointer",fontFamily:"inherit",fontSize:TYPOGRAPHY.label.fontSize,fontWeight:600}}>Edit</button>
                        <button onClick={()=>setConfirmDel({type:"item",id:item.id})} style={{flex:1,background:COLOR_PALETTE.dangerLight,color:COLOR_PALETTE.danger,border:"none",borderRadius:RADIUS.sm,padding:"4px 0",cursor:"pointer",fontFamily:"inherit",fontSize:TYPOGRAPHY.label.fontSize,fontWeight:600}}>Hapus</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(ViewKelola);