import React from 'react';
import { useSimulation } from '../context/SimulationContext';
import { ShieldAlert, Activity, Navigation, CloudRain, RotateCcw, Truck, MapPin } from 'lucide-react';
import { PRESET_CORRIDORS } from '../data/nerGraphData';

export const Header: React.FC = () => {
  const {
    originNode,
    destinationNode,
    selectedVehicle,
    rainfallMmHr,
    activeDisruptionCount,
    candidateRoutes,
    clearAllDisruptions,
    setCorridorPreset,
    originId,
    destinationId,
  } = useSimulation();

  const passableCount = candidateRoutes.filter(r => r.isPassable).length;

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 sticky top-0 z-30">
      <div className="max-w-[1720px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Left Title & System Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
            <Navigation className="w-5 h-5 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white m-0">
                NER Dynamic GIS Corridor Rerouting
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Yen's K-5 Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span>North East India Multi-Factor Disaster Rerouting</span>
              <span className="inline-block w-1 h-1 rounded-full bg-slate-600"></span>
              <span className="text-slate-300 font-mono">Bhuvan LHZ + Bridge Constraints</span>
            </p>
          </div>
        </div>

        {/* Quick Corridor Presets */}
        <div className="hidden lg:flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-lg border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 px-2 uppercase tracking-wider">Presets:</span>
          {PRESET_CORRIDORS.slice(0, 3).map(preset => {
            const isActive = originId === preset.origin && destinationId === preset.destination;
            return (
              <button
                key={preset.id}
                onClick={() => setCorridorPreset(preset.origin, preset.destination)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {preset.label.split('(')[0].trim()}
              </button>
            );
          })}
        </div>

        {/* Telemetry Status Bar */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* Active Corridor */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-200">
            <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="font-semibold text-white">{originNode.name.split(' ')[0]}</span>
            <span className="text-slate-500">➔</span>
            <span className="font-semibold text-white">{destinationNode.name.split(' ')[0]}</span>
          </div>

          {/* Vehicle Profile Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-200">
            <Truck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-slate-300">{selectedVehicle.name.split('/')[0]}</span>
            <span className="font-mono text-amber-300 font-semibold text-[11px] bg-amber-500/10 px-1 rounded">
              {selectedVehicle.weight_tonnes}T
            </span>
          </div>

          {/* Rain Telemetry */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-200">
            <CloudRain className={`w-3.5 h-3.5 ${rainfallMmHr > 25 ? 'text-amber-400 animate-bounce' : 'text-blue-400'} shrink-0`} />
            <span className="font-mono font-medium">{rainfallMmHr} mm/h</span>
          </div>

          {/* Route Status Pill */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${
            passableCount > 0
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
            <Activity className="w-3.5 h-3.5 shrink-0" />
            <span>
              <strong className="font-mono">{passableCount}</strong>/5 Routes Clear
            </span>
          </div>

          {/* Disruption Alert Pill */}
          {activeDisruptionCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 animate-pulse">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>{activeDisruptionCount} Active Disruption{activeDisruptionCount > 1 ? 's' : ''}</span>
            </div>
          )}

          {/* Quick Clear Disruptions */}
          {activeDisruptionCount > 0 && (
            <button
              onClick={clearAllDisruptions}
              title="Clear all active disruptions"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
