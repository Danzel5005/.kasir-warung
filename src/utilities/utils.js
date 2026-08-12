const LS = (k,v) => v===undefined ? JSON.parse(localStorage.getItem(k)||"null") : localStorage.setItem(k,JSON.stringify(v));
const api = {
  async loadTrx()         { return window.kasirAPI ? await window.kasirAPI.loadTrx()         : (LS("ykk_trx")||[]); },
  async saveTrx(t)        { if(window.kasirAPI) return window.kasirAPI.saveTrx(t); const a=LS("ykk_trx")||[]; a.push(t); LS("ykk_trx",a); },
  async deleteTrx(id)     { if(window.kasirAPI) return window.kasirAPI.deleteTrx(id); LS("ykk_trx",(LS("ykk_trx")||[]).filter(t=>t.id!==id)); },
  async restoreTrx(list)  { if(window.kasirAPI) return window.kasirAPI.restoreTrx(list); LS("ykk_trx",list); },
  async clearTrx()        { if(window.kasirAPI) return window.kasirAPI.clearTrx(); LS("ykk_trx",[]); },
  async loadBills()       { return window.kasirAPI ? await window.kasirAPI.loadBills()        : (LS("ykk_bills")||[]); },
  async saveBills(list)   { if(window.kasirAPI) return window.kasirAPI.saveBills(list); LS("ykk_bills",list); },
  async restoreBills(l)   { if(window.kasirAPI) return window.kasirAPI.restoreBills(l); LS("ykk_bills",l); },
  async clearBills()      { if(window.kasirAPI) return window.kasirAPI.clearBills(); LS("ykk_bills",[]); },
  async loadMenu()        { return window.kasirAPI ? await window.kasirAPI.loadMenu()         : LS("ykk_menu"); },
  async saveMenu(list)    { if(window.kasirAPI) return window.kasirAPI.saveMenu(list); LS("ykk_menu",list); },
  async loadLogo()        { return window.kasirAPI ? await window.kasirAPI.loadLogo()         : LS("ykk_logo"); },
  async saveLogo(data)    { if(window.kasirAPI) return window.kasirAPI.saveLogo(data); LS("ykk_logo",data); },
  async loadCats()        { return window.kasirAPI ? await window.kasirAPI.loadCats()         : (LS("ykk_cats")||[]); },
  async saveCats(list)    { if(window.kasirAPI) return window.kasirAPI.saveCats(list); LS("ykk_cats",list); },
  async loadSettings()    { return window.kasirAPI ? await window.kasirAPI.loadSettings()     : (LS("ykk_settings")||{}); },
  async saveSettings(d)   { if(window.kasirAPI) return window.kasirAPI.saveSettings(d); LS("ykk_settings",d); },
  async getDataPath()     { return window.kasirAPI ? await window.kasirAPI.getDataPath()      : "localStorage"; },
  async saveCSV(data)     {
    if(window.kasirAPI) return window.kasirAPI.saveCSV(data);
    const blob=new Blob(["\uFEFF"+data.content],{type:"text/csv;charset=utf-8;"}); const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download=data.filename; a.click(); URL.revokeObjectURL(url); return {ok:true};
  },
  async getPrinters()     { return window.kasirAPI ? await window.kasirAPI.getPrinters()      : []; },
  async printReceipt(d)   { return window.kasirAPI ? await window.kasirAPI.printReceipt(d)    : {ok:false,error:"Hanya tersedia di aplikasi desktop"}; },
  async loadShifts()      { return window.kasirAPI ? await window.kasirAPI.loadShifts?.()     : (LS("ykk_shifts")||[]); },
  async saveShifts(list)  { if(window.kasirAPI&&window.kasirAPI.saveShifts) return window.kasirAPI.saveShifts(list); LS("ykk_shifts",list); },
  // Atomic payment — tulis trx + menu + hapus bill sekaligus
  async processPayment(data) {
    if(window.kasirAPI) return window.kasirAPI.processPayment(data);
    // Fallback localStorage (dev browser mode)
    const { trx, updatedMenu, activeBillId } = data;
    const a = LS("ykk_trx")||[]; a.unshift(trx); LS("ykk_trx", a);
    if(updatedMenu) LS("ykk_menu", updatedMenu);
    if(activeBillId) LS("ykk_bills", (LS("ykk_bills")||[]).filter(b=>b.id!==activeBillId));
    return { ok: true };
  },
  // QRIS — simpan terpisah dari settings supaya tidak bloat settings.json
  async loadQris()        { return window.kasirAPI ? await window.kasirAPI.loadQris?.()       : (LS("ykk_qris")||{}); },
  async loadUsers()       { return window.kasirAPI?.loadUsers ? await window.kasirAPI.loadUsers() : (LS("ykk_users")||[]); },
  async saveUsers(list)   { if(window.kasirAPI?.saveUsers) return window.kasirAPI.saveUsers(list); LS("ykk_users",list); },
  async saveQris(map)     { if(window.kasirAPI?.saveQris) return window.kasirAPI.saveQris(map); LS("ykk_qris",map); },
  async deleteQris(key)   { if(window.kasirAPI?.deleteQris) return window.kasirAPI.deleteQris(key); const m=LS("ykk_qris")||{}; delete m[key]; LS("ykk_qris",m); },
};

export {LS ,api};