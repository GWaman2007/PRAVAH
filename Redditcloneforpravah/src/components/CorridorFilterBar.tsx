import React from 'react';
import { Flame, Sparkles, AlertOctagon, Filter } from 'lucide-react';
import type { FeedSortOption } from '../types/incident';

interface CorridorFilterBarProps {
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  sortBy: FeedSortOption;
  setSortBy: (sort: FeedSortOption) => void;
  totalCount: number;
  criticalCount: number;
}

const CORRIDOR_TAGS = [
  { id: 'All', label: 'All Corridors' },
  { id: 'NH-29', label: 'r/NH-29-Nagaland' },
  { id: 'NH-10', label: 'r/NH-10-Sikkim' },
  { id: 'Meghalaya', label: 'r/East-Khasi-Hills' },
  { id: 'Assam', label: 'r/Assam-DimaHasao' },
  { id: 'Arunachal', label: 'r/Arunachal-Tawang' },
  { id: 'Manipur', label: 'r/Manipur-NH-37' },
  { id: 'Mizoram', label: 'r/Mizoram-NH-306' },
];

export const CorridorFilterBar: React.FC<CorridorFilterBarProps> = ({
  activeFilter,
  setActiveFilter,
  sortBy,
  setSortBy,
  totalCount,
  criticalCount,
}) => {
  return (
    <div className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 p-3 space-y-3">
      {/* Top row: Sort controls and counters */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        
        {/* Reddit-style Sort Tabs: Hot, New, Critical */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setSortBy('Hot')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
              sortBy === 'Hot'
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${sortBy === 'Hot' ? 'text-orange-400 fill-orange-400/40' : ''}`} />
            Hot
          </button>

          <button
            onClick={() => setSortBy('New')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
              sortBy === 'New'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            New
          </button>

          <button
            onClick={() => setSortBy('Critical')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
              sortBy === 'Critical'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
            <span>Critical</span>
            {criticalCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-rose-500 text-white">
                {criticalCount}
              </span>
            )}
          </button>
        </div>

        {/* Counter Summary badge */}
        <div className="text-xs text-slate-400 flex items-center gap-2">
          <span>{totalCount} active report{totalCount === 1 ? '' : 's'}</span>
          {criticalCount > 0 && (
            <span className="flex items-center gap-1 text-rose-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
              {criticalCount} Total Blockage
            </span>
          )}
        </div>
      </div>

      {/* Corridor Flair Pills (Horizontal scrollable) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        <div className="flex items-center gap-1 text-slate-500 font-mono text-[11px] pr-1 select-none">
          <Filter className="w-3 h-3" />
          <span>Flair:</span>
        </div>

        {CORRIDOR_TAGS.map((tag) => {
          const isActive = activeFilter === tag.id;
          return (
            <button
              key={tag.id}
              onClick={() => setActiveFilter(tag.id)}
              className={`whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                isActive
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20 border border-orange-400 font-semibold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
              }`}
            >
              {tag.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
