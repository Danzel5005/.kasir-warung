# Kasir Warung Monitoring Web-App

A web-based monitoring system that watches **only the Laporan (reports)** and **Riwayat (transaction history)** pages of your Kasir Warung POS software, refreshing automatically **every 5 minutes**.

---

## ✅ What Was Built

| Component | Location | Purpose |
|-----------|----------|---------|
| **Planning doc** | `monitoring-plan.md` | Full architecture, hosting options, data flow |
| **Backend API** | `monitoring-backend/` | Reads POS database, serves data, runs 5-min sync |
| **Web Frontend** | `monitoring-frontend/` | Login page + Laporan & Riwayat dashboards |
| **Start script** | `start-monitor.bat` | One-click launch of both services |
| **Deployment guide** | `monitoring-backend/DEPLOYMENT.md` | Hosting options (local/cloud/hybrid) |

---

## 🚀 Quick Start

### Easiest way (Windows)
Double-click **`start-monitor.bat`** in the project root.

### Manual way
```bash
# Terminal 1 — Backend (API + sync)
cd monitoring-backend
npm install
npm start

# Terminal 2 — Frontend (web UI)
cd monitoring-frontend
npm install
npm run dev
```

Then open **http://localhost:3000**

### Login credentials (default)
| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Manager | `manager` | `manager123` |
| Viewer | `viewer` | `viewer123` |

> ⚠️ Change these before deploying publicly (see `monitoring-backend/DEPLOYMENT.md`).

---

## 🔄 How Data Flows

```
POS writes to SQLite (kasir.db)
        │
        ▼
Backend reads DB every 5 min (read-only, no interference with POS)
        │
        ▼
REST API: /api/data/reports/laporan  +  /api/data/reports/riwayat
        │
        ▼
Frontend fetches + auto-refreshes every 5 min → live dashboard
```

- **Database read is read-only** — the POS keeps working normally.
- **Uses `node:sqlite`** (built into Node 22+) — no native compilation needed.
- **JWT authentication** protects all data endpoints.

---

## 📡 Key API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | ❌ | Login, returns JWT token |
| GET | `/api/data/health` | ❌ | Service + sync status |
| GET | `/api/data/reports/laporan` | ✅ | Financial report data |
| GET | `/api/data/reports/riwayat` | ✅ | Transaction history |
| GET | `/api/data/shifts` | ✅ | Shift list |
| GET | `/api/data/menu` | ✅ | Menu items |
| POST | `/api/data/sync` | ✅ admin | Trigger manual sync |

---

## 🗄️ Database Location

The POS database is stored in Electron's user-data folder:
```
C:\Users\tech aarohi\AppData\Roaming\kasir-warung\data\kasir.db
```
Change `POS_DB_PATH` in `monitoring-backend/.env` if yours differs.

Verify the connection anytime:
```bash
cd monitoring-backend
node scripts/test-database.js
```

---

## 🖥️ Hosting Options (see full guide)

1. **Local network** (free) — run on a store PC, access via LAN.
2. **Cloud** (Vercel + Railway, free tier) — remote access anywhere.
3. **Hybrid** (recommended) — data stays local, exposed via Cloudflare Tunnel.

Full details: **`monitoring-backend/DEPLOYMENT.md`**

---

## 🔐 Production Checklist

- [ ] Change default passwords
- [ ] Set a strong `JWT_SECRET` in `.env`
- [ ] Enable HTTPS (required for tunnels/cloud)
- [ ] Restrict CORS to your frontend domain
- [ ] Add rate limiting on login
- [ ] Set up regular database backups

---

## 🧪 Verified Working

- ✅ Backend connects to real POS database
- ✅ Sync runs every 5 minutes automatically
- ✅ Login authenticates and issues JWT
- ✅ Laporan page shows real revenue/data (Rp 177.000 from live DB)
- ✅ Riwayat page lists transactions with detail modal
- ✅ Frontend production build succeeds
