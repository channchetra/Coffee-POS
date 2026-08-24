import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore, useLanguageStore } from '../../lib/store';
import { LanguageToggle } from './LanguageToggle';
import { SyncStatus } from './SyncStatus';
import { setLanguage as setDbLanguage } from '../../lib/client/db';
import { t } from '../../i18n';

interface HeaderProps {
  showLogout?: boolean;
  showSync?: boolean;
  /** Show the fullscreen toggle (POS screens on tablets) */
  showFullscreen?: boolean;
  /** Extra controls rendered right after the logo & name (POS: search + categories) */
  leftSlot?: React.ReactNode;
}

/** Shared icon-only button style */
const iconBtn =
  'flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-gray-600 hover:text-gray-900 hover:bg-white/60 transition-colors active:scale-95';

export function Header({ showLogout = true, showSync = true, showFullscreen = false, leftSlot }: HeaderProps) {
  const { user, setUser, isOnline } = useAuthStore();
  const { language } = useLanguageStore();
  const [mounted, setMounted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Avoid hydration mismatch for online/offline status
  useEffect(() => {
    setMounted(true);
  }, []);

  // Track fullscreen state (with WebKit prefix for older Android WebViews)
  useEffect(() => {
    if (!mounted) return;
    const onChange = () => {
      setIsFullscreen(!!(document.fullscreenElement || (document as any).webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange as any);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange as any);
    };
  }, [mounted]);

  // Close hamburger menu on outside tap
  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [menuOpen]);

  // Fullscreen API is not available on all browsers (e.g. iOS Safari)
  const fullscreenSupported = mounted && !!(
    document.fullscreenEnabled || (document as any).webkitFullscreenEnabled
  );

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else {
          await (document as any).webkitExitFullscreen();
        }
      } else {
        const el = document.documentElement as any;
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else {
          await el.webkitRequestFullscreen();
        }
      }
    } catch (err) {
      console.error('Fullscreen toggle failed:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore errors
    }
    setUser(null);
    localStorage.removeItem('auth-storage');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const onlineLabel = mounted ? (isOnline ? t(language, 'app.online') : t(language, 'app.offline')) : t(language, 'app.offline');

  return (
    <header className="header-glass px-3 md:px-6 py-2.5 md:py-3">
      <div className="flex items-center justify-between gap-2">
        {/* Logo, name & POS controls (search / categories) */}
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0 min-w-0">
          <img src="/favicon.svg" alt="Logo" className="w-8 h-8 md:w-10 md:h-10 shrink-0" />
          <div className="hidden md:block shrink-0">
            <h1 className="text-base lg:text-lg font-bold text-gray-900 leading-tight">
              {t(language, 'app.name')}
            </h1>
            {user && (
              <p className="text-xs lg:text-sm text-gray-500 leading-tight">
                {user.username}
                <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded-full ml-1.5 uppercase">
                  {user.role}
                </span>
              </p>
            )}
          </div>
          {leftSlot && <div className="flex items-center gap-1.5 md:gap-2 min-w-0">{leftSlot}</div>}
        </div>

        {/* Right side: icon-only menu on md+, hamburger dropdown on small screens */}
        <div className="flex items-center gap-1 md:gap-1.5 flex-shrink-0">
          {/* md+: icon-only controls */}
          <div className="hidden md:flex items-center gap-1">
            <div className="flex items-center justify-center px-2 py-2" title={onlineLabel}>
              <span className={`status-dot ${mounted && isOnline ? 'status-online' : 'status-offline'}`} />
            </div>

            {showSync && <SyncStatus variant="icon" />}

            <LanguageToggle variant="icon" />

            {showFullscreen && fullscreenSupported && (
              <button
                onClick={toggleFullscreen}
                className={iconBtn}
                title={isFullscreen
                  ? (language === 'km' ? 'ចាកចេញពីអេក្រង់ពេញ' : 'Exit fullscreen')
                  : (language === 'km' ? 'អេក្រង់ពេញ' : 'Fullscreen')}
                aria-label={isFullscreen
                  ? (language === 'km' ? 'ចាកចេញពីអេក្រង់ពេញ' : 'Exit fullscreen')
                  : (language === 'km' ? 'អេក្រង់ពេញ' : 'Enter fullscreen')}
              >
                {isFullscreen ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V6a2 2 0 012-2h2M16 4h2a2 2 0 012 2v2M20 16v2a2 2 0 01-2 2h-2M8 20H6a2 2 0 01-2-2v-2" />
                  </svg>
                )}
              </button>
            )}

            {user?.role === 'admin' && (
              <a
                href="/admin"
                className={iconBtn}
                title={language === 'km' ? 'គ្រប់គ្រង' : 'Admin'}
                aria-label={language === 'km' ? 'គ្រប់គ្រង' : 'Admin'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </a>
            )}

            {showLogout && user && (
              <button
                onClick={handleLogout}
                className={iconBtn}
                title={t(language, 'auth.logout')}
                aria-label={t(language, 'auth.logout')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            )}
          </div>

          {/* Small screens: hamburger */}
          <div ref={menuRef} className="relative md:hidden">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className={iconBtn}
              aria-label={t(language, 'common.menu')}
              title={t(language, 'common.menu')}
            >
              {menuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl shadow-gray-900/15 border border-white/60 p-2 z-50 animate-slideUp">
                {/* User card */}
                {user && (
                  <div className="px-3.5 py-3 rounded-xl bg-gradient-to-r from-primary-50 to-orange-50 mb-1">
                    <p className="font-semibold text-gray-900 text-sm">{user.username}</p>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{user.role}</p>
                  </div>
                )}

                {showSync && <SyncStatus />}

                <button
                  onClick={async () => {
                    const newLang = language === 'en' ? 'km' : 'en';
                    useLanguageStore.getState().setLanguage(newLang);
                    await setDbLanguage(newLang);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  {t(language, 'common.language')}
                  <span className="ml-auto text-xs text-gray-400">EN / ខ្មែរ</span>
                </button>

                {showFullscreen && fullscreenSupported && (
                  <button
                    onClick={() => { toggleFullscreen(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V6a2 2 0 012-2h2M16 4h2a2 2 0 012 2v2M20 16v2a2 2 0 01-2 2h-2M8 20H6a2 2 0 01-2-2v-2" />
                    </svg>
                    {isFullscreen
                      ? (language === 'km' ? 'ចាកចេញពីអេក្រង់ពេញ' : 'Exit fullscreen')
                      : (language === 'km' ? 'អេក្រង់ពេញ' : 'Fullscreen')}
                  </button>
                )}

                {user?.role === 'admin' && (
                  <a
                    href="/admin"
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {language === 'km' ? 'គ្រប់គ្រង' : 'Admin'}
                  </a>
                )}

                <div className="my-1 border-t border-gray-100" />

                <button
                  onClick={() => { setMenuOpen(false); handleLogout(); }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors text-left"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  {t(language, 'auth.logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
