import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",           // wajib untuk Electron agar path asset relatif
  build: { outDir: "dist" },
});
