# Rencana Pemecahan `App.jsx` (God Component)

Kondisi saat ini: `src/App.jsx` = **881 baris**, wiring 10 hook domain (`toastH`, `voidH`, `licenseH`, `authH`, `menuH`, `billsH`, `cartH`, `historyH`, `customersH`, `settingsH`) + 3 layar penuh (skeleton, license, login) + shell workspace (header/nav/body/footer) + 8 modal.

Prinsip yang dipegang: **smallest sensible change**, tidak ada abstraksi baru kecuali memang mengurangi coupling nyata, behavior harus identik 100% setelah refactor (ini murni structural, bukan feature).

---

## Yang TIDAK direkomendasikan disentuh

Fungsi wiring lintas-hook — `processPayment`, `saveOpenBill`, `confirmCloseShift`, `printReceipt`, `printPreview`, `loadBillAndPay`, `executeConfirmDel` (baris 316–434) — ini memang **pekerjaan asli seorang coordinator**: masing-masing butuh potongan dari 3-4 hook berbeda sekaligus. Memindahkannya ke file lain (mis. `usePosOrchestration.js`) cuma memindah baris, bukan mengurangi coupling — sama saja bikin "god hook" pengganti "god component". Ini gak masuk rencana kecuali nanti ada alasan konkret (misal butuh dites terpisah dari React).

Begitu juga `confirmDel` (baris 167) — komentar di kode sudah menjelaskan kenapa ini sengaja tinggal di coordinator (constraint "hook tidak boleh import hook lain"). Jangan dipindah.

---

## Fase 1 — Ekstrak layar penuh (risiko nyaris nol)

Tiga blok JSX ini **self-contained**: tidak wiring logika baru, cuma butuh hook yang sudah ada di-pass sebagai props. Ini murni "extract component", pola yang sama seperti `views/` yang sudah ada.

| Komponen baru | Baris asal | Props dibutuhkan |
|---|---|---|
| `src/components/AppSkeleton.jsx` | 64–118 | tidak ada (statis) |
| `src/screens/LicenseScreen.jsx` | 447–497 | `licenseH`, `showSnakeLoader`, `snakeLoaderTrigger`, `setShowSnakeLoader`, `setSnakeLoaderTrigger`, `setLicenseTransitioning` |
| `src/screens/LoginScreen.jsx` | 499–580 | `authH`, `settingsH`, `handleLogin`, `showPw`, `setShowPw`, `showSnakeLoader`, `snakeLoaderTrigger` |

**Dampak:** App.jsx turun ~250 baris. Tidak ada perubahan behavior — cuma pindah JSX + tambah import.

**Cek:** buka app, pastikan layar skeleton → license → login tampil identik, aktivasi & login masih jalan.

---

## Fase 2 — Ekstrak shell workspace

| Komponen baru | Baris asal | Catatan |
|---|---|---|
| `src/screens/Workspace/Header.jsx` | 595–634 | Logo upload, nav buttons, tombol Pengaturan, badge shift, tombol Tutup Shift. Props: `settingsH`, `authH`, `billsH.bills`, `historyH.history`, `view`, `navigate`, `logoRef` |
| `src/screens/Workspace/ModalStack.jsx` | 737–871 | Semua 8 modal + undo banner + toast. Ini komponen dengan props terbanyak (lihat catatan di bawah) |

**Catatan soal `ModalStack`:** komponen ini akan menerima banyak props (`payModal`, `processPayment`, `cartH`, `voidH`, `receipt`, `menuH`, `settingsH`, `authH`, `confirmCloseShift`, `openingCashModal`, `expenseModal`, `confirmDel`, `toastH`, dst). Ini bukan tanda desain jelek — modal-modal ini memang lintas-domain by design. Alternatif "lebih bersih" (React Context) sengaja **tidak** direkomendasikan sekarang karena nambah lapisan abstraksi + risiko re-render yang belum tentu perlu — cukup terima prop-drilling di titik ini, itu smallest sensible change-nya.

Body view-switch (baris 640–727, render `ViewKasir`/`ViewOpenBill`/dst berdasarkan `view`) **boleh dibiarkan di App.jsx** — sudah rapi (satu blok per view, gampang dibaca), ekstraksi di sini cuma mindah tanpa manfaat jelas.

**Dampak:** App.jsx turun lagi ~200 baris.

**Cek:** semua modal masih muncul di trigger yang sama (bayar, void, tutup shift, kas awal, pengeluaran, hapus konfirmasi, undo, toast).

---

## Fase 3 (opsional) — Ekstrak state UI kas/pengeluaran shift

Baris 175–179 (state) + 197–245 (handler: `handleSaveOpeningCash`, `handleSkipOpeningCash`, `handleSaveExpense`) adalah satu concern yang cohesive: "kas & pengeluaran shift". Bisa jadi hook baru:

```js
// src/hooks/useShiftCashFlow.js
function useShiftCashFlow({ authH, toastH }) {
  // openingCashModal, openingCashInput, expenseModal, expenseForm, expenseCategoryDraft
  // handleSaveOpeningCash, handleSkipOpeningCash, handleSaveExpense
  // return { ...state, ...handlers }
}
```

Pola ini konsisten dengan `useHistory({ authH })` yang sudah ada — hook boleh terima hasil hook lain sebagai parameter, tidak melanggar constraint "no cross-hook import" (karena yang di-import bukan hook-nya, tapi hasilnya, di-pass dari App.jsx).

**Kenapa opsional, bukan wajib:** ini pure state-management move, tidak mengurangi baris JSX (state ini dipakai di dua tempat: trigger di `handleLogin`/header, form di modal yang sudah pindah ke `ModalStack` di Fase 2). Manfaatnya lebih ke "kerapian App.jsx", bukan pengurangan risiko. Kerjakan kalau Fase 1-2 sudah kelar dan masih ada waktu.

**Tidak direkomendasikan digabung** dengan snake-loader/login-transition state (baris 170–174) — state itu dipakai bersama oleh login DAN license flow (satu `showSnakeLoader` untuk dua trigger berbeda), motong itu ke hook terpisah butuh keputusan desain baru (state dipisah per-flow atau tetap digabung), bukan sekadar "pindah kode".

---

## Ringkasan dampak

| Fase | Baris berkurang dari App.jsx | Risiko |
|---|---|---|
| 1 | ~250 | Nyaris nol — pure extract, prop-passing saja |
| 2 | ~200 | Rendah — cek trigger tiap modal manual |
| 3 (opsional) | ~70 | Rendah, tapi manfaat kecil |
| **Total** | **App.jsx: 881 → ~360-400 baris** | |

Fungsi orkestrasi (`processPayment` dkk, ~120 baris) tetap di App.jsx — itu memang jobnya coordinator, bukan bagian dari "god component problem" yang perlu dibereskan.

## Urutan kerja disarankan
1. Fase 1 dulu (paling aman, dampak besar) → jalankan `npm test` + manual QA layar license/login
2. Fase 2 → manual QA tiap modal
3. Fase 3 kalau masih mau lanjut

Tidak ada perubahan file di `hooks/` (kecuali Fase 3) atau `views/` — blast radius terbatas ke `App.jsx` dan file baru di `src/screens/` + `src/components/`.
