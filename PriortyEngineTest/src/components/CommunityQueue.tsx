import React from 'react';
import { 
  AlertOctagon, 
  Clock, 
  Flame, 
  Search, 
  ChevronRight, 
  AlertCircle,
  TrendingDown
} from 'lucide-react';
import type { EnrichedCommunity, PriorityTier } from '../types';

interface CommunityQueueProps {
  communities: EnrichedCommunity[];
  selectedId: string;
  onSelectCommunity: (id: string) => void;
  filterTier: 'ALL' | PriorityTier;
  onFilterTierChange: (tier: 'ALL' | PriorityTier) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const CommunityQueue: React.FC<CommunityQueueProps> = ({
  communities,
  selectedId,
  onSelectCommunity,
  filterTier,
  onFilterTierChange,
  searchQuery,
  onSearchChange,
}) => {
  // Filter communities
  const filtered = communities.filter((c) => {
    const matchesTier = filterTier === 'ALL' || c.priorityTier === filterTier;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      c.state.toLowerCase().includes(q) ||
      c.district.toLowerCase().includes(q) ||
      c.primaryCorridorName.toLowerCase().includes(q);

    return matchesTier && matchesSearch;
  });

  const getTierStyles = (tier: PriorityTier) => {
    switch (tier) {
      case 'P1':
        return {
          pill: 'bg-red-950/80 border-red-500 text-red-300',
          indicator: 'bg-red-500',
          border: 'border-red-500/40 hover:border-red-400',
          selectedBorder: 'border-red-500 ring-2 ring-red-500/30 bg-red-950/20',
          scoreColor: 'text-red-400',
        };
      case 'P2':
        return {
          pill: 'bg-amber-950/80 border-amber-500/80 text-amber-300',
          indicator: 'bg-amber-500',
          border: 'border-amber-500/30 hover:border-amber-400',
          selectedBorder: 'border-amber-500 ring-2 ring-amber-500/30 bg-amber-950/20',
          scoreColor: 'text-amber-400',
        };
      case 'P3':
        return {
          pill: 'bg-yellow-950/80 border-yellow-600/70 text-yellow-300',
          indicator: 'bg-yellow-500',
          border: 'border-yellow-600/30 hover:border-yellow-500',
          selectedBorder: 'border-yellow-500 ring-2 ring-yellow-500/30 bg-yellow-950/20',
          scoreColor: 'text-yellow-400',
        };
      case 'P4':
        return {
          pill: 'bg-emerald-950/80 border-emerald-600/70 text-emerald-300',
          indicator: 'bg-emerald-500',
          border: 'border-emerald-600/30 hover:border-emerald-500',
          selectedBorder: 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-950/20',
          scoreColor: 'text-emerald-400',
        };
    }
  };

  return (
    <div className="flex flex-col h-full glass-panel rounded-2xl border-slate-800/80 overflow-hidden shadow-xl">
      {/* Header & Controls */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/60 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-rose-400" />
            <h2 className="font-semibold text-white tracking-wide text-sm font-display uppercase">
              Ranked Priority Queue
            </h2>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
            {filtered.length} nodes
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search code, name, state..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs no-scrollbar">
          {(['ALL', 'P1', 'P2', 'P3', 'P4'] as const).map((tier) => {
            const count =
              tier === 'ALL'
                ? communities.length
                : communities.filter((c) => c.priorityTier === tier).length;
            const isActive = filterTier === tier;

            return (
              <button
                key={tier}
                onClick={() => onFilterTierChange(tier)}
                className={`px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 font-semibold shadow'
                    : 'bg-slate-800/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span>{tier}</span>
                <span
                  className={`text-[10px] px-1 py-0.2 rounded-full ${
                    isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-900 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Community List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 space-y-2">
            <AlertCircle className="w-6 h-6 mx-auto text-slate-600" />
            <p>No communities match current criteria.</p>
          </div>
        ) : (
          filtered.map((comm, index) => {
            const styles = getTierStyles(comm.priorityTier);
            const isSelected = comm.id === selectedId;
            const crit = comm.commodityDepletions[comm.criticalCommodity];
            const isP1 = comm.priorityTier === 'P1';

            return (
              <div
                key={comm.id}
                onClick={() => onSelectCommunity(comm.id)}
                className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                  isSelected
                    ? styles.selectedBorder
                    : `bg-slate-900/40 ${styles.border} hover:bg-slate-900/70`
                } ${isP1 ? 'animate-siren' : ''}`}
              >
                {/* Top row: Rank, Code, Name, Tier Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-[10px] font-mono text-slate-300 font-bold">
                      {index + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-bold text-white group-hover:text-cyan-300 transition">
                          {comm.id}
                        </span>
                        <span className="text-[10px] text-slate-400">|</span>
                        <span className="text-xs font-medium text-slate-200">
                          {comm.name}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <span>{comm.district}, {comm.state}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tier pill */}
                  <div
                    className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border shadow-sm ${styles.pill}`}
                  >
                    {isP1 && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />}
                    <span>{comm.priorityTier}</span>
                  </div>
                </div>

                {/* Score & Dispatch Window Metrics Row */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/60 grid grid-cols-2 gap-2 text-xs">
                  {/* Final Score */}
                  <div className="bg-slate-950/60 rounded-lg p-1.5 border border-slate-800/50">
                    <span className="text-[10px] text-slate-400 block font-mono">PRIORITY SCORE</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className={`text-base font-bold font-mono ${styles.scoreColor}`}>
                        {comm.finalScore.toFixed(3)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">/ 1.000</span>
                    </div>
                  </div>

                  {/* Dispatch Window Countdown */}
                  <div
                    className={`rounded-lg p-1.5 border ${
                      comm.actionableDispatchWindow <= 0
                        ? 'bg-red-950/40 border-red-500/40 text-red-300'
                        : comm.actionableDispatchWindow <= 3.0
                        ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                        : 'bg-slate-950/60 border-slate-800/50 text-slate-300'
                    }`}
                  >
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                      <Clock className="w-2.5 h-2.5" />
                      DISPATCH WINDOW
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5 font-bold font-mono">
                      {comm.actionableDispatchWindow <= 0 ? (
                        <span className="text-red-400 text-xs font-bold">CLOSED (0.0h)</span>
                      ) : (
                        <>
                          <span className="text-base">{comm.actionableDispatchWindow.toFixed(1)}h</span>
                          <span className="text-[10px] opacity-80">viable</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Tags: Single Corridor Alert & Critical Depleting Commodity */}
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                  {/* Single Access Corridor */}
                  {comm.ingressRouteCount <= 1 && (
                    <span className="px-1.5 py-0.5 rounded bg-purple-950/90 border border-purple-500/50 text-purple-300 font-medium flex items-center gap-1">
                      <AlertOctagon className="w-2.5 h-2.5 text-purple-400" />
                      Single-Access Corridor
                    </span>
                  )}

                  {/* Critical Commodity Chip */}
                  <span
                    className={`px-1.5 py-0.5 rounded border font-mono flex items-center gap-1 ${
                      crit.timeToExhaustHours <= comm.cutoffTimeHours
                        ? 'bg-red-950/80 border-red-500/50 text-red-300 font-semibold'
                        : crit.timeToExhaustHours <= comm.cutoffTimeHours + 48
                        ? 'bg-amber-950/80 border-amber-500/50 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    <TrendingDown className="w-2.5 h-2.5" />
                    {comm.criticalCommodity}: {crit.timeToExhaustHours.toFixed(1)}h to zero
                  </span>
                </div>

                {/* Active Indicator Chevron */}
                {isSelected && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 text-cyan-400">
                    <ChevronRight className="w-5 h-5 animate-pulse" />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
