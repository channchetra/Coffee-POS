import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { login, setCurrentUser } from '../../lib/client/auth';
import { useAuthStore, useLanguageStore } from '../../lib/store';
import { getExchangeRate, setExchangeRate as setDbExchangeRate } from '../../lib/client/db';
import { formatExchangeRate } from '../../lib/utils/currency';
import { t } from '../../i18n';
import { LanguageToggle } from '../layout/LanguageToggle';

export function LoginForm() {
  const { setUser, setExchangeRate, isOnline, setOnline } = useAuthStore();
  const { language } = useLanguageStore();
  
  const [step, setStep] = useState<'login' | 'exchangeRate'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<{ id: string; username: string; role: string } | null>(null);
  
  const [exchangeRateInput, setExchangeRateInput] = useState('4100');
  const [recommendedRate, setRecommendedRate] = useState<number | null>(null);
  const [fetchingRate, setFetchingRate] = useState(false);
  
  // Get redirect URL from query params or localStorage
  const getRedirectUrl = () => {
    if (typeof window === 'undefined') return '/pos';
    
    // Check URL params first
    const params = new URLSearchParams(window.location.search);
    const redirectParam = params.get('redirect');
    if (redirectParam) return redirectParam;
    
    // Check localStorage
    const stored = localStorage.getItem('redirectAfterLogin');
    if (stored) {
      localStorage.removeItem('redirectAfterLogin');
      return stored;
    }
    
    return '/pos';
  };
  
  useEffect(() => {
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
  
  useEffect(() => {
    // Load last exchange rate from local storage
    const loadRate = async () => {
      const rate = await getExchangeRate();
      setExchangeRateInput(rate.toString());
    };
    loadRate();
  }, []);
  
  useEffect(() => {
    // Fetch recommended rate from server when online
    if (step === 'exchangeRate' && isOnline) {
      setFetchingRate(true);
      fetch('/api/settings')
        .then(res => res.json())
        .then(data => {
          if (data.defaultExchangeRateKHR) {
            setRecommendedRate(data.defaultExchangeRateKHR);
          }
        })
        .catch(() => {})
        .finally(() => setFetchingRate(false));
    }
  }, [step, isOnline]);
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const result = await login(username, password);
      
      if (!result.success) {
        setError(result.error || t(language, 'auth.invalidCredentials'));
        return;
      }
      
      if (result.user) {
        setCurrentUser(result.user);
        setUser(result.user);
        setLoggedInUser(result.user);
        setStep('exchangeRate');
      }
    } catch (err) {
      setError(t(language, 'auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };
  
  const handleConfirmRate = async () => {
    const rate = parseInt(exchangeRateInput, 10);
    if (isNaN(rate) || rate <= 0) {
      setError('Invalid exchange rate');
      return;
    }
    
    await setDbExchangeRate(rate);
    setExchangeRate(rate);
    
    // Get redirect URL
    let redirectUrl = getRedirectUrl();
    
    // If user is not admin but trying to access admin, redirect to POS
    if (loggedInUser?.role !== 'admin' && redirectUrl.startsWith('/admin')) {
      redirectUrl = '/pos';
    }
    
    // Redirect
    window.location.href = redirectUrl;
  };
  
  const handleUseRecommended = () => {
    if (recommendedRate) {
      setExchangeRateInput(recommendedRate.toString());
    }
  };
  
  if (step === 'exchangeRate') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-orange-50 to-amber-50 p-6">
        <div className="card p-8 w-full max-w-md animate-slideUp">
          <div className="text-center mb-8">
            <img src="/favicon.svg" alt="Logo" className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">{t(language, 'auth.setExchangeRate')}</h1>
            <p className="text-gray-500 mt-2">Start of shift configuration</p>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t(language, 'auth.exchangeRateLabel')}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">1 USD =</span>
                <input
                  type="number"
                  value={exchangeRateInput}
                  onChange={(e) => setExchangeRateInput(e.target.value)}
                  className="input input-lg pl-24 pr-16 text-right text-xl font-bold"
                  min="1"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">៛</span>
              </div>
              <p className="mt-2 text-center text-gray-600">
                {formatExchangeRate(parseInt(exchangeRateInput, 10) || 0)}
              </p>
            </div>
            
            {fetchingRate && (
              <p className="text-center text-gray-500 text-sm">{t(language, 'auth.fetchingRate')}</p>
            )}
            
            {recommendedRate && (
              <button
                onClick={handleUseRecommended}
                className="w-full py-3 px-4 bg-blue-50/80 backdrop-blur-sm hover:bg-blue-100 text-blue-700 rounded-2xl transition-colors flex items-center justify-center gap-2 border border-blue-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t(language, 'auth.useRecommended')}: ៛{recommendedRate.toLocaleString()}
              </button>
            )}
            
            {error && (
              <div className="bg-red-50/80 backdrop-blur-sm text-red-700 px-4 py-3 rounded-2xl text-center border border-red-100">
                {error}
              </div>
            )}
            
            <Button
              variant="success"
              size="lg"
              onClick={handleConfirmRate}
              className="w-full"
            >
              {t(language, 'auth.confirmRate')}
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
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
          <span className={`status-dot ${isOnline ? 'status-online' : 'status-offline'}`} />
          <span className="text-sm text-gray-600">
            {isOnline ? t(language, 'app.online') : t(language, 'app.offline')}
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
            {isOnline ? t(language, 'auth.loginButton') : t(language, 'auth.loginOffline')}
          </Button>
        </form>
        
        <p className="mt-6 text-center text-sm text-gray-500">
          {isOnline 
            ? 'First login requires internet connection'
            : 'Offline mode - using cached credentials'}
        </p>
      </div>
    </div>
  );
}
