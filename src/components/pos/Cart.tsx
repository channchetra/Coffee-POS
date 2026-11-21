import React, { useEffect, useState } from 'react';
import { CartItem } from './CartItem';
import { CartPaymentScreen } from './CartPaymentScreen';
import { CartReceipt } from './CartReceipt';
import { HeldCartsModal } from './HeldCartsModal';
import { useCartStore, useHeldCartsStore, useLanguageStore } from '../../lib/store';
import { formatUSD, formatKHR } from '../../lib/utils/currency';
import {
  saveHeldCart,
  getHeldCarts,
  type HeldCart,
  type LocalInvoice,
  type LocalInvoiceItem,
} from '../../lib/client/db';
import { t } from '../../i18n';

interface CartProps {
  onClose?: () => void;
  showCloseButton?: boolean;
}

export function Cart({ onClose, showCloseButton }: CartProps) {
  const { items, getSubtotal, clearCart, setCart } = useCartStore();
  const { heldCarts, setHeldCarts, addHeldCart } = useHeldCartsStore();
  const { language } = useLanguageStore();
  const [showPayment, setShowPayment] = useState(false);
  const [showHeldCarts, setShowHeldCarts] = useState(false);
  const [completedInvoice, setCompletedInvoice] = useState<LocalInvoice | null>(null);
  const [completedInvoiceItems, setCompletedInvoiceItems] = useState<LocalInvoiceItem[]>([]);

  useEffect(() => {
    const loadHeldCarts = async () => {
      const carts = await getHeldCarts();
      setHeldCarts(carts);
    };
    loadHeldCarts();
  }, [setHeldCarts]);

  const subtotal = getSubtotal();
  const totalKHR = items.reduce((sum, item) => sum + (item.priceKHR || 0) * item.qty, 0);

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

  const handlePaymentComplete = (invoice: LocalInvoice, invoiceItems: LocalInvoiceItem[]) => {
    setCompletedInvoice(invoice);
    setCompletedInvoiceItems(invoiceItems);
    setShowPayment(false);
  };

  const handleNewSale = () => {
    setCompletedInvoice(null);
    setCompletedInvoiceItems([]);
    setShowPayment(false);
  };

  if (completedInvoice) {
    return (
      <CartReceipt
        invoice={completedInvoice}
        items={completedInvoiceItems}
        onNewSale={handleNewSale}
      />
    );
  }

  if (showPayment) {
    return (
      <CartPaymentScreen
        items={items}
        subtotalUSDcents={subtotal}
        totalKHR={totalKHR}
        onCancel={() => setShowPayment(false)}
        onComplete={handlePaymentComplete}
      />
    );
  }

  return (
    <div className="flex flex-col h-full glass-panel">
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

      <div className="border-t border-white/30 p-5 space-y-4 bg-white/30 backdrop-blur-xl safe-bottom">
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
          onClick={() => setShowPayment(true)}
          disabled={items.length === 0}
          className="btn btn-success btn-lg w-full text-lg"
        >
          {t(language, 'pos.pay')} {items.length > 0 && formatKHR(totalKHR)}
        </button>
      </div>

      <HeldCartsModal
        isOpen={showHeldCarts}
        onClose={() => setShowHeldCarts(false)}
        onResumeCart={handleResumeCart}
      />
    </div>
  );
}
