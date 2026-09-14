import React from 'react';
import { CheckCircle2, X } from 'lucide-react';

export interface SyncNotification {
  id: string;
  timestamp: string;
  itemsSynced: number;
  details: string[];
}

interface SyncNotificationToastProps {
  notifications: SyncNotification[];
  onDismiss: (id: string) => void;
}

export const SyncNotificationToast: React.FC<SyncNotificationToastProps> = ({
  notifications,
  onDismiss,
}) => {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-5 left-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {notifications.map((n) => (
        <div
          key={n.id}
          className="pointer-events-auto bg-surface border border-status-open-solid rounded-md p-3.5 shadow-xl text-text-primary flex items-start gap-3 backdrop-blur-xs animate-fadeIn"
        >
          <div className="w-7 h-7 rounded-sm bg-status-open-tint text-status-open-text flex items-center justify-center shrink-0 border border-status-open-solid">
            <CheckCircle2 className="w-4 h-4" />
          </div>

          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <h5 className="font-semibold text-xs text-status-open-text flex items-center gap-1.5">
                <span>Auto-Sync Complete</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-xs bg-status-open-tint text-status-open-text border border-status-open-solid/40">
                  {n.itemsSynced} synced
                </span>
              </h5>
              <button
                onClick={() => onDismiss(n.id)}
                className="text-text-secondary hover:text-text-primary p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[11px] text-text-secondary">
              Offline queue successfully flushed and synchronized with central NER incident database.
            </p>

            {n.details && n.details.length > 0 && (
              <ul className="text-[10px] text-text-secondary font-mono space-y-0.5 pt-1">
                {n.details.slice(0, 3).map((d, i) => (
                  <li key={i} className="truncate">
                    • {d}
                  </li>
                ))}
                {n.details.length > 3 && (
                  <li className="text-text-secondary/70">
                    + {n.details.length - 3} more operations
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
