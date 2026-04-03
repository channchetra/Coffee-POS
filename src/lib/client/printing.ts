import { gzip } from 'pako';
import { formatDateTime } from '../utils/format';
import { formatKHR } from '../utils/currency';

export interface PrintableInvoice {
  invoiceNo: string;
  cashierName: string;
  createdAt: string;
  totalKHR: number;
  paidKHR: number;
  changeKHR: number;
  paymentMethod: 'cash' | 'bank';
}

export interface PrintableInvoiceItem {
  id: string;
  nameSnapshot: string;
  qty: number;
  lineTotalKHR: number;
}

export type ReceiptPaperSize = '58mm' | '80mm';
export type ReceiptPrintStyle = 'compact' | 'normal' | 'large';
export type ReceiptPrintMode = 'browser' | 'escpos-intent';

interface ReceiptPrintOptions {
  paperSize?: ReceiptPaperSize;
  copies?: 1 | 2;
  style?: ReceiptPrintStyle;
}

export function getDailySequenceFromInvoiceNo(invoiceNo: string): number {
  const parts = invoiceNo.split('-');
  const raw = parts[parts.length - 1] || '';
  const value = parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = '';

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

async function gzipToBase64(input: string): Promise<string | null> {
  try {
    const encoder = new TextEncoder();
    const sourceBytes = encoder.encode(input);
    const compressedBytes = gzip(sourceBytes);
    return bytesToBase64(compressedBytes);
  } catch (err) {
    console.error('[ESC/POS] pako gzip error:', err);
    return null;
  }
}

function buildReceiptHtml(
  invoice: PrintableInvoice,
  items: PrintableInvoiceItem[],
  options?: ReceiptPrintOptions
): string {
  const sequence = getDailySequenceFromInvoiceNo(invoice.invoiceNo);
  const paperSize = options?.paperSize === '80mm' ? '80mm' : '58mm';
  const style = options?.style || 'normal';
  const paperWidthMm = paperSize === '80mm' ? 80 : 58;
  const receiptWidthPercent = paperSize === '80mm' ? '95%' : '92%';

  const stylePreset = {
    compact: {
      pagePaddingMm: paperSize === '80mm' ? 1.4 : 0.9,
      titleSizePx: 13,
      sequenceSizePx: paperSize === '80mm' ? 34 : 30,
      itemNameSizePx: paperSize === '80mm' ? 17 : 16,
      metaSizePx: 10,
      sectionLabelSizePx: 9,
      itemGapMm: 1,
      footerGapMm: 2,
    },
    normal: {
      pagePaddingMm: paperSize === '80mm' ? 1.8 : 1.1,
      titleSizePx: 14,
      sequenceSizePx: paperSize === '80mm' ? 38 : 32,
      itemNameSizePx: paperSize === '80mm' ? 20 : 19,
      metaSizePx: 11,
      sectionLabelSizePx: 10,
      itemGapMm: 1.2,
      footerGapMm: 2.5,
    },
    large: {
      pagePaddingMm: paperSize === '80mm' ? 2.2 : 1.4,
      titleSizePx: 16,
      sequenceSizePx: paperSize === '80mm' ? 42 : 36,
      itemNameSizePx: paperSize === '80mm' ? 22 : 21,
      metaSizePx: 12,
      sectionLabelSizePx: 11,
      itemGapMm: 1.4,
      footerGapMm: 3,
    },
  }[style];

  const { pagePaddingMm, titleSizePx, sequenceSizePx, itemNameSizePx, metaSizePx, sectionLabelSizePx, itemGapMm, footerGapMm } = stylePreset;
  const itemRows = items.map((item) => {
    const names = item.nameSnapshot.split(' / ');
    const englishName = escapeHtml((names[0] || item.nameSnapshot).trim());
    const amount = escapeHtml(formatKHR(item.lineTotalKHR));
    return `
      <div class="item-row">
        <div class="item-name">${englishName}</div>
        <div class="item-meta">
          <span class="item-qty">QTY ${item.qty}</span>
          <span class="item-amount">${amount}</span>
        </div>
      </div>`;
  }).join('');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: ${paperWidthMm}mm auto; margin: 0mm; }
  body {
    margin: 0;
    padding: 0;
    font-family: Arial, sans-serif;
    font-weight: 700;
    color: #000;
  }
  .receipt {
    width: ${receiptWidthPercent};
    box-sizing: border-box;
    margin: 0 auto;
    padding: 1.5mm ${pagePaddingMm}mm;
    font-weight: 700;
  }
  .center { text-align: center; }
  .title {
    font-size: ${titleSizePx}px;
    font-weight: 900;
    letter-spacing: 0.5px;
    margin-bottom: 1mm;
  }
  .sequence {
    font-size: ${sequenceSizePx}px;
    line-height: 1;
    font-weight: 900;
    margin: 0.5mm 0 1mm;
  }
  .invoice-no,
  .meta,
  .footer,
  .section-label,
  .totals,
  .item-meta {
    font-size: ${metaSizePx}px;
    font-weight: 700;
  }
  .divider {
    border-top: 1px solid #000;
    margin: ${footerGapMm}mm 0;
  }
  .section-label {
    display: flex;
    justify-content: space-between;
    margin-bottom: 1mm;
    font-size: ${sectionLabelSizePx}px;
  }
  .item-row {
    padding: ${itemGapMm}mm 0;
  }
  .item-name {
    font-size: ${itemNameSizePx}px;
    line-height: 1.1;
    font-weight: 900;
    margin-bottom: 0.6mm;
  }
  .item-meta,
  .total-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .item-qty,
  .item-amount,
  .total-label,
  .total-value {
    font-weight: 800;
  }
  .item-qty {
    font-size: ${metaSizePx}px;
  }
  .item-amount {
    font-size: ${metaSizePx}px;
  }
  .total-row {
    margin: 1mm 0;
    font-size: ${metaSizePx}px;
  }
  .grand-total {
    font-size: ${style === 'large' ? 15 : 13}px;
    font-weight: 900;
  }
  .footer {
    text-align: center;
    margin-top: ${footerGapMm}mm;
    font-size: ${metaSizePx}px;
    font-weight: 900;
  }
</style>
</head>
<body>
  <div class="receipt">
    <div class="center title">RECEIPT</div>
    <div class="center sequence">#${sequence}</div>
    <div class="center invoice-no">${escapeHtml(invoice.invoiceNo)}</div>
    <div class="center meta">${escapeHtml(formatDateTime(invoice.createdAt, 'en-US'))}</div>
    <div class="center meta">Cashier: ${escapeHtml(invoice.cashierName)}</div>

    <div class="divider"></div>

    <div class="section-label">
      <span>ITEM</span>
      <span>QTY / AMT</span>
    </div>

    ${itemRows}

    <div class="divider"></div>

    <div class="totals">
      <div class="total-row"><span class="total-label">TOTAL</span><span class="total-value">${escapeHtml(formatKHR(invoice.totalKHR))}</span></div>
      <div class="total-row"><span class="total-label">PAID</span><span class="total-value">${escapeHtml(formatKHR(invoice.paidKHR))}</span></div>
      <div class="total-row grand-total"><span class="total-label">CHANGE</span><span class="total-value">${invoice.paymentMethod === 'bank' ? 'No Change' : escapeHtml(formatKHR(invoice.changeKHR))}</span></div>
    </div>

    <div class="divider"></div>

    <div class="footer">THANK YOU</div>
  </div>
</body>
</html>`;
}

export async function printInvoiceViaEscPosIntent(
  invoice: PrintableInvoice,
  items: PrintableInvoiceItem[],
  options?: ReceiptPrintOptions
): Promise<{ success: boolean; error?: string }> {
  const html = buildReceiptHtml(invoice, items, options);
  const copies = options?.copies === 2 ? 2 : 1;
  const payload = JSON.stringify(Array.from({ length: copies }, () => html));

  console.log('[ESC/POS] Building receipt HTML...');
  console.log('[ESC/POS] Compressing payload...');

  let compressedBase64: string | null = null;
  try {
    compressedBase64 = await gzipToBase64(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown compression error';
    console.error('[ESC/POS] Compression failed:', message);
    return { success: false, error: `Compression failed: ${message}` };
  }

  if (!compressedBase64) {
    console.warn('[ESC/POS] Compression unavailable');
    return { success: false, error: 'Compression unavailable on this device.' };
  }

  const intentUrl = `intent://#Intent;scheme=print-intent;S.content=${encodeURIComponent(compressedBase64)};end`;
  console.log('[ESC/POS] Compressed payload size:', compressedBase64.length, 'bytes');
  console.log('[ESC/POS] Intent URL generated, attempting to launch...');
  console.log('[ESC/POS] Intent scheme: print-intent');

  try {
    console.log('[ESC/POS] Launching intent via window.location.href');
    window.location.href = intentUrl;
    // Return success - intent launch was attempted
    return { success: true, error: undefined };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[ESC/POS] Failed to launch intent:', errorMsg);
    return { success: false, error: `Failed to launch intent: ${errorMsg}` };
  }
}

export async function printEscPosTestReceipt(
  options?: ReceiptPrintOptions
): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString();
  return printInvoiceViaEscPosIntent(
    {
      invoiceNo: 'TEST-0001',
      cashierName: 'Coffee POS',
      createdAt: now,
      totalKHR: 12300,
      paidKHR: 20000,
      changeKHR: 7700,
      paymentMethod: 'cash'
    },
    [
      {
        id: crypto.randomUUID(),
        nameSnapshot: 'Printer Test Item',
        qty: 1,
        lineTotalKHR: 12300
      }
    ],
    options
  );
}

/**
 * Test ESC/POS intent service availability
 * @returns Service info and availability status
 */
export function testEscPosIntent(): { available: boolean; message: string } {
  const isAndroid = /Android/i.test(navigator.userAgent);
  const hasPako = typeof gzip === 'function';

  console.log('[ESC/POS-TEST] User Agent:', navigator.userAgent);
  console.log('[ESC/POS-TEST] Is Android:', isAndroid);
  console.log('[ESC/POS-TEST] pako gzip available:', hasPako);

  if (!isAndroid) {
    return {
      available: false,
      message: 'ESC/POS Intent only works on Android devices. You are on: ' + navigator.userAgent
    };
  }

  if (!hasPako) {
    return {
      available: false,
      message: 'Gzip library unavailable in client bundle.'
    };
  }

  return {
    available: true,
    message: 'ESC/POS Intent should be available. Make sure open-escpos-print-service app is installed.'
  };
}

export function getEscPosEnvironmentStatus(): {
  isAndroid: boolean;
  hasCompressionLibrary: boolean;
  userAgent: string;
  recommendation: string;
} {
  const isAndroid = /Android/i.test(navigator.userAgent);
  const hasCompressionLibrary = typeof gzip === 'function';
  const recommendation = !isAndroid
    ? 'Use Android Chrome for ESC/POS Intent printing.'
    : !hasCompressionLibrary
      ? 'Compression library unavailable. Reload app and clear cache.'
      : 'Environment looks ready. If silent, verify open-escpos-print-service is installed and set as handler.';

  return {
    isAndroid,
    hasCompressionLibrary,
    userAgent: navigator.userAgent,
    recommendation
  };
}
