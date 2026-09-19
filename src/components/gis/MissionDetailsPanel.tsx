import React from 'react';
import type { ReliefMission, VehicleTelemetry, RouteDefinition, SegmentIncident } from '../../types';
import { useTranslation } from '../../data/uiTranslations';
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
} from 'lucide-react';

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
}) => {
  const { t } = useTranslation();
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
            <span className="font-mono text-[11px] px-2 py-0.5 rounded-xs bg-primary-tint text-primary font-bold border border-primary/20">
              {mission.id}
            </span>
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
        <p className="text-[11px] text-text-secondary mt-0.5">
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
                  onApprove(mission.id);
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
                <div className="text-xs font-bold text-text-primary">{mission.routeDistanceKm || routeDef?.distanceKm || 68} km</div>
              </div>
              <div className="p-1.5 rounded-xs bg-surface border border-border">
                <div className="text-[9px] text-text-secondary uppercase">{t('estDuration')}</div>
                <div className="text-xs font-bold text-text-primary">{mission.routeDurationMinutes || routeDef?.expectedDurationMinutes || 110} min</div>
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
