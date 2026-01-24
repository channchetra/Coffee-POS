import React from 'react';
import type { CartItem as CartItemType } from '../../lib/client/db';
import { formatUSD, formatKHR, usdToKHR } from '../../lib/utils/currency';
import { useAuthStore, useCartStore, useLanguageStore } from '../../lib/store';

interface CartItemProps {
  item: CartItemType;
}

export function CartItem({ item }: CartItemProps) {
  const { exchangeRateKHR } = useAuthStore();
  const { language } = useLanguageStore();
  const { updateQuantity, removeItem } = useCartStore();
  
  const lineTotal = item.priceUSDcents * item.qty;
  const lineTotalKHR = usdToKHR(lineTotal, exchangeRateKHR);
  
  // Get translated item name
  const itemName = language === 'km' ? item.nameKm : item.nameEn;
  
  return (
    <div className="cart-item">
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 truncate">{itemName}</h4>
        <p className="text-sm text-gray-500">
          {formatKHR(usdToKHR(item.priceUSDcents, exchangeRateKHR))} × {item.qty}
        </p>
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={() => updateQuantity(item.productId, item.qty - 1)}
          className="qty-btn bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-white border border-gray-200/50"
        >
          −
        </button>
        <span className="w-8 text-center font-bold text-lg">{item.qty}</span>
        <button
          onClick={() => updateQuantity(item.productId, item.qty + 1)}
          className="qty-btn bg-primary-100/80 backdrop-blur-sm text-primary-700 hover:bg-primary-200 border border-primary-200/50"
        >
          +
        </button>
      </div>
      
      <div className="text-right ml-3 min-w-[90px]">
        {/* KHR as PRIMARY */}
        <p className="font-bold text-gray-900">{formatKHR(lineTotalKHR)}</p>
        <p className="text-sm text-gray-500">{formatUSD(lineTotal)}</p>
      </div>
      
      <button
        onClick={() => removeItem(item.productId)}
        className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50/80 rounded-xl transition-colors ml-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}
