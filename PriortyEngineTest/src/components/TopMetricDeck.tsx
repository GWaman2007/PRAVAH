import React from 'react';
import { 
  Building2, 
  AlertTriangle, 
  Clock, 
  FileText, 
  MapPin
} from 'lucide-react';
import type { EnrichedCommunity } from '../types';

interface TopMetricDeckProps {
  communities: EnrichedCommunity[];
}

export const TopMetricDeck: React.FC<TopMetricDeckProps> = ({ communities }) => {
  const totalCount = communities.length;
  const p1Count = communities.filter((c) => c.priorityTier === 'P1').length;
  const p2Count = communities.filter((c) => c.priorityTier === 'P2').length;
  
  // Closing dispatch windows (< 3.0h)
  const closingWindows = communities.filter(
    (c) => c.actionableDispatchWindow <= 3.0 && c.actionableDispatchWindow > 0
  );
  const closedWindows = communities.filter((c) => c.actionableDispatchWindow === 0);
  const closingCount = closingWindows.length + closedWindows.length;

  // Active requisition indents
  const activeIndentsCount = communities.filter((c) => c.hasActiveIndent).length;

  // Single access ingress corridors
  const singleCorridorsCount = communities.filter((c) => c.ingressRouteCount <= 1).length;

  // States covered
  const stateCounts = communities.reduce((acc, c) => {
    acc[c.state] = (acc[c.state] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 px-4 lg:px-6 py-4">
      {/* 1. Total Monitored Communities */}
      <div className="glass-panel rounded-xl p-4 relative overflow-hidden border-slate-800/80 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Monitored Nodes
          </span>
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Building2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight text-white font-display">
            {totalCount}
          </span>
          <span className="text-xs text-slate-400">Communities</span>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
          <MapPin className="w-3 h-3 text-cyan-400" />
          <span>Assam ({stateCounts['Assam'] || 0})</span>
          <span>•</span>
          <span>Mizoram ({stateCounts['Mizoram'] || 0})</span>
          <span>•</span>
          <span>Sikkim ({stateCounts['Sikkim'] || 0})</span>
        </div>
        <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-cyan-500/5 blur-xl pointer-events-none" />
      </div>

      {/* 2. Critical P1 Cutoff Warnings */}
      <div
        className={`glass-panel rounded-xl p-4 relative overflow-hidden transition-all duration-300 shadow-lg ${
          p1Count > 0
            ? 'border-red-500/50 bg-red-950/20 animate-siren'
            : 'border-slate-800/80'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-red-400 uppercase tracking-wider flex items-center gap-1">
            {p1Count > 0 && <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />}
            Critical P1 Cutoffs
          </span>
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              p1Count > 0
                ? 'bg-red-500/20 border border-red-500/40 text-red-400'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight text-red-400 font-display">
            {p1Count}
          </span>
          <span className="text-xs text-slate-400">
            {p1Count === 1 ? 'Community at risk' : 'Communities at risk'}
          </span>
          {p2Count > 0 && (
            <span className="ml-auto text-xs px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300">
              +{p2Count} P2 High
            </span>
          )}
        </div>
        <div className="mt-3 text-xs text-slate-400 flex items-center justify-between">
          <span>Formula: Score ≥ 0.75</span>
          <span className="text-red-400/90 font-medium">Immediate Preemptive Action</span>
        </div>
        <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-red-500/10 blur-xl pointer-events-none" />
      </div>

      {/* 3. Closing Dispatch Windows (< 3 Hours) */}
      <div
        className={`glass-panel rounded-xl p-4 relative overflow-hidden border-slate-800/80 shadow-lg ${
          closingCount > 0 ? 'border-amber-500/40 bg-amber-950/10' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">
            Closing Dispatch Windows
          </span>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight text-amber-400 font-display">
            {closingCount}
          </span>
          <span className="text-xs text-slate-400">&lt; 3.0h Remaining</span>
          {closedWindows.length > 0 && (
            <span className="ml-auto text-xs px-2 py-0.5 rounded bg-red-950/80 border border-red-500/60 text-red-300 font-medium animate-pulse">
              {closedWindows.length} Cut Off
            </span>
          )}
        </div>
        <div className="mt-3 text-xs text-slate-400 flex items-center justify-between">
          <span>T_window = T_cutoff - T_transit</span>
          <span className="text-amber-400/90 font-medium font-mono">Urgency Boost Active</span>
        </div>
        <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-amber-500/10 blur-xl pointer-events-none" />
      </div>

      {/* 4. Active Requisition Indents & Single Corridor Alerts */}
      <div className="glass-panel rounded-xl p-4 relative overflow-hidden border-slate-800/80 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-indigo-400 uppercase tracking-wider">
            Requisitions & Bottlenecks
          </span>
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <FileText className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight text-white font-display">
            {activeIndentsCount}
          </span>
          <span className="text-xs text-slate-400">Active Indents</span>
          <span className="ml-auto text-xs px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/40 text-purple-300">
            {singleCorridorsCount} Single Corridor
          </span>
        </div>
        <div className="mt-3 text-xs text-slate-400 flex items-center justify-between">
          <span>Indent Term: +0.20 I_vuln</span>
          <span className="text-indigo-300 font-medium">MO Direct Logged</span>
        </div>
        <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-indigo-500/10 blur-xl pointer-events-none" />
      </div>
    </div>
  );
};
