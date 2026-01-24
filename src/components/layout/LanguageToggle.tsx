import React from 'react';
import { useLanguageStore } from '../../lib/store';
import { languageNames, type Language } from '../../i18n';
import { setLanguage as setDbLanguage } from '../../lib/client/db';

export function LanguageToggle() {
  const { language, setLanguage } = useLanguageStore();
  
  const handleToggle = async () => {
    const newLang: Language = language === 'en' ? 'km' : 'en';
    setLanguage(newLang);
    await setDbLanguage(newLang);
  };
  
  return (
    <button
      onClick={handleToggle}
      className="flex items-center gap-2 px-4 py-2 bg-white/50 backdrop-blur-sm hover:bg-white/80 rounded-xl transition-colors border border-white/30"
      title="Switch language"
    >
      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
      </svg>
      <span className={`text-sm font-medium text-gray-700 ${language === 'km' ? 'font-khmer' : ''}`}>
        {languageNames[language]}
      </span>
    </button>
  );
}
