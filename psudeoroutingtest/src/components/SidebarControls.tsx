import React, { useState } from 'react';
import { useSimulation } from '../context/SimulationContext';
import { NER_NODES, VEHICLE_PROFILES } from '../data/nerGraphData';
import { 
  Truck, 
  PackageCheck, 
  Ambulance, 
  Sliders, 
  CloudRain, 
  AlertTriangle, 
  ArrowLeftRight
} from 'lucide-react';

export const SidebarControls: React.FC = () => {
  const {
    originId,
    destinationId,
    setOriginId,
    setDestinationId,
    selectedVehicle,
    setSelectedVehicleId,
    customSpecs,
    updateCustomSpecs,
    rainfallMmHr,
    setRainfallMmHr,
    disruptions,
    clearAllDisruptions,
    triggerScenarioNH6Landslide,
    triggerScenarioNH29FlashFlood,
    triggerScenarioHaflongBridgeRisk,
    setSegmentDisruption,
  } = useSimulation();

  const [showCustomSpecs, setShowCustomSpecs] = useState(false);

  // List of Hubs for origin/destination selectors
  const hubs = Object.values(NER_NODES).filter(n => n.isHub);

  const swapOriginDestination = () => {
    const temp = originId;
    setOriginId(destinationId);
    setDestinationId(temp);
  };

  const getRainIntensityLabel = (val: number) => {
    if (val === 0) return { label: 'Dry / Clear Sky', color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
    if (val <= 12) return { label: 'Light Drizzle', color: 'text-blue-400', bg: 'bg-blue-500/10' };
    if (val <= 28) return { label: 'Active Monsoon Shower', color: 'text-sky-400', bg: 'bg-sky-500/10' };
    if (val <= 40) return { label: 'Heavy Hill Downpour', color: 'text-amber-400', bg: 'bg-amber-500/10' };
    return { label: 'Extreme Cloudburst Surge', color: 'text-rose-400', bg: 'bg-rose-500/10' };
  };

  const rainInfo = getRainIntensityLabel(rainfallMmHr);
  const activeDisruptionEntries = Object.entries(disruptions);

  return (
    <div className="flex flex-col gap-5 p-4 bg-slate-900/90 text-slate-200 h-full overflow-y-auto custom-scrollbar border-r border-slate-800 text-sm">
      
      {/* 1. CORRIDOR ROUTING SELECTION */}
      <div className="space-y-3 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            NER Corridor Hubs
          </label>
          <button
            onClick={swapOriginDestination}
            className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition p-1 hover:bg-slate-800 rounded"
            title="Swap Origin & Destination"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span className="text-[11px]">Swap</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {/* Origin Hub */}
          <div>
            <span className="text-[11px] text-slate-400 block mb-1 font-medium">Origin Hub</span>
            <div className="relative">
              <select
                value={originId}
                onChange={e => setOriginId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition font-medium appearance-none cursor-pointer"
              >
                {hubs.map(hub => (
                  <option key={hub.id} value={hub.id} disabled={hub.id === destinationId}>
                    {hub.name} ({hub.elevationMeters}m elev)
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                ▼
              </div>
            </div>
          </div>

          {/* Destination Hub */}
          <div>
            <span className="text-[11px] text-slate-400 block mb-1 font-medium">Destination Hub</span>
            <div className="relative">
              <select
                value={destinationId}
                onChange={e => setDestinationId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition font-medium appearance-none cursor-pointer"
              >
                {hubs.map(hub => (
                  <option key={hub.id} value={hub.id} disabled={hub.id === originId}>
                    {hub.name} ({hub.elevationMeters}m elev)
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                ▼
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. VEHICLE PROFILE SELECTOR */}
      <div className="space-y-3 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-amber-400" />
            Vehicle Profile (Hard Constraints)
          </label>
        </div>

        {/* Radio Cards */}
        <div className="grid grid-cols-1 gap-2">
          {VEHICLE_PROFILES.map(profile => {
            const isSelected = selectedVehicle.id === profile.id;
            return (
              <div
                key={profile.id}
                onClick={() => {
                  setSelectedVehicleId(profile.id);
                  setShowCustomSpecs(false);
                }}
                className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/5'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                <div className={`p-2 rounded-md shrink-0 mt-0.5 ${
                  isSelected ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                }`}>
                  {profile.id === 'heavy-cargo' && <Truck className="w-4 h-4" />}
                  {profile.id === 'medium-truck' && <PackageCheck className="w-4 h-4" />}
                  {profile.id === 'light-4x4' && <Ambulance className="w-4 h-4" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-xs text-white truncate">{profile.name}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      isSelected ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {profile.weight_tonnes}T
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{profile.description}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-slate-400">
                    <span>Wt: <strong className="text-slate-200">{profile.weight_tonnes}t</strong></span>
                    <span>•</span>
                    <span>Ht: <strong className="text-slate-200">{profile.height_m}m</strong></span>
                    <span>•</span>
                    <span>Wd: <strong className="text-slate-200">{profile.width_m}m</strong></span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Custom Specification Option */}
          <div
            onClick={() => {
              setSelectedVehicleId('custom');
              setShowCustomSpecs(true);
            }}
            className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
              selectedVehicle.id === 'custom'
                ? 'bg-amber-500/10 border-amber-500/50 text-white'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-medium">Custom Axle / Rig Specifications</span>
            </div>
            <span className="text-[11px] font-mono text-amber-400 font-semibold">
              {customSpecs.weight_tonnes}T / {customSpecs.height_m}m / {customSpecs.width_m}m
            </span>
          </div>

          {/* Custom Spec Sliders */}
          {(showCustomSpecs || selectedVehicle.id === 'custom') && (
            <div className="p-3 bg-slate-900/90 rounded-lg border border-amber-500/30 space-y-2.5 animate-fadeIn">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Gross Vehicle Weight (GVW)</span>
                  <span className="font-mono text-amber-300 font-bold">{customSpecs.weight_tonnes} Tonnes</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={50}
                  step={0.5}
                  value={customSpecs.weight_tonnes}
                  onChange={e => updateCustomSpecs({ weight_tonnes: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Vehicle Height Clearance</span>
                  <span className="font-mono text-amber-300 font-bold">{customSpecs.height_m} Meters</span>
                </div>
                <input
                  type="range"
                  min={1.5}
                  max={5.0}
                  step={0.1}
                  value={customSpecs.height_m}
                  onChange={e => updateCustomSpecs({ height_m: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Vehicle Width</span>
                  <span className="font-mono text-amber-300 font-bold">{customSpecs.width_m} Meters</span>
                </div>
                <input
                  type="range"
                  min={1.5}
                  max={4.2}
                  step={0.1}
                  value={customSpecs.width_m}
                  onChange={e => updateCustomSpecs({ width_m: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. SIMULATED DYNAMIC WEATHER CONDITIONS */}
      <div className="space-y-3 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <CloudRain className="w-3.5 h-3.5 text-blue-400" />
            Live Rainfall Simulator
          </label>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${rainInfo.bg} ${rainInfo.color}`}>
            {rainInfo.label}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Precipitation Rate</span>
            <span className="font-mono text-sm font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
              {rainfallMmHr} <span className="text-xs font-normal text-slate-400">mm/hr</span>
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={50}
            step={1}
            value={rainfallMmHr}
            onChange={e => setRainfallMmHr(parseInt(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />

          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>0 mm (Clear)</span>
            <span>25 mm (Monsoon)</span>
            <span>50 mm (Flash Flood)</span>
          </div>

          {/* Quick Weather Presets */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <button
              onClick={() => setRainfallMmHr(0)}
              className="py-1 px-2 text-[11px] rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition"
            >
              ☀️ Clear (0mm)
            </button>
            <button
              onClick={() => setRainfallMmHr(24)}
              className="py-1 px-2 text-[11px] rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-sky-300 transition"
            >
              🌧️ Rain (24mm)
            </button>
            <button
              onClick={() => setRainfallMmHr(46)}
              className="py-1 px-2 text-[11px] rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-rose-300 transition"
            >
              ⛈️ Surge (46mm)
            </button>
          </div>
        </div>
      </div>

      {/* 4. GROUND OFFICER DISRUPTION INJECTOR */}
      <div className="space-y-3 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            Field Disruption Injector
          </label>
          {activeDisruptionEntries.length > 0 && (
            <button
              onClick={clearAllDisruptions}
              className="text-[11px] text-rose-400 hover:underline cursor-pointer"
            >
              Clear All
            </button>
          )}
        </div>

        <p className="text-[11px] text-slate-400">
          Simulate ground reports from Meghalaya, Assam, or Nagaland state disaster police:
        </p>

        {/* Quick Scenario Injectors */}
        <div className="grid grid-cols-1 gap-2">
          <button
            onClick={triggerScenarioNH6Landslide}
            className="w-full text-left p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-200 transition text-xs flex items-center justify-between group"
          >
            <div>
              <div className="font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                Trigger Landslide on NH-6 (Jowai-Ratacherra)
              </div>
              <p className="text-[10px] text-rose-300/80 mt-0.5">Total road blockage at Lubha Bridge</p>
            </div>
            <span className="text-rose-400 group-hover:translate-x-0.5 transition">➔</span>
          </button>

          <button
            onClick={triggerScenarioNH29FlashFlood}
            className="w-full text-left p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-200 transition text-xs flex items-center justify-between group"
          >
            <div>
              <div className="font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Flash Flood on NH-29 (Dimapur-Kohima)
              </div>
              <p className="text-[10px] text-amber-300/80 mt-0.5">Pagla Pahar river bank mudslide</p>
            </div>
            <span className="text-amber-400 group-hover:translate-x-0.5 transition">➔</span>
          </button>

          <button
            onClick={triggerScenarioHaflongBridgeRisk}
            className="w-full text-left p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-200 transition text-xs flex items-center justify-between group"
          >
            <div>
              <div className="font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                Single-Lane Convoy on Haflong Pass
              </div>
              <p className="text-[10px] text-blue-300/80 mt-0.5">Viaduct scour on Dima Hasao NH-27</p>
            </div>
            <span className="text-blue-400 group-hover:translate-x-0.5 transition">➔</span>
          </button>
        </div>

        {/* Active Disruption List */}
        {activeDisruptionEntries.length > 0 && (
          <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Active Ground Incident Log ({activeDisruptionEntries.length})
            </span>
            {activeDisruptionEntries.map(([segId, inc]) => (
              <div
                key={segId}
                className="p-2 rounded bg-slate-900/90 border border-slate-800 flex items-start justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {inc.status === 'TOTAL_BLOCKAGE' ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0"></span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                    )}
                    <span className="font-semibold text-white truncate">{segId}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{inc.description}</p>
                </div>
                <button
                  onClick={() => setSegmentDisruption(segId, 'NORMAL')}
                  className="text-slate-500 hover:text-rose-400 text-xs p-1"
                  title="Remove disruption"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
