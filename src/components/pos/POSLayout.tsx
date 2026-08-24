import React, { useEffect, useState } from 'react';
import { Header } from '../layout/Header';
import { ProductGrid } from './ProductGrid';
import { Cart } from './Cart';
import { CategoryFilter } from './CategoryFilter';
import { SearchBar } from './SearchBar';
import { useAuthStore, useCartStore, useProductsStore, useLanguageStore } from '../../lib/store';
import { t } from '../../i18n';

export function POSLayout() {
  const { setOnline } = useAuthStore();
  const { items } = useCartStore();
  const { searchQuery, setSearchQuery, setSelectedCategory } = useProductsStore();
  const { language } = useLanguageStore();
  const [showCart, setShowCart] = useState(false);
  const [searchMode, setSearchMode] = useState(false);

  useEffect(() => {
    // Listen for online/offline events
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial state
    setOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline]);

  const cartItemCount = items.reduce((sum, item) => sum + item.qty, 0);

  // Enter search mode: the whole header becomes a search bar and the product
  // grid below filters live. Reset the category filter so search covers all.
  const enterSearchMode = () => {
    setSelectedCategory(null);
    setSearchMode(true);
  };

  // Exit search mode: back to normal header, clear the query
  const exitSearchMode = () => {
    setSearchQuery('');
    setSearchMode(false);
  };

  // Icon-only search button + category filter, placed next to logo & name
  const headerLeftSlot = (
    <>
      <button
        onClick={enterSearchMode}
        className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-95 ${
          searchQuery
            ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md shadow-primary-500/25'
            : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
        }`}
        title={t(language, 'pos.search')}
        aria-label={t(language, 'pos.search')}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </button>

      <CategoryFilter />
    </>
  );

  return (
    <div className="h-screen supports-[height:100dvh]:h-[100dvh] flex flex-col overflow-hidden bg-gradient-to-br from-slate-100 via-gray-50 to-stone-100 bg-pattern">
      {/* Search mode replaces the whole header with a search bar */}
      {searchMode ? (
        <SearchBar onExit={exitSearchMode} />
      ) : (
        <Header showFullscreen leftSlot={headerLeftSlot} />
      )}

      <div className="flex-1 flex overflow-hidden relative">
        {/* Products panel */}
        <div className={`flex-1 overflow-hidden transition-all duration-300 ${showCart ? 'hidden lg:block' : 'block'}`}>
          <ProductGrid />
        </div>

        {/* Cart panel - Desktop: side panel, Mobile: full screen overlay */}
        <div className={`
          fixed inset-0 top-[52px] lg:relative lg:inset-auto lg:top-0
          w-full lg:w-[420px] xl:w-[480px] 
          overflow-hidden
          transition-transform duration-300 ease-out
          ${showCart ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
          z-40 lg:z-auto
        `}>
          <Cart onClose={() => setShowCart(false)} showCloseButton={showCart} />
        </div>

        {/* Mobile cart toggle button */}
        <button
          onClick={() => setShowCart(true)}
          className="lg:hidden fixed bottom-6 right-6 z-30 w-16 h-16 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-2xl shadow-xl shadow-primary-500/30 flex items-center justify-center active:scale-95 transition-transform"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {cartItemCount > 0 && (
            <span className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white text-sm font-bold rounded-full flex items-center justify-center shadow-lg">
              {cartItemCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
