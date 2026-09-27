/**
 * PRAVAH — Driver Updates Screen
 * 
 * Shows ONLY operational alerts relevant to the driver:
 * - Route update & detour notifications (with [ VIEW UPDATED ROUTE ] & [ ACKNOWLEDGE ])
 * - Emergency broadcasts sent by Base Admin / Dispatcher
 * - Severe weather or blackout zone warnings on active corridor
 */
import React, { useMemo } from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import {
  AlertTriangle,
  Radio,
  CheckCircle2,
  Navigation,
  Clock,
  ShieldAlert,
  Volume2,
  MapPin,
  Bell,
  Sparkles,
} from 'lucide-react';
import { playAckChime } from '../../utils/audioAlert';
import type { ReliefMission, VehicleTelemetry } from '../../types';

interface DriverUpdatesScreenProps {
  activeMission: ReliefMission | null;
  activeVehicle: VehicleTelemetry;
  onNavigateToMap: () => void;
}

export const DriverUpdatesScreen: React.FC<DriverUpdatesScreenProps> = ({
  activeMission,
  activeVehicle,
  onNavigateToMap,
}) => {
  const { alerts, acknowledgeAlert } = usePravahStore();

  const handleAcknowledge = (alertId: string) => {
    playAckChime();
    acknowledgeAlert(alertId);
  };

  // Filter or augment alerts strictly relevant to the driver
  const driverAlerts = useMemo(() => {
    // Collect alerts matching vehicle or mission or high risk reroutes / broadcasts
    const relevant = alerts.filter((a) => {
      const isVehicleTarget = !a.vehicle_id || a.vehicle_id === activeVehicle.vehicle_id || a.vehicle_id === 'Convoy';
      const isReroute = a.title.includes('REROUTE') || a.title.includes('ROUTE') || a.message.includes('route');
      const isBroadcast = a.title.includes('BROADCAST') || a.severity === 'CRITICAL';
      const isHazard = a.severity === 'HIGH RISK' || a.severity === 'CRITICAL';
      return isVehicleTarget && (isReroute || isBroadcast || isHazard);
    });

    // If no reroute alert currently in store, synthesize the canonical operational reroute update if mission is rerouted
    if (activeMission?.isRerouted && !relevant.some((a) => a.title.includes('ROUTE UPDATED'))) {
      return [
        {
          id: 'driver-reroute-active-synthetic',
          vehicle_id: activeVehicle.vehicle_id,
          vehicle_name: activeVehicle.vehicle_id,
          cargo_type: activeMission.cargoAllocations?.[0]?.item || 'Relief Consignment',
          title: 'ROUTE UPDATED',
          message: 'NH-29 is blocked. A new route has been generated from your current location.',
          timestamp: new Date().toISOString(),
          severity: 'CRITICAL' as const,
          type: 'ROUTE_DEVIATION' as const,
          acknowledged: false,
          coords: activeVehicle.current_coords,
        },
        ...relevant,
      ];
    }

    return relevant;
  }, [alerts, activeVehicle.vehicle_id, activeVehicle.current_coords, activeMission?.isRerouted, activeMission?.cargoAllocations]);

  return (
    <div className="p-3 sm:p-4 space-y-3 pb-24 text-slate-100">
      {/* Header Summary */}
      <div className="flex items-center justify-between pb-1 border-b border-slate-800">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
            Operational Bulletins
          </span>
          <h2 className="text-base font-extrabold text-white">Driver Tactical Updates</h2>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
          {driverAlerts.filter(a => !a.acknowledged).length} Active
        </span>
      </div>

      {/* REROUTE CARD (Example from Prompt: 🚨 ROUTE UPDATED) */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-red-950/80 via-[#182030] to-emerald-950/80 border-2 border-red-500/60 shadow-2xl space-y-3 relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🚨</span>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-red-400 block">
                ROUTE UPDATED
              </span>
              <span className="text-[10px] text-slate-400">Live Traffic Control System</span>
            </div>
          </div>
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse">
            HIGH PRIORITY
          </span>
        </div>

        <div className="space-y-1 bg-black/30 p-3 rounded-2xl border border-white/5">
          <p className="text-xs font-bold text-white">
            NH-29 is blocked.
          </p>
          <p className="text-xs text-emerald-300 leading-relaxed">
            A new route has been generated from your current location.
          </p>
          <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-300">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>New ETA: <strong className="text-white font-extrabold">41 min</strong></span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={onNavigateToMap}
            className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-950/50 cursor-pointer transition-all"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>VIEW UPDATED ROUTE</span>
          </button>
          <button
            onClick={() => handleAcknowledge('driver-reroute-active-synthetic')}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all border border-slate-700"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>ACKNOWLEDGE</span>
          </button>
        </div>
      </div>

      {/* ─── FEED OF OPERATIONAL ALERTS / BROADCASTS ─── */}
      <div className="space-y-2.5">
        {driverAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`p-3.5 rounded-2xl border transition-all ${
              alert.acknowledged
                ? 'bg-slate-900/50 border-slate-800/60 opacity-60'
                : alert.severity === 'CRITICAL'
                ? 'bg-red-950/40 border-red-500/40 shadow-lg'
                : 'bg-[#111A29] border-slate-800'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                  alert.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {alert.title.includes('BROADCAST') ? <Radio className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                </div>
                <div>
                  <span className="text-xs font-bold text-white block leading-tight">
                    {alert.title}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {!alert.acknowledged ? (
                <button
                  onClick={() => handleAcknowledge(alert.id)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] shrink-0 border border-slate-700 transition-colors cursor-pointer"
                >
                  Ack
                </button>
              ) : (
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ack'd
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300 leading-snug pl-9">
              {alert.message}
            </p>

            {alert.title.includes('ROUTE') && (
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 pl-9">
                <button
                  onClick={onNavigateToMap}
                  className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                >
                  <span>Open Route on Map</span>
                  <Navigation className="w-3 h-3 rotate-45" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Static Corridor Info Card */}
      <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-xs space-y-1.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
          Corridor Advisory
        </span>
        <p className="text-slate-300 leading-snug">
          NH-29 Chumukedima to Medziphema sector under Amber monitoring due to heavy precipitation (32mm/h). Maintain 40 km/h safe convoy headway.
        </p>
      </div>
    </div>
  );
};
