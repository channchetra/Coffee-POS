import type { APIRoute } from 'astro';
import { getSetting, setSetting, getSessionByToken, recalculateAllProductPrices } from '../../lib/db/server';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    // Require authentication
    const token = cookies.get('session')?.value;
    
    if (!token) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const session = getSessionByToken(token);
    if (!session) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const defaultExchangeRateKHR = getSetting('defaultExchangeRateKHR') || 4000;
    const autoPrintInvoice = getSetting('autoPrintInvoice') || false;
    const receiptPrintMode = getSetting('receiptPrintMode') || 'browser';
    const receiptPaperSize = getSetting('receiptPaperSize') || '58mm';
    const receiptCopies = getSetting('receiptCopies') || 1;
    const receiptStyle = getSetting('receiptStyle') || 'normal';
    
    return new Response(JSON.stringify({ 
      defaultExchangeRateKHR,
      autoPrintInvoice,
      receiptPrintMode,
      receiptPaperSize,
      receiptCopies,
      receiptStyle
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Get settings error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  try {
    const token = cookies.get('session')?.value;
    
    if (!token) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const session = getSessionByToken(token) as any;
    
    if (!session || session.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const body = await request.json();
    
    // Update exchange rate if provided
    if (body.defaultExchangeRateKHR !== undefined) {
      setSetting('defaultExchangeRateKHR', body.defaultExchangeRateKHR);
      // Recalculate all product USD prices based on new exchange rate
      recalculateAllProductPrices(body.defaultExchangeRateKHR);
    }
    
    // Update auto print setting if provided
    if (body.autoPrintInvoice !== undefined) {
      setSetting('autoPrintInvoice', body.autoPrintInvoice);
    }

    if (body.receiptPrintMode !== undefined) {
      const value = ['browser', 'escpos-intent'].includes(body.receiptPrintMode)
        ? body.receiptPrintMode
        : 'browser';
      setSetting('receiptPrintMode', value);
    }

    if (body.receiptPaperSize !== undefined) {
      const value = body.receiptPaperSize === '80mm' ? '80mm' : '58mm';
      setSetting('receiptPaperSize', value);
    }

    if (body.receiptCopies !== undefined) {
      const value = body.receiptCopies === 2 ? 2 : 1;
      setSetting('receiptCopies', value);
    }

    if (body.receiptStyle !== undefined) {
      const value = ['compact', 'normal', 'large'].includes(body.receiptStyle) ? body.receiptStyle : 'normal';
      setSetting('receiptStyle', value);
    }
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Update settings error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
