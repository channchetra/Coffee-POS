import React, { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { useLanguageStore } from '../../lib/store';
import { formatExchangeRate } from '../../lib/utils/currency';
import { t } from '../../i18n';

export function SettingsManager() {
  const { language } = useLanguageStore();
  const [exchangeRate, setExchangeRate] = useState('4100');
  const [autoPrintInvoice, setAutoPrintInvoice] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (!response.ok) throw new Error('Failed to fetch settings');
        const data = await response.json();
        setExchangeRate(data.defaultExchangeRateKHR?.toString() || '4100');
        setAutoPrintInvoice(data.autoPrintInvoice || false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading settings');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, []);
  
  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess(false);
    
    try {
      const rate = parseInt(exchangeRate, 10);
      if (isNaN(rate) || rate <= 0) {
        throw new Error('Invalid exchange rate');
      }
      
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          defaultExchangeRateKHR: rate,
          autoPrintInvoice: autoPrintInvoice
        })
      });
      
      if (!response.ok) throw new Error('Failed to save settings');
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">{t(language, 'admin.settings')}</h2>
      
      {/* Exchange Rate Setting */}
      <div className="card p-6 max-w-xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t(language, 'admin.defaultExchangeRate')}
        </h3>
        
        <p className="text-sm text-gray-500 mb-4">
          {language === 'km' 
            ? 'អត្រានេះនឹងត្រូវបានណែនាំដល់បុគ្គលិកគិតប្រាក់នៅពេលពួកគេចាប់ផ្តើមវេន។'
            : 'This rate will be suggested to cashiers when they start their shift.'}
        </p>
        
        <div className="space-y-4">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">1 USD =</span>
            <input
              type="number"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
              className="input input-lg pl-24 pr-16 text-right text-xl font-bold"
              min="1"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">៛</span>
          </div>
          
          <p className="text-center text-gray-600">
            {formatExchangeRate(parseInt(exchangeRate, 10) || 0)}
          </p>
        </div>
      </div>
      
      {/* Invoice Print Setting */}
      <div className="card p-6 max-w-xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {language === 'km' ? 'ការកំណត់វិក្កយបត្រ' : 'Invoice Settings'}
        </h3>
        
        <div className="space-y-4">
          <label className="flex items-center gap-4 p-4 bg-gray-50/50 rounded-2xl cursor-pointer hover:bg-gray-100/50 transition-colors">
            <div className="relative">
              <input
                type="checkbox"
                checked={autoPrintInvoice}
                onChange={(e) => setAutoPrintInvoice(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-14 h-8 bg-gray-300 rounded-full peer-checked:bg-primary-500 transition-colors"></div>
              <div className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform peer-checked:translate-x-6"></div>
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">
                {language === 'km' ? 'បោះពុម្ពវិក្កយបត្រដោយស្វ័យប្រវត្តិ' : 'Auto Print Invoice'}
              </p>
              <p className="text-sm text-gray-500">
                {language === 'km' 
                  ? 'បើកបង្អួចបោះពុម្ពដោយស្វ័យប្រវត្តិបន្ទាប់ពីការទូទាត់ជោគជ័យ'
                  : 'Automatically open print window after successful payment'}
              </p>
            </div>
          </label>
          
          <div className="p-4 bg-blue-50/80 rounded-2xl border border-blue-100">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm text-blue-800 font-medium">
                  {language === 'km' ? 'ព័ត៌មាន' : 'Info'}
                </p>
                <p className="text-sm text-blue-600">
                  {autoPrintInvoice 
                    ? (language === 'km' 
                        ? 'វិក្កយបត្រនឹងបើកដោយស្វ័យប្រវត្តិនៅក្នុងផ្ទាំងថ្មីសម្រាប់បោះពុម្ព។' 
                        : 'Invoice will automatically open in a new tab for printing.')
                    : (language === 'km' 
                        ? 'វិក្កយបត្រនឹងត្រូវបានបង្ហាញ ហើយអ្នកគិតប្រាក់អាចជ្រើសរើសបោះពុម្ពដោយដៃ។' 
                        : 'Invoice will be shown and cashier can choose to print manually.')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Save Button and Messages */}
      <div className="max-w-xl space-y-4">
        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl border border-red-100">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl border border-green-100">
            {language === 'km' ? 'ការកំណត់បានរក្សាទុកដោយជោគជ័យ!' : 'Settings saved successfully!'}
          </div>
        )}
        
        <Button
          variant="primary"
          onClick={handleSave}
          loading={saving}
          className="w-full"
        >
          {t(language, 'common.save')}
        </Button>
      </div>
    </div>
  );
}
