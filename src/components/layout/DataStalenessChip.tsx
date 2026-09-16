import React, { useState, useEffect } from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import { Clock, Activity, WifiOff } from 'lucide-react';

interface DataStalenessChipProps {
  compact?: boolean;
  className?: string;
}

export const DataStalenessChip: React.FC<DataStalenessChipProps> = ({
  compact = false,
  className = '',
}) => {
  const { isOnline, lastDataSyncTime, lastOfflineTransitionTime, offlineQueueCount } = usePravahStore();
  const [now, setNow] = useState<number>(Date.now());

  // Tick every second to keep relative elapsed time accurate
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!isOnline) {
    const offlineSince = lastOfflineTransitionTime || lastDataSyncTime;
    const elapsedSec = Math.max(0, Math.floor((now - offlineSince) / 1000));
    const timeStr = elapsedSec < 60 ? `${elapsedSec}s ago` : `${Math.floor(elapsedSec / 60)}m ago`;

    return (
      <div
        className={`flex items-center space-x-1.5 px-2 py-0.5 sm:py-1 rounded-sm text-[10px] sm:text-xs font-mono font-medium border transition-colors select-none bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 shadow-xs ${className}`}
        title={`Working with local offline cache. Last known live data received ${timeStr}. ${offlineQueueCount} reports queued in local storage.`}
        aria-live="polite"
      >
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
        <WifiOff className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0 hidden sm:inline" />
        <span className="truncate">
          {compact ? (
            `Cached (${timeStr})`
          ) : (
            <>
              <span className="hidden md:inline">Offline Cache: </span>
              <span>{timeStr}</span>
              {offlineQueueCount > 0 && (
                <span className="font-bold ml-1 text-amber-800 dark:text-amber-200">
                  • Queue: {offlineQueueCount}
                </span>
              )}
            </>
          )}
        </span>
      </div>
    );
  }

  const elapsedSec = Math.max(0, Math.floor((now - lastDataSyncTime) / 1000));

  let statusLevel: 'fresh' | 'latent' | 'stale' = 'fresh';
  let badgeClasses = 'bg-status-open-tint text-status-open-text border-status-open-solid/40';
  let dotClasses = 'bg-status-open-solid animate-pulse';

  if (elapsedSec >= 120) {
    statusLevel = 'stale';
    badgeClasses = 'bg-status-blocked-tint text-status-blocked-text border-status-blocked-solid/40';
    dotClasses = 'bg-status-blocked-solid';
  } else if (elapsedSec >= 15) {
    statusLevel = 'latent';
    badgeClasses = 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30';
    dotClasses = 'bg-amber-500';
  }

  return (
    <div
      className={`flex items-center space-x-1.5 px-2 py-0.5 sm:py-1 rounded-sm text-[10px] sm:text-xs font-mono font-medium border transition-colors select-none shadow-xs ${badgeClasses} ${className}`}
      title={`Live state telemetry synchronizing. Last updated ${elapsedSec}s ago.`}
      aria-live="polite"
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${dotClasses}`} />
      <Activity className="w-3 h-3 shrink-0 opacity-75 hidden sm:inline" />
      <span className="truncate">
        {compact ? (
          `Live (${elapsedSec}s)`
        ) : (
          <>
            <span className="hidden md:inline">Telemetry: </span>
            {statusLevel === 'fresh' && <span>Live ({elapsedSec}s ago)</span>}
            {statusLevel === 'latent' && <span>Latent ({elapsedSec}s ago)</span>}
            {statusLevel === 'stale' && (
              <span>Stale ({Math.floor(elapsedSec / 60)}m ago)</span>
            )}
          </>
        )}
      </span>
    </div>
  );
};
