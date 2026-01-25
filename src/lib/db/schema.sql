-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  passwordHash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'cashier')),
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expiresAt TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id)
);

-- Categories table (with translations)
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  nameEn TEXT NOT NULL,
  nameKm TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  sortOrder INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Products table (with translations, category references categories.slug)
-- priceKHR is the source of truth (user-entered value)
-- priceUSDcents is calculated from priceKHR for compatibility
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  nameEn TEXT NOT NULL,
  nameKm TEXT NOT NULL,
  category TEXT NOT NULL,
  priceUSDcents INTEGER NOT NULL,
  priceKHR INTEGER NOT NULL DEFAULT 0,
  imageUrl TEXT,
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  valueJson TEXT NOT NULL,
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  invoiceNo TEXT NOT NULL,
  cashierId TEXT NOT NULL,
  deviceId TEXT NOT NULL,
  subtotalUSDcents INTEGER NOT NULL,
  totalUSDcents INTEGER NOT NULL,
  paidUSDcents INTEGER NOT NULL,
  changeUSDcents INTEGER NOT NULL,
  exchangeRateKHR INTEGER NOT NULL,
  subtotalKHR INTEGER NOT NULL,
  totalKHR INTEGER NOT NULL,
  paidKHR INTEGER NOT NULL,
  changeKHR INTEGER NOT NULL,
  paymentMethod TEXT NOT NULL DEFAULT 'cash' CHECK (paymentMethod IN ('cash', 'bank')),
  createdAt TEXT NOT NULL,
  syncedAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (cashierId) REFERENCES users(id)
);

-- Invoice items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id TEXT PRIMARY KEY,
  invoiceId TEXT NOT NULL,
  productId TEXT NOT NULL,
  nameSnapshot TEXT NOT NULL,
  priceUSDcentsSnapshot INTEGER NOT NULL,
  qty INTEGER NOT NULL,
  lineTotalUSDcents INTEGER NOT NULL,
  lineTotalKHR INTEGER NOT NULL,
  FOREIGN KEY (invoiceId) REFERENCES invoices(id)
);

-- Operations table for idempotent sync
CREATE TABLE IF NOT EXISTS operations (
  opId TEXT PRIMARY KEY,
  deviceId TEXT NOT NULL,
  type TEXT NOT NULL,
  payloadJson TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  appliedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_cashierId ON invoices(cashierId);
CREATE INDEX IF NOT EXISTS idx_invoices_createdAt ON invoices(createdAt);
CREATE INDEX IF NOT EXISTS idx_invoices_deviceId ON invoices(deviceId);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoiceId ON invoice_items(invoiceId);
CREATE INDEX IF NOT EXISTS idx_operations_deviceId ON operations(deviceId);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_userId ON sessions(userId);
