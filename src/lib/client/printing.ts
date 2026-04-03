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

function buildReceiptHtml(invoice: PrintableInvoice, items: PrintableInvoiceItem[]): string {
  const sequence = getDailySequenceFromInvoiceNo(invoice.invoiceNo);
  const paperWidthMm = 58;
  const contentWidthMm = 54;
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
  @page { margin: 0mm; }
  body {
    margin: 0;
    padding: 0;
    font-family: Arial, sans-serif;
    font-weight: 700;
    color: #000;
  }
  .receipt {
    width: ${contentWidthMm}mm;
    padding: 2mm 1.5mm;
    font-weight: 700;
  }
  .center { text-align: center; }
  .title {
    font-size: 16px;
    font-weight: 900;
    letter-spacing: 0.5px;
    margin-bottom: 1.5mm;
  }
  .sequence {
    font-size: 34px;
    line-height: 1;
    font-weight: 900;
    margin: 0.5mm 0 1.5mm;
  }
  .invoice-no,
  .meta,
  .footer,
  .section-label,
  .totals,
  .item-meta {
    font-size: 12px;
    font-weight: 700;
  }
  .divider {
    border-top: 1px solid #000;
    margin: 3mm 0;
  }
  .section-label {
    display: flex;
    justify-content: space-between;
    margin-bottom: 1.5mm;
    font-size: 11px;
  }
  .item-row {
    padding: 1.5mm 0;
  }
  .item-name {
    font-size: 16px;
    line-height: 1.1;
    font-weight: 900;
    margin-bottom: 0.8mm;
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
    font-size: 12px;
  }
  .item-amount {
    font-size: 12px;
  }
  .total-row {
    margin: 1.2mm 0;
    font-size: 12px;
  }
  .grand-total {
    font-size: 14px;
    font-weight: 900;
  }
  .footer {
    text-align: center;
    margin-top: 4mm;
    font-size: 12px;
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
  items: PrintableInvoiceItem[]
): Promise<{ success: boolean; error?: string }> {
  const html = buildReceiptHtml(invoice, items);
  const payload = JSON.stringify([html, html]);

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
