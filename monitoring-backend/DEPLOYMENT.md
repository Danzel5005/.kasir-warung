# Deployment & Hosting Guide
## Kasir Warung Monitoring System

This guide covers all hosting options for the Laporan & Riwayat monitoring web-app.

---

## 📊 Hosting Decision Matrix

| Option | Cost | Setup | Remote Access | Best For |
|--------|------|-------|---------------|----------|
| **Local Network** | Free | Easy | LAN only | Same-store monitoring |
| **Self-Hosted VPS** | $5-10/mo | Medium | Yes | Full control, budget |
| **Cloud (Vercel+Railway)** | Free-$10/mo | Easy | Yes | Professional, scalable |
| **Hybrid + Tunnel** | $10-15/mo | Medium | Yes | Keep data local |

---

## 🏠 Option A: Local Network (Recommended to Start)

**Architecture**: Both backend & frontend run on a PC/server on the same WiFi as the POS.

```
┌────────────────┐      LAN      ┌──────────────────┐
│  POS Machine   │◄─────────────►│  Server PC       │
│  (kasir.db)    │               │  :3001 backend   │
└────────────────┘               │  :3000 frontend  │
                                 └──────────────────┘
                                        ▲
                                        │ WiFi
                                        ▼
                                 ┌──────────────────┐
                                 │  Phone / Tablet  │
                                 │  (monitoring)    │
                                 └──────────────────┘
```

### Setup Steps

**1. Backend**:
```bash
cd monitoring-backend
npm install
npm start
# Runs on http://localhost:3001
```

**2. Frontend** (build for production):
```bash
cd monitoring-frontend
npm install
npm run build
# Outputs to dist/
```

**3. Serve frontend** (using `serve` or nginx):
```bash
npx serve -s dist -l 3000
```

**4. Access from other devices**:
Find the server's local IP:
```powershell
ipconfig  # Look for IPv4 Address, e.g. 192.168.1.100
```
Then open on phone: `http://192.168.1.100:3000`

### Auto-Start on Windows (Task Scheduler)
Create a `start-monitor.bat`:
```bat
@echo off
cd /d "C:\Users\tech aarohi\.kasir-warung\monitoring-backend"
start /min cmd /c "npm start"
cd /d "C:\Users\tech aarohi\.kasir-warung\monitoring-frontend"
start /min cmd /c "npx serve -s dist -l 3000"
```

Add to Task Scheduler → Run at startup.

---

## ☁️ Option B: Cloud Hosting (Professional)

### Frontend → Vercel (Free)

**1. Install Vercel CLI**:
```bash
npm install -g vercel
```

**2. Add environment variable** — create `monitoring-frontend/.env.production`:
```env
VITE_API_URL=https://your-backend.railway.app/api
```

**3. Deploy**:
```bash
cd monitoring-frontend
vercel --prod
```

### Backend → Railway (Free tier available)

**1. Create `railway.json`** in `monitoring-backend/`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": { "builder": "NIXPACKS" },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

**2. Deploy**:
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

**3. Set environment variables** in Railway dashboard:
```
JWT_SECRET=<random-secret>
POS_DB_PATH=/data/kasir.db
PORT=3001
SYNC_INTERVAL_MINUTES=5
```

**⚠️ IMPORTANT**: Railway can't access your local `kasir.db` directly.
You must either:
- (a) Sync the SQLite file to the cloud periodically, OR
- (b) Run a local agent that pushes data to the cloud API, OR
- (c) Use the Hybrid option below.

---

## 🔄 Option C: Hybrid (Recommended for Real Use)

Keeps the database local but exposes monitoring remotely via a secure tunnel.

```
┌──────────────┐         ┌─────────────────┐        ┌──────────────┐
│  Local PC    │         │  Cloudflare     │        │  Monitoring  │
│  backend     │◄───────►│  Tunnel         │◄──────►│  Website     │
│  :3001       │         │  (encrypted)    │        │  (Vercel)    │
└──────────────┘         └─────────────────┘        └──────────────┘
```

### Setup with Cloudflare Tunnel (Free)

**1. Install cloudflared**:
```powershell
winget install --id Cloudflare.cloudflared
```

**2. Authenticate & create tunnel**:
```bash
cloudflared tunnel login
cloudflared tunnel create kasir-monitor
```

**3. Create `config.yml`**:
```yaml
tunnel: kasir-monitor
credentials-file: C:\Users\tech aarohi\.cloudflared\<tunnel-id>.json
ingress:
  - hostname: monitor.yourdomain.com
    service: http://localhost:3001
  - service: http_status:404
```

**4. Run tunnel**:
```bash
cloudflared tunnel run kasir-monitor
```

**5. Update frontend env**:
```env
VITE_API_URL=https://monitor.yourdomain.com/api
```

### Alternative: ngrok (Quick Testing)
```bash
ngrok http 3001
# Gives you a public URL like https://abc123.ngrok.io
```

---

## 🔐 Production Security Checklist

- [ ] Change all default passwords (admin123, etc.)
- [ ] Use a strong random `JWT_SECRET` (64+ chars)
- [ ] Enable HTTPS everywhere (required for tunnels/cloud)
- [ ] Restrict CORS to your actual frontend domain
- [ ] Add rate limiting (`express-rate-limit`)
- [ ] Set up firewall (only expose needed ports)
- [ ] Enable audit logging
- [ ] Regular database backups
- [ ] Keep dependencies updated (`npm audit`)

### Generate a strong JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Add rate limiting:
```bash
cd monitoring-backend
npm install express-rate-limit
```
```javascript
// In src/index.js before routes
const rateLimit = require('express-rate-limit');
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { error: 'Too many login attempts, please try again later' }
}));
```

---

## 📦 Data Flow Summary

### How data gets from POS → Monitoring

1. **POS writes to SQLite** (`kasir.db`) — transactions, shifts, products
2. **Backend reads DB every 5 min** (read-only, WAL mode — no interference with POS)
3. **Backend serves via REST API** (`/api/data/reports/laporan`, `/api/data/reports/riwayat`)
4. **Frontend fetches on load + auto-refresh every 5 min** (`setInterval` in views)
5. **User sees live-updating dashboard**

### Why read-only + WAL?
- POS keeps working normally (no locks)
- Monitoring never corrupts data
- Reads are fast and non-blocking

---

## 🚀 Quick Start (Local, 5 minutes)

```bash
# Terminal 1 - Backend
cd monitoring-backend
npm install
cp .env.example .env      # edit POS_DB_PATH if needed
node scripts/test-database.js   # verify DB access
npm start

# Terminal 2 - Frontend
cd monitoring-frontend
npm install
npm run dev
# Open http://localhost:3000
# Login: admin / admin123
```

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Database not found" | Check `POS_DB_PATH`; run POS once to create DB |
| "No such table: transactions" | POS never saved data; make a test sale |
| Login fails | Check backend running; verify credentials |
| CORS error | Add frontend URL to CORS in `backend/src/index.js` |
| Data not updating | Check `SYNC_INTERVAL_MINUTES`; check backend logs |
| SQLITE_BUSY | Ensure WAL mode; DB reader is read-only by design |

---

## 📈 Recommended Production Setup

For a real warung deployment:

1. **Dedicated always-on PC** (or existing POS PC) on store WiFi
2. **Backend + Frontend** run as Windows services (via `node-windows` or PM2)
3. **Cloudflare Tunnel** for remote access (free, secure)
4. **Vercel** hosts a copy of frontend pointed at the tunnel
5. **Daily DB backup** to cloud storage
6. **Strong credentials** + rate limiting enabled

Total cost: **$0-10/month** depending on domain choice.
