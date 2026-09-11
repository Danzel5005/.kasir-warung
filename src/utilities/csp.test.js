import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Guard: index.html harus punya CSP tanpa 'unsafe-eval'.
// Kalau meta ini dihapus/diubah, Electron akan log ulang
// "Insecure Content-Security-Policy" warning saat dev.
const here = path.dirname(fileURLToPath(import.meta.url));
const html = readFileSync(path.join(here, "../../index.html"), "utf8");

describe("index.html Content-Security-Policy", () => {
  it("punya meta CSP", () => {
    const m = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i);
    expect(m, "meta CSP hilang dari index.html").toBeTruthy();
  });

  it("CSP tidak mengandung unsafe-eval", () => {
    const m = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i);
    expect(m?.[1] || "").not.toContain("unsafe-eval");
  });

  it("CSP mengizinkan img data: (logo base64)", () => {
    const m = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i);
    expect(m?.[1] || "").toMatch(/img-src[^;]*data:/);
  });
});
