import React, { useState } from 'react';
import { Layers, ChevronDown, ChevronUp, Radio, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';

export const RouteLegend: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const { routes } = useSimulation();

  return (
    <div className="absolute bottom-6 left-4 z-20 select-none">
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl shadow-2xl overflow-hidden transition-all text-xs w-64">
        {/* Toggle Bar */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-2.5 bg-slate-950/80 flex items-center justify-between text-slate-300 hover:text-white transition cursor-pointer"
        >
          <div className="flex items-center gap-2 font-semibold text-xs font-mono">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>GIS MAP LEGEND</span>
          </div>
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>

        {isOpen && (
          <div className="p-3 space-y-2.5 text-[11px] text-slate-300">
            {/* Convoy Routes */}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block mb-1">
                Strategic Corridors
              </span>
              <div className="space-y-1">
                {Object.values(routes).map((r) => (
                  <div key={r.id} className="flex items-center gap-2">
                    <span
                      className="w-3 h-1 rounded-full shrink-0"
                      style={{ backgroundColor: r.color }}
                    />
                    <span className="truncate text-slate-200">{r.name.split(' ')[0]}</span>
                    <span className="text-[10px] text-slate-500 font-mono ml-auto">
                      {r.totalDistanceKm}km
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Zones */}
            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block mb-1.5">
                Special Geofence Zones
              </span>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded border border-dashed border-amber-500 bg-slate-800/80 flex items-center justify-center shrink-0">
                    <Radio className="w-2 h-2 text-amber-400" />
                  </div>
                  <div>
                    <span className="text-amber-300 font-medium">GPS Blackout Canyon</span>
                    <span className="block text-[9px] text-slate-400">Triggers Dead-Reckoning</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded border border-dashed border-red-500 bg-red-950/60 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-2 h-2 text-red-400" />
                  </div>
                  <div>
                    <span className="text-red-300 font-medium">Landslide Hazard Zone</span>
                    <span className="block text-[9px] text-slate-400">Stop &gt;10s triggers High-Risk</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Markers */}
            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block mb-1.5">
                Telemetry States
              </span>
              <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>Live GPS</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                  <span>DR Offline</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                  <span>Deviated</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
                  <span>SOS Alert</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
