import React, { useState } from 'react';
import type { ReliefMission, CandidateRoute, MissionRouteOption } from '../../types';
import { CustomizeMissionModal } from './CustomizeMissionModal';
import { useTranslation } from '../../data/uiTranslations';
import { usePravahStore } from '../../store/usePravahStore';
import {
  Sparkles,
  Truck,
  Package,
  Route,
  Clock,
  CheckCircle2,
  Sliders,
  Send,
  AlertTriangle,
  Compass,
  ArrowRight,
  Info,
  Check,
  Building,
} from 'lucide-react';

interface MissionSuggestionQueueProps {
  missions: ReliefMission[];
  candidateRoutes?: CandidateRoute[];
  onApprove?: (missionId: string) => void;
  onApproveAndDispatch: (missionId: string) => void;
  onCustomizedDispatch: (mission: ReliefMission) => void;
}

function formatMinutes(mins: number): string {
  if (!mins || isNaN(mins)) return '0m';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

export const MissionSuggestionQueue: React.FC<MissionSuggestionQueueProps> = ({
  missions,
  candidateRoutes = [],
  onApprove,
  onApproveAndDispatch,
  onCustomizedDispatch,
}) => {
  const { t } = useTranslation();
  const {
    missionRouteOptionsByMissionId,
    selectedRouteOptionByMissionId,
    selectMissionRoute,
    approveMission,
    approveAndDispatchMission,
    generateMissionRouteOptions,
    modelBLoading,
  } = usePravahStore();

  const [activeCustomizeMission, setActiveCustomizeMission] = useState<ReliefMission | null>(null);

  // Strictly show only missions with status 'SUGGESTED'
  const suggestedMissions = React.useMemo(
    () => (missions || []).filter((m) => m.status === 'SUGGESTED'),
    [missions]
  );

  const handleApprove = (missionId: string) => {
    if (onApprove) {
      onApprove(missionId);
    } else {
      approveMission(missionId);
    }
  };

  const handleApproveAndDispatch = (missionId: string) => {
    if (onApproveAndDispatch) {
      onApproveAndDispatch(missionId);
    } else {
      approveAndDispatchMission(missionId);
    }
  };

  if (suggestedMissions.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-md p-5 text-center shadow-xs space-y-2 text-xs">
        <div className="w-10 h-10 rounded-full bg-status-open-tint text-status-open-solid flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <h3 className="font-semibold text-text-primary text-sm">{t('noPendingSuggestions')}</h3>
        <p className="text-text-secondary text-[11px] max-w-sm mx-auto">
          {t('allBuffersNominal')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
            {t('pendingSuggestions')} ({suggestedMissions.length})
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs bg-status-blocked-tint text-status-blocked-text border border-status-blocked-solid/40 font-bold">
            URGENCY: P1 CRITICAL CUTOFF
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
            MODEL B REGRESSION ACTIVE
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {suggestedMissions.map((mission) => {
          const isPending = mission.status === 'SUGGESTED';
          const isInTransit = mission.status === 'IN_TRANSIT';

          const routeOptions = missionRouteOptionsByMissionId[mission.id] || mission.routeOptions || [];
          const selectedOptionId =
            selectedRouteOptionByMissionId[mission.id] ||
            mission.selectedRouteOptionId ||
            routeOptions.find((o) => o.predictedPreferredRoute)?.id ||
            routeOptions[0]?.id;

          return (
            <div
              key={mission.id}
              className={`p-4 rounded-lg border transition-all shadow-sm space-y-4 text-xs ${
                isPending
                  ? 'bg-surface border-slate-700/80 ring-1 ring-slate-800'
                  : 'bg-surface border-border'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-primary-tint text-primary font-bold">
                      {mission.id}
                    </span>
                    <h3 className="font-bold text-sm text-text-primary">
                      {mission.communityName}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      {t('windowClosing')}
                    </span>
                    <span className="text-[11px] text-text-secondary flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-status-blocked-text shrink-0" />
                      <span>{t('impendingCutoff')}</span>
                    </span>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  {mission.status}
                </span>
              </div>

              {/* Mission Logistics Triad: Hub -> Vehicle -> Destination */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2.5 rounded-md bg-surface-subtle border border-border/70 text-[11px]">
                <div className="space-y-0.5">
                  <span className="text-text-secondary flex items-center gap-1 text-[10px] uppercase font-semibold">
                    <Building className="w-3 h-3 text-sky-400" />
                    <span>Origin Hub</span>
                  </span>
                  <div className="font-semibold text-text-primary truncate" title={mission.originWarehouseName}>
                    {mission.originWarehouseName || 'Silchar Strategic Depot'}
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-text-secondary flex items-center gap-1 text-[10px] uppercase font-semibold">
                    <Truck className="w-3 h-3 text-emerald-400" />
                    <span>Allocated Rig</span>
                  </span>
                  <div className="font-semibold text-text-primary truncate" title={mission.recommendedVehicleType}>
                    {mission.recommendedVehicleType}
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-text-secondary flex items-center gap-1 text-[10px] uppercase font-semibold">
                    <Compass className="w-3 h-3 text-amber-400" />
                    <span>Target Endpoint</span>
                  </span>
                  <div className="font-semibold text-text-primary truncate" title={mission.destinationName}>
                    {mission.destinationName}
                  </div>
                </div>
              </div>

              {/* Cargo Allocations */}
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider block">
                  {t('cargoManifestTitle')}
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {mission.cargoAllocations.map((c, i) => (
                    <div
                      key={i}
                      className="p-1.5 rounded bg-surface border border-border flex items-center justify-between text-[11px]"
                      title={c.item}
                    >
                      <span className="text-text-primary font-medium truncate mr-1">
                        {c.item.replace(/\s*\(.*?\)/g, '')}
                      </span>
                      <span className="font-mono font-bold text-primary shrink-0">
                        {c.quantity} {c.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ========================================================= */}
              {/* MODEL B ROUTE OPTIONS (DYNAMIC PREDICTION)                  */}
              {/* ========================================================= */}
              <div className="space-y-2 pt-1 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Route className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
                      Model B Route Options
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-text-secondary">
                    {routeOptions.length > 0 ? `${routeOptions.length} FEASIBLE CANDIDATES` : 'EVALUATING'}
                  </span>
                </div>

                {routeOptions.length === 0 ? (
                  <div className="p-3 rounded-md bg-slate-900/60 border border-slate-800 text-center space-y-1">
                    <div className="inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-[11px] text-text-secondary">
                      Evaluating candidate corridors with OSRM and Model B delay regression...
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {routeOptions.map((opt) => {
                      const isSelected = opt.id === selectedOptionId;
                      const isRank1 = opt.routeRank === 1 || opt.predictedPreferredRoute || opt.routeNumber === 1;

                      return (
                        <div
                          key={opt.id}
                          className={`p-3 rounded-md border transition-all flex flex-col justify-between space-y-2.5 ${
                            isSelected
                              ? isRank1
                                ? 'bg-blue-950/25 border-blue-500 ring-1 ring-blue-500/40 shadow-sm'
                                : 'bg-emerald-950/25 border-emerald-500 ring-1 ring-emerald-500/40 shadow-sm'
                              : 'bg-surface-subtle/80 border-border hover:border-slate-600'
                          }`}
                        >
                          {/* Option Header */}
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`w-2.5 h-2.5 rounded-full ${
                                    isRank1 ? 'bg-blue-500 shadow-xs' : 'bg-emerald-500 shadow-xs'
                                  }`}
                                />
                                <span className="font-bold text-xs text-text-primary">
                                  ROUTE {opt.routeNumber}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <div
                                  className={`text-[10px] font-semibold tracking-wide uppercase ${
                                    isRank1 ? 'text-blue-400' : 'text-emerald-400'
                                  }`}
                                >
                                  {isRank1 ? 'Best Feasible Path' : '2nd Best Feasible Path'}
                                </div>
                                {opt.routeSource === 'BHUVAN' && (
                                  <span className="text-[9px] font-mono px-1 py-0.2 rounded uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                    ISRO Bhuvan
                                  </span>
                                )}
                                {opt.routeSource === 'GRAPH' && (
                                  <span className="text-[9px] font-mono px-1 py-0.2 rounded uppercase bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                                    Yen's K-Path
                                  </span>
                                )}
                                {opt.routeSource === 'OSRM' && (
                                  <span className="text-[9px] font-mono px-1 py-0.2 rounded uppercase bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                                    OSRM Engine
                                  </span>
                                )}
                              </div>
                            </div>

                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                                isRank1
                                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              }`}
                            >
                              {isRank1 ? 'Optimal (Royal Blue)' : 'Alternative (Tactical Green)'}
                            </span>
                          </div>

                          {/* Route Metrics Grid */}
                          <div className="grid grid-cols-2 gap-1.5 p-2 rounded bg-surface/80 border border-border/50 text-[11px] font-mono">
                            <div>
                              <span className="text-[10px] text-text-secondary block font-sans">Predicted ETA</span>
                              <span className="font-bold text-text-primary text-xs">
                                {formatMinutes(opt.predictedEtaMinutes)}
                              </span>
                            </div>

                            <div>
                              <span className="text-[10px] text-text-secondary block font-sans">OSRM Baseline</span>
                              <span className="text-text-secondary">
                                {formatMinutes(opt.osrmDurationMinutes)}
                              </span>
                            </div>

                            <div>
                              <span className="text-[10px] text-text-secondary block font-sans">Delay Factor</span>
                              <span className="font-semibold text-amber-400">
                                {opt.predictedDelayFactor.toFixed(2)}×
                              </span>
                            </div>

                            <div>
                              <span className="text-[10px] text-text-secondary block font-sans">ETA Overhead</span>
                              <span className="text-text-secondary">
                                +{formatMinutes(opt.etaOverheadMinutes)}
                              </span>
                            </div>

                            <div className="col-span-2 pt-1 border-t border-border/40 flex items-center justify-between">
                              <span className="text-[10px] text-text-secondary font-sans">Road Distance:</span>
                              <span className="font-bold text-text-primary">{opt.distanceKm} km</span>
                            </div>
                          </div>

                          {/* Select Button */}
                          <button
                            type="button"
                            onClick={() => selectMissionRoute(mission.id, opt.id)}
                            className={`w-full py-1.5 px-2 rounded font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                              isSelected
                                ? isRank1
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-blue-600 text-white shadow-xs'
                                : 'bg-surface border border-border hover:bg-surface-subtle text-text-secondary hover:text-text-primary'
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Selected for Dispatch</span>
                              </>
                            ) : (
                              <span>Select Route {opt.routeNumber}</span>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Model B Prototype Disclaimer Notice */}
                <div className="p-2 rounded bg-slate-900/50 border border-slate-800 text-[10px] text-slate-400 flex items-start gap-1.5 leading-relaxed">
                  <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Prototype prediction:</strong> Model B estimates travel delay factor using synthetic regression. Predictions do not guarantee live arrival times or physical road clearance.
                  </span>
                </div>
              </div>

              {/* Action Buttons: Explicit Separation of Approve vs Approve & Dispatch */}
              {isPending && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/60">
                  <button
                    type="button"
                    onClick={() => handleApprove(mission.id)}
                    className="h-10 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-sky-700 hover:bg-sky-600 text-white font-medium text-xs shadow-xs transition-colors text-center cursor-pointer btn-press"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span className="leading-tight">{t('approveMission')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApproveAndDispatch(mission.id)}
                    className="h-10 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs shadow-xs transition-colors text-center cursor-pointer btn-press border border-slate-700"
                  >
                    <Send className="w-4 h-4 shrink-0" />
                    <span className="leading-tight">{t('approveAndDispatch')}</span>
                  </button>
                </div>
              )}

              {isInTransit && (
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border">
                  <div className="flex items-center gap-1.5 text-status-open-text font-medium text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-status-open-solid animate-ping" />
                    <span>{t('liveTrackingActive')}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleApproveAndDispatch(mission.id)}
                    className="px-3.5 py-1.5 bg-[#1B4B73] hover:bg-[#123A5A] text-white font-semibold rounded-sm flex items-center gap-1.5 btn-press shadow-xs cursor-pointer text-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{t('viewTrackTacticalGis')}</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal for editing mission */}
      {activeCustomizeMission && (
        <CustomizeMissionModal
          mission={activeCustomizeMission}
          candidateRoutes={candidateRoutes}
          onClose={() => setActiveCustomizeMission(null)}
          onDispatch={(updated) => {
            onCustomizedDispatch(updated);
            setActiveCustomizeMission(null);
          }}
        />
      )}
    </div>
  );
};
