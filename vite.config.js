import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",           
  build: {
    outDir: "dist",
    rollupOptions: {
      output: {
        // Pisahkan React dari kode aplikasi: chunk vendor jarang berubah
        // sehingga cache-nya lebih awet dan chunk aplikasi lebih kecil.
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
        },
      },
    },
  },
});
