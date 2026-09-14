import React from 'react';
import { 
  X, 
  Database, 
  RefreshCw, 
  CheckCircle2
} from 'lucide-react';
import type { OfflineQueueItem, Incident } from '../types/incident';
import { formatTimeAgo } from '../utils/offlineEngine';

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
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-sm flex justify-end">
      <div className="relative w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl h-full flex flex-col">
        
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">
                Offline Queue Inspector
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                LocalStorage & IndexedDB Engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Network & Simulation Status Card */}
        <div className="p-4 bg-slate-950/70 border-b border-slate-800 text-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Effective Network State:</span>
            <span
              className={`font-bold px-2 py-0.5 rounded-full border text-[11px] ${
                isEffectiveOnline
                  ? 'bg-emerald-950/70 text-emerald-400 border-emerald-500/40'
                  : 'bg-rose-950/70 text-rose-400 border-rose-500/40'
              }`}
            >
              {isEffectiveOnline ? '● Online (Live Sync Active)' : '● Offline (Local Queueing)'}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <div className="space-y-0.5">
              <span className="font-semibold text-slate-200">Simulate Offline Mode</span>
              <p className="text-[10px] text-slate-400">
                Force queueing without disconnecting network
              </p>
            </div>
            <button
              onClick={onToggleSimulatedOffline}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs border transition-all ${
                isSimulatedOffline
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/30'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {isSimulatedOffline ? 'Simulating OFF' : 'Simulating ON'}
            </button>
          </div>

          {/* Pending items counter summary */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Pending Local Incidents:</span>
            <span className="font-mono font-bold text-amber-400">{pendingIncidents.length}</span>
          </div>
        </div>

        {/* Queue Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar text-xs">
          <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
            <span>PENDING OPERATIONS ({queue.length})</span>
            <span>Local Browser Storage</span>
          </div>

          {queue.length === 0 ? (
            <div className="py-12 px-4 text-center border border-dashed border-slate-800 rounded-xl space-y-2 bg-slate-950/40">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="font-bold text-slate-200">Queue is Clear</p>
              <p className="text-[11px] text-slate-400">
                All incident ground reports, votes, and clearance updates are fully synchronized with the central NER registry.
              </p>
            </div>
          ) : (
            queue.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 font-mono text-[11px]"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    {item.action}
                  </span>
                  <span className="text-slate-500 text-[10px]">
                    {formatTimeAgo(item.timestamp)}
                  </span>
                </div>

                <div className="text-slate-300 text-xs font-sans">
                  {item.action === 'CREATE_INCIDENT' && (
                    <div>
                      <p className="font-bold text-slate-100">{item.payload.title}</p>
                      <p className="text-slate-400 text-[11px]">
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

                <div className="text-[10px] text-slate-500 truncate pt-1 border-t border-slate-900">
                  ID: {item.id}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Action Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/95 space-y-2">
          <button
            onClick={onFlushQueue}
            disabled={queue.length === 0 && pendingIncidents.length === 0}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-40 text-white font-bold text-xs shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Force Flush & Synchronize ({queue.length + pendingIncidents.length})</span>
          </button>
          <p className="text-[10px] text-center text-slate-400">
            When online, pending items auto-flush automatically within seconds.
          </p>
        </div>

      </div>
    </div>
  );
};
