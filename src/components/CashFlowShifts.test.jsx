import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it, vi } from "vitest";
import CashFlowShifts, { filterCashFlowShifts } from "./CashFlowShifts.jsx";

// Vitest's default JSX transform is classic; production uses Vite's React plugin.
vi.stubGlobal("React", React);
afterAll(() => vi.unstubAllGlobals());

const shifts = [
  { id: "old", shiftNum: 12, status: "closed", username: "kasirLama", operator: "Budi" },
  { id: "current", shiftNum: 23, status: "open", username: "kasirBaru", operator: "Sari" },
];

describe("cash flow shift browsing", () => {
  it("shows only active shifts on the page, with a history button", () => {
    const html = renderToStaticMarkup(<CashFlowShifts shifts={shifts} />);
    expect(html).toContain("Shift 23");
    expect(html).not.toContain("Shift 12");
    expect(html).toContain("Tampilkan Semua Shift");
    expect(html).toContain("Memuat arus kas");
  });

  it("keeps history accessible when no shifts are active", () => {
    const html = renderToStaticMarkup(<CashFlowShifts shifts={[shifts[0]]} />);
    expect(html).toContain("Tidak ada shift aktif");
    expect(html).toContain("Tampilkan Semua Shift");
  });

  it("includes a restored active shift without duplicating an existing one", () => {
    const render = list => renderToStaticMarkup(<CashFlowShifts shifts={list} activeShift={shifts[1]} />);
    expect(render([])).toContain("Shift 23");
    expect(render(shifts).match(/aria-label="Arus kas Shift 23"/g)).toHaveLength(1);
  });

  it("searches all statuses by shift number, username, or display name", () => {
    expect(filterCashFlowShifts(shifts, "12")).toEqual([shifts[0]]);
    expect(filterCashFlowShifts(shifts, "  KASIRlama ")).toEqual([shifts[0]]);
    expect(filterCashFlowShifts(shifts, "sari")).toEqual([shifts[1]]);
    expect(filterCashFlowShifts(shifts, " ")).toEqual(shifts);
    expect(filterCashFlowShifts(shifts, "missing")).toEqual([]);
    expect(filterCashFlowShifts([{ shiftNum: 5 }], "5")).toHaveLength(1);
  });
});