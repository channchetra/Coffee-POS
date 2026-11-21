export interface Stats {
  period: string;
  startDate: string;
  endDate: string;
  totalInvoices: number;
  totalRevenueUSD: number;
  totalRevenueKHR: number;
  // Cash-only totals (excluding bank payments)
  cashInvoices: number;
  cashRevenueUSD: number;
  cashRevenueKHR: number;
  // Bank payment totals
  bankInvoices: number;
  bankRevenueUSD: number;
  bankRevenueKHR: number;
  categoryBreakdown: { category: string; totalUSD: number; totalKHR: number; totalQty: number }[];
  topProducts: { name: string; totalQty: number; totalUSD: number; totalKHR: number }[];
  dailyStats: { date: string; count: number; totalUSD: number; totalKHR: number }[];
  cashierStats: { cashierId: string; cashierName: string; invoiceCount: number; totalUSD: number; totalKHR: number }[];
}

export interface User {
  id: string;
  username: string;
  role: string;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  cashierId: string;
  cashierName: string;
  totalUSDcents: number;
  totalKHR: number;
  paidUSDcents: number;
  paidKHR: number;
  changeUSDcents: number;
  changeKHR: number;
  exchangeRateKHR: number;
  paymentMethod?: 'cash' | 'bank';
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  nameSnapshot: string;
  priceUSDcentsSnapshot: number;
  qty: number;
  lineTotalUSDcents: number;
  lineTotalKHR: number;
}

export interface InvoiceDetail {
  invoice: Invoice;
  items: InvoiceItem[];
}

export type Period = 'today' | 'week' | 'month';
