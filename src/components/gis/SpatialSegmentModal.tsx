import React from 'react';
import type { RouteSpatialSegment } from '../../types';
import {
  X,
  AlertTriangle,
  ShieldCheck,
  Mountain,
  CloudRain,
  ShieldAlert,
  Cpu,
  MapPin,
  CheckCircle2,
  Info,
} from 'lucide-react';

interface SpatialSegmentModalProps {
  segment: RouteSpatialSegment | null;
  routeName?: string;
  onClose: () => void;
}

export const SpatialSegmentModal: React.FC<SpatialSegmentModalProps> = ({
  segment,
  routeName,
  onClose,
}) => {
  if (!segment) return null;

  const { modelA, operationalStatus } = segment;
  const features = modelA.features;
  const probPct = (modelA.probability * 100).toFixed(1);

  const isHighRisk = modelA.probability >= 0.50;
  const isVeryHighRisk = modelA.probability >= 0.80;

  const riskBadgeColor = isVeryHighRisk
    ? 'bg-red-500/20 text-red-400 border-red-500/40'
    : isHighRisk
    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
    : modelA.probability >= 0.25
    ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-surface border border-border rounded-md w-full max-w-lg max-h-[90vh] shadow-2xl overflow-hidden flex flex-col text-text-primary text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3.5 sm:p-4 bg-surface-subtle border-b border-border flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded-xs bg-primary-tint text-primary font-bold border border-primary/30">
                Segment S{segment.order} ({segment.percentageRange})
              </span>
              <span className={`font-mono text-[11px] px-2 py-0.5 rounded-xs font-bold border ${riskBadgeColor}`}>
                {modelA.riskBand} RISK ({probPct}%)
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-text-secondary mt-1">
              {routeName || 'Relief Corridor'} &bull; {segment.distanceKm} km (km {segment.startKm} &rarr; km {segment.endKm})
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-sm text-text-secondary hover:text-text-primary hover:bg-surface border border-transparent hover:border-border cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3.5 sm:p-4 space-y-3.5 overflow-y-auto max-h-[72vh] custom-scrollbar">
          {/* 1. Model A Inference Overview */}
          <div className="p-3 rounded bg-surface-subtle/70 border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-primary" />
                Model A Segment Disruption Prediction
              </span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-surface border border-border text-text-tertiary">
                Frozen XGBoost 3.4.1
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 rounded bg-surface border border-border text-center">
                <span className="text-[10px] text-text-secondary block">Disruption Probability</span>
                <span className={`text-base font-bold font-mono ${
                  isHighRisk ? 'text-red-400' : 'text-emerald-400'
                }`}>
                  {probPct}%
                </span>
              </div>
              <div className="p-2 rounded bg-surface border border-border text-center">
                <span className="text-[10px] text-text-secondary block">Prediction Flag</span>
                <span className="text-base font-bold font-mono text-text-primary">
                  {modelA.prediction === 1 ? 'ALERT (1)' : 'NOMINAL (0)'}
                </span>
              </div>
              <div className="p-2 rounded bg-surface border border-border text-center">
                <span className="text-[10px] text-text-secondary block">Threshold</span>
                <span className="text-base font-bold font-mono text-text-tertiary">
                  {(modelA.threshold * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            <p className="text-[11px] text-text-secondary italic">
              {modelA.interpretation || (
                modelA.prediction === 1
                  ? 'Elevated likelihood of road-associated disruption on this 20% spatial slice.'
                  : 'Nominal passable conditions; predicted hazard likelihood below decision threshold.'
              )}
            </p>
          </div>

          {/* 2. Operational Road-Status Layer (Confirmed Incidents) */}
          <div className={`p-3 rounded border ${
            operationalStatus.isBlocked
              ? 'bg-red-500/10 border-red-500/30'
              : operationalStatus.isRestricted
              ? 'bg-amber-500/10 border-amber-500/30'
              : 'bg-emerald-500/10 border-emerald-500/30'
          }`}>
            <div className="flex items-start gap-2">
              {operationalStatus.isBlocked ? (
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              ) : operationalStatus.isRestricted ? (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <span className="font-bold text-xs block text-text-primary">
                  {operationalStatus.isBlocked
                    ? 'Confirmed Authority Blockage On Segment'
                    : operationalStatus.isRestricted
                    ? 'Operational Restriction Reported'
                    : 'No Confirmed Physical Obstruction'}
                </span>
                <p className="text-[11px] text-text-secondary">
                  {operationalStatus.incidentDescription ||
                    'Ground status: Clear and passable for assigned vehicle profile.'}
                </p>
                {operationalStatus.incidentLocation && (
                  <div className="flex items-center gap-1 font-mono text-[10px] text-text-tertiary pt-0.5">
                    <MapPin className="w-3 h-3 text-red-400" />
                    <span>Exact Hazard Coordinates: [{operationalStatus.incidentLocation[0].toFixed(4)}, {operationalStatus.incidentLocation[1].toFixed(4)}]</span>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-border/50 text-[10px] text-text-tertiary flex items-start gap-1">
              <Info className="w-3 h-3 shrink-0 mt-0.5 text-primary" />
              <span>
                <strong>Operational vs Predictive separation:</strong> Model A calculates predicted hazard risk for the entire 20% spatial slice, while confirmed incident markers show the exact physical point of road/bridge blockage.
              </span>
            </div>
          </div>

          {/* 3. 17 Model-A Local Features (Topography, Rainfall, Pavement) */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block">
              Localized 17 Model-A Feature Vector (Slice S{segment.order})
            </span>

            {/* Weather & Rainfall */}
            <div className="p-2.5 rounded bg-surface border border-border space-y-1.5">
              <div className="flex items-center gap-1.5 text-sky-400 font-bold text-[11px]">
                <CloudRain className="w-3.5 h-3.5" />
                <span>Localized Precipitation (ISRO Bhuvan &amp; Open-Meteo)</span>
              </div>
              <div className="grid grid-cols-3 gap-2 font-mono text-[10px]">
                <div>24h Rain: <strong className="text-text-primary">{features.rainfall_24h} mm</strong></div>
                <div>72h Rain: <strong className="text-text-primary">{features.rainfall_72h} mm</strong></div>
                <div>7d Rain: <strong className="text-text-primary">{features.rainfall_7d} mm</strong></div>
              </div>
            </div>

            {/* Topography */}
            <div className="p-2.5 rounded bg-surface border border-border space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
                <Mountain className="w-3.5 h-3.5" />
                <span>Topography &amp; Gradient</span>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
                <div>Mean Elevation: <strong className="text-text-primary">{features.elevation_m} m</strong></div>
                <div>Ruling Slope: <strong className="text-text-primary">{features.slope_degrees}°</strong></div>
                <div>Historical Landslides: <strong className="text-text-primary">{features.historical_road_landslide_count}</strong></div>
                <div>Landslide Presence: <strong className="text-text-primary">{features.historical_road_landslide_presence === 1 ? 'Yes' : 'No'}</strong></div>
              </div>
            </div>

            {/* Road Surface Composition */}
            <div className="p-2.5 rounded bg-surface border border-border space-y-1.5">
              <span className="font-bold text-[11px] text-text-secondary block">
                Road Surface &amp; Pavement Infrastructure
              </span>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
                <div>Black Top (BT): <strong className="text-text-primary">{features.bt_road_km} km ({(features.bt_road_ratio * 100).toFixed(0)}%)</strong></div>
                <div>ICBP Block: <strong className="text-text-primary">{features.icbp_km} km ({(features.icbp_ratio * 100).toFixed(0)}%)</strong></div>
                <div>Cement Concrete: <strong className="text-text-primary">{features.cement_concrete_km} km ({(features.cement_concrete_ratio * 100).toFixed(0)}%)</strong></div>
                <div>Paver Block: <strong className="text-text-primary">{features.paver_block_km} km</strong></div>
                <div>Total Paved: <strong className="text-text-primary">{features.total_paved_road_km} km</strong></div>
                <div>Surface Diversity: <strong className="text-text-primary">{features.road_surface_diversity} types</strong></div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-surface-subtle border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-surface border border-border hover:bg-surface-subtle text-text-primary font-medium rounded-xs text-xs cursor-pointer"
          >
            Close Segment Details
          </button>
        </div>
      </div>
    </div>
  );
};
