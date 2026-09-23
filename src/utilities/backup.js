// backup.js — pure helpers for the Backup & Restore feature.
//
// The heavy lifting (reading/writing the app data folder) happens in the
// Electron main process; this module only holds the *pure* pieces so they can
// be unit-tested without a browser or a running desktop shell:
//   • validateBackup  — validates + normalises an uploaded .json envelope
//   • backupSummary   — human-readable counts for a validation result
//   • BACKUP_KEYS     — the canonical list of stores a full backup contains
//
// Kept dependency-free on purpose: no React, no window, no fs.

// Canonical store keys. Order mirrors the order data is written in main.
const BACKUP_KEYS = ["menu", "categories", "settings", "users", "customers", "qris", "bills", "shifts", "transactions", "logo", "resep", "bahanBaku", "supplier", "loyaltyTiers"];

// Keys that are stored as arrays — anything else is treated as an object/blob.
const ARRAY_KEYS = ["menu", "categories", "users", "customers", "bills", "shifts", "transactions", "bahanBaku", "supplier", "loyaltyTiers"];

const BACKUP_FORMAT = "kasir-warung-backup";
const BACKUP_VERSION = 1;

// shapeOK — a store is "present but empty" when it is null/undefined, or an
// empty array/object. Present-but-empty stores must NOT be treated as an error.
const emptyish = (value) => value === null || value === undefined || (typeof value === "object" && Object.keys(value).length === 0);

// describeStore — count for the summary line. Arrays report length, plain
// objects report key count, primitives report 1 (a logo dataURL is "1 thing").
const describeStore = (value) => {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") return Object.keys(value).length;
  return value === null || value === undefined ? 0 : 1;
};

// validateBackup — turns arbitrary parsed JSON into a decision the UI can act on.
//
// Returns { ok, error, data, counts, total, empty, missing, version, exportedAt }
//   ok      : true only when the payload is a recognisable backup envelope
//   error   : user-facing Indonesian message when ok === false
//   data    : the normalised stores object (ready to hand back to the shell)
//   empty   : true when the backup contains nothing at all (warn, do not restore)
//   missing : keys listed in BACKUP_KEYS that the file did not include
function validateBackup(raw) {
  const fail = (error) => ({ ok: false, error, data: null, counts: {}, total: 0, empty: false, missing: [], version: null, exportedAt: null });

  if (raw === null || raw === undefined) return fail("File backup kosong atau tidak bisa dibaca");
  if (typeof raw !== "object" || Array.isArray(raw)) return fail("Format backup tidak dikenali");

  // Accept both the wrapped envelope { format, data: {...} } and a bare map of
  // stores ({ menu: [...], settings: {...} }) so hand-made backups still work.
  const looksWrapped = raw.format === BACKUP_FORMAT || (raw.data && typeof raw.data === "object" && !Array.isArray(raw.data));
  const stores = looksWrapped ? raw.data : raw;

  if (!stores || typeof stores !== "object" || Array.isArray(stores))
    return fail("File backup tidak berisi data yang bisa dipulihkan");

  const counts = {};
  const missing = [];
  let total = 0;

  for (const key of BACKUP_KEYS) {
    if (!(key in stores)) { missing.push(key); continue; }
    const n = describeStore(stores[key]);
    counts[key] = n;
    total += n;
  }

  // A wrapped envelope must declare its format; a bare map is trusted as-is.
  if (looksWrapped && raw.format && raw.format !== BACKUP_FORMAT)
    return fail(`Jenis file tidak cocok (${raw.format}). Pilih file backup Kasir Warung.`);

  if (Object.keys(counts).length === 0)
    return fail("File backup tidak berisi data yang bisa dipulihkan");

  // Unknown-only payloads (e.g. restored into a future version) are still fine
  // as long as at least one known store survived.
  const data = {};
  for (const key of BACKUP_KEYS) if (key in stores) data[key] = stores[key];

  return {
    ok: true,
    error: null,
    data,
    counts,
    total,
    empty: total === 0,
    missing,
    version: Number(raw.version) || BACKUP_VERSION,
    exportedAt: raw.exportedAt || raw.exported_at || null,
  };
}

// backupSummary — one-line description of what a validated backup holds.
function backupSummary(result) {
  if (!result || !result.ok) return "Backup tidak valid";
  if (result.empty) return "Backup ini kosong (tidak ada data)";
  const labels = {
    menu: "menu",
    categories: "kategori",
    settings: "pengaturan",
    users: "pengguna",
    customers: "pelanggan",
    qris: "gambar QRIS",
    bills: "bon terbuka",
    shifts: "shift",
    transactions: "transaksi",
    logo: "logo",
    resep: "resep menu",
    bahanBaku: "bahan baku",
    supplier: "supplier",
    loyaltyTiers: "tier loyalty",
  };
  const parts = BACKUP_KEYS
    .filter((k) => Number(result.counts[k]) > 0)
    .map((k) => `${result.counts[k]} ${labels[k] || k}`);
  return parts.length ? parts.join(" · ") : "Backup ini kosong (tidak ada data)";
}

export { BACKUP_KEYS, BACKUP_FORMAT, BACKUP_VERSION, ARRAY_KEYS, validateBackup, backupSummary, describeStore };
