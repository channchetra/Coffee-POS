import React, { useState, useEffect } from 'react';
import { CartItem } from './CartItem';
import { HeldCartsModal } from './HeldCartsModal';
import { useCartStore, useAuthStore, useHeldCartsStore, useLanguageStore } from '../../lib/store';
import { formatUSD, formatKHR, usdToKHR } from '../../lib/utils/currency';
import { saveHeldCart, getHeldCarts, saveLocalInvoice, generateInvoiceNo, getOrCreateDeviceId, getLocalInvoice, type HeldCart, type LocalInvoice, type LocalInvoiceItem, type PaymentMethod } from '../../lib/client/db';
import { syncToServer } from '../../lib/client/sync';
import { formatDateTime } from '../../lib/utils/format';
import { getDailySequenceFromInvoiceNo, printInvoiceViaEscPosIntent, type ReceiptPaperSize } from '../../lib/client/printing';
import { t } from '../../i18n';
import { Button } from '../ui/Button';

interface CartProps {
  onClose?: () => void;
  showCloseButton?: boolean;
}

export function Cart({ onClose, showCloseButton }: CartProps) {
  const { items, getSubtotal, clearCart, setCart } = useCartStore();
  const { user, exchangeRateKHR } = useAuthStore();
  const { heldCarts, setHeldCarts, addHeldCart } = useHeldCartsStore();
  const { language } = useLanguageStore();
  const [showPayment, setShowPayment] = useState(false);
  const [showHeldCarts, setShowHeldCarts] = useState(false);
  
  // Payment states
  const [paidAmountKHR, setPaidAmountKHR] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [completedInvoice, setCompletedInvoice] = useState<LocalInvoice | null>(null);
  const [completedInvoiceItems, setCompletedInvoiceItems] = useState<LocalInvoiceItem[]>([]);
  const [showInlineInvoice, setShowInlineInvoice] = useState(false);
  const [printSettings, setPrintSettings] = useState<{ autoPrintInvoice: boolean; receiptPrintMode: 'browser' | 'escpos-intent'; receiptPaperSize: ReceiptPaperSize }>({
    autoPrintInvoice: false,
    receiptPrintMode: 'browser',
    receiptPaperSize: '58mm'
  });
  
  // Load held carts on mount to show badge count
  useEffect(() => {
    const loadHeldCarts = async () => {
      const carts = await getHeldCarts();
      setHeldCarts(carts);
    };
    loadHeldCarts();
  }, [setHeldCarts]);

  useEffect(() => {
    const loadPrintSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (!response.ok) return;
        const data = await response.json();
        setPrintSettings({
          autoPrintInvoice: !!data.autoPrintInvoice,
          receiptPrintMode: data.receiptPrintMode === 'escpos-intent' ? 'escpos-intent' : 'browser',
          receiptPaperSize: data.receiptPaperSize === '80mm' ? '80mm' : '58mm'
        });
      } catch {
        // Keep default print settings when request fails.
      }
    };

    loadPrintSettings();
  }, []);
  
  const subtotal = getSubtotal(); // USD cents for compatibility
  // Calculate KHR total directly from items' priceKHR (source of truth)
  const totalKHR = items.reduce((sum, item) => sum + (item.priceKHR || 0) * item.qty, 0);
  const paidKHR = parseInt(paidAmountKHR, 10) || 0;
  const paidUSDcents = Math.round((paidKHR / exchangeRateKHR) * 100);
  const changeKHR = Math.max(0, paidKHR - totalKHR);
  const changeUSDcents = Math.round((changeKHR / exchangeRateKHR) * 100);
  
  // Quick amounts in KHR
  const quickAmountsKHR = [
    { label: t(language, 'payment.exactAmount'), value: totalKHR },
    { label: '៛5,000', value: 5000 },
    { label: '៛10,000', value: 10000 },
    { label: '៛20,000', value: 20000 },
    { label: '៛50,000', value: 50000 },
    { label: '៛100,000', value: 100000 },
  ];
  
  const handleHold = async () => {
    if (items.length === 0) return;
    
    const heldCart: HeldCart = {
      id: crypto.randomUUID(),
      items: [...items],
      createdAt: new Date().toISOString(),
    };
    
    await saveHeldCart(heldCart);
    addHeldCart(heldCart);
    clearCart();
  };
  
  const handleShowHeldCarts = async () => {
    const carts = await getHeldCarts();
    setHeldCarts(carts);
    setShowHeldCarts(true);
  };
  
  const handleResumeCart = (cart: HeldCart) => {
    setCart(cart.items);
    setShowHeldCarts(false);
  };
  
  const handleStartPayment = () => {
    setPaidAmountKHR('');
    setPaymentMethod('cash');
    setError('');
    setCompletedInvoice(null);
    setShowPayment(true);
  };
  
  const handleCancelPayment = () => {
    setShowPayment(false);
    setPaidAmountKHR('');
    setPaymentMethod('cash');
    setError('');
  };
  
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
        subtotalUSDcents: subtotal,
        totalUSDcents: subtotal,
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
      
      setCompletedInvoice(invoice);
      setCompletedInvoiceItems(invoiceItems); // Store items for offline invoice view

      if (printSettings.autoPrintInvoice) {
        setTimeout(() => {
          void handlePrintInvoiceWithData(invoice, invoiceItems);
        }, 250);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };
  
  const handleNewSale = () => {
    setCompletedInvoice(null);
    setCompletedInvoiceItems([]);
    setShowInlineInvoice(false);
    setShowPayment(false);
    setPaidAmountKHR('');
    setPaymentMethod('cash');
  };
  
  const handleViewInvoice = async () => {
    if (!completedInvoice) return;
    
    // If offline, show inline invoice view
    if (!navigator.onLine) {
      // Load the invoice items from local DB if not already loaded
      if (completedInvoiceItems.length === 0) {
        const localData = await getLocalInvoice(completedInvoice.id);
        if (localData) {
          setCompletedInvoiceItems(localData.items);
        }
      }
      setShowInlineInvoice(true);
    } else {
      // Online - open in new tab as before
      window.open(`/invoice/${completedInvoice.id}`, '_blank');
    }
  };
  
  const handlePrintInvoice = async () => {
    if (!completedInvoice) return;

    let itemsForPrint = completedInvoiceItems;
    if (itemsForPrint.length === 0) {
      const localData = await getLocalInvoice(completedInvoice.id);
      if (localData) {
        itemsForPrint = localData.items;
        setCompletedInvoiceItems(localData.items);
      }
    }

    await handlePrintInvoiceWithData(completedInvoice, itemsForPrint);
  };

  const handlePrintInvoiceWithData = async (invoice: LocalInvoice, itemsForPrint: LocalInvoiceItem[]) => {
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const shouldTryEscPos = isAndroid || printSettings.receiptPrintMode === 'escpos-intent';

    if (shouldTryEscPos) {
      console.log('[POS] Attempting ESC/POS Intent print...');
      const result = await printInvoiceViaEscPosIntent(invoice, itemsForPrint, { paperSize: printSettings.receiptPaperSize });
      if (result.success) {
        console.log('[POS] ESC/POS Intent launched successfully');
        return;
      }
      console.warn('[POS] ESC/POS Intent failed:', result.error);
      const message = result.error || 'ESC/POS print failed';
      alert(`ESC/POS print failed. ${message}`);
      // Fall through to browser print as fallback
    }

    // Browser fallback: If offline, show inline invoice and trigger print.
    if (!navigator.onLine) {
      console.log('[POS] Offline - showing inline invoice for print');
      setShowInlineInvoice(true);
      setTimeout(() => window.print(), 300);
      return;
    }

    // Online browser print - avoid popup blockers on mobile by using same-tab navigation.
    if (isMobile) {
      console.log('[POS] Mobile detected - navigating to invoice page for browser print fallback');
      window.location.href = `/invoice/${invoice.id}`;
      return;
    }

    console.log('[POS] Opening invoice in new tab for browser print');
    const printWindow = window.open(`/invoice/${invoice.id}`, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        setTimeout(() => printWindow.print(), 500);
      };
    } else {
      console.error('[POS] Failed to open print window');
      window.location.href = `/invoice/${invoice.id}`;
    }
  };
  
  const handleBackFromInvoice = () => {
    setShowInlineInvoice(false);
  };
  
  // Inline Invoice View (for offline viewing/printing)
  if (completedInvoice && showInlineInvoice) {
    const dailySequence = getDailySequenceFromInvoiceNo(completedInvoice.invoiceNo);

    return (
      <>
        {/* Print-only styles for offline invoice */}
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
          {/* Header - hidden when printing */}
          <div className="no-print p-3 border-b flex items-center justify-between bg-gray-50">
            <Button variant="outline" onClick={handleBackFromInvoice} className="text-sm">
              ← {t(language, 'common.back')}
            </Button>
            <Button variant="primary" onClick={() => window.print()} className="text-sm">
              {t(language, 'invoice.print')}
            </Button>
          </div>
          
          {/* Invoice Content - optimized for receipt printing */}
          <div className="flex-1 overflow-auto p-4">
            <div id="offline-invoice-print" className="max-w-[80mm] mx-auto bg-white">
              {/* Shop Header with App Icon */}
              <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <img src="/favicon.svg" alt="Logo" className="w-8 h-8" />
                  <h1 className="text-xl font-bold text-gray-900">{t(language, 'app.name')}</h1>
                </div>
                <p className="text-4xl font-black tracking-tight text-gray-900 leading-none">#{dailySequence}</p>
                <p className="text-sm text-gray-600">{t(language, 'invoice.receipt')}</p>
              </div>
            
            {/* Invoice Info */}
            <div className="text-sm mb-4 space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">{t(language, 'invoice.invoiceNo')}:</span>
                <span className="font-mono font-bold">{completedInvoice.invoiceNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t(language, 'invoice.date')}:</span>
                <span>{formatDateTime(completedInvoice.createdAt, language)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t(language, 'invoice.cashier')}:</span>
                <span>{completedInvoice.cashierName}</span>
              </div>
              {completedInvoice.paymentMethod === 'bank' && (
                <div className="flex justify-between">
                  <span className="text-gray-600">{language === 'km' ? 'វិធីបង់ប្រាក់' : 'Payment'}:</span>
                  <span className="text-red-600 font-medium">{language === 'km' ? 'ធនាគារ' : 'Bank'}</span>
                </div>
              )}
            </div>
            
            {/* Items */}
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
                  {completedInvoiceItems.map((item) => (
                    <tr key={item.id}>
                      <td className="py-1">{item.nameSnapshot.split(' / ')[0] || item.nameSnapshot}</td>
                      <td className="text-center py-1">{item.qty}</td>
                      <td className="text-right py-1">{formatKHR(item.lineTotalKHR)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Totals */}
            <div className="text-sm space-y-1 mb-4">
              <div className="flex justify-between">
                <span>{t(language, 'invoice.subtotal')}:</span>
                <span>{formatKHR(completedInvoice.subtotalKHR)}</span>
              </div>
              <div className="flex justify-between font-bold text-base">
                <span>{t(language, 'invoice.total')}:</span>
                <span>{formatKHR(completedInvoice.totalKHR)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t(language, 'invoice.paid')}:</span>
                <span>{formatKHR(completedInvoice.paidKHR)}</span>
              </div>
              {completedInvoice.paymentMethod !== 'bank' && (
                <div className="flex justify-between font-bold text-primary-600">
                  <span>{t(language, 'invoice.change')}:</span>
                  <span>{formatKHR(completedInvoice.changeKHR)}</span>
                </div>
              )}
            </div>
            
            {/* Footer */}
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
  
  // Payment Success Screen (inline in cart area)
  if (completedInvoice) {
    const dailySequence = getDailySequenceFromInvoiceNo(completedInvoice.invoiceNo);

    return (
      <div className="flex flex-col h-full glass-panel">
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">{t(language, 'common.success')}!</h3>
          <p className="text-gray-600 mb-6">{t(language, 'invoice.thankYou')}</p>
          
          {/* Invoice Summary */}
          <div className="w-full bg-gray-50 rounded-2xl p-4 mb-6">
            <p className="text-sm text-gray-500 mb-1">{language === 'km' ? 'លេខរៀងថ្ងៃនេះ' : 'Daily Sequence'}</p>
            <p className="font-black text-4xl leading-none mb-3">#{dailySequence}</p>
            <p className="text-sm text-gray-500 mb-1">{t(language, 'invoice.invoiceNo')}</p>
            <p className="font-mono font-bold text-lg mb-2">{completedInvoice.invoiceNo}</p>
            
            {/* Bank payment badge */}
            {completedInvoice.paymentMethod === 'bank' && (
              <div className="mb-3 inline-flex items-center gap-1.5 bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                {language === 'km' ? 'បង់តាមធនាគារ' : 'Bank Payment'}
              </div>
            )}
            
            {/* Total & Change in two columns */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-primary-500 rounded-xl p-3 text-white text-center">
                <p className="text-xs text-primary-100">{t(language, 'invoice.total')}</p>
                <p className="text-xl font-bold">{formatKHR(completedInvoice.totalKHR)}</p>
              </div>
              {completedInvoice.paymentMethod === 'bank' ? (
                <div className="bg-red-500 rounded-xl p-3 text-white text-center">
                  <p className="text-xs text-red-100">{language === 'km' ? 'វិធីបង់ប្រាក់' : 'Payment'}</p>
                  <p className="text-xl font-bold">{language === 'km' ? 'ធនាគារ' : 'Bank'}</p>
                </div>
              ) : (
                <div className="bg-blue-500 rounded-xl p-3 text-white text-center">
                  <p className="text-xs text-blue-100">{t(language, 'invoice.change')}</p>
                  <p className="text-xl font-bold">{formatKHR(completedInvoice.changeKHR)}</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="w-full space-y-3">
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleViewInvoice} className="flex-1">
                {language === 'km' ? 'មើល' : 'View'}
              </Button>
              <Button variant="secondary" onClick={handlePrintInvoice} className="flex-1">
                {t(language, 'invoice.print')}
              </Button>
            </div>
            <Button variant="success" onClick={handleNewSale} className="w-full btn-lg">
              {t(language, 'invoice.newSale')}
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  // Payment Screen (inline in cart area)
  if (showPayment) {
    return (
      <div className="flex flex-col h-full glass-panel">
        {/* Header */}
        <div className="p-4 border-b border-white/30">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">{t(language, 'payment.title')}</h2>
            <button
              onClick={handleCancelPayment}
              aria-label={language === 'km' ? 'បិទការបង់ប្រាក់' : 'Close payment'}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded-xl transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Payment Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Total Due & Change in two columns */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-4 text-white shadow-lg">
              <p className="text-xs font-medium text-primary-100 uppercase tracking-wide">
                {language === 'km' ? 'សរុបត្រូវបង់' : 'Total Due'}
              </p>
              <p className="text-2xl font-bold mt-1">{formatKHR(totalKHR)}</p>
              <p className="text-sm text-primary-100">{formatUSD(subtotal)}</p>
            </div>
            
            {/* Change box - using blue */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg">
              <p className="text-xs font-medium text-blue-100 uppercase tracking-wide">
                {language === 'km' ? 'ប្រាក់អាប់' : 'Change'}
              </p>
              <p className="text-2xl font-bold mt-1">{formatKHR(changeKHR)}</p>
              <p className="text-sm text-blue-100">{formatUSD(changeUSDcents)}</p>
            </div>
          </div>
          
          {/* Cash received input */}
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
          
          {/* Quick amounts */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">{t(language, 'payment.quickAmounts')}</p>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {/* Exact and Bank buttons in first row */}
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
          
          {/* Bank payment indicator */}
          {paymentMethod === 'bank' && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span>{language === 'km' ? 'បង់តាមធនាគារ/កាត - មិនមានប្រាក់អាប់' : 'Bank/Card Payment - No change given'}</span>
            </div>
          )}
          
          {/* Error message */}
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="border-t border-white/30 p-4 space-y-3 bg-white/30 backdrop-blur-xl safe-bottom">
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleCancelPayment} className="flex-1">
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
  
  // Regular Cart View
  return (
    <div className="flex flex-col h-full glass-panel">
      {/* Header */}
      <div className="p-5 border-b border-white/30">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{t(language, 'pos.cart')}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShowHeldCarts}
              className="relative flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-white/50 rounded-xl transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className="hidden sm:inline">{t(language, 'pos.heldCarts')}</span>
              {heldCarts.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center px-1.5 text-xs font-bold text-white bg-red-500 rounded-full shadow-sm">
                  {heldCarts.length}
                </span>
              )}
            </button>
            {showCloseButton && (
              <button
                onClick={onClose}
                aria-label={language === 'km' ? 'បិទកន្រ្តក' : 'Close cart'}
                className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded-xl transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Cart items */}
      <div className="flex-1 overflow-y-auto p-5">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <svg className="w-20 h-20 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-lg font-medium">{t(language, 'pos.emptyCart')}</p>
            <p className="text-sm mt-1">{t(language, 'pos.addItems')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <CartItem key={item.productId} item={item} />
            ))}
          </div>
        )}
      </div>
      
      {/* Footer with totals and actions */}
      <div className="border-t border-white/30 p-5 space-y-4 bg-white/30 backdrop-blur-xl safe-bottom">
        {/* Total Due & Items Count - Two column boxes */}
        {items.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-4 text-white shadow-lg shadow-primary-500/20">
              <p className="text-xs font-medium text-primary-100 uppercase tracking-wide">
                {language === 'km' ? 'សរុបត្រូវបង់' : 'Total Due'}
              </p>
              <p className="text-2xl font-bold mt-1">{formatKHR(totalKHR)}</p>
              <p className="text-sm text-primary-100">{formatUSD(subtotal)}</p>
            </div>
            
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg shadow-blue-500/20">
              <p className="text-xs font-medium text-blue-100 uppercase tracking-wide">
                {language === 'km' ? 'ចំនួនមុខទំនិញ' : 'Items'}
              </p>
              <p className="text-2xl font-bold mt-1">
                {items.reduce((sum, item) => sum + item.qty, 0)}
              </p>
              <p className="text-sm text-blue-100">
                {items.length} {language === 'km' ? 'ផលិតផល' : 'products'}
              </p>
            </div>
          </div>
        )}
        
        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={clearCart}
            disabled={items.length === 0}
            className="btn btn-secondary"
          >
            {t(language, 'pos.clear')}
          </button>
          <button
            onClick={handleHold}
            disabled={items.length === 0}
            className="btn btn-outline"
          >
            {t(language, 'pos.hold')}
          </button>
        </div>
        <button
          onClick={handleStartPayment}
          disabled={items.length === 0}
          className="btn btn-success btn-lg w-full text-lg"
        >
          {t(language, 'pos.pay')} {items.length > 0 && formatKHR(totalKHR)}
        </button>
      </div>
      
      {/* Held Carts Modal */}
      <HeldCartsModal
        isOpen={showHeldCarts}
        onClose={() => setShowHeldCarts(false)}
        onResumeCart={handleResumeCart}
      />
    </div>
  );
}
