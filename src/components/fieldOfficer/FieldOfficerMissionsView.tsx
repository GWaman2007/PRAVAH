import React, { useState } from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import {
  Truck,
  CheckCircle2,
  PackageCheck,
  Clock,
  MapPin,
  ChevronRight,
  Check,
  Radio,
} from 'lucide-react';
import type { ReliefMission } from '../../types';

export interface FieldOfficerMissionsViewProps {
  onNavigateToMap?: () => void;
}

export const FieldOfficerMissionsView: React.FC<FieldOfficerMissionsViewProps> = ({ onNavigateToMap }) => {
  const {
    userContext,
    activeMissions,
    reportMissionDeliveryByField,
    markMissionDelivered,
    setSelectedMissionId,
  } = usePravahStore();

  const [confirmedMissions, setConfirmedMissions] = useState<Record<string, boolean>>({});

  // Strictly ONGOING missions (IN_TRANSIT, PENDING_ADMIN_CLOSEOUT, DELIVERED) - NEVER SUGGESTED
  const relevantMissions = activeMissions.filter(
    (m) =>
      (m.communityId === userContext.communityId ||
        m.id === userContext.activeMissionId ||
        (userContext.communityName && m.communityName.toLowerCase().includes(userContext.communityName.toLowerCase().split(' ')[0]))) &&
      m.status !== 'SUGGESTED' &&
      (m.status === 'IN_TRANSIT' || m.status === 'PENDING_ADMIN_CLOSEOUT' || m.status === 'DELIVERED')
  );

  const handleConfirmDelivery = (mission: ReliefMission) => {
    reportMissionDeliveryByField(mission.id);
    markMissionDelivered(mission.communityId, mission.assignedVehicleId);
    setConfirmedMissions((prev) => ({ ...prev, [mission.id]: true }));
  };

  const handleViewConvoy = (missionId: string) => {
    setSelectedMissionId(missionId);
    if (onNavigateToMap) {
      onNavigateToMap();
    } else {
      window.dispatchEvent(new CustomEvent('pravah-navigate-map', { detail: { missionId } }));
    }
  };

  return (
    <div className="space-y-3 text-xs text-white">
      {/* Header Banner - Compact */}
      <div className="fo-card p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
            <Truck className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-white leading-tight">Ongoing Relief Missions</h2>
            <span className="text-[10px] text-slate-400">Sector: {userContext.communityName || 'Assigned Community'}</span>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
          {relevantMissions.length} Active
        </span>
      </div>

      {relevantMissions.length === 0 ? (
        <div className="fo-card p-8 text-center text-slate-500 space-y-2">
          <Truck className="w-8 h-8 mx-auto opacity-30" />
          <p className="text-xs font-semibold text-slate-400">No ongoing missions for this sector.</p>
          <p className="text-[10px]">
            Relief convoys will appear here once dispatched from regional supply hubs.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {relevantMissions.map((mission) => {
            const isConfirmed = confirmedMissions[mission.id];
            const isArrived =
              mission.status === 'PENDING_ADMIN_CLOSEOUT' ||
              mission.status === 'DELIVERED';

            return (
              <div
                key={mission.id}
                className={`fo-card p-3.5 space-y-3 transition-all ${
                  isArrived && !isConfirmed
                    ? 'border-emerald-500/60 ring-1 ring-emerald-500/30'
                    : 'border-slate-800'
                }`}
              >
                {/* Mission Header */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-[11px] text-blue-400">
                        {mission.id}
                      </span>
                      <span className="text-[10px] text-slate-500">•</span>
                      <span className="text-[11px] font-bold text-white truncate max-w-[180px]">
                        {mission.communityName}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      From: {mission.originWarehouseName}
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full font-bold text-[9px] border ${
                      mission.status === 'DELIVERED'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : mission.status === 'IN_TRANSIT'
                        ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                        : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {mission.status === 'IN_TRANSIT' ? 'En Route' : mission.status === 'PENDING_ADMIN_CLOSEOUT' ? 'Arrived' : mission.status}
                  </span>
                </div>

                {/* Convoy Telemetry Details - Compact Grid */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="fo-stat-chip p-2">
                    <span className="text-[9px] text-slate-400 block">Convoy Vehicle</span>
                    <span className="font-semibold text-white truncate block">
                      {mission.assignedVehicleId || 'Medic-01 (4x4)'}
                    </span>
                  </div>
                  <div className="fo-stat-chip p-2">
                    <span className="text-[9px] text-slate-400 block">Lead Driver</span>
                    <span className="font-semibold text-white truncate block">
                      {mission.assignedDriver || 'Rajesh Mech'}
                    </span>
                  </div>
                  <div className="fo-stat-chip p-2">
                    <span className="text-[9px] text-slate-400 block">Transit Corridor</span>
                    <span className="font-mono text-white truncate block">
                      {mission.assignedRouteId || 'NH-306 Corridor'}
                    </span>
                  </div>
                  <div className="fo-stat-chip p-2">
                    <span className="text-[9px] text-slate-400 block">Estimated Arrival</span>
                    <span className="font-mono font-bold text-blue-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {mission.routeDurationMinutes ? `${mission.routeDurationMinutes} min` : '42 min'}
                    </span>
                  </div>
                </div>

                {/* Cargo Manifest Breakdown */}
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block mb-1">
                    Relief Cargo Manifest:
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {mission.cargoAllocations.map((c, i) => (
                      <div
                        key={i}
                        className="p-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-center"
                      >
                        <span className="text-[9px] text-slate-400 block truncate">{c.item}</span>
                        <span className="font-mono font-bold text-[10px] text-white">
                          {c.quantity} {c.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* DELIVERY VERIFICATION CALLOUT */}
                {isArrived && !isConfirmed && (
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <PackageCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <h4 className="font-bold text-xs text-emerald-400 uppercase tracking-wider">
                          DELIVERY ARRIVED
                        </h4>
                        <p className="text-[10px] text-slate-300">
                          Convoy reached destination. Confirm received cargo to complete sortie.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                      {mission.cargoAllocations.map((c, i) => (
                        <div key={i} className="p-1.5 rounded-lg bg-slate-900/80 border border-emerald-500/30">
                          <span className="text-[9px] text-slate-400 block truncate">{c.item}</span>
                          <span className="font-mono font-bold text-emerald-400 text-[10px]">
                            {c.quantity}/{c.quantity}
                          </span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => handleConfirmDelivery(mission)}
                      className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 btn-press cursor-pointer shadow-md transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>CONFIRM RECEIPT</span>
                    </button>
                  </div>
                )}

                {isConfirmed && (
                  <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 flex items-center gap-2 text-emerald-400 text-[11px] font-semibold">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Receipt Confirmed by Field Officer ({userContext.name}).</span>
                  </div>
                )}

                {/* View Tactical Map Link Button - Fully Working */}
                <div className="flex items-center justify-end pt-1 border-t border-slate-800/60">
                  <button
                    onClick={() => handleViewConvoy(mission.id)}
                    className="px-3 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-400 font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer btn-press"
                  >
                    <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                    <span>View Convoy on Tactical GIS Map</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
