import React, { useState } from 'react';
import {
  Layers,
  ChevronDown,
  ChevronUp,
  Info,
  Navigation,
  CloudRain,
  AlertTriangle,
  Radio,
  ShieldAlert,
} from 'lucide-react';

export const MapLegend: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="absolute bottom-3 sm:bottom-4 left-2 sm:left-4 z-20 select-none max-w-[calc(100vw-16px)]">
      {/* Toggle Pill */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md bg-surface/90 dark:bg-slate-900/90 backdrop-blur-md border border-border text-text-primary text-[11px] sm:text-xs font-semibold shadow-lg hover:bg-surface transition-all cursor-pointer ring-1 ring-border/50"
      >
        <Layers className="w-3.5 h-3.5 text-primary" />
        <span>Tactical Legend</span>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-text-secondary" /> : <ChevronUp className="w-3.5 h-3.5 text-text-secondary" />}
      </button>

      {/* Expanded Legend Drawer */}
      {isOpen && (
        <div className="mt-2 w-[calc(100vw-24px)] sm:w-80 max-h-[65vh] overflow-y-auto custom-scrollbar bg-surface/95 dark:bg-slate-900/95 backdrop-blur-xl border border-border rounded-md shadow-2xl p-3 sm:p-3.5 space-y-3 text-xs animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between border-b border-border/70 pb-2">
            <span className="font-bold uppercase tracking-wider text-[11px] text-text-primary flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-primary" />
              <span>Map Symbology Guide</span>
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-text-tertiary hover:text-text-primary text-[11px] cursor-pointer"
            >
              Close
            </button>
          </div>

          {/* Section 1: Fleet Vehicle Telemetry */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">
              1. Fleet Convoys &amp; Heading
            </span>
            <div className="grid grid-cols-1 gap-1 text-[11px]">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-xs bg-[#1B4B73] border border-white flex items-center justify-center text-white text-[9px] font-bold shrink-0 shadow-xs">
                  ➤
                </div>
                <div>
                  <span className="font-medium text-text-primary">Active Convoy Vehicle</span>
                  <span className="text-text-tertiary block text-[10px]">Arrow rotates to live compass bearing direction</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-xs bg-[#E06D10] border border-white flex items-center justify-center text-white text-[9px] font-bold shrink-0 shadow-xs">
                  ➤
                </div>
                <div>
                  <span className="font-medium text-text-primary">Dead-Reckoning (Cellular Blackout)</span>
                  <span className="text-text-tertiary block text-[10px]">Extrapolating speed &amp; distance inside dead-zone</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-xs bg-[#B3261E] border border-white flex items-center justify-center text-white text-[9px] font-bold shrink-0 shadow-xs animate-pulse">
                  ➤
                </div>
                <div>
                  <span className="font-medium text-status-blocked-text font-bold">Emergency SOS / Critical Halt</span>
                  <span className="text-text-tertiary block text-[10px]">Cabin distress beacon activated</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Choke Point Rainfall Weather Stations */}
          <div className="space-y-1.5 border-t border-border/60 pt-2">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">
              2. Mountain Choke Point Rainfall (mm/h)
            </span>
            <div className="grid grid-cols-1 gap-1 text-[11px]">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[#5B6066] border border-white flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-xs">
                  0
                </div>
                <div>
                  <span className="font-medium text-text-primary">Clear / Dry (0 mm/h)</span>
                  <span className="text-text-tertiary block text-[10px]">Normal mountain pass conditions</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[#2E7D46] border border-white flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-xs">
                  3
                </div>
                <div>
                  <span className="font-medium text-text-primary">Light Rain (1–5 mm/h)</span>
                  <span className="text-text-tertiary block text-[10px]">Passable with standard mountain caution</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[#D2691E] border border-white flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-xs">
                  12
                </div>
                <div>
                  <span className="font-medium text-status-highrisk-text font-semibold">Moderate Downpour (5–15 mm/h)</span>
                  <span className="text-text-tertiary block text-[10px]">Soil saturation alert; axle weight restrictions</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[#D92D20] border border-white flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-xs animate-pulse">
                  28
                </div>
                <div>
                  <span className="font-medium text-status-blocked-text font-bold">Cloudburst / High Landslide Risk (&gt;15 mm/h)</span>
                  <span className="text-text-tertiary block text-[10px]">Pulsing alert: imminent mudflow cutoff threat</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Hazard Polygons & Route Lines */}
          <div className="space-y-1.5 border-t border-border/60 pt-2">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">
              3. Hazard Zonation &amp; Corridors
            </span>
            <div className="grid grid-cols-1 gap-1 text-[11px]">
              <div className="flex items-center gap-2">
                <div className="w-5 h-3 rounded-xs bg-red-600/30 border border-red-500 shrink-0" />
                <span className="text-text-primary">ISRO Bhuvan Very High Landslide Susceptibility (LHZ) / IMD Red Alert</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-5 h-3 rounded-xs bg-amber-600/30 border border-amber-500 shrink-0" />
                <span className="text-text-primary">High Landslide Susceptibility (LHZ) / IMD Orange Alert</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-5 h-0.5 bg-[#1B4B73] shrink-0" />
                <span className="text-text-primary">Recommended Clearance-Verified Route</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-5 h-0.5 border-b-2 border-dashed border-red-500 shrink-0" />
                <span className="text-text-primary">Impassable Blockage / Landslide Debris</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-5 h-3 rounded-xs bg-slate-700/40 border border-dashed border-slate-400 shrink-0" />
                <span className="text-text-primary">Cellular Blackout Zone (Dead-Reckoning)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
