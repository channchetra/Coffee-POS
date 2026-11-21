import type { APIRoute } from 'astro';
import { getInvoices, getInvoiceWithItems, getSessionByToken } from '../../../lib/db';

export const GET: APIRoute = async ({ url, cookies }) => {
  try {
    const token = cookies.get('session')?.value;
    
    if (!token) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
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
    
    // Check if requesting a specific invoice
    const invoiceId = url.searchParams.get('id');
    if (invoiceId) {
      const result = getInvoiceWithItems(invoiceId);
      if (!result) {
        return new Response(JSON.stringify({ error: 'Invoice not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Get list of invoices
    const period = (url.searchParams.get('period') || 'today') as 'today' | 'week' | 'month';
    const cashierId = url.searchParams.get('cashierId') || undefined;
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    
    const result = getInvoices({ period, cashierId, limit, offset });
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
