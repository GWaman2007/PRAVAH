import React from 'react';
import { CheckCircle2, X } from 'lucide-react';
import type { SyncNotification } from '../utils/offlineEngine';

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
          className="pointer-events-auto bg-slate-900/95 border border-emerald-500/50 rounded-xl p-3 shadow-2xl shadow-emerald-950/40 text-slate-100 flex items-start gap-3 backdrop-blur-md animate-in slide-in-from-bottom-3 duration-300"
        >
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <CheckCircle2 className="w-4 h-4" />
          </div>

          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <h5 className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
                <span>Auto-Sync Complete</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                  {n.itemsSynced} synced
                </span>
              </h5>
              <button
                onClick={() => onDismiss(n.id)}
                className="text-slate-400 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[11px] text-slate-300">
              Offline queue successfully flushed and synchronized with central NER incident database.
            </p>

            {n.details.length > 0 && (
              <ul className="text-[10px] text-slate-400 font-mono space-y-0.5 pt-1">
                {n.details.slice(0, 3).map((d, i) => (
                  <li key={i} className="truncate">
                    • {d}
                  </li>
                ))}
                {n.details.length > 3 && (
                  <li className="text-slate-500">
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
