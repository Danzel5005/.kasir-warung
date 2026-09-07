const normalizeCategoryLabel = (value = "") => String(value).trim();

export function updateCategoryLabel(cats = [], targetKey, nextLabel) {
  const cleanedLabel = normalizeCategoryLabel(nextLabel);

  if (!targetKey) {
    throw new Error("Key kategori wajib diisi");
  }

  if (!cleanedLabel) {
    throw new Error("Nama kategori wajib diisi");
  }

  const duplicate = cats.some((cat) => {
    if (cat.key === targetKey) return false;
    return normalizeCategoryLabel(cat.label).toLowerCase() === cleanedLabel.toLowerCase();
  });

  if (duplicate) {
    throw new Error("Kategori sudah ada");
  }

  return cats.map((cat) => {
    if (cat.key !== targetKey) return cat;
    return { ...cat, label: cleanedLabel };
  });
}
