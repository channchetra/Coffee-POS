import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useHeldCartsStore, useAuthStore, useLanguageStore } from '../../lib/store';
import { deleteHeldCart, updateHeldCart, type HeldCart } from '../../lib/client/db';
import { formatUSD, formatKHR, usdToKHR } from '../../lib/utils/currency';
import { formatRelativeTime } from '../../lib/utils/format';
import { t } from '../../i18n';

interface HeldCartsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResumeCart: (cart: HeldCart) => void;
}

export function HeldCartsModal({ isOpen, onClose, onResumeCart }: HeldCartsModalProps) {
  const { heldCarts, removeHeldCart, updateHeldCartInStore } = useHeldCartsStore();
  const { exchangeRateKHR } = useAuthStore();
  const { language } = useLanguageStore();
  const [editingCartId, setEditingCartId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');
  
  const handleDelete = async (cartId: string) => {
    await deleteHeldCart(cartId);
    removeHeldCart(cartId);
  };
  
  const handleResume = async (cart: HeldCart) => {
    await deleteHeldCart(cart.id);
    removeHeldCart(cart.id);
    onResumeCart(cart);
  };
  
  const handleEditNote = (cart: HeldCart) => {
    setEditingCartId(cart.id);
    setEditNote(cart.label || '');
  };
  
  const handleSaveNote = async (cartId: string) => {
    const cart = heldCarts.find(c => c.id === cartId);
    if (!cart) return;
    
    const updatedCart = { ...cart, label: editNote.trim() || undefined };
    await updateHeldCart(updatedCart);
    updateHeldCartInStore(updatedCart);
    setEditingCartId(null);
    setEditNote('');
  };
  
  const handleCancelEdit = () => {
    setEditingCartId(null);
    setEditNote('');
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
                  <div className="flex-1">
                    {/* Cart Label/Note - Editable */}
                    {editingCartId === cart.id ? (
                      <div className="mb-2">
                        <input
                          type="text"
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          placeholder={language === 'km' ? 'បន្ថែមកំណត់ចំណាំ...' : 'Add note...'}
                          className="input input-sm w-full mb-2"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveNote(cart.id);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveNote(cart.id)}
                            className="text-xs px-2 py-1 bg-primary-500 text-white rounded hover:bg-primary-600"
                          >
                            {t(language, 'common.save')}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                          >
                            {t(language, 'common.cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-2">
                        {cart.label ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-100 text-primary-700 rounded-lg font-medium text-sm">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                              </svg>
                              {cart.label}
                            </span>
                            <button
                              onClick={() => handleEditNote(cart)}
                              className="p-1 text-gray-400 hover:text-primary-600 rounded"
                              title={language === 'km' ? 'កែសម្រួល' : 'Edit'}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditNote(cart)}
                            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            {language === 'km' ? 'បន្ថែមកំណត់ចំណាំ' : 'Add note'}
                          </button>
                        )}
                      </div>
                    )}
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
