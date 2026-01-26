import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { login, setCurrentUser } from '../../lib/client/auth';
import { useAuthStore, useLanguageStore } from '../../lib/store';
import { setExchangeRate as setDbExchangeRate } from '../../lib/client/db';
import { t } from '../../i18n';
import { LanguageToggle } from '../layout/LanguageToggle';

export function LoginForm() {
  const { setUser, setExchangeRate, isOnline, setOnline } = useAuthStore();
  const { language } = useLanguageStore();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Get redirect URL from query params or localStorage
  const getRedirectUrl = (userRole: string) => {
    if (typeof window === 'undefined') return '/pos';
    
    // Check URL params first
    const params = new URLSearchParams(window.location.search);
    const redirectParam = params.get('redirect');
    
    // Check localStorage
    const stored = localStorage.getItem('redirectAfterLogin');
    if (stored) {
      localStorage.removeItem('redirectAfterLogin');
    }
    
    let targetUrl = redirectParam || stored || '/pos';
    
    // If user is not admin but trying to access admin, redirect to POS
    if (userRole !== 'admin' && targetUrl.startsWith('/admin')) {
      targetUrl = '/pos';
    }
    
    return targetUrl;
  };
  
  // Fetch exchange rate from settings and apply it
  const fetchAndApplyExchangeRate = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        const rate = data.defaultExchangeRateKHR || 4000;
        await setDbExchangeRate(rate);
        setExchangeRate(rate);
      }
    } catch {
      // Use default rate if fetch fails
      setExchangeRate(4000);
    }
  };
  
  useEffect(() => {
    // Set mounted for hydration safety
    setMounted(true);
    
    // Set initial online state
    setOnline(navigator.onLine);
    
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline]);
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const result = await login(username, password, rememberMe);
      
      if (!result.success) {
        setError(result.error || t(language, 'auth.invalidCredentials'));
        return;
      }
      
      if (result.user) {
        setCurrentUser(result.user, rememberMe);
        setUser(result.user);
        
        // Fetch and apply exchange rate from settings
        await fetchAndApplyExchangeRate();
        
        // Redirect to appropriate page
        window.location.href = getRedirectUrl(result.user.role);
      }
    } catch (err) {
      setError(t(language, 'auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-orange-50 to-amber-50 p-6 relative">
      {/* Language toggle in corner */}
      <div className="absolute top-6 right-6">
        <LanguageToggle />
      </div>
      
      <div className="card p-8 w-full max-w-md animate-slideUp">
        <div className="text-center mb-8">
          <img src="/favicon.svg" alt="Logo" className="w-20 h-20 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900">{t(language, 'app.name')}</h1>
          <p className="text-gray-500 mt-2">{t(language, 'auth.login')}</p>
        </div>
        
        {/* Online/Offline indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className={`status-dot ${mounted && isOnline ? 'status-online' : 'status-offline'}`} />
          <span className="text-sm text-gray-600">
            {mounted ? (isOnline ? t(language, 'app.online') : t(language, 'app.offline')) : t(language, 'app.offline')}
          </span>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <Input
            label={t(language, 'auth.username')}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            inputSize="lg"
            required
            autoComplete="username"
          />
          
          <Input
            label={t(language, 'auth.password')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            inputSize="lg"
            required
            autoComplete="current-password"
          />
          
          {/* Remember Me Checkbox */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-5 h-5 rounded-lg border-gray-300 text-primary-500 focus:ring-primary-500 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-gray-700">{t(language, 'auth.rememberMe')}</span>
          </label>
          
          {error && (
            <div className="bg-red-50/80 backdrop-blur-sm text-red-700 px-4 py-3 rounded-2xl text-center border border-red-100">
              {error}
            </div>
          )}
          
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            className="w-full"
          >
            {mounted && isOnline ? t(language, 'auth.loginButton') : t(language, 'auth.loginOffline')}
          </Button>
        </form>
        
        <p className="mt-6 text-center text-sm text-gray-500">
          {mounted && isOnline 
            ? (rememberMe ? 'Stay logged in for 30 days' : 'Session expires when browser closes')
            : 'Offline mode - using cached credentials'}
        </p>
      </div>
    </div>
  );
}
