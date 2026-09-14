import React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Sliders, 
  Truck, 
  CloudRain, 
  FileText, 
  GitCommit, 
  Sparkles
} from 'lucide-react';
import type { EnrichedCommunity, PriorityTier } from '../types';

interface ExplainabilityPanelProps {
  community: EnrichedCommunity;
  onUpdateCommunity: (updated: Partial<EnrichedCommunity>) => void;
  onSimulateRestock: () => void;
}

export const ExplainabilityPanel: React.FC<ExplainabilityPanelProps> = ({
  community,
  onUpdateCommunity,
  onSimulateRestock,
}) => {
  const {
    cutoffTimeHours,
    disruptionProbMax,
    elapsedTimeHours,
    isMonsoonAlertActive,
    hasActiveIndent,
    ingressRouteCount,
    isolationRisk,
    supplyDeficitFactor,
    vulnerabilityIndex,
    baseScore,
    emergencyUrgencyBoost,
    finalScore,
    priorityTier,
    auditTrail,
  } = community;

  // Badge styles
  const getTierBadge = (tier: PriorityTier) => {
    switch (tier) {
      case 'P1':
        return 'bg-red-950/80 border-red-500 text-red-300 animate-siren';
      case 'P2':
        return 'bg-amber-950/80 border-amber-500 text-amber-300';
      case 'P3':
        return 'bg-yellow-950/80 border-yellow-600 text-yellow-300';
      case 'P4':
        return 'bg-emerald-950/80 border-emerald-600 text-emerald-300';
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 overflow-y-auto pr-1.5 pt-0.5 pb-2">
      {/* 1. Mathematical Factor Breakdown Card */}
      <div className="glass-panel rounded-2xl p-4 lg:p-5 border-slate-800/80 shadow-xl space-y-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white font-display">
              Math Explainability & Audit Engine
            </h3>
          </div>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full border font-bold font-mono ${getTierBadge(
              priorityTier
            )}`}
          >
            {priorityTier} TIER
          </span>
        </div>

        {/* Formula calculation stack */}
        <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/80 space-y-2 text-xs">
          <div className="text-[11px] text-slate-400 font-mono pb-1 border-b border-slate-800 flex items-center justify-between">
            <span>COMPOSITE FORMULATION</span>
            <span className="text-cyan-400 font-semibold">
              Final: {finalScore.toFixed(3)}
            </span>
          </div>

          <div className="space-y-1.5 font-mono text-[11px]">
            {/* R_iso */}
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded bg-indigo-400" />
                <span>0.45 × Isolation Risk (R_iso):</span>
              </span>
              <span className="font-bold text-indigo-300">
                {(0.45 * isolationRisk).toFixed(3)}{' '}
                <span className="text-[10px] text-slate-500 font-normal">
                  ({isolationRisk.toFixed(2)})
                </span>
              </span>
            </div>

            {/* S_def */}
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded bg-red-400" />
                <span>0.35 × Supply Deficit (S_def):</span>
              </span>
              <span className="font-bold text-red-300">
                {(0.35 * supplyDeficitFactor).toFixed(3)}{' '}
                <span className="text-[10px] text-slate-500 font-normal">
                  ({supplyDeficitFactor.toFixed(2)})
                </span>
              </span>
            </div>

            {/* I_vuln */}
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded bg-amber-400" />
                <span>0.20 × Vulnerability (I_vuln):</span>
              </span>
              <span className="font-bold text-amber-300">
                {(0.2 * vulnerabilityIndex).toFixed(3)}{' '}
                <span className="text-[10px] text-slate-500 font-normal">
                  ({vulnerabilityIndex.toFixed(2)})
                </span>
              </span>
            </div>

            {/* Base Score Sum */}
            <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-slate-400">
              <span>Base Score Sum:</span>
              <span className="font-bold text-slate-200">{baseScore.toFixed(3)}</span>
            </div>

            {/* Emergency Urgency Boost */}
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded bg-cyan-400" />
                <span>Emergency Urgency Boost:</span>
              </span>
              <span
                className={`font-bold ${
                  emergencyUrgencyBoost > 0 ? 'text-red-400' : 'text-slate-500'
                }`}
              >
                {emergencyUrgencyBoost > 0 ? '+0.200 (Active)' : '+0.000'}
              </span>
            </div>
          </div>
        </div>

        {/* Explainability Trail Bullets */}
        <div className="space-y-2 pt-1">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block font-display">
            Operational Audit Trail ({auditTrail.length} Insights)
          </span>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {auditTrail.map((item) => {
              let icon = <Info className="w-3.5 h-3.5 text-cyan-400" />;
              let borderCol = 'border-slate-800 bg-slate-900/40';

              if (item.level === 'critical') {
                icon = <AlertTriangle className="w-3.5 h-3.5 text-red-400" />;
                borderCol = 'border-red-500/40 bg-red-950/20';
              } else if (item.level === 'warning') {
                icon = <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
                borderCol = 'border-amber-500/40 bg-amber-950/20';
              } else if (item.level === 'positive') {
                icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
                borderCol = 'border-emerald-500/40 bg-emerald-950/20';
              }

              return (
                <div
                  key={item.id}
                  className={`p-2.5 rounded-xl border text-xs space-y-1 ${borderCol} transition`}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 flex-shrink-0">{icon}</div>
                    <div className="flex-1">
                      <span className="font-semibold text-slate-100 block text-[11px]">
                        {item.headline}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                  <div className="text-[9px] font-mono text-cyan-300/80 bg-slate-950/60 px-2 py-0.5 rounded flex items-center justify-between">
                    <span>Factor Impact:</span>
                    <span className="font-bold">{item.factorImpact}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Interactive Disaster & Simulation Modifiers */}
      <div className="glass-panel rounded-2xl p-4 lg:p-5 border-slate-800/80 shadow-xl space-y-3.5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white font-display">
              Live Disaster Simulation Controls
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Instant Recalculation</span>
        </div>

        {/* Sliders */}
        <div className="space-y-3 text-xs">
          {/* Slider 1: Cutoff Time (T_cutoff) */}
          <div className="space-y-1 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/60">
            <div className="flex justify-between font-mono">
              <span className="text-slate-300 font-medium">Road Cutoff Time (T_cutoff):</span>
              <span className="text-cyan-400 font-bold">
                {cutoffTimeHours.toFixed(1)} hours
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="24.0"
              step="0.5"
              value={cutoffTimeHours}
              onChange={(e) =>
                onUpdateCommunity({ cutoffTimeHours: parseFloat(e.target.value) })
              }
              className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0.5h (Imminent)</span>
              <span>12.0h</span>
              <span>24.0h (Extended)</span>
            </div>
          </div>

          {/* Slider 2: Disruption Probability (P_disrupt_max) */}
          <div className="space-y-1 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/60">
            <div className="flex justify-between font-mono">
              <span className="text-slate-300 font-medium">
                Rainfall & Disruption Risk P(disrupt):
              </span>
              <span className="text-indigo-400 font-bold">
                {(disruptionProbMax * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={disruptionProbMax}
              onChange={(e) =>
                onUpdateCommunity({ disruptionProbMax: parseFloat(e.target.value) })
              }
              className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0% (Clear)</span>
              <span>50% (Moderate)</span>
              <span>100% (High Landslide Threat)</span>
            </div>
          </div>

          {/* Slider 3: Elapsed Time Clock (Delta t) */}
          <div className="space-y-1 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/60">
            <div className="flex justify-between font-mono">
              <span className="text-slate-300 font-medium">Elapsed Survey Time (Δt):</span>
              <span className="text-amber-400 font-bold">
                {elapsedTimeHours.toFixed(1)} hours
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="48.0"
              step="1.0"
              value={elapsedTimeHours}
              onChange={(e) =>
                onUpdateCommunity({ elapsedTimeHours: parseFloat(e.target.value) })
              }
              className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0.0h (Fresh Stock)</span>
              <span>24.0h</span>
              <span>48.0h (Severe Depletion)</span>
            </div>
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-2 pt-1 text-xs">
          {/* Monsoon Alert Toggle */}
          <button
            onClick={() =>
              onUpdateCommunity({ isMonsoonAlertActive: !isMonsoonAlertActive })
            }
            className={`w-full p-2.5 rounded-xl border font-medium flex items-center justify-between transition cursor-pointer ${
              isMonsoonAlertActive
                ? 'bg-cyan-950/60 border-cyan-500/70 text-cyan-200'
                : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-2 text-xs">
              <CloudRain className="w-3.5 h-3.5 text-cyan-400" />
              <span>Monsoon Alert Active (ϕ_surge = 1.4)</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                isMonsoonAlertActive
                  ? 'bg-cyan-500 text-slate-950'
                  : 'bg-slate-800 text-slate-500'
              }`}
            >
              {isMonsoonAlertActive ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Emergency Indent Pending Toggle */}
          <button
            onClick={() => onUpdateCommunity({ hasActiveIndent: !hasActiveIndent })}
            className={`w-full p-2.5 rounded-xl border font-medium flex items-center justify-between transition cursor-pointer ${
              hasActiveIndent
                ? 'bg-indigo-950/60 border-indigo-500/70 text-indigo-200'
                : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-2 text-xs">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>Emergency Indent Pending (+0.20 I_vuln)</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                hasActiveIndent
                  ? 'bg-indigo-500 text-slate-950'
                  : 'bg-slate-800 text-slate-500'
              }`}
            >
              {hasActiveIndent ? 'YES' : 'NO'}
            </span>
          </button>

          {/* Single Ingress Route Toggle */}
          <button
            onClick={() =>
              onUpdateCommunity({
                ingressRouteCount: ingressRouteCount <= 1 ? 2 : 1,
              })
            }
            className={`w-full p-2.5 rounded-xl border font-medium flex items-center justify-between transition cursor-pointer ${
              ingressRouteCount <= 1
                ? 'bg-purple-950/60 border-purple-500/70 text-purple-200'
                : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-2 text-xs">
              <GitCommit className="w-3.5 h-3.5 text-purple-400" />
              <span>
                {ingressRouteCount <= 1
                  ? 'Single Ingress Route (C_iso = 1.0)'
                  : 'Redundant Ingress Routes (C_iso = 0.4)'}
              </span>
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                ingressRouteCount <= 1
                  ? 'bg-purple-500 text-slate-950'
                  : 'bg-slate-800 text-slate-500'
              }`}
            >
              {ingressRouteCount <= 1 ? 'SINGLE (1)' : 'DUAL (2)'}
            </span>
          </button>
        </div>

        {/* 3. Closed-Loop Restock Simulation Button */}
        <div className="pt-2 border-t border-slate-800/80">
          <button
            onClick={onSimulateRestock}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/40 active:scale-[0.99]"
          >
            <Truck className="w-4 h-4" />
            <span>Simulate Field Delivery (Restock Completed)</span>
          </button>
          <p className="text-[10px] text-slate-400 text-center mt-1.5">
            Instantly resets Δt to 0, replenishes 4 commodities, and transitions priority from P1 to P4.
          </p>
        </div>
      </div>
    </div>
  );
};
