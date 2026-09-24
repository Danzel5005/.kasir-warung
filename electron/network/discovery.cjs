// discovery.cjs — penemuan Host di LAN via mDNS (bonjour-service).
//
// Host: `advertise()` publish service `_ykk-pos._tcp` berisi hostId + nama device.
// Client: `browse()` resolve daftar Host yang sedang hosting di LAN yang sama.
//
// bonjour-service murni JS (tanpa native build) — aman untuk electron-builder
// tanpa langkah rebuild tambahan.

const SERVICE_TYPE = "ykk-pos";
const SERVICE_PROTOCOL = "tcp";

function createDiscovery({ hostId, deviceName, port }) {
  let bonjour = null;
  let published = null;
  const browsers = new Set();

  function ensureBonjour() {
    if (bonjour) return bonjour;
    const { Bonjour } = require("bonjour-service");
    bonjour = new Bonjour();
    return bonjour;
  }

  // ── Host side ────────────────────────────────────────────────────────────
  function advertise({ hostName, port: advertisePort } = {}) {
    const b = ensureBonjour();
    stopAdvertise();
    const name = `${hostName || deviceName || "DEN POS"} (${hostId.slice(0, 6)})`;
    published = b.publish({
      name,
      type: SERVICE_TYPE,
      protocol: SERVICE_PROTOCOL,
      port: advertisePort || port,
      host: hostId, // dipakai client sebagai identifier stabil
      txt: {
        hostId,
        name: hostName || deviceName || "DEN POS",
        v: "1",
      },
    });
    published.on?.("error", (err) => console.warn("[Discovery] advertise error:", err?.message || err));
    return { ok: true, name };
  }

  function stopAdvertise() {
    if (published) {
      try { published.stop?.(); } catch { /* ignore */ }
      published = null;
    }
  }

  // ── Client side ──────────────────────────────────────────────────────────
  // Mulai browse, panggil onUpdate(list) setiap ada perubahan. Return fungsi stop.
  function browse(onUpdate) {
    const b = ensureBonjour();
    const seen = new Map(); // key: hostId -> { hostId, name, host, port, addresses }
    const browser = b.find({ type: SERVICE_TYPE, protocol: SERVICE_PROTOCOL });
    const key = (s) => `${s.txt?.hostId || s.host || s.name}`;

    const emit = () => onUpdate?.(Array.from(seen.values()));

    browser.on("up", (service) => {
      const entry = {
        hostId: service.txt?.hostId || service.host || service.name,
        name: service.txt?.name || service.name,
        host: service.host,
        port: service.port,
        addresses: service.addresses || [],
      };
      seen.set(key(service), entry);
      emit();
    });
    browser.on("down", (service) => {
      seen.delete(key(service));
      emit();
    });
    browser.on?.("error", (err) => console.warn("[Discovery] browse error:", err?.message || err));

    browsers.add(browser);
    return () => {
      try { browser.stop?.(); } catch { /* ignore */ }
      browsers.delete(browser);
    };
  }

  function destroy() {
    stopAdvertise();
    for (const br of browsers) { try { br.stop?.(); } catch { /* ignore */ } }
    browsers.clear();
    if (bonjour) { try { bonjour.destroy?.(); } catch { /* ignore */ } bonjour = null; }
  }

  return { advertise, stopAdvertise, browse, destroy };
}

module.exports = { createDiscovery, SERVICE_TYPE, SERVICE_PROTOCOL };
