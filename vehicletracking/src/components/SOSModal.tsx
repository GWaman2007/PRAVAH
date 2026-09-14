import React from 'react';
import { useSimulation } from '../context/SimulationContext';
import {
  ShieldAlert,
  AlertTriangle,
  Radio,
  MapPin,
  Truck,
  UserCheck,
  Send,
  XCircle,
  Siren,
} from 'lucide-react';

export const SOSModal: React.FC = () => {
  const { activeSOSVehicle, closeSOSModal, clearSOS } = useSimulation();

  if (!activeSOSVehicle) return null;

  const v = activeSOSVehicle;

  // Derive nearest emergency response post based on corridor
  let nearestPost = 'Assam Rifles Sector HQ / Dispur Police Control';
  if (v.assigned_route_id === 'route-oxy-04') {
    nearestPost = 'BRO Project Swastik Post (Sevoke) & STNM Sikkim Emergency';
  } else if (v.assigned_route_id === 'route-ration-09') {
    nearestPost = 'Mao Gate Nagaland Police Post / Senapati QRT';
  }

  const handleDispatchQRT = () => {
    alert(
      `🚨 EMERGENCY QRT DISPATCHED!\n\nDispatched 1st Quick Reaction Team & Highway Escort to coordinates [${v.current_coords[0].toFixed(
        4
      )}, ${v.current_coords[1].toFixed(
        4
      )}] on ${v.corridor_name}.\n\nNearest Base: ${nearestPost}.`
    );
    closeSOSModal();
  };

  const handleStandDown = () => {
    clearSOS(v.vehicle_id);
    closeSOSModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border-2 border-rose-500 rounded-2xl shadow-[0_0_50px_rgba(244,63,94,0.45)] overflow-hidden text-slate-100">
        {/* Flashing Top Alarm Banner */}
        <div className="bg-gradient-to-r from-rose-700 via-red-600 to-rose-700 p-4 text-white flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2.5">
            <Siren className="w-7 h-7 text-white animate-bounce" />
            <div>
              <div className="text-xs font-mono tracking-widest uppercase font-bold text-rose-200">
                CRITICAL FLEET INCIDENT
              </div>
              <h2 className="text-lg font-black tracking-tight text-white font-display">
                DRIVER CABIN SOS PANIC TRIGGERED
              </h2>
            </div>
          </div>
          <button
            onClick={closeSOSModal}
            className="text-rose-200 hover:text-white p-1 rounded-lg hover:bg-rose-800 transition cursor-pointer"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div className="bg-rose-950/40 border border-rose-500/50 p-3.5 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-200 leading-relaxed">
              Driver <strong>{v.driver_name}</strong> aboard <strong>{v.vehicle_name}</strong> has
              engaged the physical cabin emergency transponder. Telemetry indicates vehicle has
              entered high-distress status!
            </p>
          </div>

          {/* Telemetry Snapshot Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 font-medium">Vehicle Chassis</span>
              <div className="font-mono font-bold text-white mt-0.5">{v.vehicle_model}</div>
              <div className="text-[11px] text-slate-500 font-mono">{v.license_plate}</div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 font-medium">Cargo Category</span>
              <div className="font-semibold text-rose-300 mt-0.5">{v.cargo_type}</div>
              <div className="text-[10px] text-slate-500 font-mono">PRIORITY LEVEL 1</div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 font-medium">Incident Coordinates</span>
              <div className="font-mono font-bold text-emerald-400 mt-0.5">
                {v.current_coords[0].toFixed(4)}°N, {v.current_coords[1].toFixed(4)}°E
              </div>
              <div className="text-[10px] text-slate-500 font-mono">Elevation: {v.elevation_m}m</div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 font-medium">Corridor Segment</span>
              <div className="font-semibold text-slate-200 mt-0.5 truncate">{v.corridor_name}</div>
              <div className="text-[10px] text-slate-500 font-mono">Speed: {v.speed_kmh} km/h</div>
            </div>
          </div>

          {/* Nearest Support Post */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
            <MapPin className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="text-[11px] text-slate-400">Nearest Emergency Command Post:</div>
              <div className="text-xs font-semibold text-slate-200">{nearestPost}</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleDispatchQRT}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-lg shadow-rose-900/40 border border-rose-400 transition cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Dispatch Quick Reaction Team (QRT)</span>
            </button>

            <button
              onClick={handleStandDown}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs border border-slate-700 transition cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>Acknowledge & Stand Down</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
