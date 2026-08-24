import React from 'react';
import { useLanguageStore } from '../../lib/store';
import { languageNames, type Language } from '../../i18n';
import { setLanguage as setDbLanguage } from '../../lib/client/db';

interface LanguageToggleProps {
  /** 'full': icon + language name (default) • 'icon': icon only (top menu) */
  variant?: 'full' | 'icon';
}

export function LanguageToggle({ variant = 'full' }: LanguageToggleProps) {
  const { language, setLanguage } = useLanguageStore();

  const handleToggle = async () => {
    const newLang: Language = language === 'en' ? 'km' : 'en';
    setLanguage(newLang);
    await setDbLanguage(newLang);
  };

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center ${
        variant === 'full'
          ? 'gap-2 px-4 py-2 bg-white/50 backdrop-blur-sm hover:bg-white/80 rounded-xl transition-colors border border-white/30'
          : 'justify-center w-10 h-10 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-white/60 transition-colors active:scale-95 flex-shrink-0'
      }`}
      title={language === 'km' ? 'ភាសា' : 'Language'}
      aria-label={language === 'km' ? 'ភាសា' : 'Language'}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
      </svg>
      {variant === 'full' && (
        <span className={`text-sm font-medium text-gray-700 ${language === 'km' ? 'font-khmer' : ''}`}>
          {languageNames[language]}
        </span>
      )}
    </button>
  );
}
