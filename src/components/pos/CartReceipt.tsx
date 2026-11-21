import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { OfflineReceiptView } from './OfflineReceiptView';
import { useLanguageStore } from '../../lib/store';
import { formatKHR } from '../../lib/utils/currency';
import {
  getLocalInvoice,
  type LocalInvoice,
  type LocalInvoiceItem,
} from '../../lib/client/db';
import {
  getDailySequenceFromInvoiceNo,
  printInvoiceViaEscPosIntent,
  type ReceiptPaperSize,
  type ReceiptPrintStyle,
  type ReceiptPrintMode,
} from '../../lib/client/printing';
import { t } from '../../i18n';

interface ReceiptSettings {
  autoPrintInvoice: boolean;
  receiptPrintMode: ReceiptPrintMode;
  receiptPaperSize: ReceiptPaperSize;
  receiptCopies: 1 | 2;
  receiptStyle: ReceiptPrintStyle;
}

const DEFAULT_SETTINGS: ReceiptSettings = {
  autoPrintInvoice: false,
  receiptPrintMode: 'browser',
  receiptPaperSize: '58mm',
  receiptCopies: 1,
  receiptStyle: 'normal',
};

async function fetchReceiptSettings(): Promise<ReceiptSettings | null> {
  try {
    const response = await fetch('/api/settings', {
      cache: 'no-store',
      credentials: 'include',
    });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      autoPrintInvoice: !!data.autoPrintInvoice,
      receiptPrintMode: data.receiptPrintMode === 'escpos-intent' ? 'escpos-intent' : 'browser',
      receiptPaperSize: data.receiptPaperSize === '80mm' ? '80mm' : '58mm',
      receiptCopies: data.receiptCopies === 2 ? 2 : 1,
      receiptStyle: ['compact', 'normal', 'large'].includes(data.receiptStyle)
        ? data.receiptStyle
        : 'normal',
    };
  } catch {
    return null;
  }
}

type PrintOutcome = 'printed' | 'inline' | 'navigated' | 'opened';

async function printInvoiceWithSettings(
  invoice: LocalInvoice,
  itemsForPrint: LocalInvoiceItem[],
  settings: ReceiptSettings,
): Promise<PrintOutcome> {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (settings.receiptPrintMode === 'escpos-intent') {
    console.log('[POS] Attempting ESC/POS Intent print...');
    const result = await printInvoiceViaEscPosIntent(invoice, itemsForPrint, {
      paperSize: settings.receiptPaperSize,
      copies: settings.receiptCopies,
      style: settings.receiptStyle,
    });
    if (result.success) {
      console.log('[POS] ESC/POS Intent launched successfully');
      return 'printed';
    }
    console.warn('[POS] ESC/POS Intent failed:', result.error);
    alert(`ESC/POS print failed. ${result.error || 'ESC/POS print failed'}`);
  }

  if (!navigator.onLine) {
    console.log('[POS] Offline - showing inline invoice for print');
    return 'inline';
  }

  if (isMobile) {
    console.log('[POS] Mobile detected - navigating to invoice page for browser print fallback');
    window.location.href = `/invoice/${invoice.id}`;
    return 'navigated';
  }

  console.log('[POS] Opening invoice in new tab for browser print');
  const printWindow = window.open(`/invoice/${invoice.id}`, '_blank');
  if (!printWindow) {
    console.error('[POS] Failed to open print window');
    window.location.href = `/invoice/${invoice.id}`;
    return 'navigated';
  }

  printWindow.onload = () => {
    setTimeout(() => printWindow.print(), 500);
  };
  return 'opened';
}

interface CartReceiptProps {
  invoice: LocalInvoice;
  items: LocalInvoiceItem[];
  onNewSale: () => void;
}

export function CartReceipt({ invoice, items, onNewSale }: CartReceiptProps) {
  const { language } = useLanguageStore();
  const [showInlineInvoice, setShowInlineInvoice] = useState(false);
  const [printSettings, setPrintSettings] = useState<ReceiptSettings>(DEFAULT_SETTINGS);
  const [receiptItems, setReceiptItems] = useState<LocalInvoiceItem[]>(items);
  const autoPrintStarted = useRef(false);
  const dailySequence = getDailySequenceFromInvoiceNo(invoice.invoiceNo);

  useEffect(() => {
    setReceiptItems(items);
  }, [items]);

  useEffect(() => {
    if (autoPrintStarted.current) return;
    autoPrintStarted.current = true;
    let cancelled = false;

    const autoPrint = async () => {
      const settings = await fetchReceiptSettings();
      if (!settings || cancelled) return;
      setPrintSettings(settings);
      if (!settings.autoPrintInvoice) return;

      const outcome = await printInvoiceWithSettings(invoice, receiptItems, settings);
      if (outcome === 'inline' && !cancelled) {
        setShowInlineInvoice(true);
        setTimeout(() => window.print(), 300);
      }
    };

    void autoPrint();
    return () => {
      cancelled = true;
    };
  }, [invoice.id]);

  const handleViewInvoice = async () => {
    if (!navigator.onLine) {
      if (receiptItems.length === 0) {
        const localData = await getLocalInvoice(invoice.id);
        if (localData) {
          setReceiptItems(localData.items);
        }
      }
      setShowInlineInvoice(true);
      return;
    }

    window.open(`/invoice/${invoice.id}`, '_blank');
  };

  const handlePrintInvoiceWithData = async (
    targetInvoice: LocalInvoice,
    itemsForPrint: LocalInvoiceItem[],
  ) => {
    const settings = (await fetchReceiptSettings()) ?? printSettings;
    setPrintSettings(settings);
    const outcome = await printInvoiceWithSettings(targetInvoice, itemsForPrint, settings);
    if (outcome === 'inline') {
      setShowInlineInvoice(true);
      setTimeout(() => window.print(), 300);
    }
  };

  const handlePrintInvoice = async () => {
    let itemsForPrint = receiptItems;
    if (itemsForPrint.length === 0) {
      const localData = await getLocalInvoice(invoice.id);
      if (localData) {
        itemsForPrint = localData.items;
        setReceiptItems(localData.items);
      }
    }

    await handlePrintInvoiceWithData(invoice, itemsForPrint);
  };

  if (showInlineInvoice) {
    return (
      <OfflineReceiptView
        invoice={invoice}
        items={receiptItems}
        dailySequence={dailySequence}
        onBack={() => setShowInlineInvoice(false)}
      />
    );
  }

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

        <div className="w-full bg-gray-50 rounded-2xl p-4 mb-6">
          <p className="text-sm text-gray-500 mb-1">{language === 'km' ? 'លេខរៀងថ្ងៃនេះ' : 'Daily Sequence'}</p>
          <p className="font-black text-4xl leading-none mb-3">#{dailySequence}</p>
          <p className="text-sm text-gray-500 mb-1">{t(language, 'invoice.invoiceNo')}</p>
          <p className="font-mono font-bold text-lg mb-2">{invoice.invoiceNo}</p>

          {invoice.paymentMethod === 'bank' && (
            <div className="mb-3 inline-flex items-center gap-1.5 bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              {language === 'km' ? 'បង់តាមធនាគារ' : 'Bank Payment'}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-primary-500 rounded-xl p-3 text-white text-center">
              <p className="text-xs text-primary-100">{t(language, 'invoice.total')}</p>
              <p className="text-xl font-bold">{formatKHR(invoice.totalKHR)}</p>
            </div>
            {invoice.paymentMethod === 'bank' ? (
              <div className="bg-red-500 rounded-xl p-3 text-white text-center">
                <p className="text-xs text-red-100">{language === 'km' ? 'វិធីបង់ប្រាក់' : 'Payment'}</p>
                <p className="text-xl font-bold">{language === 'km' ? 'ធនាគារ' : 'Bank'}</p>
              </div>
            ) : (
              <div className="bg-blue-500 rounded-xl p-3 text-white text-center">
                <p className="text-xs text-blue-100">{t(language, 'invoice.change')}</p>
                <p className="text-xl font-bold">{formatKHR(invoice.changeKHR)}</p>
              </div>
            )}
          </div>
        </div>

        <div className="w-full space-y-3">
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleViewInvoice} className="flex-1">
              {language === 'km' ? 'មើល' : 'View'}
            </Button>
            <Button variant="secondary" onClick={handlePrintInvoice} className="flex-1">
              {t(language, 'invoice.print')}
            </Button>
          </div>
          <Button variant="success" onClick={onNewSale} className="w-full btn-lg">
            {t(language, 'invoice.newSale')}
          </Button>
        </div>
      </div>
    </div>
  );
}
