import type { APIRoute } from 'astro';
import { getInvoiceWithItems, getSessionByToken } from '../../../lib/db/server';

// Public invoice endpoint - requires authentication but not admin role
// This allows cashiers to view/print invoices they created
export const GET: APIRoute = async ({ params, cookies }) => {
  try {
    const invoiceId = params.id;
    
    if (!invoiceId) {
      return new Response(JSON.stringify({ error: 'Invoice ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Require authentication (any logged in user can view invoices)
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
  } catch (error) {
    console.error('Get invoice error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
