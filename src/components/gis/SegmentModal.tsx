import React, { useState, useEffect } from 'react';
import type { Segment, SegmentIncident, VehicleProfile } from '../../types';
import { evaluateSegment } from '../../engine/routingEngine';
import { 
  X, 
  AlertTriangle, 
  ShieldCheck, 
  Mountain, 
  CloudRain, 
  Truck,
  CheckCircle2,
  Send,
  Sliders,
  Sparkles,
  Cpu,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Info,
  ShieldAlert,
  MapPin,
} from 'lucide-react';
import { usePravahStore } from '../../store/usePravahStore';
import { MODEL_A_FEATURE_PROVENANCE, buildModelAFeatures } from '../../engine/modelAFeatureBuilder';

interface SegmentModalProps {
  segment: Segment | null;
  vehicle: VehicleProfile;
  rainfallMmHr: number;
  currentDisruption?: SegmentIncident;
  onClose: () => void;
  onApplyDisruption: (segmentId: string, disruption: SegmentIncident | null) => void;
  onSeeOnMap?: (segment: Segment) => void;
}

export const SegmentModal: React.FC<SegmentModalProps> = ({
  segment,
  vehicle,
  rainfallMmHr,
  currentDisruption,
  onClose,
  onApplyDisruption,
  onSeeOnMap,
}) => {
  if (!segment) return null;

  const evaluation = evaluateSegment(segment, vehicle, rainfallMmHr, currentDisruption);

  const [status, setStatus] = useState<'TOTAL_BLOCKAGE' | 'SINGLE_LANE_PASSABLE' | 'CLEAR'>(
    currentDisruption ? currentDisruption.status : 'CLEAR'
  );
  const [cause, setCause] = useState<string>(currentDisruption?.cause || 'Major Landslide / Rockfall');
  const [description, setDescription] = useState<string>(currentDisruption?.description || '');

  // Model A State & Hook
  const { getModelAPrediction, fetchModelAPrediction, isModelALoading, modelAError } = usePravahStore();
  const [showFeaturesDrawer, setShowFeaturesDrawer] = useState(false);
  const [refreshingModelA, setRefreshingModelA] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const modelAPrediction = segment ? getModelAPrediction(segment.id) : undefined;
  const isPending = !modelAPrediction && (isModelALoading || refreshingModelA);
  const effectiveError = !modelAPrediction && !isPending ? (localError || modelAError) : null;

  useEffect(() => {
    if (segment && !modelAPrediction) {
      setLocalError(null);
      fetchModelAPrediction(segment.id)
        .then((pred) => {
          if (!pred) {
            setLocalError('Model A inference service returned an empty prediction');
          }
        })
        .catch((err: any) => {
          setLocalError(err?.message || 'Failed to connect to Model A inference service');
        });
    }
  }, [segment?.id, modelAPrediction, fetchModelAPrediction]);

  const handleRefreshModelA = async () => {
    if (!segment) return;
    setRefreshingModelA(true);
    setLocalError(null);
    try {
      const pred = await fetchModelAPrediction(segment.id);
      if (!pred) {
        setLocalError('Model A inference service returned an empty prediction');
      }
    } catch (err: any) {
      setLocalError(err?.message || 'Model A inference failed');
    } finally {
      setRefreshingModelA(false);
    }
  };

  const currentFeatures = modelAPrediction?.feature_snapshot || (segment ? buildModelAFeatures(segment, rainfallMmHr) : null);

  const handleSave = () => {
    if (status === 'CLEAR') {
      onApplyDisruption(segment.id, null);
    } else {
      onApplyDisruption(segment.id, {
        status,
        cause,
        description: description || `${cause} on ${segment.name}`,
        reportedBy: 'Highway Ground Control',
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-surface border border-border rounded-md w-full max-w-lg max-h-[90vh] shadow-2xl overflow-hidden flex flex-col text-text-primary text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3 sm:p-4 bg-surface-subtle border-b border-border flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded-xs bg-primary-tint text-primary font-bold border border-primary/30">
                {segment.highway}
              </span>
              <h3 className="text-xs sm:text-sm font-semibold text-text-primary m-0 truncate max-w-[180px] xs:max-w-[260px] sm:max-w-none">
                {segment.name}
              </h3>
            </div>
            <p className="text-[10px] sm:text-[11px] text-text-secondary mt-0.5">
              Corridor Segment Clearance &amp; Structural Limits
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-sm text-text-secondary hover:text-text-primary hover:bg-surface border border-transparent hover:border-border cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 overflow-y-auto max-h-[72vh] custom-scrollbar">
          {/* 1. Constraint Status Banner */}
          {evaluation.passHardConstraints ? (
            <div className="p-2.5 sm:p-3 bg-status-open-tint text-status-open-text border border-status-open-solid rounded-sm flex items-start gap-2 sm:gap-2.5">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-status-open-solid mt-0.5" />
              <div>
                <span className="font-bold text-xs block">Safe for {vehicle.name}</span>
                <span className="text-[10px] sm:text-[11px] text-text-secondary">
                  Vehicle gross tonnage ({vehicle.weight_tonnes}T) and dimensions ({vehicle.height_m}m H × {vehicle.width_m}m W) clear all structural safety limits.
                </span>
              </div>
            </div>
          ) : (
            <div className="p-2.5 sm:p-3 bg-status-blocked-tint text-status-blocked-text border border-status-blocked-solid rounded-sm flex items-start gap-2 sm:gap-2.5">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-status-blocked-solid mt-0.5" />
              <div>
                <span className="font-bold text-xs block">Hard Constraint Violations Detected!</span>
                <ul className="list-disc pl-4 text-[10px] sm:text-[11px] text-text-secondary space-y-0.5 mt-1">
                  {evaluation.hardConstraintFailures.map((fail, i) => (
                    <li key={i}>{fail}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* 2. Structural Limits */}
          <div className="p-2.5 sm:p-3 bg-surface-subtle/50 rounded-sm border border-border space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block">
              Physical Road &amp; Structural Capacity
            </span>

            <div className="grid grid-cols-1 xs:grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-xs bg-surface border border-border">
                <span className="text-text-secondary block text-[10px]">Max Weight</span>
                <span className={`font-mono text-xs font-bold ${
                  vehicle.weight_tonnes > segment.max_weight_limit ? 'text-status-blocked-text' : 'text-status-open-text'
                }`}>
                  {segment.max_weight_limit} Tonnes
                </span>
                {segment.bridgeName && (
                  <span className="text-[9px] text-text-secondary truncate block mt-0.5">
                    {segment.bridgeName}
                  </span>
                )}
              </div>

              <div className="p-2 rounded-xs bg-surface border border-border">
                <span className="text-text-secondary block text-[10px]">Height Limit</span>
                <span className={`font-mono text-xs font-bold ${
                  vehicle.height_m > segment.max_height_limit ? 'text-status-blocked-text' : 'text-status-open-text'
                }`}>
                  {segment.max_height_limit} Meters
                </span>
                {segment.tunnelName && (
                  <span className="text-[9px] text-text-secondary truncate block mt-0.5">
                    {segment.tunnelName}
                  </span>
                )}
              </div>

              <div className="p-2 rounded-xs bg-surface border border-border">
                <span className="text-text-secondary block text-[10px]">Pass Width</span>
                <span className={`font-mono text-xs font-bold ${
                  vehicle.width_m > segment.max_width_limit ? 'text-status-blocked-text' : 'text-status-open-text'
                }`}>
                  {segment.max_width_limit} Meters
                </span>
                <span className="text-[9px] text-text-secondary truncate block mt-0.5">
                  {segment.surface_type}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Mountain & Weather Degradation Metrics */}
          <div className="p-3 bg-surface-subtle/50 rounded-sm border border-border space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block">
              Mountain Topography & Weather Friction
            </span>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-xs bg-surface border border-border flex items-center gap-2">
                <Mountain className="w-4 h-4 text-primary" />
                <div>
                  <span className="text-[10px] text-text-secondary block">Max Slope Gradient</span>
                  <span className="font-mono font-bold text-text-primary">{segment.gradient_pct}% Incline</span>
                </div>
              </div>

              <div className="p-2 rounded-xs bg-surface border border-border flex items-center gap-2">
                <CloudRain className="w-4 h-4 text-sky-500" />
                <div>
                  <span className="text-[10px] text-text-secondary block">Weather Degradation</span>
                  <span className="font-mono font-bold text-text-primary">
                    -{(evaluation.rainfallFactor * 40).toFixed(0)}% Speed Loss
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border">
              <span className="text-text-secondary">Degraded Transit Speed:</span>
              <span className="font-mono font-bold text-text-primary">
                {evaluation.effectiveSpeedKmh.toFixed(1)} km/h{' '}
                <span className="text-text-secondary font-normal">(Base: {segment.base_speed_kmh} km/h)</span>
              </span>
            </div>
          </div>

          {/* XAI Routing Engine Impact Assessment */}
          <div className="p-3 bg-surface-subtle/60 rounded-sm border border-border space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>XAI Routing Engine Impact</span>
              </span>
              <span className={`font-mono font-bold text-[9px] px-1.5 py-0.2 rounded-xs ${
                evaluation.passHardConstraints
                  ? 'bg-status-open-tint text-status-open-text border border-status-open-solid/40'
                  : 'bg-status-blocked-tint text-status-blocked-text border border-status-blocked-solid/40'
              }`}>
                {evaluation.passHardConstraints ? 'ELIGIBLE' : 'AUTO-PRUNED'}
              </span>
            </div>

            <p className="text-[11px] text-text-secondary leading-relaxed">
              {evaluation.passHardConstraints
                ? `Segment qualifies for Yen's K-Shortest candidate generation. Base impedance factor is ${(1.0 + evaluation.rainfallFactor * 0.5).toFixed(2)}x under current conditions.`
                : `Violates physical clearance or active hazard threshold. The K-Shortest algorithm automatically prunes any path traversing this segment and evaluates alternate mountain detours.`}
            </p>
          </div>

          {/* Model A Road-Disruption Predictive Risk Card */}
          <div className="p-3 bg-surface-subtle/70 rounded-sm border border-border/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-primary">
                  Model A · Road Disruption Risk Signal
                </span>
              </div>
              <div className="flex items-center gap-2">
                {modelAPrediction && (
                  <span className={`font-mono font-bold text-[9px] px-2 py-0.5 rounded-xs border ${
                    modelAPrediction.risk_band === 'HIGH'
                      ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                      : modelAPrediction.risk_band === 'ELEVATED'
                      ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                      : modelAPrediction.risk_band === 'MODERATE'
                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  }`}>
                    {modelAPrediction.risk_band} RISK
                  </span>
                )}
                <button
                  onClick={handleRefreshModelA}
                  disabled={refreshingModelA || isModelALoading}
                  title="Re-run Model A inference"
                  className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-surface border border-transparent hover:border-border cursor-pointer transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${refreshingModelA || isModelALoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Error State */}
            {effectiveError && !modelAPrediction && (
              <div className="p-2.5 rounded-xs bg-rose-500/10 border border-rose-500/30 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Model A inference unavailable</span>
                  </div>
                  <button
                    onClick={handleRefreshModelA}
                    disabled={refreshingModelA || isModelALoading}
                    className="px-2 py-0.5 rounded bg-surface hover:bg-surface-subtle border border-border text-[11px] font-semibold text-text-primary flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${refreshingModelA ? 'animate-spin' : ''}`} />
                    Retry
                  </button>
                </div>
                <p className="text-[11px] text-text-secondary leading-relaxed font-mono">
                  {effectiveError}
                </p>
              </div>
            )}

            {/* Loading State */}
            {isPending && !effectiveError && (
              <div className="p-3 rounded-xs bg-surface border border-border flex items-center justify-center gap-2 text-text-secondary text-xs">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                <span>Executing Model A XGBoost inference...</span>
              </div>
            )}

            {/* Success State */}
            {modelAPrediction && (
              <div className="space-y-2">
                <div className="p-2.5 rounded-xs bg-surface border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider">Disruption Probability:</span>
                    <span className="font-mono text-sm font-bold text-text-primary">
                      {(modelAPrediction.probability * 100).toFixed(1)}%
                    </span>
                  </div>

                  <div className="w-full bg-surface-subtle h-2.5 rounded-full overflow-hidden relative border border-border/50">
                    <div
                      className={`h-full transition-all duration-500 ${
                        modelAPrediction.probability >= 0.8
                          ? 'bg-rose-500'
                          : modelAPrediction.probability >= 0.6
                          ? 'bg-orange-500'
                          : modelAPrediction.probability >= 0.3
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, modelAPrediction.probability * 100))}%` }}
                    />
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-white/80 shadow-xs"
                      style={{ left: `${modelAPrediction.threshold * 100}%` }}
                      title={`Decision Threshold: ${(modelAPrediction.threshold * 100).toFixed(0)}%`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-text-secondary font-mono">
                    <span>0.0 (Nominal)</span>
                    <span className="font-bold text-text-primary">Threshold: {modelAPrediction.threshold.toFixed(2)}</span>
                    <span>1.0 (High Hazard)</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50 text-[10px] font-mono">
                    <div className="flex items-center justify-between bg-surface-subtle/50 px-2 py-1 rounded">
                      <span className="text-text-secondary">Prediction:</span>
                      <span className={`font-bold ${modelAPrediction.prediction === 1 ? 'text-orange-400' : 'text-emerald-400'}`}>
                        {modelAPrediction.prediction} ({modelAPrediction.prediction === 1 ? 'DISRUPTION LIKELY' : 'PASSABLE'})
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-surface-subtle/50 px-2 py-1 rounded">
                      <span className="text-text-secondary">Decision Threshold:</span>
                      <span className="font-bold text-text-primary">{modelAPrediction.threshold.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="text-[10px] text-text-secondary bg-surface-subtle/60 p-2 rounded border border-border/50 space-y-1">
                    <span className="font-semibold text-text-primary block">Risk / Interpretation:</span>
                    <p className="leading-relaxed text-text-primary/90 m-0">
                      {modelAPrediction.interpretation}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Operational Status Separation Disclaimer Notice */}
            <div className="p-2 rounded-xs bg-blue-500/10 border border-blue-500/20 text-[10px] text-text-secondary leading-relaxed flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-text-primary">Operational Distinction:</strong> Model A is a statistical hazard risk signal. It assesses potential vulnerability under terrain and rainfall conditions, but does <strong className="text-text-primary">NOT</strong> replace physical inspection or automatically declare a road closed. Operational status (<span className="text-status-open-text font-semibold">OPEN</span> / <span className="text-status-blocked-text font-semibold">BLOCKED</span>) remains strictly controlled by ground control overrides below.
              </div>
            </div>

            {/* Expandable 17-Feature Inputs Drawer */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowFeaturesDrawer(!showFeaturesDrawer)}
                className="w-full flex items-center justify-between py-1 px-2 rounded bg-surface hover:bg-surface-subtle border border-border text-[10px] font-semibold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                <span>View Model Inputs &amp; Feature Provenance (17 Frozen Features)</span>
                {showFeaturesDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showFeaturesDrawer && currentFeatures && (
                <div className="mt-2 p-2 rounded-xs bg-surface border border-border space-y-2 text-[10px]">
                  <div className="text-[9px] text-text-secondary font-mono border-b border-border pb-1">
                    Model Version: {modelAPrediction?.model_version || 'pravah_model_a_baseline_xgb_v1'} · Source: {modelAPrediction?.source || 'Inference Engine'}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                    {(Object.keys(MODEL_A_FEATURE_PROVENANCE) as (keyof typeof MODEL_A_FEATURE_PROVENANCE)[]).map((key) => {
                      const doc = MODEL_A_FEATURE_PROVENANCE[key];
                      const val = currentFeatures[key];
                      return (
                        <div key={key} className="p-1.5 rounded bg-surface-subtle border border-border/70">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-semibold text-text-primary truncate" title={key}>
                              {key}
                            </span>
                            <span className="font-mono font-bold text-primary ml-1 shrink-0">
                              {typeof val === 'number' ? val : String(val)} {doc.units !== 'unitless' && doc.units !== 'count' && doc.units !== 'binary' ? doc.units : ''}
                            </span>
                          </div>
                          <p className="text-[9px] text-text-secondary mt-0.5 line-clamp-2" title={doc.calculation}>
                            {doc.source}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 4. Field Disruption Injector for this Segment */}
          <div className="p-3 bg-surface-subtle/50 rounded-sm border border-border space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-500" />
                Field Disruption Override
              </span>
              {currentDisruption && (
                <button
                  onClick={() => {
                    onApplyDisruption(segment.id, null);
                    onClose();
                  }}
                  className="text-[10px] text-status-blocked-text hover:underline cursor-pointer"
                >
                  Clear Disruption
                </button>
              )}
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-text-secondary block mb-1">Status Level:</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full p-2 bg-surface border border-border rounded-sm text-text-primary focus:outline-none"
                >
                  <option value="CLEAR">Nominal / Clear Route</option>
                  <option value="SINGLE_LANE_PASSABLE">Single Lane Passable (Hazard Warning)</option>
                  <option value="TOTAL_BLOCKAGE">Total Blockage (Road Severed)</option>
                </select>
              </div>

              {status !== 'CLEAR' && (
                <>
                  <div>
                    <label className="text-[10px] text-text-secondary block mb-1">Disruption Cause:</label>
                    <select
                      value={cause}
                      onChange={(e) => setCause(e.target.value)}
                      className="w-full p-2 bg-surface border border-border rounded-sm text-text-primary focus:outline-none"
                    >
                      <option value="Major Landslide / Rockfall">Major Landslide / Rockfall</option>
                      <option value="Flash Flood / River Swelling">Flash Flood / River Swelling</option>
                      <option value="Bridge Structural Washout">Bridge Structural Washout</option>
                      <option value="Severe Mudflow & Sinking">Severe Mudflow & Sinking</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-text-secondary block mb-1">Field Advisory Note:</label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. Sinking zone near KM-42, heavy machinery en route"
                      className="w-full p-2 bg-surface border border-border rounded-sm text-text-primary focus:outline-none"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-surface-subtle border-t border-border flex flex-col xs:flex-row justify-between items-center gap-2">
          {onSeeOnMap ? (
            <button
              onClick={() => {
                onSeeOnMap(segment);
                onClose();
              }}
              className="w-full xs:w-auto px-3 py-1.5 rounded-sm border border-orange-500/40 text-orange-400 hover:bg-orange-500/10 btn-press cursor-pointer flex items-center justify-center gap-1.5 text-xs font-medium"
            >
              <MapPin className="w-3.5 h-3.5 text-orange-400" />
              <span>See this segment on map</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 w-full xs:w-auto justify-end">
            <button
              onClick={onClose}
              className="w-full xs:w-auto px-3 py-1.5 rounded-sm border border-border text-text-secondary hover:bg-surface btn-press cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="w-full xs:w-auto px-4 py-1.5 rounded-sm bg-[#1B4B73] hover:bg-[#123A5A] dark:bg-[#2E6B9E] text-white font-semibold shadow-xs flex items-center justify-center gap-1.5 btn-press cursor-pointer text-center"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Apply Segment State</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
