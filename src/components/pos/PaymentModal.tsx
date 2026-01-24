import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useCartStore, useAuthStore, useLanguageStore } from '../../lib/store';
import { formatUSD, formatKHR, usdToKHR } from '../../lib/utils/currency';
import { 
  saveLocalInvoice, 
  generateInvoiceNo, 
  getOrCreateDeviceId,
  type LocalInvoice,
  type LocalInvoiceItem 
} from '../../lib/client/db';
import { syncToServer } from '../../lib/client/sync';
import { t } from '../../i18n';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalUSDcents: number;
}

export function PaymentModal({ isOpen, onClose, totalUSDcents }: PaymentModalProps) {
  const { items, clearCart } = useCartStore();
  const { user, exchangeRateKHR } = useAuthStore();
  const { language } = useLanguageStore();
  const [paidAmountKHR, setPaidAmountKHR] = useState('');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [completedInvoice, setCompletedInvoice] = useState<LocalInvoice | null>(null);
  
  const totalKHR = usdToKHR(totalUSDcents, exchangeRateKHR);
  const paidKHR = parseInt(paidAmountKHR, 10) || 0;
  const paidUSDcents = Math.round((paidKHR / exchangeRateKHR) * 100);
  const changeKHR = Math.max(0, paidKHR - totalKHR);
  const changeUSDcents = Math.round((changeKHR / exchangeRateKHR) * 100);
  
  useEffect(() => {
    if (isOpen) {
      setPaidAmountKHR('');
      setError('');
      setCompletedInvoice(null);
    }
  }, [isOpen]);
  
  // Quick amounts in KHR - common Cambodian bills
  const quickAmountsKHR = [
    { label: language === 'km' ? 'ចំនួនពិតប្រាកដ' : 'Exact', value: totalKHR },
    { label: '៛5,000', value: 5000 },
    { label: '៛10,000', value: 10000 },
    { label: '៛20,000', value: 20000 },
    { label: '៛50,000', value: 50000 },
    { label: '៛100,000', value: 100000 },
  ];
  
  const handleQuickAmountKHR = (amount: number) => {
    setPaidAmountKHR(amount.toString());
    setError('');
  };
  
  const handleComplete = async () => {
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
      
      // Create invoice
      const invoice: LocalInvoice = {
        id: invoiceId,
        invoiceNo,
        cashierId: user?.id || 'unknown',
        cashierName: user?.username || 'Unknown',
        deviceId,
        subtotalUSDcents: totalUSDcents,
        totalUSDcents: totalUSDcents,
        paidUSDcents,
        changeUSDcents,
        exchangeRateKHR,
        subtotalKHR: totalKHR,
        totalKHR,
        paidKHR,
        changeKHR,
        createdAt: now,
        syncStatus: 'pending',
      };
      
      // Create invoice items (store both names in snapshot for bilingual invoice)
      const invoiceItems: LocalInvoiceItem[] = items.map((item) => ({
        id: crypto.randomUUID(),
        invoiceId,
        productId: item.productId,
        nameSnapshot: `${item.nameEn} / ${item.nameKm}`,
        priceUSDcentsSnapshot: item.priceUSDcents,
        qty: item.qty,
        lineTotalUSDcents: item.priceUSDcents * item.qty,
        lineTotalKHR: usdToKHR(item.priceUSDcents * item.qty, exchangeRateKHR),
      }));
      
      // Save locally
      await saveLocalInvoice(invoice, invoiceItems);
      
      // Clear cart
      clearCart();
      
      // Try to sync if online
      if (navigator.onLine) {
        syncToServer();
      }
      
      // Show success
      setCompletedInvoice(invoice);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };
  
  const handleNewSale = () => {
    setCompletedInvoice(null);
    onClose();
  };
  
  const handleViewInvoice = () => {
    if (completedInvoice) {
      window.open(`/invoice/${completedInvoice.id}`, '_blank');
    }
  };
  
  const handlePrintInvoice = () => {
    if (completedInvoice) {
      // Open invoice in new window and trigger print
      const printWindow = window.open(`/invoice/${completedInvoice.id}`, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        };
      }
    }
  };
  
  if (completedInvoice) {
    return (
      <Modal isOpen={isOpen} onClose={handleNewSale} title={t(language, 'invoice.title')} size="md">
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">{t(language, 'common.success')}!</h3>
          <p className="text-gray-600 mb-6">{t(language, 'invoice.thankYou')}</p>
          
          <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-left">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">{t(language, 'invoice.invoiceNo')}</p>
                <p className="font-semibold">{completedInvoice.invoiceNo}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t(language, 'invoice.total')}</p>
                {/* KHR PRIMARY */}
                <p className="font-bold text-primary-600">{formatKHR(completedInvoice.totalKHR)}</p>
                <p className="text-sm text-gray-500">{formatUSD(completedInvoice.totalUSDcents)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t(language, 'invoice.paid')}</p>
                <p className="font-semibold">{formatKHR(completedInvoice.paidKHR)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t(language, 'invoice.change')}</p>
                <p className="font-bold text-green-600">{formatKHR(completedInvoice.changeKHR)}</p>
                <p className="text-sm text-gray-500">{formatUSD(completedInvoice.changeUSDcents)}</p>
              </div>
            </div>
          </div>
          
          {/* Three buttons: View, Print, New Sale */}
          <div className="space-y-3">
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleViewInvoice} className="flex-1">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {language === 'km' ? 'មើលវិក្កយបត្រ' : 'View Invoice'}
              </Button>
              <Button variant="secondary" onClick={handlePrintInvoice} className="flex-1">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                {t(language, 'invoice.print')}
              </Button>
            </div>
            <Button variant="success" onClick={handleNewSale} className="w-full btn-lg">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {t(language, 'invoice.newSale')}
            </Button>
          </div>
        </div>
      </Modal>
    );
  }
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t(language, 'payment.title')} size="md">
      <div className="space-y-6">
        {/* Total due - KHR PRIMARY */}
        <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-5 text-white">
          <p className="text-sm text-primary-100 mb-1">{t(language, 'payment.totalDue')}</p>
          <p className="text-4xl font-bold">{formatKHR(totalKHR)}</p>
          <p className="text-lg text-primary-100">{formatUSD(totalUSDcents)}</p>
        </div>
        
        {/* Cash received input - KHR */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t(language, 'payment.cashReceived')} (៛ KHR)
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
              className="input input-lg pl-10 text-2xl font-bold text-center"
              placeholder="0"
              step="100"
              min="0"
              autoFocus
            />
          </div>
          {paidAmountKHR && (
            <p className="mt-2 text-center text-gray-600 text-lg">≈ {formatUSD(paidUSDcents)}</p>
          )}
        </div>
        
        {/* Quick amounts - KHR */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">{t(language, 'payment.quickAmounts')}</p>
          <div className="grid grid-cols-3 gap-2">
            {quickAmountsKHR.map((qa) => (
              <button
                key={qa.label}
                onClick={() => handleQuickAmountKHR(qa.value)}
                className="btn btn-outline py-3"
              >
                {qa.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Change display - KHR PRIMARY */}
        {paidKHR >= totalKHR && (
          <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
            <p className="text-sm text-green-600 mb-1">{t(language, 'payment.change')}</p>
            <p className="text-3xl font-bold text-green-700">{formatKHR(changeKHR)}</p>
            <p className="text-lg text-green-600">{formatUSD(changeUSDcents)}</p>
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-2xl border border-red-100">
            {error}
          </div>
        )}
        
        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            {t(language, 'payment.cancel')}
          </Button>
          <Button
            variant="success"
            onClick={handleComplete}
            loading={processing}
            disabled={!paidAmountKHR || paidKHR < totalKHR}
            className="flex-1"
          >
            {t(language, 'payment.completePayment')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
