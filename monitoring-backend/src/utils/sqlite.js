// Cross-version SQLite adapter.
//
// We prefer Node's built-in `node:sqlite` (Node 22+) so no native compilation
// is needed. If that's unavailable we fall back to better-sqlite3.
//
// Both expose a prepare().all()/get()/run() style API, so we wrap them behind
// one small interface: open(readonly), all(sql, params), get(sql, params), close().

const fs = require('fs');

let impl = null;

try {
  const { DatabaseSync } = require('node:sqlite');
  impl = {
    name: 'node:sqlite',
    open(filePath) {
      // node:sqlite does not support readonly flag the same way; open normally.
      const db = new DatabaseSync(filePath, { readOnly: true });
      return {
        all: (sql, params = []) => db.prepare(sql).all(...params),
        get: (sql, params = []) => db.prepare(sql).get(...params),
        run: (sql, params = []) => db.prepare(sql).run(...params),
        close: () => db.close()
      };
    }
  };
} catch (e) {
  try {
    const BetterSqlite3 = require('better-sqlite3');
    impl = {
      name: 'better-sqlite3',
      open(filePath) {
        const db = new BetterSqlite3(filePath, { readonly: true, fileMustExist: true });
        db.pragma('journal_mode = WAL');
        return {
          all: (sql, params = []) => db.prepare(sql).all(...params),
          get: (sql, params = []) => db.prepare(sql).get(...params),
          run: (sql, params = []) => db.prepare(sql).run(...params),
          close: () => db.close()
        };
      }
    };
  } catch (e2) {
    impl = null;
  }
}

class SqliteAdapter {
  constructor(dbPath) {
    if (!impl) {
      throw new Error(
        'No SQLite driver available. Use Node 22+ (node:sqlite) or install better-sqlite3.'
      );
    }
    this.dbPath = dbPath;
    this.driver = impl.name;
    this.db = null;
  }

  open() {
    if (this.db) return;
    if (!fs.existsSync(this.dbPath)) {
      throw new Error(`Database not found at: ${this.dbPath}`);
    }
    this.db = impl.open(this.dbPath);
    console.log(`[DB] Opened with driver: ${this.driver}`);
  }

  all(sql, params = []) {
    this.open();
    return this.db.all(sql, params);
  }

  get(sql, params = []) {
    this.open();
    return this.db.get(sql, params);
  }

  close() {
    if (this.db) {
      try { this.db.close(); } catch { /* already closed */ }
      this.db = null;
    }
  }
}

module.exports = { SqliteAdapter };
