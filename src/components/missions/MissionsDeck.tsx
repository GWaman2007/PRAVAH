import React, { useState, useMemo } from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import { useTranslation } from '../../data/uiTranslations';
import { CustomizeMissionModal } from '../dispatcher/CustomizeMissionModal';
import type { ReliefMission } from '../../types';
import {
  Truck,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Send,
  Navigation as NavIcon,
  PackageCheck,
  MapPin,
  Clock,
} from 'lucide-react';

export const MissionsDeck: React.FC = () => {
  const {
    activeRole,
    activeMissions,
    vehicles,
    candidateRoutes,
    approveAndDispatchMission,
    dispatchMission,
    customizeMission,
    reportMissionDeliveryByField,
    adminCloseoutMission,
    setSelectedMissionId,
    setSelectedVehicleId,
    setActiveView,
    markMissionDelivered,
  } = usePravahStore();

  const { t } = useTranslation();

  const [activeCustomizeMission, setActiveCustomizeMission] = useState<ReliefMission | null>(null);

  // Suggested missions MUST appear first at the top
  const suggestedMissions = useMemo(
    () => activeMissions.filter((m) => m.status === 'SUGGESTED'),
    [activeMissions]
  );

  // Ongoing missions strictly display missions currently in progress, approved for dispatch, or awaiting admin closeout
  const ongoingMissions = useMemo(
    () => activeMissions.filter((m) => m.status === 'IN_TRANSIT' || m.status === 'PENDING_ADMIN_CLOSEOUT' || m.status === 'APPROVED'),
    [activeMissions]
  );

  const handleTrackOnMap = (mission: ReliefMission) => {
    setSelectedMissionId(mission.id);
    if (mission.assignedVehicleId) {
      setSelectedVehicleId(mission.assignedVehicleId);
    }
    setActiveView('GIS_COMMAND');
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
      {/* Page Header with Real-Time KPIs */}
      <div className="bg-surface border border-border p-4 sm:p-5 rounded-md shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Truck className="w-5 h-5 text-primary shrink-0" />
              <h1 className="text-base sm:text-lg font-semibold text-text-primary">
                {t('navMissions')} — Relief Operations &amp; Convoy Command
              </h1>
            </div>
            <p className="mt-1 text-xs text-text-secondary max-w-3xl leading-relaxed">
              Tactical dispatch deck prioritizing preemptive relief convoy sorties to critical sectors before
              corridor washouts sever isolated mountain populations.
            </p>
          </div>

          {/* Operational Metrics Counter */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="px-3 py-1.5 rounded-sm bg-status-blocked-tint/30 border border-status-blocked-solid/30 text-left">
              <span className="text-[10px] text-text-secondary block font-medium">{t('pendingSuggestions')}</span>
              <span className="text-base font-bold text-status-blocked-text font-mono">
                {suggestedMissions.length}
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-sm bg-primary-tint/20 border border-primary/30 text-left">
              <span className="text-[10px] text-text-secondary block font-medium">{t('activeEnRoute')}</span>
              <span className="text-base font-bold text-primary font-mono">
                {ongoingMissions.filter((m) => m.status === 'IN_TRANSIT').length}
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-sm bg-status-open-tint/30 border border-status-open-solid/30 text-left">
              <span className="text-[10px] text-text-secondary block font-medium">{t('completedDeliveries')}</span>
              <span className="text-base font-bold text-status-open-text font-mono">
                {ongoingMissions.filter((m) => m.status === 'DELIVERED').length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. SUGGESTED MISSIONS SECTION — VISIBLY AT THE TOP                         */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-border/80">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse shrink-0" />
            <h2 className="text-sm font-bold text-text-primary tracking-wide uppercase">
              {t('aiReliefSuggestions')} ({suggestedMissions.length})
            </h2>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs bg-amber-500/10 text-amber-500 border border-amber-500/30 font-bold">
            ACTION REQUIRED · TOP PRIORITY
          </span>
        </div>

        {suggestedMissions.length === 0 ? (
          <div className="bg-surface border border-border rounded-md p-6 text-center shadow-xs space-y-2 text-xs">
            <div className="w-10 h-10 rounded-full bg-status-open-tint text-status-open-solid flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-text-primary text-sm">{t('noPendingMissions')}</h3>
            <p className="text-text-secondary text-[11px] max-w-md mx-auto">
              All regional community inventory buffers are within nominal parameters. When any sector surges to P1 (Critical), an AI-tailored relief convoy mission will be generated here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestedMissions.map((mission) => {
              return (
                <div
                  key={mission.id}
                  className="bg-surface border border-status-blocked-solid/60 ring-1 ring-status-blocked-solid/20 rounded-md p-4 sm:p-5 shadow-xs space-y-4 text-xs"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-xs bg-primary-tint text-primary font-bold">
                          {mission.id}
                        </span>
                        <h3 className="font-bold text-sm text-text-primary">
                          {mission.communityName}
                        </h3>
                      </div>
                      <p className="text-[11px] text-text-secondary mt-0.5 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-status-blocked-text shrink-0" />
                        <span>Closing road failure window. Preemptive transit authorization advised.</span>
                      </p>
                    </div>

                    <span className="px-2 py-0.5 rounded-xs font-mono font-bold text-[10px] bg-status-blocked-tint text-status-blocked-text border border-status-blocked-solid">
                      {t('suggested')}
                    </span>
                  </div>

                  {/* Convoy & Logistics Breakdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-surface-subtle p-3 rounded-sm border border-border">
                    <div>
                      <span className="text-[10px] text-text-secondary block font-medium">{t('recommendedVehicle')}</span>
                      <span className="font-semibold text-text-primary flex items-center gap-1 mt-0.5">
                        <Truck className="w-3.5 h-3.5 text-primary shrink-0" />
                        {mission.recommendedVehicleType || '4x4 High-Clearance Medic Carrier'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-text-secondary block font-medium">{t('originWarehouse')}</span>
                      <span className="font-semibold text-text-primary flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-text-secondary shrink-0" />
                        {mission.originWarehouseName || 'Regional Strategic Depot'}
                      </span>
                    </div>

                    <div className="sm:col-span-2 pt-1 border-t border-border/60">
                      <span className="text-[10px] text-text-secondary block font-medium">{t('approvedBypass')}</span>
                      <span className="font-mono text-text-primary text-[10px] block mt-0.5">
                        {mission.suggestedDetour || 'Direct corridor routing'}
                      </span>
                    </div>
                  </div>

                  {/* Cargo Manifest */}
                  <div>
                    <span className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold block mb-1.5">
                      {t('tailoredReliefConsignment')}
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {mission.cargoAllocations?.map((cargo, idx) => (
                        <div
                          key={idx}
                          className="px-2 py-1 rounded-xs bg-surface border border-border/80 flex items-center justify-between text-[11px]"
                        >
                          <span className="text-text-secondary truncate max-w-[140px]">{cargo.item}</span>
                          <span className="font-mono font-bold text-text-primary shrink-0">
                            {cargo.quantity} {cargo.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                    <button
                      onClick={() => approveAndDispatchMission(mission.id)}
                      className="flex-1 py-2 px-3 rounded-sm bg-status-blocked-solid hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs btn-press cursor-pointer transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{t('dispatchMission')}</span>
                    </button>

                    <button
                      onClick={() => setActiveCustomizeMission(mission)}
                      className="py-2 px-3 rounded-sm bg-surface-subtle hover:bg-surface border border-border text-text-primary font-medium text-xs flex items-center justify-center gap-1 btn-press cursor-pointer transition-colors"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>{t('reviewCustomize')}</span>
                    </button>

                    <button
                      onClick={() => handleTrackOnMap(mission)}
                      className="py-2 px-2.5 rounded-sm bg-surface-subtle hover:bg-surface border border-border text-text-secondary hover:text-text-primary text-xs flex items-center justify-center btn-press cursor-pointer transition-colors"
                      title="View on Tactical GIS"
                    >
                      <NavIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. ONGOING MISSIONS SECTION — BELOW SUGGESTED                             */}
      {/* ========================================================================= */}
      <div className="space-y-3 pt-4 border-t border-border">
        <div className="flex items-center justify-between pb-1 border-b border-border/80">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-status-open-solid animate-ping shrink-0" />
            <h2 className="text-sm font-bold text-text-primary tracking-wide uppercase">
              {t('activeEnRouteTitle')} ({ongoingMissions.length})
            </h2>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs bg-status-open-tint text-status-open-text border border-status-open-solid/40 font-bold">
            LIVE TELEMETRY TRACKING
          </span>
        </div>

        {ongoingMissions.length === 0 ? (
          <div className="bg-surface border border-border rounded-md p-6 text-center shadow-xs text-xs text-text-secondary">
            No active convoys currently deployed. Review pending suggestions above to initiate deployment.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ongoingMissions.map((mission) => {
              const veh = vehicles.find(
                (v) => v.mission_id === mission.id || v.vehicle_id === mission.assignedVehicleId
              );

              const isPendingCloseout = mission.status === 'PENDING_ADMIN_CLOSEOUT';
              const progressPct = isPendingCloseout ? 100 : (veh?.route_progress_pct ?? 45);

              return (
                <div
                  key={mission.id}
                  className={`bg-surface border rounded-md p-4 shadow-xs space-y-3 text-xs flex flex-col justify-between transition-colors ${
                    isPendingCloseout ? 'border-amber-500/50 bg-amber-500/[0.02]' : 'border-border'
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-xs bg-primary-tint text-primary">
                            {mission.id}
                          </span>
                          <h3 className="font-bold text-text-primary text-xs truncate max-w-[160px]">
                            {mission.destinationName || mission.communityName}
                          </h3>
                        </div>
                        <span className="text-[10px] text-text-secondary block mt-0.5">
                          Origin: <strong>{mission.originWarehouseName || 'Regional Depot'}</strong>
                        </span>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-xs font-mono font-bold text-[9px] border ${
                          isPendingCloseout
                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/50 animate-pulse'
                            : mission.status === 'APPROVED'
                            ? 'bg-sky-500/20 text-sky-400 border-sky-500/50'
                            : 'bg-primary-tint text-primary border-primary/30'
                        }`}
                      >
                        {isPendingCloseout
                          ? 'PENDING ADMIN CLOSEOUT'
                          : mission.status === 'APPROVED'
                          ? 'APPROVED · READY TO DISPATCH'
                          : mission.status}
                      </span>
                    </div>

                    {/* Notice for Pending Closeout */}
                    {isPendingCloseout && (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xs p-2 text-[11px] text-amber-700 dark:text-amber-300 space-y-1">
                        <div className="font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
                          <span>Field Delivery Reported by Crew</span>
                        </div>
                        <p className="text-[10px] text-text-secondary">
                          Driver &amp; Field Officer have confirmed handover. Admin sign-off required to finalize stocks and remove from ongoing convoys.
                        </p>
                      </div>
                    )}

                    {/* Telemetry Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-text-secondary font-mono">
                        <span>{t('routeProgress')}</span>
                        <span className="font-bold text-text-primary">{progressPct.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            isPendingCloseout ? 'bg-emerald-500' : 'bg-primary'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Driver & Convoy Details */}
                    <div className="bg-surface-subtle p-2.5 rounded-sm border border-border text-[11px] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-text-secondary">{t('assignedConvoy')}:</span>
                        <span className="font-mono font-bold text-text-primary">
                          {mission.assignedVehicleId || veh?.vehicle_name || 'Convoy Unit'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-text-secondary">{t('leadDriver')}:</span>
                        <span className="font-medium text-text-primary">
                          {mission.assignedDriver || veh?.driver_name || 'Designated Driver'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-text-secondary">{t('telemetrySpeed')}:</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {isPendingCloseout ? 0 : (veh?.current_speed_kmh ?? 42)} km/h
                        </span>
                      </div>

                      {veh?.is_watchdog_amber && !isPendingCloseout && (
                        <div className="mt-1 pt-1 border-t border-border/60 text-[10px] text-amber-500 font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Watchdog SLA Amber Alert (+5m overdue)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-border">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTrackOnMap(mission)}
                        className="flex-1 py-1.5 px-2 bg-primary-tint hover:bg-primary/20 text-primary border border-primary/30 rounded-sm font-semibold text-xs flex items-center justify-center gap-1.5 btn-press cursor-pointer transition-colors"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{t('trackOnGis')}</span>
                      </button>

                      {mission.status === 'APPROVED' ? (
                        <button
                          onClick={() => dispatchMission(mission.id, mission.assignedVehicleId)}
                          className="flex-1 py-1.5 px-2 bg-[#1B4B73] hover:bg-[#123A5A] text-white rounded-sm font-semibold text-xs flex items-center justify-center gap-1 btn-press cursor-pointer transition-colors shadow-xs"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{t('dispatchMission')}</span>
                        </button>
                      ) : !isPendingCloseout ? (
                        <button
                          onClick={() => reportMissionDeliveryByField(mission.id)}
                          className="flex-1 py-1.5 px-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/40 rounded-sm font-semibold text-xs flex items-center justify-center gap-1 btn-press cursor-pointer transition-colors"
                          title="Report delivery finished by field crew"
                        >
                          <PackageCheck className="w-3.5 h-3.5" />
                          <span>Report Finished</span>
                        </button>
                      ) : null}
                    </div>

                    {/* Admin Closeout Action */}
                    {isPendingCloseout && (
                      <button
                        onClick={() => adminCloseoutMission(mission.id)}
                        className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-sm font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Sign Off &amp; Remove from Ongoing</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Customize Mission Modal */}
      {activeCustomizeMission && (
        <CustomizeMissionModal
          mission={activeCustomizeMission}
          candidateRoutes={candidateRoutes}
          onClose={() => setActiveCustomizeMission(null)}
          onDispatch={(customized) => {
            customizeMission(customized);
            setActiveCustomizeMission(null);
          }}
        />
      )}
    </div>
  );
};
