import React from 'react';
import { 
  ShieldAlert, 
  RotateCcw, 
  CloudRain, 
  Truck, 
  Zap, 
  Volume2, 
  VolumeX 
} from 'lucide-react';

interface HeaderProps {
  onApplyScenario: (scenario: 'monsoon' | 'flood' | 'restocked') => void;
  onResetAll: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  p1Count: number;
}

export const Header: React.FC<HeaderProps> = ({
  onApplyScenario,
  onResetAll,
  soundEnabled,
  onToggleSound,
  p1Count,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-6 py-3">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        {/* Left: Branding & Status */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20 text-white font-bold text-lg font-display">
            P
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white font-display">
                PRAVAH
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cyan-950 border border-cyan-700/60 text-cyan-300 font-mono">
                ENGINE v3.2
              </span>
              {p1Count > 0 ? (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-950/80 border border-red-500/80 text-red-300 font-medium animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  {p1Count} P1 ACTIVE
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-600/50 text-emerald-300 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  CORRIDORS STABLE
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Preemptive Depletion Run-Rate & Dynamic Dispatch Window Command Console | North-East Grid
            </p>
          </div>
        </div>

        {/* Center/Right: Simulation Preset Scenarios & Actions */}
        <div className="flex flex-wrap items-center gap-2 self-end lg:self-center">
          <div className="hidden sm:flex items-center gap-1 text-xs bg-slate-900 border border-slate-800 rounded-lg p-1 text-slate-300">
            <span className="text-slate-400 px-2 font-medium flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Scenarios:
            </span>
            <button
              onClick={() => onApplyScenario('monsoon')}
              className="px-2.5 py-1 rounded hover:bg-slate-800 text-cyan-300 hover:text-white transition flex items-center gap-1 text-xs font-medium cursor-pointer"
              title="Apply Severe Monsoon Surge with high medical burn"
            >
              <CloudRain className="w-3 h-3 text-cyan-400" />
              Monsoon Surge
            </button>
            <button
              onClick={() => onApplyScenario('flood')}
              className="px-2.5 py-1 rounded hover:bg-slate-800 text-rose-300 hover:text-white transition flex items-center gap-1 text-xs font-medium cursor-pointer"
              title="Simulate rapid corridor cutoff due to flash flood landslides"
            >
              <ShieldAlert className="w-3 h-3 text-rose-400" />
              Imminent Cutoff
            </button>
            <button
              onClick={() => onApplyScenario('restocked')}
              className="px-2.5 py-1 rounded hover:bg-slate-800 text-emerald-300 hover:text-white transition flex items-center gap-1 text-xs font-medium cursor-pointer"
              title="Simulate all nodes restocked and corridors nominal"
            >
              <Truck className="w-3 h-3 text-emerald-400" />
              All Restocked
            </button>
          </div>

          {/* Audio toggle */}
          <button
            onClick={onToggleSound}
            className={`p-2 rounded-lg border text-xs transition cursor-pointer flex items-center gap-1 ${
              soundEnabled
                ? 'bg-slate-800 border-slate-700 text-cyan-300'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
            title={soundEnabled ? 'Emergency Alerts Sound ON' : 'Emergency Alerts Muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Reset button */}
          <button
            onClick={onResetAll}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            Reset Baseline
          </button>
        </div>
      </div>
    </header>
  );
};
