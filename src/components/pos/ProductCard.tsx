import React from 'react';
import type { Product } from '../../lib/client/db';
import { formatUSD, formatKHR } from '../../lib/utils/currency';
import { useLanguageStore } from '../../lib/store';

interface ProductCardProps {
  product: Product;
  selectedCount: number;
  onSelect: (product: Product) => void;
}

export function ProductCard({ product, selectedCount, onSelect }: ProductCardProps) {
  const { language } = useLanguageStore();
  // Use priceKHR directly (source of truth) - no conversion needed
  const khrPrice = product.priceKHR || 0;
  const productName = language === 'km' ? product.nameKm : product.nameEn;
  const isSelected = selectedCount > 0;

  return (
    <button
      onClick={() => onSelect(product)}
      aria-pressed={isSelected}
      className={`product-card relative flex flex-col items-center text-center w-full transition-all duration-200 active:scale-95 ${
        isSelected
          ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-white/80 bg-primary-50/70 shadow-lg shadow-primary-500/15'
          : ''
      }`}
    >
      {isSelected && (
        <span className="absolute -top-2 -right-2 z-10 min-w-[28px] h-7 px-2 rounded-full bg-primary-600 text-white text-sm font-bold flex items-center justify-center shadow-lg shadow-primary-500/30">
          {selectedCount}
        </span>
      )}

      <div className="relative w-20 h-20 md:w-24 md:h-24 mb-3 rounded-2xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center shadow-inner">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={productName}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
        {isSelected && (
          <span className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-md">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </span>
        )}
      </div>

      <h3 className="font-semibold text-gray-900 text-sm md:text-base mb-1.5 line-clamp-2 leading-tight">
        {productName}
      </h3>
      <div className="space-y-0.5">
        {/* KHR as PRIMARY */}
        <p className="text-lg md:text-xl font-bold text-primary-600">
          {formatKHR(khrPrice)}
        </p>
        <p className="text-xs md:text-sm text-gray-500">
          {formatUSD(product.priceUSDcents)}
        </p>
      </div>
    </button>
  );
}
