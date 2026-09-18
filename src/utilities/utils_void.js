const LS = (k,v) => v===undefined ? JSON.parse(localStorage.getItem(k)||"null") : localStorage.setItem(k,JSON.stringify(v));
const api = {
  // ... existing code ...
  async loadTrx()         { return window.kasirAPI ? await window.kasirAPI.loadTrx()         : (LS("ykk_trx")||[]); },
  async saveTrx(t)        { if(window.kasirAPI) return window.kasirAPI.saveTrx(t); const a=LS("ykk_trx")||[]; a.push(t); LS("ykk_trx",a); },
  async deleteTrx(id)     { if(window.kasirAPI) return window.kasirAPI.deleteTrx(id); LS("ykk_trx",(LS("ykk_trx")||[]).filter(t=>t.id!==id)); },
  async restoreTrx(list)  { if(window.kasirAPI) return window.kasirAPI.restoreTrx(list); LS("ykk_trx",list); },
  async clearTrx()        { if(window.kasirAPI) return window.kasirAPI.clearTrx(); LS("ykk_trx",[]); },
  
  async voidTrx(id, { reason, actor, note }) {
    if(window.kasirAPI) return window.kasirAPI.voidTrx(id, { reason, actor, note });
    const all = LS("ykk_trx") || [];
    const updated = all.map(t => t.id === id ? { ...t, status: "voided", voidedAt: new Date().toISOString(), voidedBy: actor, voidReason: reason, voidNote: note } : t);
    LS("ykk_trx", updated);
    return { ok: true };
  },
};

export { LS ,api };
