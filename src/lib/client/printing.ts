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

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

async function gzipToBase64(input: string): Promise<string | null> {
  if (typeof CompressionStream === 'undefined') {
    return null;
  }

  const encoder = new TextEncoder();
  const sourceBytes = encoder.encode(input);
  const compressionStream = new CompressionStream('gzip');
  const writer = compressionStream.writable.getWriter();
  await writer.write(sourceBytes);
  await writer.close();

  const compressed = await new Response(compressionStream.readable).arrayBuffer();
  return arrayBufferToBase64(compressed);
}

function buildReceiptHtml(invoice: PrintableInvoice, items: PrintableInvoiceItem[]): string {
  const sequence = getDailySequenceFromInvoiceNo(invoice.invoiceNo);

  const lines: string[] = [];
  lines.push('RECEIPT');
  lines.push(`#${sequence}`);
  lines.push(invoice.invoiceNo);
  lines.push(formatDateTime(invoice.createdAt, 'en-US'));
  lines.push(`Cashier: ${invoice.cashierName}`);
  lines.push('--------------------------------');
  lines.push('ITEM                    QTY   AMT');

  for (const item of items) {
    const names = item.nameSnapshot.split(' / ');
    const englishName = (names[0] || item.nameSnapshot).trim();
    const amount = formatKHR(item.lineTotalKHR);
    const nameCol = englishName.length > 22 ? `${englishName.slice(0, 22)}` : englishName.padEnd(22, ' ');
    const qtyCol = String(item.qty).padStart(3, ' ');
    const amountCol = amount.padStart(7, ' ');
    lines.push(`${nameCol}${qtyCol}${amountCol}`);
  }

  lines.push('--------------------------------');
  lines.push(`TOTAL: ${formatKHR(invoice.totalKHR)}`);
  lines.push(`PAID:  ${formatKHR(invoice.paidKHR)}`);
  lines.push(invoice.paymentMethod === 'bank' ? 'CHANGE: No Change' : `CHANGE: ${formatKHR(invoice.changeKHR)}`);
  lines.push('--------------------------------');
  lines.push('Thank you!');

  const receiptText = escapeHtml(lines.join('\n'));

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { margin: 0mm; }
  body { margin: 0; padding: 0; font-family: monospace; }
  .receipt { width: 76mm; padding: 2mm; }
  pre { margin: 0; white-space: pre; font-size: 12px; line-height: 1.3; }
</style>
</head>
<body>
  <div class="receipt"><pre>${receiptText}</pre></div>
</body>
</html>`;
}

export async function printInvoiceViaEscPosIntent(
  invoice: PrintableInvoice,
  items: PrintableInvoiceItem[]
): Promise<boolean> {
  const html = buildReceiptHtml(invoice, items);
  const payload = JSON.stringify([html]);
  const compressedBase64 = await gzipToBase64(payload);

  if (!compressedBase64) {
    return false;
  }

  const intentUrl = `intent://#Intent;scheme=print-intent;S.content=${encodeURIComponent(compressedBase64)};end`;
  window.location.href = intentUrl;
  return true;
}
