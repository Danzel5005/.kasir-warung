import { describe, expect, it } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { createNetworkService, DEFAULT_PORT } = require("./network-service.cjs");
const { connectionHost } = require("./discovery.cjs");

// ---------------------------------------------------------------------------
// Fase 1 — network-service: verifikasi IPC handler terdaftar & kontrak balasan.
// mDNS di-inject lewat `discoveryFactory` supaya tidak benar-benar broadcast di
// CI (bonjour-service bisa lambat / tidak tersedia). WebSocket server (ws) tetap
// nyata, tapi memakai port ephemeral (0).
// ---------------------------------------------------------------------------

const advertised = [];
const browsed = [];
const destroyed = [];

describe("discovery: connection address", () => {
  it("memakai alamat IPv4 LAN, bukan Host ID dari service.host", () => {
    expect(connectionHost({ host: "F53C86A69259C739", addresses: ["fe80::1", "192.168.43.10"] })).toBe("192.168.43.10");
  });
});

function fakeDiscoveryFactory() {
  return {
    advertise: (opts) => advertised.push(opts),
    stopAdvertise: () => {},
    browse: (cb) => { browsed.push(cb); return () => {}; },
    destroy: () => { destroyed.push(true); },
  };
}

function makeFakeIpcMain() {
  const handlers = new Map();
  return { handlers, handle: (channel, fn) => handlers.set(channel, fn) };
}

function makePair(emit = () => {}, options = {}) {
  const ipcMain = makeFakeIpcMain();
  const svc = createNetworkService({ ipcMain, app: {}, emit, discoveryFactory: fakeDiscoveryFactory, ...options });
  svc.registerHandlers();
  return { ipcMain, svc };
}

describe("network-service: IPC contract", () => {
  it("mendaftarkan semua handler yang diharapkan", () => {
    const { ipcMain } = makePair();
    for (const ch of [
      "hosting-start", "hosting-stop", "hosting-status",
      "discovery-browse-start", "discovery-browse-stop",
      "client-join", "client-disconnect", "client-status",
      "host-license-status", "host-license-clear",
      "pairing-list", "pairing-assignable-users", "pairing-approve", "pairing-reject",
      "reserve-stock", "outbox-status", "outbox-flush",
    ]) {
      expect(ipcMain.handlers.has(ch)).toBe(true);
    }
  });

  it("hosting-status mengembalikan objek status (hosting:false sebelum start)", () => {
    const { ipcMain } = makePair();
    const status = ipcMain.handlers.get("hosting-status")({});
    expect(status).toHaveProperty("hosting");
    expect(status.hosting).toBe(false);
  });

  it("hosting-start menyalakan server, advertise dipanggil, lalu hosting-stop mematikannya", async () => {
    const emitted = [];
    const { ipcMain } = makePair((ch, payload) => emitted.push({ ch, payload }));

    const before = advertised.length;
    const res = await ipcMain.handlers.get("hosting-start")({}, { name: "Warung Test", port: 0 });
    expect(res.ok).toBe(true);
    expect(res.name).toBe("Warung Test");
    expect(advertised.length).toBe(before + 1);

    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(ipcMain.handlers.get("hosting-status")({}).hosting).toBe(true);

    const stopRes = await ipcMain.handlers.get("hosting-stop")({});
    expect(stopRes.ok).toBe(true);
    expect(ipcMain.handlers.get("hosting-status")({}).hosting).toBe(false);
  });

  it("discovery-browse-start memanggil browse dan meneruskan host ke emit", () => {
    const emitted = [];
    const { ipcMain } = makePair((ch, payload) => emitted.push({ ch, payload }));

    ipcMain.handlers.get("discovery-browse-start")({}, { name: "Client" });
    expect(browsed.length).toBeGreaterThan(0);
    browsed[browsed.length - 1]([{ hostId: "H1", name: "Host", host: "127.0.0.1", port: 47474 }]);
    const last = emitted[emitted.length - 1];
    expect(last.ch).toBe("discovery:hosts");
    expect(last.payload[0].hostId).toBe("H1");

    expect(ipcMain.handlers.get("discovery-browse-stop")({}).ok).toBe(true);
  });

  it("shutdown menutup server & discovery", async () => {
    const { ipcMain, svc } = makePair();
    await ipcMain.handlers.get("hosting-start")({}, { port: 0 });
    await new Promise((resolve) => setTimeout(resolve, 60));
    const before = destroyed.length;
    await svc.shutdown();
    expect(destroyed.length).toBeGreaterThan(before);
  });

  it("DEFAULT_PORT terdefinisi", () => {
    expect(typeof DEFAULT_PORT).toBe("number");
    expect(DEFAULT_PORT).toBeGreaterThan(1024);
  });
});

describe("network-service: Fase 2 — client join & host-license", () => {
  it("client-join menolak host tidak valid tanpa crash", () => {
    const { ipcMain } = makePair();
    const res = ipcMain.handlers.get("client-join")({}, null);
    expect(res.ok).toBe(false);
    expect(res.error).toBeTruthy();
  });

  it("client-status tersedia & mengembalikan bentuk status", () => {
    const { ipcMain } = makePair();
    const st = ipcMain.handlers.get("client-status")({});
    expect(st).toHaveProperty("connected");
    expect(st.connected).toBe(false);
  });

  it("client-disconnect selalu ok", () => {
    const { ipcMain } = makePair();
    expect(ipcMain.handlers.get("client-disconnect")({}).ok).toBe(true);
  });

  it("host-license-status mengembalikan { activated:false } bila store kosong/tak tersedia", () => {
    const { ipcMain } = makePair();
    const st = ipcMain.handlers.get("host-license-status")({});
    expect(st).toEqual({ activated: false });
  });

  it("host-license-clear tidak melempar saat store tak tersedia", () => {
    const { ipcMain } = makePair();
    const res = ipcMain.handlers.get("host-license-clear")({});
    expect(res).toHaveProperty("ok");
  });
});

describe("network-service: Fase 3 — pairing (assign + snapshot)", () => {
  const users = [
    { username: "admin", nama: "Admin", role: "admin" },
    { username: "kasir1", nama: "Kasir Satu", role: "cashier" },
  ];

  it("pairing-list kosong di awal", async () => {
    const { ipcMain } = makePair();
    const res = ipcMain.handlers.get("pairing-list")({});
    expect(res.ok).toBe(true);
    expect(res.requests).toEqual([]);
  });

  it("pairing-assignable-users mengecualikan admin", () => {
    const { ipcMain } = makePair(() => {}, { getUsers: () => users });
    const res = ipcMain.handlers.get("pairing-assignable-users")({});
    expect(res.ok).toBe(true);
    expect(res.users.map((u) => u.username)).toEqual(["kasir1"]);
  });

  it("join-request via WS dicatat lalu bisa di-approve (snapshot dikirim)", async () => {
    const WebSocket = require("ws");
    const emitted = [];
    const { ipcMain, svc } = makePair((ch, payload) => emitted.push({ ch, payload }), {
      getUsers: () => users,
      snapshotProvider: () => ({ menu: [{ id: 1 }], settings: {} }),
    });

    await ipcMain.handlers.get("hosting-start")({}, { port: 0 });
    await new Promise((r) => setTimeout(r, 60));
    const port = ipcMain.handlers.get("hosting-status")({}).port;

    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    const messages = [];
    ws.on("message", (raw) => { try { messages.push(JSON.parse(raw.toString())); } catch (_) { /* ignore */ } });
    await new Promise((resolve) => ws.on("open", () => {
      ws.send(JSON.stringify({ type: "hello", hwid: "HW-NET", deviceName: "Kasir Net" }));
      resolve();
    }));

    // tunggu join-request tercatat
    for (let i = 0; i < 50 && ipcMain.handlers.get("pairing-list")({}).requests.length === 0; i++) {
      await new Promise((r) => setTimeout(r, 20));
    }
    const list = ipcMain.handlers.get("pairing-list")({}).requests;
    expect(list.find((r) => r.hwid === "HW-NET")).toBeTruthy();

    const res = await ipcMain.handlers.get("pairing-approve")({}, { hwid: "HW-NET", userId: "kasir1" });
    expect(res.ok).toBe(true);
    expect(res.snapshotSent).toBe(true);

    // follower menerima approved + snapshot
    for (let i = 0; i < 50 && !messages.find((m) => m.type === "snapshot"); i++) {
      await new Promise((r) => setTimeout(r, 20));
    }
    expect(messages.find((m) => m.type === "approved")?.assignedUserId).toBe("kasir1");
    expect(messages.find((m) => m.type === "snapshot").snapshot.menu).toEqual([{ id: 1 }]);

    ws.close();
    await svc.shutdown();
  });

  it("pairing-approve tanpa hwid/userId mengembalikan error, bukan crash", async () => {
    const { ipcMain } = makePair();
    const res = await ipcMain.handlers.get("pairing-approve")({}, {});
    expect(res.ok).toBe(false);
    expect(res.error).toBeTruthy();
  });

  it("pairing-reject tanpa hwid mengembalikan error", () => {
    const { ipcMain } = makePair();
    const res = ipcMain.handlers.get("pairing-reject")({}, {});
    expect(res.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Fase 4 — reserve-stock & outbox (§5.1–5.3).
// ---------------------------------------------------------------------------
describe("network-service: Fase 4 — reserve-stock fallback lokal", () => {
  it("Host offline → terapkan lokal + catat outbox, balas {ok:true, offline:true}", async () => {
    const applied = [];
    const store = [];
    const outbox = {
      walAppend: (e) => store.push(e), count: () => store.length,
      flush: async () => ({ ok: true, flushed: 0, failed: 0 }),
    };
    const { ipcMain, svc } = makePair(() => {}, {
      applyStockDelta: (deltas, meta) => { applied.push({ deltas, meta }); return { p1: 4 }; },
      outbox,
    });
    const res = await ipcMain.handlers.get("reserve-stock")({}, { deltas: { p1: -1 }, meta: { type: "sale" } });
    expect(res.ok).toBe(true);
    expect(res.offline).toBe(true);
    expect(res.reserved).toEqual({ p1: 4 });
    expect(applied[0].meta.type).toBe("sale-outbox");
    expect(svc.syncOutbox.count()).toBe(1);
  });

  it("applyStockDelta throw → balas error, tidak crash", async () => {
    const { ipcMain } = makePair(() => {}, {
      applyStockDelta: () => { throw new Error("db rusak"); },
      outbox: { walAppend: () => {}, count: () => 0, flush: async () => ({}) },
    });
    const res = await ipcMain.handlers.get("reserve-stock")({}, { deltas: { p1: -1 } });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("error");
  });

  it("outbox-status melaporkan jumlah pending", async () => {
    const store = [];
    const { ipcMain } = makePair(() => {}, {
      applyStockDelta: () => ({}),
      outbox: {
        walAppend: (e) => store.push(e), count: () => store.length,
        flush: async () => ({ ok: true, flushed: 0, failed: 0 }),
      },
    });
    expect(ipcMain.handlers.get("outbox-status")({}).pending).toBe(0);
    await ipcMain.handlers.get("reserve-stock")({}, { deltas: { p1: -2 } });
    expect(ipcMain.handlers.get("outbox-status")({}).pending).toBe(1);
  });

  it("outbox-flush saat Host offline → {ok:false, error:'Host offline'}", async () => {
    const { ipcMain } = makePair(() => {}, {
      applyStockDelta: () => ({}),
      outbox: {
        walAppend: () => {}, count: () => 3,
        flush: async () => ({ ok: true, flushed: 3, failed: 0 }),
      },
    });
    const res = await ipcMain.handlers.get("outbox-flush")({});
    expect(res.ok).toBe(false);
    expect(res.error).toBe("Host offline");
    expect(res.pending).toBe(3);
  });

  it("tanpa dataDir/outbox → reserve-stock tetap sukses lokal, queued:false", async () => {
    const { ipcMain } = makePair(() => {}, { applyStockDelta: () => ({ p1: 9 }) });
    const res = await ipcMain.handlers.get("reserve-stock")({}, { deltas: { p1: -1 } });
    expect(res.ok).toBe(true);
    expect(res.queued).toBe(false);
    expect(res.reserved).toEqual({ p1: 9 });
  });
});

describe("network-service: Fase 4 — reserve-stock via Host nyata", () => {
  it("Client terhubung → reserve diteruskan ke Host (sumber kebenaran)", async () => {
    const emitted = [];
    const { ipcMain, svc } = makePair((ch, payload) => emitted.push({ ch, payload }), {
      applyStockDelta: (deltas) => {
        const out = {};
        for (const id of Object.keys(deltas)) out[id] = 5;
        return out;
      },
      loadStock: () => ({ p1: 5 }),
    });
    await ipcMain.handlers.get("hosting-start")({}, { port: 0 });
    const port = ipcMain.handlers.get("hosting-status")({}).port;

    // Connect client ke host yang sama.
    const joinRes = ipcMain.handlers.get("client-join")({}, { host: "127.0.0.1", port });
    expect(joinRes.ok).toBe(true);
    for (let i = 0; i < 100 && !svc.hostClient.status().connected; i++) {
      await new Promise((r) => setTimeout(r, 20));
    }
    expect(svc.hostClient.status().connected).toBe(true);

    const res = await ipcMain.handlers.get("reserve-stock")({}, { deltas: { p1: -1 }, meta: { type: "sale" } });
    expect(res.ok).toBe(true);
    expect(res.offline).toBeUndefined();
    expect(res.reserved).toEqual({ p1: 5 });

    await svc.shutdown();
  });
});
