import React, { useState } from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import {
  Truck,
  CheckCircle2,
  PackageCheck,
  AlertTriangle,
  Clock,
  MapPin,
  ShieldCheck,
  Package,
  Layers,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Check,
} from 'lucide-react';
import type { ReliefMission } from '../../types';

export const FieldOfficerMissionsView: React.FC = () => {
  const {
    userContext,
    activeMissions,
    reportMissionDeliveryByField,
    markMissionDelivered,
    setSelectedMissionId,
    setActiveView,
  } = usePravahStore();

  const [confirmedMissions, setConfirmedMissions] = useState<Record<string, boolean>>({});

  // Target missions for this officer / community
  const relevantMissions = activeMissions.filter(
    (m) =>
      m.communityId === userContext.communityId ||
      m.communityName.toLowerCase().includes((userContext.communityName || '').toLowerCase().split(' ')[0]) ||
      m.id === userContext.activeMissionId ||
      m.status === 'IN_TRANSIT' ||
      m.status === 'PENDING_ADMIN_CLOSEOUT' ||
      m.status === 'SUGGESTED'
  );

  const handleConfirmDelivery = (mission: ReliefMission) => {
    reportMissionDeliveryByField(mission.id);
    markMissionDelivered(mission.communityId, mission.assignedVehicleId);
    setConfirmedMissions((prev) => ({ ...prev, [mission.id]: true }));
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6 text-xs text-text-primary">
      {/* Header Banner */}
      <div className="bg-surface border border-border p-4 sm:p-5 rounded-lg shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            <h1 className="text-base sm:text-lg font-bold text-text-primary">
              My Active Relief Missions &amp; Delivery Verification
            </h1>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Real-time convoy tracking and delivery receipt verification for {userContext.communityName || 'Assigned Community'}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded bg-blue-500/10 text-blue-500 font-mono font-bold text-xs">
            Sector: {userContext.jurisdictionState || 'Active Sector'}
          </span>
        </div>
      </div>

      {relevantMissions.length === 0 ? (
        <div className="p-12 text-center bg-surface border border-border rounded-lg text-text-tertiary space-y-2">
          <Truck className="w-10 h-10 mx-auto opacity-30" />
          <p className="text-sm font-semibold">No active missions for this sector.</p>
          <p className="text-xs">
            Submit a resource requirement from the Community tab to generate an engine sortie recommendation.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {relevantMissions.map((mission) => {
            const isConfirmed = confirmedMissions[mission.id];
            const isArrived =
              mission.status === 'PENDING_ADMIN_CLOSEOUT' ||
              mission.status === 'DELIVERED';

            return (
              <div
                key={mission.id}
                className={`bg-surface border rounded-lg p-4 sm:p-5 shadow-xs space-y-4 transition-all ${
                  isArrived && !isConfirmed
                    ? 'border-emerald-500/80 ring-2 ring-emerald-500/20'
                    : 'border-border'
                }`}
              >
                {/* Mission Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-primary/10 text-primary">
                        {mission.id}
                      </span>
                      <h2 className="text-sm sm:text-base font-bold text-text-primary">
                        {`${mission.originWarehouseName} → ${mission.communityName}`}
                      </h2>
                      {mission.source && (
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            mission.source === 'ENGINE_GENERATED'
                              ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                              : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          }`}
                        >
                          {mission.source === 'ENGINE_GENERATED' ? 'ENGINE GENERATED' : 'MANUAL'}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-text-secondary mt-0.5 block">
                      Target Destination: <strong>{mission.communityName}</strong> • Origin Hub: {mission.originWarehouseName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded font-mono font-bold text-xs border ${
                        mission.status === 'DELIVERED'
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                          : mission.status === 'IN_TRANSIT'
                          ? 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                          : mission.status === 'SUGGESTED'
                          ? 'bg-orange-500/10 text-orange-500 border-orange-500/30'
                          : 'bg-surface-subtle text-text-primary border-border'
                      }`}
                    >
                      {mission.status}
                    </span>
                  </div>
                </div>

                {/* Convoy Telemetry Details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-md bg-surface-subtle border border-border text-[11px]">
                  <div>
                    <span className="text-text-tertiary block text-[10px]">Vehicle Unit</span>
                    <span className="font-semibold text-text-primary">
                      {mission.assignedVehicleId || 'Medic-01 (4x4)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-tertiary block text-[10px]">Assigned Driver</span>
                    <span className="font-semibold text-text-primary">
                      {mission.assignedDriver || 'Rajesh Mech'}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-tertiary block text-[10px]">Transit Route</span>
                    <span className="font-mono text-text-primary truncate block">
                      {mission.assignedRouteId || 'NH-306 Corridor'}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-tertiary block text-[10px]">Estimated Arrival</span>
                    <span className="font-mono font-bold text-primary">
                      {mission.routeDurationMinutes ? `${mission.routeDurationMinutes} min` : '42 min'}
                    </span>
                  </div>
                </div>

                {/* Cargo Manifest Breakdown */}
                <div>
                  <span className="font-semibold text-text-secondary text-[11px] block mb-1.5">
                    Required Relief Cargo Manifest:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {mission.cargoAllocations.map((c, i) => (
                      <div
                        key={i}
                        className="p-2 rounded bg-surface-subtle border border-border text-center"
                      >
                        <span className="text-[10px] text-text-tertiary block truncate">{c.item}</span>
                        <span className="font-mono font-bold text-xs text-text-primary">
                          {c.quantity} {c.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 16: DELIVERY VERIFICATION CALLOUT */}
                {isArrived && !isConfirmed && (
                  <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PackageCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                        <div>
                          <h3 className="font-bold text-xs text-emerald-600 dark:text-emerald-400">
                            DELIVERY ARRIVED AT COMMUNITY
                          </h3>
                          <p className="text-[11px] text-text-secondary">
                            Convoy vehicle reached destination perimeter. Verify received supplies and confirm delivery.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      {mission.cargoAllocations.map((c, i) => (
                        <div key={i} className="p-2 rounded bg-surface border border-emerald-500/30">
                          <span className="text-[10px] text-text-secondary block">{c.item}</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {c.quantity} / {c.quantity}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => handleConfirmDelivery(mission)}
                        className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 btn-press cursor-pointer shadow-md"
                      >
                        <Check className="w-4 h-4" />
                        <span>CONFIRM DELIVERY</span>
                      </button>
                    </div>
                  </div>
                )}

                {isConfirmed && (
                  <div className="p-3 rounded-md bg-emerald-500/15 border border-emerald-500/40 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Delivery Confirmed by Field Officer ({userContext.name}). Mission closeout recorded.</span>
                  </div>
                )}

                {/* View Tactical Map Link */}
                <div className="flex items-center justify-end pt-1">
                  <button
                    onClick={() => {
                      setSelectedMissionId(mission.id);
                      setActiveView('GIS_COMMAND');
                    }}
                    className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
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
