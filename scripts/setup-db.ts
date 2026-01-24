import { Database } from 'bun:sqlite';
import { readFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), 'data');
const DB_PATH = join(DATA_DIR, 'coffee-pos.db');
const DB_WAL_PATH = join(DATA_DIR, 'coffee-pos.db-wal');
const DB_SHM_PATH = join(DATA_DIR, 'coffee-pos.db-shm');
const SCHEMA_PATH = join(process.cwd(), 'src', 'lib', 'db', 'schema.sql');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
  console.log('✓ Created data directory');
}

// Remove existing database if it exists (for clean setup)
if (existsSync(DB_PATH)) {
  unlinkSync(DB_PATH);
  console.log('✓ Removed existing database');
}
if (existsSync(DB_WAL_PATH)) {
  unlinkSync(DB_WAL_PATH);
}
if (existsSync(DB_SHM_PATH)) {
  unlinkSync(DB_SHM_PATH);
}

// Create new database
const db = new Database(DB_PATH);
console.log('✓ Created database file');

// Enable WAL mode and foreign keys
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');
console.log('✓ Configured database settings');

// Read and execute schema
const schema = readFileSync(SCHEMA_PATH, 'utf-8');
db.exec(schema);
console.log('✓ Created database schema');

db.close();
console.log('\n✅ Database setup complete!');
console.log(`   Database location: ${DB_PATH}`);
