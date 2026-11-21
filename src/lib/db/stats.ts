import { getDb } from './db';


// --- Business time zone ----------------------------------------------------
// Invoices store UTC ISO timestamps. The shop operates on Cambodia time
// (UTC+7), so reports must use the local calendar day, not the UTC day.
const BUSINESS_TIME_ZONE = 'Asia/Phnom_Penh';
const BUSINESS_UTC_OFFSET = '+7 hours';
const businessDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function getBusinessDate(date: Date = new Date()): string {
  const parts = businessDateFormatter.formatToParts(date);
  const value = (type: string) => parts.find(part => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function addDaysToBusinessDate(date: string, days: number): string {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function addMonthsToBusinessDate(date: string, months: number): string {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  const targetMonth = month - 1 + months;
  const lastDay = new Date(Date.UTC(year, targetMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, targetMonth, Math.min(day, lastDay))).toISOString().slice(0, 10);
}

function getBusinessDateRange(period: 'today' | 'week' | 'month'): { startDate: string; endDate: string } {
  const endDate = getBusinessDate();
  if (period === 'today') return { startDate: endDate, endDate };
  if (period === 'week') return { startDate: addDaysToBusinessDate(endDate, -7), endDate };
  return { startDate: addMonthsToBusinessDate(endDate, -1), endDate };
}

export function getInvoicesByDate(date: string) {
  const db = getDb();
  return db.query(`SELECT * FROM invoices WHERE date(createdAt, '${BUSINESS_UTC_OFFSET}') = date(?) ORDER BY createdAt DESC`).all(date);
}

export function getStats(period: 'today' | 'week' | 'month' = 'today', cashierId?: string) {
  const db = getDb();
  
  // Calculate date range based on period
  const { startDate, endDate } = getBusinessDateRange(period);
  
  // Build WHERE clause based on filters
  const dateFilter = `date(createdAt, '${BUSINESS_UTC_OFFSET}') >= date(?) AND date(createdAt, '${BUSINESS_UTC_OFFSET}') <= date(?)`;
  const cashierFilter = cashierId ? ` AND cashierId = ?` : '';
  const whereClause = dateFilter + cashierFilter;
  const params = cashierId ? [startDate, endDate, cashierId] : [startDate, endDate];
  
  const totalResult = db.query(`
    SELECT COUNT(*) as count, COALESCE(SUM(totalUSDcents), 0) as totalUSD, COALESCE(SUM(totalKHR), 0) as totalKHR
    FROM invoices WHERE ${whereClause}
  `).get(...params) as { count: number; totalUSD: number; totalKHR: number };
  
  // Get cash-only totals (excluding bank payments)
  const cashTotalResult = db.query(`
    SELECT COUNT(*) as count, COALESCE(SUM(totalUSDcents), 0) as totalUSD, COALESCE(SUM(totalKHR), 0) as totalKHR
    FROM invoices WHERE ${whereClause} AND (paymentMethod = 'cash' OR paymentMethod IS NULL)
  `).get(...params) as { count: number; totalUSD: number; totalKHR: number };
  
  // Get bank-only totals
  const bankTotalResult = db.query(`
    SELECT COUNT(*) as count, COALESCE(SUM(totalUSDcents), 0) as totalUSD, COALESCE(SUM(totalKHR), 0) as totalKHR
    FROM invoices WHERE ${whereClause} AND paymentMethod = 'bank'
  `).get(...params) as { count: number; totalUSD: number; totalKHR: number };
  
  const categoryBreakdown = db.query(`
    SELECT ii.nameSnapshot as category, SUM(ii.lineTotalUSDcents) as totalUSD, SUM(ii.lineTotalKHR) as totalKHR, SUM(ii.qty) as totalQty
    FROM invoice_items ii
    JOIN invoices i ON ii.invoiceId = i.id
    WHERE date(i.createdAt, '${BUSINESS_UTC_OFFSET}') >= date(?) AND date(i.createdAt, '${BUSINESS_UTC_OFFSET}') <= date(?)${cashierId ? ' AND i.cashierId = ?' : ''}
    GROUP BY ii.nameSnapshot
    ORDER BY totalKHR DESC
  `).all(...params);
  
  const topProducts = db.query(`
    SELECT ii.nameSnapshot as name, SUM(ii.qty) as totalQty, SUM(ii.lineTotalUSDcents) as totalUSD, SUM(ii.lineTotalKHR) as totalKHR
    FROM invoice_items ii
    JOIN invoices i ON ii.invoiceId = i.id
    WHERE date(i.createdAt, '${BUSINESS_UTC_OFFSET}') >= date(?) AND date(i.createdAt, '${BUSINESS_UTC_OFFSET}') <= date(?)${cashierId ? ' AND i.cashierId = ?' : ''}
    GROUP BY ii.productId
    ORDER BY totalQty DESC
    LIMIT 10
  `).all(...params);
  
  // Daily breakdown for charts
  const dailyStats = db.query(`
    SELECT date(createdAt, '${BUSINESS_UTC_OFFSET}') as date, COUNT(*) as count, SUM(totalUSDcents) as totalUSD, SUM(totalKHR) as totalKHR
    FROM invoices 
    WHERE ${whereClause}
    GROUP BY date(createdAt, '${BUSINESS_UTC_OFFSET}')
    ORDER BY date(createdAt, '${BUSINESS_UTC_OFFSET}')
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
      WHERE date(i.createdAt, '${BUSINESS_UTC_OFFSET}') >= date(?) AND date(i.createdAt, '${BUSINESS_UTC_OFFSET}') <= date(?)
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
    // Cash-only totals (money actually in cash drawer)
    cashInvoices: cashTotalResult.count,
    cashRevenueUSD: cashTotalResult.totalUSD,
    cashRevenueKHR: cashTotalResult.totalKHR,
    // Bank payment totals
    bankInvoices: bankTotalResult.count,
    bankRevenueUSD: bankTotalResult.totalUSD,
    bankRevenueKHR: bankTotalResult.totalKHR,
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

// Get invoices with filtering and pagination
export function getInvoices(options: {
  period?: 'today' | 'week' | 'month';
  cashierId?: string;
  limit?: number;
  offset?: number;
}) {
  const db = getDb();
  const { period = 'today', cashierId, limit = 50, offset = 0 } = options;
  const { startDate, endDate } = getBusinessDateRange(period);
  
  // Build query
  let query = `
    SELECT i.*, u.username as cashierName
    FROM invoices i
    LEFT JOIN users u ON i.cashierId = u.id
    WHERE date(i.createdAt, '${BUSINESS_UTC_OFFSET}') >= date(?) AND date(i.createdAt, '${BUSINESS_UTC_OFFSET}') <= date(?)
  `;
  const params: any[] = [startDate, endDate];
  
  if (cashierId) {
    query += ` AND i.cashierId = ?`;
    params.push(cashierId);
  }
  
  query += ` ORDER BY i.createdAt DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  
  const invoices = db.query(query).all(...params);
  
  // Get total count
  let countQuery = `
    SELECT COUNT(*) as total FROM invoices
    WHERE date(createdAt, '${BUSINESS_UTC_OFFSET}') >= date(?) AND date(createdAt, '${BUSINESS_UTC_OFFSET}') <= date(?)
  `;
  const countParams: any[] = [startDate, endDate];
  
  if (cashierId) {
    countQuery += ` AND cashierId = ?`;
    countParams.push(cashierId);
  }
  
  const countResult = db.query(countQuery).get(...countParams) as { total: number };
  
  return {
    invoices,
    total: countResult.total,
    limit,
    offset
  };
}
