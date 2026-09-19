import { useCallback } from "react";
import { api } from "../../utilities/utils.js";

// Factory for expense-category CRUD handlers. NOT a hook.
export function createExpenseCategoryHandlers({
  settings,
  setSettings,
  toast_,
  newExpenseCategoryLabel,
  setNewExpenseCategoryLabel,
}) {
  const addExpenseCategory = useCallback(async () => {
    const label = newExpenseCategoryLabel.trim();
    if (!label) { toast_("Nama kategori pengeluaran wajib diisi", "err"); return; }
    if (settings.expenseCategories.some(c => c.label.toLowerCase() === label.toLowerCase())) {
      toast_("Kategori pengeluaran sudah ada", "err"); return;
    }
    const newCategory = { key: `expense_${Date.now()}`, label };
    const updated = [...settings.expenseCategories, newCategory];
    const s = { ...settings, expenseCategories: updated };
    await api.saveSettings(s);
    setSettings(s);
    setNewExpenseCategoryLabel("");
    toast_(`Kategori "${label}" ditambahkan`, "ok");
  }, [settings, newExpenseCategoryLabel, toast_]);

  const deleteExpenseCategory = useCallback(async (key) => {
    const updated = settings.expenseCategories.filter(c => c.key !== key);
    const s = { ...settings, expenseCategories: updated };
    await api.saveSettings(s);
    setSettings(s);
    toast_("Kategori pengeluaran dihapus", "ok");
  }, [settings, toast_]);

  return { addExpenseCategory, deleteExpenseCategory };
}
