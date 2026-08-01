import React, { useEffect, useState, useRef } from 'react';
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
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    const loadData = async () => {
      // Try to fetch products from server
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/categories')
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
  
  // Focus search input when mobile search opens
  useEffect(() => {
    if (showMobileSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showMobileSearch]);
  
  return (
    <div className="flex flex-col h-full">
      {/* Desktop Search - hidden on mobile */}
      <div className="hidden md:block p-4 md:p-6 glass-panel border-b border-white/30">
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
      
      {/* Mobile Search Popup */}
      {showMobileSearch && (
        <div className="md:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-4 animate-slideUp">
            <div className="relative">
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
                ref={searchInputRef}
                type="text"
                placeholder={t(language, 'pos.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-12 pr-12"
              />
              <button
                onClick={() => setShowMobileSearch(false)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setShowMobileSearch(false);
                }}
                className="mt-3 w-full py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                {language === 'km' ? 'សម្អាតការស្វែងរក' : 'Clear search'}
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Category filters with search icon on mobile */}
      <div className="px-3 md:px-6 py-3 md:py-4 glass-panel border-b border-white/30 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 md:gap-3 items-center">
          {/* Mobile search button */}
          <button
            onClick={() => setShowMobileSearch(true)}
            className={`md:hidden flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl transition-all ${
              searchQuery 
                ? 'bg-primary-500 text-white' 
                : 'bg-white/70 text-gray-600 border border-white/50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          
          {categoryOptions.map((cat) => (
            <button
              key={cat.key || 'all'}
              onClick={() => setSelectedCategory(cat.key)}
              className={`category-chip whitespace-nowrap text-sm px-3 py-2 md:px-5 md:py-2.5 ${
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
