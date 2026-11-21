import type { APIRoute } from 'astro';
import {
  applyInvoiceSyncOp,
  getSessionByToken,
  type InvoiceInput,
  type InvoiceItemInput,
  type InvoiceSyncOp,
} from '../../../lib/db';

const MAX_OPS_PER_BATCH = 50;
const MAX_ITEMS_PER_INVOICE = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength;
}

function isInteger(value: unknown, min: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min;
}

function isTimestamp(value: unknown): value is string {
  return isString(value, 40) && !Number.isNaN(Date.parse(value));
}

function validateInvoice(value: unknown): { invoice?: InvoiceInput; error?: string } {
  if (!isRecord(value)) return { error: 'Invoice must be an object' };
  if (!isString(value.id, 100)) return { error: 'Invalid invoice.id' };
  if (!isString(value.invoiceNo, 100)) return { error: 'Invalid invoice.invoiceNo' };
  if (!isString(value.cashierId, 100)) return { error: 'Invalid invoice.cashierId' };
  if (!isString(value.deviceId, 100)) return { error: 'Invalid invoice.deviceId' };
  if (!isInteger(value.subtotalUSDcents, 0)) return { error: 'Invalid invoice.subtotalUSDcents' };
  if (!isInteger(value.totalUSDcents, 0)) return { error: 'Invalid invoice.totalUSDcents' };
  if (!isInteger(value.paidUSDcents, 0)) return { error: 'Invalid invoice.paidUSDcents' };
  if (!isInteger(value.changeUSDcents, 0)) return { error: 'Invalid invoice.changeUSDcents' };
  if (!isInteger(value.exchangeRateKHR, 1)) return { error: 'Invalid invoice.exchangeRateKHR' };
  if (!isInteger(value.subtotalKHR, 0)) return { error: 'Invalid invoice.subtotalKHR' };
  if (!isInteger(value.totalKHR, 0)) return { error: 'Invalid invoice.totalKHR' };
  if (!isInteger(value.paidKHR, 0)) return { error: 'Invalid invoice.paidKHR' };
  if (!isInteger(value.changeKHR, 0)) return { error: 'Invalid invoice.changeKHR' };
  if (
    value.paymentMethod !== undefined &&
    value.paymentMethod !== 'cash' &&
    value.paymentMethod !== 'bank'
  ) {
    return { error: 'Invalid invoice.paymentMethod' };
  }
  if (!isTimestamp(value.createdAt)) return { error: 'Invalid invoice.createdAt' };

  return {
    invoice: {
      id: value.id,
      invoiceNo: value.invoiceNo,
      cashierId: value.cashierId,
      deviceId: value.deviceId,
      subtotalUSDcents: value.subtotalUSDcents,
      totalUSDcents: value.totalUSDcents,
      paidUSDcents: value.paidUSDcents,
      changeUSDcents: value.changeUSDcents,
      exchangeRateKHR: value.exchangeRateKHR,
      subtotalKHR: value.subtotalKHR,
      totalKHR: value.totalKHR,
      paidKHR: value.paidKHR,
      changeKHR: value.changeKHR,
      paymentMethod: value.paymentMethod as 'cash' | 'bank' | undefined,
      createdAt: value.createdAt,
    },
  };
}

function validateItem(
  value: unknown,
  invoiceId: string,
  index: number,
): { item?: InvoiceItemInput; error?: string } {
  if (!isRecord(value)) return { error: 'Item ' + index + ' must be an object' };
  if (!isString(value.id, 100)) return { error: 'Invalid item ' + index + '.id' };
  if (value.invoiceId !== invoiceId) {
    return { error: 'Item ' + index + '.invoiceId does not match invoice' };
  }
  if (!isString(value.productId, 100)) return { error: 'Invalid item ' + index + '.productId' };
  if (!isString(value.nameSnapshot, 300)) return { error: 'Invalid item ' + index + '.nameSnapshot' };
  if (!isInteger(value.priceUSDcentsSnapshot, 0)) {
    return { error: 'Invalid item ' + index + '.priceUSDcentsSnapshot' };
  }
  if (!isInteger(value.qty, 1)) return { error: 'Invalid item ' + index + '.qty' };
  if (!isInteger(value.lineTotalUSDcents, 0)) {
    return { error: 'Invalid item ' + index + '.lineTotalUSDcents' };
  }
  if (!isInteger(value.lineTotalKHR, 0)) {
    return { error: 'Invalid item ' + index + '.lineTotalKHR' };
  }

  return {
    item: {
      id: value.id,
      invoiceId,
      productId: value.productId,
      nameSnapshot: value.nameSnapshot,
      priceUSDcentsSnapshot: value.priceUSDcentsSnapshot,
      qty: value.qty,
      lineTotalUSDcents: value.lineTotalUSDcents,
      lineTotalKHR: value.lineTotalKHR,
    },
  };
}

function validateOp(value: unknown): { op?: InvoiceSyncOp; error?: string } {
  if (!isRecord(value)) return { error: 'Operation must be an object' };
  if (!isString(value.opId, 100)) return { error: 'Invalid opId' };
  if (!isString(value.deviceId, 100)) return { error: 'Invalid deviceId' };
  if (value.type !== 'INVOICE_CREATE') {
    return { error: 'Unsupported operation type: ' + String(value.type) };
  }
  if (!isTimestamp(value.createdAt)) return { error: 'Invalid createdAt' };
  if (!isRecord(value.payload)) return { error: 'Invalid payload' };

  const invoiceResult = validateInvoice(value.payload.invoice);
  if (!invoiceResult.invoice) return { error: invoiceResult.error };
  const invoice = invoiceResult.invoice;

  if (!Array.isArray(value.payload.items) || value.payload.items.length === 0) {
    return { error: 'Invoice must contain at least one item' };
  }
  if (value.payload.items.length > MAX_ITEMS_PER_INVOICE) {
    return { error: 'Invoice has too many items (max ' + MAX_ITEMS_PER_INVOICE + ')' };
  }

  const items: InvoiceItemInput[] = [];
  for (let index = 0; index < value.payload.items.length; index++) {
    const itemResult = validateItem(value.payload.items[index], invoice.id, index);
    if (!itemResult.item) return { error: itemResult.error };
    items.push(itemResult.item);
  }

  return {
    op: {
      opId: value.opId,
      deviceId: value.deviceId,
      type: 'INVOICE_CREATE',
      createdAt: value.createdAt,
      payload: { invoice, items },
    },
  };
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const token = cookies.get('session')?.value;
    if (!token) {
      return json({ error: 'Authentication required' }, 401);
    }

    const session = getSessionByToken(token);
    if (!session) {
      return json({ error: 'Invalid session' }, 401);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    if (!isRecord(body) || !Array.isArray(body.ops)) {
      return json({ error: 'Invalid request body' }, 400);
    }
    if (body.ops.length > MAX_OPS_PER_BATCH) {
      return json({ error: 'Too many operations (max ' + MAX_OPS_PER_BATCH + ')' }, 400);
    }

    const ackedOpIds: string[] = [];
    const errors: { opId: string; message: string }[] = [];

    for (const rawOp of body.ops) {
      const opId = isRecord(rawOp) && typeof rawOp.opId === 'string' ? rawOp.opId : 'unknown';
      const result = validateOp(rawOp);
      if (!result.op) {
        errors.push({ opId, message: result.error ?? 'Invalid operation' });
        continue;
      }

      try {
        applyInvoiceSyncOp(result.op);
        ackedOpIds.push(result.op.opId);
      } catch (error) {
        console.error('Error processing op', result.op.opId, error);
        errors.push({
          opId: result.op.opId,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return json({ ackedOpIds, errors }, 200);
  } catch (error) {
    console.error('Sync push error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
};
