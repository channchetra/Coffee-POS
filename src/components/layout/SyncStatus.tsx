import React, { useEffect, useState } from 'react';
import { useSyncStore, useLanguageStore } from '../../lib/store';
import { getOutboxOps } from '../../lib/client/db';
import { syncToServer, addSyncListener } from '../../lib/client/sync';
import { t } from '../../i18n';

export function SyncStatus() {
  const { isSyncing, pendingCount, setSyncing, setPendingCount } = useSyncStore();
  const { language } = useLanguageStore();
  const [lastSyncResult, setLastSyncResult] = useState<{ success: number; failed: number } | null>(null);
  
  useEffect(() => {
    // Load pending count
    const loadPending = async () => {
      const ops = await getOutboxOps();
      setPendingCount(ops.length);
    };
    loadPending();
    
    // Listen to sync status changes
    const unsubscribe = addSyncListener(setSyncing);
    
    // Poll for pending count every 5 seconds
    const interval = setInterval(loadPending, 5000);
    
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [setSyncing, setPendingCount]);
  
  const handleSync = async () => {
    if (isSyncing) return;
    const result = await syncToServer();
    setLastSyncResult(result);
    
    // Reload pending count
    const ops = await getOutboxOps();
    setPendingCount(ops.length);
  };
  
  if (pendingCount === 0 && !isSyncing) {
    return null;
  }
  
  return (
    <button
      onClick={handleSync}
      disabled={isSyncing}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all border ${
        isSyncing
          ? 'bg-yellow-50/80 text-yellow-700 border-yellow-200/50 backdrop-blur-sm'
          : pendingCount > 0
          ? 'bg-blue-50/80 text-blue-700 border-blue-200/50 hover:bg-blue-100 backdrop-blur-sm'
          : 'bg-green-50/80 text-green-700 border-green-200/50 backdrop-blur-sm'
      }`}
    >
      {isSyncing ? (
        <>
          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-sm font-medium">{t(language, 'app.syncing')}</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-sm font-medium">
            {pendingCount} {t(language, 'invoice.pending')}
          </span>
        </>
      )}
    </button>
  );
}
