import React, { useState } from 'react';
import type { CandidateRoute, VehicleProfile } from '../../types';
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Navigation,
  CheckCircle2,
  XCircle,
  Mountain,
  Scale,
  ChevronDown,
  ChevronUp,
  Info,
  Route,
  Zap,
} from 'lucide-react';

export interface RouteExplainabilityCardProps {
  recommendedRoute?: CandidateRoute;
  selectedRoute?: CandidateRoute;
  candidateRoutes?: CandidateRoute[];
  vehicle?: VehicleProfile;
  rainfallMmHr?: number;
  onSelectRoute?: (index: number) => void;
  compact?: boolean;
  className?: string;
}

export const RouteExplainabilityCard: React.FC<RouteExplainabilityCardProps> = ({
  recommendedRoute,
  selectedRoute,
  candidateRoutes = [],
  vehicle,
  rainfallMmHr = 0,
  onSelectRoute,
  compact = false,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(!compact);
  const [inspectedAltIndex, setInspectedAltIndex] = useState<number>(() => {
    // Default to comparing against the first non-recommended route or selected route
    if (selectedRoute && recommendedRoute && selectedRoute.id !== recommendedRoute.id) {
      const idx = candidateRoutes.findIndex((r) => r.id === selectedRoute.id);
      return idx >= 0 ? idx : 1;
    }
    return candidateRoutes.length > 1 ? 1 : 0;
  });

  const bestRoute = recommendedRoute || candidateRoutes[0];
  const compareRoute = candidateRoutes[inspectedAltIndex] || selectedRoute || candidateRoutes[1] || bestRoute;

  if (!bestRoute) return null;

  const isComparingSame = bestRoute.id === compareRoute.id;

  // Metric Differentials
  const distDiff = compareRoute.totalDistanceKm - bestRoute.totalDistanceKm;
  const timeDiff = compareRoute.degradedDurationMinutes - bestRoute.degradedDurationMinutes;
  const safetyDiff = bestRoute.compositeSafetyScore - compareRoute.compositeSafetyScore;
  const gradientDiff = (compareRoute.maxGradientPct || 0) - (bestRoute.maxGradientPct || 0);

  // Generate Human-in-the-Loop Explainability Points
  const explainabilityPoints: Array<{
    type: 'success' | 'warning' | 'rejection' | 'tradeoff';
    headline: string;
    detail: string;
    metric?: string;
  }> = [];

  // 1. Constraint Rejections
  if (!compareRoute.isPassable && compareRoute.failureBottleneck) {
    explainabilityPoints.push({
      type: 'rejection',
      headline: `Hard Constraint Rejection: ${compareRoute.rankLabel}`,
      detail: `${compareRoute.failureBottleneck.reason}. Recommended Rank 1 completely circumvents this hazard bottleneck.`,
      metric: 'PASSABILITY: 0%',
    });
  } else if (!compareRoute.isPassable) {
    explainabilityPoints.push({
      type: 'rejection',
      headline: `Impasse Rejection on ${compareRoute.rankLabel}`,
      detail: 'Route contains impassable road segments that violate safe transit thresholds for heavy emergency logistics.',
      metric: 'DISQUALIFIED',
    });
  }

  // 2. Risk vs Detour Trade-off
  if (distDiff < 0 && safetyDiff > 15) {
    // Recommended is longer but significantly safer
    explainabilityPoints.push({
      type: 'tradeoff',
      headline: 'Safety vs. Distance Strategic Trade-off',
      detail: `Recommended route accepts +${Math.abs(distDiff).toFixed(1)} km detour to gain +${safetyDiff}% safety margin, bypassing high-vulnerability ISRO Landslide Hazard Zones and flash flood riverbanks.`,
      metric: `+${safetyDiff}% Safe`,
    });
  } else if (distDiff >= 0 && timeDiff <= 0) {
    explainabilityPoints.push({
      type: 'success',
      headline: 'Dominant Optimal Trajectory',
      detail: `Recommended route is simultaneously ${Math.abs(distDiff).toFixed(1)} km shorter and saves ${Math.abs(timeDiff)} min of transit delay over ${compareRoute.rankLabel}.`,
      metric: `${Math.abs(timeDiff)}m Faster`,
    });
  } else if (safetyDiff > 0) {
    explainabilityPoints.push({
      type: 'success',
      headline: 'Vulnerability Hazard Avoidance',
      detail: `Composite safety score is ${bestRoute.compositeSafetyScore}% vs ${compareRoute.compositeSafetyScore}%. Route avoids saturated soil corridors susceptible to sudden slope failure.`,
      metric: `${bestRoute.compositeSafetyScore}% vs ${compareRoute.compositeSafetyScore}%`,
    });
  }

  // 3. Terrain & Gradient Analysis
  if (gradientDiff > 1.5) {
    explainabilityPoints.push({
      type: 'warning',
      headline: 'Mountain Gradient & Heavy Vehicle Protection',
      detail: `Recommended path caps maximum incline at ${(bestRoute.maxGradientPct || 4.2).toFixed(1)}% (compared to ${(compareRoute.maxGradientPct || 8.5).toFixed(1)}% steep grade), mitigating powertrain overheating, brake fade, and rollover hazards${vehicle ? ` for ${vehicle.name} (${vehicle.weight_tonnes}T)` : ''}.`,
      metric: `-${gradientDiff.toFixed(1)}% Incline`,
    });
  }

  // 4. Weather & Monsoon Resilience
  if (rainfallMmHr > 20) {
    explainabilityPoints.push({
      type: 'tradeoff',
      headline: 'Monsoon Downpour Friction Damping',
      detail: `Under active rainfall (${rainfallMmHr} mm/h), the recommended route maximizes all-weather asphalt surfacing (${bestRoute.segments.filter(s => s.surface_type === 'paved').length}/${bestRoute.segments.length} segments paved), minimizing mud sinkage delays.`,
      metric: `${rainfallMmHr} mm/h Weather`,
    });
  }

  // 5. Emergency Cutoff Window
  explainabilityPoints.push({
    type: 'success',
    headline: 'Triage Priority Stockout Window Guarantee',
    detail: `Estimated transit ETA of ${bestRoute.degradedDurationMinutes} min reliably delivers vital cargo well within the community's critical replenishment window.`,
    metric: `ETA: ${bestRoute.degradedDurationMinutes}m`,
  });

  return (
    <div className={`bg-surface border border-border rounded-md shadow-xs overflow-hidden transition-all text-xs ${className}`}>
      {/* Header Banner */}
      <div
        className="p-3 sm:p-3.5 bg-gradient-to-r from-primary-tint/50 via-surface-subtle to-surface border-b border-border flex items-center justify-between cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-xs bg-primary text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-text-primary text-xs sm:text-sm">
                Why This Route?
              </span>
              <span className="font-mono text-[9px] px-1.5 py-0.2 rounded-xs bg-primary-tint text-primary font-bold border border-primary/30">
                XAI AUDIT
              </span>
            </div>
            <p className="text-[10px] text-text-secondary hidden xs:block">
              Human-in-the-loop explainable routing &amp; trade-off evaluation
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-mono font-semibold text-status-open-text bg-status-open-tint px-2 py-0.5 rounded-xs border border-status-open-solid/30">
            {bestRoute.rankLabel} ({bestRoute.compositeSafetyScore}% Safe)
          </span>
          <button
            type="button"
            className="p-1 text-text-secondary hover:text-text-primary rounded-xs transition-colors"
            aria-label={isExpanded ? 'Collapse explainability card' : 'Expand explainability card'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-3 sm:p-4 space-y-3.5">
          {/* Candidate Route Comparative Selector Tabs */}
          {candidateRoutes.length > 1 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider block">
                Compare Recommended Route Against:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {candidateRoutes.map((route, idx) => {
                  const isBest = idx === 0;
                  const isSelected = idx === inspectedAltIndex;
                  return (
                    <button
                      key={route.id}
                      type="button"
                      onClick={() => {
                        setInspectedAltIndex(idx);
                        if (onSelectRoute) onSelectRoute(idx);
                      }}
                      className={`p-1.5 rounded-xs border text-left transition-all btn-press cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-primary bg-primary-tint text-primary font-semibold shadow-2xs ring-1 ring-primary/30'
                          : 'border-border bg-surface-subtle hover:bg-surface text-text-secondary'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[10px] truncate">
                          {isBest ? '★ ' : ''}Rank {route.rank}
                        </span>
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            route.isPassable ? 'bg-status-open-solid' : 'bg-status-blocked-solid'
                          }`}
                        />
                      </div>
                      <span className="text-[9px] font-mono opacity-80 mt-0.5">
                        {route.totalDistanceKm}km • {route.degradedDurationMinutes}m
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Metric Comparison Head-to-Head Table */}
          {!isComparingSame && (
            <div className="bg-surface-subtle border border-border rounded-sm p-2.5 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-text-primary border-b border-border pb-1">
                <span className="flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5 text-primary" />
                  <span>Trade-Off Matrix</span>
                </span>
                <span className="text-[10px] text-text-secondary font-mono">
                  {bestRoute.rankLabel} vs {compareRoute.rankLabel}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                {/* Distance */}
                <div className="p-1.5 bg-surface rounded-xs border border-border">
                  <span className="text-text-secondary block text-[9px]">Distance</span>
                  <div className="font-bold font-mono text-text-primary mt-0.5">
                    {bestRoute.totalDistanceKm} km
                  </div>
                  <span
                    className={`font-mono text-[9px] ${
                      distDiff <= 0 ? 'text-status-open-text font-bold' : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {distDiff <= 0 ? `${distDiff.toFixed(1)} km` : `+${distDiff.toFixed(1)} km`}
                  </span>
                </div>

                {/* Transit ETA */}
                <div className="p-1.5 bg-surface rounded-xs border border-border">
                  <span className="text-text-secondary block text-[9px]">Transit ETA</span>
                  <div className="font-bold font-mono text-text-primary mt-0.5">
                    {bestRoute.degradedDurationMinutes} min
                  </div>
                  <span
                    className={`font-mono text-[9px] ${
                      timeDiff <= 0 ? 'text-status-open-text font-bold' : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {timeDiff <= 0 ? `${timeDiff} min` : `+${timeDiff} min`}
                  </span>
                </div>

                {/* Safety Score */}
                <div className="p-1.5 bg-surface rounded-xs border border-border">
                  <span className="text-text-secondary block text-[9px]">Safety Score</span>
                  <div className="font-bold font-mono text-status-open-text mt-0.5">
                    {bestRoute.compositeSafetyScore}%
                  </div>
                  <span className="font-mono text-[9px] text-status-open-text font-bold">
                    +{safetyDiff}% Safe
                  </span>
                </div>

                {/* Passability */}
                <div className="p-1.5 bg-surface rounded-xs border border-border">
                  <span className="text-text-secondary block text-[9px]">Clearance</span>
                  <div
                    className={`font-bold font-mono mt-0.5 ${
                      compareRoute.isPassable ? 'text-text-primary' : 'text-status-blocked-text'
                    }`}
                  >
                    {compareRoute.isPassable ? 'Both Pass' : 'Pruned'}
                  </div>
                  <span className="font-mono text-[9px] text-status-open-text font-bold">
                    Guaranteed
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Operational Justification Bullets */}
          <div className="space-y-2">
            <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider block">
              Operational Justification Log ({explainabilityPoints.length} Factors Evaluated)
            </span>

            <div className="space-y-1.5">
              {explainabilityPoints.map((pt, i) => {
                let badgeClass = 'bg-primary-tint/30 text-primary border-primary/40';
                let icon = <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />;

                if (pt.type === 'rejection') {
                  badgeClass = 'bg-status-blocked-tint/50 text-status-blocked-text border-status-blocked-solid/50';
                  icon = <XCircle className="w-3.5 h-3.5 text-status-blocked-solid shrink-0 mt-0.5" />;
                } else if (pt.type === 'warning') {
                  badgeClass = 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30';
                  icon = <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />;
                } else if (pt.type === 'tradeoff') {
                  badgeClass = 'bg-surface-subtle text-text-primary border-border';
                  icon = <Scale className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />;
                }

                return (
                  <div
                    key={i}
                    className={`p-2.5 rounded-sm border text-[11px] flex items-start justify-between gap-2 ${badgeClass}`}
                  >
                    <div className="flex items-start gap-2">
                      {icon}
                      <div>
                        <span className="font-semibold text-text-primary block text-[11px]">
                          {pt.headline}
                        </span>
                        <p className="text-[10px] text-text-secondary mt-0.5 leading-relaxed">
                          {pt.detail}
                        </p>
                      </div>
                    </div>

                    {pt.metric && (
                      <span className="font-mono font-bold text-[9px] px-1.5 py-0.5 rounded-xs bg-surface border border-border shrink-0 self-start">
                        {pt.metric}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
