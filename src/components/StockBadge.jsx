import { memo } from "react";
import { G, OR, W, RADIUS, TYPOGRAPHY, COLOR_PALETTE } from "../constants/design.js";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "../utilities/stock.js";

function StockBadge({ stok, threshold = DEFAULT_LOW_STOCK_THRESHOLD }) {
  if (stok === null || stok === undefined) return null;
  const c = stok === 0 ? COLOR_PALETTE.danger : stok <= threshold ? OR : G;
  return <span style={{fontSize:TYPOGRAPHY.label.fontSize,fontWeight:700,color:W,background:c,borderRadius:RADIUS.sm,padding:"2px 6px"}}>{stok===0?"Habis":`Stok: ${stok}`}</span>;
}

export default memo(StockBadge);
