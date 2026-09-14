import React from 'react';
import { Flame, Sparkles, AlertOctagon, Filter } from 'lucide-react';

export type FeedSortOption = 'Hot' | 'New' | 'Critical';

interface CorridorFilterBarProps {
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  sortBy: FeedSortOption;
  setSortBy: (sort: FeedSortOption) => void;
  totalCount: number;
  criticalCount: number;
}

const CORRIDOR_TAGS = [
  { id: 'ALL', label: 'All Corridors' },
  { id: 'r/NH-29-Nagaland', label: 'r/NH-29-Nagaland' },
  { id: 'r/NH-10-Sikkim', label: 'r/NH-10-Sikkim' },
  { id: 'r/East-Khasi-Hills', label: 'r/East-Khasi-Hills' },
  { id: 'r/Assam-DimaHasao', label: 'r/Assam-DimaHasao' },
  { id: 'r/Mizoram-NH-306', label: 'r/Mizoram-NH-306' },
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
    <div className="bg-surface border border-border rounded-md p-3.5 space-y-3 shadow-xs">
      {/* Top row: Sort controls and counters */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Sort Tabs: Hot, New, Critical */}
        <div className="flex items-center gap-1 bg-surface-subtle p-1 rounded-sm border border-border text-xs">
          <button
            onClick={() => setSortBy('Hot')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xs font-semibold transition-all cursor-pointer ${
              sortBy === 'Hot'
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${sortBy === 'Hot' ? 'text-amber-500 fill-amber-500/30' : ''}`} />
            <span>Hot</span>
          </button>

          <button
            onClick={() => setSortBy('New')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xs font-semibold transition-all cursor-pointer ${
              sortBy === 'New'
                ? 'bg-primary-tint text-primary border border-primary/30 shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>New</span>
          </button>

          <button
            onClick={() => setSortBy('Critical')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xs font-semibold transition-all cursor-pointer ${
              sortBy === 'Critical'
                ? 'bg-status-blocked-tint text-status-blocked-text border border-status-blocked-solid shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5 text-status-blocked-text" />
            <span>Critical</span>
            {criticalCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 text-[10px] font-bold rounded-xs bg-status-blocked-solid text-white">
                {criticalCount}
              </span>
            )}
          </button>
        </div>

        {/* Counter Summary badge */}
        <div className="text-xs text-text-secondary flex items-center gap-2 font-mono">
          <span>{totalCount} active report{totalCount === 1 ? '' : 's'}</span>
          {criticalCount > 0 && (
            <span className="flex items-center gap-1 text-status-blocked-text font-medium font-sans">
              <span className="w-1.5 h-1.5 rounded-full bg-status-blocked-solid animate-ping"></span>
              {criticalCount} Total Blockages
            </span>
          )}
        </div>
      </div>

      {/* Corridor Flair Pills (Horizontal scrollable) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <div className="flex items-center gap-1 text-text-secondary font-mono text-[11px] pr-1 select-none shrink-0">
          <Filter className="w-3 h-3" />
          <span>Flair:</span>
        </div>

        {CORRIDOR_TAGS.map((tag) => {
          const isActive = activeFilter === tag.id;
          return (
            <button
              key={tag.id}
              onClick={() => setActiveFilter(tag.id)}
              className={`whitespace-nowrap px-2.5 py-1 rounded-sm text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-primary text-white font-semibold shadow-xs'
                  : 'bg-surface-subtle text-text-secondary hover:text-text-primary hover:bg-border/60 border border-border'
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
