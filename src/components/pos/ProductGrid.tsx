import React, { useEffect, useState } from 'react';
import { ProductCard } from './ProductCard';
import { useProductsStore, useCartStore, useLanguageStore } from '../../lib/store';
import { getCachedProducts, cacheProducts, type Product } from '../../lib/client/db';
import { t } from '../../i18n';

interface Category {
  id: string;
  nameEn: string;
  nameKm: string;
  slug: string;
  sortOrder: number;
}

export function ProductGrid() {
  const { products, searchQuery, selectedCategory, setProducts, setSearchQuery, setSelectedCategory, getFilteredProducts } = useProductsStore();
  const { addItem } = useCartStore();
  const { language } = useLanguageStore();
  const [categories, setCategories] = useState<Category[]>([]);
  
  useEffect(() => {
    const loadData = async () => {
      // Try to fetch products from server
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/admin/categories')
        ]);
        
        if (productsRes.ok) {
          const data = await productsRes.json();
          setProducts(data.products);
          await cacheProducts(data.products);
        }
        
        if (categoriesRes.ok) {
          const data = await categoriesRes.json();
          setCategories(data.categories || []);
          // Cache categories in localStorage for offline use
          localStorage.setItem('cached-categories', JSON.stringify(data.categories || []));
        }
      } catch {
        // Offline - load from cache
        const cached = await getCachedProducts();
        setProducts(cached);
        
        // Load cached categories
        const cachedCategories = localStorage.getItem('cached-categories');
        if (cachedCategories) {
          try {
            setCategories(JSON.parse(cachedCategories));
          } catch {}
        }
      }
    };
    
    loadData();
  }, [setProducts]);
  
  const handleProductSelect = (product: Product) => {
    addItem(product);
  };
  
  const filteredProducts = getFilteredProducts();
  
  // Build category list with "All" option (using translations)
  const categoryOptions = [
    { key: null as string | null, label: t(language, 'pos.allCategories') },
    ...categories.map(cat => ({ 
      key: cat.slug, 
      label: language === 'km' ? cat.nameKm : cat.nameEn 
    }))
  ];
  
  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-4 md:p-6 glass-panel border-b border-white/30">
        <div className="relative max-w-2xl">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder={t(language, 'pos.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-12"
          />
        </div>
      </div>
      
      {/* Category filters */}
      <div className="px-4 md:px-6 py-4 glass-panel border-b border-white/30 overflow-x-auto">
        <div className="flex gap-3">
          {categoryOptions.map((cat) => (
            <button
              key={cat.key || 'all'}
              onClick={() => setSelectedCategory(cat.key)}
              className={`category-chip whitespace-nowrap ${
                selectedCategory === cat.key
                  ? 'category-chip-active'
                  : 'category-chip-inactive'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Product grid */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <svg className="w-20 h-20 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-lg font-medium">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-5 lg:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={handleProductSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
