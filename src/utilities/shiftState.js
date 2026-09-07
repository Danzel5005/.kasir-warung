function resolveShiftTarget({ shifts = [], activeShift = null, selectedShiftId = null }) {
  const persistedOpen = (shifts || []).find((shift) => shift && shift.status === "open");
  const preferred = persistedOpen || activeShift || null;
  const targetShiftId = preferred?.id || selectedShiftId;

  if (!targetShiftId) return null;

  const found = (shifts || []).find((shift) => shift && shift.id === targetShiftId) || preferred;
  return found || null;
}

export { resolveShiftTarget };
