import React from 'react';
import type { CommunityWithCalculation, PriorityTier } from '../../types';
import {
  Sparkles,
  AlertTriangle,
  Info,
  Sliders,
  CheckCircle2,
  Clock,
  Zap,
  RotateCcw,
  Truck,
  PackageCheck,
} from 'lucide-react';

interface ExplainabilityPanelProps {
  community: CommunityWithCalculation;
  onAdvanceHours: (communityId: string, hours: number) => void;
  onRestock: (communityId: string) => void;
}

export const ExplainabilityPanel: React.FC<ExplainabilityPanelProps> = ({
  community,
  onAdvanceHours,
  onRestock,
}) => {
  const { metrics } = community;
  const {
    isolationRisk,
    supplyDeficitFactor,
    vulnerabilityIndex,
    baseScore,
    emergencyUrgencyBoost,
    finalScore,
    priorityTier,
    auditTrail,
  } = metrics;

  const cutoffTimeHours = community.cutoffTimeHours ?? 48;
  const effectiveTransitHours = community.transitTimeHours ?? 12;

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

  return (
    <div className="flex flex-col space-y-4 text-xs">
      {/* 1. Mathematical Composite Formulation Stack */}
      <div className="bg-surface border border-border rounded-md p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
              Mathematical Explainability Engine
            </h3>
          </div>
          <span className={`text-xs px-2.5 py-0.5 rounded-sm border font-bold font-mono ${getTierBadge(priorityTier)}`}>
            {priorityTier} TIER
          </span>
        </div>

        {/* Formula calculation stack */}
        <div className="bg-surface-subtle rounded-sm p-3 border border-border space-y-2 text-xs">
          <div className="text-[11px] text-text-secondary font-mono pb-1 border-b border-border flex items-center justify-between">
            <span>COMPOSITE TRIAGE FORMULATION</span>
            <span className="text-primary font-bold text-sm">
              Score: {finalScore.toFixed(3)}
            </span>
          </div>

          <div className="space-y-1.5 font-mono text-[11px]">
            {/* R_iso */}
            <div className="flex items-center justify-between text-text-primary">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-xs bg-indigo-500" />
                <span>0.45 × Isolation Risk (R_iso):</span>
              </span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                {(0.45 * isolationRisk).toFixed(3)}{' '}
                <span className="text-[10px] text-text-secondary font-normal">
                  ({isolationRisk.toFixed(2)})
                </span>
              </span>
            </div>

            {/* S_def */}
            <div className="flex items-center justify-between text-text-primary">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-xs bg-status-blocked-solid" />
                <span>0.35 × Supply Deficit (S_def):</span>
              </span>
              <span className="font-bold text-status-blocked-text">
                {(0.35 * supplyDeficitFactor).toFixed(3)}{' '}
                <span className="text-[10px] text-text-secondary font-normal">
                  ({supplyDeficitFactor.toFixed(2)})
                </span>
              </span>
            </div>

            {/* I_vuln */}
            <div className="flex items-center justify-between text-text-primary">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-xs bg-amber-500" />
                <span>0.20 × Vulnerability (I_vuln):</span>
              </span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {(0.2 * vulnerabilityIndex).toFixed(3)}{' '}
                <span className="text-[10px] text-text-secondary font-normal">
                  ({vulnerabilityIndex.toFixed(2)})
                </span>
              </span>
            </div>

            {/* Base Sum */}
            <div className="pt-1 border-t border-border flex items-center justify-between text-text-secondary">
              <span>Weighted Base Score:</span>
              <span className="font-bold text-text-primary">{baseScore.toFixed(3)}</span>
            </div>

            {/* Emergency Urgency Boost */}
            <div className="flex items-center justify-between text-text-primary">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-xs bg-status-blocked-solid" />
                <span>Emergency Cutoff Urgency Boost:</span>
              </span>
              <span className={`font-bold ${emergencyUrgencyBoost > 0 ? 'text-status-blocked-text' : 'text-text-secondary'}`}>
                {emergencyUrgencyBoost > 0 ? `+${emergencyUrgencyBoost.toFixed(3)} (ACTIVE)` : '+0.000'}
              </span>
            </div>
          </div>
        </div>

        {/* Audit Trail Items */}
        <div className="space-y-2 pt-1">
          <span className="text-[11px] font-semibold text-text-primary uppercase tracking-wider block">
            Operational Audit Trail ({auditTrail.length} Logged Factors)
          </span>

          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
            {auditTrail.map((item) => {
              let borderCol = 'border-border bg-surface-subtle/50';
              let icon = <Info className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />;

              if (item.level === 'critical') {
                borderCol = 'border-status-blocked-solid/50 bg-status-blocked-tint/30 text-status-blocked-text';
                icon = <AlertTriangle className="w-3.5 h-3.5 text-status-blocked-solid mt-0.5 shrink-0" />;
              } else if (item.level === 'warning') {
                borderCol = 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400';
                icon = <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />;
              } else if (item.level === 'positive') {
                borderCol = 'border-status-open-solid/40 bg-status-open-tint/30 text-status-open-text';
                icon = <CheckCircle2 className="w-3.5 h-3.5 text-status-open-solid mt-0.5 shrink-0" />;
              }

              return (
                <div
                  key={item.id}
                  className={`p-2.5 rounded-sm border text-xs space-y-1 ${borderCol} transition`}
                >
                  <div className="flex items-start gap-2">
                    {icon}
                    <div className="flex-1">
                      <span className="font-semibold text-text-primary block text-[11px]">
                        {item.headline}
                      </span>
                      <p className="text-[10px] text-text-secondary mt-0.5 leading-relaxed">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                  <div className="text-[9px] font-mono text-text-secondary bg-surface px-2 py-0.5 rounded-xs flex items-center justify-between border border-border/50">
                    <span>Factor Impact:</span>
                    <span className="font-bold text-text-primary">{item.factorImpact}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Interactive Time Advance & Replenishment Controls */}
      <div className="bg-surface border border-border rounded-md p-4 space-y-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-text-primary">
              Live Depletion & Delivery Simulation
            </h3>
          </div>
          <span className="text-[10px] text-text-secondary font-mono">Dynamic Recalculation</span>
        </div>

        {/* Time Simulator */}
        <div className="space-y-2 p-3 bg-surface-subtle rounded-sm border border-border text-xs">
          <div className="flex justify-between font-mono">
            <span className="text-text-secondary">Elapsed Time:</span>
            <span className="font-bold text-text-primary">{community.elapsedTimeHours} hours</span>
          </div>
          <div className="flex justify-between font-mono text-[11px]">
            <span className="text-text-secondary">Road Failure Window (T_cutoff):</span>
            <span className="font-bold text-status-blocked-text">{cutoffTimeHours.toFixed(1)} hours</span>
          </div>
          <div className="flex justify-between font-mono text-[11px]">
            <span className="text-text-secondary">Convoy Transit Duration (T_transit):</span>
            <span className="font-bold text-text-primary">{effectiveTransitHours.toFixed(1)} hours</span>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <button
              onClick={() => onAdvanceHours(community.id, 6)}
              className="flex-1 py-1.5 bg-surface hover:bg-surface-subtle border border-border rounded-xs font-medium text-[11px] text-text-primary btn-press cursor-pointer"
            >
              +6h Run
            </button>
            <button
              onClick={() => onAdvanceHours(community.id, 18)}
              className="flex-1 py-1.5 bg-surface hover:bg-surface-subtle border border-border rounded-xs font-medium text-[11px] text-text-primary btn-press cursor-pointer"
            >
              +18h Run
            </button>
          </div>
        </div>

        {/* Emergency Replenishment CTA */}
        <button
          onClick={() => onRestock(community.id)}
          className="w-full py-2.5 px-3 bg-[#1B4B73] hover:bg-[#123A5A] dark:bg-[#2E6B9E] text-white rounded-sm font-semibold text-xs shadow-xs flex items-center justify-center gap-2 transition btn-press cursor-pointer"
        >
          <PackageCheck className="w-4 h-4" />
          <span>Simulate Emergency Convoy Delivery / Restock</span>
        </button>
      </div>
    </div>
  );
};
