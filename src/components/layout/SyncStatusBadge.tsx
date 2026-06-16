import { Cloud, CloudOff, Loader2, RefreshCw } from 'lucide-react';
import { useDataSync } from '@/contexts/DataSyncContext';

export function SyncStatusBadge() {
  const { status, isOnline, error, lastSyncAt, forceSync } = useDataSync();

  const label =
    status === 'loading'
      ? '연결 중'
      : status === 'syncing'
        ? '동기화 중'
        : isOnline
          ? 'Google Sheets'
          : '오프라인';

  const Icon =
    status === 'loading' || status === 'syncing'
      ? Loader2
      : isOnline
        ? Cloud
        : CloudOff;

  return (
    <div className="px-4 pb-4">
      <div
        className={`rounded-xl border px-3 py-2.5 ${
          isOnline
            ? 'border-emerald-200 bg-emerald-50/70'
            : 'border-rose-200 bg-rose-50/70'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Icon
              size={14}
              className={`shrink-0 ${
                status === 'loading' || status === 'syncing'
                  ? 'animate-spin text-stone-500'
                  : isOnline
                    ? 'text-emerald-600'
                    : 'text-rose-600'
              }`}
            />
            <div className="min-w-0">
              <p className="text-xs font-medium text-stone-700 truncate">{label}</p>
              {lastSyncAt && (
                <p className="text-[10px] text-stone-400 truncate">
                  {new Date(lastSyncAt).toLocaleTimeString('ko-KR')}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => forceSync().catch(console.error)}
            className="btn-ghost p-1.5 shrink-0"
            title="지금 동기화"
          >
            <RefreshCw size={14} />
          </button>
        </div>
        {error && (
          <p className="text-[10px] text-rose-600 mt-2 leading-relaxed">{error}</p>
        )}
      </div>
    </div>
  );
}
