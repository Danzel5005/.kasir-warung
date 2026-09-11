const LS = (k,v) => v===undefined ? JSON.parse(localStorage.getItem(k)||"null") : localStorage.setItem(k,JSON.stringify(v));
const api = {
  async loadTrx()         { return window.kasirAPI ? await window.kasirAPI.loadTrx()         : (LS("ykk_trx")||[]); },
  async saveTrx(t)        { if(window.kasirAPI) return window.kasirAPI.saveTrx(t); const a=LS("ykk_trx")||[]; a.push(t); LS("ykk_trx",a); },
  async deleteTrx(id)     { if(window.kasirAPI) return window.kasirAPI.deleteTrx(id); LS("ykk_trx",(LS("ykk_trx")||[]).filter(t=>t.id!==id)); },
  async restoreTrx(list)  { if(window.kasirAPI) return window.kasirAPI.restoreTrx(list); LS("ykk_trx",list); },
  async clearTrx()        { if(window.kasirAPI) return window.kasirAPI.clearTrx(); LS("ykk_trx",[]); },
  
  // New: Filtered & paginated transactions (localStorage fallback)
  async loadTrxFiltered({ fFrom, fTo, shiftId, page = 0, pageSize = 100, sort = "desc" }) {
    if (window.kasirAPI) return window.kasirAPI.loadTrxFiltered({ fFrom, fTo, shiftId, page, pageSize, sort });
    // Fallback to localStorage filtering
    const all = LS("ykk_trx") || [];
    let filtered = all.filter(t => {
      const d = new Date(t.timestamp);
      if (fFrom && d < new Date(fFrom)) return false;
      if (fTo && d > new Date(fTo + "T23:59:59")) return false;
      if (shiftId && t.shiftId !== shiftId) return false;
      return true;
    });
    filtered.sort((a, b) => {
      const ta = new Date(a.timestamp).getTime() || 0;
      const tb = new Date(b.timestamp).getTime() || 0;
      return sort === "asc" ? ta - tb : tb - ta;
    });
    const total = filtered.length;
    const transactions = filtered.slice(page * pageSize, (page + 1) * pageSize);
    return { transactions, total, page, pageSize };
  },
  
  async getTrxDailyStats({ fFrom, fTo, shiftId }) {
    if (window.kasirAPI) return window.kasirAPI.getTrxDailyStats({ fFrom, fTo, shiftId });
    // Fallback - compute from localStorage
    const all = LS("ykk_trx") || [];
    const filtered = all.filter(t => {
      const d = new Date(t.timestamp);
      if (fFrom && d < new Date(fFrom)) return false;
      if (fTo && d > new Date(fTo + "T23:59:59")) return false;
      if (shiftId && t.shiftId !== shiftId) return false;
      return true;
    });
    const byDate = {};
    filtered.forEach(t => {
      const date = t.timestamp.slice(0, 10);
      if (!byDate[date]) byDate[date] = { count: 0, total: 0, pax: 0, subtotal: 0 };
      byDate[date].count++;
      byDate[date].total += t.total || 0;
      byDate[date].pax += t.pax || 0;
      byDate[date].subtotal += t.subtotal || 0;
    });
    return Object.entries(byDate).map(([date, stats]) => ({ date, ...stats })).sort((a, b) => b.date.localeCompare(a.date));
  },
  
  async getTrxShiftIds() {
    if (window.kasirAPI) return window.kasirAPI.getTrxShiftIds();
    const all = LS("ykk_trx") || [];
    const ids = [...new Set(all.map(t => t.shiftId).filter(Boolean))];
    return ids.sort().reverse();
  },

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