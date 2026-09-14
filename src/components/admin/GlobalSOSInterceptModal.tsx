import React from 'react';
import type { AlertEvent, VehicleTelemetry } from '../../types';
import {
  Siren,
  AlertTriangle,
  X,
  Send,
  Phone,
  Truck,
  MapPin,
  ShieldAlert,
  HardHat,
} from 'lucide-react';

interface GlobalSOSInterceptModalProps {
  alert: AlertEvent | null;
  vehicle: VehicleTelemetry | null;
  onClose: () => void;
  onAcknowledge: (alertId: string) => void;
}

export const GlobalSOSInterceptModal: React.FC<GlobalSOSInterceptModalProps> = ({
  alert,
  vehicle,
  onClose,
  onAcknowledge,
}) => {
  if (!alert || alert.type !== 'SOS_TRIGGERED') return null;

  const veh = vehicle;
  const coords = alert.coords || veh?.current_coords || [24.3800, 92.7200];

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-fadeIn select-none">
      <div 
        className="bg-surface border-2 border-status-blocked-solid rounded-md w-full max-w-xl shadow-2xl overflow-hidden flex flex-col text-text-primary text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Siren Alert Banner */}
        <div className="bg-status-blocked-solid p-4 text-white flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2.5">
            <Siren className="w-6 h-6 text-white animate-bounce shrink-0" />
            <div>
              <div className="text-[10px] font-mono tracking-widest uppercase font-bold text-red-100">
                STATE COMMAND PRIORITY INTERCEPT • EMERGENCY DISTRESS SIGNAL
              </div>
              <h2 className="text-base font-bold tracking-tight text-white">
                DRIVER CABIN SOS TRANSMITTED — IMMEDIATE INTERCEPT REQUIRED
              </h2>
            </div>
          </div>

          <button
            onClick={() => {
              onAcknowledge(alert.id);
              onClose();
            }}
            className="text-white/80 hover:text-white p-1 rounded-sm cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          <div className="bg-status-blocked-tint border border-status-blocked-solid/50 p-3 rounded-sm flex items-start gap-2.5 text-xs text-status-blocked-text">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <strong>Emergency Transponder Activated:</strong> Driver aboard{' '}
              <strong>{alert.vehicle_name}</strong> has engaged the physical cabin panic button. Automatic distress packet routed to MDoNER State Command &amp; Regional Police QRT.
            </div>
          </div>

          {/* Telemetry Snapshot Grid */}
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="bg-surface-subtle p-3 rounded-sm border border-border space-y-0.5">
              <span className="text-text-secondary text-[11px] font-medium">Assigned Mission &amp; Vehicle</span>
              <div className="font-bold text-text-primary text-sm flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-primary" />
                <span>{alert.vehicle_name}</span>
              </div>
              <div className="text-[10px] font-mono text-text-secondary">
                Mission: {veh?.mission_id || 'MZ-04'} • {veh?.destination_name || 'Kolasib Sector'}
              </div>
            </div>

            <div className="bg-surface-subtle p-3 rounded-sm border border-border space-y-0.5">
              <span className="text-text-secondary text-[11px] font-medium">Driver &amp; Lead Officer</span>
              <div className="font-bold text-text-primary text-sm flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-primary" />
                <span>{veh?.driver_name || 'Rajesh Mech'}</span>
              </div>
              <div className="text-[10px] font-mono text-text-secondary">
                Phone: {veh?.driver_phone || '+91 94350-18492'}
              </div>
            </div>

            <div className="bg-surface-subtle p-3 rounded-sm border border-border space-y-0.5">
              <span className="text-text-secondary text-[11px] font-medium">GPS Distress Coordinates</span>
              <div className="font-bold font-mono text-primary text-sm flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span>
                  {coords[0].toFixed(4)}°N, {coords[1].toFixed(4)}°E
                </span>
              </div>
              <div className="text-[10px] font-mono text-text-secondary">
                Altitude: {veh?.elevation_m ?? 820}m • Slope: {veh?.grade_pct ?? 5.2}%
              </div>
            </div>

            <div className="bg-surface-subtle p-3 rounded-sm border border-border space-y-0.5">
              <span className="text-text-secondary text-[11px] font-medium">High-Priority Cargo Manifest</span>
              <div className="font-bold text-status-blocked-text text-sm">
                {alert.cargo_type || '500 IV Fluids & Snake Antivenom'}
              </div>
              <div className="text-[10px] font-mono text-text-secondary">
                Cold-Chain Medical Subsistence
              </div>
            </div>
          </div>

          {/* Rapid Intercept Action Bar */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-border">
            <button
              onClick={() => {
                onAcknowledge(alert.id);
                onClose();
              }}
              className="w-full sm:w-auto px-3.5 py-2 rounded-sm border border-border text-text-secondary hover:bg-surface-subtle text-xs btn-press cursor-pointer"
            >
              Acknowledge &amp; Stand Down
            </button>

            <div className="w-full sm:w-auto flex items-center gap-2">
              <button
                onClick={() => {
                  window.alert(`Alert dispatched to BRO Project Sewak / Vartak Quick Clearance Squad.`);
                  onAcknowledge(alert.id);
                  onClose();
                }}
                className="flex-1 sm:flex-initial px-3.5 py-2 rounded-sm bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 btn-press shadow-xs cursor-pointer"
              >
                <HardHat className="w-3.5 h-3.5" />
                <span>Alert BRO Sector Crew</span>
              </button>

              <button
                onClick={() => {
                  window.alert(`🚨 POLICE QRT & DISASTER RESCUE ESCORT DISPATCHED to GPS coordinates [${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}] for Convoy ${alert.vehicle_name}.`);
                  onAcknowledge(alert.id);
                  onClose();
                }}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-sm bg-status-blocked-solid hover:bg-status-blocked-text text-white font-bold text-xs flex items-center justify-center gap-1.5 btn-press shadow-xs cursor-pointer animate-bounce"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Deploy Police QRT Escort</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
