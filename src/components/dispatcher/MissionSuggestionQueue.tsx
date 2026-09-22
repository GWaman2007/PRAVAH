import React, { useState } from 'react';
import type { ReliefMission, CandidateRoute } from '../../types';
import { CustomizeMissionModal } from './CustomizeMissionModal';
import { useTranslation } from '../../data/uiTranslations';
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
} from 'lucide-react';

interface MissionSuggestionQueueProps {
  missions: ReliefMission[];
  candidateRoutes?: CandidateRoute[];
  onApproveAndDispatch: (missionId: string) => void;
  onCustomizedDispatch: (mission: ReliefMission) => void;
}

export const MissionSuggestionQueue: React.FC<MissionSuggestionQueueProps> = ({
  missions,
  candidateRoutes = [],
  onApproveAndDispatch,
  onCustomizedDispatch,
}) => {
  const { t } = useTranslation();
  const [activeCustomizeMission, setActiveCustomizeMission] = useState<ReliefMission | null>(null);

  // Strictly show only missions with status 'SUGGESTED'
  const suggestedMissions = React.useMemo(
    () => (missions || []).filter((m) => m.status === 'SUGGESTED'),
    [missions]
  );

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
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
            {t('pendingSuggestions')} ({suggestedMissions.length})
          </h2>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs bg-status-blocked-tint text-status-blocked-text border border-status-blocked-solid/40 font-bold">
          URGENCY: P1 CRITICAL CUTOFF
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {suggestedMissions.map((mission) => {
          const isPending = mission.status === 'SUGGESTED';
          const isInTransit = mission.status === 'IN_TRANSIT';

          return (
            <div
              key={mission.id}
              className={`p-4 rounded-md border transition-all shadow-xs space-y-3 text-xs ${
                isPending
                  ? 'bg-surface border-status-blocked-solid/60 ring-1 ring-status-blocked-solid/30'
                  : 'bg-surface border-border'
              }`}
            >
              {/* Header */}
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
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      {t('windowClosing')}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary mt-0.5 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-status-blocked-text shrink-0" />
                    <span>{t('impendingCutoff')}</span>
                  </p>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-xs font-mono font-bold text-[10px] border ${
                    isPending
                      ? 'bg-status-blocked-tint text-status-blocked-text border-status-blocked-solid'
                      : 'bg-status-open-tint text-status-open-text border-status-open-solid'
                  }`}
                >
                  {mission.status}
                </span>
              </div>

              {/* Recommended Rig & Route */}
              <div className="p-2.5 rounded-sm bg-surface-subtle border border-border space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-primary" />
                    <span>{t('allocatedRig')}:</span>
                  </span>
                  <span className="font-semibold text-text-primary font-mono">
                    {mission.recommendedVehicleType}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-text-secondary flex items-center gap-1 shrink-0">
                    <Route className="w-3.5 h-3.5 text-primary" />
                    <span>{t('corridor')}:</span>
                  </span>
                  <span className="font-semibold text-status-open-text font-mono text-right flex-1 truncate ml-2" title={mission.suggestedDetour}>
                    {mission.suggestedDetour}
                  </span>
                </div>
              </div>

              {/* Cargo Allocations */}
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider block">
                  {t('cargoManifestTitle')}
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {mission.cargoAllocations.map((c, i) => (
                    <div
                      key={i}
                      className="p-1.5 rounded-xs bg-surface border border-border flex items-center justify-between text-[11px]"
                      title={c.item}
                    >
                      <span className="text-text-primary font-medium truncate mr-1.5">
                        {c.item.replace(/\s*\(.*?\)/g, '')}
                      </span>
                      <span className="font-mono font-bold text-primary shrink-0">
                        {c.quantity} {c.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              {isPending && (
                <div className="grid grid-cols-2 gap-3 mt-4 w-full">
                  <button
                    onClick={() => onApproveAndDispatch(mission.id)}
                    className="h-10 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs shadow-sm transition-colors text-center cursor-pointer btn-press"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span className="leading-tight">{t('approveMission')}</span>
                  </button>
                  <button
                    onClick={() => onApproveAndDispatch(mission.id)}
                    className="h-10 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs shadow-sm transition-colors text-center cursor-pointer btn-press"
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
                    onClick={() => onApproveAndDispatch(mission.id)}
                    className="px-3.5 py-1.5 bg-[#1B4B73] hover:bg-[#123A5A] dark:bg-[#2E6B9E] text-white font-semibold rounded-sm flex items-center gap-1.5 btn-press shadow-xs cursor-pointer text-xs"
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
