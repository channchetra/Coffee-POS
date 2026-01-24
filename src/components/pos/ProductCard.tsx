import React from 'react';
import type { Product } from '../../lib/client/db';
import { formatUSD, formatKHR, usdToKHR } from '../../lib/utils/currency';
import { useAuthStore, useLanguageStore } from '../../lib/store';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export function ProductCard({ product, onSelect }: ProductCardProps) {
  const { exchangeRateKHR } = useAuthStore();
  const { language } = useLanguageStore();
  const khrPrice = usdToKHR(product.priceUSDcents, exchangeRateKHR);
  
  // Get translated product name
  const productName = language === 'km' ? product.nameKm : product.nameEn;
  
  return (
    <button
      onClick={() => onSelect(product)}
      className="product-card flex flex-col items-center text-center w-full"
    >
      <div className="w-20 h-20 md:w-24 md:h-24 mb-3 rounded-2xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center shadow-inner">
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
