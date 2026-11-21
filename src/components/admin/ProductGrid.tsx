import React from 'react';
import { useLanguageStore } from '../../lib/store';
import { formatUSD, formatKHR } from '../../lib/utils/currency';
import { t } from '../../i18n';
import type { Product, Category } from './product-types';

interface ProductGridProps {
  products: Product[];
  categories: Category[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

export function ProductGrid({ products, categories, onEdit, onDelete }: ProductGridProps) {
  const { language } = useLanguageStore();
  const getProductName = (product: Product) => (language === 'km' ? product.nameKm : product.nameEn);
  const getCategoryName = (slug: string) => {
    const cat = categories.find((item) => item.slug === slug);
    if (!cat) return slug.replace('_', ' ');
    return language === 'km' ? cat.nameKm : cat.nameEn;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
      {products.length === 0 ? (
        <div className="col-span-full card p-8 text-center text-gray-400">
          {language === 'km' ? 'មិនមានផលិតផល' : 'No products found'}
        </div>
      ) : (
        products.map((product) => (
          <div key={product.id} className="card p-3 md:p-4">
            <div className="w-full h-24 md:h-32 bg-gray-100 rounded-xl mb-2 md:mb-3 overflow-hidden">
              {product.imageUrl ? (
                <>
                  <img src={product.imageUrl} alt={getProductName(product)} className="w-full h-full object-cover" /> {/* desloppify:ignore IMG_NO_ALT */}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <svg className="w-10 h-10 md:w-12 md:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
            {/* Row 1: Name and Price */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-gray-900 text-sm truncate">{getProductName(product)}</h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(product.categories && product.categories.length > 0 ? product.categories : [product.category]).map((slug) => (
                    <span key={slug} className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {getCategoryName(slug)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-primary-600 text-sm">{formatKHR(product.priceKHR || 0)}</p>
                <p className="text-xs text-gray-500">{formatUSD(product.priceUSDcents)}</p>
              </div>
            </div>
            {/* Row 2: Actions */}
            <div className="flex justify-end gap-1 mt-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => onEdit(product)}
                className="p-2.5 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-xl transition-colors"
                title={t(language, 'common.edit')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => onDelete(product.id)}
                className="p-2.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
                title={t(language, 'common.delete')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))
      )}
    </div>

  );
}
