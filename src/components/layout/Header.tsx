import React from 'react';
import { useAuthStore, useLanguageStore } from '../../lib/store';
import { LanguageToggle } from './LanguageToggle';
import { SyncStatus } from './SyncStatus';
import { t } from '../../i18n';

interface HeaderProps {
  showLogout?: boolean;
  showSync?: boolean;
}

export function Header({ showLogout = true, showSync = true }: HeaderProps) {
  const { user, setUser, isOnline } = useAuthStore();
  const { language } = useLanguageStore();
  
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore errors
    }
    setUser(null);
    localStorage.removeItem('auth-storage');
    window.location.href = '/login';
  };
  
  return (
    <header className="header-glass px-4 md:px-6 py-4 pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" alt="Logo" className="w-10 h-10" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">{t(language, 'app.name')}</h1>
            {user && (
              <p className="text-sm text-gray-500">
                {user.username} <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{user.role}</span>
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Online/Offline indicator */}
          <div className="flex items-center gap-2 px-4 py-2 bg-white/50 backdrop-blur-sm rounded-full border border-white/30">
            <span className={`status-dot ${isOnline ? 'status-online' : 'status-offline'}`} />
            <span className="text-sm font-medium text-gray-600">
              {isOnline ? t(language, 'app.online') : t(language, 'app.offline')}
            </span>
          </div>
          
          {showSync && <SyncStatus />}
          
          <LanguageToggle />
          
          {/* Admin link - only show for admin users */}
          {user?.role === 'admin' && (
            <a
              href="/admin"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 rounded-xl transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {language === 'km' ? 'គ្រប់គ្រង' : 'Admin'}
            </a>
          )}
          
          {showLogout && user && (
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-white/50 rounded-xl transition-colors"
            >
              {t(language, 'auth.logout')}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
