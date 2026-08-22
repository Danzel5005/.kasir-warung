function calcPrice(subtotal) {
  // Total = subtotal (no tax, no service fee)
  const total = Math.ceil(subtotal);
  return { pajak: 0, service: 0, total };
}


export {calcPrice};