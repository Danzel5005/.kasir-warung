import { memo } from "react";
import { G, OR, W } from "../constants/colors.js";
import { RADIUS, TYPOGRAPHY, COLOR_PALETTE } from "../constants/theme.js";

function StockBadge({ stok }) {
  if (stok === null || stok === undefined) return null;
  const c = stok === 0 ? COLOR_PALETTE.danger : stok <= 5 ? OR : G;
  return <span style={{fontSize:TYPOGRAPHY.label.fontSize,fontWeight:700,color:W,background:c,borderRadius:RADIUS.sm,padding:"2px 6px"}}>{stok===0?"Habis":`Stok: ${stok}`}</span>;
}

export default memo(StockBadge);
