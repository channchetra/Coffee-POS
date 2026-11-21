import React, { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useLanguageStore } from '../../lib/store';
import { getLocalInvoice, type LocalInvoice, type LocalInvoiceItem } from '../../lib/client/db';
import { getDailySequenceFromInvoiceNo } from '../../lib/client/printing';
import { formatUSD, formatKHR, formatExchangeRate } from '../../lib/utils/currency';
import { formatDateTime } from '../../lib/utils/format';
import { t } from '../../i18n';

interface InvoiceViewProps {
  invoiceId: string;
}

export function InvoiceView({ invoiceId }: InvoiceViewProps) {
  const { language } = useLanguageStore();
  const [invoice, setInvoice] = useState<LocalInvoice | null>(null);
  const [items, setItems] = useState<LocalInvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [printMode, setPrintMode] = useState<'receipt' | 'a4'>('receipt');
  
  useEffect(() => {
    const loadInvoice = async () => {
      // First try to get from local IndexedDB (works offline)
      try {
        const localData = await getLocalInvoice(invoiceId);
        if (localData) {
          setInvoice(localData.invoice);
          setItems(localData.items);
          setLoading(false);
          return;
        }
      } catch (localError) {
        console.error('Error loading from local DB:', localError);
      }
      
      // If not found locally and we're online, try fetching from server API
      if (navigator.onLine) {
        try {
          // Try the invoice endpoint first, then fall back to admin endpoint
          let response = await fetch(`/api/invoice/${invoiceId}`);
          
          // If not authorized or not found, try admin endpoint (for admin users)
          if (!response.ok) {
            response = await fetch(`/api/admin/invoices?id=${invoiceId}`);
          }
          
          if (!response.ok) {
            setLoading(false);
            return;
          }

          const serverData = await response.json();
          if (!serverData?.invoice) {
            setLoading(false);
            return;
          }
          if (!Array.isArray(serverData.items)) {
            throw new Error('Invoice response is missing items');
          }

          // Map server data to local format
          const serverInvoice: LocalInvoice = {
            id: serverData.invoice.id,
            invoiceNo: serverData.invoice.invoiceNo,
            cashierId: serverData.invoice.cashierId,
            cashierName: serverData.invoice.cashierName || 'Unknown',
            deviceId: serverData.invoice.deviceId || 'server',
            subtotalUSDcents: serverData.invoice.subtotalUSDcents,
            totalUSDcents: serverData.invoice.totalUSDcents,
            paidUSDcents: serverData.invoice.paidUSDcents,
            changeUSDcents: serverData.invoice.changeUSDcents,
            exchangeRateKHR: serverData.invoice.exchangeRateKHR,
            subtotalKHR: serverData.invoice.subtotalKHR,
            totalKHR: serverData.invoice.totalKHR,
            paidKHR: serverData.invoice.paidKHR,
            changeKHR: serverData.invoice.changeKHR,
            paymentMethod: serverData.invoice.paymentMethod || 'cash',
            createdAt: serverData.invoice.createdAt,
            syncStatus: 'synced',
          };

          const serverItems: LocalInvoiceItem[] = serverData.items.map((item: any) => ({
            id: item.id,
            invoiceId: item.invoiceId,
            productId: item.productId,
            nameSnapshot: item.nameSnapshot,
            priceUSDcentsSnapshot: item.priceUSDcentsSnapshot,
            qty: item.qty,
            lineTotalUSDcents: item.lineTotalUSDcents,
            lineTotalKHR: item.lineTotalKHR,
          }));

          setInvoice(serverInvoice);
          setItems(serverItems);
          setLoading(false);
          return;
        } catch (error) {
          console.error('Error fetching invoice from server:', error);
        }
      }
      
      setLoading(false);
    };
    
    loadInvoice();
  }, [invoiceId]);
  
  const handlePrint = () => {
    window.print();
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  if (!invoice) {
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-gray-400 p-4">
        <svg className="w-20 h-20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-xl mb-2">{language === 'km' ? 'រកមិនឃើញវិក្កយបត្រ' : 'Invoice not found'}</p>
        {isOffline && (
          <p className="text-sm text-gray-500 text-center mb-4">
            {language === 'km' 
              ? 'អ្នកស្ថិតក្នុងស្ថានភាពគ្មានអ៊ីនធើណិត។ វិក្កយបត្រនេះអាចនៅលើម៉ាស៊ីនមេ។'
              : 'You are offline. This invoice may be on the server.'}
          </p>
        )}
        <Button variant="primary" onClick={() => window.location.href = '/pos'} className="mt-4">
          {t(language, 'common.back')}
        </Button>
      </div>
    );
  }
  
  const syncStatusVariant = {
    pending: 'warning',
    syncing: 'info',
    synced: 'success',
    error: 'danger'
  } as const;

  const dailySequence = getDailySequenceFromInvoiceNo(invoice.invoiceNo);
  
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Controls - hidden when printing */}
      <div className="no-print max-w-2xl mx-auto mb-4 flex items-center justify-between">
        <Button variant="outline" onClick={() => window.location.href = '/pos'}>
          ← {t(language, 'common.back')}
        </Button>
        
        <div className="flex items-center gap-2">
          <select
            value={printMode}
            onChange={(e) => setPrintMode(e.target.value as 'receipt' | 'a4')}
            aria-label={language === 'km' ? 'ទម្រង់បោះពុម្ព' : 'Print format'}
            className="input py-2 px-3"
          >
            <option value="receipt">{t(language, 'invoice.printReceipt')}</option>
            <option value="a4">{t(language, 'invoice.printA4')}</option>
          </select>
          
          <Button variant="primary" onClick={handlePrint}>
            {t(language, 'invoice.print')}
          </Button>
        </div>
      </div>
      
      <div className={`print-area ${printMode === 'receipt' ? 'print-receipt' : 'print-a4'} max-w-2xl mx-auto bg-white rounded-xl shadow-sm p-6`}>
        <div className="invoice-header text-center mb-6">
          <h1 className="invoice-title text-2xl font-bold text-gray-900">{t(language, 'app.name')}</h1>
          <p className="text-5xl font-black tracking-tight text-gray-900 leading-none my-1">#{dailySequence}</p>
          <p className="text-gray-500">123 Coffee Street, Phnom Penh</p>
        </div>
        
        {/* Invoice info */}
        <div className="invoice-info grid grid-cols-2 gap-4 mb-6 pb-4 border-b border-gray-200">
          <div>
            <p className="detail-label text-sm text-gray-500">{t(language, 'invoice.invoiceNo')}</p>
            <p className="detail-value font-semibold">{invoice.invoiceNo}</p>
          </div>
          <div>
            <p className="detail-label text-sm text-gray-500">{t(language, 'invoice.date')}</p>
            <p className="detail-value font-semibold">{formatDateTime(invoice.createdAt)}</p>
          </div>
          <div>
            <p className="detail-label text-sm text-gray-500">{t(language, 'invoice.cashier')}</p>
            <p className="detail-value font-semibold">{invoice.cashierName}</p>
          </div>
          <div>
            <p className="detail-label text-sm text-gray-500">{t(language, 'invoice.exchangeRate')}</p>
            <p className="detail-value font-semibold">{formatExchangeRate(invoice.exchangeRateKHR)}</p>
          </div>
        </div>
        
        {/* Sync status - hidden when printing */}
        <div className="no-print mb-4">
          <span className="text-sm text-gray-500 mr-2">{t(language, 'invoice.syncStatus')}:</span>
          <Badge variant={syncStatusVariant[invoice.syncStatus]}>
            {t(language, `invoice.${invoice.syncStatus}`)}
          </Badge>
        </div>
        
        {/* Items - KHR PRIMARY */}
        <table className="w-full mb-6">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="py-2 text-left text-sm font-semibold text-gray-900">Item</th>
              <th className="py-2 text-center text-sm font-semibold text-gray-900">{t(language, 'invoice.qty')}</th>
              <th className="py-2 text-right text-sm font-semibold text-gray-900">{t(language, 'invoice.unitPrice')}</th>
              <th className="py-2 text-right text-sm font-semibold text-gray-900">{t(language, 'invoice.lineTotal')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="py-3 text-gray-900">{item.nameSnapshot.split(' / ')[0] || item.nameSnapshot}</td>
                <td className="py-3 text-center text-gray-600">{item.qty}</td>
                <td className="py-3 text-right">
                  <div className="dual-currency">
                    <span className="text-gray-900">{formatKHR(item.lineTotalKHR / item.qty)}</span>
                  </div>
                </td>
                <td className="py-3 text-right">
                  <div className="dual-currency">
                    {/* KHR PRIMARY */}
                    <span className="usd font-semibold text-gray-900">{formatKHR(item.lineTotalKHR)}</span>
                    <span className="khr text-sm text-gray-500 block">{formatUSD(item.lineTotalUSDcents)}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Totals - KHR PRIMARY */}
        <div className="totals ml-auto max-w-xs">
          <div className="total-row flex justify-between py-2">
            <span className="text-gray-600">{t(language, 'invoice.subtotal')}</span>
            <div className="text-right">
              <span className="font-semibold">{formatKHR(invoice.subtotalKHR)}</span>
              <span className="block text-sm text-gray-500">{formatUSD(invoice.subtotalUSDcents)}</span>
            </div>
          </div>
          
          <div className="total-row grand-total flex justify-between py-3 border-t-2 border-gray-900 mt-2">
            <span className="font-bold text-lg">{t(language, 'invoice.total')}</span>
            <div className="text-right">
              <span className="font-bold text-xl text-primary-600">{formatKHR(invoice.totalKHR)}</span>
              <span className="block text-gray-600">{formatUSD(invoice.totalUSDcents)}</span>
            </div>
          </div>
          
          <div className="total-row flex justify-between py-2 mt-2">
            <span className="text-gray-600">{t(language, 'invoice.paid')}</span>
            <div className="text-right">
              <span className="font-semibold">{formatKHR(invoice.paidKHR)}</span>
              <span className="block text-sm text-gray-500">{formatUSD(invoice.paidUSDcents)}</span>
            </div>
          </div>
          
          {invoice.paymentMethod === 'bank' ? (
            <div className="total-row flex justify-between py-2 bg-red-50 px-3 rounded-lg mt-2">
              <span className="text-red-700 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                {language === 'km' ? 'បង់តាមធនាគារ' : 'Bank Payment'}
              </span>
              <div className="text-right">
                <span className="font-bold text-red-700">{language === 'km' ? 'គ្មានប្រាក់អាប់' : 'No Change'}</span>
              </div>
            </div>
          ) : (
            <div className="total-row flex justify-between py-2 bg-green-50 px-3 rounded-lg mt-2">
              <span className="text-green-700">{t(language, 'invoice.change')}</span>
              <div className="text-right">
                <span className="font-bold text-green-700">{formatKHR(invoice.changeKHR)}</span>
                <span className="block text-sm text-green-600">{formatUSD(invoice.changeUSDcents)}</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="footer text-center mt-8 pt-4 border-t border-gray-200">
          <p className="text-gray-600">{t(language, 'invoice.thankYou')}</p>
          <p className="text-sm text-gray-400 mt-2">Terminal: {invoice.deviceId.slice(0, 8)}</p>
        </div>
      </div>
    </div>
  );
}
