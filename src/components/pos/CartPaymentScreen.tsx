import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { useAuthStore, useCartStore, useLanguageStore } from '../../lib/store';
import { formatUSD, formatKHR } from '../../lib/utils/currency';
import {
  generateInvoiceNo,
  getOrCreateDeviceId,
  saveLocalInvoice,
  type CartItem,
  type LocalInvoice,
  type LocalInvoiceItem,
  type PaymentMethod,
} from '../../lib/client/db';
import { syncToServer } from '../../lib/client/sync';
import { t } from '../../i18n';

interface CartPaymentScreenProps {
  items: CartItem[];
  subtotalUSDcents: number;
  totalKHR: number;
  onCancel: () => void;
  onComplete: (invoice: LocalInvoice, items: LocalInvoiceItem[]) => void;
}

export function CartPaymentScreen({
  items,
  subtotalUSDcents,
  totalKHR,
  onCancel,
  onComplete,
}: CartPaymentScreenProps) {
  const { user, exchangeRateKHR } = useAuthStore();
  const { language } = useLanguageStore();
  const { clearCart } = useCartStore();
  const [paidAmountKHR, setPaidAmountKHR] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  const paidKHR = parseInt(paidAmountKHR, 10) || 0;
  const paidUSDcents = Math.round((paidKHR / exchangeRateKHR) * 100);
  const changeKHR = Math.max(0, paidKHR - totalKHR);
  const changeUSDcents = Math.round((changeKHR / exchangeRateKHR) * 100);

  const handleQuickAmountKHR = (amount: number) => {
    setPaidAmountKHR(amount.toString());
    setPaymentMethod('cash');
    setError('');
  };

  const handleBankPayment = () => {
    setPaidAmountKHR(totalKHR.toString());
    setPaymentMethod('bank');
    setError('');
  };

  const handleCompletePayment = async () => {
    if (paidKHR < totalKHR) {
      setError(t(language, 'payment.insufficientPayment'));
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const deviceId = await getOrCreateDeviceId();
      const invoiceNo = await generateInvoiceNo();
      const invoiceId = crypto.randomUUID();
      const now = new Date().toISOString();

      const invoice: LocalInvoice = {
        id: invoiceId,
        invoiceNo,
        cashierId: user?.id || 'unknown',
        cashierName: user?.username || 'Unknown',
        deviceId,
        subtotalUSDcents,
        totalUSDcents: subtotalUSDcents,
        paidUSDcents,
        changeUSDcents: paymentMethod === 'bank' ? 0 : changeUSDcents,
        exchangeRateKHR,
        subtotalKHR: totalKHR,
        totalKHR,
        paidKHR,
        changeKHR: paymentMethod === 'bank' ? 0 : changeKHR,
        paymentMethod,
        createdAt: now,
        syncStatus: 'pending',
      };

      const invoiceItems: LocalInvoiceItem[] = items.map((item) => ({
        id: crypto.randomUUID(),
        invoiceId,
        productId: item.productId,
        nameSnapshot: `${item.nameEn} / ${item.nameKm}`,
        priceUSDcentsSnapshot: item.priceUSDcents,
        qty: item.qty,
        lineTotalUSDcents: item.priceUSDcents * item.qty,
        lineTotalKHR: (item.priceKHR || 0) * item.qty,
      }));

      await saveLocalInvoice(invoice, invoiceItems);
      clearCart();

      if (navigator.onLine) {
        syncToServer();
      }

      setProcessing(false);
      onComplete(invoice, invoiceItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full glass-panel">
      <div className="p-4 border-b border-white/30">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{t(language, 'payment.title')}</h2>
          <button
            onClick={onCancel}
            aria-label={language === 'km' ? 'បិទការបង់ប្រាក់' : 'Close payment'}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded-xl transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-4 text-white shadow-lg">
            <p className="text-xs font-medium text-primary-100 uppercase tracking-wide">
              {language === 'km' ? 'សរុបត្រូវបង់' : 'Total Due'}
            </p>
            <p className="text-2xl font-bold mt-1">{formatKHR(totalKHR)}</p>
            <p className="text-sm text-primary-100">{formatUSD(subtotalUSDcents)}</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg">
            <p className="text-xs font-medium text-blue-100 uppercase tracking-wide">
              {language === 'km' ? 'ប្រាក់អាប់' : 'Change'}
            </p>
            <p className="text-2xl font-bold mt-1">{formatKHR(changeKHR)}</p>
            <p className="text-sm text-blue-100">{formatUSD(changeUSDcents)}</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t(language, 'payment.cashReceived')} (៛)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-gray-500">៛</span>
            <input
              type="number"
              value={paidAmountKHR}
              onChange={(e) => {
                setPaidAmountKHR(e.target.value);
                setError('');
              }}
              className="input input-lg pl-10 text-2xl font-bold text-center w-full"
              placeholder="0"
              step="100"
              min="0"
              autoFocus
            />
          </div>
          {paidAmountKHR && (
            <p className="mt-1 text-center text-gray-500 text-sm">≈ {formatUSD(paidUSDcents)}</p>
          )}
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">{t(language, 'payment.quickAmounts')}</p>
          <div className="grid grid-cols-4 gap-2 mb-2">
            <button
              onClick={() => handleQuickAmountKHR(totalKHR)}
              className={`btn py-2.5 text-sm ${paymentMethod === 'cash' && paidKHR === totalKHR ? 'btn-primary' : 'btn-outline'}`}
            >
              {t(language, 'payment.exactAmount')}
            </button>
            <button
              onClick={handleBankPayment}
              className={`btn py-2.5 text-sm font-semibold ${
                paymentMethod === 'bank'
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25'
                  : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
              }`}
            >
              {language === 'km' ? 'ធនាគារ' : 'Bank'}
            </button>
            <button
              onClick={() => handleQuickAmountKHR(5000)}
              className="btn btn-outline py-2.5 text-sm"
            >
              ៛5,000
            </button>
            <button
              onClick={() => handleQuickAmountKHR(10000)}
              className="btn btn-outline py-2.5 text-sm"
            >
              ៛10,000
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleQuickAmountKHR(20000)}
              className="btn btn-outline py-2.5 text-sm"
            >
              ៛20,000
            </button>
            <button
              onClick={() => handleQuickAmountKHR(50000)}
              className="btn btn-outline py-2.5 text-sm"
            >
              ៛50,000
            </button>
            <button
              onClick={() => handleQuickAmountKHR(100000)}
              className="btn btn-outline py-2.5 text-sm"
            >
              ៛100,000
            </button>
          </div>
        </div>

        {paymentMethod === 'bank' && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span>{language === 'km' ? 'បង់តាមធនាគារ/កាត - មិនមានប្រាក់អាប់' : 'Bank/Card Payment - No change given'}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}
      </div>

      <div className="border-t border-white/30 p-4 space-y-3 bg-white/30 backdrop-blur-xl safe-bottom">
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            {t(language, 'payment.cancel')}
          </Button>
          <Button
            variant="success"
            onClick={handleCompletePayment}
            loading={processing}
            disabled={!paidAmountKHR || paidKHR < totalKHR}
            className="flex-1"
          >
            {t(language, 'payment.completePayment')}
          </Button>
        </div>
      </div>
    </div>
  );
}
