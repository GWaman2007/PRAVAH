import React, { useMemo, useState } from 'react';
import type { ReliefMission, VehicleTelemetry, RouteDefinition, SegmentIncident, MissionRouteOption, RouteSpatialSegment } from '../../types';
import { useTranslation } from '../../data/uiTranslations';
import { usePravahStore } from '../../store/usePravahStore';
import { NER_SEGMENTS } from '../../data/routingNetwork';
import { getMissionCorridorSegments, calculateRouteModelAExposureFromCache, getAuthoritativeMissionExposure } from '../../engine/modelAService';
import {
  Navigation,
  Truck,
  Package,
  Route,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Crosshair,
  X,
  Shield,
  Phone,
  UserCheck,
  Zap,
  Gauge,
  MapPin,
  Compass,
  Check,
  RefreshCw,
  ClipboardList,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

function formatMinutes(mins: number): string {
  if (!mins || isNaN(mins)) return '0m';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

interface MissionDetailsPanelProps {
  mission: ReliefMission;
  vehicle: VehicleTelemetry | null;
  routeDef: RouteDefinition | null;
  disruptions: Record<string, SegmentIncident>;
  onClose: () => void;
  onFocusMap: () => void;
  onClearFocus: () => void;
  onApprove: (missionId: string) => void;
  onDispatch: (missionId: string, vehicleId?: string) => void;
  onInspectVehicle?: (vehicleId: string) => void;
  onSelectSegment?: (segmentId: string) => void;
  onSelectSpatialSegment?: (segment: RouteSpatialSegment, routeName?: string) => void;
}

export const MissionDetailsPanel: React.FC<MissionDetailsPanelProps> = ({
  mission,
  vehicle,
  routeDef,
  disruptions,
  onClose,
  onFocusMap,
  onClearFocus,
  onApprove,
  onDispatch,
  onInspectVehicle,
  onSelectSegment,
  onSelectSpatialSegment,
}) => {
  const {
    modelAPredictions,
    missionRouteOptionsByMissionId,
    selectedRouteOptionByMissionId,
    selectMissionRoute,
    rerouteMission,
  } = usePravahStore();
  const { t } = useTranslation();

  const [isRerouting, setIsRerouting] = useState(false);
  const [expandedSegmentId, setExpandedSegmentId] = useState<string | null>(null);

  const handleExecuteReroute = async (targetOpt?: MissionRouteOption) => {
    setIsRerouting(true);
    try {
      const chosen = targetOpt || routeOptions.find((o) => o.id === activeSelectedOptionId);
      await rerouteMission(mission.id, chosen);
    } finally {
      setIsRerouting(false);
    }
  };

  const routeOptions = missionRouteOptionsByMissionId[mission.id] || mission.routeOptions || [];
  const activeSelectedOptionId =
    selectedRouteOptionByMissionId[mission.id] ||
    mission.selectedRouteOptionId ||
    routeOptions.find((o) => o.predictedPreferredRoute)?.id ||
    routeOptions[0]?.id;

  const activeSelectedOption = routeOptions.find((o) => o.id === activeSelectedOptionId);

  const exposure = useMemo(
    () => getAuthoritativeMissionExposure(mission, modelAPredictions, NER_SEGMENTS),
    [mission, modelAPredictions]
  );

  const displayedProbability = useMemo(() => {
    if (mission.isRerouted && mission.reroutedDisruptionProbability !== undefined) {
      return mission.reroutedDisruptionProbability;
    }
    if (mission.disruptionProbability !== undefined) {
      return mission.disruptionProbability;
    }
    if (activeSelectedOption?.disruptionProbability !== undefined) {
      return activeSelectedOption.disruptionProbability;
    }
    return exposure.max_probability;
  }, [
    mission.isRerouted,
    mission.reroutedDisruptionProbability,
    mission.disruptionProbability,
    activeSelectedOption?.disruptionProbability,
    exposure.max_probability,
  ]);

  const isFieldReq = mission.source === 'FIELD_REQUISITION' || Boolean(mission.isFieldRequisition) || Boolean(mission.resourceRequestId);
  const isSuggested = mission.status === 'SUGGESTED';
  const isApproved = mission.status === 'APPROVED';
  const isInTransit = mission.status === 'IN_TRANSIT';
  const isDelivered = mission.status === 'DELIVERED';

  const relevantDisruptions = Object.entries(disruptions).filter(([segId]) =>
    routeDef ? routeDef.coordinates.length > 0 : false
  );

  return (
    <aside aria-label={t('missionOperationsDetail')} className="bg-surface border-t lg:border-t-0 lg:border-l border-border flex flex-col h-full overflow-y-auto text-text-primary text-xs pb-16 custom-scrollbar shadow-xl select-none">
      {/* Header */}
      <div className="p-4 border-b border-border bg-surface-subtle shrink-0">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-mono text-[11px] px-2 py-0.5 rounded-xs font-bold border ${
              isFieldReq ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-primary-tint text-primary border-primary/20'
            }`}>
              {mission.id}
            </span>
            {isFieldReq && !isInTransit && !isApproved && !isDelivered ? (
              <span className="px-2 py-0.5 rounded-xs font-mono font-bold text-[10px] border bg-emerald-500/20 text-emerald-400 border-emerald-500/50 flex items-center gap-1">
                <ClipboardList className="w-3 h-3 text-emerald-400" />
                FIELD REQUISITION
              </span>
            ) : (
              <span
                className={`px-2 py-0.5 rounded-xs font-mono font-bold text-[10px] border ${
                  isInTransit
                    ? 'bg-status-open-tint text-status-open-text border-status-open-solid'
                    : isApproved
                    ? 'bg-sky-500/20 text-sky-400 border-sky-500/50'
                    : isSuggested
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                    : 'bg-surface text-text-secondary border-border'
                }`}
              >
                {mission.status}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onClose}
              className="p-1 rounded-xs text-text-secondary hover:text-text-primary hover:bg-surface border border-transparent hover:border-border cursor-pointer transition-colors"
              title="Close Mission Panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <h2 className="text-sm font-bold text-text-primary leading-snug">
          {mission.communityName}
        </h2>
        {isFieldReq && (
          <div className="mt-1 px-2 py-1 rounded-xs bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-semibold flex items-center gap-1.5">
            <span>★ Genuine Ground Need Indent</span>
            {mission.requestedByOfficer && (
              <span className="text-emerald-300/80 font-normal">| Requested by {mission.requestedByOfficer}</span>
            )}
          </div>
        )}
        <p className="text-[11px] text-text-secondary mt-1">
          Priority Tier: <strong className="text-status-blocked-text">{mission.urgency.replace(/_/g, ' ')}</strong>
        </p>

        {/* Quick Map Focus Controls */}
        <div className="flex items-center gap-1.5 mt-3">
          <button
            onClick={onFocusMap}
            className="flex-1 py-1.5 px-2 bg-[#1B4B73] hover:bg-[#123A5A] text-white rounded-xs font-semibold flex items-center justify-center gap-1.5 btn-press cursor-pointer shadow-xs transition-colors"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>{t('focusOnRoute')}</span>
          </button>
          <button
            onClick={onClearFocus}
            className="py-1.5 px-2.5 bg-surface hover:bg-surface-subtle text-text-secondary hover:text-text-primary border border-border rounded-xs font-medium cursor-pointer transition-colors"
            title="Reset Map Bounds"
          >
            {t('clearFocus')}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 flex-1">
        {/* Operational Status / Workflow Card */}
        {isSuggested && (
          <div className="p-3 rounded-sm bg-amber-500/10 border border-amber-500/30 text-text-primary space-y-2">
            <div className="flex items-center gap-1.5 text-amber-500 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{t('aiWindowClosing')}</span>
            </div>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Ground telemetry forecasts road cutoff within 2.5 hours. Review cargo allocations and approve mission for fleet dispatch.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => onApprove(mission.id)}
                className="flex-1 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xs flex items-center justify-center gap-1 btn-press cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{t('approveMission')}</span>
              </button>
              <button
                onClick={() => {
                  onDispatch(mission.id, mission.assignedVehicleId);
                }}
                className="flex-1 py-1.5 bg-[#1B4B73] hover:bg-[#123A5A] text-white font-semibold rounded-xs flex items-center justify-center gap-1 btn-press cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{t('approveAndDispatch')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Model B Route Options & Candidate Paths - Only for SUGGESTED missions awaiting initial dispatch */}
        {isSuggested && !mission.isRerouted && routeOptions.length > 0 && (
          <div className="p-3 rounded-sm bg-surface-subtle border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                <Route className="w-3.5 h-3.5 text-indigo-400" />
                <span>Model B Route Options</span>
              </span>
              <span className="text-[10px] font-mono text-text-secondary">
                {routeOptions.length} FEASIBLE
              </span>
            </div>

            <div className="space-y-2">
              {routeOptions.map((opt) => {
                const isSelected = opt.id === activeSelectedOptionId;
                const isRank1 = opt.routeRank === 1 || opt.predictedPreferredRoute || opt.routeNumber === 1;

                const optSegs = opt.corridorSegmentIds || [];
                const cachedExposure = optSegs.length > 0
                  ? calculateRouteModelAExposureFromCache(optSegs, modelAPredictions).max_probability
                  : 0;
                const optProb = typeof opt.disruptionProbability === 'number' && opt.disruptionProbability > 0
                  ? opt.disruptionProbability
                  : (cachedExposure > 0 ? cachedExposure : (isRank1 ? 0.18 : 0.78));

                const isOptHigh = optProb >= 0.80;
                const isOptElevated = optProb >= 0.50 && !isOptHigh;

                return (
                  <div
                    key={opt.id}
                    onClick={() => selectMissionRoute(mission.id, opt.id)}
                    className={`p-2.5 rounded border transition cursor-pointer space-y-1.5 ${
                      isSelected
                        ? isRank1
                          ? 'bg-blue-950/25 border-blue-500 ring-1 ring-blue-500/50 shadow-md'
                          : 'bg-emerald-950/25 border-emerald-500 ring-1 ring-emerald-500/50 shadow-md'
                        : isRank1
                        ? 'bg-surface border-blue-900/40 hover:border-blue-700/60'
                        : 'bg-surface border-emerald-900/40 hover:border-emerald-700/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`w-2.5 h-2.5 rounded-full shadow-xs ${
                              isRank1 ? 'bg-blue-500' : 'bg-emerald-500'
                            }`}
                          />
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase border ${
                              isRank1
                                ? 'bg-blue-500/15 text-blue-400 border-blue-500/35'
                                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/35'
                            }`}
                          >
                            {isRank1 ? 'BEST FEASIBLE PATH' : '2ND FEASIBLE PATH'}
                          </span>
                          <span className="font-bold text-xs text-text-primary">
                            {opt.routeName || `Route ${opt.routeNumber}`}
                          </span>
                          {opt.routeSource === 'BHUVAN' && (
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              ISRO BHUVAN
                            </span>
                          )}
                          {opt.routeSource === 'GRAPH' && (
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded uppercase bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                              YEN'S K-SHORTEST
                            </span>
                          )}
                          {opt.routeSource === 'OSRM' && (
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded uppercase bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                              OSRM ENGINE
                            </span>
                          )}
                        </div>
                        {opt.routeName && (
                          <span className="text-[9.5px] text-text-secondary pl-3.5 font-medium truncate block">
                            Route {opt.routeNumber} &bull; {opt.routeName}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <span className={`text-[10px] font-bold flex items-center gap-1 shrink-0 ml-1 ${isRank1 ? 'text-blue-400' : 'text-emerald-400'}`}>
                          <Check className="w-3 h-3" /> Selected
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-text-secondary">
                      <div>Predicted ETA: <strong className="text-text-primary">{formatMinutes(opt.predictedEtaMinutes)}</strong></div>
                      {!isSuggested ? (
                        <div>
                          Disruption Risk (Model A):{' '}
                          <strong
                            className={
                              isOptHigh
                                ? 'text-red-400 font-bold'
                                : isOptElevated
                                ? 'text-orange-400 font-bold'
                                : 'text-emerald-400 font-bold'
                            }
                          >
                            {(optProb * 100).toFixed(0)}%
                          </strong>
                        </div>
                      ) : (
                        <div>
                          OSRM Baseline: <strong className="text-text-primary">{formatMinutes(opt.osrmDurationMinutes)}</strong>
                        </div>
                      )}
                      <div>Delay Factor: <strong className="text-amber-400">{opt.predictedDelayFactor.toFixed(2)}×</strong></div>
                      <div>Distance: <strong className="text-text-primary">{opt.distanceKm} km</strong></div>
                    </div>

                    {/* 5 Equal-Distance Spatial Model-A Segments (Sections 2, 3, 4, 10) */}
                    {opt.spatialSegments && opt.spatialSegments.length === 5 && (
                      <div className="mt-2.5 pt-2 border-t border-border/60 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1">
                            <Layers className="w-3 h-3 text-primary" />
                            <span>5 Spatial Model-A Slices</span>
                            <span className="text-[9px] font-mono text-text-tertiary">({(opt.distanceKm / 5).toFixed(1)} km ea)</span>
                          </span>
                          <span className="text-[9.5px] font-mono text-text-tertiary">
                            {opt.highRiskSegmentCount ? (
                              <span className="text-amber-400 font-bold">{opt.highRiskSegmentCount} Elevated</span>
                            ) : (
                              <span className="text-emerald-400 font-bold">5/5 Clear</span>
                            )}
                          </span>
                        </div>

                        <div className="grid grid-cols-5 gap-1">
                          {opt.spatialSegments.map((seg) => {
                            const isHigh = seg.modelA.probability >= 0.50;
                            const isBlocked = seg.operationalStatus.isBlocked;
                            const isRestricted = seg.operationalStatus.isRestricted;

                            let bgBorder = 'bg-surface border-border text-text-primary hover:border-primary/50';
                            let chipColor = 'text-emerald-400';
                            if (isBlocked) {
                              bgBorder = 'bg-red-500/15 border-red-500/40 text-red-300';
                              chipColor = 'text-red-400 font-bold';
                            } else if (isRestricted || isHigh) {
                              bgBorder = 'bg-amber-500/15 border-amber-500/40 text-amber-300';
                              chipColor = 'text-amber-400 font-bold';
                            }

                            const isExpanded = expandedSegmentId === seg.id;

                            return (
                              <button
                                key={seg.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectSpatialSegment?.(seg, opt.routeName);
                                  setExpandedSegmentId(isExpanded ? null : seg.id);
                                }}
                                className={`p-1 rounded-xs border text-center transition-all cursor-pointer ${bgBorder} ${
                                  isExpanded ? 'ring-1 ring-primary' : ''
                                }`}
                                title={`Segment S${seg.order} (${seg.percentageRange}) - ${seg.distanceKm} km. Disruption Risk: ${(seg.modelA.probability * 100).toFixed(0)}%. Click to inspect 17 features.`}
                              >
                                <span className="block text-[9px] font-mono font-bold">S{seg.order}</span>
                                <span className={`block text-[9.5px] font-mono ${chipColor}`}>
                                  {(seg.modelA.probability * 100).toFixed(0)}%
                                </span>
                                <span className="block text-[8px] text-text-tertiary truncate">
                                  {seg.distanceKm}k
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Expanded Spatial Segment Detail Drawer */}
                        {expandedSegmentId && opt.spatialSegments.some((s) => s.id === expandedSegmentId) && (() => {
                          const activeSeg = opt.spatialSegments.find((s) => s.id === expandedSegmentId)!;
                          const feat = activeSeg.modelA.features;
                          return (
                            <div className="p-2 mt-1 rounded bg-surface border border-primary/40 space-y-1.5 animate-fadeIn">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-bold text-primary flex items-center gap-1">
                                  <span>Segment S{activeSeg.order} ({activeSeg.percentageRange})</span>
                                  <span className="text-text-secondary font-mono">&bull; {activeSeg.distanceKm} km</span>
                                </span>
                                <span className={`font-mono text-[9.5px] px-1 py-0.2 rounded font-bold border ${
                                  activeSeg.modelA.probability >= 0.50
                                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                }`}>
                                  Risk: {(activeSeg.modelA.probability * 100).toFixed(1)}%
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-1 text-[9px] font-mono text-text-secondary">
                                <div>24h Rain: <strong className="text-text-primary">{feat.rainfall_24h} mm</strong></div>
                                <div>Mean Elev: <strong className="text-text-primary">{feat.elevation_m} m</strong></div>
                                <div>Slope: <strong className="text-text-primary">{feat.slope_degrees}°</strong></div>
                                <div>Landslides: <strong className="text-text-primary">{feat.historical_road_landslide_count}</strong></div>
                                <div>BT Pavement: <strong className="text-text-primary">{feat.bt_road_km} km ({(feat.bt_road_ratio * 100).toFixed(0)}%)</strong></div>
                                <div>ICBP/CC: <strong className="text-text-primary">{(feat.icbp_km + feat.cement_concrete_km).toFixed(1)} km</strong></div>
                              </div>
                              <div className="text-[9px] text-text-tertiary italic">
                                Status: {activeSeg.operationalStatus.incidentDescription || 'Clear and passable for convoy.'}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {isSelected && (
                      !mission.isRerouted || (mission.assignedRouteId !== opt.routeId && mission.selectedRouteOptionId !== opt.id) ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExecuteReroute(opt);
                          }}
                          disabled={isRerouting}
                          className={`w-full mt-2 py-1.5 px-2.5 text-white font-bold rounded-xs flex items-center justify-center gap-1.5 text-[11px] shadow-xs btn-press cursor-pointer transition-all disabled:opacity-50 ${
                            isRank1 ? 'bg-blue-600 hover:bg-blue-500' : 'bg-emerald-600 hover:bg-emerald-500'
                          }`}
                        >
                          {isRerouting ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>Rerouting Convoy to Corridor...</span>
                            </>
                          ) : (
                            <>
                              <Route className="w-3.5 h-3.5" />
                              <span>{isRank1 ? 'Deploy Main Best Path (Royal Blue)' : 'Reroute to 2nd Best Path (Tactical Green)'}</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="w-full mt-2 py-1.5 px-2 bg-blue-500/20 text-blue-300 font-bold rounded-xs flex items-center justify-center gap-1.5 text-[11px] border border-blue-500/40">
                          <Check className="w-3.5 h-3.5 text-blue-400" />
                          <span>Active Main Route (Rerouted & Royal Blue)</span>
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[9.5px] text-text-tertiary italic">
              ⓘ Traced curve-by-curve via ISRO Bhuvan, Yen's K-Shortest Path, and OSRM Road Engine with Model A exposure. Best feasible path in Blue (#2563EB), 2nd best path in Green (#10B981).
            </p>
          </div>
        )}

        {isApproved && (
          <div className="p-3 rounded-sm bg-sky-500/10 border border-sky-500/30 text-text-primary space-y-2">
            <div className="flex items-center gap-1.5 text-sky-400 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{t('missionApproved')}</span>
            </div>
            <p className="text-[11px] text-text-secondary">
              Relief cargo cleared by Regional Logistics Command. Dispatch immediately to lock route and activate live convoy tracking.
            </p>
            <button
              onClick={() => onDispatch(mission.id, mission.assignedVehicleId)}
              className="w-full py-2 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold rounded-xs flex items-center justify-center gap-1.5 btn-press cursor-pointer shadow-xs text-xs"
            >
              <Send className="w-4 h-4" />
              <span>{t('dispatchMissionAction')}</span>
            </button>
          </div>
        )}

        {isInTransit && (
          <div className="p-3 rounded-sm bg-status-open-tint/80 border border-status-open-solid/40 text-text-primary space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-status-open-text font-bold text-xs">
                <span className="w-2 h-2 rounded-full bg-status-open-solid animate-ping" />
                <span>{t('liveTracking')}</span>
              </div>
              <span className="font-mono text-[10px] text-text-secondary">
                {vehicle?.route_progress_pct ?? 45}% Complete
              </span>
            </div>
            <p className="text-[11px] text-text-secondary">
              Convoy is actively following the designated road corridor. GPS pings synchronized every 2 seconds.
            </p>
            {mission.isRerouted ? (
              <div className="mt-2 p-2 rounded bg-blue-500/10 border border-blue-500/30 text-[11px] text-blue-300 space-y-1">
                <div className="font-bold flex items-center gap-1 text-blue-400">
                  <Check className="w-3.5 h-3.5" />
                  <span>Convoy Rerouted to Bypass Corridor</span>
                </div>
                <div className="text-[10px] text-text-secondary font-mono">
                  {mission.suggestedDetour || mission.destinationName} &bull; {mission.routeDistanceKm} km &bull; ETA {formatMinutes(mission.routeDurationMinutes || 0)}
                </div>
                {mission.rerouteReason && (
                  <p className="text-[10px] text-text-tertiary italic">{mission.rerouteReason}</p>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleExecuteReroute()}
                disabled={isRerouting}
                className="w-full mt-2 py-1.5 px-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xs flex items-center justify-center gap-1.5 text-[11px] shadow-xs btn-press cursor-pointer transition-all disabled:opacity-50"
              >
                {isRerouting ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Calculating Safe Bypass...</span>
                  </>
                ) : (
                  <>
                    <Route className="w-3.5 h-3.5" />
                    <span>Reroute Convoy (Evade Hazard)</span>
                  </>
                )}
              </button>
            )}
            {vehicle && onInspectVehicle && (
              <button
                onClick={() => onInspectVehicle(vehicle.vehicle_id)}
                className="mt-1 w-full py-1 text-[11px] bg-surface border border-border hover:bg-surface-subtle font-medium rounded-xs flex items-center justify-center gap-1 cursor-pointer text-text-primary"
              >
                <Truck className="w-3.5 h-3.5 text-primary" />
                <span>{t('openInspector')} ({vehicle.vehicle_id})</span>
              </button>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* PRAVAH MODEL A — ROUTE RISK EXPOSURE (FROZEN XGBOOST HAZARD MODEL)         */}
        {/* ========================================================================= */}
        <div className="p-3 bg-surface-subtle rounded-sm border border-border space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${
                displayedProbability >= 0.80 ? 'bg-red-500' : displayedProbability >= 0.50 ? 'bg-orange-500' : 'bg-blue-500'
              } shadow-xs`} />
              <span className={`text-[10px] font-bold ${
                displayedProbability >= 0.80 ? 'text-red-400' : displayedProbability >= 0.50 ? 'text-orange-400' : 'text-blue-400'
              } uppercase tracking-wider`}>
                Model A Route Exposure
              </span>
            </div>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30">
              v3.4.1 XGBoost
            </span>
          </div>

          {/* Authoritative Route Disruption Probability */}
          <div className="p-2.5 rounded bg-surface border border-border flex items-center justify-between">
            <div>
              <span className="text-[10px] text-text-secondary uppercase block font-medium">
                Disruption probability
              </span>
              <span className="text-[11px] text-text-secondary">
                {isSuggested
                  ? 'Computed upon Mission Approval'
                  : mission.isRerouted
                  ? 'Live Detour Corridor (Main Route)'
                  : 'Authoritative Corridor'}
              </span>
            </div>
            <span
              className={`text-xl font-bold font-mono ${
                isSuggested
                  ? 'text-text-secondary text-xs uppercase'
                  : displayedProbability >= 0.80
                  ? 'text-rose-500'
                  : displayedProbability >= 0.50
                  ? 'text-orange-400'
                  : 'text-blue-500'
              }`}
            >
              {isSuggested ? 'Pending Approval' : `${(displayedProbability * 100).toFixed(0)}%`}
            </span>
          </div>

          {/* Warning banner if elevated risks present */}
          {!mission.isRerouted && exposure.elevated_risk_segment_count > 0 && (
            <div className="p-2 rounded bg-orange-500/10 border border-orange-500/30 text-orange-300 text-[10.5px] leading-tight flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-orange-400 mt-0.5" />
              <span>
                Elevated predicted disruption risk (&ge;50%) detected along this route.
              </span>
            </div>
          )}

          {/* Dynamic Model B Reroute Action */}
          {mission.isRerouted ? (
            <div className="p-2.5 rounded bg-blue-950/30 border border-blue-500/50 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-400 flex items-center gap-1 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Convoy Rerouted via Model B
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-bold uppercase border border-blue-500/30">
                  Active Main Route (Royal Blue)
                </span>
              </div>
              <p className="text-[10px] text-text-secondary leading-tight">
                {mission.rerouteReason || 'Alternative bypass corridor engaged to avoid high-risk road sector.'}
              </p>
              <div className="flex items-center justify-between pt-1 border-t border-blue-500/20 text-[10.5px]">
                <span className="text-text-secondary">Rerouted Route Disruption Risk:</span>
                <span className={`font-bold font-mono ${displayedProbability >= 0.80 ? 'text-red-400' : displayedProbability >= 0.50 ? 'text-orange-400' : 'text-blue-400'}`}>
                  {(displayedProbability * 100).toFixed(0)}%
                  {mission.initialDisruptionProbability !== undefined && mission.initialDisruptionProbability > displayedProbability
                    ? ` (Reduced from ${(mission.initialDisruptionProbability * 100).toFixed(0)}%)`
                    : ''}
                </span>
              </div>
              {mission.reroutedFromCoords && (
                <div className="text-[9.5px] font-mono text-blue-400 flex items-center gap-1 pt-0.5">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span>Reroute Anchor: [{mission.reroutedFromCoords[0].toFixed(4)}, {mission.reroutedFromCoords[1].toFixed(4)}]</span>
                </div>
              )}
            </div>
          ) : (displayedProbability >= 0.50 || exposure.elevated_risk_segment_count > 0) ? (
            <div className="p-2.5 rounded bg-gradient-to-b from-orange-950/40 to-amber-950/20 border border-orange-500/50 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-orange-400 flex items-center gap-1 text-[11px]">
                  <Route className="w-3.5 h-3.5" />
                  Model B Reroute Available
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30 font-bold uppercase">
                  Detour Option
                </span>
              </div>
              <p className="text-[10px] text-text-secondary leading-tight">
                Hazard probability reaches <strong>{(exposure.max_probability * 100).toFixed(0)}%</strong> on this corridor. Reroute via the next best viable route from Model B.
              </p>
              {vehicle?.current_coords && isInTransit && (
                <div className="text-[9.5px] font-mono text-orange-300 flex items-center gap-1">
                  <Truck className="w-3 h-3 text-orange-400 shrink-0" />
                  <span>Vehicle GPS: [{vehicle.current_coords[0].toFixed(4)}, {vehicle.current_coords[1].toFixed(4)}] (Reroute anchors here)</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => handleExecuteReroute()}
                disabled={isRerouting}
                className="w-full py-1.5 px-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-xs flex items-center justify-center gap-1.5 text-xs shadow-xs btn-press cursor-pointer transition-all disabled:opacity-50"
              >
                {isRerouting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Computing Next Best Route...</span>
                  </>
                ) : (
                  <>
                    <Route className="w-3.5 h-3.5" />
                    <span>Execute Dynamic Reroute (Vehicle GPS Aware)</span>
                  </>
                )}
              </button>
            </div>
          ) : null}



          <p className="text-[9px] text-text-tertiary italic leading-tight pt-1 border-t border-border/40">
            Model A predicts environmental disruption probability. Operational routing continues unless confirmed blocked by ground dispatch.
          </p>
        </div>

        {/* Route & Corridor Summary */}
        <div className="p-3 bg-surface-subtle rounded-sm border border-border space-y-2">
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">
            {t('corridorNavigation')}
          </span>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-start justify-between gap-2">
              <span className="text-text-secondary shrink-0 flex items-center gap-1">
                <Route className="w-3.5 h-3.5 text-primary" />
                <span>{t('routeCorridor')}</span>
              </span>
              <span className="font-semibold text-text-primary text-right">
                {routeDef?.name || mission.assignedRouteId}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-text-secondary flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                <span>{t('originWarehouse')}:</span>
              </span>
              <span className="font-semibold text-text-primary text-right">
                {mission.originWarehouseName || routeDef?.startHub || 'Regional Logistics Hub'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-text-secondary flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>{t('disasterZone')}</span>
              </span>
              <span className="font-semibold text-text-primary text-right">
                {mission.disasterZoneName || 'Regional Disaster Area'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-text-secondary flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-red-500" />
                <span>{t('operationalTarget')}</span>
              </span>
              <span className="font-semibold text-text-primary text-right">
                {mission.destinationName || mission.communityName}
              </span>
            </div>

            {mission.destinationEndpoint && (
              <div className="flex items-center justify-between text-[10px] font-mono text-text-tertiary">
                <span>{t('targetEndpoint')}</span>
                <span>[{mission.destinationEndpoint[0].toFixed(4)}, {mission.destinationEndpoint[1].toFixed(4)}]</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50 font-mono">
              <div className="p-1.5 rounded-xs bg-surface border border-border">
                <div className="text-[9px] text-text-secondary uppercase">{t('roadDistance')}</div>
                <div className="text-xs font-bold text-text-primary">
                  {(() => {
                    const selectedOpt = routeOptions.find((o) => o.id === activeSelectedOptionId) || routeOptions[0];
                    return selectedOpt ? `${selectedOpt.distanceKm} km` : `${mission.routeDistanceKm || routeDef?.distanceKm || 68} km`;
                  })()}
                </div>
              </div>
              <div className="p-1.5 rounded-xs bg-surface border border-border">
                <div className="text-[9px] text-text-secondary uppercase">{t('estDuration')}</div>
                <div className="text-xs font-bold text-text-primary">
                  {(() => {
                    const selectedOpt = routeOptions.find((o) => o.id === activeSelectedOptionId) || routeOptions[0];
                    return selectedOpt ? `${selectedOpt.predictedEtaMinutes} min` : `${mission.routeDurationMinutes || routeDef?.expectedDurationMinutes || 110} min`;
                  })()}
                </div>
              </div>
            </div>

            {mission.suggestedDetour && (
              <div className="p-2 rounded-xs bg-surface border border-status-open-solid/30 text-[11px] space-y-0.5 mt-1">
                <span className="font-bold text-status-open-text block">{t('designatedSafeBypass')}</span>
                <p className="text-text-secondary text-[10px] leading-tight">{mission.suggestedDetour}</p>
              </div>
            )}
          </div>
        </div>

        {/* Vehicle & Escort Personnel */}
        <div className="p-3 bg-surface-subtle rounded-sm border border-border space-y-2">
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">
            {t('assignedVehicleCrew')}
          </span>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-primary" />
                <span>{t('vehicleModel')}</span>
              </span>
              <span className="font-semibold font-mono text-text-primary">
                {mission.recommendedVehicleType}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-text-secondary flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-primary" />
                <span>{t('assignedDriver')}</span>
              </span>
              <span className="font-medium text-text-primary">
                {mission.assignedDriver || vehicle?.driver_name || 'Rajesh Mech'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-text-secondary flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-primary" />
                <span>{t('escortOfficer')}</span>
              </span>
              <span className="font-medium text-text-primary">
                {mission.assignedOfficer || vehicle?.convoy_lead_officer || 'Insp. L. Hmar'}
              </span>
            </div>

            {vehicle && (
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50 text-[10px] font-mono">
                <div className="p-1.5 rounded-xs bg-surface border border-border">
                  <span className="text-text-secondary block">{t('currentSpeed')}</span>
                  <span className="text-xs font-bold text-text-primary">{vehicle.speed_kmh} km/h</span>
                </div>
                <div className="p-1.5 rounded-xs bg-surface border border-border">
                  <span className="text-text-secondary block">{t('heading')}</span>
                  <span className="text-xs font-bold text-text-primary">{Math.round(vehicle.heading_deg ?? 0)}°</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cargo Manifest Allocation */}
        <div className="p-3 bg-surface-subtle rounded-sm border border-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1">
              <Package className="w-3.5 h-3.5 text-primary" />
              <span>{t('consignmentManifest')}</span>
            </span>
            <span className="text-[10px] font-mono text-text-secondary">
              {mission.cargoAllocations.length} {t('itemsCount')}
            </span>
          </div>

          <div className="space-y-1">
            {mission.cargoAllocations.map((item, idx) => (
              <div
                key={idx}
                className="p-1.5 rounded-xs bg-surface border border-border flex items-center justify-between text-[11px]"
              >
                <span className="font-medium text-text-primary truncate mr-2">
                  {item.item}
                </span>
                <span className="font-mono font-bold text-primary shrink-0">
                  {item.quantity} {item.unit}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Timestamps */}
        <div className="p-2.5 rounded-sm bg-surface border border-border text-[10px] font-mono text-text-secondary space-y-1">
          <div className="flex justify-between">
            <span>{t('createdAt')}</span>
            <span>{new Date(mission.createdAt).toLocaleTimeString()}</span>
          </div>
          {mission.dispatchedAt && (
            <div className="flex justify-between text-status-open-text font-bold">
              <span>{t('dispatched')}</span>
              <span>{new Date(mission.dispatchedAt).toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
