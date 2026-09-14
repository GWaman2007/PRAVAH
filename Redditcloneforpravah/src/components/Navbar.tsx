import React from 'react';
import { 
  Radio, 
  Wifi, 
  WifiOff, 
  Plus, 
  Search, 
  Database, 
  RotateCcw, 
  MapPin
} from 'lucide-react';

interface NavbarProps {
  isEffectiveOnline: boolean;
  isSimulatedOffline: boolean;
  toggleSimulatedOffline: () => void;
  pendingCount: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onOpenCreateModal: () => void;
  onOpenQueueDrawer: () => void;
  onResetData: () => void;
  currentMobileTab: 'feed' | 'map';
  setCurrentMobileTab: (tab: 'feed' | 'map') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isEffectiveOnline,
  isSimulatedOffline,
  toggleSimulatedOffline,
  pendingCount,
  searchQuery,
  setSearchQuery,
  onOpenCreateModal,
  onOpenQueueDrawer,
  onResetData,
  currentMobileTab,
  setCurrentMobileTab,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Brand & Subreddit Tag */}
        <div className="flex items-center gap-2.5 min-w-max">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-md shadow-orange-500/20 text-white font-black text-xl border border-orange-400/30">
            <Radio className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-orange-200 bg-clip-text text-transparent">
                PRAVAH
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                NER Log
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono hidden sm:block">
              r/NorthEast-Corridors • Crowd Verification
            </p>
          </div>
        </div>

        {/* Global Search Bar (Reddit style) */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search corridors, highways (NH-29, NH-10), landslides, towns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-full pl-9 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs px-1"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Right Controls: Network Status, Offline Simulation Toggle, Queue, & Action */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Mobile view toggle tab (Feed vs Map) */}
          <div className="lg:hidden flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setCurrentMobileTab('feed')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                currentMobileTab === 'feed'
                  ? 'bg-orange-500 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Feed
            </button>
            <button
              onClick={() => setCurrentMobileTab('map')}
              className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1 transition-all ${
                currentMobileTab === 'map'
                  ? 'bg-orange-500 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MapPin className="w-3 h-3" />
              Map
            </button>
          </div>

          {/* DevTools Simulate Offline Toggle */}
          <button
            onClick={toggleSimulatedOffline}
            title={isSimulatedOffline ? "Turn Off Simulated Offline (Auto-Sync)" : "Simulate Offline Mode (Test Queue)"}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              isSimulatedOffline
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {isSimulatedOffline ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Offline Sim:</span>
                <span className="font-bold text-amber-400">ON</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Offline Sim:</span>
                <span className="text-slate-400">OFF</span>
              </>
            )}
          </button>

          {/* Persistent Network Status Chip */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-sm ${
              isEffectiveOnline
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                : 'bg-rose-950/60 text-rose-400 border-rose-500/40'
            }`}
          >
            <span className="relative flex h-2 w-2">
              {isEffectiveOnline && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isEffectiveOnline ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              ></span>
            </span>
            <span className="hidden md:inline">
              {isEffectiveOnline ? 'Online (Live Sync)' : 'Offline (Local Queue)'}
            </span>
            <span className="md:hidden">
              {isEffectiveOnline ? 'Live' : 'Offline'}
            </span>
          </div>

          {/* Offline Queue Inspector Button */}
          <button
            onClick={onOpenQueueDrawer}
            title="Inspect Offline Sync Queue"
            className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <Database className="w-4 h-4" />
            {pendingCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-slate-950 shadow-sm animate-bounce">
                {pendingCount}
              </span>
            )}
          </button>

          {/* Reset Mock Seed Data */}
          <button
            onClick={onResetData}
            title="Reset to fresh seed incidents"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors hidden xl:block"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* "+ Report Disruption" Primary CTA */}
          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-orange-600/30 border border-orange-400/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Report Disruption</span>
          </button>

        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="p-2 px-3 bg-slate-900 border-t border-slate-800 md:hidden">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search corridors (NH-29, NH-10), landslides, towns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-full pl-9 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-orange-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs px-1"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
