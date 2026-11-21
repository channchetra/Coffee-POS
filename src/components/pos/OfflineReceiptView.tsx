import React from 'react';
import { Button } from '../ui/Button';
import { useLanguageStore } from '../../lib/store';
import { formatKHR } from '../../lib/utils/currency';
import { formatDateTime } from '../../lib/utils/format';
import type { LocalInvoice, LocalInvoiceItem } from '../../lib/client/db';
import { t } from '../../i18n';

interface OfflineReceiptViewProps {
  invoice: LocalInvoice;
  items: LocalInvoiceItem[];
  dailySequence: number;
  onBack: () => void;
}

export function OfflineReceiptView({ invoice, items, dailySequence, onBack }: OfflineReceiptViewProps) {
  const { language } = useLanguageStore();

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #offline-invoice-print, #offline-invoice-print * { visibility: visible !important; }
          #offline-invoice-print {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            padding: 5mm !important;
            background: white !important;
            z-index: 99999 !important;
          }
        }
      `}</style>
      <div className="flex flex-col h-full bg-white">
        <div className="no-print p-3 border-b flex items-center justify-between bg-gray-50">
          <Button variant="outline" onClick={onBack} className="text-sm">
            ← {t(language, 'common.back')}
          </Button>
          <Button variant="primary" onClick={() => window.print()} className="text-sm">
            {t(language, 'invoice.print')}
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div id="offline-invoice-print" className="max-w-[80mm] mx-auto bg-white">
            <div className="text-center mb-4">
              <div className="flex items-center justify-center gap-2 mb-1">
                <img src="/favicon.svg" alt="" className="w-8 h-8" /> {/* desloppify:ignore IMG_NO_ALT */}
                <h1 className="text-xl font-bold text-gray-900">{t(language, 'app.name')}</h1>
              </div>
              <p className="text-4xl font-black tracking-tight text-gray-900 leading-none">#{dailySequence}</p>
              <p className="text-sm text-gray-600">{t(language, 'invoice.receipt')}</p>
            </div>

            <div className="text-sm mb-4 space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">{t(language, 'invoice.invoiceNo')}:</span>
                <span className="font-mono font-bold">{invoice.invoiceNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t(language, 'invoice.date')}:</span>
                <span>{formatDateTime(invoice.createdAt, language)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t(language, 'invoice.cashier')}:</span>
                <span>{invoice.cashierName}</span>
              </div>
              {invoice.paymentMethod === 'bank' && (
                <div className="flex justify-between">
                  <span className="text-gray-600">{language === 'km' ? 'វិធីបង់ប្រាក់' : 'Payment'}:</span>
                  <span className="text-red-600 font-medium">{language === 'km' ? 'ធនាគារ' : 'Bank'}</span>
                </div>
              )}
            </div>

            <div className="border-t border-b border-dashed py-3 mb-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-600">
                    <th className="text-left pb-2">{t(language, 'invoice.item')}</th>
                    <th className="text-center pb-2">{t(language, 'invoice.qty')}</th>
                    <th className="text-right pb-2">{t(language, 'invoice.amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-1">{item.nameSnapshot.split(' / ')[0] || item.nameSnapshot}</td>
                      <td className="text-center py-1">{item.qty}</td>
                      <td className="text-right py-1">{formatKHR(item.lineTotalKHR)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-sm space-y-1 mb-4">
              <div className="flex justify-between">
                <span>{t(language, 'invoice.subtotal')}:</span>
                <span>{formatKHR(invoice.subtotalKHR)}</span>
              </div>
              <div className="flex justify-between font-bold text-base">
                <span>{t(language, 'invoice.total')}:</span>
                <span>{formatKHR(invoice.totalKHR)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t(language, 'invoice.paid')}:</span>
                <span>{formatKHR(invoice.paidKHR)}</span>
              </div>
              {invoice.paymentMethod !== 'bank' && (
                <div className="flex justify-between font-bold text-primary-600">
                  <span>{t(language, 'invoice.change')}:</span>
                  <span>{formatKHR(invoice.changeKHR)}</span>
                </div>
              )}
            </div>

            <div className="text-center text-sm text-gray-500 border-t border-dashed pt-3">
              <p>{t(language, 'invoice.thankYou')}</p>
              {!navigator.onLine && (
                <p className="mt-2 text-xs text-orange-600 no-print">
                  {language === 'km' ? '(គ្មានអ៊ីនធើណិត - មើលក្នុងម៉ាស៊ីន)' : '(Offline - Local View)'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
