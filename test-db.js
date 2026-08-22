
const { app } = require('electron');
app.on('ready', () => {
  console.log('App ready');
  try {
    const Database = require('better-sqlite3');
    const path = require('path');
    const fs = require('fs');
    const os = require('os');
    const DATA_DIR = path.join(os.homedir(), 'AppData', 'Roaming', 'kasir-warung', 'data');
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const dbPath = path.join(DATA_DIR, 'test.db');
    console.log('Opening:', dbPath);
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    console.log('DB OK');
    db.close();
  } catch(e) {
    console.error('Error:', e.message, e.stack);
  }
  app.quit();
});

