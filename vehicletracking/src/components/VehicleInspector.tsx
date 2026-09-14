import React from 'react';
import { useSimulation } from '../context/SimulationContext';
import {
  Truck,
  Gauge,
  BatteryCharging,
  Radio,
  WifiOff,
  Navigation,
  Mountain,
  AlertOctagon,
  PowerOff,
  Crosshair,
  RotateCcw,
  Zap,
  Clock,
  Compass,
  MapPin,
  CheckCircle2,
} from 'lucide-react';

export const VehicleInspector: React.FC = () => {
  const {
    selectedVehicle,
    setSelectedVehicleId,
    vehicles,
    toggleDeviation,
    toggleStopBreakdown,
    triggerSOS,
    resetVehicleAnomaly,
    scrubProgress,
    focusVehicle,
    setActiveTab,
  } = useSimulation();

  if (!selectedVehicle) {
    return (
      <div className="p-6 text-center text-slate-500 flex flex-col items-center justify-center h-full">
        <Truck className="w-12 h-12 mb-3 text-slate-700 animate-pulse" />
        <p className="text-sm font-medium text-slate-400">No Vehicle Selected</p>
        <p className="text-xs text-slate-600 mt-1">
          Click a moving convoy marker on the map or select from the fleet header.
        </p>
      </div>
    );
  }

  const v = selectedVehicle;
  const isDR = v.status === 'DEAD_ZONE_EXTRAPOLATING';
  const isDeviated = v.status === 'DEVIATED';
  const isSOS = v.status === 'SOS_ALERT';
  const isStationary = v.status === 'CRITICAL_STATIONARY';

  // Compass cardinal direction
  const getCompassDir = (deg: number) => {
    const val = Math.floor((deg / 22.5) + 0.5);
    const arr = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return arr[val % 16];
  };

  return (
    <div className="bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col h-full overflow-y-auto text-slate-100 select-none">
      {/* Inspector Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/70">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: v.color }}
            />
            <h2 className="font-bold text-base text-white tracking-tight">
              {v.vehicle_name}
            </h2>
          </div>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
            {v.license_plate}
          </span>
        </div>

        <p className="text-xs text-slate-400 font-medium">{v.corridor_name}</p>

        {/* Cargo Priority Tag */}
        <div className="mt-2.5 flex items-center justify-between text-xs bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
          <span className="text-slate-400 font-medium">Cargo Classification:</span>
          <span
            className={`font-semibold font-mono ${
              v.cargo_type === 'Liquid Oxygen (Hazardous)'
                ? 'text-blue-400'
                : v.cargo_type === 'Medical Supplies'
                ? 'text-cyan-400'
                : 'text-emerald-400'
            }`}
          >
            {v.cargo_type}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4 flex-1">
        {/* Connectivity Status Banner */}
        <div
          className={`p-3 rounded-xl border transition-all ${
            isDR
              ? 'bg-amber-950/40 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
              : isSOS
              ? 'bg-rose-950/50 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)] animate-pulse'
              : 'bg-emerald-950/20 border-emerald-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isDR ? (
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </div>
              ) : isSOS ? (
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-90"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
                </div>
              ) : (
                <div className="relative flex h-3 w-3">
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </div>
              )}
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200">
                {isDR
                  ? 'Dead-Reckoning Extrapolation'
                  : isSOS
                  ? 'Emergency Cabin Distress'
                  : isDeviated
                  ? 'Route Deviation Detected'
                  : 'Live GPS Carrier Lock'}
              </span>
            </div>

            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold ${
                isDR
                  ? 'bg-amber-900/60 text-amber-300 border border-amber-500/40'
                  : isSOS
                  ? 'bg-rose-900/80 text-rose-200 border border-rose-400'
                  : 'bg-emerald-900/40 text-emerald-400 border border-emerald-500/40'
              }`}
            >
              {isDR ? 'OFFLINE' : `${v.satellite_count} SATS`}
            </span>
          </div>

          <p className="mt-2 text-[11px] text-slate-300 leading-relaxed">
            {isDR ? (
              <>
                <strong className="text-amber-400">Mountain Gorge Shadow:</strong> Real GPS
                signal is severed. Vehicle position is extrapolated via $Distance = Speed
                \times \Delta t$ along the pre-assigned route.
                <span className="block mt-1 text-amber-300/90 font-mono">
                  Extrapolated: {v.dead_reckoning_distance_m} meters
                </span>
              </>
            ) : isSOS ? (
              <strong className="text-rose-400">
                Cabin SOS beacon active! Driver has reported critical distress or ambush
                threat.
              </strong>
            ) : isDeviated ? (
              <strong className="text-rose-400">
                Cross-track deviation: {v.deviation_distance_m}m from designated corridor
                (Threshold: 500m).
              </strong>
            ) : (
              'Continuous satellite carrier phase telemetry active. High-precision geofencing enabled.'
            )}
          </p>
        </div>

        {/* Speedometer & Gauges Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Speed Gauge Card */}
          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-medium flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                Velocity
              </span>
              <span className="text-[10px] font-mono text-slate-500">Nom: {v.nominal_speed_kmh}</span>
            </div>
            <div className="flex items-baseline gap-1 my-1">
              <span className="text-2xl font-bold font-mono tracking-tight text-white">
                {v.speed_kmh}
              </span>
              <span className="text-xs text-slate-400 font-mono">km/h</span>
            </div>
            {/* Speed bar meter */}
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${Math.min(100, (v.speed_kmh / 80) * 100)}%` }}
              />
            </div>
          </div>

          {/* Heading / Compass Card */}
          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-medium flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                Heading
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                {getCompassDir(v.heading_deg)}
              </span>
            </div>
            <div className="flex items-baseline gap-1 my-1">
              <span className="text-2xl font-bold font-mono tracking-tight text-white">
                {Math.round(v.heading_deg)}°
              </span>
              <span className="text-xs text-slate-400 font-mono">azimuth</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono truncate">
              {v.current_coords[0].toFixed(4)}N, {v.current_coords[1].toFixed(4)}E
            </div>
          </div>

          {/* Elevation Card */}
          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-medium flex items-center gap-1">
                <Mountain className="w-3.5 h-3.5 text-amber-400" />
                Altitude
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold font-mono tracking-tight text-white">
                {v.elevation_m}
              </span>
              <span className="text-xs text-slate-400 font-mono">meters</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">NER Mountain Grade</span>
          </div>

          {/* Battery / Alternator Card */}
          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-medium flex items-center gap-1">
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                Aux Power
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-semibold">24.2V</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold font-mono tracking-tight text-white">
                {v.battery_pct}%
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Alternator Active</span>
          </div>
        </div>

        {/* Route Scrubber & Progress */}
        <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-300 font-medium">Corridor Progress</span>
            <span className="font-mono font-bold text-emerald-400">
              {v.traveled_distance_km} / {v.total_route_distance_km} km ({v.route_progress_pct}%)
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            value={v.route_progress_pct}
            onChange={(e) => scrubProgress(v.vehicle_id, Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />

          <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
            <span>{v.origin_name}</span>
            <span>{v.destination_name}</span>
          </div>
        </div>

        {/* Driver & Cabin Profile */}
        <div className="bg-slate-950/40 border border-slate-800/80 p-3 rounded-xl text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-400">Assigned Driver:</span>
            <span className="font-semibold text-slate-200">{v.driver_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Vehicle Chassis:</span>
            <span className="font-mono text-slate-300">{v.vehicle_model}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Last Telemetry Ping:</span>
            <span className="font-mono text-slate-400">
              {new Date(v.last_ping_time).toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Tactical Anomaly Simulation Controls */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              Live Anomaly Triggers
            </span>
            <button
              onClick={() => resetVehicleAnomaly(v.vehicle_id)}
              className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>

          <div className="space-y-2">
            {/* 1. Simulate Route Deviation */}
            <button
              onClick={() => toggleDeviation(v.vehicle_id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                v.is_deviated_manual
                  ? 'bg-rose-950/80 text-rose-200 border-rose-500 shadow-md'
                  : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertOctagon
                  className={`w-4 h-4 ${
                    v.is_deviated_manual ? 'text-rose-400' : 'text-slate-400'
                  }`}
                />
                <span>Simulate Route Deviation (&gt;500m)</span>
              </div>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  v.is_deviated_manual
                    ? 'bg-rose-600 text-white font-bold'
                    : 'bg-slate-900 text-slate-400'
                }`}
              >
                {v.is_deviated_manual ? 'DEVIATING' : 'NORMAL'}
              </span>
            </button>

            {/* 2. Simulate Breakdown / Stop */}
            <button
              onClick={() => toggleStopBreakdown(v.vehicle_id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                v.is_stopped_manual
                  ? 'bg-amber-950/80 text-amber-200 border-amber-500 shadow-md'
                  : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <PowerOff
                  className={`w-4 h-4 ${
                    v.is_stopped_manual ? 'text-amber-400' : 'text-slate-400'
                  }`}
                />
                <span>Simulate Breakdown / Stop (0 km/h)</span>
              </div>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  v.is_stopped_manual
                    ? 'bg-amber-600 text-white font-bold'
                    : 'bg-slate-900 text-slate-400'
                }`}
              >
                {v.is_stopped_manual
                  ? `HALTED (${Math.round(v.stationary_timer_sec)}s)`
                  : 'RUNNING'}
              </span>
            </button>

            {/* 3. Trigger Cabin SOS Panic */}
            <button
              onClick={() => triggerSOS(v.vehicle_id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                v.is_sos_manual
                  ? 'bg-rose-600 text-white border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)] animate-pulse'
                  : 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border-rose-500/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-rose-400 fill-current" />
                <span>Trigger Driver Cabin SOS Panic</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-900/80 text-rose-200">
                EMERGENCY
              </span>
            </button>
          </div>

          {/* Anomaly Live Status & Direct Alert Feed Shortcut */}
          {(v.is_deviated_manual || v.is_stopped_manual || v.is_sos_manual) && (
            <div className="mt-3 p-2.5 rounded-xl bg-gradient-to-r from-rose-950/80 to-slate-900 border border-rose-500/70 flex items-center justify-between shadow-lg animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                <span className="text-[11px] font-bold text-rose-300">
                  {v.is_sos_manual
                    ? 'SOS Transponder Active'
                    : v.is_deviated_manual
                    ? 'Route Deviation Alert Logged'
                    : 'Breakdown / Halt Logged'}
                </span>
              </div>

              <button
                onClick={() => setActiveTab('ALERTS')}
                className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-1 rounded-md bg-rose-900/60 hover:bg-rose-800 text-white border border-rose-400/80 transition cursor-pointer"
              >
                <span>View Alert Stream &rarr;</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
