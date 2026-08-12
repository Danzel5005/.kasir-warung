# Design System — Kasir Warung Nusantara (restaurant)

Dokumentasi sistem desain visual terpadu untuk pengembangan antarmuka aplikasi Kasir Warung Nusantara. Seluruh komponen dan tampilan wajib menggunakan token desain yang didefinisikan di [`src/constants/theme.js`](file:///c:/Users/tech%20aarohi/.kasir-warung/src/constants/theme.js).

---

## 🎨 1. Palet Warna (8-Step Color Palette)

Sistem warna dikelompokkan ke dalam 8 kategori utama untuk menjaga konsistensi visual di seluruh aplikasi.

| Token | Nilai Hex / CSS Variable | Penggunaan Utama |
|---|---|---|
| **Primary** | `#1a5c38` (`--color-primary`) | Brand utama (Emerald Green), tombol aksi utama, header aktif |
| **Primary Dark** | `#0f3d24` (`--color-primary-dark`) | Gradient background, header login, status bar |
| **Primary Light** | `#e8f5ee` (`--color-primary-light`) | Background badge aktif, item terpilih, hover state |
| **Secondary / Accent** | `#e87c2a` (`--color-secondary`) | Warna aksen (Warm Orange), total harga, penanda penting |
| **Secondary Light** | `#fff8e0` (`--color-secondary-light`) | Highlight bayar tunai, notice banner |
| **Danger / Error** | `#d32f2f` (`--color-danger`) | Aksi destruktif (Hapus/Tutup Shift), badge stok habis |
| **Info / Accent Blue** | `#1a5fb4` (`--color-info`) | Metode pembayaran Debit/Transfer, badge info meja |
| **Neutrals** | | |
| — *Background* | `#0f0e0c` (`--color-bg`) | Dark body background |
| — *Surface* | `#ffffff` (`--color-surface`) | Card modal, panel container (`W`) |
| — *Surface Alt* | `#f5f5f0` (`--color-surface-alt`) | Card item, list background (`LT`) |
| — *Border* | `#e0e0d8` (`--color-border`) | Border input & divider (`BD`) |
| — *Text Primary* | `#1a1a1a` (`--color-text-primary`) | Teks judul & isi utama (`TX`) |
| — *Text Muted* | `#888888` (`--color-text-muted`) | Teks sekunder & label pelengkap (`MT`) |

---

## 🔤 2. Skala Tipografi (6-Step Typographic Scale)

Pengaturan ukuran dan bobot teks terstandardisasi:

| Token | Font Size | Line Height | Font Weight | Contoh Penggunaan |
|---|---|---|---|---|
| `TYPOGRAPHY.h1` | `24px` | `1.2` | `700` (Bold) | Judul utama halaman / header besar |
| `TYPOGRAPHY.h2` | `18px` | `1.3` | `700` (Bold) | Judul seksi / header modal |
| `TYPOGRAPHY.body` | `14px` | `1.4` | `400` / `700` | Teks utama, input value, nama item |
| `TYPOGRAPHY.small` | `12px` | `1.4` | `400` / `600` | Teks pendukung, tombol aksi, sub-info |
| `TYPOGRAPHY.label` | `11px` | `1.3` | `600` (Semi) | Form label, tag, badge status, footer |
| `TYPOGRAPHY.code` | `12px` | `1.4` | Monospace | Nomor transaksi, timestamp raw, kode resi |

---

## 🔲 3. Border Radius (5 Standardized Tokens)

Pembatasan nilai kelengkungan sudut komponen untuk menghindari distorsi visual:

| Token | Nilai | Penggunaan |
|---|---|---|
| `RADIUS.none` | `0px` | Square container, pembatas penuh |
| `RADIUS.sm` | `4px` | Tag, status badge kecil, mini button |
| `RADIUS.md` | `8px` | Form input (`inp`), tombol standar, card item |
| `RADIUS.lg` | `12px` | Card modal, container utama view |
| `RADIUS.full` | `9999px` | Skeleton loader shimmer, pill badge |

---

## 🛠️ 4. Cara Penggunaan Token dalam Kode (Developer Onboarding)

### A. Penggunaan di React Inline Styles
```jsx
import { COLOR_PALETTE, TYPOGRAPHY, RADIUS, inp, row } from "../constants/theme.js";

function ComponentExample() {
  return (
    <div style={{ background: COLOR_PALETTE.surface, borderRadius: RADIUS.lg, padding: 16 }}>
      <div style={{ ...row, marginBottom: 12 }}>
        <h2 style={{ fontSize: TYPOGRAPHY.h2.fontSize, fontWeight: TYPOGRAPHY.h2.fontWeight, color: COLOR_PALETTE.primary }}>
          Judul Komponen
        </h2>
      </div>
      <input style={inp} placeholder="Standardized Input..." />
    </div>
  );
}
```

### B. Penggunaan di CSS / Style Tag (`:root` Custom Properties)
```css
.my-card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
}
```

### C. Backward Compatibility Aliases
Untuk mempertahankan backward compatibility dengan kode terdahulu, token shorthand berikut tetap didukung dan di-export secara langsung:
- `G` = `COLOR_PALETTE.primary` (`#1a5c38`)
- `OR` = `COLOR_PALETTE.secondary` (`#e87c2a`)
- `W` = `COLOR_PALETTE.surface` (`#ffffff`)
- `LT` = `COLOR_PALETTE.surfaceAlt` (`#f5f5f0`)
- `BD` = `COLOR_PALETTE.border` (`#e0e0d8`)
- `TX` = `COLOR_PALETTE.textPrimary` (`#1a1a1a`)
- `MT` = `COLOR_PALETTE.textMuted` (`#888888`)
- `inp` = Standard input style object
- `row` = Standard flexbox space-between center row layout
