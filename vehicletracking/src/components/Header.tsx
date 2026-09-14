import React from 'react';
import { useSimulation } from '../context/SimulationContext';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Radio,
  WifiOff,
  AlertTriangle,
  ShieldAlert,
  Compass,
  Satellite,
  Truck,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    isPlaying,
    togglePlay,
    speedMultiplier,
    setSpeedMultiplier,
    stepForward,
    resetSimulation,
    stats,
    vehicles,
    selectedVehicleId,
    focusVehicle,
  } = useSimulation();

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white px-4 py-3 sticky top-0 z-40 shadow-xl select-none">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* Title & Operations Branding */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/40 text-emerald-400 shadow-inner">
            <Compass className="w-6 h-6 animate-[spin_12s_linear_infinite]" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-100 font-display">
                NER Smart Logistics
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                LIVE GIS TELEMETRY
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Live Convoy Command, Mountain Dead-Reckoning & Geofence Anomaly Engine
            </p>
          </div>
        </div>

        {/* Fleet KPI Telemetry Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Active Online GPS */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/60 border border-emerald-500/30 text-emerald-400 shadow-sm">
            <div className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </div>
            <Satellite className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-medium text-slate-300">Live GPS:</span>
            <span className="text-xs font-bold font-mono text-emerald-300">
              {stats.activeCount} / 3
            </span>
          </div>

          {/* Dead-Reckoning Extrapolating */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/60 border transition-all ${
              stats.deadReckoningCount > 0
                ? 'border-amber-500/60 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)] bg-amber-950/20'
                : 'border-slate-800 text-slate-400'
            }`}
          >
            <Radio
              className={`w-3.5 h-3.5 ${
                stats.deadReckoningCount > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-500'
              }`}
            />
            <span className="text-xs font-medium text-slate-300">Dead-Reckoning:</span>
            <span
              className={`text-xs font-bold font-mono ${
                stats.deadReckoningCount > 0 ? 'text-amber-400' : 'text-slate-400'
              }`}
            >
              {stats.deadReckoningCount} OFFLINE
            </span>
          </div>

          {/* Critical / Anomaly Alert Count */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/60 border transition-all ${
              stats.anomalyCount > 0
                ? 'border-rose-500/70 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)] bg-rose-950/30'
                : 'border-slate-800 text-slate-400'
            }`}
          >
            <AlertTriangle
              className={`w-3.5 h-3.5 ${
                stats.anomalyCount > 0 ? 'text-rose-400 animate-bounce' : 'text-slate-500'
              }`}
            />
            <span className="text-xs font-medium text-slate-300">Anomalies:</span>
            <span
              className={`text-xs font-bold font-mono ${
                stats.anomalyCount > 0 ? 'text-rose-400' : 'text-slate-400'
              }`}
            >
              {stats.anomalyCount}
            </span>
          </div>
        </div>

        {/* Simulation Controls & Speed Multipliers */}
        <div className="flex items-center gap-2">
          {/* Play / Pause Toggle */}
          <button
            onClick={togglePlay}
            title={isPlaying ? 'Pause Simulation (Space)' : 'Resume Simulation (Space)'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-all shadow-md active:scale-95 cursor-pointer ${
              isPlaying
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-900/40'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play</span>
              </>
            )}
          </button>

          {/* Step Forward */}
          <button
            onClick={() => stepForward(5)}
            title="Step Forward +5s"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
          >
            <FastForward className="w-4 h-4" />
          </button>

          {/* Speed Multipliers */}
          <div className="flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
            {[1, 2, 5, 10].map((multiplier) => (
              <button
                key={multiplier}
                onClick={() => setSpeedMultiplier(multiplier)}
                className={`px-2 py-1 text-xs font-mono font-medium rounded-md transition cursor-pointer ${
                  speedMultiplier === multiplier
                    ? 'bg-emerald-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {multiplier}x
              </button>
            ))}
          </div>

          {/* Reset Simulation */}
          <button
            onClick={resetSimulation}
            title="Reset Fleet to Origins"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-500/50 transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Convoy Quick Selection Strip */}
      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto pb-0.5">
        <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider whitespace-nowrap">
          Quick Convoy Focus:
        </span>
        {Object.values(vehicles).map((v) => {
          const isSelected = selectedVehicleId === v.vehicle_id;
          const isDR = v.status === 'DEAD_ZONE_EXTRAPOLATING';
          const isDeviated = v.status === 'DEVIATED';
          const isSOS = v.status === 'SOS_ALERT';
          const isStationary = v.status === 'CRITICAL_STATIONARY';

          let statusBadgeColor = 'bg-emerald-500';
          let statusText = `${v.speed_kmh} km/h`;
          if (isSOS) {
            statusBadgeColor = 'bg-rose-500 animate-ping';
            statusText = 'SOS PANIC';
          } else if (isStationary) {
            statusBadgeColor = 'bg-rose-500';
            statusText = 'STATIONARY';
          } else if (isDeviated) {
            statusBadgeColor = 'bg-rose-400';
            statusText = `DEVIATED (+${v.deviation_distance_m}m)`;
          } else if (isDR) {
            statusBadgeColor = 'bg-amber-400 animate-pulse';
            statusText = 'DR EXTRAPOLATING';
          }

          return (
            <button
              key={v.vehicle_id}
              onClick={() => focusVehicle(v.vehicle_id)}
              className={`flex items-center gap-2 px-2.5 py-1 rounded-md text-xs transition cursor-pointer whitespace-nowrap ${
                isSelected
                  ? 'bg-slate-800 text-white border border-emerald-500/60 shadow-sm'
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800/80 hover:bg-slate-850'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${statusBadgeColor}`} />
                <Truck className="w-3.5 h-3.5 text-slate-300" />
                <span className="font-semibold text-slate-200">{v.vehicle_name.split(' ')[0]}</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                ({statusText})
              </span>
              <span className="text-[10px] px-1 rounded bg-slate-900 text-slate-400 font-mono">
                {v.route_progress_pct}%
              </span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
