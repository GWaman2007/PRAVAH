import React, { useState, useMemo } from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import {
  Home,
  Users,
  AlertTriangle,
  ShieldAlert,
  Truck,
  Package,
  Layers,
  Clock,
  Radio,
  Plus,
  RefreshCw,
  MapPin,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { QuickFieldReportModal, type QuickReportTab } from './QuickFieldReportModal';
import { formatTimeAgo } from '../../engine/offlineSync';

export const FieldOfficerCommunityView: React.FC = () => {
  const {
    userContext,
    communities,
    activeMissions,
    resourceRequirements,
    incidents,
    activeDisruptions,
    setActiveView,
    setSelectedMissionId,
    resetCommunityScenario,
  } = usePravahStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<QuickReportTab>('RESOURCE_REQUEST');

  // Identify the target community for this officer
  const targetCommunityId = userContext.communityId || 'COMMUNITY_KOLASIB';
  const community =
    communities.find((c) => c.id === targetCommunityId) ||
    communities.find((c) => c.id === 'COMMUNITY_KOLASIB') ||
    communities[0];

  // Requirements for this community
  const communityReqs = resourceRequirements[community.id] || [
    { resourceType: 'Food Kits', required: 100, available: 20, shortage: 80, unit: 'kits', urgency: 'CRITICAL', lastUpdated: '12 min ago' },
    { resourceType: 'Water Units', required: 50, available: 10, shortage: 40, unit: 'cans (20L)', urgency: 'CRITICAL', lastUpdated: '15 min ago' },
    { resourceType: 'Medical Kits', required: 20, available: 3, shortage: 17, unit: 'trauma kits', urgency: 'CRITICAL', lastUpdated: '10 min ago' },
  ];

  // Active missions targeting this community
  const communityMissions = useMemo(() => {
    return activeMissions.filter(
      (m) =>
        m.communityId === community.id ||
        m.communityName.toLowerCase().includes(community.name.toLowerCase().split(' ')[0])
    );
  }, [activeMissions, community]);

  const activeMission = communityMissions.find(
    (m) => m.status === 'IN_TRANSIT' || m.status === 'PENDING_ADMIN_CLOSEOUT' || m.status === 'APPROVED' || m.status === 'SUGGESTED'
  ) || communityMissions[0];

  // Incidents related to this community's sector
  const communityIncidents = useMemo(() => {
    return incidents.filter(
      (i) =>
        i.location.placeName.toLowerCase().includes(community.name.toLowerCase().split(' ')[0]) ||
        i.title.toLowerCase().includes(community.name.toLowerCase().split(' ')[0])
    );
  }, [incidents, community]);

  // Check if road segments leading to this community are disrupted
  const hasDisruption = Object.entries(activeDisruptions).some(
    ([segId, d]) =>
      (segId.includes('KOL') || segId.includes('KOH') || segId.includes('TEESTA')) &&
      d.status !== 'SINGLE_LANE_PASSABLE'
  );

  const openAction = (tab: QuickReportTab) => {
    setModalTab(tab);
    setModalOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5">
      {/* Community Status Hero Banner */}
      <div className="bg-surface border border-border rounded-lg p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20 uppercase tracking-wider">
                Assigned Community Command
              </span>
              <span className="font-mono text-xs text-text-tertiary">
                Sector: {userContext.jurisdictionState || community.state}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight mt-1">
              {community.name}
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Population: <strong>{community.population.toLocaleString()}</strong> residents | State: {community.state}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => openAction('INCIDENT')}
              className="px-3.5 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-semibold text-xs flex items-center gap-1.5 btn-press cursor-pointer shadow-xs"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>+ Report Incident</span>
            </button>
            <button
              onClick={() => openAction('RESOURCE_REQUEST')}
              className="px-3.5 py-2 rounded bg-primary hover:bg-primary/90 text-white font-semibold text-xs flex items-center gap-1.5 btn-press cursor-pointer shadow-xs"
            >
              <Package className="w-3.5 h-3.5" />
              <span>+ Request Resources</span>
            </button>
            <button
              onClick={() => resetCommunityScenario(community.id)}
              className="px-3 py-2 rounded bg-surface border border-border hover:bg-surface-subtle text-text-secondary font-medium text-xs flex items-center gap-1 btn-press cursor-pointer"
              title="Reset community requirements, road conditions and mission baseline"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Scenario</span>
            </button>
          </div>
        </div>

        {/* 3-Column Macro Operational Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-xs">
          <div className="p-3 rounded bg-surface-subtle border border-border flex items-center justify-between">
            <div>
              <span className="text-text-secondary block text-[11px]">Priority Tier</span>
              <span className="text-base font-bold text-red-500 font-mono">
                {community.metrics.priorityTier} CRITICAL
              </span>
            </div>
            <ShieldAlert className="w-6 h-6 text-red-500/60" />
          </div>

          <div className="p-3 rounded bg-surface-subtle border border-border flex items-center justify-between">
            <div>
              <span className="text-text-secondary block text-[11px]">Current Risk</span>
              <span className="text-base font-bold text-amber-500 font-mono">
                {community.metrics.finalScore >= 70 ? 'HIGH RISK' : 'ELEVATED'}
              </span>
            </div>
            <AlertTriangle className="w-6 h-6 text-amber-500/60" />
          </div>

          <div className="p-3 rounded bg-surface-subtle border border-border flex items-center justify-between">
            <div>
              <span className="text-text-secondary block text-[11px]">Accessibility Status</span>
              <span className="text-base font-bold text-orange-500 font-mono">
                {hasDisruption ? 'RESTRICTED' : 'CLEAR'}
              </span>
            </div>
            <Truck className="w-6 h-6 text-orange-500/60" />
          </div>
        </div>
      </div>

      {/* Grid: Resource Situation & Active Mission */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Resource Situation Card */}
        <div className="bg-surface border border-border rounded-lg p-4 sm:p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-text-primary">
                Current Resource Situation
              </h2>
            </div>
            <button
              onClick={() => setActiveView('FO_REQUIREMENTS')}
              className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>Manage Requirements</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {communityReqs.map((req, idx) => {
              const pct = Math.round((req.available / (req.required || 1)) * 100);
              const isCrit = req.shortage > 0;
              return (
                <div
                  key={idx}
                  className="p-3 rounded bg-surface-subtle border border-border space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-xs text-text-primary">{req.resourceType}</span>
                      <span className="text-[10px] text-text-tertiary ml-2">({req.unit})</span>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        req.urgency === 'CRITICAL'
                          ? 'bg-red-500/10 text-red-500'
                          : 'bg-amber-500/10 text-amber-500'
                      }`}
                    >
                      {req.urgency}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-text-secondary">
                      {req.available} available / {req.required} required
                    </span>
                    <span className={`font-bold ${isCrit ? 'text-red-500' : 'text-emerald-500'}`}>
                      Shortage: {req.shortage}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        pct < 30 ? 'bg-red-500' : pct < 70 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => openAction('RESOURCE_REQUEST')}
            className="w-full py-2 rounded border border-dashed border-primary/50 hover:bg-primary/5 text-primary text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Request Additional Emergency Cargo</span>
          </button>
        </div>

        {/* Active Mission Card */}
        <div className="bg-surface border border-border rounded-lg p-4 sm:p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-500" />
              <h2 className="text-sm font-bold text-text-primary">
                Active Inbound Mission
              </h2>
            </div>
            {activeMission && (
              <button
                onClick={() => {
                  setSelectedMissionId(activeMission.id);
                  setActiveView('FO_MISSIONS');
                }}
                className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>Mission Details</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {activeMission ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono font-bold text-xs">
                      {activeMission.id}
                    </span>
                    <span className="font-bold text-xs text-text-primary">
                      {`${activeMission.originWarehouseName} → ${activeMission.communityName}`}
                    </span>
                  </div>
                  <span className="text-[11px] text-text-tertiary block mt-0.5">
                    Hub Origin: {activeMission.originWarehouseName}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                  {activeMission.status}
                </span>
              </div>

              {/* Driver & Transit Telemetry */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded bg-surface-subtle border border-border text-[11px]">
                <div>
                  <span className="text-text-tertiary block text-[10px]">Vehicle &amp; Driver</span>
                  <span className="font-semibold text-text-primary">
                    {activeMission.assignedVehicleId || 'Medic-01'} ({activeMission.assignedDriver || 'Rajesh Mech'})
                  </span>
                </div>
                <div>
                  <span className="text-text-tertiary block text-[10px]">Estimated Transit ETA</span>
                  <span className="font-mono font-bold text-primary">
                    {activeMission.routeDurationMinutes ? `${activeMission.routeDurationMinutes} min` : '42 min'}
                  </span>
                </div>
              </div>

              {/* Manifest Allocations */}
              <div>
                <span className="text-[11px] font-semibold text-text-secondary block mb-1">
                  En Route Cargo Manifest:
                </span>
                <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                  {activeMission.cargoAllocations.map((c, i) => (
                    <div key={i} className="p-1.5 rounded bg-surface-subtle border border-border">
                      <span className="text-text-tertiary block truncate">{c.item}</span>
                      <span className="font-mono font-bold text-text-primary">
                        {c.quantity} {c.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-2.5 rounded bg-blue-500/5 border border-blue-500/20 text-[11px] text-blue-600 dark:text-blue-400 flex items-center justify-between">
                <span>Model A Corridor Risk Status:</span>
                <span className="font-mono font-bold">MONITORED SAFE</span>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-text-tertiary text-xs space-y-2">
              <Truck className="w-8 h-8 mx-auto opacity-40" />
              <p>No active missions currently inbound to {community.name}.</p>
              <button
                onClick={() => openAction('RESOURCE_REQUEST')}
                className="px-3 py-1.5 rounded bg-primary text-white font-medium text-xs cursor-pointer btn-press"
              >
                Request Relief Mission Sortie
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recent Ground Intelligence for this Sector */}
      <div className="bg-surface border border-border rounded-lg p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-text-primary">
              Recent Sector Ground Intelligence
            </h2>
          </div>
          <button
            onClick={() => setActiveView('GROUND_FEED')}
            className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <span>Open Intel Feed</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {communityIncidents.length === 0 ? (
          <div className="p-4 text-center text-text-tertiary text-xs">
            No active incidents reported in this sector in the last 24 hours.
          </div>
        ) : (
          <div className="space-y-2.5">
            {communityIncidents.slice(0, 3).map((inc) => (
              <div
                key={inc.id}
                className="p-3 rounded-md bg-surface-subtle border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-text-primary">{inc.title}</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                      {inc.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary leading-snug">
                    "{inc.title}"
                  </p>
                  <span className="text-[10px] text-text-tertiary block">
                    Reported by {inc.author.name} • {formatTimeAgo(inc.timestamp)}
                  </span>
                </div>

                {inc.mediaUrl && (
                  <img
                    src={inc.mediaUrl}
                    alt="Evidence"
                    className="w-16 h-12 object-cover rounded border border-border shrink-0"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Trigger */}
      <QuickFieldReportModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialTab={modalTab}
        defaultCommunityId={community.id}
      />
    </div>
  );
};
