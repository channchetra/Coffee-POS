import React, { useEffect, useState } from 'react';
import { useLanguageStore, useAuthStore } from '../../lib/store';
import { DashboardSummary } from './DashboardSummary';
import { DashboardBreakdowns } from './DashboardBreakdowns';
import { RecentInvoices } from './RecentInvoices';
import { InvoiceDetailModal } from './InvoiceDetailModal';
import type { Stats, User, Invoice, InvoiceDetail, Period } from './dashboard-types';
import { t } from '../../i18n';

export function Dashboard() {
  const { language } = useLanguageStore();
  const { isOnline } = useAuthStore();
  const [data, setData] = useState<{ stats: Stats | null; users: User[] }>({ stats: null, users: [] });
  const [status, setStatus] = useState({ loading: true, error: '', mounted: false });
  const [filters, setFilters] = useState<{ period: Period; cashierId: string }>({ period: 'today', cashierId: '' });
  const [invoiceState, setInvoiceState] = useState<{ list: Invoice[]; listLoading: boolean; detailLoading: boolean }>({
    list: [],
    listLoading: false,
    detailLoading: false,
  });
  const [invoiceModal, setInvoiceModal] = useState<{ open: boolean; invoice: InvoiceDetail | null }>({
    open: false,
    invoice: null,
  });

  const stats = data.stats;
  const users = data.users;
  const period = filters.period;
  const selectedCashier = filters.cashierId;
  const invoices = invoiceState.list;
  const selectedInvoice = invoiceModal.invoice;
  
  // Set mounted after hydration to avoid SSR mismatch
  useEffect(() => {
    setStatus((prev) => ({ ...prev, mounted: true }));
  }, []);
  
  const fetchStats = async (selectedPeriod: Period, cashierId?: string) => {
    setStatus((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      let url = `/api/admin/stats?period=${selectedPeriod}`;
      if (cashierId) {
        url += `&cashierId=${cashierId}`;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setData((prev) => ({ stats: data.stats, users: data.users ?? prev.users }));
    } catch (err) {
      setStatus((prev) => ({ ...prev, error: err instanceof Error ? err.message : 'Error loading stats' }));
    } finally {
      setStatus((prev) => ({ ...prev, loading: false }));
    }
  };
  
  const fetchInvoices = async (selectedPeriod: Period, cashierId?: string) => {
    setInvoiceState((prev) => ({ ...prev, listLoading: true }));
    try {
      let url = `/api/admin/invoices?period=${selectedPeriod}&limit=20`;
      if (cashierId) {
        url += `&cashierId=${cashierId}`;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch invoices');
      const data = await response.json();
      if (!Array.isArray(data.invoices)) {
        throw new Error('Invalid invoices response');
      }
      setInvoiceState((prev) => ({ ...prev, list: data.invoices }));
    } catch (err) {
      console.error('Error loading invoices:', err);
    } finally {
      setInvoiceState((prev) => ({ ...prev, listLoading: false }));
    }
  };
  
  const viewInvoiceDetail = async (invoiceId: string) => {
    setInvoiceState((prev) => ({ ...prev, detailLoading: true }));
    setInvoiceModal({ open: true, invoice: null });
    try {
      const response = await fetch(`/api/admin/invoices?id=${invoiceId}`);
      if (!response.ok) throw new Error('Failed to fetch invoice');
      const data = await response.json();
      setInvoiceModal((prev) => ({ ...prev, invoice: data }));
    } catch (err) {
      console.error('Error loading invoice:', err);
      setInvoiceModal((prev) => ({ ...prev, invoice: null }));
    } finally {
      setInvoiceState((prev) => ({ ...prev, detailLoading: false }));
    }
  };
  
  useEffect(() => {
    if (!isOnline) {
      setStatus((prev) => ({ ...prev, loading: false }));
      return;
    }
    fetchStats(filters.period, filters.cashierId || undefined);
    fetchInvoices(filters.period, filters.cashierId || undefined);
  }, [isOnline, filters]);
  
  const periodLabels = {
    today: language === 'km' ? 'ថ្ងៃនេះ' : 'Today',
    week: language === 'km' ? 'សប្ដាហ៍នេះ' : 'This Week',
    month: language === 'km' ? 'ខែនេះ' : 'This Month'
  };
  
  // Show loading state before hydration completes to avoid SSR mismatch
  if (!status.mounted) {
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
                onClick={() => setFilters((prev) => ({ ...prev, period: p }))}
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
              onChange={(e) => setFilters((prev) => ({ ...prev, cashierId: e.target.value }))}
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
              onClick={() => setFilters((prev) => ({ ...prev, cashierId: '' }))}
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
      
      {status.loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full"></div>
        </div>
      ) : status.error ? (
        <div className="card bg-red-50/80 text-red-700 p-6 rounded-2xl text-center border border-red-100">
          {status.error}
        </div>
      ) : stats ? (
        <>
          <DashboardSummary
            stats={stats}
            selectedCashier={selectedCashier}
            onSelectCashier={(cashierId) => setFilters((prev) => ({ ...prev, cashierId }))}
          />
          <DashboardBreakdowns stats={stats} period={period} />
          <RecentInvoices
            invoices={invoices}
            loading={invoiceState.listLoading}
            onViewInvoice={viewInvoiceDetail}
          />
        </>
      ) : null}
      
      <InvoiceDetailModal
        isOpen={invoiceModal.open}
        loading={invoiceState.detailLoading}
        invoice={selectedInvoice}
        onClose={() => setInvoiceModal({ open: false, invoice: null })}
      />
    </div>
  );
}
