import { join } from 'path';

let DatabaseClass: any = null;
// Only attempt to import `bun:sqlite` when running under Bun. Use top-level
// conditional dynamic import so Node's ESM loader never sees the `bun:` scheme
// during module evaluation.
if (typeof Bun !== 'undefined') {
  const mod = await import('bun:sqlite');
  DatabaseClass = mod.Database;
}

// COFFEE_POS_DB_PATH lets tests point at an isolated database.
const DB_PATH = process.env.COFFEE_POS_DB_PATH || join(process.cwd(), 'data', 'coffee-pos.db');

let db: any = null;

export function getDb(): any {
  if (!db) {
    if (!DatabaseClass) {
      throw new Error(
        'bun:sqlite is not available. Run the app with Bun, or install/configure a Node-compatible sqlite driver and update src/lib/db.ts.'
      );
    }
    db = new DatabaseClass(DB_PATH);
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA foreign_keys = ON;');
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
