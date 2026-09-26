# Kasir Warung Monitoring Backend - Setup Guide

## Prerequisites
- Node.js 16+ installed
- Kasir Warung POS software running (with kasir.db database)
- Port 3001 available

## Installation Steps

### 1. Install Dependencies
```bash
cd monitoring-backend
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` file:
```env
# Change JWT_SECRET to a random string in production!
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Adjust POS_DB_PATH if your database is elsewhere
POS_DB_PATH=C:\Users\tech aarohi\.kasir-warung\kasir.db

# Server settings
PORT=3001
NODE_ENV=development

# Sync interval (5 minutes default)
SYNC_INTERVAL_MINUTES=5
```

### 3. Start the Server
Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

### 4. Verify It's Running
Open browser: `http://localhost:3000/api/data/health`

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Testing API Endpoints

### Test Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

Expected response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "name": "Administrator"
  }
}
```

### Test Data Endpoint
```bash
curl -X GET http://localhost:3001/api/data/transactions \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## User Credentials

Default users for testing:
- **Admin**: username=`admin`, password=`admin123`
- **Manager**: username=`manager`, password=`manager123`
- **Viewer**: username=`viewer`, password=`viewer123`

**⚠️ IMPORTANT**: Change these passwords immediately in production!

## Troubleshooting

### Database Not Found Error
```
Error: Database not found at: C:\Users\tech aarohi\.kasir-warung\kasir.db
```

**Solution**: 
1. Make sure Kasir Warung POS has been run at least once
2. Check that the database file exists at the specified path
3. Update `POS_DB_PATH` in `.env` to correct location

### Permission Denied
If getting permission errors reading the database:
1. Close Kasir Warung POS completely
2. The reader needs exclusive read access to SQLite

### CORS Errors (when connecting from frontend)
Make sure your frontend URL is added to the CORS configuration in `src/index.js`:
```javascript
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
```

## Production Deployment

### Using PM2 (Process Manager)
1. Install PM2 globally:
```bash
npm install -g pm2
```

2. Start with PM2:
```bash
pm2 start src/index.js --name kasir-monitoring
pm2 save
pm2 startup
```

### Using Docker (Optional)
Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3001

CMD ["node", "src/index.js"]
```

Build and run:
```bash
docker build -t kasir-monitoring .
docker run -p 3001:3001 --env-file .env kasir-monitoring
```

## Security Recommendations

1. **Change JWT Secret**: Always use a strong, random secret
2. **Use HTTPS**: In production, always use SSL/TLS
3. **Environment Variables**: Never commit `.env` to Git
4. **Rate Limiting**: Add rate limiting middleware in production
5. **Firewall**: Only expose port 3001 to trusted networks

## API Documentation

See `API.md` for complete endpoint documentation.

## Next Steps

1. ✅ Backend is running and syncing data every 5 minutes
2. 🔄 Build or connect the frontend monitoring dashboard
3. 🎨 Deploy to production hosting

---

For detailed API reference and frontend integration, check the main plan document: `../monitoring-plan.md`
