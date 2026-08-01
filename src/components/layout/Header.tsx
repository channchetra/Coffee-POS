import React, { useState, useEffect } from 'react';
import { useAuthStore, useLanguageStore } from '../../lib/store';
import { LanguageToggle } from './LanguageToggle';
import { SyncStatus } from './SyncStatus';
import { t } from '../../i18n';

interface HeaderProps {
  showLogout?: boolean;
  showSync?: boolean;
  /** Show the fullscreen toggle (POS screens on tablets) */
  showFullscreen?: boolean;
}

export function Header({ showLogout = true, showSync = true, showFullscreen = false }: HeaderProps) {
  const { user, setUser, isOnline } = useAuthStore();
  const { language } = useLanguageStore();
  const [mounted, setMounted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
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
  
  return (
    <header className="header-glass px-3 md:px-6 py-3 md:py-4">
      <div className="flex items-center justify-between gap-2">
        {/* Logo & Title - compact on mobile */}
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          <img src="/favicon.svg" alt="Logo" className="w-8 h-8 md:w-10 md:h-10" />
          <div className="hidden sm:block">
            <h1 className="text-base md:text-lg font-bold text-gray-900">{t(language, 'app.name')}</h1>
            {user && (
              <p className="text-xs md:text-sm text-gray-500">
                {user.username} <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded-full">{user.role}</span>
              </p>
            )}
          </div>
        </div>
        
        {/* Right side - scrollable on mobile */}
        <div className="flex items-center gap-2 md:gap-3 overflow-x-auto scrollbar-hide">
          {/* Online/Offline indicator - icon only on mobile */}
          <div className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-2 bg-white/50 backdrop-blur-sm rounded-full border border-white/30 flex-shrink-0">
            <span className={`status-dot ${mounted && isOnline ? 'status-online' : 'status-offline'}`} />
            <span className="hidden md:inline text-sm font-medium text-gray-600">
              {mounted ? (isOnline ? t(language, 'app.online') : t(language, 'app.offline')) : t(language, 'app.offline')}
            </span>
          </div>
          
          {showSync && <SyncStatus />}
          
          <LanguageToggle />
          
          {/* Fullscreen toggle - POS tablets */}
          {showFullscreen && fullscreenSupported && (
            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-2 px-2.5 md:px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-white/50 rounded-xl transition-colors flex-shrink-0"
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
              <span className="hidden md:inline">
                {isFullscreen
                  ? (language === 'km' ? 'ចាកចេញ' : 'Exit')
                  : (language === 'km' ? 'ពេញអេក្រង់' : 'Fullscreen')}
              </span>
            </button>
          )}

          {/* Admin link - icon only on mobile */}
          {user?.role === 'admin' && (
            <a
              href="/admin"
              className="flex items-center gap-2 px-2.5 md:px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 rounded-xl transition-all shadow-sm flex-shrink-0"
              title={language === 'km' ? 'គ្រប់គ្រង' : 'Admin'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="hidden md:inline">{language === 'km' ? 'គ្រប់គ្រង' : 'Admin'}</span>
            </a>
          )}
          
          {/* Logout - icon only on mobile */}
          {showLogout && user && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-2.5 md:px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-white/50 rounded-xl transition-colors flex-shrink-0"
              title={t(language, 'auth.logout')}
            >
              <svg className="w-4 h-4 md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden md:inline">{t(language, 'auth.logout')}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
