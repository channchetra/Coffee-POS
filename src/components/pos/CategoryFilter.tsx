import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useProductsStore, useLanguageStore } from '../../lib/store';
import { t } from '../../i18n';

interface Category {
  id: string;
  nameEn: string;
  nameKm: string;
  slug: string;
  sortOrder: number;
}

const CACHED_CATEGORIES_KEY = 'cached-categories';

/**
 * Category filter for the top menu.
 * - <= 5 categories: inline chips (tablet/desktop)
 * - > 5 categories: dropdown menu triggered from a button
 */
export function CategoryFilter() {
  const { selectedCategory, setSelectedCategory } = useProductsStore();
  const { language } = useLanguageStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await fetch('/api/categories');
        if (res.ok) {
          const data = await res.json();
          setCategories(data.categories || []);
          localStorage.setItem(CACHED_CATEGORIES_KEY, JSON.stringify(data.categories || []));
        } else {
          loadFromCache();
        }
      } catch {
        loadFromCache();
      }
    };
    loadCategories();
  }, []);

  const loadFromCache = () => {
    try {
      const raw = localStorage.getItem(CACHED_CATEGORIES_KEY);
      if (raw) setCategories(JSON.parse(raw));
    } catch {
      // ignore
    }
  };

  // Close dropdown on outside tap/click
  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [open]);

  const labelOf = useCallback(
    (c: Category) => (language === 'km' ? c.nameKm : c.nameEn),
    [language],
  );

  const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const allLabel = t(language, 'pos.allCategories');

  // Label for the dropdown button, always in the active language
  const currentLabelLocalized = selectedCategory
    ? (() => {
        const cat = sorted.find((c) => c.slug === selectedCategory);
        return cat ? labelOf(cat) : selectedCategory;
      })()
    : allLabel;

  const renderChips = () => (
    <div className="hidden md:flex gap-2 items-center overflow-x-auto scrollbar-hide max-w-[36vw] xl:max-w-[44vw]">
      <button
        onClick={() => setSelectedCategory(null)}
        className={`category-chip whitespace-nowrap text-xs lg:text-sm px-3.5 lg:px-5 py-2 shrink-0 ${
          selectedCategory === null ? 'category-chip-active' : 'category-chip-inactive'
        }`}
      >
        {allLabel}
      </button>
      {sorted.map((cat) => (
        <button
          key={cat.slug}
          onClick={() => setSelectedCategory(cat.slug)}
          className={`category-chip whitespace-nowrap text-xs lg:text-sm px-3.5 lg:px-5 py-2 shrink-0 ${
            selectedCategory === cat.slug ? 'category-chip-active' : 'category-chip-inactive'
          }`}
        >
          {labelOf(cat)}
        </button>
      ))}
    </div>
  );

  const renderDropdown = () => (
    <div ref={dropdownRef} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 md:gap-2 px-3 py-2 md:px-4 rounded-xl text-sm font-medium transition-all active:scale-95 shadow-sm border ${
          open || selectedCategory
            ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white border-transparent shadow-primary-500/25'
            : 'bg-white/70 backdrop-blur-sm text-gray-600 hover:bg-white border-white/50'
        }`}
        title={t(language, 'pos.categories')}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18l-7 8v6l-4 2v-8L3 4z" />
        </svg>
        <span className="max-w-[80px] lg:max-w-[140px] truncate">
          {currentLabelLocalized}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 w-56 max-h-[70vh] overflow-y-auto bg-white rounded-2xl shadow-2xl shadow-gray-900/15 border border-white/50 p-1.5 animate-slideUp">
          <button
            onClick={() => { setSelectedCategory(null); setOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm text-left transition-colors ${
              selectedCategory === null ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            {allLabel}
          </button>
          <div className="my-1 border-t border-gray-100" />
          {sorted.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => { setSelectedCategory(cat.slug); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm text-left transition-colors ${
                selectedCategory === cat.slug ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2zm0 0v2m8-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2" />
              </svg>
              <span className="truncate">{labelOf(cat)}</span>
              {selectedCategory === cat.slug && (
                <svg className="w-4 h-4 ml-auto text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // On small screens there is no room for inline chips: always use dropdown
  if (sorted.length <= 5) {
    return (
      <>
        <div className="md:contents">{renderChips()}</div>
        <div className="md:hidden">{renderDropdown()}</div>
      </>
    );
  }

  return renderDropdown();
}
