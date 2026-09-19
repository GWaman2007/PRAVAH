import React, { useState, useMemo } from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import { useTranslation } from '../../data/uiTranslations';
import { COMMODITY_CONFIG } from '../../engine/priorityEngine';
import { NER_SEGMENTS } from '../../data/routingNetwork';
import type { CommodityType, PriorityTier, CommunityWithCalculation } from '../../types';
import {
  Users,
  ShieldAlert,
  AlertTriangle,
  Clock,
  MapPin,
  Truck,
  Zap,
  Building2,
  CloudRain,
  ExternalLink,
  ChevronRight,
  Route as RouteIcon,
  CheckCircle2,
  HelpCircle,
  PackageCheck,
  Search,
  SlidersHorizontal,
} from 'lucide-react';

const PRIORITY_TIER_ORDER: Record<string, number> = {
  P1: 1,
  P2: 2,
  P3: 3,
  P4: 4,
};

export const CommunitiesDeck: React.FC = () => {
  const {
    communities,
    selectedCommunityId,
    setSelectedCommunityId,
    activeDisruptions,
    activeMissions,
    setActiveView,
    setSelectedMissionId,
    setSelectedVehicleId,
  } = usePravahStore();

  const { t } = useTranslation();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<string>('ALL');

  // Order communities: P1 -> P2 -> P3 -> P4, with highest score first within tier
  const sortedCommunities = useMemo(() => {
    return [...communities].sort((a, b) => {
      const tierA = a.metrics?.priorityTier || (a as any).priorityTier || 'P4';
      const tierB = b.metrics?.priorityTier || (b as any).priorityTier || 'P4';
      const rankA = PRIORITY_TIER_ORDER[tierA] ?? 99;
      const rankB = PRIORITY_TIER_ORDER[tierB] ?? 99;
      if (rankA !== rankB) {
        return rankA - rankB;
      }
      const scoreA = a.metrics?.finalScore ?? (a as any).finalScore ?? 0;
      const scoreB = b.metrics?.finalScore ?? (b as any).finalScore ?? 0;
      return scoreB - scoreA;
    });
  }, [communities]);

  // Filter based on search and selected priority filter
  const filteredCommunities = useMemo(() => {
    return sortedCommunities.filter((c) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.primaryCorridor.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterTier === 'ALL') return true;
      if (filterTier === 'CUTOFF') return (c.metrics?.actionableDispatchWindow ?? 1) <= 0;
      return c.metrics?.priorityTier === filterTier;
    });
  }, [sortedCommunities, searchQuery, filterTier]);

  // Active selected community for the Right-Side Detail Sidecard
  const selectedCommunity: CommunityWithCalculation | undefined = useMemo(() => {
    if (selectedCommunityId) {
      const found = communities.find((c) => c.id === selectedCommunityId);
      if (found) return found;
    }
    return filteredCommunities[0] || sortedCommunities[0];
  }, [selectedCommunityId, communities, filteredCommunities, sortedCommunities]);

  const getTierBadge = (tier: PriorityTier) => {
    switch (tier) {
      case 'P1':
        return 'bg-status-blocked-tint text-status-blocked-text border-status-blocked-solid';
      case 'P2':
        return 'bg-status-highrisk-tint text-status-highrisk-text border-status-highrisk-solid';
      case 'P3':
        return 'bg-status-restricted-tint text-status-restricted-text border-status-restricted-solid';
      case 'P4':
        return 'bg-status-open-tint text-status-open-text border-status-open-solid';
    }
  };

  // Trace community primaryCorridor -> existing disruption/road status
  const matchedRoadStatus = useMemo(() => {
    if (!selectedCommunity) return null;
    const corridor = selectedCommunity.primaryCorridor.toLowerCase();

    // Check all active disruptions to match segment name, road number, or corridor flair
    for (const [segId, disruption] of Object.entries(activeDisruptions)) {
      const segment = NER_SEGMENTS.find((s) => s.id === segId);
      if (
        corridor.includes(segId.toLowerCase()) ||
        (segment && corridor.includes(segment.highway.toLowerCase())) ||
        (segment && corridor.includes(segment.name.toLowerCase()))
      ) {
        return {
          segmentId: segId,
          roadName: segment?.highway || selectedCommunity.primaryCorridor,
          segmentName: segment?.name || 'Corridor Segment',
          ...disruption,
        };
      }
    }
    return null;
  }, [selectedCommunity, activeDisruptions]);

  // Trace existing missions servicing this community
  const connectedMissions = useMemo(() => {
    if (!selectedCommunity) return [];
    return activeMissions.filter(
      (m) => m.communityId === selectedCommunity.id || m.destinationName?.includes(selectedCommunity.name)
    );
  }, [selectedCommunity, activeMissions]);

  // Navigate to Tactical GIS focusing this community
  const handleViewOnTacticalGIS = (community: CommunityWithCalculation) => {
    setSelectedCommunityId(community.id);
    const relatedMission = activeMissions.find((m) => m.communityId === community.id);
    if (relatedMission) {
      setSelectedMissionId(relatedMission.id);
      if (relatedMission.assignedVehicleId) {
        setSelectedVehicleId(relatedMission.assignedVehicleId);
      }
    } else {
      setSelectedMissionId(null);
    }
    setActiveView('GIS_COMMAND');
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Top Banner: Communities Operational Overview */}
      <div className="bg-surface border border-border p-4 sm:p-5 rounded-md shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-primary shrink-0" />
              <h1 className="text-base sm:text-lg font-semibold text-text-primary">
                {t('navCommunities')} — Preemptive Depletion &amp; Cutoff Triage
              </h1>
            </div>
            <p className="mt-1 text-xs text-text-secondary max-w-3xl leading-relaxed">
              Real-time operational monitoring of vulnerable North Eastern hill communities, isolation risk
              trajectories, impending corridor cutoffs, and life-critical commodity depletion buffers.
            </p>
          </div>

          {/* KPI Pills */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="px-3 py-1.5 rounded-sm bg-status-blocked-tint/30 border border-status-blocked-solid/30 text-left">
              <span className="text-[10px] text-text-secondary block font-medium">P1 Critical</span>
              <span className="text-base font-bold text-status-blocked-text font-mono">
                {sortedCommunities.filter((c) => c.metrics.priorityTier === 'P1').length}
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-sm bg-status-highrisk-tint/30 border border-status-highrisk-solid/30 text-left">
              <span className="text-[10px] text-text-secondary block font-medium">Window Closed</span>
              <span className="text-base font-bold text-status-highrisk-text font-mono">
                {sortedCommunities.filter((c) => c.metrics.actionableDispatchWindow <= 0).length}
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-sm bg-surface-subtle border border-border text-left">
              <span className="text-[10px] text-text-secondary block font-medium">Total Monitored</span>
              <span className="text-base font-bold text-text-primary font-mono">
                {sortedCommunities.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-surface border border-border p-3 rounded-md shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-text-secondary absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-subtle border border-border rounded-sm pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <span className="text-[10px] text-text-secondary uppercase font-semibold mr-1 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3" /> Filter:
          </span>
          {[
            { id: 'ALL', label: 'All Sectors' },
            { id: 'P1', label: 'P1 Critical' },
            { id: 'CUTOFF', label: 'Window Closed' },
            { id: 'P2', label: 'P2 High' },
            { id: 'P3', label: 'P3 Moderate' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTier(tab.id)}
              className={`px-2.5 py-1 text-xs rounded-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                filterTier === tab.id
                  ? 'bg-primary text-white font-bold'
                  : 'bg-surface-subtle text-text-secondary hover:text-text-primary border border-border'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Community Cards (Left 5 Cols) + Detail Sidecard (Right 7 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Community Cards List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wide">
              Critical Sectors Triage ({filteredCommunities.length})
            </h2>
            <span className="text-[10px] text-text-secondary font-mono">
              Highest Urgency First
            </span>
          </div>

          <div className="space-y-2.5">
            {filteredCommunities.length === 0 ? (
              <div className="p-6 text-center bg-surface border border-border rounded-md text-text-secondary text-xs">
                No communities match the current filter.
              </div>
            ) : (
              filteredCommunities.map((community) => {
                const isSelected = selectedCommunity?.id === community.id;
                const { metrics } = community;
                const isWindowClosed = metrics.actionableDispatchWindow <= 0;
                const isImminent = metrics.actionableDispatchWindow > 0 && metrics.actionableDispatchWindow <= 3;

                return (
                  <div
                    key={community.id}
                    onClick={() => setSelectedCommunityId(community.id)}
                    className={`p-3.5 sm:p-4 rounded-md border transition-all cursor-pointer space-y-2.5 shadow-xs ${
                      isSelected
                        ? 'border-primary bg-primary-tint/20 dark:bg-primary-tint/10 ring-1 ring-primary'
                        : 'border-border bg-surface hover:bg-surface-subtle'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span
                            className={`px-2 py-0.5 text-xs font-bold rounded-sm border ${getTierBadge(
                              metrics.priorityTier
                            )}`}
                          >
                            {metrics.priorityTier}
                          </span>
                          <h3 className="font-bold text-sm text-text-primary truncate">
                            {community.name}
                          </h3>
                        </div>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {community.district}, {community.state}
                        </p>
                      </div>

                      <div className="text-right font-mono shrink-0">
                        <div className="text-base font-bold text-text-primary">
                          {metrics.finalScore.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-text-secondary">Priority Score</div>
                      </div>
                    </div>

                    {/* Operational Status Tag */}
                    <div className="flex items-center gap-2">
                      {isWindowClosed ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs text-[10px] font-bold bg-status-blocked-tint text-status-blocked-text border border-status-blocked-solid/40">
                          <AlertTriangle className="w-3 h-3" /> WINDOW CLOSED
                        </span>
                      ) : isImminent ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30">
                          <Clock className="w-3 h-3" /> IMMINENT CUTOFF (&lt;3h)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> BUFFER ACTIVE
                        </span>
                      )}

                      {community.isMonsoonAlertActive && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs text-[10px] font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20">
                          <CloudRain className="w-3 h-3" /> Monsoon Surge
                        </span>
                      )}
                    </div>

                    {/* Primary Corridor */}
                    <div className="text-[11px] text-text-secondary bg-surface-subtle p-2 rounded-xs border border-border/80">
                      <span className="text-[10px] block text-text-secondary font-medium">Primary Corridor:</span>
                      <span className="font-mono text-text-primary text-[11px] truncate block">
                        {community.primaryCorridor}
                      </span>
                    </div>

                    {/* Footer Metrics Row */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60 text-xs">
                      <div>
                        <span className="text-[10px] text-text-secondary block">Action Window:</span>
                        <span
                          className={`font-semibold ${
                            isWindowClosed
                              ? 'text-status-blocked-text'
                              : isImminent
                              ? 'text-status-highrisk-text'
                              : 'text-text-primary'
                          }`}
                        >
                          {metrics.actionableDispatchWindow > 0
                            ? `${metrics.actionableDispatchWindow.toFixed(1)}h`
                            : 'CLOSED'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-text-secondary block">Cutoff (T_c):</span>
                        <span className="font-semibold text-text-primary font-mono">
                          {(community.cutoffTimeHours ?? 48).toFixed(1)}h
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-text-secondary block">Pop / Health:</span>
                        <span className="font-semibold text-text-secondary font-mono">
                          {community.population.toLocaleString()} / {community.healthcareFacilities} PHC
                        </span>
                      </div>
                    </div>

                    {/* Quick View on Map Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewOnTacticalGIS(community);
                      }}
                      className="w-full mt-1.5 py-1.5 px-3 bg-surface-subtle hover:bg-primary hover:text-white text-text-secondary border border-border hover:border-primary rounded-xs text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>VIEW ON TACTICAL GIS</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detailed Community Sidecard */}
        <div className="lg:col-span-7 space-y-4">
          {selectedCommunity ? (
            <div className="bg-surface border border-border rounded-md p-4 sm:p-6 shadow-sm space-y-5">
              {/* Sidecard Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-border">
                <div>
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <h2 className="text-lg font-bold text-text-primary">
                      {selectedCommunity.name}
                    </h2>
                    <span
                      className={`px-2 py-0.5 text-xs font-bold rounded-sm border ${getTierBadge(
                        selectedCommunity.metrics.priorityTier
                      )}`}
                    >
                      {selectedCommunity.metrics.priorityTier} TIER
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-1">
                    {selectedCommunity.district}, {selectedCommunity.state} · Population:{' '}
                    <strong>{selectedCommunity.population.toLocaleString()}</strong> · Healthcare Facilities:{' '}
                    <strong>{selectedCommunity.healthcareFacilities}</strong>
                  </p>
                </div>

                {/* Tactical GIS View Action Button */}
                <button
                  onClick={() => handleViewOnTacticalGIS(selectedCommunity)}
                  className="px-3.5 py-2 bg-primary hover:bg-primary/90 text-white rounded-sm text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs btn-press cursor-pointer shrink-0 transition-colors"
                >
                  <MapPin className="w-4 h-4" />
                  <span>VIEW ON TACTICAL GIS</span>
                </button>
              </div>

              {/* 1. Basic Information Grid */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                  Basic Logistics Profile
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-sm bg-surface-subtle border border-border">
                    <span className="text-[10px] text-text-secondary block">Final Score:</span>
                    <span className="text-base font-bold text-text-primary font-mono mt-0.5 block">
                      {selectedCommunity.metrics.finalScore.toFixed(3)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-sm bg-surface-subtle border border-border">
                    <span className="text-[10px] text-text-secondary block">Nearest Strategic Depot:</span>
                    <span className="font-semibold text-text-primary text-[11px] mt-0.5 block truncate" title={selectedCommunity.nearestDepotName}>
                      {selectedCommunity.nearestDepotName}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-sm bg-surface-subtle border border-border">
                    <span className="text-[10px] text-text-secondary block">Active Requisition Indent:</span>
                    <span className={`font-semibold text-[11px] mt-0.5 block ${selectedCommunity.hasActiveIndent ? 'text-amber-500' : 'text-text-secondary'}`}>
                      {selectedCommunity.hasActiveIndent ? 'YES (High Urgency)' : 'NO (Standard)'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-sm bg-surface-subtle border border-border">
                    <span className="text-[10px] text-text-secondary block">Primary Ingress Corridor:</span>
                    <span className="font-mono text-[11px] text-text-primary mt-0.5 block truncate" title={selectedCommunity.primaryCorridor}>
                      {selectedCommunity.primaryCorridor}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Cutoff & Accessibility Intelligence */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                  Cutoff &amp; Accessibility Parameters
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-sm bg-surface-subtle border border-border">
                    <span className="text-[10px] text-text-secondary block">Cutoff (T_cutoff):</span>
                    <span className="font-mono font-bold text-text-primary text-sm mt-0.5 block">
                      {selectedCommunity.cutoffTimeHours.toFixed(1)} hrs
                    </span>
                  </div>

                  <div className="p-2.5 rounded-sm bg-surface-subtle border border-border">
                    <span className="text-[10px] text-text-secondary block">Transit (T_transit):</span>
                    <span className="font-mono font-bold text-text-primary text-sm mt-0.5 block">
                      {selectedCommunity.transitTimeHours.toFixed(1)} hrs
                    </span>
                  </div>

                  <div className="p-2.5 rounded-sm bg-surface-subtle border border-border">
                    <span className="text-[10px] text-text-secondary block">Action Window (T_window):</span>
                    <span className={`font-mono font-bold text-sm mt-0.5 block ${selectedCommunity.metrics.actionableDispatchWindow <= 0 ? 'text-status-blocked-text' : 'text-text-primary'}`}>
                      {selectedCommunity.metrics.actionableDispatchWindow > 0
                        ? `${selectedCommunity.metrics.actionableDispatchWindow.toFixed(1)} hrs`
                        : 'CLOSED (0.0h)'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-sm bg-surface-subtle border border-border">
                    <span className="text-[10px] text-text-secondary block">Elapsed Time:</span>
                    <span className="font-mono font-bold text-text-secondary text-sm mt-0.5 block">
                      +{selectedCommunity.elapsedTimeHours} hrs
                    </span>
                  </div>

                  <div className="p-2.5 rounded-sm bg-surface-subtle border border-border">
                    <span className="text-[10px] text-text-secondary block">Isolation Risk (R_iso):</span>
                    <span className="font-mono font-bold text-text-primary text-sm mt-0.5 block">
                      {selectedCommunity.metrics.isolationRisk.toFixed(2)}
                    </span>
                    <span className="text-[9px] text-text-secondary">Ingress: {selectedCommunity.ingressRouteCount} path(s)</span>
                  </div>

                  <div className="p-2.5 rounded-sm bg-surface-subtle border border-border">
                    <span className="text-[10px] text-text-secondary block">Disruption Prob P(disrupt):</span>
                    <span className="font-mono font-bold text-text-primary text-sm mt-0.5 block">
                      {(selectedCommunity.disruptionProbMax * 100).toFixed(0)}%
                    </span>
                  </div>

                  <div className="p-2.5 rounded-sm bg-surface-subtle border border-border">
                    <span className="text-[10px] text-text-secondary block">Vulnerability Index (I_vuln):</span>
                    <span className="font-mono font-bold text-text-primary text-sm mt-0.5 block">
                      {selectedCommunity.metrics.vulnerabilityIndex.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-sm bg-surface-subtle border border-border">
                    <span className="text-[10px] text-text-secondary block">Supply Deficit (S_def):</span>
                    <span className="font-mono font-bold text-status-blocked-text text-sm mt-0.5 block">
                      {selectedCommunity.metrics.supplyDeficitFactor.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Reason for Urgency banner */}
                <div className="p-2.5 rounded-sm bg-surface-subtle border border-border/80 text-xs">
                  <span className="text-[10px] font-bold text-text-secondary uppercase block mb-0.5">
                    Calculated Operational Reason:
                  </span>
                  <p className="text-text-primary text-[11px] leading-relaxed">
                    {selectedCommunity.metrics.actionableDispatchWindow <= 0
                      ? `Dispatch window is CLOSED because Cutoff Time (${selectedCommunity.cutoffTimeHours.toFixed(1)}h) is less than or equal to Transit Duration (${selectedCommunity.transitTimeHours.toFixed(1)}h). Mountain convoys departing now cannot safely reach the PHC before corridor severance.`
                      : `Actionable dispatch window of ${selectedCommunity.metrics.actionableDispatchWindow.toFixed(1)}h remains before corridor failure. Ground convoy departure required within this window.`}
                  </p>
                </div>
              </div>

              {/* 3. Current Road / Corridor Status */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center justify-between">
                  <span>Current Road &amp; Corridor Status</span>
                  <span className="text-[10px] text-text-secondary font-mono">
                    Traced from {selectedCommunity.primaryCorridor}
                  </span>
                </h3>

                {matchedRoadStatus ? (
                  <div className="p-3 bg-surface-subtle border border-status-blocked-solid/40 rounded-sm space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RouteIcon className="w-4 h-4 text-status-blocked-text shrink-0" />
                        <span className="font-bold text-text-primary">{matchedRoadStatus.roadName}</span>
                        <span className="text-text-secondary">({matchedRoadStatus.segmentName})</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-xs font-mono font-bold text-[10px] bg-status-blocked-tint text-status-blocked-text border border-status-blocked-solid">
                        {matchedRoadStatus.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1 border-t border-border/60">
                      <div>
                        <span className="text-[10px] text-text-secondary block">Blockage Cause:</span>
                        <strong className="text-text-primary">{matchedRoadStatus.cause}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-text-secondary block">Reported By:</span>
                        <strong className="text-text-primary">{matchedRoadStatus.reportedBy || 'BRO Project Control'}</strong>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-[10px] text-text-secondary block">Field Condition Description:</span>
                        <span className="text-text-secondary">{matchedRoadStatus.description}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-surface-subtle border border-border rounded-sm text-xs text-text-secondary flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-text-secondary shrink-0" />
                    <span>Road status unavailable for corridor {selectedCommunity.primaryCorridor}. No active disruption reported on monitored segments.</span>
                  </div>
                )}
              </div>

              {/* 4. Critical Stock Callout & Tracked Commodity Depletions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                    Commodity Depletion Run-Rates &amp; Stocks
                  </h3>
                  <span className="text-[10px] text-text-secondary font-mono">
                    Surge Multiplier: {selectedCommunity.isMonsoonAlertActive ? '1.4x (Monsoon Surge)' : '1.0x (Normal)'}
                  </span>
                </div>

                {/* Critical Stock Callout Card */}
                {selectedCommunity.metrics.criticalCommodity && (
                  <div className="p-3.5 rounded-sm bg-status-blocked-tint/30 border border-status-blocked-solid/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-status-blocked-text uppercase tracking-wider block">
                        CRITICAL STOCK DEFICIT
                      </span>
                      <div className="text-sm font-bold text-text-primary mt-0.5">
                        {COMMODITY_CONFIG[selectedCommunity.metrics.criticalCommodity]?.label}
                      </div>
                      <p className="text-[11px] text-text-secondary mt-0.5">
                        Exhausts in{' '}
                        <strong className="text-status-blocked-text">
                          {selectedCommunity.metrics.criticalExhaustHours.toFixed(1)} hours
                        </strong>{' '}
                        under current burn rate.
                      </p>
                    </div>

                    <div className="text-right font-mono shrink-0">
                      <div className="text-xs font-bold text-text-primary">
                        Current: {selectedCommunity.metrics.commodityDepletions[selectedCommunity.metrics.criticalCommodity]?.currentStock}{' '}
                        {COMMODITY_CONFIG[selectedCommunity.metrics.criticalCommodity]?.unit}
                      </div>
                      <div className="text-[10px] text-text-secondary">
                        Burn: {selectedCommunity.metrics.commodityDepletions[selectedCommunity.metrics.criticalCommodity]?.hourlyBurn.toFixed(2)}{' '}
                        {COMMODITY_CONFIG[selectedCommunity.metrics.criticalCommodity]?.unit}/hr
                      </div>
                      <span className="inline-block mt-1 px-1.5 py-0.2 rounded-xs font-mono font-bold text-[9px] bg-status-blocked-solid text-white">
                        STATUS: BEFORE CUTOFF
                      </span>
                    </div>
                  </div>
                )}

                {/* All Tracked Commodities */}
                <div className="space-y-2.5">
                  {(['IV_FLUIDS', 'ANTIVENOM', 'GRAIN_RICE', 'DIESEL'] as CommodityType[]).map((key) => {
                    const item = selectedCommunity.metrics.commodityDepletions[key];
                    const cfg = COMMODITY_CONFIG[key];
                    if (!item || !cfg) return null;
                    const pct = Math.min(100, Math.max(0, Math.round((item.currentStock / cfg.standardCapacity) * 100)));
                    const exhaustsBeforeCutoff = item.timeToExhaustHours <= selectedCommunity.cutoffTimeHours;

                    return (
                      <div key={key} className="p-3 bg-surface-subtle rounded-sm border border-border text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-text-primary">{cfg.label}</span>
                            {cfg.isMedical && (
                              <span className="px-1.5 py-0.2 rounded-xs bg-primary-tint text-primary text-[9px] font-bold">
                                MEDICAL COLD-CHAIN
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-[11px] text-text-secondary">
                            <strong className="text-text-primary">{item.currentStock}</strong> / {cfg.standardCapacity} {cfg.unit} ({pct}%)
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pct <= 25
                                ? 'bg-status-blocked-solid'
                                : pct <= 50
                                ? 'bg-status-highrisk-solid'
                                : 'bg-status-open-solid'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-text-secondary">
                          <span>
                            Daily Burn: <strong>{item.baselineDailyBurn} {cfg.unit}/day</strong> ({item.hourlyBurn.toFixed(2)}/h)
                          </span>
                          <span className={exhaustsBeforeCutoff ? 'font-bold text-status-blocked-text' : 'text-text-primary'}>
                            Exhaustion: {item.timeToExhaustHours.toFixed(1)}h ({exhaustsBeforeCutoff ? 'EXHAUSTS BEFORE CUTOFF' : 'BUFFER SUFFICIENT'})
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 5. Priority Explanation Breakdown (Audit Trail) */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                  Why This Community is Critical (Priority Formulation)
                </h3>

                <div className="space-y-2 text-xs">
                  {selectedCommunity.metrics.auditTrail?.map((audit, idx) => (
                    <div
                      key={audit.id || idx}
                      className="p-3 rounded-sm bg-surface-subtle border border-border space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-text-primary flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-primary-tint text-primary flex items-center justify-center text-[10px] font-mono">
                            {idx + 1}
                          </span>
                          {audit.headline}
                        </span>
                        <span className="text-[10px] font-mono text-text-secondary">
                          {audit.factorImpact}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-secondary leading-relaxed pl-5">
                        {audit.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 6. Connected Relief Missions */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                  Associated Relief Missions ({connectedMissions.length})
                </h3>

                {connectedMissions.length === 0 ? (
                  <div className="p-3 bg-surface-subtle border border-border rounded-sm text-xs text-text-secondary">
                    No relief convoys currently assigned to this sector. Dispatch a preemptive sortie from the Missions deck.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {connectedMissions.map((m) => (
                      <div
                        key={m.id}
                        className="p-3 bg-surface-subtle border border-border rounded-sm text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-xs bg-primary-tint text-primary">
                              {m.id}
                            </span>
                            <span className="font-bold text-text-primary">{m.destinationName || m.communityName}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-xs font-mono font-bold text-[9px] bg-primary-tint text-primary border border-primary/30">
                            {m.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-text-secondary">
                          Assigned Convoy: <strong>{m.assignedVehicleId || 'Pending allocation'}</strong> · Route: <strong>{m.assignedRouteId}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-surface border border-border rounded-md text-text-secondary text-xs">
              Select a community from the triage list to view its complete operational intelligence sidecard.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
