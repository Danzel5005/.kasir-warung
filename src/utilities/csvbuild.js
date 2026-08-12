import { calcPrice } from "./calculations.js";

function csvByDay(trxs, header, rowFn, at) {
  const byDay = {};
  [...trxs].sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp)).forEach(t=>{
    const k=`${t.hari}, ${t.tgl} ${t.bln} ${t.thn}`;
    if(!byDay[k]) byDay[k]=[];
    byDay[k].push(t);
  });
  const sections = Object.entries(byDay).map(([day,dayTrx])=>{
    const rows = dayTrx.flatMap(t=>rowFn(t,at));
    return [`===== ${day} =====`, header, ...rows, ""].join("\n");
  });
  return sections.join("\n");
}

const TRX_HEADER = "No.Trx,Hari,Tanggal,Jam,Meja,Pax,Metode,Nama Item,Qty,Harga Jual,Modal,Subtotal Jual,Subtotal Modal,Laba Item,Subtotal Trx,Pajak(6%),Service(10%pajak),Total Trx,Bayar,Kembalian,Waktu Unduh";
function trxRow(t, at) {
  const {pajak,service,total}=calcPrice(t.subtotal);
  return t.items.map(item=>{
    const subJ=item.harga*item.qty; const subM=(item.modal||0)*item.qty;
    return [t.id,t.hari,`${t.tgl} ${t.bln} ${t.thn}`,`${t.jam}:${t.mnt}:${t.dtk}`,t.meja,t.pax||0,t.metodeBayar||"cash",`"${item.nama}"`,item.qty,item.harga,item.modal||0,subJ,subM,subJ-subM,t.subtotal,pajak,service,total,t.bayar||0,t.kembalian||0,at].join(",");
  });
}

const LAP_HEADER = "Hari,Tanggal,Jumlah Trx,Total Pax,Rata-rata per Pax (Rp),Pendapatan Kotor (Rp),Pajak (Rp),Service (Rp),Total Bersih (Rp),Total Modal (Rp),Laba Kotor (Rp),Keterangan,Waktu Unduh";
function lapRow(t) { return [t]; } // placeholder, grouped below

function csvLaporan(trxs, at) {
  const byDay={};
  trxs.forEach(t=>{
    const k=`${t.hari}||${t.tgl} ${t.bln} ${t.thn}`;
    if(!byDay[k]) byDay[k]={hari:t.hari,tgl:`${t.tgl} ${t.bln} ${t.thn}`,trx:0,pax:0,pendapatan:0,pajak:0,service:0,modal:0};
    byDay[k].trx++; byDay[k].pax+=(t.pax||0);
    const p=calcPrice(t.subtotal); byDay[k].pendapatan+=t.subtotal; byDay[k].pajak+=p.pajak; byDay[k].service+=p.service;
    t.items.forEach(i=>{byDay[k].modal+=(i.modal||0)*i.qty;});
  });
  const rows=Object.values(byDay).map(d=>{
    const bersih=d.pendapatan+d.pajak+d.service;
    const laba=bersih-d.modal;
    const rpp=d.pax>0?Math.round(bersih/d.pax):0;
    const ket=d.modal===0?"Modal belum diinput":laba>=0?"LABA":"RUGI";
    return [d.hari,d.tgl,d.trx,d.pax,rpp,d.pendapatan,d.pajak,d.service,bersih,d.modal,laba,ket,at].join(",");
  });
  const tot={trx:0,pax:0,pend:0,pjk:0,srv:0,mod:0};
  trxs.forEach(t=>{tot.trx++;tot.pax+=(t.pax||0);const p=calcPrice(t.subtotal);tot.pend+=t.subtotal;tot.pjk+=p.pajak;tot.srv+=p.service;t.items.forEach(i=>{tot.mod+=(i.modal||0)*i.qty;});});
  const totBersih=tot.pend+tot.pjk+tot.srv; const totLaba=totBersih-tot.mod;
  const totRpp=tot.pax>0?Math.round(totBersih/tot.pax):0;
  rows.push(["TOTAL","",tot.trx,tot.pax,totRpp,tot.pend,tot.pjk,tot.srv,totBersih,tot.mod,totLaba,tot.mod===0?"Modal belum diinput":totLaba>=0?"LABA":"RUGI",at].join(","));
  return [LAP_HEADER,...rows].join("\n");
}

function csvSalesRate(trxs, menuList, at) {
  const map={};
  menuList.forEach(m=>{ map[m.nama]={nama:m.nama,qty:0,rev:0,modal:0}; });
  trxs.forEach(t=>{t.items.forEach(i=>{
    if(!map[i.nama]) map[i.nama]={nama:i.nama,qty:0,rev:0,modal:0};
    map[i.nama].qty+=i.qty; map[i.nama].rev+=i.harga*i.qty; map[i.nama].modal+=(i.modal||0)*i.qty;
  });});
  const sorted=Object.values(map).sort((a,b)=>b.qty-a.qty);
  const h="Peringkat,Nama Menu,Total Qty,Pendapatan (Rp),Modal (Rp),Laba (Rp),Status,Waktu Unduh";
  const rowsFn=(list)=>list.map((m,i)=>[i+1,`"${m.nama}"`,m.qty,m.rev,m.modal,m.rev-m.modal,m.qty===0?"BELUM TERJUAL":"Terjual",at].join(","));
  const top10=sorted.slice(0,10); const bot10=[...sorted].reverse().slice(0,10);
  const unsold=sorted.filter(m=>m.qty===0);
  return [
    "TOP 10 MENU TERLAKU", h, ...rowsFn(top10), "",
    "TOP 10 MENU PALING SEDIKIT TERJUAL", h, ...rowsFn(bot10), "",
    "MENU BELUM TERJUAL SAMA SEKALI", h, ...rowsFn(unsold),
  ].join("\n");
}

function csvPerMenu(trxs, menuList, at) {
  const h="Nama Menu,Kategori,Harga Jual,Modal,Total Qty,Pendapatan,Total Modal,Laba,Margin (%),Status,Waktu Unduh";
  const map={};
  trxs.forEach(t=>{t.items.forEach(i=>{
    if(!map[i.nama]) map[i.nama]={qty:0,rev:0,modal:0};
    map[i.nama].qty+=i.qty; map[i.nama].rev+=i.harga*i.qty; map[i.nama].modal+=(i.modal||0)*i.qty;
  });});
  const rows=menuList.map(m=>{
    const d=map[m.nama]||{qty:0,rev:0,modal:0};
    const laba=d.rev-d.modal; const margin=d.rev>0?((laba/d.rev)*100).toFixed(1):"N/A";
    const status=d.qty===0?"Belum Terjual":"Terjual";
    return [`"${m.nama}"`,m.kategori,m.harga,m.modal||0,d.qty,d.rev,d.modal,laba,margin,status,at].join(",");
  });
  return [h,...rows].join("\n");
}

function csvMetodeBayar(trxs, at) {
  const METHODS = ["cash","debit-bca","debit-bni","qris-bca","qris-bni"];
  const LABELS_M = {"cash":"Tunai","debit-bca":"Debit BCA","debit-bni":"Debit BNI","qris-bca":"QRIS BCA","qris-bni":"QRIS BNI","transfer-bca":"Debit BCA","qris":"QRIS BCA"};
  const normalize = m => m==="transfer-bca"?"debit-bca":m==="qris"?"qris-bca":m;

  // Per hari per metode
  const byDay = {};
  trxs.forEach(t => {
    const k = `${t.hari}||${t.tgl} ${t.bln} ${t.thn}`;
    const m = normalize(t.metodeBayar);
    if(!byDay[k]) byDay[k] = {hari:t.hari, tgl:`${t.tgl} ${t.bln} ${t.thn}`, data:{}};
    if(!byDay[k].data[m]) byDay[k].data[m] = {trx:0,total:0};
    byDay[k].data[m].trx++;
    byDay[k].data[m].total += t.total;
  });

  const h = "Hari,Tanggal,Metode Bayar,Jumlah Trx,Total Pendapatan (Rp),Waktu Unduh";
  const rows = [];
  Object.values(byDay).forEach(day => {
    METHODS.forEach(m => {
      const d = day.data[m];
      if(d) rows.push([day.hari, day.tgl, LABELS_M[m], d.trx, d.total, at].join(","));
    });
    rows.push("");
  });

  // Ringkasan total
  const sumRows = METHODS.map(m => {
    const filtered = trxs.filter(t => normalize(t.metodeBayar)===m);
    const tot = filtered.reduce((s,t)=>s+t.total,0);
    return ["TOTAL","Semua Hari", LABELS_M[m], filtered.length, tot, at].join(",");
  });
  const grandTotal = trxs.reduce((s,t)=>s+t.total,0);
  sumRows.push(["GRAND TOTAL","","Semua Metode",trxs.length,grandTotal,at].join(","));

  return ["=== DETAIL PER HARI ===", h, ...rows, "=== RINGKASAN TOTAL ===", h, ...sumRows].join("\n");
}




export {csvByDay,TRX_HEADER, LAP_HEADER, csvLaporan, csvSalesRate, csvPerMenu, csvMetodeBayar, trxRow};