import React, { useEffect, useRef } from 'react';
import { useProductsStore, useLanguageStore } from '../../lib/store';
import { t } from '../../i18n';

interface SearchBarProps {
  onExit: () => void;
}

/**
 * Header search mode: replaces the whole top bar with a search input.
 * The product grid below filters live as the user types, and products can be
 * added to the cart / paid exactly like regular browsing.
 */
export function SearchBar({ onExit }: SearchBarProps) {
  const { searchQuery, setSearchQuery, getFilteredProducts } = useProductsStore();
  const { language } = useLanguageStore();
  const inputRef = useRef<HTMLInputElement>(null);

  // Autofocus when search mode opens
  useEffect(() => {
    const id = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
    return () => clearTimeout(id);
  }, []);

  // Escape exits search mode
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onExit]);

  return (
    <header className="header-glass px-3 md:px-6 py-2.5 md:py-3">
      <div className="flex items-center gap-2 md:gap-3">
        {/* Back: exit search mode (also clears the query) */}
        <button
          onClick={onExit}
          className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-gray-600 hover:text-gray-900 hover:bg-white/60 transition-colors active:scale-95"
          aria-label={t(language, 'common.back')}
          title={t(language, 'common.back')}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Centered search input */}
        <div className="relative flex-1 max-w-3xl md:mx-auto">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t(language, 'pos.search')}
            className="w-full pl-12 pr-12 py-2.5 md:py-3 text-base md:text-lg font-medium bg-white/70 backdrop-blur-sm border-2 border-transparent focus:border-primary-400 focus:bg-white rounded-2xl outline-none transition-all placeholder:text-gray-400"
            autoComplete="off"
            enterKeyHint="search"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); inputRef.current?.focus(); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
              aria-label={t(language, 'pos.clearSearch')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Live result count (md+) */}
        {searchQuery && (
          <span className="hidden md:flex items-center flex-shrink-0 px-3 py-1.5 text-sm font-medium text-primary-600 bg-primary-50 rounded-full">
            {getFilteredProducts().length} {t(language, 'pos.items')}
          </span>
        )}
      </div>
    </header>
  );
}
