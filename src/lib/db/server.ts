import { Database } from 'bun:sqlite';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'data', 'coffee-pos.db');

let db: Database | null = null;

export function getDb(): Database {
  if (!db) {
    db = new Database(DB_PATH);
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

// User queries
export function getUserByUsername(username: string) {
  const db = getDb();
  return db.query('SELECT * FROM users WHERE username = ?').get(username);
}

export function getUserById(id: string) {
  const db = getDb();
  return db.query('SELECT * FROM users WHERE id = ?').get(id);
}

export function getAllUsers() {
  const db = getDb();
  return db.query('SELECT id, username, role, createdAt FROM users ORDER BY createdAt DESC').all();
}

export function createUser(id: string, username: string, passwordHash: string, role: string) {
  const db = getDb();
  db.query('INSERT INTO users (id, username, passwordHash, role) VALUES (?, ?, ?, ?)').run(id, username, passwordHash, role);
}

export function updateUser(id: string, username: string, role: string, passwordHash?: string) {
  const db = getDb();
  if (passwordHash) {
    db.query('UPDATE users SET username = ?, role = ?, passwordHash = ? WHERE id = ?').run(username, role, passwordHash, id);
  } else {
    db.query('UPDATE users SET username = ?, role = ? WHERE id = ?').run(username, role, id);
  }
}

export function deleteUser(id: string) {
  const db = getDb();
  db.query('DELETE FROM users WHERE id = ?').run(id);
}

// Session queries
export function createSession(id: string, userId: string, token: string, expiresAt: string) {
  const db = getDb();
  db.query('INSERT INTO sessions (id, userId, token, expiresAt) VALUES (?, ?, ?, ?)').run(id, userId, token, expiresAt);
}

export function getSessionByToken(token: string) {
  const db = getDb();
  return db.query(`
    SELECT s.*, u.username, u.role 
    FROM sessions s 
    JOIN users u ON s.userId = u.id 
    WHERE s.token = ? AND s.expiresAt > datetime('now')
  `).get(token);
}

export function deleteSession(token: string) {
  const db = getDb();
  db.query('DELETE FROM sessions WHERE token = ?').run(token);
}

export function deleteExpiredSessions() {
  const db = getDb();
  db.query("DELETE FROM sessions WHERE expiresAt <= datetime('now')").run();
}

// Product queries
export function getAllProducts() {
  const db = getDb();
  return db.query('SELECT * FROM products ORDER BY category, name').all();
}

export function getProductById(id: string) {
  const db = getDb();
  return db.query('SELECT * FROM products WHERE id = ?').get(id);
}

export function createProduct(id: string, name: string, category: string, priceUSDcents: number, imageUrl: string) {
  const db = getDb();
  db.query('INSERT INTO products (id, name, category, priceUSDcents, imageUrl) VALUES (?, ?, ?, ?, ?)').run(id, name, category, priceUSDcents, imageUrl);
}

export function updateProduct(id: string, name: string, category: string, priceUSDcents: number, imageUrl: string) {
  const db = getDb();
  db.query("UPDATE products SET name = ?, category = ?, priceUSDcents = ?, imageUrl = ?, updatedAt = datetime('now') WHERE id = ?").run(name, category, priceUSDcents, imageUrl, id);
}

export function deleteProduct(id: string) {
  const db = getDb();
  db.query('DELETE FROM products WHERE id = ?').run(id);
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

// Invoice queries
export function createInvoice(invoice: {
  id: string;
  invoiceNo: string;
  cashierId: string;
  deviceId: string;
  subtotalUSDcents: number;
  totalUSDcents: number;
  paidUSDcents: number;
  changeUSDcents: number;
  exchangeRateKHR: number;
  subtotalKHR: number;
  totalKHR: number;
  paidKHR: number;
  changeKHR: number;
  createdAt: string;
}) {
  const db = getDb();
  db.query(`
    INSERT OR IGNORE INTO invoices (
      id, invoiceNo, cashierId, deviceId,
      subtotalUSDcents, totalUSDcents, paidUSDcents, changeUSDcents,
      exchangeRateKHR, subtotalKHR, totalKHR, paidKHR, changeKHR,
      createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    invoice.id, invoice.invoiceNo, invoice.cashierId, invoice.deviceId,
    invoice.subtotalUSDcents, invoice.totalUSDcents, invoice.paidUSDcents, invoice.changeUSDcents,
    invoice.exchangeRateKHR, invoice.subtotalKHR, invoice.totalKHR, invoice.paidKHR, invoice.changeKHR,
    invoice.createdAt
  );
}

export function createInvoiceItem(item: {
  id: string;
  invoiceId: string;
  productId: string;
  nameSnapshot: string;
  priceUSDcentsSnapshot: number;
  qty: number;
  lineTotalUSDcents: number;
  lineTotalKHR: number;
}) {
  const db = getDb();
  db.query(`
    INSERT OR IGNORE INTO invoice_items (
      id, invoiceId, productId, nameSnapshot, priceUSDcentsSnapshot, qty, lineTotalUSDcents, lineTotalKHR
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(item.id, item.invoiceId, item.productId, item.nameSnapshot, item.priceUSDcentsSnapshot, item.qty, item.lineTotalUSDcents, item.lineTotalKHR);
}

export function getInvoiceById(id: string) {
  const db = getDb();
  return db.query('SELECT * FROM invoices WHERE id = ?').get(id);
}

export function getInvoiceItems(invoiceId: string) {
  const db = getDb();
  return db.query('SELECT * FROM invoice_items WHERE invoiceId = ?').all(invoiceId);
}

export function getInvoicesByDate(date: string) {
  const db = getDb();
  return db.query("SELECT * FROM invoices WHERE date(createdAt) = date(?) ORDER BY createdAt DESC").all(date);
}

export function getStats(period: 'today' | 'week' | 'month' = 'today', cashierId?: string) {
  const db = getDb();
  
  // Calculate date range based on period
  const now = new Date();
  let startDate: string;
  
  if (period === 'today') {
    startDate = now.toISOString().split('T')[0];
  } else if (period === 'week') {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    startDate = weekAgo.toISOString().split('T')[0];
  } else {
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    startDate = monthAgo.toISOString().split('T')[0];
  }
  
  const endDate = now.toISOString().split('T')[0];
  
  // Build WHERE clause based on filters
  const dateFilter = `date(createdAt) >= date(?) AND date(createdAt) <= date(?)`;
  const cashierFilter = cashierId ? ` AND cashierId = ?` : '';
  const whereClause = dateFilter + cashierFilter;
  const params = cashierId ? [startDate, endDate, cashierId] : [startDate, endDate];
  
  const totalResult = db.query(`
    SELECT COUNT(*) as count, COALESCE(SUM(totalUSDcents), 0) as totalUSD, COALESCE(SUM(totalKHR), 0) as totalKHR
    FROM invoices WHERE ${whereClause}
  `).get(...params) as { count: number; totalUSD: number; totalKHR: number };
  
  const categoryBreakdown = db.query(`
    SELECT ii.nameSnapshot as category, SUM(ii.lineTotalUSDcents) as totalUSD, SUM(ii.lineTotalKHR) as totalKHR, SUM(ii.qty) as totalQty
    FROM invoice_items ii
    JOIN invoices i ON ii.invoiceId = i.id
    WHERE date(i.createdAt) >= date(?) AND date(i.createdAt) <= date(?)${cashierId ? ' AND i.cashierId = ?' : ''}
    GROUP BY ii.nameSnapshot
    ORDER BY totalKHR DESC
  `).all(...params);
  
  const topProducts = db.query(`
    SELECT ii.nameSnapshot as name, SUM(ii.qty) as totalQty, SUM(ii.lineTotalUSDcents) as totalUSD, SUM(ii.lineTotalKHR) as totalKHR
    FROM invoice_items ii
    JOIN invoices i ON ii.invoiceId = i.id
    WHERE date(i.createdAt) >= date(?) AND date(i.createdAt) <= date(?)${cashierId ? ' AND i.cashierId = ?' : ''}
    GROUP BY ii.productId
    ORDER BY totalQty DESC
    LIMIT 10
  `).all(...params);
  
  // Daily breakdown for charts
  const dailyStats = db.query(`
    SELECT date(createdAt) as date, COUNT(*) as count, SUM(totalUSDcents) as totalUSD, SUM(totalKHR) as totalKHR
    FROM invoices 
    WHERE ${whereClause}
    GROUP BY date(createdAt)
    ORDER BY date(createdAt)
  `).all(...params);
  
  // Stats by cashier (only when not filtered by cashier)
  let cashierStats: any[] = [];
  if (!cashierId) {
    cashierStats = db.query(`
      SELECT i.cashierId, u.username as cashierName, 
             COUNT(*) as invoiceCount, 
             SUM(i.totalUSDcents) as totalUSD, 
             SUM(i.totalKHR) as totalKHR
      FROM invoices i
      LEFT JOIN users u ON i.cashierId = u.id
      WHERE date(i.createdAt) >= date(?) AND date(i.createdAt) <= date(?)
      GROUP BY i.cashierId
      ORDER BY totalKHR DESC
    `).all(startDate, endDate);
  }
  
  return {
    period,
    startDate,
    endDate,
    totalInvoices: totalResult.count,
    totalRevenueUSD: totalResult.totalUSD,
    totalRevenueKHR: totalResult.totalKHR,
    categoryBreakdown,
    topProducts,
    dailyStats,
    cashierStats
  };
}

// Keep old function for backward compatibility
export function getTodayStats() {
  return getStats('today');
}

// Operations queries (for idempotent sync)
export function operationExists(opId: string): boolean {
  const db = getDb();
  const row = db.query('SELECT 1 FROM operations WHERE opId = ?').get(opId);
  return !!row;
}

export function createOperation(opId: string, deviceId: string, type: string, payloadJson: string, createdAt: string) {
  const db = getDb();
  db.query(`
    INSERT OR IGNORE INTO operations (opId, deviceId, type, payloadJson, createdAt)
    VALUES (?, ?, ?, ?, ?)
  `).run(opId, deviceId, type, payloadJson, createdAt);
}
