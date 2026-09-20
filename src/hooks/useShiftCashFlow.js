import { useState, useCallback } from "react";
import { api } from "../utilities/utils.js";
import { resolveShiftTarget } from "../utilities/shiftState.js";

function useShiftCashFlow({ authH, toastH, settingsH }) {
  const [openingCashModal, setOpeningCashModal] = useState(false);
  const [openingCashInput, setOpeningCashInput] = useState("");
  const [expenseModal, setExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ deskripsi: "", kategori: "operasional", jumlah: "" });
  const [expenseCategoryDraft, setExpenseCategoryDraft] = useState("");

  const handleSaveOpeningCash = useCallback(async () => {
    try {
      const savedShifts = await api.loadShifts();
      const targetShift = resolveShiftTarget({
        shifts: savedShifts || authH.shifts || [],
        activeShift: authH.activeShift,
        selectedShiftId: authH.selectedShiftId,
      });
      const targetShiftId = targetShift?.id || authH.selectedShiftId;
      if (!targetShiftId) return;

      const value = Number(String(openingCashInput).replace(/[^\d]/g, "")) || 0;
      authH.setSelectedShiftId(targetShiftId);
      const updated = await authH.updateShift(targetShiftId, { openingCash: value }, savedShifts || authH.shifts || []);
      if (!updated) {
        toastH.toast_("Shift aktif tidak ditemukan", "err");
        return;
      }

      setOpeningCashInput("");
      setOpeningCashModal(false);
      toastH.toast_("Uang kas berhasil disimpan", "ok");
    } catch (err) {
      console.error("[App] save opening cash failed:", err);
      toastH.toast_("Gagal menyimpan uang kas awal", "err");
    }
  }, [authH, openingCashInput, toastH]);

  const handleSkipOpeningCash = useCallback(() => {
    setOpeningCashInput("");
    setOpeningCashModal(false);
  }, []);

  const handleSaveExpense = useCallback(async () => {
    if (!authH.activeShift || !expenseForm.deskripsi.trim() || !expenseForm.jumlah) return;
    const amount = Number(String(expenseForm.jumlah).replace(/[^\d]/g, "")) || 0;
    const nextExpense = {
      id: `exp_${Date.now()}`,
      deskripsi: expenseForm.deskripsi.trim(),
      kategori: expenseForm.kategori,
      jumlah: amount,
      createdAt: new Date().toISOString(),
    };
    const currentExpenses = Array.isArray(authH.activeShift?.expenses) ? authH.activeShift.expenses : [];
    await authH.updateShift(authH.activeShift.id, { expenses: [...currentExpenses, nextExpense] });
    setExpenseForm({ deskripsi: "", kategori: "operasional", jumlah: "" });
    setExpenseModal(false);
    toastH.toast_("Pengeluaran berhasil ditambahkan", "ok");
  }, [authH, expenseForm, toastH]);

  const expenseCategories = settingsH.settings.expenseCategories || [];
  const currentShiftExpenses = Array.isArray(authH.activeShift?.expenses) ? authH.activeShift.expenses : [];
  const totalExpenses = currentShiftExpenses.reduce((sum, item) => sum + Number(item.jumlah || 0), 0);
  const openingCash = Number(authH.activeShift?.openingCash || 0);

  return {
    openingCashModal,
    setOpeningCashModal,
    openingCashInput,
    setOpeningCashInput,
    expenseModal,
    setExpenseModal,
    expenseForm,
    setExpenseForm,
    expenseCategoryDraft,
    setExpenseCategoryDraft,
    handleSaveOpeningCash,
    handleSkipOpeningCash,
    handleSaveExpense,
    expenseCategories,
    currentShiftExpenses,
    totalExpenses,
    openingCash,
  };
}

export { useShiftCashFlow };
