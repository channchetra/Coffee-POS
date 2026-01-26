import React, { useEffect, useState } from 'react';
import { useLanguageStore, useAuthStore } from '../../lib/store';
import { formatUSD, formatKHR } from '../../lib/utils/currency';
import { t } from '../../i18n';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface Stats {
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

interface User {
  id: string;
  username: string;
  role: string;
}

interface Invoice {
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

interface InvoiceItem {
  id: string;
  nameSnapshot: string;
  priceUSDcentsSnapshot: number;
  qty: number;
  lineTotalUSDcents: number;
  lineTotalKHR: number;
}

interface InvoiceDetail {
  invoice: Invoice;
  items: InvoiceItem[];
}

type Period = 'today' | 'week' | 'month';

export function Dashboard() {
  const { language } = useLanguageStore();
  const { isOnline } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<Period>('today');
  const [selectedCashier, setSelectedCashier] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  
  // Invoice states
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  
  // Set mounted after hydration to avoid SSR mismatch
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const fetchStats = async (selectedPeriod: Period, cashierId?: string) => {
    setLoading(true);
    setError('');
    try {
      let url = `/api/admin/stats?period=${selectedPeriod}`;
      if (cashierId) {
        url += `&cashierId=${cashierId}`;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data.stats);
      if (data.users) {
        setUsers(data.users);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading stats');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchInvoices = async (selectedPeriod: Period, cashierId?: string) => {
    setInvoicesLoading(true);
    try {
      let url = `/api/admin/invoices?period=${selectedPeriod}&limit=20`;
      if (cashierId) {
        url += `&cashierId=${cashierId}`;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch invoices');
      const data = await response.json();
      setInvoices(data.invoices || []);
    } catch (err) {
      console.error('Error loading invoices:', err);
    } finally {
      setInvoicesLoading(false);
    }
  };
  
  const viewInvoiceDetail = async (invoiceId: string) => {
    setInvoiceLoading(true);
    setShowInvoiceModal(true);
    try {
      const response = await fetch(`/api/admin/invoices?id=${invoiceId}`);
      if (!response.ok) throw new Error('Failed to fetch invoice');
      const data = await response.json();
      setSelectedInvoice(data);
    } catch (err) {
      console.error('Error loading invoice:', err);
      setSelectedInvoice(null);
    } finally {
      setInvoiceLoading(false);
    }
  };
  
  useEffect(() => {
    if (!isOnline) {
      setLoading(false);
      return;
    }
    fetchStats(period, selectedCashier || undefined);
    fetchInvoices(period, selectedCashier || undefined);
  }, [isOnline, period, selectedCashier]);
  
  const periodLabels = {
    today: language === 'km' ? 'ថ្ងៃនេះ' : 'Today',
    week: language === 'km' ? 'សប្ដាហ៍នេះ' : 'This Week',
    month: language === 'km' ? 'ខែនេះ' : 'This Month'
  };
  
  // Show loading state before hydration completes to avoid SSR mismatch
  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  if (!isOnline) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <div className="card p-12 text-center">
          <svg className="w-20 h-20 mb-4 mx-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
          </svg>
          <p className="text-xl font-medium text-gray-600">{t(language, 'admin.offlineMessage')}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-900">{t(language, 'admin.dashboard')}</h2>
          
          {/* Period filter buttons */}
          <div className="flex gap-2 p-1 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/30">
            {(['today', 'week', 'month'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  period === p
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25'
                    : 'text-gray-600 hover:bg-white/80'
                }`}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
        </div>
        
        {/* Cashier filter */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600">
            {language === 'km' ? 'អ្នកគិតប្រាក់:' : 'Cashier:'}
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              {selectedCashier && users.find(u => u.id === selectedCashier) ? (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold text-xs">
                  {users.find(u => u.id === selectedCashier)?.username?.[0]?.toUpperCase() || 'U'}
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              )}
            </div>
            <select
              value={selectedCashier}
              onChange={(e) => setSelectedCashier(e.target.value)}
              className="input py-2.5 pl-12 pr-10 min-w-[220px] appearance-none cursor-pointer"
            >
              <option value="">{language === 'km' ? 'ទាំងអស់' : 'All Cashiers'}</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username} ({user.role})
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {selectedCashier && (
            <button
              onClick={() => setSelectedCashier('')}
              className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              {language === 'km' ? 'សម្អាត' : 'Clear'}
            </button>
          )}
        </div>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full"></div>
        </div>
      ) : error ? (
        <div className="card bg-red-50/80 text-red-700 p-6 rounded-2xl text-center border border-red-100">
          {error}
        </div>
      ) : stats ? (
        <>
          {/* Summary cards - KHR PRIMARY - Full width on mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="card p-4 md:p-5 flex items-center justify-between sm:block">
              <div>
                <p className="text-xs md:text-sm text-gray-500 mb-1">{t(language, 'admin.totalInvoices')}</p>
                <p className="text-2xl md:text-4xl font-bold text-gray-900">{stats.totalInvoices}</p>
              </div>
              <p className="text-xs text-gray-400 sm:mt-2">
                {stats.startDate === stats.endDate 
                  ? stats.startDate 
                  : `${stats.startDate} - ${stats.endDate}`}
              </p>
            </div>
            
            <div className="card p-4 md:p-5 bg-gradient-to-br from-primary-500 to-primary-600 text-white flex items-center justify-between sm:block">
              <div>
                <p className="text-xs md:text-sm text-primary-100 mb-1">{t(language, 'admin.totalRevenue')}</p>
                <p className="text-2xl md:text-3xl font-bold">{formatKHR(stats.totalRevenueKHR)}</p>
              </div>
              <p className="text-xs md:text-sm text-primary-100 sm:mt-1">{formatUSD(stats.totalRevenueUSD)}</p>
            </div>
            
            {/* Cash Total */}
            <div className="card p-4 md:p-5 bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-between sm:block">
              <div className="flex items-center gap-2 sm:block">
                <svg className="w-5 h-5 sm:w-4 sm:h-4 text-green-100 sm:mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <div>
                  <p className="text-xs md:text-sm text-green-100">{language === 'km' ? 'សាច់ប្រាក់សរុប' : 'Cash Total'}</p>
                  <p className="text-2xl md:text-3xl font-bold">{formatKHR(stats.cashRevenueKHR)}</p>
                </div>
              </div>
              <p className="text-xs md:text-sm text-green-100 sm:mt-1">{stats.cashInvoices} {language === 'km' ? 'វិក្កយបត្រ' : 'invoices'}</p>
            </div>
            
            {/* Bank Total */}
            <div className="card p-4 md:p-5 bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-between sm:block">
              <div className="flex items-center gap-2 sm:block">
                <svg className="w-5 h-5 sm:w-4 sm:h-4 text-red-100 sm:mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <div>
                  <p className="text-xs md:text-sm text-red-100">{language === 'km' ? 'ធនាគារសរុប' : 'Bank Total'}</p>
                  <p className="text-2xl md:text-3xl font-bold">{formatKHR(stats.bankRevenueKHR)}</p>
                </div>
              </div>
              <p className="text-xs md:text-sm text-red-100 sm:mt-1">{stats.bankInvoices} {language === 'km' ? 'វិក្កយបត្រ' : 'invoices'}</p>
            </div>
          </div>
          
          {/* Stats by Cashier - Only show when not filtered by specific cashier */}
          {!selectedCashier && stats.cashierStats && stats.cashierStats.length > 0 && (
            <div className="card p-4 md:p-6">
              <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">
                {language === 'km' ? 'ស្ថិតិតាមអ្នកគិតប្រាក់' : 'Stats by Cashier'}
              </h3>
              <div className="space-y-2 md:space-y-3">
                {stats.cashierStats.map((cashier) => (
                  <div key={cashier.cashierId} className="bg-gray-50/50 rounded-xl border border-gray-100 p-3">
                    {/* Row 1: Name and Revenue */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                          {(cashier.cashierName || 'U')[0].toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900 text-sm truncate">{cashier.cashierName || 'Unknown'}</span>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="font-bold text-gray-900 text-sm">{formatKHR(cashier.totalKHR)}</p>
                        <p className="text-xs text-gray-500">{formatUSD(cashier.totalUSD)}</p>
                      </div>
                    </div>
                    {/* Row 2: Invoices count and action */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500">
                        {cashier.invoiceCount} {language === 'km' ? 'វិក្កយបត្រ' : 'invoices'}
                      </p>
                      <button
                        onClick={() => setSelectedCashier(cashier.cashierId)}
                        className="p-2.5 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-xl transition-colors"
                        title={language === 'km' ? 'មើល' : 'View'}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Top products - KHR PRIMARY */}
          <div className="card p-4 md:p-6">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">{t(language, 'admin.topProducts')}</h3>
            {stats.topProducts.length === 0 ? (
              <p className="text-gray-400 text-center py-8">
                {language === 'km' ? 'មិនមានការលក់' : 'No sales in this period'}
              </p>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {stats.topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-3 md:p-4 bg-gray-50/50 rounded-xl md:rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
                      <span className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-600 text-white font-bold rounded-lg md:rounded-xl shadow-lg shadow-primary-500/20 text-sm md:text-base flex-shrink-0">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-gray-900 text-sm md:text-base block truncate">{product.name}</span>
                        <p className="text-xs md:text-sm text-gray-500">{product.totalQty} {language === 'km' ? 'ផលិតផល' : 'sold'}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="font-bold text-primary-600 text-sm md:text-base">{formatKHR(product.totalKHR)}</p>
                      <p className="text-xs md:text-sm text-gray-500">{formatUSD(product.totalUSD)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Category breakdown - KHR PRIMARY */}
          <div className="card p-4 md:p-6">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">{t(language, 'admin.categoryBreakdown')}</h3>
            {stats.categoryBreakdown.length === 0 ? (
              <p className="text-gray-400 text-center py-8">
                {language === 'km' ? 'មិនមានការលក់' : 'No sales in this period'}
              </p>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {stats.categoryBreakdown.map((cat, index) => (
                  <div key={index} className="flex items-center justify-between p-3 md:p-4 bg-gray-50/50 rounded-xl md:rounded-2xl border border-gray-100">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-gray-900 text-sm md:text-base block truncate">{cat.category}</span>
                      <p className="text-xs md:text-sm text-gray-500">{cat.totalQty} {language === 'km' ? 'ផលិតផល' : 'items'}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="font-bold text-primary-600 text-sm md:text-base">{formatKHR(cat.totalKHR)}</p>
                      <p className="text-xs md:text-sm text-gray-500">{formatUSD(cat.totalUSD)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Daily stats (for week/month view) */}
          {(period === 'week' || period === 'month') && stats.dailyStats.length > 0 && (
            <div className="card p-4 md:p-6">
              <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">
                {language === 'km' ? 'ស្ថិតិប្រចាំថ្ងៃ' : 'Daily Stats'}
              </h3>
              <div className="space-y-2 md:space-y-3">
                {stats.dailyStats.map((day, index) => (
                  <div key={index} className="bg-gray-50/50 rounded-xl border border-gray-100 p-3">
                    {/* Row 1: Date and Revenue */}
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 text-sm">{day.date}</span>
                      <div className="text-right">
                        <p className="font-bold text-gray-900 text-sm">{formatKHR(day.totalKHR)}</p>
                        <p className="text-xs text-gray-500">{formatUSD(day.totalUSD)}</p>
                      </div>
                    </div>
                    {/* Row 2: Invoice count */}
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500">
                        {day.count} {language === 'km' ? 'វិក្កយបត្រ' : 'invoices'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Recent Invoices */}
          <div className="card p-4 md:p-6">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">
              {language === 'km' ? 'វិក្កយបត្រថ្មីៗ' : 'Recent Invoices'}
            </h3>
            {invoicesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
              </div>
            ) : invoices.length === 0 ? (
              <p className="text-gray-400 text-center py-8">
                {language === 'km' ? 'មិនមានវិក្កយបត្រ' : 'No invoices in this period'}
              </p>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="bg-gray-50/50 rounded-xl border border-gray-100 p-3">
                    {/* Row 1: Invoice # and Total */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="font-mono text-sm font-medium text-gray-900">{invoice.invoiceNo}</span>
                        {invoice.paymentMethod === 'bank' && (
                          <span className="inline-flex items-center gap-0.5 bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full text-xs font-medium">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                          </span>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="font-bold text-gray-900 text-sm">{formatKHR(invoice.totalKHR)}</p>
                        <p className="text-xs text-gray-500">{formatUSD(invoice.totalUSDcents)}</p>
                      </div>
                    </div>
                    {/* Row 2: Date, Cashier, and Action */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <span>{new Date(invoice.createdAt).toLocaleString(language === 'km' ? 'km-KH' : 'en-US', {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        })}</span>
                        <span className="text-gray-300">•</span>
                        <span>{invoice.cashierName || 'Unknown'}</span>
                      </div>
                      <button
                        onClick={() => viewInvoiceDetail(invoice.id)}
                        className="p-2.5 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-xl transition-colors"
                        title={language === 'km' ? 'មើល' : 'View'}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
      
      {/* Invoice Detail Modal */}
      <Modal
        isOpen={showInvoiceModal}
        onClose={() => {
          setShowInvoiceModal(false);
          setSelectedInvoice(null);
        }}
        title={language === 'km' ? 'ព័ត៌មានវិក្កយបត្រ' : 'Invoice Details'}
        size="lg"
      >
        {invoiceLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full"></div>
          </div>
        ) : selectedInvoice ? (
          <div className="space-y-6">
            {/* Invoice Header */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500">{language === 'km' ? 'លេខវិក្កយបត្រ' : 'Invoice #'}</p>
                  <p className="font-mono font-bold text-lg">{selectedInvoice.invoice.invoiceNo}</p>
                  {(selectedInvoice.invoice as any).paymentMethod === 'bank' && (
                    <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium mt-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      {language === 'km' ? 'បង់តាមធនាគារ' : 'Bank Payment'}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">{language === 'km' ? 'កាលបរិច្ឆេទ' : 'Date'}</p>
                  <p className="font-medium">
                    {new Date(selectedInvoice.invoice.createdAt).toLocaleString(language === 'km' ? 'km-KH' : 'en-US')}
                  </p>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <div>
                  <p className="text-sm text-gray-500">{language === 'km' ? 'អ្នកគិតប្រាក់' : 'Cashier'}</p>
                  <p className="font-medium">{selectedInvoice.invoice.cashierName || 'Unknown'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">{language === 'km' ? 'អត្រាប្តូរប្រាក់' : 'Exchange Rate'}</p>
                  <p className="font-medium">1 USD = {selectedInvoice.invoice.exchangeRateKHR.toLocaleString()} KHR</p>
                </div>
              </div>
            </div>
            
            {/* Invoice Items */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">
                {language === 'km' ? 'ផលិតផល' : 'Items'}
              </h4>
              <div className="space-y-2">
                {selectedInvoice.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.nameSnapshot}</p>
                      <p className="text-sm text-gray-500">
                        {formatKHR(Math.round(item.priceUSDcentsSnapshot / 100 * selectedInvoice.invoice.exchangeRateKHR))} × {item.qty}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatKHR(item.lineTotalKHR)}</p>
                      <p className="text-xs text-gray-500">{formatUSD(item.lineTotalUSDcents)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Invoice Summary */}
            <div className="bg-primary-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{language === 'km' ? 'សរុប' : 'Total'}</span>
                <div className="text-right">
                  <span className="font-bold text-lg text-primary-600">{formatKHR(selectedInvoice.invoice.totalKHR)}</span>
                  <p className="text-xs text-gray-500">{formatUSD(selectedInvoice.invoice.totalUSDcents)}</p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{language === 'km' ? 'បានបង់' : 'Paid'}</span>
                <div className="text-right">
                  <span className="font-medium">{formatKHR(selectedInvoice.invoice.paidKHR)}</span>
                  <p className="text-xs text-gray-500">{formatUSD(selectedInvoice.invoice.paidUSDcents)}</p>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-primary-200">
                <span className="text-gray-600">{language === 'km' ? 'ប្រាក់អាប់' : 'Change'}</span>
                <div className="text-right">
                  <span className="font-medium">{formatKHR(selectedInvoice.invoice.changeKHR)}</span>
                  <p className="text-xs text-gray-500">{formatUSD(selectedInvoice.invoice.changeUSDcents)}</p>
                </div>
              </div>
            </div>
            
            {/* Print Button */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowInvoiceModal(false);
                  setSelectedInvoice(null);
                }}
              >
                {language === 'km' ? 'បិទ' : 'Close'}
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => {
                  window.open(`/invoice/${selectedInvoice.invoice.id}`, '_blank');
                }}
              >
                {language === 'km' ? 'បោះពុម្ព' : 'Print'}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">
            {language === 'km' ? 'រកមិនឃើញវិក្កយបត្រ' : 'Invoice not found'}
          </p>
        )}
      </Modal>
    </div>
  );
}
