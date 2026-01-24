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
