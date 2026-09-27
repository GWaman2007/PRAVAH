/**
 * PRAVAH — Driver Home Screen
 * 
 * Central operational summary answering:
 * 1. What is my mission?
 * 2. Where am I?
 * 3. Where do I go?
 * 4. Has the route changed?
 * 5. What am I carrying?
 * 6. What action do I need to take?
 */
import React, { useMemo } from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import {
  Truck,
  MapPin,
  Clock,
  Package,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Wifi,
  WifiOff,
  Radio,
  Gauge,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import type { ReliefMission, VehicleTelemetry } from '../../types';

interface DriverHomeScreenProps {
  activeMission: ReliefMission | null;
  activeVehicle: VehicleTelemetry;
  onNavigateToMap: () => void;
  onNavigateToMission: () => void;
  onNavigateToUpdates: () => void;
}

export const DriverHomeScreen: React.FC<DriverHomeScreenProps> = ({
  activeMission,
  activeVehicle,
  onNavigateToMap,
  onNavigateToMission,
  onNavigateToUpdates,
}) => {
  const {
    isOnline,
    isSimulatedOffline,
    alerts,
  } = usePravahStore();

  const effectiveOnline = isOnline && !isSimulatedOffline;

  // Active mission code
  const missionCode = useMemo(() => {
    if (!activeMission) return 'Mission MZ-04';
    if (activeMission.id.includes('NL01')) return 'Mission NL-01';
    if (activeMission.id.includes('MZ01')) return 'Mission MZ-04';
    return activeMission.id.replace('MSN-ONGOING-', 'Mission ');
  }, [activeMission]);

  // Destination name
  const destinationName = useMemo(() => {
    return activeMission?.destinationName || 'Kohima South Ridge';
  }, [activeMission?.destinationName]);

  // Status label
  const statusLabel = useMemo(() => {
    if (!activeMission) return 'EN ROUTE';
    if (activeMission.status === 'PENDING_ADMIN_CLOSEOUT') return 'DELIVERED (PENDING SIGN-OFF)';
    if (activeMission.status === 'DELIVERED') return 'COMPLETED';
    if (activeMission.status === 'IN_TRANSIT') return 'EN ROUTE';
    if (activeMission.status === 'APPROVED') return 'ASSIGNED';
    return 'EN ROUTE';
  }, [activeMission]);

  // Progress percentage
  const progressPct = activeVehicle?.route_progress_pct || 42;

  // Telemetry items
  const speed = activeVehicle?.speed_kmh || activeVehicle?.nominal_speed_kmh || 42;
  const distanceLeftKm = useMemo(() => {
    if (activeMission?.routeDistanceKm) {
      return (activeMission.routeDistanceKm * (1 - progressPct / 100)).toFixed(1);
    }
    return '28.4';
  }, [activeMission?.routeDistanceKm, progressPct]);

  const etaMinutes = useMemo(() => {
    if (activeMission?.isRerouted) return '41 min';
    if (activeMission?.routeDurationMinutes) {
      return `${Math.round(activeMission.routeDurationMinutes * (1 - progressPct / 100))} min`;
    }
    return '42 min';
  }, [activeMission?.isRerouted, activeMission?.routeDurationMinutes, progressPct]);

  // Cargo summary items
  const cargoSummary = useMemo(() => {
    if (activeMission?.cargoAllocations && activeMission.cargoAllocations.length > 0) {
      return activeMission.cargoAllocations.map(c => `${c.quantity} ${c.unit} ${c.item.split(' ')[0]}`).join(' • ');
    }
    return 'Food Kits: 300 pkgs • Potable Water: 1200L • Medical Kits: 45 units';
  }, [activeMission?.cargoAllocations]);

  // Check for recent driver-relevant alerts (e.g. reroute or broadcast)
  const activeRerouteAlert = alerts.find(
    a => !a.acknowledged && (a.title.includes('REROUTE') || a.message.includes('blocked') || a.severity === 'CRITICAL')
  );

  return (
    <div className="p-3 sm:p-4 space-y-3 pb-24 text-slate-100">
      {/* ─── ACTIVE REROUTE / OPERATIONAL ALERT BANNER ─── */}
      {activeRerouteAlert && (
        <div
          onClick={onNavigateToUpdates}
          className="p-3 rounded-2xl bg-gradient-to-r from-red-950/80 via-red-900/60 to-amber-950/70 border border-red-500/50 shadow-xl flex items-center justify-between gap-3 cursor-pointer hover:border-red-400 transition-all animate-pulse"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-300 border border-red-500/40 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">
                🚨 Route Updated
              </span>
              <p className="text-xs font-semibold text-white truncate">
                {activeRerouteAlert.title || 'Detour generated from current position'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-red-400 shrink-0" />
        </div>
      )}

      {/* ─── CARD 1: ACTIVE MISSION HERO CARD ─── */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-[#121B2A] to-[#0A101C] border border-slate-700/80 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold text-blue-400 tracking-wider uppercase px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30">
              {missionCode}
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              {activeVehicle?.vehicle_id || 'Ration-Convoy-07'}
            </span>
          </div>

          <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${
            statusLabel === 'EN ROUTE'
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 animate-pulse'
              : statusLabel.includes('DELIVERED')
              ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
              : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
          }`}>
            {statusLabel}
          </span>
        </div>

        {/* Target Destination & ETA */}
        <div className="space-y-1 mb-4">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <MapPin className="w-3 h-3 text-red-400" />
            Destination
          </span>
          <h2 className="text-xl font-black text-white leading-tight">
            {destinationName}
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-300 pt-1">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>ETA: <strong className="text-blue-300 font-bold">{etaMinutes}</strong></span>
            <span className="text-slate-500">•</span>
            <span>Distance: <strong className="text-white font-bold">{distanceLeftKm} km</strong></span>
          </div>
        </div>

        {/* Mission Progress Bar */}
        <div className="space-y-1.5 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-medium">Mission Progress</span>
            <span className="font-mono font-bold text-white">{progressPct}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium pt-0.5">
            <span>Depot Base</span>
            <span className="text-blue-400 font-semibold">En Route (Km 38)</span>
            <span>Target Terminal</span>
          </div>
        </div>

        {/* Primary Action Button: View Route */}
        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <button
            onClick={onNavigateToMap}
            className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-950/60 transition-all transform active:scale-[0.98] cursor-pointer"
          >
            <Navigation className="w-4 h-4 rotate-45" />
            <span>View Route on Tactical Map</span>
          </button>
        </div>
      </div>

      {/* ─── CARD 2: SIMPLIFIED TELEMETRY HUD ─── */}
      <div className="p-3.5 rounded-2xl bg-[#111A29] border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-blue-400" />
            Live Telemetry & Connectivity
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Sensors Active</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* GPS Live */}
          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">
              GPS Position
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-emerald-300 font-mono">Live 3D Fix</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono block mt-1">
              {activeVehicle?.current_coords ? `${activeVehicle.current_coords[0].toFixed(3)}°N, ${activeVehicle.current_coords[1].toFixed(3)}°E` : '25.759°N, 93.947°E'}
            </span>
          </div>

          {/* Network Connection */}
          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">
              Network Status
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {effectiveOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-300">4G LTE Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-bold text-amber-300">Offline (Cached)</span>
                </>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-mono block mt-1">
              {effectiveOnline ? '-74 dBm • 12 sats' : 'Local Queue Active'}
            </span>
          </div>

          {/* Speed */}
          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">
              Current Speed
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-black text-white font-mono">{speed}</span>
              <span className="text-[10px] text-slate-400">km/h</span>
            </div>
            <span className="text-[10px] text-slate-500 block">Cruising speed</span>
          </div>

          {/* Distance & ETA */}
          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">
              Distance / ETA
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-black text-blue-400 font-mono">{distanceLeftKm}</span>
              <span className="text-[10px] text-slate-400">km</span>
            </div>
            <span className="text-[10px] text-slate-400 block">{etaMinutes} remaining</span>
          </div>
        </div>
      </div>

      {/* ─── CARD 3: CARGO MANIFEST SUMMARY ─── */}
      <div className="p-3.5 rounded-2xl bg-[#111A29] border border-slate-800 shadow-xl space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-amber-400" />
            Consignment On Board
          </span>
          <button
            onClick={onNavigateToMission}
            className="text-[11px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
          >
            <span>Manifest</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/70 border border-slate-800/80 text-xs">
            <span className="text-slate-300 font-medium">Food Kits</span>
            <span className="font-bold text-amber-400 font-mono">300 pkgs</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/70 border border-slate-800/80 text-xs">
            <span className="text-slate-300 font-medium">Potable Water</span>
            <span className="font-bold text-blue-400 font-mono">1,200 Litres</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/70 border border-slate-800/80 text-xs">
            <span className="text-slate-300 font-medium">Medical Kits</span>
            <span className="font-bold text-emerald-400 font-mono">45 units</span>
          </div>
        </div>
      </div>
    </div>
  );
};
