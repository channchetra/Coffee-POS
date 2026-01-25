import React from 'react';
import type { CartItem as CartItemType } from '../../lib/client/db';
import { formatUSD, formatKHR } from '../../lib/utils/currency';
import { useCartStore, useLanguageStore } from '../../lib/store';

interface CartItemProps {
  item: CartItemType;
}

export function CartItem({ item }: CartItemProps) {
  const { language } = useLanguageStore();
  const { updateQuantity, removeItem } = useCartStore();
  
  const lineTotal = item.priceUSDcents * item.qty;
  // Use priceKHR directly (source of truth) - no conversion needed
  const unitPriceKHR = item.priceKHR || 0;
  const lineTotalKHR = unitPriceKHR * item.qty;
  
  // Get translated item name
  const itemName = language === 'km' ? item.nameKm : item.nameEn;
  
  return (
    <div className="cart-item flex-col gap-2 p-3">
      {/* Row 1: Item name and price */}
      <div className="flex items-center justify-between w-full">
        <h4 className="font-medium text-gray-900 truncate flex-1 mr-2">{itemName}</h4>
        <div className="text-right flex-shrink-0">
          <p className="font-bold text-gray-900">{formatKHR(lineTotalKHR)}</p>
          <p className="text-xs text-gray-500">{formatUSD(lineTotal)}</p>
        </div>
      </div>
      
      {/* Row 2: Quantity controls with remove button */}
      <div className="flex items-center justify-between w-full">
        <p className="text-sm text-gray-500">
          {formatKHR(unitPriceKHR)} × {item.qty}
        </p>
        
        <div className="flex items-center gap-2">
          {/* Remove button */}
          <button
            onClick={() => removeItem(item.productId)}
            className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50/80 rounded-xl transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          
          {/* Quantity controls */}
          <button
            onClick={() => updateQuantity(item.productId, item.qty - 1)}
            className="qty-btn w-9 h-9 text-base bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-white border border-gray-200/50"
          >
            −
          </button>
          <span className="w-8 text-center font-bold">{item.qty}</span>
          <button
            onClick={() => updateQuantity(item.productId, item.qty + 1)}
            className="qty-btn w-9 h-9 text-base bg-primary-100/80 backdrop-blur-sm text-primary-700 hover:bg-primary-200 border border-primary-200/50"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
