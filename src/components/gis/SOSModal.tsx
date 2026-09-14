import React from 'react';
import type { VehicleTelemetry } from '../../types';
import {
  AlertTriangle,
  MapPin,
  Truck,
  X,
  Siren,
  ShieldCheck,
  Send,
} from 'lucide-react';

interface SOSModalProps {
  vehicle: VehicleTelemetry | null;
  onClose: () => void;
  onStandDown: (id: string) => void;
}

export const SOSModal: React.FC<SOSModalProps> = ({ vehicle, onClose, onStandDown }) => {
  if (!vehicle) return null;

  const v = vehicle;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-lg bg-surface border-2 border-status-blocked-solid rounded-md shadow-2xl overflow-hidden text-text-primary">
        {/* Flashing Top Alarm Banner */}
        <div className="bg-status-blocked-solid p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Siren className="w-6 h-6 text-white animate-bounce" />
            <div>
              <div className="text-[10px] font-mono tracking-widest uppercase font-bold text-red-100">
                CRITICAL FLEET DISTRESS
              </div>
              <h2 className="text-base font-bold tracking-tight text-white">
                DRIVER CABIN SOS PANIC TRANSMITTED
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-sm cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs">
          <div className="bg-status-blocked-tint border border-status-blocked-solid/50 p-3 rounded-sm flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-status-blocked-text shrink-0 mt-0.5" />
            <p className="text-status-blocked-text leading-relaxed">
              Driver aboard <strong>{v.vehicle_name}</strong> ({v.license_plate || v.vehicle_id}) has engaged physical cabin SOS panic button. Distress packet forwarded to NER State Disaster Response Authority.
            </p>
          </div>

          {/* Telemetry Snapshot Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-surface-subtle p-3 rounded-sm border border-border">
              <span className="text-text-secondary font-medium text-[11px]">Corridor & Vehicle</span>
              <div className="font-bold text-text-primary mt-0.5">{v.vehicle_name}</div>
              <div className="text-[10px] text-text-secondary font-mono">{v.corridor_name || v.destination_name || v.assigned_route_id}</div>
            </div>

            <div className="bg-surface-subtle p-3 rounded-sm border border-border">
              <span className="text-text-secondary font-medium text-[11px]">Cargo Manifest</span>
              <div className="font-bold text-status-blocked-text mt-0.5">{v.cargo_type}</div>
              <div className="text-[10px] text-text-secondary font-mono">HIGH PRIORITY RELIEF</div>
            </div>

            <div className="bg-surface-subtle p-3 rounded-sm border border-border">
              <span className="text-text-secondary font-medium text-[11px]">GPS Coordinates</span>
              <div className="font-mono font-bold text-primary mt-0.5">
                {(v.current_coords?.[0] ?? 24.38).toFixed(4)}°N, {(v.current_coords?.[1] ?? 92.72).toFixed(4)}°E
              </div>
              <div className="text-[10px] text-text-secondary font-mono">Elevation: {v.elevation_m ?? 820}m</div>
            </div>

            <div className="bg-surface-subtle p-3 rounded-sm border border-border">
              <span className="text-text-secondary font-medium text-[11px]">Telemetry Speed</span>
              <div className="font-mono font-bold text-text-primary mt-0.5">
                {(v.current_speed_kmh ?? v.speed_kmh ?? 0).toFixed(0)} km/h
              </div>
              <div className="text-[10px] text-text-secondary font-mono">Slope: {v.grade_pct ?? 5.0}% Incline</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
            <button
              onClick={() => {
                onStandDown(v.vehicle_id);
                onClose();
              }}
              className="px-3 py-2 rounded-sm border border-border text-text-secondary hover:bg-surface-subtle btn-press cursor-pointer"
            >
              Stand Down / Clear SOS
            </button>
            <button
              onClick={() => {
                alert(`🚨 ESCORT SQUADRON DISPATCHED to GPS coordinates [${v.current_coords[0].toFixed(4)}, ${v.current_coords[1].toFixed(4)}] for ${v.vehicle_name}.`);
                onClose();
              }}
              className="px-4 py-2 rounded-sm bg-[#1B4B73] hover:bg-[#123A5A] dark:bg-[#2E6B9E] text-white font-semibold flex items-center gap-1.5 btn-press shadow-xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Dispatch Regional QRT</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
