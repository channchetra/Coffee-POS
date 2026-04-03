import React, { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { useLanguageStore } from '../../lib/store';
import { formatExchangeRate } from '../../lib/utils/currency';
import { getEscPosEnvironmentStatus, printEscPosTestReceipt } from '../../lib/client/printing';
import { t } from '../../i18n';

export function SettingsManager() {
  const { language } = useLanguageStore();
  const [exchangeRate, setExchangeRate] = useState('4000');
  const [autoPrintInvoice, setAutoPrintInvoice] = useState(false);
  const [receiptPrintMode, setReceiptPrintMode] = useState<'browser' | 'escpos-intent'>('browser');
  const [receiptPaperSize, setReceiptPaperSize] = useState<'58mm' | '80mm'>('58mm');
  const [receiptCopies, setReceiptCopies] = useState<1 | 2>(1);
  const [receiptStyle, setReceiptStyle] = useState<'compact' | 'normal' | 'large'>('normal');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [printerStatus, setPrinterStatus] = useState('');
  const [testingPrint, setTestingPrint] = useState(false);
  
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (!response.ok) throw new Error('Failed to fetch settings');
        const data = await response.json();
        setExchangeRate(data.defaultExchangeRateKHR?.toString() || '4000');
        setAutoPrintInvoice(data.autoPrintInvoice || false);
        setReceiptPrintMode(data.receiptPrintMode === 'escpos-intent' ? 'escpos-intent' : 'browser');
        setReceiptPaperSize(data.receiptPaperSize === '80mm' ? '80mm' : '58mm');
        setReceiptCopies(data.receiptCopies === 2 ? 2 : 1);
        setReceiptStyle(['compact', 'normal', 'large'].includes(data.receiptStyle) ? data.receiptStyle : 'normal');
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
          autoPrintInvoice: autoPrintInvoice,
          receiptPrintMode,
          receiptPaperSize,
          receiptCopies,
          receiptStyle
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

  const handleCheckPrinter = () => {
    const status = getEscPosEnvironmentStatus();
    const summary = [
      `Android: ${status.isAndroid ? 'Yes' : 'No'}`,
      `Compression: ${status.hasCompressionLibrary ? 'OK' : 'Missing'}`,
      status.recommendation
    ].join(' | ');
    setPrinterStatus(summary);
  };

  const handlePrintTestReceipt = async () => {
    setTestingPrint(true);
    setError('');
    setSuccess(false);

    try {
      const result = await printEscPosTestReceipt({
        paperSize: receiptPaperSize,
        copies: receiptCopies,
        style: receiptStyle
      });

      if (!result.success) {
        throw new Error(result.error || 'Test print failed');
      }

      setPrinterStatus(
        language === 'km'
          ? 'បានបើកបង្កាន់ដៃតេស្តទៅ open-escpos-print-service។'
          : 'Test receipt sent to open-escpos-print-service.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test print failed');
    } finally {
      setTestingPrint(false);
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
              aria-label={language === 'km' ? 'អត្រាប្តូរប្រាក់លំនាំដើម' : 'Default exchange rate'}
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {language === 'km' ? 'វិធីបោះពុម្ពបង្កាន់ដៃ' : 'Receipt Print Method'}
            </label>
            <select
              value={receiptPrintMode}
              onChange={(e) => setReceiptPrintMode(e.target.value as 'browser' | 'escpos-intent')}
              aria-label={language === 'km' ? 'វិធីបោះពុម្ពបង្កាន់ដៃ' : 'Receipt print method'}
              className="input"
            >
              <option value="browser">{language === 'km' ? 'Browser Print (ធម្មតា)' : 'Browser Print (Standard)'}</option>
              <option value="escpos-intent">{language === 'km' ? 'ESC/POS Intent (Android)' : 'ESC/POS Intent (Android)'}</option>
            </select>
            <p className="text-sm text-gray-500 mt-2">
              {receiptPrintMode === 'escpos-intent'
                ? (language === 'km'
                    ? 'ESC/POS Intent ត្រូវការកម្មវិធី open-escpos-print-service នៅលើ Android។'
                    : 'ESC/POS Intent requires open-escpos-print-service installed on Android.')
                : (language === 'km'
                    ? 'Browser Print គឺជាវិធីស្តង់ដារ តែគុណភាពអាចទាបជាង native app។'
                    : 'Browser Print is the standard path, but quality can be lower than a native app.')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {language === 'km' ? 'ទំហំក្រដាសបោះពុម្ព' : 'Receipt Paper Size'}
            </label>
            <select
              value={receiptPaperSize}
              onChange={(e) => setReceiptPaperSize(e.target.value as '58mm' | '80mm')}
              aria-label={language === 'km' ? 'ទំហំក្រដាសបោះពុម្ព' : 'Receipt paper size'}
              className="input"
            >
              <option value="58mm">58mm</option>
              <option value="80mm">80mm</option>
            </select>
            <p className="text-sm text-gray-500 mt-2">
              {language === 'km'
                ? 'ជ្រើសទំហំក្រដាសត្រឹមត្រូវ ដើម្បីជៀសវាងការស្កេលចុះ។'
                : 'Select the real printer paper size to avoid scaled-down output.'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {language === 'km' ? 'ចំនួនបោះពុម្ព' : 'Print Copies'}
            </label>
            <select
              value={receiptCopies}
              onChange={(e) => setReceiptCopies(Number(e.target.value) as 1 | 2)}
              aria-label={language === 'km' ? 'ចំនួនបោះពុម្ព' : 'Print copies'}
              className="input"
            >
              <option value={1}>{language === 'km' ? 'តែមួយ' : 'Single'}</option>
              <option value={2}>{language === 'km' ? 'ទ្វេដង' : 'Double'}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {language === 'km' ? 'រចនាប័ទ្មវិក្កយបត្រ' : 'Receipt Style'}
            </label>
            <select
              value={receiptStyle}
              onChange={(e) => setReceiptStyle(e.target.value as 'compact' | 'normal' | 'large')}
              aria-label={language === 'km' ? 'រចនាប័ទ្មវិក្កយបត្រ' : 'Receipt style'}
              className="input"
            >
              <option value="compact">{language === 'km' ? 'ខ្លី' : 'Compact'}</option>
              <option value="normal">{language === 'km' ? 'ធម្មតា' : 'Normal'}</option>
              <option value="large">{language === 'km' ? 'ធំ' : 'Large'}</option>
            </select>
            <p className="text-sm text-gray-500 mt-2">
              {language === 'km'
                ? 'Compact បោះពុម្ពខ្លី, Normal សមតុល្យ, Large បង្ហាញធំជាង។'
                : 'Compact is shorter, Normal is balanced, Large is more prominent.'}
            </p>
          </div>

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
                    ? (receiptPrintMode === 'escpos-intent'
                        ? (language === 'km'
                            ? 'បន្ទាប់ពីទូទាត់ជោគជ័យ វានឹងបញ្ជូនបង្កាន់ដៃទៅ open-escpos-print-service ដោយស្វ័យប្រវត្តិ។'
                            : 'After successful payment, receipt will be sent to open-escpos-print-service automatically.')
                        : (language === 'km'
                            ? 'វិក្កយបត្រនឹងបើកដោយស្វ័យប្រវត្តិនៅក្នុងផ្ទាំងថ្មីសម្រាប់បោះពុម្ព។'
                            : 'Invoice will automatically open in a new tab for printing.'))
                    : (language === 'km'
                        ? 'វិក្កយបត្រនឹងត្រូវបានបង្ហាញ ហើយអ្នកគិតប្រាក់អាចជ្រើសរើសបោះពុម្ពដោយដៃ។'
                        : 'Invoice will be shown and cashier can choose to print manually.')}
                </p>
                <p className="text-xs text-blue-500 mt-2">
                    {language === 'km'
                      ? `ចម្លង: ${receiptCopies === 2 ? 'ទ្វេដង' : 'តែមួយ'} • រចនាប័ទ្ម: ${receiptStyle}`
                      : `Copies: ${receiptCopies === 2 ? 'Double' : 'Single'} • Style: ${receiptStyle}`}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-gray-900">
                  {language === 'km' ? 'ពិនិត្យម៉ាស៊ីនព្រីន ESC/POS' : 'Check ESC/POS Printer'}
                </p>
                <p className="text-sm text-gray-500">
                  {language === 'km'
                    ? 'ពិនិត្យភាពរួចរាល់របស់ឧបករណ៍សម្រាប់ open-escpos-print-service'
                    : 'Verify device readiness for open-escpos-print-service'}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" onClick={handleCheckPrinter}>
                  {language === 'km' ? 'ពិនិត្យ' : 'Check'}
                </Button>
                <Button variant="primary" onClick={handlePrintTestReceipt} loading={testingPrint}>
                  {language === 'km' ? 'បោះពុម្ពតេស្ត' : 'Print Test'}
                </Button>
              </div>
            </div>
            {printerStatus && (
              <p className="text-sm text-gray-700 mt-3">{printerStatus}</p>
            )}
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
