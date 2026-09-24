// pairing.cjs — Kelola pairing/assign device follower (Fase 3 LAN sync).
//
// Modul ini menyatukan tiga hal yang tadinya tersebar:
//   1. Bookkeeping join-request yang datang dari follower (host-server sudah
//      memancarkan event `join-request`; modul ini menyimpannya supaya Host UI
//      bisa query daftar pending kapan pun, bukan hanya saat event live).
//   2. Assign akun non-admin ke device yang diterima → menghasilkan
//      `grantSignature` (memakai host-server.approveFollower yang sudah ada).
//   3. Snapshot awal sekali saat assignment: menu (termasuk stok saat itu),
//      kategori, settings (payment methods), open-bill aktif, resep/bahan baku.
//      Ini SATU-SATUNYA full-dump yang boleh terjadi (plan §3 langkah 8) —
//      sinkronisasi selanjutnya delta-only (§4/§5).
//
// Keputusan desain:
//   - Modul ini TIDAK menyentuh file data secara langsung. Semua pembacaan
//     snapshot disuntik lewat `snapshotProvider` supaya:
//       a. mudah dites (inject data palsu),
//       b. tetap menghormati pola DI yang sudah dipakai di network-service
//          (lihat vitest-cjs-mocking-gotchas: require() di .cjs tidak bisa
//          di-mock, jadi DI adalah satu-satunya cara yang andal).
//   - Grant ditandatangani oleh host-server (single source of truth secret),
//     bukan di sini — supaya tidak ada dua tempat yang pegang grantSecret.

// createPairing({ hostServer, getUsers, buildSnapshot, onEvent })
//   hostServer   — instance dari createHostServer (approveFollower/sendTo)
//   getUsers()   — async/sync → daftar user {username,nama,role,...}
//   buildSnapshot() — async/sync → objek snapshot awal untuk Client
//   onEvent(evt) — evt.kind: "request" | "approved" | "rejected" | "snapshot-sent"
function createPairing({ hostServer, getUsers = () => [], buildSnapshot = () => ({}), onEvent = () => {} } = {}) {
  // hwid -> { hwid, deviceName, firstSeen, status: "pending"|"approved"|"rejected", userId }
  const requests = new Map();

  function trackRequest({ hwid, deviceName }) {
    if (!hwid) return null;
    const existing = requests.get(hwid);
    // kalau device reconnect (mis. app restart sebelum di-approve), refresh
    // nama & timestamp tapi pertahankan status bila sudah approved.
    const entry = {
      hwid,
      deviceName: deviceName || existing?.deviceName || "Perangkat",
      firstSeen: existing?.firstSeen || new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      status: existing?.status === "approved" ? "approved" : "pending",
      userId: existing?.userId ?? null,
    };
    requests.set(hwid, entry);
    onEvent({ kind: "request", ...entry });
    return entry;
  }

  function listRequests() {
    return Array.from(requests.values()).sort((a, b) => String(a.firstSeen).localeCompare(String(b.firstSeen)));
  }

  // Hanya user non-admin yang boleh di-assign ke follower (plan langkah 7).
  function listAssignableUsers(users = getUsers()) {
    return (users || []).filter((u) => u && u.role !== "admin" && u.username !== "admin")
      .map((u) => ({ username: u.username, nama: u.nama || u.username, role: u.role || "cashier" }));
  }

  // approve({ hwid, userId }) — assign akun + tanda tangani grant, lalu kirim
  // snapshot awal ke device itu saja. Idempoten terhadap approve ganda.
  async function approve({ hwid, userId } = {}) {
    if (!hwid) return { ok: false, error: "hwid wajib diisi" };
    if (!userId) return { ok: false, error: "akun kasir belum dipilih" };

    const entry = requests.get(hwid);
    if (entry && entry.status === "rejected") {
      return { ok: false, error: "perangkat sudah ditolak" };
    }

    // host-server yang memegang koneksi & secret — dia yang menandatangani.
    const res = hostServer.approveFollower(hwid, userId);
    if (!res?.ok) return { ok: false, error: res?.error || "perangkat tidak terhubung" };

    if (entry) {
      entry.status = "approved";
      entry.userId = userId;
      entry.lastSeen = new Date().toISOString();
    }

    // Snapshot awal — satu kali, hanya ke device yang baru di-approve.
    let snapshot = {};
    try { snapshot = (await buildSnapshot()) || {}; }
    catch (err) { console.warn("[Pairing] buildSnapshot error:", err?.message || err); }
    const sent = hostServer.sendTo(hwid, { type: "snapshot", snapshot, sentAt: new Date().toISOString() });

    onEvent({ kind: "approved", hwid, userId, grantSignature: res.grantSignature, activatedAt: res.activatedAt, snapshotSent: !!sent });
    if (sent) onEvent({ kind: "snapshot-sent", hwid });
    return { ok: true, activatedAt: res.activatedAt, grantSignature: res.grantSignature, snapshotSent: !!sent };
  }

  function reject({ hwid, reason } = {}) {
    if (!hwid) return { ok: false, error: "hwid wajib diisi" };
    const entry = requests.get(hwid);
    if (entry) { entry.status = "rejected"; entry.lastSeen = new Date().toISOString(); }
    const sent = hostServer.sendTo(hwid, { type: "rejected", reason: reason || "Ditolak Device A" });
    onEvent({ kind: "rejected", hwid, reason: reason || "Ditolak Device A" });
    return { ok: true, notified: !!sent };
  }

  function forget(hwid) {
    if (hwid) requests.delete(hwid);
    return { ok: true };
  }

  return { trackRequest, listRequests, listAssignableUsers, approve, reject, forget };
}

module.exports = { createPairing };
