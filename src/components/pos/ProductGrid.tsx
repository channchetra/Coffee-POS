import React, { useEffect } from 'react';
import { ProductCard } from './ProductCard';
import { useProductsStore, useCartStore, useLanguageStore } from '../../lib/store';
import { getCachedProducts, cacheProducts, type Product } from '../../lib/client/db';
import { t } from '../../i18n';

export function ProductGrid() {
  const { products, searchQuery, setSearchQuery, setProducts, getFilteredProducts } = useProductsStore();
  const { items, addItem } = useCartStore();
  const { language } = useLanguageStore();

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch('/api/products', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load products');
        const data = await res.json();
        if (!Array.isArray(data.products)) throw new Error('Invalid products response');
        setProducts(data.products);
        await cacheProducts(data.products);
      } catch {
        // Offline or API failure - always fall back to the cached catalogue.
        const cached = await getCachedProducts();
        setProducts(cached);
      }
    };

    loadData();
  }, [setProducts]);

  const handleProductSelect = (product: Product) => {
    addItem(product);
  };

  const filteredProducts = getFilteredProducts();
  const isFiltering = !!searchQuery;
  const selectedCounts = items.reduce<Record<string, number>>((counts, item) => {
    counts[item.productId] = (counts[item.productId] ?? 0) + item.qty;
    return counts;
  }, {});

  return (
    <div className="flex flex-col h-full">
      {/* Product grid */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <svg className="w-20 h-20 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-lg font-medium">{t(language, 'pos.noResults')}</p>
            {isFiltering && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 text-sm font-medium text-primary-600 hover:text-primary-700 bg-primary-50 px-4 py-2 rounded-full transition-colors"
              >
                {t(language, 'pos.clearSearch')}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-5 lg:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                selectedCount={selectedCounts[product.id] ?? 0}
                onSelect={handleProductSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
