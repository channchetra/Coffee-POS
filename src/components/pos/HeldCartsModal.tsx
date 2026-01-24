import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useHeldCartsStore, useAuthStore, useLanguageStore } from '../../lib/store';
import { deleteHeldCart, type HeldCart } from '../../lib/client/db';
import { formatUSD, formatKHR, usdToKHR } from '../../lib/utils/currency';
import { formatRelativeTime } from '../../lib/utils/format';
import { t } from '../../i18n';

interface HeldCartsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResumeCart: (cart: HeldCart) => void;
}

export function HeldCartsModal({ isOpen, onClose, onResumeCart }: HeldCartsModalProps) {
  const { heldCarts, removeHeldCart } = useHeldCartsStore();
  const { exchangeRateKHR } = useAuthStore();
  const { language } = useLanguageStore();
  
  const handleDelete = async (cartId: string) => {
    await deleteHeldCart(cartId);
    removeHeldCart(cartId);
  };
  
  const handleResume = async (cart: HeldCart) => {
    await deleteHeldCart(cart.id);
    removeHeldCart(cart.id);
    onResumeCart(cart);
  };
  
  const getCartTotal = (cart: HeldCart): number => {
    return cart.items.reduce((sum, item) => sum + item.priceUSDcents * item.qty, 0);
  };
  
  const getCartItemCount = (cart: HeldCart): number => {
    return cart.items.reduce((sum, item) => sum + item.qty, 0);
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t(language, 'pos.heldCarts')} size="lg">
      <div className="space-y-4">
        {heldCarts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-lg">{t(language, 'pos.noHeldCarts')}</p>
          </div>
        ) : (
          heldCarts.map((cart) => {
            const total = getCartTotal(cart);
            const totalKHR = usdToKHR(total, exchangeRateKHR);
            const itemCount = getCartItemCount(cart);
            
            return (
              <div key={cart.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {itemCount} {itemCount === 1 ? t(language, 'pos.item') : t(language, 'pos.items')}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatRelativeTime(cart.createdAt, language)}
                    </p>
                  </div>
                  <div className="text-right">
                    {/* KHR PRIMARY */}
                    <p className="font-bold text-lg text-primary-600">{formatKHR(totalKHR)}</p>
                    <p className="text-sm text-gray-500">{formatUSD(total)}</p>
                  </div>
                </div>
                
                {/* Items preview */}
                <div className="text-sm text-gray-600 mb-3">
                  {cart.items.slice(0, 3).map((item, i) => (
                    <span key={item.productId}>
                      {language === 'km' ? item.nameKm : item.nameEn} ×{item.qty}
                      {i < Math.min(cart.items.length, 3) - 1 && ', '}
                    </span>
                  ))}
                  {cart.items.length > 3 && (
                    <span className="text-gray-400"> +{cart.items.length - 3} {language === 'km' ? 'ទៀត' : 'more'}</span>
                  )}
                </div>
                
                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(cart.id)}
                    className="flex-1"
                  >
                    {t(language, 'pos.delete')}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleResume(cart)}
                    className="flex-1"
                  >
                    {t(language, 'pos.resume')}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
}
