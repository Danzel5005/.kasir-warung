# Rencana Pemecahan `SettingsPanels.jsx` + `useSettings.js`

Kondisi sekarang: `SettingsPanels.jsx` (167 baris, 27.8 KB) berisi 8 tab, `useSettings.js` (389 baris, 15.8 KB) berisi state+logic untuk semua tab itu. Satu-satunya pemakai kedua file ini adalah `SettingsModal.jsx` — blast radius kecil.

**Perbedaan penting dari kasus `App.jsx`:** `SettingsPanels.jsx` aman dipecah murni (tiap tab sudah jadi fungsi terpisah, tinggal pindah file). `useSettings.js` **tidak bisa** dipecah dengan cara yang sama — dijelaskan di bagian bawah kenapa.

---

## Bagian 1 — `SettingsPanels.jsx` (aman, pecah langsung)

Tiap tab sudah berupa named export yang berdiri sendiri. Rencana: 1 file per tab, folder baru `src/components/modals/settings-tabs/`.

| File baru | Isi (dari baris asal) |
|---|---|
| `settings-tabs/PrinterSettingsTab.jsx` | `PrinterSettingsTab` (25-56) |
| `settings-tabs/WarungSettingsTab.jsx` | `WarungField` (helper) + `WarungSettingsTab` (58-75) |
| `settings-tabs/PaymentSettingsTab.jsx` | `PaymentSettingsTab` (77-80) |
| `settings-tabs/QrisSettingsTab.jsx` | `QrisSettingsTab` (82-88) |
| `settings-tabs/ReceiptSettingsTab.jsx` | `ReceiptSettingsTab` (90-93) |
| `settings-tabs/PricingSettingsTab.jsx` | `getTargetName` (helper) + `PricingSettingsTab` (95-125) |
| `settings-tabs/UsersSettingsTab.jsx` | `SelfPasswordPanel` (helper) + `UsersSettingsTab` (127-166) |
| `settings-tabs/BackupSettingsTab.jsx` | `BackupSettingsTab` (9-11) |
| `settings-tabs/shared.js` | `fieldStyle`, `SaveButton` — dipakai lebih dari 1 tab, taruh di sini biar tidak duplikat |
| `settings-tabs/index.js` | barrel: `export * from "./PrinterSettingsTab.jsx"` dst untuk semua 8 |

**`SettingsModal.jsx`** cukup ubah 1 baris import:
```diff
- } from "./SettingsPanels.jsx";
+ } from "./settings-tabs/index.js";
```
Tidak ada baris lain di `SettingsModal.jsx` yang berubah — semua nama export tetap sama.

Hapus `SettingsPanels.jsx` lama setelah dipindah semua.

**Dampak:** dari 1 file 27.8 KB → 9 file kecil (masing-masing 1-5 KB), gampang ditemukan pas mau edit 1 tab spesifik.

**Cek:** buka tiap tab Settings satu-satu, pastikan tampil & berfungsi sama.

---

## Bagian 2 — `useSettings.js` (perlu hati-hati, TIDAK sama seperti Bagian 1)

### Kenapa ini beda kasus

Semua sub-domain (printer, warung, payment, qris, receipt field, pricing/diskon, low-stock) berbagi **satu** `settings` state dan **satu** pemanggilan `api.saveSettings(s)` untuk persist ke `settings.json`. Komentar di kode sendiri (baris 114-116, 131-134, dst) sudah memperingatkan: kalau baca `settings` dari closure yang stale, perubahan kedua akan **menimpa balik** perubahan pertama yang barusan disimpan.

Kalau dipecah jadi hook terpisah dengan `useState` sendiri-sendiri (`usePrinterSettings()`, `usePaymentSettings()`, dst), setiap hook akan punya salinan `settings` sendiri yang bisa saling basi — persis race condition yang sudah diperingatkan di komentar itu, cuma sekarang terjadi antar-hook, bukan cuma antar-panggilan. **Jangan lakukan itu.**

### Pendekatan yang aman
Tetap **satu** pemilik state (`useSettings.js` tidak dipecah jadi banyak hook), tapi isi badan fungsinya (kumpulan `useCallback`) dipindah jadi **factory function biasa** per domain — bukan hook, cuma fungsi yang menerima `{ settings, setSettings, toast_, onChange }` dan mengembalikan kumpulan handler. `useSettings.js` sendiri jadi tinggal manggil tiap factory dan gabung hasilnya.

| File baru | Isi (fungsi dipindah) |
|---|---|
| `src/hooks/settings/printer.js` | `openPrinterModal`, `selectPrinter`, `setReceiptPaperWidth`, `printHTML` |
| `src/hooks/settings/warung.js` | `setWarungName`, `setWarungAddress`, `setWarungPhone` |
| `src/hooks/settings/paymentMethods.js` | `addPaymentMethod`, `deletePaymentMethod`, `normalizePaymentMethodCategory` |
| `src/hooks/settings/qris.js` | `handleQrisImageUpload`, `deleteQrisImage` |
| `src/hooks/settings/receiptFields.js` | `toggleReceiptAdditionalRequired`, `deleteReceiptAdditional`, `addReceiptField` |
| `src/hooks/settings/pricing.js` | `savePricing`, `setLowStockThreshold` |
| `src/hooks/settings/expenseCategories.js` | `addExpenseCategory`, `deleteExpenseCategory` |
| `src/hooks/settings/logo.js` | `handleLogoUpload`, `handleLogoRemove` |

Contoh pola (`printer.js`):
```js
// src/hooks/settings/printer.js
import { api } from "../../utilities/utils.js";

export function createPrinterHandlers({ settings, setSettings, toast_ }) {
  const selectPrinter = async (name) => {
    const s = { ...settings, printerName: name };
    await api.saveSettings(s);
    setSettings(s);
    toast_(`Printer: ${name || "Default"}`, "ok");
  };
  // ... openPrinterModal, setReceiptPaperWidth, printHTML sama pola
  return { selectPrinter, /* ... */ };
}
```

`useSettings.js` sesudahnya:
```js
function useSettings({ toast_, onChange }) {
  const [settings, setSettings] = useState({ /* ...tetap sama... */ });
  // ...semua useState lain tetap di sini, tidak pindah...

  const deps = { settings, setSettings, toast_, onChange };
  return {
    settings, setSettings, /* ...state lain... */,
    ...createPrinterHandlers(deps),
    ...createWarungHandlers(deps),
    ...createPaymentMethodHandlers(deps),
    ...createQrisHandlers(deps),
    ...createReceiptFieldHandlers(deps),
    ...createPricingHandlers(deps),
    ...createExpenseCategoryHandlers(deps),
    ...createLogoHandlers(deps),
  };
}
```

**Penting:** karena `deps` dibuat ulang tiap render dengan `settings` versi terbaru (bukan lewat `useCallback` di level ini), race condition stale-closure yang disebutkan di atas **tidak bertambah parah** — tiap handler baru selalu dapat `settings` terbaru saat hook di-render ulang. Kalau mau tetap pakai `useCallback` di dalam tiap factory demi konsistensi gaya lama, deps arraynya wajib `[settings, toast_]` sama seperti sekarang — jangan dihilangkan.

**Dampak:** `useSettings.js` dari 389 baris → kira-kira 60-80 baris (cuma state + pemanggilan factory), sisanya tersebar di 8 file kecil per domain.

**Cek yang wajib sebelum dianggap selesai:**
- Ganti printer 2x berturut-turut → field lain (warung name, dsb) tidak ke-reset (ini persis bug yang komentar lama peringatkan)
- Tambah metode pembayaran lalu langsung upload QRIS untuk metode itu → dua-duanya kesimpan, tidak saling timpa
- `npm test` tetap hijau (kalau ada test untuk `useSettings`, cek dulu apakah test-nya import fungsi spesifik yang sekarang pindah lokasi — perlu update path import di test)

---

## Ringkasan

| Bagian | Risiko | Baris berkurang |
|---|---|---|
| `SettingsPanels.jsx` → 9 file | Rendah — murni pindah, 1 titik import | 167 → ~15-20 baris tersisa (kalau file lama dihapus, jadi 0) |
| `useSettings.js` → 1 hook + 8 factory file | Sedang — HARUS jaga pola `{...settings, ...patch}` per domain, jangan pisah state | 389 → ~70 |

Kerjakan Bagian 1 dulu (aman, cepat), baru Bagian 2. Jangan balik urutan — kalau Bagian 2 keliru dan bikin bug race-condition, lebih gampang diisolasi kalau Bagian 1 sudah beres duluan dan tidak ikut berubah.
