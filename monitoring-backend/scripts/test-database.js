// Database connection test — uses the same node:sqlite adapter as the service,
// so it needs no native compilation (Node 22+).
const fs = require('fs');
require('dotenv').config();
const { SqliteAdapter } = require('../src/utils/sqlite');

const dbPath =
  process.env.POS_DB_PATH ||
  'C:\\Users\\tech aarohi\\AppData\\Roaming\\kasir-warung\\data\\kasir.db';

console.log('='.repeat(60));
console.log('Testing Database Connection');
console.log('='.repeat(60));
console.log(`\nDatabase path: ${dbPath}`);

if (!fs.existsSync(dbPath)) {
  console.error('\n[ERROR] Database file not found!');
  console.log('Please ensure Kasir Warung POS has been run at least once.');
  console.log('Expected location:', dbPath);
  process.exit(1);
}
console.log('[OK] Database file exists');

let adapter;
try {
  adapter = new SqliteAdapter(dbPath);
  adapter.open();
  console.log('[OK] Opened database');
} catch (err) {
  console.error('\n[ERROR]', err.message);
  process.exit(1);
}

const tables = [
  ['transactions', 'SELECT COUNT(*) as count FROM transactions'],
  ['shifts', 'SELECT COUNT(*) as count FROM shifts'],
  ['products', 'SELECT COUNT(*) as count FROM products']
];

for (const [name, sql] of tables) {
  try {
    const row = adapter.get(sql);
    console.log(`[OK] ${name} table: ${row.count} records`);
  } catch (e) {
    console.log(`[WARN] ${name} table: not found or empty (${e.message})`);
  }
}

try {
  const recent = adapter.all(
    `SELECT id, json_extract(data, '$.total') as total, created_at
     FROM transactions ORDER BY created_at DESC LIMIT 5`
  );
  if (recent.length > 0) {
    console.log('\nRecent transactions:');
    recent.forEach((trx) => {
      console.log(
        `   TRX #${String(trx.id).substring(0, 8)}... - Rp ${Number(trx.total || 0).toLocaleString('id-ID')} - ${trx.created_at}`
      );
    });
  } else {
    console.log('\n(No transactions yet — make a test sale in the POS)');
  }
} catch (e) {
  console.log('[WARN] Could not fetch recent transactions:', e.message);
}

adapter.close();

console.log('\n' + '='.repeat(60));
console.log('[OK] Database connection test PASSED');
console.log('='.repeat(60));
console.log('\nRun the backend with: npm start\n');
