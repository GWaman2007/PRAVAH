import React, { useState, useMemo } from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import { COMMODITY_CONFIG } from '../../engine/priorityEngine';
import { playAckChime } from '../../utils/audioAlert';
import { ExplainabilityPanel } from './ExplainabilityPanel';
import { RestockToast, type RestockToastData } from './RestockToast';
import { MissionSuggestionQueue } from '../dispatcher/MissionSuggestionQueue';
import type { CommodityType, PriorityTier } from '../../types';
import {
  Zap,
  Clock,
  ShieldAlert,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  TrendingDown,
  Truck,
  Flame,
  X,
  PackageCheck,
  Sliders,
} from 'lucide-react';

const PRIORITY_TIER_ORDER: Record<string, number> = {
  P1: 1,
  P2: 2,
  P3: 3,
  P4: 4,
};

export const CommunityPriorityDeck: React.FC = () => {
  const {
    communities,
    selectedCommunityId,
    setSelectedCommunityId,
    advanceCommunityElapsedHours,
    markMissionDelivered,
    activeRole,
    activeMissions,
    candidateRoutes,
    approveAndDispatchMission,
    customizeMission,
  } = usePravahStore();

  const [explainModalOpen, setExplainModalOpen] = useState(false);
  const [restockToast, setRestockToast] = useState<RestockToastData | null>(null);

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

  const selectedCommunity =
    sortedCommunities.find((c) => c.id === selectedCommunityId) || sortedCommunities[0] || communities[0];

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

  const handleRestock = (communityId: string) => {
    markMissionDelivered(communityId);
    playAckChime();
    setRestockToast({
      visible: true,
      title: 'Emergency Consignment Verified & Delivered',
      message: `Consignment signed off at ${selectedCommunity.name}. All commodity stocks restored to 100% capacity and priority tier recalibrated to P4 (Nominal).`,
      type: 'success',
    });
    setTimeout(() => {
      setRestockToast(null);
    }, 5000);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Toast Notification */}
      <RestockToast
        toast={restockToast}
        onClose={() => setRestockToast(null)}
      />

      {/* Top Banner: Engine Purpose & Anticipatory Depletion Logic */}
      <div className="bg-surface border border-border p-4 sm:p-5 rounded-md shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-primary shrink-0" />
              <h1 className="text-base sm:text-lg font-semibold text-text-primary">
                PRAVAH Preemptive Community Depletion &amp; Priority Engine
              </h1>
            </div>
            <p className="mt-1 text-xs text-text-secondary max-w-3xl leading-relaxed">
              Anticipatory commodity depletion model evaluating closing road failure windows (T_cutoff),
              transit durations (T_transit), isolation risks (R_iso), and vulnerability indices (I_vuln)
              to prioritize life-saving relief convoys before mountain corridors cleave.
            </p>
          </div>

          {/* Time Advance Controls */}
          <div className="flex items-center space-x-2 bg-surface-subtle border border-border p-2 rounded-sm self-start md:self-auto shrink-0">
            <Clock className="w-4 h-4 text-text-secondary shrink-0" />
            <span className="text-xs font-medium text-text-secondary">Simulate Time:</span>
            <button
              onClick={() => selectedCommunity && advanceCommunityElapsedHours(selectedCommunity.id, 6)}
              className="px-2.5 py-1 text-xs font-medium bg-surface hover:bg-surface-subtle border border-border rounded-sm text-text-primary btn-press cursor-pointer"
            >
              +6h Run
            </button>
            <button
              onClick={() => selectedCommunity && advanceCommunityElapsedHours(selectedCommunity.id, 18)}
              className="px-2.5 py-1 text-xs font-medium bg-surface hover:bg-surface-subtle border border-border rounded-sm text-text-primary btn-press cursor-pointer"
            >
              +18h Run
            </button>
          </div>
        </div>
      </div>

      {/* AI Preemptive Relief Convoy Mission Queue */}
      <MissionSuggestionQueue
        missions={activeMissions}
        candidateRoutes={candidateRoutes}
        onApproveAndDispatch={approveAndDispatchMission}
        onCustomizedDispatch={customizeMission}
      />

      {/* Main Grid: Left Triage Queue & Right In-Depth Depletion Buffer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col (5 cols): Prioritized Community Queue */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">
              Triage Queue (Dynamic Real-Time Rank)
            </h2>
            <span className="text-xs text-text-secondary font-mono">
              {sortedCommunities.length} Monitored Sectors
            </span>
          </div>

          <div className="space-y-2.5">
            {sortedCommunities.map((c) => {
              const isSelected = c.id === selectedCommunityId;
              const { metrics } = c;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCommunityId(c.id)}
                  className={`p-3.5 sm:p-4 rounded-md border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-primary bg-primary-tint/20 dark:bg-primary-tint/10 shadow-xs'
                      : 'border-border bg-surface hover:bg-surface-subtle'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-0.5 text-xs font-bold rounded-sm border ${getTierBadge(
                            metrics.priorityTier
                          )}`}
                        >
                          {metrics.priorityTier}
                        </span>
                        <h3 className="font-semibold text-sm text-text-primary">{c.name}</h3>
                        <span className="text-xs text-text-secondary">({c.state})</span>
                      </div>
                      <p className="text-xs text-text-secondary mt-1">
                        Corridor: <span className="font-mono text-text-primary">{c.primaryCorridor}</span>
                      </p>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-lg font-bold text-text-primary">
                        {metrics.finalScore.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-text-secondary">Score</div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 xs:grid-cols-3 gap-2 text-xs pt-2 border-t border-border/60">
                    <div>
                      <span className="text-[10px] text-text-secondary block">Action Window:</span>
                      <span
                        className={`font-semibold ${
                          metrics.actionableDispatchWindow < 6
                            ? 'text-status-blocked-text'
                            : metrics.actionableDispatchWindow < 12
                            ? 'text-status-highrisk-text'
                            : 'text-text-primary'
                        }`}
                      >
                        {metrics.actionableDispatchWindow > 0
                          ? `${metrics.actionableDispatchWindow.toFixed(1)} hrs`
                          : 'CLOSED'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-text-secondary block">Cutoff (T_c):</span>
                      <span className="font-semibold text-text-primary font-mono">
                        {(c.cutoffTimeHours ?? 48).toFixed(1)}h
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-text-secondary block">Elapsed:</span>
                      <span className="font-semibold text-text-secondary font-mono">
                        +{c.elapsedTimeHours}h
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col (7 cols): In-Depth Sector Depletion Buffer & Explainability */}
        <div className="lg:col-span-7 space-y-4">
          {selectedCommunity && (
            <>
              {/* Sector Deep Dive Card */}
              <div className="bg-surface border border-border p-4 sm:p-5 rounded-md shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                  <div>
                    <div className="flex items-center space-x-2 flex-wrap gap-1">
                      <h2 className="text-base font-bold text-text-primary">
                        {selectedCommunity.name} ({selectedCommunity.state})
                      </h2>
                      <span
                        className={`px-2 py-0.5 text-xs font-bold rounded-sm border ${getTierBadge(
                          selectedCommunity.metrics.priorityTier
                        )}`}
                      >
                        {selectedCommunity.metrics.priorityTier} TIER
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Population: <strong>{selectedCommunity.population.toLocaleString()}</strong> | Health Facilities: <strong>{selectedCommunity.healthcareFacilities}</strong>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setExplainModalOpen(true)}
                      className="flex-1 sm:flex-initial px-3 py-1.5 bg-primary-tint text-primary hover:bg-primary/20 border border-primary/30 rounded-sm text-xs font-semibold flex items-center justify-center space-x-1.5 btn-press cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Math Formulation &amp; Audit</span>
                    </button>

                    <button
                      onClick={() => handleRestock(selectedCommunity.id)}
                      className="flex-1 sm:flex-initial px-3 py-1.5 bg-[#1B4B73] hover:bg-[#123A5A] dark:bg-[#2E6B9E] text-white rounded-sm text-xs font-semibold flex items-center justify-center space-x-1.5 btn-press cursor-pointer"
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      <span>Restock</span>
                    </button>
                  </div>
                </div>

                {/* Key Metric Gauges Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border">
                  <div className="p-2.5 rounded-sm bg-surface-subtle border border-border">
                    <div className="text-[11px] text-text-secondary">Actionable Window</div>
                    <div className="text-base font-bold text-text-primary mt-0.5">
                      {selectedCommunity.metrics.actionableDispatchWindow.toFixed(1)} hrs
                    </div>
                    <div className="text-[10px] text-text-tertiary">Cutoff - Transit</div>
                  </div>

                  <div className="p-2.5 rounded-sm bg-surface-subtle border border-border">
                    <div className="text-[11px] text-text-secondary">Isolation Risk (R_iso)</div>
                    <div className="text-base font-bold text-text-primary mt-0.5">
                      {selectedCommunity.metrics.isolationRisk.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-text-tertiary">Ingress count: {selectedCommunity.ingressRouteCount}</div>
                  </div>

                  <div className="p-2.5 rounded-sm bg-surface-subtle border border-border">
                    <div className="text-[11px] text-text-secondary">Supply Deficit (S_def)</div>
                    <div className="text-base font-bold text-status-blocked-text mt-0.5">
                      {selectedCommunity.metrics.supplyDeficitFactor.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-text-tertiary">Max across items</div>
                  </div>

                  <div className="p-2.5 rounded-sm bg-surface-subtle border border-border">
                    <div className="text-[11px] text-text-secondary">Vulnerability (I_vuln)</div>
                    <div className="text-base font-bold text-text-primary mt-0.5">
                      {selectedCommunity.metrics.vulnerabilityIndex.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-text-tertiary">Pop & Health Facilities</div>
                  </div>
                </div>
              </div>

              {/* Four Commodity Depletion Meters */}
              <div className="bg-surface border border-border p-5 rounded-md shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-text-primary">
                    Tracked Commodity Depletion Run-Rates
                  </h3>
                  <span className="text-xs text-text-secondary">
                    Monsoon Surge Multiplier: {selectedCommunity.isMonsoonAlertActive ? '1.4x (Active)' : '1.0x (Normal)'}
                  </span>
                </div>

                <div className="space-y-4">
                  {(['IV_FLUIDS', 'ANTIVENOM', 'GRAIN_RICE', 'DIESEL'] as CommodityType[]).map((key) => {
                    const item = selectedCommunity.metrics.commodityDepletions[key];
                    const cfg = COMMODITY_CONFIG[key];
                    const pct = Math.min(100, Math.max(0, Math.round((item.currentStock / cfg.standardCapacity) * 100)));
                    const isExhaustedBeforeCutoff = item.timeToExhaustHours <= selectedCommunity.cutoffTimeHours;

                    return (
                      <div key={key} className="p-3 rounded-sm border border-border bg-surface-subtle space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-text-primary">{cfg.label}</span>
                            {cfg.isMedical && (
                              <span className="px-1.5 py-0.5 text-[10px] rounded-sm bg-primary/10 text-primary font-medium">
                                Medical Cold-Chain
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-text-secondary">
                            <span className="font-bold text-text-primary">{item.currentStock}</span> / {cfg.standardCapacity} {cfg.unit} ({pct}%)
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 rounded-full ${
                              pct <= 25
                                ? 'bg-status-blocked-solid'
                                : pct <= 50
                                ? 'bg-status-highrisk-solid'
                                : 'bg-status-open-solid'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        {/* Metrics Breakdown */}
                        <div className="flex items-center justify-between text-[11px] text-text-secondary">
                          <span>
                            Hourly Burn: <strong className="text-text-primary">{item.hourlyBurn} {cfg.unit}/h</strong>
                          </span>
                          <span
                            className={`font-semibold ${
                              isExhaustedBeforeCutoff ? 'text-status-blocked-text' : 'text-text-primary'
                            }`}
                          >
                            Exhaustion: {item.timeToExhaustHours.toFixed(1)} hours ({item.deficitReason})
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Explainability Audit Modal */}
      {explainModalOpen && selectedCommunity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2.5 sm:p-4 animate-fadeIn">
          <div className="bg-surface border border-border rounded-md max-w-2xl w-full p-4 sm:p-6 space-y-3 sm:space-y-4 shadow-xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-border">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                <h3 className="font-semibold text-sm sm:text-base text-text-primary truncate max-w-[220px] xs:max-w-[320px] sm:max-w-none">
                  Explainability Engine — {selectedCommunity.name}
                </h3>
              </div>
              <button
                onClick={() => setExplainModalOpen(false)}
                className="p-1 rounded-sm text-text-secondary hover:text-text-primary cursor-pointer shrink-0 ml-1"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            <ExplainabilityPanel
              community={selectedCommunity}
              onAdvanceHours={(id, h) => advanceCommunityElapsedHours(id, h)}
              onRestock={(id) => {
                handleRestock(id);
                setExplainModalOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
