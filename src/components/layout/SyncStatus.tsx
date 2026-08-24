import React, { useEffect, useState } from 'react';
import { useSyncStore, useLanguageStore } from '../../lib/store';
import { getOutboxOps } from '../../lib/client/db';
import { syncToServer, addSyncListener } from '../../lib/client/sync';
import { t } from '../../i18n';

interface SyncStatusProps {
  /** 'full': pill with label (default) • 'icon': icon-only badge for the top menu */
  variant?: 'full' | 'icon';
}

export function SyncStatus({ variant = 'full' }: SyncStatusProps) {
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

  // Icon-only variant for the top menu
  if (variant === 'icon') {
    return (
      <button
        onClick={handleSync}
        disabled={isSyncing}
        className="relative flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-gray-600 hover:text-gray-900 hover:bg-white/60 transition-colors active:scale-95"
        title={isSyncing
          ? t(language, 'app.syncing')
          : `${pendingCount} ${t(language, 'invoice.pending')}`}
        aria-label={isSyncing
          ? t(language, 'app.syncing')
          : `${pendingCount} ${t(language, 'invoice.pending')}`}
      >
        <svg className={`w-5 h-5 ${isSyncing ? 'animate-spin text-blue-500' : pendingCount > 0 ? 'text-blue-600' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {pendingCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
            {pendingCount > 99 ? '99+' : pendingCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleSync}
      disabled={isSyncing}
      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-colors text-left ${
        isSyncing
          ? 'bg-yellow-50/80 text-yellow-700'
          : pendingCount > 0
          ? 'bg-blue-50/80 text-blue-700'
          : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      <svg className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      {isSyncing
        ? t(language, 'app.syncing')
        : `${pendingCount} ${t(language, 'invoice.pending')}`}
    </button>
  );
}
