import React from 'react';
import { useLanguageStore } from '../../lib/store';
import { formatUSD, formatKHR } from '../../lib/utils/currency';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { InvoiceDetail } from './dashboard-types';

interface InvoiceDetailModalProps {
  isOpen: boolean;
  loading: boolean;
  invoice: InvoiceDetail | null;
  onClose: () => void;
}

export function InvoiceDetailModal({ isOpen, loading, invoice, onClose }: InvoiceDetailModalProps) {
  const { language } = useLanguageStore();

  return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={language === 'km' ? 'ព័ត៌មានវិក្កយបត្រ' : 'Invoice Details'}
        size="lg"
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full"></div>
          </div>
        ) : invoice ? (
          <div className="space-y-6">
            {/* Invoice Header */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500">{language === 'km' ? 'លេខវិក្កយបត្រ' : 'Invoice #'}</p>
                  <p className="font-mono font-bold text-lg">{invoice.invoice.invoiceNo}</p>
                  {(invoice.invoice as any).paymentMethod === 'bank' && (
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
                    {new Date(invoice.invoice.createdAt).toLocaleString(language === 'km' ? 'km-KH' : 'en-US')}
                  </p>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <div>
                  <p className="text-sm text-gray-500">{language === 'km' ? 'អ្នកគិតប្រាក់' : 'Cashier'}</p>
                  <p className="font-medium">{invoice.invoice.cashierName || 'Unknown'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">{language === 'km' ? 'អត្រាប្តូរប្រាក់' : 'Exchange Rate'}</p>
                  <p className="font-medium">1 USD = {invoice.invoice.exchangeRateKHR.toLocaleString()} KHR</p>
                </div>
              </div>
            </div>

            {/* Invoice Items */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">
                {language === 'km' ? 'ផលិតផល' : 'Items'}
              </h4>
              <div className="space-y-2">
                {invoice.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.nameSnapshot}</p>
                      <p className="text-sm text-gray-500">
                        {formatKHR(Math.round(item.priceUSDcentsSnapshot / 100 * invoice.invoice.exchangeRateKHR))} × {item.qty}
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
                  <span className="font-bold text-lg text-primary-600">{formatKHR(invoice.invoice.totalKHR)}</span>
                  <p className="text-xs text-gray-500">{formatUSD(invoice.invoice.totalUSDcents)}</p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{language === 'km' ? 'បានបង់' : 'Paid'}</span>
                <div className="text-right">
                  <span className="font-medium">{formatKHR(invoice.invoice.paidKHR)}</span>
                  <p className="text-xs text-gray-500">{formatUSD(invoice.invoice.paidUSDcents)}</p>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-primary-200">
                <span className="text-gray-600">{language === 'km' ? 'ប្រាក់អាប់' : 'Change'}</span>
                <div className="text-right">
                  <span className="font-medium">{formatKHR(invoice.invoice.changeKHR)}</span>
                  <p className="text-xs text-gray-500">{formatUSD(invoice.invoice.changeUSDcents)}</p>
                </div>
              </div>
            </div>

            {/* Print Button */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={onClose}
              >
                {language === 'km' ? 'បិទ' : 'Close'}
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => {
                  window.open(`/invoice/${invoice.invoice.id}`, '_blank');
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
  );
}
