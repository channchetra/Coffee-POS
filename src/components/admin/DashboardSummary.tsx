import React from 'react';
import { useLanguageStore } from '../../lib/store';
import { formatUSD, formatKHR } from '../../lib/utils/currency';
import { t } from '../../i18n';
import type { Stats } from './dashboard-types';

interface DashboardSummaryProps {
  stats: Stats;
  selectedCashier: string;
  onSelectCashier: (cashierId: string) => void;
}

export function DashboardSummary({ stats, selectedCashier, onSelectCashier }: DashboardSummaryProps) {
  const { language } = useLanguageStore();

  return (
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
                    onClick={() => onSelectCashier(cashier.cashierId)}
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

    </>
  );
}
