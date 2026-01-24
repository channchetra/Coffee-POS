import React, { useState } from 'react';
import { CartItem } from './CartItem';
import { PaymentModal } from './PaymentModal';
import { HeldCartsModal } from './HeldCartsModal';
import { useCartStore, useAuthStore, useHeldCartsStore, useLanguageStore } from '../../lib/store';
import { formatUSD, formatKHR, usdToKHR } from '../../lib/utils/currency';
import { saveHeldCart, getHeldCarts, type HeldCart } from '../../lib/client/db';
import { t } from '../../i18n';

interface CartProps {
  onClose?: () => void;
  showCloseButton?: boolean;
}

export function Cart({ onClose, showCloseButton }: CartProps) {
  const { items, getSubtotal, clearCart, setCart } = useCartStore();
  const { exchangeRateKHR } = useAuthStore();
  const { setHeldCarts, addHeldCart } = useHeldCartsStore();
  const { language } = useLanguageStore();
  const [showPayment, setShowPayment] = useState(false);
  const [showHeldCarts, setShowHeldCarts] = useState(false);
  
  const subtotal = getSubtotal();
  const subtotalKHR = usdToKHR(subtotal, exchangeRateKHR);
  
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
  
  return (
    <div className="flex flex-col h-full glass-panel">
      {/* Header */}
      <div className="p-5 border-b border-white/30">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{t(language, 'pos.cart')}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShowHeldCarts}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-white/50 rounded-xl transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className="hidden sm:inline">{t(language, 'pos.heldCarts')}</span>
            </button>
            {showCloseButton && (
              <button
                onClick={onClose}
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
        {/* Subtotal - KHR PRIMARY */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600">{t(language, 'pos.subtotal')}</span>
          <div className="text-right">
            <span className="text-xl font-bold text-gray-900">{formatKHR(subtotalKHR)}</span>
            <span className="block text-sm text-gray-500">{formatUSD(subtotal)}</span>
          </div>
        </div>
        
        {/* Total - KHR PRIMARY */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200/50">
          <span className="text-lg font-semibold text-gray-900">{t(language, 'pos.total')}</span>
          <div className="text-right">
            <span className="text-2xl font-bold text-primary-600">{formatKHR(subtotalKHR)}</span>
            <span className="block text-sm text-gray-500">{formatUSD(subtotal)}</span>
          </div>
        </div>
        
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
          onClick={() => setShowPayment(true)}
          disabled={items.length === 0}
          className="btn btn-success btn-lg w-full"
        >
          {t(language, 'pos.pay')} {items.length > 0 && formatKHR(subtotalKHR)}
        </button>
      </div>
      
      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        totalUSDcents={subtotal}
      />
      
      {/* Held Carts Modal */}
      <HeldCartsModal
        isOpen={showHeldCarts}
        onClose={() => setShowHeldCarts(false)}
        onResumeCart={handleResumeCart}
      />
    </div>
  );
}
