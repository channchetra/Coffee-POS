import Dexie, { type Table } from 'dexie';

// Types
export interface Meta {
  id: string;
  deviceId: string;
  lastOnlineSyncAt?: string;
  language: 'en' | 'km';
  lastExchangeRateKHR: number;
}

export interface CachedUser {
  id: string;
  username: string;
  passwordHash: string;
  role: 'admin' | 'cashier';
  lastLoginAt: string;
}

export interface Product {
  id: string;
  name: string;
  category: 'coffee' | 'wine' | 'soft_drink';
  priceUSDcents: number;
  imageUrl: string;
  updatedAt: string;
  createdAt: string;
}

export interface CartItem {
  productId: string;
  name: string;
  priceUSDcents: number;
  qty: number;
}

export interface HeldCart {
  id: string;
  items: CartItem[];
  createdAt: string;
  label?: string;
}

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'error';

export interface LocalInvoice {
  id: string;
  invoiceNo: string;
  cashierId: string;
  cashierName: string;
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
  syncStatus: SyncStatus;
  syncError?: string;
}

export interface LocalInvoiceItem {
  id: string;
  invoiceId: string;
  productId: string;
  nameSnapshot: string;
  priceUSDcentsSnapshot: number;
  qty: number;
  lineTotalUSDcents: number;
  lineTotalKHR: number;
}

export interface OutboxOp {
  opId: string;
  deviceId: string;
  type: 'INVOICE_CREATE';
  payload: any;
  createdAt: string;
  attempts: number;
  lastAttemptAt?: string;
}

// Database class
class CoffeePOSDatabase extends Dexie {
  meta!: Table<Meta>;
  cachedUsers!: Table<CachedUser>;
  products!: Table<Product>;
  heldCarts!: Table<HeldCart>;
  invoices!: Table<LocalInvoice>;
  invoiceItems!: Table<LocalInvoiceItem>;
  outboxOps!: Table<OutboxOp>;

  constructor() {
    super('CoffeePOSDB');
    
    this.version(1).stores({
      meta: 'id',
      cachedUsers: 'id, username',
      products: 'id, category',
      heldCarts: 'id, createdAt',
      invoices: 'id, invoiceNo, cashierId, createdAt, syncStatus',
      invoiceItems: 'id, invoiceId',
      outboxOps: 'opId, createdAt'
    });
  }
}

export const db = new CoffeePOSDatabase();

// Helper functions
export async function getOrCreateDeviceId(): Promise<string> {
  let meta = await db.meta.get('main');
  if (!meta) {
    const deviceId = crypto.randomUUID();
    meta = {
      id: 'main',
      deviceId,
      language: 'en',
      lastExchangeRateKHR: 4100
    };
    await db.meta.put(meta);
  }
  return meta.deviceId;
}

export async function getMeta(): Promise<Meta> {
  let meta = await db.meta.get('main');
  if (!meta) {
    const deviceId = crypto.randomUUID();
    meta = {
      id: 'main',
      deviceId,
      language: 'en',
      lastExchangeRateKHR: 4100
    };
    await db.meta.put(meta);
  }
  return meta;
}

export async function updateMeta(updates: Partial<Meta>): Promise<void> {
  const meta = await getMeta();
  await db.meta.put({ ...meta, ...updates });
}

export async function setLanguage(lang: 'en' | 'km'): Promise<void> {
  await updateMeta({ language: lang });
}

export async function getLanguage(): Promise<'en' | 'km'> {
  const meta = await getMeta();
  return meta.language;
}

export async function setExchangeRate(rate: number): Promise<void> {
  await updateMeta({ lastExchangeRateKHR: rate });
}

export async function getExchangeRate(): Promise<number> {
  const meta = await getMeta();
  return meta.lastExchangeRateKHR;
}

// Products
export async function cacheProducts(products: Product[]): Promise<void> {
  await db.products.clear();
  await db.products.bulkPut(products);
}

export async function getCachedProducts(): Promise<Product[]> {
  return db.products.toArray();
}

// Held Carts
export async function saveHeldCart(cart: HeldCart): Promise<void> {
  await db.heldCarts.put(cart);
}

export async function getHeldCarts(): Promise<HeldCart[]> {
  return db.heldCarts.orderBy('createdAt').reverse().toArray();
}

export async function deleteHeldCart(id: string): Promise<void> {
  await db.heldCarts.delete(id);
}

// Invoices
export async function saveLocalInvoice(invoice: LocalInvoice, items: LocalInvoiceItem[]): Promise<void> {
  await db.transaction('rw', db.invoices, db.invoiceItems, db.outboxOps, async () => {
    await db.invoices.put(invoice);
    await db.invoiceItems.bulkPut(items);
    
    // Add to outbox for sync
    await db.outboxOps.put({
      opId: crypto.randomUUID(),
      deviceId: invoice.deviceId,
      type: 'INVOICE_CREATE',
      payload: { invoice, items },
      createdAt: new Date().toISOString(),
      attempts: 0
    });
  });
}

export async function getLocalInvoice(id: string): Promise<{ invoice: LocalInvoice; items: LocalInvoiceItem[] } | null> {
  const invoice = await db.invoices.get(id);
  if (!invoice) return null;
  const items = await db.invoiceItems.where('invoiceId').equals(id).toArray();
  return { invoice, items };
}

export async function getLocalInvoices(): Promise<LocalInvoice[]> {
  return db.invoices.orderBy('createdAt').reverse().toArray();
}

export async function updateInvoiceSyncStatus(id: string, status: SyncStatus, error?: string): Promise<void> {
  await db.invoices.update(id, { syncStatus: status, syncError: error });
}

// Outbox
export async function getOutboxOps(): Promise<OutboxOp[]> {
  return db.outboxOps.orderBy('createdAt').toArray();
}

export async function removeOutboxOp(opId: string): Promise<void> {
  await db.outboxOps.delete(opId);
}

export async function updateOutboxOpAttempt(opId: string): Promise<void> {
  const op = await db.outboxOps.get(opId);
  if (op) {
    await db.outboxOps.update(opId, {
      attempts: op.attempts + 1,
      lastAttemptAt: new Date().toISOString()
    });
  }
}

// Cached Users for offline login
export async function cacheUser(user: CachedUser): Promise<void> {
  await db.cachedUsers.put(user);
}

export async function getCachedUser(username: string): Promise<CachedUser | undefined> {
  return db.cachedUsers.where('username').equals(username).first();
}

// Generate invoice number
export async function generateInvoiceNo(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
  const count = await db.invoices.where('createdAt').startsWith(today.toISOString().split('T')[0]).count();
  const seq = (count + 1).toString().padStart(4, '0');
  return `INV-${dateStr}-${seq}`;
}
