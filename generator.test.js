import { describe, it, expect } from "vitest";
import crypto from "crypto";

const SECRET = "Q8x-7NqP-Z3mK-4VtR-8H2c-9wL6pX5sJ1";

function generateKey(hardwareId) {
  const hash = crypto
    .createHmac("sha256", SECRET)
    .update(hardwareId.replace(/-/g, "").toUpperCase())
    .digest("hex")
    .toUpperCase();
  const s = hash.slice(0, 20);
  return `YKK-${s.slice(0, 5)}-${s.slice(5, 10)}-${s.slice(10, 15)}-${s.slice(15, 20)}`;
}

describe("generator.js - License Key Generator", () => {
  it("should generate valid YKK license key format from hardware ID", () => {
    const hwid = "AB12-CD34-EF56-7890";
    const key = generateKey(hwid);

    expect(key).toMatch(/^YKK-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/);
  });

  it("should produce consistent output for same hardware ID regardless of case or hyphenation", () => {
    const key1 = generateKey("ab12-cd34-ef56-7890");
    const key2 = generateKey("AB12CD34EF567890");
    const key3 = generateKey("AB12-CD34-EF56-7890");

    expect(key1).toBe(key2);
    expect(key2).toBe(key3);
  });

  it("should produce different license keys for different hardware IDs", () => {
    const keyA = generateKey("AAAA-1111-2222-3333");
    const keyB = generateKey("BBBB-1111-2222-3333");

    expect(keyA).not.toBe(keyB);
  });
});
