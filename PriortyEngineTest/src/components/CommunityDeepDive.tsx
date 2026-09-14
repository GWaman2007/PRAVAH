import React, { useMemo } from 'react';
import { 
  Building2, 
  Hospital, 
  Navigation, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  Layers, 
  Droplet,
  Pill,
  Fuel,
  Wheat,
  Timer
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine
} from 'recharts';
import type { EnrichedCommunity, CommodityType } from '../types';
import { COMMODITY_CONFIG } from '../engine/math';

interface CommunityDeepDiveProps {
  community: EnrichedCommunity;
}

export const CommunityDeepDive: React.FC<CommunityDeepDiveProps> = ({ community }) => {
  const {
    id,
    name,
    district,
    state,
    population,
    healthcareFacilities,
    ingressRouteCount,
    nearestDepotName,
    nearestDepotDistanceKm,
    transitTimeHours,
    cutoffTimeHours,
    actionableDispatchWindow,
    priorityTier,
    finalScore,
    commodityDepletions,
    terrain,
    primaryCorridorName,
    isMonsoonAlertActive,
  } = community;

  // Generate 48-hour forward simulation projection data points for Recharts
  const projectionData = useMemo(() => {
    const points = [];
    const maxHours = Math.max(48, Math.ceil(cutoffTimeHours + 12));
    const step = 2; // every 2 hours

    for (let h = 0; h <= maxHours; h += step) {
      const point: any = { hour: h };
      const keys: CommodityType[] = ['IV_FLUIDS', 'ANTIVENOM', 'GRAIN_RICE', 'DIESEL'];

      for (const k of keys) {
        const dep = commodityDepletions[k];
        // stock remaining h hours from now
        const futureStock = Math.max(0, dep.currentStock - dep.hourlyBurn * h);
        // Normalize percentage of current stock or capacity
        const capacity = COMMODITY_CONFIG[k].standardCapacity;
        point[k] = Math.round((futureStock / capacity) * 100);
      }
      points.push(point);
    }
    return points;
  }, [commodityDepletions, cutoffTimeHours]);

  // Commodity icons helper
  const getCommodityIcon = (type: CommodityType) => {
    switch (type) {
      case 'IV_FLUIDS':
        return <Droplet className="w-4 h-4 text-cyan-400" />;
      case 'ANTIVENOM':
        return <Pill className="w-4 h-4 text-purple-400" />;
      case 'GRAIN_RICE':
        return <Wheat className="w-4 h-4 text-amber-400" />;
      case 'DIESEL':
        return <Fuel className="w-4 h-4 text-emerald-400" />;
    }
  };

  // Preemptive window timeline percentage calculations
  const totalTimelineScale = Math.max(12, cutoffTimeHours * 1.3);
  const transitPct = Math.min(100, (transitTimeHours / totalTimelineScale) * 100);
  const cutoffPct = Math.min(100, (cutoffTimeHours / totalTimelineScale) * 100);
  const windowPct = Math.max(0, cutoffPct - transitPct);

  return (
    <div className="flex flex-col h-full space-y-4 overflow-y-auto pr-1.5 pt-0.5 pb-2">
      {/* 1. Header Banner & Node Metadata - with flex-shrink-0 to prevent collapsing */}
      <div className="glass-panel rounded-2xl p-4 lg:p-5 border-slate-800/80 shadow-xl relative overflow-hidden flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-950/90 border border-cyan-700/70 text-cyan-300">
                {id}
              </span>
              <h2 className="text-xl font-bold text-white font-display tracking-tight">
                {name}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                {state}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 flex flex-wrap items-center gap-1.5">
              <span>District: {district}</span>
              <span>•</span>
              <span className="text-cyan-400/90 font-medium">{terrain}</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 sm:self-center">
            <div className="text-left sm:text-right">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">
                Composite Priority
              </span>
              <div className="text-2xl font-bold font-mono text-white flex items-baseline sm:justify-end gap-1">
                <span>{finalScore.toFixed(3)}</span>
                <span className="text-xs text-slate-400 font-normal">/ 1.0</span>
              </div>
            </div>
            <div
              className={`px-3 py-1.5 rounded-xl border font-bold text-xs font-mono flex items-center gap-1.5 shadow ${
                priorityTier === 'P1'
                  ? 'bg-red-950/80 border-red-500 text-red-300 animate-siren'
                  : priorityTier === 'P2'
                  ? 'bg-amber-950/80 border-amber-500/80 text-amber-300'
                  : priorityTier === 'P3'
                  ? 'bg-yellow-950/80 border-yellow-600/70 text-yellow-300'
                  : 'bg-emerald-950/80 border-emerald-600/70 text-emerald-300'
              }`}
            >
              {priorityTier === 'P1' && (
                <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
              )}
              <span>{priorityTier}</span>
            </div>
          </div>
        </div>

        {/* Metadata Chips Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-1 text-xs">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5">
            <span className="text-[10px] text-slate-400 uppercase font-mono flex items-center gap-1">
              <Building2 className="w-3 h-3 text-cyan-400" />
              Population
            </span>
            <span className="text-sm font-bold text-white font-mono mt-0.5 block">
              {population.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500">Citizens monitored</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5">
            <span className="text-[10px] text-slate-400 uppercase font-mono flex items-center gap-1">
              <Hospital className="w-3 h-3 text-purple-400" />
              Healthcare
            </span>
            <span className="text-sm font-bold text-white font-mono mt-0.5 block">
              {healthcareFacilities} Facilities
            </span>
            <span className="text-[10px] text-slate-500">PHC / CHC Clinics</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5">
            <span className="text-[10px] text-slate-400 uppercase font-mono flex items-center gap-1">
              <Navigation className="w-3 h-3 text-indigo-400" />
              Ingress Corridors
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-sm font-bold text-white font-mono">
                {ingressRouteCount}
              </span>
              {ingressRouteCount <= 1 ? (
                <span className="text-[10px] text-red-400 font-semibold font-mono">
                  (Single Arterial)
                </span>
              ) : (
                <span className="text-[10px] text-emerald-400 font-mono">(Redundant)</span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 truncate block" title={primaryCorridorName}>
              {primaryCorridorName}
            </span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5">
            <span className="text-[10px] text-slate-400 uppercase font-mono flex items-center gap-1">
              <MapPin className="w-3 h-3 text-amber-400" />
              Nearest Depot
            </span>
            <span className="text-sm font-bold text-white font-mono mt-0.5 block">
              {nearestDepotDistanceKm} km ({transitTimeHours.toFixed(1)}h transit)
            </span>
            <span className="text-[10px] text-slate-500 truncate block" title={nearestDepotName}>
              {nearestDepotName}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Preemptive Window Timeline (Gantt Phase Bar) - with flex-shrink-0 */}
      <div className="glass-panel rounded-2xl p-4 lg:p-5 border-slate-800/80 shadow-xl space-y-3 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white font-display">
              Preemptive Dispatch Window Timeline
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs flex-shrink-0">
            <span className="text-slate-400 font-mono text-[11px]">Formula:</span>
            <span className="font-mono text-cyan-300 font-semibold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60 text-[11px] whitespace-nowrap">
              T_window = max(0, T_cutoff - T_transit)
            </span>
          </div>
        </div>

        {/* Visual Timeline Bar */}
        <div className="mt-2 space-y-2">
          <div className="h-9 w-full bg-slate-900 rounded-xl p-1 border border-slate-800 flex relative overflow-hidden">
            {/* Transit Block */}
            <div
              style={{ width: `${transitPct}%`, minWidth: '48px' }}
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-l-lg flex items-center justify-center text-[10px] font-bold text-white font-mono relative group"
              title={`Transit Time: ${transitTimeHours.toFixed(1)} hours`}
            >
              <span className="truncate px-1">
                {transitPct > 20 ? `Transit (${transitTimeHours.toFixed(1)}h)` : `${transitTimeHours.toFixed(1)}h`}
              </span>
            </div>

            {/* Actionable Dispatch Window Block */}
            {actionableDispatchWindow > 0 ? (
              <div
                style={{ width: `${windowPct}%`, minWidth: '48px' }}
                className={`h-full flex items-center justify-center text-[10px] font-bold font-mono relative transition-all ${
                  actionableDispatchWindow <= 3.0
                    ? 'bg-amber-500/90 text-slate-950 animate-pulse'
                    : 'bg-emerald-500/90 text-slate-950'
                }`}
                title={`Actionable Window: ${actionableDispatchWindow.toFixed(1)}h remaining before cutoff`}
              >
                <span className="truncate px-1 font-bold">
                  {windowPct > 20 ? `Window: ${actionableDispatchWindow.toFixed(1)}h` : `${actionableDispatchWindow.toFixed(1)}h`}
                </span>
              </div>
            ) : null}

            {/* Post Cutoff / Severed Route */}
            <div
              className="flex-1 h-full bg-red-950/50 border-l-2 border-red-500 flex items-center justify-center text-[10px] font-bold text-red-300 font-mono"
              title={`Road Cutoff at ${cutoffTimeHours.toFixed(1)}h. Corridor Severed.`}
            >
              <span className="truncate px-1">Corridor Severed</span>
            </div>
          </div>

          {/* Timeline markers under the bar */}
          <div className="flex flex-wrap justify-between gap-1 text-[10px] text-slate-400 font-mono px-1">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              T=0 (Now)
            </span>
            <span className="flex items-center gap-1 text-blue-300">
              <span>Transit: {transitTimeHours.toFixed(1)}h</span>
            </span>
            <span className="flex items-center gap-1 text-amber-300 font-semibold">
              <Timer className="w-3 h-3" />
              Cutoff: {cutoffTimeHours.toFixed(1)}h
            </span>
            <span className="flex items-center gap-1 text-red-400">
              <span>Severe Landslide Severance</span>
            </span>
          </div>
        </div>

        {/* Window Verdict Banner */}
        <div
          className={`rounded-xl p-3 border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
            actionableDispatchWindow <= 0
              ? 'bg-red-950/50 border-red-500/70 text-red-300'
              : actionableDispatchWindow <= 3.0
              ? 'bg-amber-950/40 border-amber-500/60 text-amber-300'
              : 'bg-emerald-950/40 border-emerald-600/60 text-emerald-300'
          }`}
        >
          <div className="flex items-start sm:items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <span className="font-bold">
                {actionableDispatchWindow <= 0
                  ? 'PREEMPTIVE DISPATCH WINDOW EXPIRED'
                  : actionableDispatchWindow <= 3.0
                  ? 'CRITICAL DISPATCH WINDOW: IMMEDIATE TRUCK DISPATCH REQUIRED'
                  : 'DISPATCH WINDOW OPEN: DISPATCH SCHEDULE VIABLE'}
              </span>
              <p className="text-[11px] opacity-90 mt-0.5 leading-relaxed">
                {actionableDispatchWindow <= 0
                  ? 'Ground convoys dispatched now will arrive after the road is cut off. Aerial or riverine emergency drop required.'
                  : `Convoy must depart from depot within next ${actionableDispatchWindow.toFixed(1)} hours to clear bottleneck before cutoff.`}
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right sm:pl-3 font-mono font-bold text-sm whitespace-nowrap self-end sm:self-center">
            {actionableDispatchWindow.toFixed(1)}h Left
          </div>
        </div>
      </div>

      {/* 3. 4 Stock Depletion Bar Meters - with flex-shrink-0 */}
      <div className="glass-panel rounded-2xl p-4 lg:p-5 border-slate-800/80 shadow-xl space-y-3 flex-shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white font-display">
              Multi-Commodity Depletion Meters & Run-Rates
            </h3>
          </div>
          {isMonsoonAlertActive && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-600/60 text-cyan-300 font-mono font-semibold animate-pulse">
              ϕ_surge = 1.4x Active (Medical)
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {(['IV_FLUIDS', 'ANTIVENOM', 'GRAIN_RICE', 'DIESEL'] as CommodityType[]).map((cKey) => {
            const dep = commodityDepletions[cKey];
            const cfg = COMMODITY_CONFIG[cKey];
            const capacity = cfg.standardCapacity;
            const stockPct = Math.min(100, Math.round((dep.currentStock / capacity) * 100));

            // Status color based on exhaustion vs cutoff
            let statusBadge = {
              text: 'Nominal (>72h)',
              color: 'text-emerald-400 bg-emerald-950/80 border-emerald-600/60',
              bar: 'from-emerald-500 to-teal-400',
            };
            if (dep.timeToExhaustHours <= cutoffTimeHours) {
              statusBadge = {
                text: `Exhausts BEFORE Cutoff (S_def=1.00)`,
                color: 'text-red-400 bg-red-950/80 border-red-500/80',
                bar: 'from-red-600 to-rose-500',
              };
            } else if (dep.timeToExhaustHours <= cutoffTimeHours + 48) {
              statusBadge = {
                text: `Exhausts During Isolation (S_def=0.75)`,
                color: 'text-amber-400 bg-amber-950/80 border-amber-500/80',
                bar: 'from-amber-500 to-orange-500',
              };
            } else if (dep.timeToExhaustHours <= 72) {
              statusBadge = {
                text: `Safety Buffer Alert (S_def=0.40)`,
                color: 'text-yellow-400 bg-yellow-950/80 border-yellow-600/70',
                bar: 'from-yellow-500 to-amber-500',
              };
            }

            return (
              <div
                key={cKey}
                className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2.5"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                      {getCommodityIcon(cKey)}
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-white block">
                        {dep.label}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Burn: {dep.hourlyBurn.toFixed(2)} {dep.unit}/hr{' '}
                        {dep.surgeMultiplier > 1 && (
                          <span className="text-cyan-400 font-semibold">(1.4x surge)</span>
                        )}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${statusBadge.color}`}
                  >
                    {statusBadge.text}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-300 font-bold">
                      {dep.currentStock.toFixed(0)}{' '}
                      <span className="text-[10px] text-slate-500 font-normal">/ {capacity} {dep.unit}</span>
                    </span>
                    <span className="text-slate-400 text-[11px] font-semibold">
                      {stockPct}% Capacity
                    </span>
                  </div>

                  <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                    <div
                      style={{ width: `${Math.max(2, stockPct)}%` }}
                      className={`h-full rounded-full bg-gradient-to-r ${statusBadge.bar} transition-all duration-500`}
                    />
                  </div>
                </div>

                {/* Exhaustion info footer */}
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/50 text-slate-400 font-mono">
                  <span>T_exhaust:</span>
                  <span
                    className={`font-bold ${
                      dep.timeToExhaustHours <= cutoffTimeHours
                        ? 'text-red-400'
                        : dep.timeToExhaustHours <= cutoffTimeHours + 48
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {dep.timeToExhaustHours >= 999
                      ? 'Stable (>999h)'
                      : `${dep.timeToExhaustHours.toFixed(1)} hours to zero`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Dynamic Depletion Trajectory Projection Chart - with flex-shrink-0 */}
      <div className="glass-panel rounded-2xl p-4 lg:p-5 border-slate-800/80 shadow-xl space-y-3 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white font-display">
              48-Hour Depletion Run-Rate Trajectory
            </h3>
            <p className="text-[11px] text-slate-400">
              Projected inventory exhaustion curves vs road cutoff deadline
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-cyan-400 inline-block" /> IV Fluids
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-purple-400 inline-block" /> Antivenom
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-amber-400 inline-block" /> Rice
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-emerald-400 inline-block" /> Diesel
            </span>
          </div>
        </div>

        <div className="h-56 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={projectionData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="hour"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                unit="h"
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                unit="%"
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  fontSize: '11px',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)',
                }}
                labelFormatter={(v) => `T + ${v} hours`}
                formatter={(val: any, name: any) => [
                  `${val}% capacity`,
                  COMMODITY_CONFIG[name as CommodityType]?.label || name,
                ]}
              />
              {/* Reference line for Cutoff Time */}
              <ReferenceLine
                x={cutoffTimeHours}
                stroke="#ef4444"
                strokeDasharray="4 4"
                label={{
                  value: `Cutoff (${cutoffTimeHours.toFixed(1)}h)`,
                  fill: '#f87171',
                  fontSize: 10,
                  position: 'top',
                }}
              />
              {/* Reference line for Transit Time */}
              <ReferenceLine
                x={transitTimeHours}
                stroke="#38bdf8"
                strokeDasharray="2 2"
                label={{
                  value: `Transit (${transitTimeHours.toFixed(1)}h)`,
                  fill: '#38bdf8',
                  fontSize: 10,
                  position: 'insideTopLeft',
                }}
              />
              <Line
                type="monotone"
                dataKey="IV_FLUIDS"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={false}
                name="IV_FLUIDS"
              />
              <Line
                type="monotone"
                dataKey="ANTIVENOM"
                stroke="#c084fc"
                strokeWidth={2}
                dot={false}
                name="ANTIVENOM"
              />
              <Line
                type="monotone"
                dataKey="GRAIN_RICE"
                stroke="#fbbf24"
                strokeWidth={2}
                dot={false}
                name="GRAIN_RICE"
              />
              <Line
                type="monotone"
                dataKey="DIESEL"
                stroke="#34d399"
                strokeWidth={2}
                dot={false}
                name="DIESEL"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
