import { 
  db, 
  getOutboxOps, 
  removeOutboxOp, 
  updateOutboxOpAttempt, 
  updateInvoiceSyncStatus,
  type OutboxOp 
} from './db';

let isSyncing = false;
let syncListeners: ((syncing: boolean) => void)[] = [];

export function addSyncListener(listener: (syncing: boolean) => void): () => void {
  syncListeners.push(listener);
  return () => {
    syncListeners = syncListeners.filter(l => l !== listener);
  };
}

function notifySyncListeners(syncing: boolean): void {
  syncListeners.forEach(l => l(syncing));
}

export async function syncToServer(): Promise<{ success: number; failed: number }> {
  if (isSyncing) {
    return { success: 0, failed: 0 };
  }
  
  if (!navigator.onLine) {
    return { success: 0, failed: 0 };
  }
  
  isSyncing = true;
  notifySyncListeners(true);
  
  let success = 0;
  let failed = 0;
  
  try {
    const ops = await getOutboxOps();
    
    if (ops.length === 0) {
      return { success: 0, failed: 0 };
    }
    
    // Group ops by batch (max 10 at a time)
    const batches: OutboxOp[][] = [];
    for (let i = 0; i < ops.length; i += 10) {
      batches.push(ops.slice(i, i + 10));
    }
    
    for (const batch of batches) {
      try {
        // Update invoice statuses to syncing
        for (const op of batch) {
          if (op.type === 'INVOICE_CREATE') {
            await updateInvoiceSyncStatus(op.payload.invoice.id, 'syncing');
          }
        }
        
        const response = await fetch('/api/sync/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ops: batch.map(op => ({
              opId: op.opId,
              deviceId: op.deviceId,
              type: op.type,
              payload: op.payload,
              createdAt: op.createdAt
            }))
          })
        });
        
        if (!response.ok) {
          throw new Error(`Sync failed: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Process acked ops
        for (const opId of result.ackedOpIds || []) {
          const op = batch.find(o => o.opId === opId);
          if (op && op.type === 'INVOICE_CREATE') {
            await updateInvoiceSyncStatus(op.payload.invoice.id, 'synced');
          }
          await removeOutboxOp(opId);
          success++;
        }
        
        // Process errors
        for (const err of result.errors || []) {
          const op = batch.find(o => o.opId === err.opId);
          if (op) {
            if (op.type === 'INVOICE_CREATE') {
              await updateInvoiceSyncStatus(op.payload.invoice.id, 'error', err.message);
            }
            await updateOutboxOpAttempt(err.opId);
            failed++;
          }
        }
      } catch (error) {
        // Mark all ops in batch as failed
        for (const op of batch) {
          if (op.type === 'INVOICE_CREATE') {
            await updateInvoiceSyncStatus(
              op.payload.invoice.id, 
              'error', 
              error instanceof Error ? error.message : 'Unknown error'
            );
          }
          await updateOutboxOpAttempt(op.opId);
          failed++;
        }
      }
    }
  } finally {
    isSyncing = false;
    notifySyncListeners(false);
  }
  
  return { success, failed };
}

// Auto-sync when coming online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    setTimeout(() => syncToServer(), 1000);
  });
  
  // Periodic sync every 30 seconds when online
  setInterval(() => {
    if (navigator.onLine) {
      syncToServer();
    }
  }, 30000);
}

export function isCurrentlySyncing(): boolean {
  return isSyncing;
}
