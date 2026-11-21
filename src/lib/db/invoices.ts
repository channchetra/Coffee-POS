import { getDb } from './db';

// Invoice queries
export interface InvoiceInput {
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
  paymentMethod?: 'cash' | 'bank';
  createdAt: string;
}

export interface InvoiceItemInput {
  id: string;
  invoiceId: string;
  productId: string;
  nameSnapshot: string;
  priceUSDcentsSnapshot: number;
  qty: number;
  lineTotalUSDcents: number;
  lineTotalKHR: number;
}

export interface InvoiceSyncOp {
  opId: string;
  deviceId: string;
  type: string;
  createdAt: string;
  payload: {
    invoice: InvoiceInput;
    items: InvoiceItemInput[];
  };
}

export function createInvoice(invoice: InvoiceInput) {
  const db = getDb();
  db.query(`
    INSERT OR IGNORE INTO invoices (
      id, invoiceNo, cashierId, deviceId,
      subtotalUSDcents, totalUSDcents, paidUSDcents, changeUSDcents,
      exchangeRateKHR, subtotalKHR, totalKHR, paidKHR, changeKHR,
      paymentMethod, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    invoice.id, invoice.invoiceNo, invoice.cashierId, invoice.deviceId,
    invoice.subtotalUSDcents, invoice.totalUSDcents, invoice.paidUSDcents, invoice.changeUSDcents,
    invoice.exchangeRateKHR, invoice.subtotalKHR, invoice.totalKHR, invoice.paidKHR, invoice.changeKHR,
    invoice.paymentMethod || 'cash', invoice.createdAt
  );
}

export function createInvoiceItem(item: InvoiceItemInput) {
  const db = getDb();
  db.query(`
    INSERT OR IGNORE INTO invoice_items (
      id, invoiceId, productId, nameSnapshot, priceUSDcentsSnapshot, qty, lineTotalUSDcents, lineTotalKHR
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(item.id, item.invoiceId, item.productId, item.nameSnapshot, item.priceUSDcentsSnapshot, item.qty, item.lineTotalUSDcents, item.lineTotalKHR);
}

/**
 * Applies an invoice sync operation atomically. Duplicate opIds are
 * idempotent, and re-applying repairs partial rows left by older deployments
 * that wrote the invoice, items and operation separately.
 */
export function applyInvoiceSyncOp(op: InvoiceSyncOp): 'applied' | 'duplicate' {
  const db = getDb();
  db.exec('BEGIN IMMEDIATE');
  try {
    const alreadyApplied = operationExists(op.opId);
    createInvoice(op.payload.invoice);
    for (const item of op.payload.items) {
      createInvoiceItem(item);
    }

    // INSERT OR IGNORE keeps retries idempotent, but it also hides constraint
    // failures. Verify the complete invoice landed before recording the op.
    const storedInvoice = db.query('SELECT invoiceNo FROM invoices WHERE id = ?').get(op.payload.invoice.id) as { invoiceNo: string } | null;
    if (!storedInvoice) {
      throw new Error(`Invoice ${op.payload.invoice.id} was not stored`);
    }
    if (storedInvoice.invoiceNo !== op.payload.invoice.invoiceNo) {
      throw new Error(`Invoice ${op.payload.invoice.id} conflicts with an existing invoice`);
    }
    const storedItems = db.query('SELECT COUNT(*) as count FROM invoice_items WHERE invoiceId = ?').get(op.payload.invoice.id) as { count: number };
    if (storedItems.count !== op.payload.items.length) {
      throw new Error(`Invoice ${op.payload.invoice.id} expected ${op.payload.items.length} items, found ${storedItems.count}`);
    }

    createOperation(op.opId, op.deviceId, op.type, JSON.stringify(op.payload), op.createdAt);
    db.exec('COMMIT');
    return alreadyApplied ? 'duplicate' : 'applied';
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // The transaction may already be closed; keep the original error.
    }
    throw error;
  }
}

export function getInvoiceById(id: string) {
  const db = getDb();
  return db.query('SELECT * FROM invoices WHERE id = ?').get(id);
}

export function getInvoiceItems(invoiceId: string) {
  const db = getDb();
  return db.query('SELECT * FROM invoice_items WHERE invoiceId = ?').all(invoiceId);
}

// Get invoice with items
export function getInvoiceWithItems(invoiceId: string) {
  const db = getDb();
  
  const invoice = db.query(`
    SELECT i.*, u.username as cashierName
    FROM invoices i
    LEFT JOIN users u ON i.cashierId = u.id
    WHERE i.id = ?
  `).get(invoiceId);
  
  if (!invoice) return null;
  
  const items = db.query(`
    SELECT * FROM invoice_items WHERE invoiceId = ?
  `).all(invoiceId);
  
  return { invoice, items };
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
