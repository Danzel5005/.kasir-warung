function calcPrice(subtotal, { taxEnabled = true, serviceEnabled = true } = {}) {
  const svc  = serviceEnabled ? Math.trunc(subtotal * 0.06) : 0;
  const tax  = taxEnabled     ? Math.trunc((subtotal + svc) * 0.10) : 0;
  const total = Math.ceil(subtotal + tax + svc);
  return { pajak: tax, service: svc, total };
}


export {calcPrice};