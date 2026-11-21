import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { useLanguageStore } from '../../lib/store';
import {
  getEscPosEnvironmentStatus,
  printEscPosTestReceipt,
  type ReceiptPaperSize,
  type ReceiptPrintStyle,
} from '../../lib/client/printing';

interface PrinterSettingsSectionProps {
  paperSize: ReceiptPaperSize;
  copies: 1 | 2;
  style: ReceiptPrintStyle;
}

export function PrinterSettingsSection({ paperSize, copies, style }: PrinterSettingsSectionProps) {
  const { language } = useLanguageStore();
  const [status, setStatus] = useState<{ text: string; error: boolean }>({ text: '', error: false });
  const [testing, setTesting] = useState(false);

  const handleCheckPrinter = () => {
    const info = getEscPosEnvironmentStatus();
    const summary = [
      `Android: ${info.isAndroid ? 'Yes' : 'No'}`,
      `Compression: ${info.hasCompressionLibrary ? 'OK' : 'Missing'}`,
      info.recommendation,
    ].join(' | ');
    setStatus({ text: summary, error: false });
  };

  const handlePrintTestReceipt = async () => {
    setTesting(true);
    setStatus({ text: '', error: false });

    try {
      const result = await printEscPosTestReceipt({ paperSize, copies, style });
      if (!result.success) {
        throw new Error(result.error || 'Test print failed');
      }

      setStatus({
        text:
          language === 'km'
            ? 'បានបើកបង្កាន់ដៃតេស្តទៅ open-escpos-print-service។'
            : 'Test receipt sent to open-escpos-print-service.',
        error: false,
      });
    } catch (err) {
      setStatus({
        text: err instanceof Error ? err.message : 'Test print failed',
        error: true,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
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
          <Button variant="primary" onClick={handlePrintTestReceipt} loading={testing}>
            {language === 'km' ? 'បោះពុម្ពតេស្ត' : 'Print Test'}
          </Button>
        </div>
      </div>
      {status.text && (
        <p className={`text-sm mt-3 ${status.error ? 'text-red-600' : 'text-gray-700'}`}>{status.text}</p>
      )}
    </div>
  );
}
