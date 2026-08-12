function calcPrice(subtotal) {
  const service   = Math.trunc(subtotal * 0.06);
  const pajak = Math.trunc((subtotal+service) * 0.10);
  const total   = Math.ceil(subtotal + pajak + service);
  return { pajak, service, total };
}


export {calcPrice};