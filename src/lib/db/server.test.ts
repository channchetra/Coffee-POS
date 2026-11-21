import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { InvoiceInput, InvoiceItemInput, InvoiceSyncOp } from './index';

// The server module opens the database lazily, so point it at a throwaway
// file before the dynamic import below.
const tempDir = mkdtempSync(join(tmpdir(), 'coffee-pos-db-test-'));
const testDbPath = join(tempDir, 'coffee-pos.db');
process.env.COFFEE_POS_DB_PATH = testDbPath;

const {
  applyInvoiceSyncOp,
  closeDb,
  getDb,
  getInvoiceWithItems,
  getInvoices,
  getInvoicesByDate,
  getStats,
  operationExists,
} = await import('./index');

const BUSINESS_TIME_ZONE = 'Asia/Phnom_Penh';
const STATS_CASHIER_ID = 'stats-boundary-test-user';
const SYNC_CASHIER_ID = 'sync-test-user';
const TEST_PREFIX = 'stats-test-';

function localDate(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function shiftDate(date: string, days: number): string {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function isoAt(date: string, time: string): string {
  return new Date(`${date}T${time}+07:00`).toISOString();
}

const today = localDate();
const yesterday = shiftDate(today, -1);
const statsFixtures = [
  // Local 00:30 = 17:30 UTC the previous day. The old UTC filter put this
  // invoice on yesterday.
  { id: `${TEST_PREFIX}today-0030`, createdAt: isoAt(today, '00:30:00') },
  // Local 06:59 = 23:59 UTC the previous day; still in the old filter's blind spot.
  { id: `${TEST_PREFIX}today-0659`, createdAt: isoAt(today, '06:59:00') },
  // Local 23:30 = 16:30 UTC the same day.
  { id: `${TEST_PREFIX}today-2330`, createdAt: isoAt(today, '23:30:00') },
  // Local yesterday 23:30 must not count as today.
  { id: `${TEST_PREFIX}yesterday-2330`, createdAt: isoAt(yesterday, '23:30:00') },
];

beforeAll(() => {
  const db = new Database(testDbPath);
  db.exec(readFileSync(join(process.cwd(), 'src', 'lib', 'db', 'schema.sql'), 'utf-8'));
  const insertUser = db.query('INSERT INTO users (id, username, passwordHash, role) VALUES (?, ?, ?, ?)');
  insertUser.run(STATS_CASHIER_ID, 'stats-boundary-test-user', 'test', 'admin');
  insertUser.run(SYNC_CASHIER_ID, 'sync-test-user', 'test', 'admin');

  const insertInvoice = db.query(`
    INSERT INTO invoices (
      id, invoiceNo, cashierId, deviceId,
      subtotalUSDcents, totalUSDcents, paidUSDcents, changeUSDcents,
      exchangeRateKHR, subtotalKHR, totalKHR, paidKHR, changeKHR,
      paymentMethod, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const fixture of statsFixtures) {
    insertInvoice.run(
      fixture.id,
      fixture.id,
      STATS_CASHIER_ID,
      'stats-test-device',
      100,
      100,
      100,
      0,
      4000,
      4000,
      4000,
      4000,
      0,
      'cash',
      fixture.createdAt
    );
  }

  db.close();
});

afterAll(() => {
  closeDb();
  rmSync(tempDir, { recursive: true, force: true });
});

describe('Cambodia business-day reporting', () => {
  it('counts a 00:30 local sale on the local day, not the UTC day', () => {
    const stats = getStats('today', STATS_CASHIER_ID);
    expect(stats.totalInvoices).toBe(3);
    expect(stats.dailyStats).toHaveLength(1);
    expect(stats.dailyStats[0]?.date).toBe(today);
    expect(stats.dailyStats[0]?.count).toBe(3);
  });

  it('keeps yesterday 23:30 out of today but inside the week and month', () => {
    expect(getStats('today', STATS_CASHIER_ID).totalInvoices).toBe(3);
    expect(getStats('week', STATS_CASHIER_ID).totalInvoices).toBe(4);
    expect(getStats('month', STATS_CASHIER_ID).totalInvoices).toBe(4);
  });

  it('uses the same local boundary in the invoice list', () => {
    const list = getInvoices({ period: 'today', cashierId: STATS_CASHIER_ID, limit: 50 });
    expect(list.total).toBe(3);
    expect(list.invoices.map((invoice: { id: string }) => invoice.id).sort()).toEqual([
      `${TEST_PREFIX}today-0030`,
      `${TEST_PREFIX}today-0659`,
      `${TEST_PREFIX}today-2330`,
    ]);
  });

  it('groups getInvoicesByDate by the Cambodia calendar date', () => {
    const ids = getInvoicesByDate(today)
      .filter((invoice: { id: string }) => invoice.id.startsWith(TEST_PREFIX))
      .map((invoice: { id: string }) => invoice.id)
      .sort();
    expect(ids).toEqual([
      `${TEST_PREFIX}today-0030`,
      `${TEST_PREFIX}today-0659`,
      `${TEST_PREFIX}today-2330`,
    ]);
  });
});

const syncInvoice: InvoiceInput = {
  id: 'sync-test-invoice-1',
  invoiceNo: 'SYNC-TEST-1',
  cashierId: SYNC_CASHIER_ID,
  deviceId: 'sync-test-device',
  subtotalUSDcents: 500,
  totalUSDcents: 500,
  paidUSDcents: 500,
  changeUSDcents: 0,
  exchangeRateKHR: 4000,
  subtotalKHR: 2000,
  totalKHR: 2000,
  paidKHR: 2000,
  changeKHR: 0,
  paymentMethod: 'cash',
  createdAt: new Date().toISOString(),
};

const syncItems: InvoiceItemInput[] = [
  {
    id: 'sync-test-item-1',
    invoiceId: syncInvoice.id,
    productId: 'product-1',
    nameSnapshot: 'Latte',
    priceUSDcentsSnapshot: 250,
    qty: 1,
    lineTotalUSDcents: 250,
    lineTotalKHR: 1000,
  },
  {
    id: 'sync-test-item-2',
    invoiceId: syncInvoice.id,
    productId: 'product-2',
    nameSnapshot: 'Mocha',
    priceUSDcentsSnapshot: 250,
    qty: 1,
    lineTotalUSDcents: 250,
    lineTotalKHR: 1000,
  },
];

const syncOp: InvoiceSyncOp = {
  opId: 'sync-test-op-1',
  deviceId: 'sync-test-device',
  type: 'INVOICE_CREATE',
  createdAt: syncInvoice.createdAt,
  payload: { invoice: syncInvoice, items: syncItems },
};

describe('applyInvoiceSyncOp', () => {
  it('applies the invoice, items and operation together', () => {
    expect(applyInvoiceSyncOp(syncOp)).toBe('applied');
    expect(getInvoiceWithItems(syncInvoice.id)?.items).toHaveLength(2);
    expect(operationExists(syncOp.opId)).toBe(true);
  });

  it('is idempotent and repairs partial rows', () => {
    expect(applyInvoiceSyncOp(syncOp)).toBe('duplicate');
    expect(getInvoiceWithItems(syncInvoice.id)?.items).toHaveLength(2);

    getDb().query('DELETE FROM invoice_items WHERE id = ?').run('sync-test-item-2');
    expect(getInvoiceWithItems(syncInvoice.id)?.items).toHaveLength(1);
    expect(applyInvoiceSyncOp(syncOp)).toBe('duplicate');
    expect(getInvoiceWithItems(syncInvoice.id)?.items).toHaveLength(2);
  });

  it('rolls back when an item cannot be stored', () => {
    const badInvoice: InvoiceInput = { ...syncInvoice, id: 'sync-test-invoice-bad' };
    const badItems = [ // desloppify:ignore HARDCODED_FAKE_DATA
      {
        ...syncItems[0],
        id: 'sync-test-item-bad',
        invoiceId: badInvoice.id,
        nameSnapshot: null as unknown as string,
      },
    ];
    const badOp: InvoiceSyncOp = {
      opId: 'sync-test-op-bad',
      deviceId: 'sync-test-device',
      type: 'INVOICE_CREATE',
      createdAt: syncInvoice.createdAt,
      payload: { invoice: badInvoice, items: badItems },
    };

    expect(() => applyInvoiceSyncOp(badOp)).toThrow();
    expect(getInvoiceWithItems(badInvoice.id)).toBeNull();
    expect(operationExists(badOp.opId)).toBe(false);
  });

  it('rejects a conflicting invoice ID without recording the operation', () => {
    const conflictOp: InvoiceSyncOp = {
      ...syncOp,
      opId: 'sync-test-op-conflict',
      payload: {
        invoice: { ...syncInvoice, invoiceNo: 'SYNC-TEST-CONFLICT' },
        items: syncItems,
      },
    };

    expect(() => applyInvoiceSyncOp(conflictOp)).toThrow();
    expect(operationExists(conflictOp.opId)).toBe(false);
  });
});
