import type { Language } from '../../i18n';
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

function buildReceiptHtml(invoice: PrintableInvoice, items: PrintableInvoiceItem[], language: Language): string {
  const isKhmer = language === 'km';
  const sequence = getDailySequenceFromInvoiceNo(invoice.invoiceNo);

  const rows = items.map((item) => {
    const names = item.nameSnapshot.split(' / ');
    const displayName = escapeHtml(names[isKhmer ? 1 : 0] || item.nameSnapshot);
    return `<tr><td>${displayName}</td><td style="text-align:center;">${item.qty}</td><td style="text-align:right;">${escapeHtml(formatKHR(item.lineTotalKHR))}</td></tr>`;
  }).join('');

  const changeLine = invoice.paymentMethod === 'bank'
    ? `<div class="line"><span>${isKhmer ? 'ប្រាក់អាប់' : 'Change'}</span><span>${isKhmer ? 'គ្មានប្រាក់អាប់' : 'No Change'}</span></div>`
    : `<div class="line"><span>${isKhmer ? 'ប្រាក់អាប់' : 'Change'}</span><span>${escapeHtml(formatKHR(invoice.changeKHR))}</span></div>`;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { margin: 0mm; }
  body { margin: 0; padding: 0; font-family: monospace; }
  .receipt { width: 76mm; padding: 2mm; }
  .center { text-align: center; }
  .queue { font-size: 40px; font-weight: bold; line-height: 1; margin: 6px 0; }
  .meta { font-size: 12px; margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
  th, td { padding: 2px 0; vertical-align: top; }
  .line { display: flex; justify-content: space-between; font-size: 13px; margin: 3px 0; }
  .strong { font-weight: bold; }
  .divider { border-top: 1px dashed #000; margin: 6px 0; }
</style>
</head>
<body>
  <div class="receipt">
    <div class="center">
      <div>${isKhmer ? 'វិក្កយបត្រ' : 'Receipt'}</div>
      <div class="queue">#${sequence}</div>
      <div class="meta">${escapeHtml(invoice.invoiceNo)}</div>
      <div class="meta">${escapeHtml(formatDateTime(invoice.createdAt, isKhmer ? 'km' : 'en-US'))}</div>
      <div class="meta">${isKhmer ? 'អ្នកគិតប្រាក់' : 'Cashier'}: ${escapeHtml(invoice.cashierName)}</div>
    </div>

    <div class="divider"></div>

    <table>
      <thead>
        <tr>
          <th style="text-align:left;">${isKhmer ? 'មុខទំនិញ' : 'Item'}</th>
          <th style="text-align:center;">${isKhmer ? 'ចំនួន' : 'Qty'}</th>
          <th style="text-align:right;">${isKhmer ? 'តម្លៃ' : 'Amount'}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="divider"></div>

    <div class="line strong"><span>${isKhmer ? 'សរុប' : 'Total'}</span><span>${escapeHtml(formatKHR(invoice.totalKHR))}</span></div>
    <div class="line"><span>${isKhmer ? 'បានបង់' : 'Paid'}</span><span>${escapeHtml(formatKHR(invoice.paidKHR))}</span></div>
    ${changeLine}

    <div class="divider"></div>
    <div class="center meta">${isKhmer ? 'អរគុណ!' : 'Thank you!'}</div>
  </div>
</body>
</html>`;
}

export async function printInvoiceViaEscPosIntent(
  invoice: PrintableInvoice,
  items: PrintableInvoiceItem[],
  language: Language
): Promise<boolean> {
  const html = buildReceiptHtml(invoice, items, language);
  const payload = JSON.stringify([html]);
  const compressedBase64 = await gzipToBase64(payload);

  if (!compressedBase64) {
    return false;
  }

  const intentUrl = `intent://#Intent;scheme=print-intent;S.content=${encodeURIComponent(compressedBase64)};end`;
  window.location.href = intentUrl;
  return true;
}
