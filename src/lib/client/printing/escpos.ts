import { gzip } from 'pako';
import { buildReceiptHtml } from './receipt-html';
import type { PrintableInvoice, PrintableInvoiceItem, ReceiptPrintOptions } from './types';

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
  console.log('[ESC/POS] Full Intent URL:', intentUrl.substring(0, 100) + '...');

  try {
    console.log('[ESC/POS] Method 1: Trying iframe approach');
    
    // Method 1: Try iframe first (most reliable on modern Android)
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    
    iframe.onload = () => {
      console.log('[ESC/POS] Iframe loaded, removing...');
      setTimeout(() => {
        if (iframe.parentNode) {
          document.body.removeChild(iframe);
        }
      }, 100);
    };
    
    iframe.onerror = () => {
      console.log('[ESC/POS] Iframe error (expected for intent scheme)');
      if (iframe.parentNode) {
        document.body.removeChild(iframe);
      }
    };
    
    iframe.src = intentUrl;
    
    // Fallback: If iframe doesn't work after timeout, try direct location
    setTimeout(() => {
      if (iframe.parentNode) {
        console.log('[ESC/POS] Method 2: Iframe fallback to window.location');
        document.body.removeChild(iframe);
        
        // Delay to ensure service has time to respond to first attempt
        setTimeout(() => {
          window.location.href = intentUrl;
        }, 200);
      }
    }, 500);
    
    // Return success - intent launch was attempted
    return { success: true, error: undefined };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[ESC/POS] Failed to launch intent:', errorMsg);
    
    // Last resort: try direct location anyway
    try {
      window.location.href = intentUrl;
      return { success: true, error: undefined };
    } catch (finalErr) {
      return { success: false, error: `Failed to launch intent: ${errorMsg}` };
    }
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
  // Multiple Android detection methods for compatibility
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const userAgent = nav.userAgent.toLowerCase();
  const isAndroid = 
    /android/i.test(userAgent) ||
    /linux.*mobile/i.test(userAgent) ||
    nav.userAgentData?.platform === 'Android';
  
  const hasCompressionLibrary = typeof gzip === 'function';
  
  const recommendation = !isAndroid
    ? 'Use Android device with Chrome for ESC/POS Intent printing. User Agent: ' + navigator.userAgent
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
