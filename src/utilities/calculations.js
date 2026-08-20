function calcPrice(subtotal, { taxEnabled = false, serviceEnabled = false } = {}) {
  // Tax and service fees have been removed
  const svc = 0;
  const tax = 0;
  const total = Math.ceil(subtotal + tax + svc);
  return { pajak: tax, service: svc, total };
}


export {calcPrice};