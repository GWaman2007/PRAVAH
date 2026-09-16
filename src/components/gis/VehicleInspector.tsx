import React from 'react';
import type { VehicleTelemetry } from '../../types';
import {
  Truck,
  Gauge,
  Radio,
  Wifi,
  Navigation,
  Mountain,
  AlertTriangle,
  Compass,
  Zap,
  MapPin,
  Clock,
  X,
  AlertOctagon,
  ShieldAlert,
} from 'lucide-react';

interface VehicleInspectorProps {
  vehicle: VehicleTelemetry | null;
  onClose: () => void;
  onToggleHalt: (id: string) => void;
  onToggleDeviation: (id: string) => void;
  onTriggerSOS: (id: string) => void;
  onFocusMission?: (missionId: string) => void;
}

export const VehicleInspector: React.FC<VehicleInspectorProps> = ({
  vehicle,
  onClose,
  onToggleHalt,
  onToggleDeviation,
  onTriggerSOS,
  onFocusMission,
}) => {
  if (!vehicle) return null;

  const v = vehicle;
  const isDR = v.status === 'DEAD_ZONE_EXTRAPOLATING';
  const isDeviated = v.status === 'DEVIATED';
  const isSOS = v.status === 'SOS_ALERT';
  const isStationary = v.status === 'CRITICAL_STATIONARY';

  const speedKmh = v.current_speed_kmh ?? v.speed_kmh ?? 0;
  const elevation = v.elevation_m ?? 820;
  const heading = v.heading_deg ?? 0;
  const grade = v.grade_pct ?? 4.5;
  const fuel = v.fuel_level_pct ?? Math.round(v.battery_pct ?? 85);
  const licensePlate = v.license_plate || v.vehicle_id;
  const corridorName = v.corridor_name || v.destination_name || v.assigned_route_id;
  const vehicleColor = v.color || '#1B4B73';
  const devDistance = v.deviation_distance_m ?? 0;

  const getCompassDir = (deg: number) => {
    const val = Math.floor(deg / 22.5 + 0.5);
    const arr = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return arr[val % 16];
  };

  return (
    <div className="bg-surface border-t lg:border-t-0 lg:border-l border-border flex flex-col h-full overflow-y-auto text-text-primary select-none text-xs pb-20 custom-scrollbar">
      {/* Header */}
      <div className="p-4 border-b border-border bg-surface-subtle">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: vehicleColor }}
            />
            <h2 className="font-semibold text-sm text-text-primary tracking-tight">
              {v.vehicle_name}
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] px-2 py-0.5 rounded-xs bg-surface text-text-secondary font-mono border border-border">
              {licensePlate}
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-xs text-text-secondary hover:text-text-primary hover:bg-surface border border-transparent hover:border-border cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <p className="text-[11px] text-text-secondary font-medium">{corridorName}</p>

        {/* Cargo Priority Tag */}
        <div className="mt-2.5 flex items-center justify-between text-[11px] bg-surface px-3 py-1.5 rounded-xs border border-border">
          <span className="text-text-secondary font-medium">Cargo Manifest:</span>
          <span className="font-semibold font-mono text-primary">
            {v.cargo_type}
          </span>
        </div>

        {/* Assigned Mission & Direct Focus */}
        {v.mission_id && (
          <div className="mt-2 p-2 rounded-xs bg-primary-tint/30 border border-primary/30 flex items-center justify-between gap-2">
            <div>
              <span className="text-[10px] text-text-secondary block">Assigned Mission:</span>
              <strong className="font-mono text-xs text-primary font-bold">{v.mission_id}</strong>
            </div>
            {onFocusMission && (
              <button
                onClick={() => onFocusMission(v.mission_id)}
                className="py-1 px-2 rounded-xs bg-[#1B4B73] hover:bg-[#123A5A] text-white text-[10px] font-semibold btn-press cursor-pointer transition-colors shadow-xs"
              >
                Focus Mission ➔
              </button>
            )}
          </div>
        )}
      </div>

      <div className="p-4 space-y-4 flex-1">
        {/* Connectivity Status Banner */}
        <div
          className={`p-3 rounded-sm border flex items-start gap-2.5 ${
            isDR
              ? 'bg-status-highrisk-tint border-status-highrisk-solid text-status-highrisk-text'
              : isSOS
              ? 'bg-status-blocked-tint border-status-blocked-solid text-status-blocked-text'
              : 'bg-status-open-tint border-status-open-solid text-status-open-text'
          }`}
        >
          {isDR ? (
            <Radio className="w-4 h-4 shrink-0 mt-0.5 animate-pulse text-amber-500" />
          ) : isSOS ? (
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 animate-bounce text-status-blocked-solid" />
          ) : (
            <Wifi className="w-4 h-4 shrink-0 mt-0.5 text-status-open-solid" />
          )}

          <div>
            <span className="font-bold text-xs block">
              {isDR
                ? 'Dead-Reckoning Extrapolation Active'
                : isSOS
                ? 'CONVOY SOS EMERGENCY TRIGGERED'
                : 'Live Cellular / Satellite GPS Lock'}
            </span>
            <p className="text-[10px] text-text-secondary mt-0.5 leading-normal">
              {isDR
                ? `Vehicle is traversing cellular blackout zone. Position is mathematically extrapolated using IMU dead-reckoning.`
                : isSOS
                ? 'Driver cabin emergency transponder engaged. Distress signal forwarded to Regional Emergency QRT.'
                : 'Nominal telemetry. GPS position lock refreshed within nominal 5-second interval.'}
            </p>
          </div>
        </div>

        {/* Telemetry Metrics Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Speed */}
          <div className="p-2.5 bg-surface-subtle/50 rounded-xs border border-border">
            <div className="flex items-center justify-between text-text-secondary mb-1">
              <span className="text-[10px]">Ground Speed</span>
              <Gauge className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="font-mono text-sm font-bold text-text-primary">
              {speedKmh.toFixed(0)}{' '}
              <span className="text-[10px] font-normal text-text-secondary">km/h</span>
            </div>
          </div>

          {/* Altitude */}
          <div className="p-2.5 bg-surface-subtle/50 rounded-xs border border-border">
            <div className="flex items-center justify-between text-text-secondary mb-1">
              <span className="text-[10px]">Altitude</span>
              <Mountain className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="font-mono text-sm font-bold text-text-primary">
              {elevation}{' '}
              <span className="text-[10px] font-normal text-text-secondary">meters</span>
            </div>
          </div>

          {/* Compass & Heading */}
          <div className="p-2.5 bg-surface-subtle/50 rounded-xs border border-border">
            <div className="flex items-center justify-between text-text-secondary mb-1">
              <span className="text-[10px]">Heading</span>
              <Compass className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="font-mono text-sm font-bold text-text-primary flex items-center gap-1">
              <span>{Math.round(heading)}°</span>
              <span className="text-[10px] font-normal text-primary">({getCompassDir(heading)})</span>
            </div>
          </div>

          {/* Incline */}
          <div className="p-2.5 bg-surface-subtle/50 rounded-xs border border-border">
            <div className="flex items-center justify-between text-text-secondary mb-1">
              <span className="text-[10px]">Grade Slope</span>
              <Navigation className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="font-mono text-sm font-bold text-text-primary">
              {grade}% Incline
            </div>
          </div>

          {/* Fuel */}
          <div className="p-2.5 bg-surface-subtle/50 rounded-xs border border-border">
            <div className="flex items-center justify-between text-text-secondary mb-1">
              <span className="text-[10px]">Fuel Level</span>
              <Zap className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="font-mono text-sm font-bold text-text-primary">
              {fuel}%
            </div>
          </div>

          {/* Watchdog Timer */}
          <div className="p-2.5 bg-surface-subtle/50 rounded-xs border border-border">
            <div className="flex items-center justify-between text-text-secondary mb-1">
              <span className="text-[10px]">Watchdog Timer</span>
              <Clock className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className={`font-mono text-sm font-bold ${v.overdue_duration_min && v.overdue_duration_min > 0 ? 'text-status-blocked-text' : 'text-text-primary'}`}>
              {v.overdue_duration_min && v.overdue_duration_min > 0 ? `+${v.overdue_duration_min}m OVERDUE` : 'Nominal (0m)'}
            </div>
          </div>
        </div>

        {/* Route Deviation Inspector */}
        <div className="p-3 bg-surface-subtle/50 rounded-xs border border-border space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-text-secondary">Corridor Deviation Distance:</span>
            <span className={`font-mono font-bold ${isDeviated ? 'text-status-blocked-text' : 'text-text-primary'}`}>
              {devDistance}m {isDeviated ? '(BREACH > 50m)' : '(On Path)'}
            </span>
          </div>
          <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${isDeviated ? 'bg-status-blocked-solid' : 'bg-status-open-solid'}`}
              style={{ width: `${Math.min(100, (devDistance / 150) * 100)}%` }}
            />
          </div>
        </div>

        {/* Live Simulation Trigger Controls */}
        <div className="space-y-2 pt-2 border-t border-border">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block">
            Watchdog Anomaly Ingestion
          </span>

          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => onToggleDeviation(v.vehicle_id)}
              className={`w-full py-2 px-3 rounded-xs font-semibold text-xs border flex items-center justify-between transition-colors btn-press cursor-pointer ${
                v.is_deviated_manual
                  ? 'bg-status-blocked-tint text-status-blocked-text border-status-blocked-solid'
                  : 'bg-surface hover:bg-surface-subtle text-text-primary border-border'
              }`}
            >
              <span>{v.is_deviated_manual ? '✓ Reset Route Breach' : 'Induce Off-Route Deviation'}</span>
              <AlertTriangle className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onToggleHalt(v.vehicle_id)}
              className={`w-full py-2 px-3 rounded-xs font-semibold text-xs border flex items-center justify-between transition-colors btn-press cursor-pointer ${
                v.is_stopped_manual
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                  : 'bg-surface hover:bg-surface-subtle text-text-primary border-border'
              }`}
            >
              <span>{v.is_stopped_manual ? '✓ Clear Mechanical Halt' : 'Simulate Breakdown / Halt'}</span>
              <AlertOctagon className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onTriggerSOS(v.vehicle_id)}
              className={`w-full py-2 px-3 rounded-xs font-semibold text-xs border flex items-center justify-between transition-colors btn-press cursor-pointer ${
                v.is_sos_manual
                  ? 'bg-status-blocked-solid text-white border-status-blocked-solid animate-pulse'
                  : 'bg-status-blocked-tint text-status-blocked-text border-status-blocked-solid hover:bg-status-blocked-solid hover:text-white'
              }`}
            >
              <span>{v.is_sos_manual ? '🚨 SOS Transmitting (Active)' : 'Trigger Emergency SOS'}</span>
              <ShieldAlert className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
