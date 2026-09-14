import React from 'react';
import { 
  X, 
  Database, 
  RefreshCw, 
  CheckCircle2,
  Wifi,
  WifiOff
} from 'lucide-react';
import type { Incident, OfflineQueueItem } from '../../types';
import { formatTimeAgo } from '../../engine/offlineSync';

interface OfflineQueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  queue: OfflineQueueItem[];
  pendingIncidents: Incident[];
  isEffectiveOnline: boolean;
  isSimulatedOffline: boolean;
  onToggleSimulatedOffline: () => void;
  onFlushQueue: () => void;
}

export const OfflineQueueDrawer: React.FC<OfflineQueueDrawerProps> = ({
  isOpen,
  onClose,
  queue,
  pendingIncidents,
  isEffectiveOnline,
  isSimulatedOffline,
  onToggleSimulatedOffline,
  onFlushQueue,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-fadeIn">
      <div className="relative w-full max-w-md bg-surface border-l border-border shadow-2xl h-full flex flex-col text-text-primary">
        
        {/* Drawer Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-primary-tint text-primary flex items-center justify-center border border-primary/20">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-text-primary">
                Offline Queue Inspector
              </h3>
              <p className="text-[11px] text-text-secondary font-mono">
                IndexedDB & LocalStorage Resilience Engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-sm text-text-secondary hover:text-text-primary hover:bg-surface border border-transparent hover:border-border"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Network & Simulation Status Card */}
        <div className="p-4 bg-surface-subtle/50 border-b border-border text-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary flex items-center gap-1.5">
              {isEffectiveOnline ? <Wifi className="w-3.5 h-3.5 text-status-open-text" /> : <WifiOff className="w-3.5 h-3.5 text-status-blocked-text" />}
              Effective Network State:
            </span>
            <span
              className={`font-semibold px-2 py-0.5 rounded-sm border text-[11px] ${
                isEffectiveOnline
                  ? 'bg-status-open-tint text-status-open-text border-status-open-solid'
                  : 'bg-status-blocked-tint text-status-blocked-text border-status-blocked-solid'
              }`}
            >
              {isEffectiveOnline ? '● Online (Auto-Sync Active)' : '● Offline (Local Queueing)'}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="space-y-0.5">
              <span className="font-semibold text-text-primary">Simulate Blackout / Tunnel Mode</span>
              <p className="text-[10px] text-text-secondary">
                Force local queueing without disconnecting WiFi
              </p>
            </div>
            <button
              onClick={onToggleSimulatedOffline}
              className={`px-3 py-1.5 rounded-sm font-semibold text-xs border transition-all btn-press ${
                isSimulatedOffline
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-xs'
                  : 'bg-surface text-text-primary border-border hover:bg-surface-subtle'
              }`}
            >
              {isSimulatedOffline ? 'Simulating OFF' : 'Simulating ON'}
            </button>
          </div>

          {/* Pending items counter summary */}
          <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-text-secondary">
            <span>Pending Local Incidents:</span>
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{pendingIncidents.length}</span>
          </div>
        </div>

        {/* Queue Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar text-xs">
          <div className="flex items-center justify-between text-text-secondary font-mono text-[11px]">
            <span>QUEUED OPERATIONS ({queue.length})</span>
            <span>Local Buffer</span>
          </div>

          {queue.length === 0 ? (
            <div className="py-12 px-4 text-center border border-dashed border-border rounded-md space-y-2 bg-surface-subtle/30">
              <CheckCircle2 className="w-8 h-8 text-status-open-solid mx-auto" />
              <p className="font-semibold text-text-primary">Queue is Completely Synchronized</p>
              <p className="text-[11px] text-text-secondary">
                All field reports, upvotes, and road clearance comments are confirmed in central NER registry.
              </p>
            </div>
          ) : (
            queue.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-3 rounded-md bg-surface-subtle border border-border space-y-2 font-mono text-[11px]"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30">
                    {item.action}
                  </span>
                  <span className="text-text-secondary text-[10px]">
                    {formatTimeAgo(item.timestamp)}
                  </span>
                </div>

                <div className="text-text-primary text-xs font-sans">
                  {item.action === 'CREATE_INCIDENT' && (
                    <div>
                      <p className="font-semibold text-text-primary">{item.payload.title}</p>
                      <p className="text-text-secondary text-[11px]">
                        {item.payload.corridorFlair} • {item.payload.severity}
                      </p>
                    </div>
                  )}

                  {item.action === 'VOTE_INCIDENT' && (
                    <p>
                      Cast <strong>{item.payload.voteType?.toUpperCase()}VOTE</strong> on incident{' '}
                      <code>#{item.payload.incidentId?.slice(-6)}</code>
                    </p>
                  )}

                  {item.action === 'ADD_UPDATE' && (
                    <p>
                      Ground status: <em>"{item.payload.message}"</em> by{' '}
                      <strong>{item.payload.author}</strong>
                    </p>
                  )}
                </div>

                <div className="text-[10px] text-text-secondary truncate pt-1 border-t border-border">
                  Operation ID: {item.id}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Action Footer */}
        <div className="p-4 border-t border-border bg-surface-subtle space-y-2">
          <button
            onClick={onFlushQueue}
            disabled={queue.length === 0 && pendingIncidents.length === 0}
            className="w-full py-2.5 rounded-sm bg-[#1B4B73] hover:bg-[#123A5A] dark:bg-[#2E6B9E] disabled:opacity-40 text-white font-semibold text-xs shadow-xs flex items-center justify-center gap-2 transition-all btn-press"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Force Flush & Synchronize ({queue.length + pendingIncidents.length})</span>
          </button>
          <p className="text-[10px] text-center text-text-secondary">
            When online, pending offline records auto-flush upon connectivity restoration.
          </p>
        </div>

      </div>
    </div>
  );
};
