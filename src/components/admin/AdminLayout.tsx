import React, { useEffect, useState } from 'react';
import { Header } from '../layout/Header';
import { useAuthStore, useLanguageStore } from '../../lib/store';
import { t } from '../../i18n';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, setOnline, setUser } = useAuthStore();
  const { language } = useLanguageStore();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Load sidebar collapsed state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('admin-sidebar-collapsed');
    if (stored === 'true') {
      setSidebarCollapsed(true);
    }
  }, []);
  
  const toggleSidebarCollapse = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('admin-sidebar-collapsed', String(newState));
  };
  
  useEffect(() => {
    // Listen for online/offline events
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    setOnline(navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline]);
  
  // Check if user is admin
  useEffect(() => {
    const redirectToLogin = () => {
      localStorage.setItem('redirectAfterLogin', window.location.pathname);
      window.location.href = '/login';
    };

    const checkAuth = () => {
      const stored = localStorage.getItem('auth-storage');
      if (!stored) {
        redirectToLogin();
        return;
      }

      try {
        const data = JSON.parse(stored);
        const storedUser = data.state?.user;
        if (!storedUser) {
          redirectToLogin();
          return;
        }

        setUser(storedUser);
        if (storedUser.role !== 'admin') {
          window.location.href = '/pos';
          return;
        }

        setIsAuthorized(true);
        setIsChecking(false);
      } catch {
        redirectToLogin();
      }
    };
    
    checkAuth();
  }, [setUser]);
  
  const navItems = [ // desloppify:ignore HARDCODED_FAKE_DATA
    { href: '/admin/dashboard', label: t(language, 'admin.dashboard'), icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { href: '/admin/products', label: t(language, 'admin.products'), icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { href: '/admin/categories', label: language === 'km' ? 'ប្រភេទ' : 'Categories', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    { href: '/admin/users', label: t(language, 'admin.users'), icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { href: '/admin/settings', label: t(language, 'admin.settings'), icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  ];
  
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  
  // Show loading while checking auth
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-stone-100 flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  // Don't render if not authorized (redirect will happen)
  if (!isAuthorized) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-stone-100 bg-pattern">
      <Header showSync={false} />
      
      <div className="flex relative">
        {/* Mobile menu button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden fixed bottom-4 left-4 z-50 p-3 bg-primary-500 text-white rounded-full shadow-lg shadow-primary-500/30"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {sidebarOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
        
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        <aside className={`
          fixed lg:sticky top-0 lg:top-auto left-0 z-40
          h-screen lg:h-auto lg:min-h-[calc(100vh-57px)]
          bg-white/95 lg:bg-white/60 lg:backdrop-blur-xl border-r border-white/30
          p-3 lg:p-4
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${sidebarCollapsed ? 'w-[72px]' : 'w-64'}
        `}>
          {/* Collapse toggle button - desktop only */}
          <button
            onClick={toggleSidebarCollapse}
            className="hidden lg:flex w-full items-center justify-center p-2 mb-3 text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded-xl transition-colors"
            title={sidebarCollapsed ? 'Expand' : 'Collapse'}
          >
            <svg className={`w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
          
          <nav className="space-y-1 lg:space-y-2">
            {navItems.map((item) => {
              const isActive = currentPath === item.href;
              // On mobile drawer: always show text. On desktop: respect sidebarCollapsed
              const showText = !sidebarCollapsed || sidebarOpen;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 rounded-xl transition-all ${
                    sidebarCollapsed && !sidebarOpen
                      ? 'lg:w-11 lg:h-11 lg:justify-center lg:p-0 px-3 py-2.5' 
                      : 'px-3 lg:px-4 py-2.5 lg:py-3'
                  } ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25'
                      : 'text-gray-600 hover:bg-gray-100 lg:hover:bg-white/50 hover:text-gray-900'
                  }`}
                  title={sidebarCollapsed && !sidebarOpen ? item.label : undefined}
                >
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                  {showText && <span className="font-medium">{item.label}</span>}
                  {/* Desktop collapsed: hide text */}
                  {!showText && <span className="hidden">{item.label}</span>}
                </a>
              );
            })}
          </nav>
          
          {/* Link to POS */}
          <div className="mt-6 lg:mt-8 pt-3 lg:pt-4 border-t border-gray-200 lg:border-white/30">
            <a
              href="/pos"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 rounded-xl text-gray-600 hover:bg-gray-100 lg:hover:bg-white/50 hover:text-gray-900 transition-all ${
                sidebarCollapsed && !sidebarOpen
                  ? 'lg:w-11 lg:h-11 lg:justify-center lg:p-0 px-3 py-2.5' 
                  : 'px-3 lg:px-4 py-2.5 lg:py-3'
              }`}
              title={sidebarCollapsed && !sidebarOpen ? t(language, 'pos.title') : undefined}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              {(sidebarOpen || !sidebarCollapsed) && <span className="font-medium">{t(language, 'pos.title')}</span>}
            </a>
          </div>
        </aside>
        
        <main className={`flex-1 p-4 lg:p-6 xl:p-8 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
