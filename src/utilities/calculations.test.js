import { describe, it, expect } from "vitest";
import { calcPrice } from "./calculations.js";

describe("calculations.js - calcPrice", () => {
  describe("Positive Cases", () => {
    it("should correctly calculate service, tax, and total for standard amount", () => {
      // subtotal = 100,000
      // service = trunc(100,000 * 0.06) = 6,000
      // pajak = trunc((100,000 + 6,000) * 0.10) = 10,600
      // total = ceil(100,000 + 10,600 + 6,000) = 116,600
      const res = calcPrice(100000);
      expect(res).toEqual({
        service: 6000,
        pajak: 10600,
        total: 116600,
      });
    });

    it("should handle subtotal of 0", () => {
      const res = calcPrice(0);
      expect(res).toEqual({
        service: 0,
        pajak: 0,
        total: 0,
      });
    });

    it("should calculate correctly for small amounts", () => {
      // subtotal = 150
      // service = trunc(150 * 0.06) = trunc(9) = 9
      // pajak = trunc((150 + 9) * 0.10) = trunc(15.9) = 15
      // total = ceil(150 + 15 + 9) = 174
      const res = calcPrice(150);
      expect(res).toEqual({
        service: 9,
        pajak: 15,
        total: 174,
      });
    });

    it("should handle typical coffee order amounts", () => {
      // subtotal = 35000 (1 Coffee + 1 Snack)
      // service = trunc(35000 * 0.06) = 2100
      // pajak = trunc((35000 + 2100) * 0.10) = 3710
      // total = ceil(35000 + 3710 + 2100) = 40810
      const res = calcPrice(35000);
      expect(res.service).toBe(2100);
      expect(res.pajak).toBe(3710);
      expect(res.total).toBe(40810);
    });
  });

  describe("Edge & Precision Cases", () => {
    it("should truncate decimal precision in service and tax calculations using Math.trunc", () => {
      // subtotal = 33333
      // service = trunc(33333 * 0.06) = trunc(1999.98) = 1999
      // pajak = trunc((33333 + 1999) * 0.10) = trunc(3533.2) = 3533
      // total = ceil(33333 + 3533 + 1999) = 38865
      const res = calcPrice(33333);
      expect(res.service).toBe(1999);
      expect(res.pajak).toBe(3533);
      expect(res.total).toBe(38865);
    });

    it("should handle large total amounts without losing precision", () => {
      const subtotal = 1_000_000_000;
      const res = calcPrice(subtotal);
      expect(res.service).toBe(60000000);
      expect(res.pajak).toBe(106000000);
      expect(res.total).toBe(1166000000);
    });

    it("should handle floating point subtotal inputs", () => {
      const res = calcPrice(100.55);
      expect(Number.isInteger(res.service)).toBe(true);
      expect(Number.isInteger(res.pajak)).toBe(true);
      expect(Number.isInteger(res.total)).toBe(true);
    });
  });

  describe("Negative Cases & Defensive Behavior", () => {
    it("should handle negative subtotal predictably", () => {
      const res = calcPrice(-10000);
      // service = trunc(-600) = -600
      // pajak = trunc(-1060) = -1060
      // total = ceil(-11660) = -11660
      expect(res.service).toBe(-600);
      expect(res.pajak).toBe(-1060);
      expect(res.total).toBe(-11660);
    });
  });
});
