function normalizeBarcodeInput(raw = "") {
  return String(raw ?? "")
    .replace(/[\r\n\t\s]+/g, "")
    .trim();
}

function findMenuByMenuId(menu = [], rawCode = "") {
  const normalized = normalizeBarcodeInput(rawCode).toLowerCase();
  if (!normalized) return null;

  return menu.find((item) => {
    const menuId = String(item?.menuId ?? "").trim().toLowerCase();
    return menuId === normalized;
  }) || null;
}

export { normalizeBarcodeInput, findMenuByMenuId };
