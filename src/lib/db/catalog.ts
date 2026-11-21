import { getDb } from './db';

// Category queries
export function getAllCategories() {
  const db = getDb();
  return db.query('SELECT * FROM categories ORDER BY sortOrder, nameEn').all();
}

export function getCategoryBySlug(slug: string) {
  const db = getDb();
  return db.query('SELECT * FROM categories WHERE slug = ?').get(slug);
}

export function createCategory(id: string, nameEn: string, nameKm: string, slug: string, sortOrder: number = 0) {
  const db = getDb();
  db.query('INSERT INTO categories (id, nameEn, nameKm, slug, sortOrder) VALUES (?, ?, ?, ?, ?)').run(id, nameEn, nameKm, slug, sortOrder);
}

export function updateCategory(id: string, nameEn: string, nameKm: string, slug: string, sortOrder: number) {
  const db = getDb();
  db.query('UPDATE categories SET nameEn = ?, nameKm = ?, slug = ?, sortOrder = ? WHERE id = ?').run(nameEn, nameKm, slug, sortOrder, id);
}

export function deleteCategory(id: string) {
  const db = getDb();
  db.query('DELETE FROM categories WHERE id = ?').run(id);
}

// Product queries
export function getAllProducts() {
  const db = getDb();
  const products = db.query('SELECT * FROM products ORDER BY category, nameEn').all();
  
  // Fetch categories for each product
  return products.map((product: any) => {
    const categories = db.query('SELECT categorySlug FROM product_categories WHERE productId = ?').all(product.id);
    return {
      ...product,
      categories: categories.map((c: any) => c.categorySlug)
    };
  });
}

export function getProductById(id: string) {
  const db = getDb();
  const product = db.query('SELECT * FROM products WHERE id = ?').get(id);
  if (!product) return null;
  
  // Fetch categories for this product
  const categories = db.query('SELECT categorySlug FROM product_categories WHERE productId = ?').all(id);
  return {
    ...product,
    categories: categories.map((c: any) => c.categorySlug)
  };
}

export function createProduct(id: string, nameEn: string, nameKm: string, categories: string[], priceUSDcents: number, priceKHR: number, imageUrl: string) {
  const db = getDb();
  // Use first category as legacy category field
  const category = categories.length > 0 ? categories[0] : '';
  db.query('INSERT INTO products (id, nameEn, nameKm, category, priceUSDcents, priceKHR, imageUrl) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, nameEn, nameKm, category, priceUSDcents, priceKHR, imageUrl);
  
  // Insert into junction table
  for (const cat of categories) {
    db.query('INSERT INTO product_categories (productId, categorySlug) VALUES (?, ?)').run(id, cat);
  }
}

export function updateProduct(id: string, nameEn: string, nameKm: string, categories: string[], priceUSDcents: number, priceKHR: number, imageUrl: string) {
  const db = getDb();
  // Use first category as legacy category field
  const category = categories.length > 0 ? categories[0] : '';
  db.query("UPDATE products SET nameEn = ?, nameKm = ?, category = ?, priceUSDcents = ?, priceKHR = ?, imageUrl = ?, updatedAt = datetime('now') WHERE id = ?").run(nameEn, nameKm, category, priceUSDcents, priceKHR, imageUrl, id);
  
  // Update junction table - delete old and insert new
  db.query('DELETE FROM product_categories WHERE productId = ?').run(id);
  for (const cat of categories) {
    db.query('INSERT INTO product_categories (productId, categorySlug) VALUES (?, ?)').run(id, cat);
  }
}

export function deleteProduct(id: string) {
  const db = getDb();
  db.query('DELETE FROM products WHERE id = ?').run(id);
}

// Recalculate all product USD prices based on new exchange rate
export function recalculateAllProductPrices(exchangeRate: number) {
  const db = getDb();
  // Update all products: calculate priceUSDcents from priceKHR using the new rate
  // Formula: priceUSDcents = (priceKHR / exchangeRate) * 100
  db.query(`
    UPDATE products 
    SET priceUSDcents = CAST(ROUND((priceKHR * 100.0) / ?) AS INTEGER),
        updatedAt = datetime('now')
  `).run(exchangeRate);
}

// Settings queries
export function getSetting(key: string) {
  const db = getDb();
  const row = db.query('SELECT valueJson FROM settings WHERE key = ?').get(key) as { valueJson: string } | null;
  return row ? JSON.parse(row.valueJson) : null;
}

export function setSetting(key: string, value: any) {
  const db = getDb();
  const valueJson = JSON.stringify(value);
  db.query(`
    INSERT INTO settings (id, key, valueJson, updatedAt) VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET valueJson = ?, updatedAt = datetime('now')
  `).run(crypto.randomUUID(), key, valueJson, valueJson);
}
