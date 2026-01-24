/**
 * Database Migration Script
 * Adds new columns without losing existing data
 */

import { Database } from 'bun:sqlite';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'data', 'coffee-pos.db');

console.log('🔄 Running database migrations...\n');

const db = new Database(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');

// Helper to check if column exists
function columnExists(table: string, column: string): boolean {
  const result = db.query(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return result.some(col => col.name === column);
}

// Migration: Add paymentMethod column to invoices table
if (!columnExists('invoices', 'paymentMethod')) {
  console.log('📝 Adding paymentMethod column to invoices table...');
  db.exec(`ALTER TABLE invoices ADD COLUMN paymentMethod TEXT NOT NULL DEFAULT 'cash' CHECK (paymentMethod IN ('cash', 'bank'))`);
  console.log('✅ paymentMethod column added successfully!\n');
} else {
  console.log('✅ paymentMethod column already exists, skipping.\n');
}

// Add more migrations here as needed...
// Example:
// if (!columnExists('products', 'newColumn')) {
//   db.exec(`ALTER TABLE products ADD COLUMN newColumn TEXT DEFAULT ''`);
// }

db.close();

console.log('🎉 All migrations completed successfully!');
