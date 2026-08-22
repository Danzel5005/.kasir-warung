import { describe, it, expect } from "vitest";
import { calcPrice } from "./calculations.js";

describe("calculations.js - calcPrice", () => {
  describe("Basic Calculation (no tax, no service)", () => {
    it("should return subtotal as total when no tax/service", () => {
      const res = calcPrice(100000);
      expect(res).toEqual({
        service: 0,
        pajak: 0,
        total: 100000,
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

    it("should round up total using Math.ceil", () => {
      const res = calcPrice(150.5);
      expect(res).toEqual({
        service: 0,
        pajak: 0,
        total: 151,
      });
    });

    it("should handle typical coffee order amounts", () => {
      const res = calcPrice(35000);
      expect(res.service).toBe(0);
      expect(res.pajak).toBe(0);
      expect(res.total).toBe(35000);
    });
  });

  describe("Edge Cases", () => {
    it("should handle large total amounts without losing precision", () => {
      const res = calcPrice(1_000_000_000);
      expect(res.service).toBe(0);
      expect(res.pajak).toBe(0);
      expect(res.total).toBe(1_000_000_000);
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
      expect(res.service).toBe(0);
      expect(res.pajak).toBe(0);
      expect(res.total).toBe(-10000);
    });
  });
});
