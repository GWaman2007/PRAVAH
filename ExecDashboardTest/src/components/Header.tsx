import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  RotateCcw, 
  CloudLightning, 
  FileText, 
  Search, 
  Layers, 
  BellRing,
  Radio
} from 'lucide-react';
import { useLogistics } from '../context/LogisticsContext';
import { NerState } from '../types/dashboard';

interface HeaderProps {
  onOpenBriefing: () => void;
}

const NER_STATES: NerState[] = [
  'Assam',
  'Arunachal Pradesh',
  'Meghalaya',
  'Manipur',
  'Mizoram',
  'Nagaland',
  'Sikkim',
  'Tripura'
];

export const Header: React.FC<HeaderProps> = ({ onOpenBriefing }) => {
  const { 
    selectedState, 
    setSelectedState, 
    searchQuery, 
    setSearchQuery, 
    simulateMonsoonCloudburst, 
    resetSimulation,
    metrics
  } = useLogistics();

  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format as IST time
      const timeStr = now.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      const dateStr = now.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      setCurrentTime(`${dateStr} • ${timeStr} IST`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-slate-800 bg-[#0c1220]/90 backdrop-blur-md sticky top-0 z-40 px-4 py-2.5 transition-all">
      <div className="max-w-[1920px] mx-auto flex flex-wrap items-center justify-between gap-3">
        
        {/* Left: Ministry Branding & Live Indicator */}
        <div className="flex items-center gap-3.5">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-800 border border-emerald-500/40 shadow-lg shadow-emerald-950/40">
            <Radio className="w-5 h-5 text-emerald-100 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-800/60">
                GOVERNMENT OF INDIA
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                MDoNER / LOGISTICS COMMAND
              </span>
            </div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Central Executive Logistics Bottleneck & District Accessibility Dashboard
              <span className="hidden xl:inline-block text-xs font-normal text-slate-400 font-mono">
                [NER-GEO-OPS v4.2]
              </span>
            </h1>
          </div>
        </div>

        {/* Center: Live Time, Alerts & Search */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Live IST Clock */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-300">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>{currentTime || 'Loading IST...'}</span>
          </div>

          {/* Quick Active Emergency Ticker */}
          {metrics.isolatedDistrictsCount > 0 ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-950/80 border border-red-800/80 text-xs text-red-200 font-medium animate-pulse">
              <BellRing className="w-3.5 h-3.5 text-red-400" />
              <span>{metrics.isolatedDistrictsCount} Districts Cut Off</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-950/60 border border-emerald-800/60 text-xs text-emerald-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>All 8 NER States Reachable</span>
            </div>
          )}

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search district, highway (e.g. NH-27)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900/90 border border-slate-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 w-48 lg:w-60 transition"
            />
          </div>
        </div>

        {/* Right: State Selector & Simulation Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* State Filter */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-md px-2.5 py-1 text-xs">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">State:</span>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value as 'ALL' | NerState)}
              aria-label="Filter by North East India State"
              className="bg-transparent text-slate-200 text-xs font-medium focus:outline-none cursor-pointer pr-1"
            >
              <option value="ALL" className="bg-slate-900 text-white">All 8 NER States (Pan-NER)</option>
              {NER_STATES.map((st) => (
                <option key={st} value={st} className="bg-slate-900 text-white">
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Simulate Monsoon Cloudburst */}
          <button
            onClick={simulateMonsoonCloudburst}
            title="Simulate severe monsoon cloudburst triggering rockfalls & route blockages"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-950/70 hover:bg-amber-900/90 text-amber-200 border border-amber-800/80 text-xs font-medium transition active:scale-95 shadow-sm"
          >
            <CloudLightning className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Simulate Monsoon Surge</span>
          </button>

          {/* Reset Simulation */}
          <button
            onClick={resetSimulation}
            title="Reset simulation back to initial operational state"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {/* Briefing Mode / Export */}
          <button
            onClick={onOpenBriefing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold shadow-md shadow-emerald-950/50 transition active:scale-95"
          >
            <FileText className="w-3.5 h-3.5 text-white" />
            <span>Executive Briefing</span>
          </button>
        </div>

      </div>
    </header>
  );
};
