function calcPrice(subtotal, { taxEnabled = true, serviceEnabled = true } = {}) {
  // Service fee 6% (dibulatkan ke bawah dengan Math.trunc)
  const svc = serviceEnabled ? Math.trunc(subtotal * 0.06) : 0;
  // Tax 10% dari (subtotal + service) (dibulatkan ke bawah dengan Math.trunc)
  const tax = taxEnabled ? Math.trunc((subtotal + svc) * 0.10) : 0;
  // Total dibulatkan ke atas dengan Math.ceil
  const total = Math.ceil(subtotal + tax + svc);
  return { pajak: tax, service: svc, total };
}


export {calcPrice};