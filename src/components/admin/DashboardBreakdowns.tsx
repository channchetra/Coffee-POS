import React from 'react';
import { useLanguageStore } from '../../lib/store';
import { formatUSD, formatKHR } from '../../lib/utils/currency';
import { t } from '../../i18n';
import type { Stats, Period } from './dashboard-types';

interface DashboardBreakdownsProps {
  stats: Stats;
  period: Period;
}

export function DashboardBreakdowns({ stats, period }: DashboardBreakdownsProps) {
  const { language } = useLanguageStore();

  return (
    <>
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
              <div key={product.name} className="flex items-center justify-between p-3 md:p-4 bg-gray-50/50 rounded-xl md:rounded-2xl border border-gray-100">
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
            {stats.categoryBreakdown.map((cat) => (
              <div key={cat.category} className="flex items-center justify-between p-3 md:p-4 bg-gray-50/50 rounded-xl md:rounded-2xl border border-gray-100">
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
            {stats.dailyStats.map((day) => (
              <div key={day.date} className="bg-gray-50/50 rounded-xl border border-gray-100 p-3">
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

    </>
  );
}
