import type { APIRoute } from 'astro';
import { 
  operationExists, 
  createOperation, 
  createInvoice, 
  createInvoiceItem,
  getSessionByToken 
} from '../../../lib/db/server';

interface SyncOp {
  opId: string;
  deviceId: string;
  type: string;
  payload: any;
  createdAt: string;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Require authentication for sync
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
    
    const { ops } = await request.json() as { ops: SyncOp[] };
    
    if (!ops || !Array.isArray(ops)) {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const ackedOpIds: string[] = [];
    const errors: { opId: string; message: string }[] = [];
    
    for (const op of ops) {
      try {
        // Check if operation already exists (idempotent)
        if (operationExists(op.opId)) {
          // Already processed - ack it again
          ackedOpIds.push(op.opId);
          continue;
        }
        
        // Process based on type
        if (op.type === 'INVOICE_CREATE') {
          const { invoice, items } = op.payload;
          
          // Create invoice
          createInvoice({
            id: invoice.id,
            invoiceNo: invoice.invoiceNo,
            cashierId: invoice.cashierId,
            deviceId: invoice.deviceId,
            subtotalUSDcents: invoice.subtotalUSDcents,
            totalUSDcents: invoice.totalUSDcents,
            paidUSDcents: invoice.paidUSDcents,
            changeUSDcents: invoice.changeUSDcents,
            exchangeRateKHR: invoice.exchangeRateKHR,
            subtotalKHR: invoice.subtotalKHR,
            totalKHR: invoice.totalKHR,
            paidKHR: invoice.paidKHR,
            changeKHR: invoice.changeKHR,
            paymentMethod: invoice.paymentMethod || 'cash',
            createdAt: invoice.createdAt
          });
          
          // Create invoice items
          for (const item of items) {
            createInvoiceItem({
              id: item.id,
              invoiceId: item.invoiceId,
              productId: item.productId,
              nameSnapshot: item.nameSnapshot,
              priceUSDcentsSnapshot: item.priceUSDcentsSnapshot,
              qty: item.qty,
              lineTotalUSDcents: item.lineTotalUSDcents,
              lineTotalKHR: item.lineTotalKHR
            });
          }
        }
        
        // Record operation as processed
        createOperation(op.opId, op.deviceId, op.type, JSON.stringify(op.payload), op.createdAt);
        ackedOpIds.push(op.opId);
        
      } catch (error) {
        console.error(`Error processing op ${op.opId}:`, error);
        errors.push({
          opId: op.opId,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return new Response(JSON.stringify({ ackedOpIds, errors }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Sync push error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
