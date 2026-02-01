/**
 * Migration script to populate product_categories junction table
 * from existing single category field in products table
 */

import { join } from 'path';
import { readFileSync } from 'fs';

// Import bun:sqlite
const { Database } = await import('bun:sqlite');

const DB_PATH = join(process.cwd(), 'data', 'coffee-pos.db');

async function migrateCategories() {
  console.log('🔄 Starting category migration...');
  
  const db = new Database(DB_PATH);
  
  try {
    // Check if product_categories table exists
    const tableExists = db.query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='product_categories'
    `).get();
    
    if (!tableExists) {
      console.log('📋 Creating product_categories table...');
      
      // Read and execute schema
      const schemaPath = join(process.cwd(), 'src', 'lib', 'db', 'schema.sql');
      const schema = readFileSync(schemaPath, 'utf-8');
      
      // Extract just the product_categories table creation
      const createTableMatch = schema.match(/CREATE TABLE IF NOT EXISTS product_categories[\s\S]*?;/);
      if (createTableMatch) {
        db.exec(createTableMatch[0]);
      }
      
      // Extract indexes for product_categories
      const indexMatches = schema.match(/CREATE INDEX IF NOT EXISTS idx_product_categories_\w+ ON product_categories\([^)]+\);/g);
      if (indexMatches) {
        indexMatches.forEach(indexSQL => db.exec(indexSQL));
      }
      
      console.log('✅ product_categories table created');
    } else {
      console.log('ℹ️  product_categories table already exists');
    }
    
    // Check if products table exists
    const productsTableExists = db.query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='products'
    `).get();
    
    if (!productsTableExists) {
      console.log('⚠️  products table does not exist yet. Please run setup-db.ts first.');
      return;
    }
    
    // Get all products with their current category
    const products = db.query('SELECT id, category FROM products WHERE category IS NOT NULL AND category != ""').all() as any[];
    
    console.log(`📦 Found ${products.length} products to migrate`);
    
    // For each product, insert into junction table if not exists
    let migratedCount = 0;
    for (const product of products) {
      const existing = db.query('SELECT 1 FROM product_categories WHERE productId = ? AND categorySlug = ?')
        .get(product.id, product.category);
      
      if (!existing) {
        db.query('INSERT INTO product_categories (productId, categorySlug) VALUES (?, ?)')
          .run(product.id, product.category);
        migratedCount++;
      }
    }
    
    console.log(`✅ Migrated ${migratedCount} product-category relationships`);
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    db.close();
  }
}

migrateCategories().catch(err => {
  console.error(err);
  process.exit(1);
});
