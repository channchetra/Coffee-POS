import React from 'react';
import { useLanguageStore } from '../../lib/store';
import { formatUSD, formatKHR } from '../../lib/utils/currency';
import type { Invoice } from './dashboard-types';

interface RecentInvoicesProps {
  invoices: Invoice[];
  loading: boolean;
  onViewInvoice: (invoiceId: string) => void;
}

export function RecentInvoices({ invoices, loading, onViewInvoice }: RecentInvoicesProps) {
  const { language } = useLanguageStore();

  return (
      <div className="card p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">
          {language === 'km' ? 'វិក្កយបត្រថ្មីៗ' : 'Recent Invoices'}
        </h3>
        {loading ? (
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
                    onClick={() => onViewInvoice(invoice.id)}
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
  );
}
