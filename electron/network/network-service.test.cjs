import { describe, expect, it } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { createNetworkService, DEFAULT_PORT } = require("./network-service.cjs");

// ---------------------------------------------------------------------------
// Fase 1 — network-service: verifikasi IPC handler terdaftar & kontrak balasan.
// mDNS di-inject lewat `discoveryFactory` supaya tidak benar-benar broadcast di
// CI (bonjour-service bisa lambat / tidak tersedia). WebSocket server (ws) tetap
// nyata, tapi memakai port ephemeral (0).
// ---------------------------------------------------------------------------

const advertised = [];
const browsed = [];
const destroyed = [];

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

function makePair(emit = () => {}) {
  const ipcMain = makeFakeIpcMain();
  const svc = createNetworkService({ ipcMain, app: {}, emit, discoveryFactory: fakeDiscoveryFactory });
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
