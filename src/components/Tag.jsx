import { RADIUS, TYPOGRAPHY } from "../constants/design.js";

function Tag({label, bg, tc}) {
  return <span style={{fontSize:TYPOGRAPHY.label.fontSize,fontWeight:700,color:tc,background:bg,borderRadius:RADIUS.sm,padding:"2px 7px"}}>{label}</span>;
}

export {Tag};
