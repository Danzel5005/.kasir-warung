import {METODE_LABELS} from "../constants/payments.js";
import {calcPrice} from "./calculations.js";

const HARI  = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
function getNow() {
  const d = new Date();
  return {
    timestamp:d.toISOString(),
    hari:HARI[d.getDay()], tgl:String(d.getDate()).padStart(2,"0"),
    bln:BULAN[d.getMonth()], blnNum:String(d.getMonth()+1).padStart(2,"0"),
    thn:String(d.getFullYear()),
    jam:String(d.getHours()).padStart(2,"0"),
    mnt:String(d.getMinutes()).padStart(2,"0"),
    dtk:String(d.getSeconds()).padStart(2,"0"),
  };
}

const fmt   = (n) => `Rp ${Number(n||0).toLocaleString("id-ID")}`;
const fmtNum = (n) => Number(n||0).toLocaleString("id-ID");

// Helper function to format additionals
const formatAdditionals = (additionals) => {
  if (!additionals) return "";
  const parts = [];
  if (additionals.cupsize) parts.push(additionals.cupsize);
  if (additionals.sugar) parts.push(additionals.sugar);
  if (additionals.temperature) {
    if (additionals.temperature === "ice" && additionals.ice_level) {
      parts.push(`${additionals.temperature} (${additionals.ice_level})`);
    } else {
      parts.push(additionals.temperature);
    }
  }
  return parts.join(" • ");
};

function buildReceiptHTML(trx, logo) {
  const { pajak, service, total } = calcPrice(trx.subtotal);
  const metodeLabel = globalThis.METODE_LABELS?.[trx.metodeBayar] ?? trx.metodeBayar;
  const rows = trx.items.map(i=>{
    const addStr = formatAdditionals(i.additionals);
    return `<div class="row"><span>${i.qty}x ${i.nama}</span><span>${fmt(i.harga*i.qty)}</span></div>${addStr?`<div class="row-sub"><span>${addStr}</span></div>`:""}`
  }).join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box;
    -weblit-print-color-adjust:exact;
    print-color-adjust:exact;}
    body{font-family:monospace;
    font-size:12px;
    width:80mm;
    padding:3mm;
    -webkit-front-smoothing:none;
    font-smooth:never;}
    @media print{
    @page{size:80mm auto;
    margin:0mm;}
    body{width:80mm;padding:2mm;}
    }

    .center{text-align:center;} .bold{font-weight:700;} .row{display:flex;justify-content:space-between;margin-bottom:2px;}
    .row-sub{display:flex;justify-content:flex-start;margin-bottom:3px;margin-left:8px;font-size:10px;color:#666;margin-top:-2px;}
    .line{border-top:1px dashed #000;margin:5px 0;} .logo{width:40px;height:40px;object-fit:cover;border-radius:4px;}
    h2{font-size:8px;} .big{font-size:9px;}

  </style></head><body>
    <div class="center">
      ${logo?`<img src="${logo}" class="logo" /><br/>`:""}
      <h2 class="bold">restaurant</h2>
      <div>${trx.hari},
      ${trx.tgl}
      ${trx.bln}
      ${trx.thn} &bull;
      ${trx.jam}:${trx.mnt}:${trx.dtk}
      </div>
      <div class="bold">Meja ${trx.meja} &bull; TRX #${trx.id}${trx.pax?` &bull; ${trx.pax} Pax`:""}</div>
      <div>${metodeLabel}</div>
    </div>
    <div class="line"></div>
    ${rows}
    <div class="line"></div>
    <div class="row"><span>Subtotal</span><span>${fmt(trx.subtotal)}</span></div>
    <div class="row"><span>Service 6% </span><span>${fmt(service)}</span></div>
    <div class="row"><span>Pajak 10%</span><span>${fmt(pajak)}</span></div>
    <div class="line"></div>
    <div class="row big bold"><span>TOTAL</span><span>${fmt(total)}</span></div>
    ${trx.metodeBayar==="cash"?`<div class="row"><span>Bayar</span><span>${fmt(trx.bayar)}</span></div><div class="row"><span>Kembalian</span><span>${fmt(trx.kembalian)}</span></div>`:""}
    <div class="line"></div>
    <div class="center">Terima kasih atas kunjungan Anda!<br/>Selamat menikmati</div>
  </body></html>`;
}
function buildPreviewHTML(tableNum, pax, items, logo) {
  const subtotal = items.reduce((s, i) => s + i.harga * i.qty, 0);
  const { pajak, service, total } = calcPrice(subtotal);
  const t = getNow();
  const rows = items.map(i => {
    const addStr = formatAdditionals(i.additionals);
    return `<div class="row"><span>${i.qty}x ${i.nama}</span><span>${fmt(i.harga * i.qty)}</span></div>${addStr?`<div class="row-sub"><span>${addStr}</span></div>`:""}`
  }).join("");
  return `<!DOCTYPE html>
  <html>
    <head>
    <meta charset="utf-8">
      <style>
          * {
            margin:0;
          padding:0;
          box-sizing:border-box;
          -webkit-print-color-adjust:exact;
          print-color-adjust:exact;
            }
            html
              {
                width:80mm;
                margin:0;
                padding:0;
              }
            body
              {
                font-family:monospace;
                font-size:14px;
                width:80mm;
                padding:2mm;
                -webkit-font-smoothing:none;
                font-smooth:never;
                margin:0;
                text-align:left;
              }
            @media print
              {
              @page
                {
                  size:80mm auto;
                  margin:0 ;
                }
              html,body
                {
                  margin:0;
                  padding:0;
                  width:80mm;
                  overflow:hidden;
                }
              }
            .center{
            text-align:center;
              }
            .bold{
            font-weight:700;
            }
            .row{
            display:flex;
            justify-content:space-between;
            margin-bottom:2px;
            }
            .row-sub{
            display:flex;
            justify-content:flex-start;
            margin-bottom:3px;
            margin-left:8px;
            font-size:11px;
            color:#666;
            margin-top:-2px;
            }
            .line{
            border-top:1px dashed #000;
            margin:5px 0;
            }
            .logo{
            width:40px;
            height:40px;
            object-fit:cover;
            border-radius:4px;
            }
            h2{
            font-size:10px;
            }
            .big{
            font-size:12px;
            }
      </style>
  </head>

  <body>
    <div class="center">
      ${logo ? `<img src="${logo}" class="logo" /><br/>` : ""}
      <h2 class="bold">restaurant</h2>
      <div>${t.hari}, ${t.tgl} ${t.bln} ${t.thn} &bull;
       ${t.jam}:${t.mnt}</div>
      <div class="bold">Meja ${tableNum}${pax ? ` &bull; ${pax} Pax` : ""}
      </div>
      <div style="font-size:9px;color:#888;">-- PREVIEW TAGIHAN --</div>
    </div>
    <div class="line"></div>
    ${rows}
    <div class="line"></div>
    <div class="row"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
    <div class="row"><span>Service (6%)</span><span>${fmt(pajak)}</span></div>
    <div class="row"><span>Pajak (10%)</span><span>${fmt(service)}</span></div>
    <div class="line"></div>
    <div class="row big bold"><span>TOTAL</span><span>${fmt(total)}</span></div>
    <div class="line"></div>
    <div class="center">Belum lunas — mohon menunggu</div>
  </body></html>`;
}
export {buildReceiptHTML, buildPreviewHTML, fmt, fmtNum};