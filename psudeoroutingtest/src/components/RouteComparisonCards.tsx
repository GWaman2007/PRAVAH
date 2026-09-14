import React, { useState } from 'react';
import { useSimulation } from '../context/SimulationContext';
import { 
  XCircle, 
  AlertTriangle, 
  ChevronRight, 
  ChevronDown,
  Sparkles
} from 'lucide-react';

export const RouteComparisonCards: React.FC = () => {
  const { 
    candidateRoutes, 
    selectedRoute, 
    setSelectedRouteId, 
    setInspectedSegmentId,
  } = useSimulation();

  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRouteId(prev => (prev === id ? null : id));
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-slate-900/90 border-t lg:border-t-0 lg:border-l border-slate-800 text-slate-200 overflow-y-auto custom-scrollbar h-full text-xs">
      
      {/* Title & Filter Telemetry */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 m-0">
            <span>5 Candidate Corridors</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
              Yen's K-Shortest
            </span>
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Stage 1 Constraint Filter &amp; Stage 2 ML Risk Ranking
          </p>
        </div>
      </div>

      {/* Routes List */}
      <div className="space-y-3">
        {candidateRoutes.length === 0 ? (
          <div className="p-6 text-center text-slate-500 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
            No viable paths found between selected hubs.
          </div>
        ) : (
          candidateRoutes.map((route, idx) => {
            const isSelected = selectedRoute?.id === route.id;
            const isRank1 = route.rank === 1 && route.isPassable;
            const isExpanded = expandedRouteId === route.id;

            const durationHours = Math.floor(route.degradedDurationMinutes / 60);
            const durationMins = route.degradedDurationMinutes % 60;
            const delayMins = Math.max(0, route.degradedDurationMinutes - route.baseDurationMinutes);

            return (
              <div
                key={route.id}
                onClick={() => setSelectedRouteId(route.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? isRank1
                      ? 'bg-emerald-950/40 border-emerald-500/70 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/50'
                      : route.isPassable
                      ? 'bg-slate-800/80 border-sky-500/60 shadow-lg ring-1 ring-sky-500/40'
                      : 'bg-rose-950/30 border-rose-500/70 shadow-lg ring-1 ring-rose-500/40'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                {/* Header: Rank Badge & Status */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {isRank1 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-slate-950 flex items-center gap-1 shadow-sm">
                        <Sparkles className="w-3 h-3" />
                        RECOMMENDED SAFE ROUTE
                      </span>
                    ) : route.isPassable ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                        {route.rankLabel}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                        <XCircle className="w-3 h-3 text-rose-400" />
                        IMPASSABLE CORRIDOR
                      </span>
                    )}

                    {/* Color dot */}
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: route.color }}
                    />
                  </div>

                  <span className="text-[10px] font-mono text-slate-400">
                    Candidate #{idx + 1}
                  </span>
                </div>

                {/* Corridor Path Route Summary */}
                <div className="mt-2 text-xs font-semibold text-white flex items-center flex-wrap gap-1">
                  {route.pathNodeIds.map((nodeId, nIdx) => (
                    <React.Fragment key={nodeId}>
                      <span className="capitalize text-slate-200">
                        {nodeId}
                      </span>
                      {nIdx < route.pathNodeIds.length - 1 && (
                        <span className="text-slate-500 text-[10px]">➔</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-2 mt-3 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 text-center">
                  {/* Total Distance */}
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Distance</span>
                    <span className="font-mono text-sm font-bold text-white">
                      {route.totalDistanceKm} <span className="text-[10px] text-slate-400 font-normal">km</span>
                    </span>
                  </div>

                  {/* Degraded Travel Time */}
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Est. ETA</span>
                    <span className={`font-mono text-sm font-bold ${route.isPassable ? 'text-white' : 'text-slate-500 line-through'}`}>
                      {durationHours}h {durationMins}m
                    </span>
                    {delayMins > 0 && route.isPassable && (
                      <span className="block text-[9px] text-amber-400 font-mono">
                        +{delayMins}m delay
                      </span>
                    )}
                  </div>

                  {/* Safety Score */}
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Safety Score</span>
                    <span className={`font-mono text-sm font-bold ${
                      !route.isPassable
                        ? 'text-rose-400'
                        : route.compositeSafetyScore >= 75
                        ? 'text-emerald-400'
                        : route.compositeSafetyScore >= 50
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}>
                      {route.compositeSafetyScore}%
                    </span>
                  </div>
                </div>

                {/* Safety Score Progress Bar */}
                <div className="mt-2 space-y-1">
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        !route.isPassable
                          ? 'bg-rose-500'
                          : route.compositeSafetyScore >= 75
                          ? 'bg-emerald-500'
                          : route.compositeSafetyScore >= 50
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${route.compositeSafetyScore}%` }}
                    />
                  </div>
                </div>

                {/* Hard Constraint Failure Banner if Impassable */}
                {!route.isPassable && route.failureBottleneck && (
                  <div className="mt-2.5 p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-200 text-[11px] leading-relaxed">
                    <div className="font-bold flex items-center gap-1.5 text-rose-300 uppercase tracking-wider text-[10px]">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      Stage 1 Hard Constraint Failure
                    </div>
                    <p className="mt-1 text-rose-100 font-medium">
                      {route.failureBottleneck.reason}
                    </p>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-rose-300">
                      <span>Bottleneck: <strong>{route.failureBottleneck.segmentName}</strong></span>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setInspectedSegmentId(route.failureBottleneck!.segmentId);
                        }}
                        className="underline hover:text-white cursor-pointer"
                      >
                        Inspect Segment
                      </button>
                    </div>
                  </div>
                )}

                {/* Context Risk Tags */}
                <div className="mt-2.5 flex items-center flex-wrap gap-1.5">
                  {route.tags.map(tag => (
                    <span
                      key={tag}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                        tag.includes('Bottleneck')
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : tag.includes('Steep')
                          ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          : tag.includes('Rain')
                          ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                          : 'bg-slate-800 text-slate-300 border border-slate-700/60'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                  <span className="text-[10px] text-slate-500 font-mono ml-auto">
                    {route.segments.length} segments
                  </span>
                </div>

                {/* Drill Down Segment Expander */}
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <button
                    onClick={e => toggleExpand(route.id, e)}
                    className="text-slate-400 hover:text-white flex items-center gap-1 transition"
                  >
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    <span>{isExpanded ? 'Hide Segment Details' : 'View Segment-by-Segment ML Breakdown'}</span>
                  </button>

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedRouteId(route.id);
                    }}
                    className={`font-semibold transition ${
                      isSelected ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {isSelected ? '● Active View' : 'Select on Map'}
                  </button>
                </div>

                {/* Expanded Segments Table */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-800 space-y-2 animate-fadeIn">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Segment Multi-Factor Evaluation (ML Risk &amp; Speeds)
                    </div>
                    <div className="space-y-1.5">
                      {route.segments.map((seg, sIdx) => {
                        const evalSeg = route.evaluatedSegments[sIdx];
                        const isPass = evalSeg?.passHardConstraints;

                        return (
                          <div
                            key={seg.id}
                            onClick={e => {
                              e.stopPropagation();
                              setInspectedSegmentId(seg.id);
                            }}
                            className={`p-2 rounded border transition-all text-[11px] ${
                              !isPass
                                ? 'bg-rose-950/40 border-rose-700/60 text-rose-200'
                                : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between font-semibold">
                              <span className="text-white flex items-center gap-1">
                                <span className="font-mono text-[10px] text-emerald-400">{seg.highwayCode}</span>
                                <span className="truncate max-w-[170px]">{seg.name}</span>
                              </span>
                              <span className="font-mono text-[10px]">
                                {seg.distance_km} km • {evalSeg ? Math.round(evalSeg.effectiveSpeedKmh) : seg.base_speed_kmh} km/h
                              </span>
                            </div>

                            <div className="grid grid-cols-4 gap-1 mt-1 text-[10px] font-mono text-slate-400">
                              <span>Grade: <strong className="text-slate-200">{seg.gradient_pct}%</strong></span>
                              <span>LHZ: <strong className="text-slate-200">Z{seg.bhuvan_lhz_level}</strong></span>
                              <span>Max Wt: <strong className="text-slate-200">{seg.max_weight_limit}t</strong></span>
                              <span>Risk: <strong className={evalSeg?.segmentRisk > 0.5 ? 'text-amber-300' : 'text-emerald-300'}>
                                {evalSeg ? Math.round(evalSeg.segmentRisk * 100) : 0}%
                              </strong></span>
                            </div>

                            {!isPass && evalSeg?.hardConstraintFailures && (
                              <div className="mt-1 text-[10px] text-rose-300 font-semibold">
                                ⛔ {evalSeg.hardConstraintFailures[0]}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
