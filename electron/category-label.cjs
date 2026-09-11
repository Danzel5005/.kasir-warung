function getCategoryLabel(categoryKey, cats = []) {
  const category = cats.find((entry) => String(entry.key ?? entry.id) === String(categoryKey));
  return category?.label || category?.name || categoryKey || "Lainnya";
}

module.exports = { getCategoryLabel };
