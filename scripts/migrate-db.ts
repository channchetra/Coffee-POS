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

// Migration: Add priceKHR column to products table
// This stores the exact KHR price entered by admin, avoiding conversion rounding errors
if (!columnExists('products', 'priceKHR')) {
  console.log('📝 Adding priceKHR column to products table...');
  // Default to priceUSDcents * 41 (rough conversion from cents to KHR at ~4000 rate)
  db.exec(`ALTER TABLE products ADD COLUMN priceKHR INTEGER NOT NULL DEFAULT 0`);
  // Update existing products: calculate priceKHR from priceUSDcents
  db.exec(`UPDATE products SET priceKHR = priceUSDcents * 41 WHERE priceKHR = 0`);
  console.log('✅ priceKHR column added and existing prices migrated!\n');
} else {
  console.log('✅ priceKHR column already exists, skipping.\n');
}

// Helper to check if table exists
function tableExists(table: string): boolean {
  const result = db.query(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
  return result !== null;
}

// Migration: Create product_categories junction table
if (!tableExists('product_categories')) {
  console.log('📝 Creating product_categories junction table...');
  db.exec(`
    CREATE TABLE product_categories (
      productId TEXT NOT NULL,
      categorySlug TEXT NOT NULL,
      PRIMARY KEY (productId, categorySlug),
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (categorySlug) REFERENCES categories(slug) ON DELETE CASCADE
    )
  `);
  db.exec(`CREATE INDEX idx_product_categories_productId ON product_categories(productId)`);
  db.exec(`CREATE INDEX idx_product_categories_categorySlug ON product_categories(categorySlug)`);
  
  // Migrate existing products: populate junction table from products.category
  console.log('📝 Migrating existing product categories...');
  const products = db.query('SELECT id, category FROM products').all() as { id: string; category: string }[];
  const insertStmt = db.query('INSERT OR IGNORE INTO product_categories (productId, categorySlug) VALUES (?, ?)');
  
  for (const product of products) {
    insertStmt.run(product.id, product.category);
  }
  
  console.log(`✅ product_categories table created and ${products.length} products migrated!\n`);
} else {
  console.log('✅ product_categories table already exists, skipping.\n');
}

db.close();

console.log('🎉 All migrations completed successfully!');
