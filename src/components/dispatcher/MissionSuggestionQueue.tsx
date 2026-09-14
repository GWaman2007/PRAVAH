import React, { useState } from 'react';
import type { ReliefMission, CandidateRoute } from '../../types';
import { CustomizeMissionModal } from './CustomizeMissionModal';
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
  const [activeCustomizeMission, setActiveCustomizeMission] = useState<ReliefMission | null>(null);

  if (!missions || missions.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-md p-5 text-center shadow-xs space-y-2 text-xs">
        <div className="w-10 h-10 rounded-full bg-status-open-tint text-status-open-solid flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <h3 className="font-semibold text-text-primary text-sm">No Pending Mission Suggestions</h3>
        <p className="text-text-secondary text-[11px] max-w-sm mx-auto">
          All regional community inventory buffers are within nominal safe parameters. When any sector surges to P1 (Critical), an AI-tailored relief convoy mission will be auto-generated here.
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
            AI Preemptive Relief Convoy Suggestions ({missions.length})
          </h2>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs bg-status-blocked-tint text-status-blocked-text border border-status-blocked-solid/40 font-bold">
          URGENCY: P1 CRITICAL CUTOFF
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {missions.map((mission) => {
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
                  <p className="text-[11px] text-text-secondary mt-0.5 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-status-blocked-text shrink-0" />
                    <span>Impending road cutoff. Actionable dispatch window closing!</span>
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
                    <span>Allocated Rig:</span>
                  </span>
                  <span className="font-semibold text-text-primary font-mono">
                    {mission.recommendedVehicleType}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-text-secondary flex items-center gap-1 shrink-0">
                    <Route className="w-3.5 h-3.5 text-primary" />
                    <span>Safe Detour:</span>
                  </span>
                  <span className="font-semibold text-status-open-text font-mono text-right flex-1 truncate ml-2" title={mission.suggestedDetour}>
                    {mission.suggestedDetour}
                  </span>
                </div>
              </div>

              {/* Cargo Allocations */}
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider block">
                  Preemptive Cargo Allocation Manifest
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
                <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                  <button
                    onClick={() => setActiveCustomizeMission(mission)}
                    className="px-3 py-1.5 rounded-sm border border-border text-text-secondary hover:text-text-primary hover:bg-surface-subtle font-medium flex items-center gap-1.5 btn-press cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5 text-primary" />
                    <span>Edit &amp; Customize</span>
                  </button>

                  <button
                    onClick={() => onApproveAndDispatch(mission.id)}
                    className="px-3.5 py-1.5 bg-[#1B4B73] hover:bg-[#123A5A] dark:bg-[#2E6B9E] text-white font-semibold rounded-sm flex items-center gap-1.5 btn-press shadow-xs cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Approve &amp; Dispatch</span>
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
