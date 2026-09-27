import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  testCustomModelAJson,
  validateModelAJson,
  FROZEN_MODEL_A_FEATURE_KEYS,
  type ModelAValidationReport,
} from '../../engine/modelAService';
import { buildModelAFeatures, MODEL_A_FEATURE_PROVENANCE } from '../../engine/modelAFeatureBuilder';
import { NER_SEGMENTS } from '../../data/routingNetwork';
import { usePravahStore } from '../../store/usePravahStore';
import type { ModelAPrediction } from '../../types';
import {
  Cpu,
  Play,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Zap,
  Gauge,
  Clock,
  Shield,
  Layers,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// Preset test vectors
const BENCHMARK_EXAMPLE = {
  rainfall_24h: 85.7,
  rainfall_72h: 163.2,
  rainfall_7d: 210.5,
  elevation_m: 196.8,
  slope_degrees: 31.6,
  historical_road_landslide_count: 6,
  historical_road_landslide_presence: 1,
  bt_road_km: 125.4,
  icbp_km: 42.1,
  cement_concrete_km: 18.2,
  paver_block_km: 5.3,
  total_paved_road_km: 191.0,
  bt_road_ratio: 0.65,
  icbp_ratio: 0.22,
  cement_concrete_ratio: 0.095,
  paver_block_ratio: 0.028,
  road_surface_diversity: 0.71,
};

const MONSOON_STORM_EXAMPLE = {
  segment_id: 'EXTREME-MONSOON-CORRIDOR',
  prediction_time: new Date().toISOString(),
  features: {
    rainfall_24h: 210.0,
    rainfall_72h: 380.0,
    rainfall_7d: 520.0,
    elevation_m: 1250.0,
    slope_degrees: 34.5,
    historical_road_landslide_count: 8,
    historical_road_landslide_presence: 1,
    bt_road_km: 12.0,
    icbp_km: 0.0,
    cement_concrete_km: 2.0,
    paver_block_km: 0.0,
    total_paved_road_km: 14.0,
    bt_road_ratio: 0.857,
    icbp_ratio: 0.0,
    cement_concrete_ratio: 0.143,
    paver_block_ratio: 0.0,
    road_surface_diversity: 2,
  },
};

const DRY_PLAINS_EXAMPLE = {
  segment_id: 'DRY-PLAINS-EXPRESSWAY',
  prediction_time: new Date().toISOString(),
  features: {
    rainfall_24h: 0.0,
    rainfall_72h: 0.0,
    rainfall_7d: 0.0,
    elevation_m: 54.0,
    slope_degrees: 1.2,
    historical_road_landslide_count: 0,
    historical_road_landslide_presence: 0,
    bt_road_km: 68.0,
    icbp_km: 4.0,
    cement_concrete_km: 22.0,
    paver_block_km: 0.0,
    total_paved_road_km: 94.0,
    bt_road_ratio: 0.723,
    icbp_ratio: 0.043,
    cement_concrete_ratio: 0.234,
    paver_block_ratio: 0.0,
    road_surface_diversity: 3,
  },
};

const MODERATE_MOUNTAIN_EXAMPLE = {
  segment_id: 'MODERATE-MOUNTAIN-PASS',
  prediction_time: new Date().toISOString(),
  features: {
    rainfall_24h: 42.0,
    rainfall_72h: 88.0,
    rainfall_7d: 135.0,
    elevation_m: 620.0,
    slope_degrees: 9.8,
    historical_road_landslide_count: 1,
    historical_road_landslide_presence: 1,
    bt_road_km: 32.0,
    icbp_km: 0.0,
    cement_concrete_km: 5.0,
    paver_block_km: 0.0,
    total_paved_road_km: 37.0,
    bt_road_ratio: 0.865,
    icbp_ratio: 0.0,
    cement_concrete_ratio: 0.135,
    paver_block_ratio: 0.0,
    road_surface_diversity: 2,
  },
};

export const ModelATestingDeck: React.FC = () => {
  const { rainfallMmHr } = usePravahStore();
  const [jsonInput, setJsonInput] = useState<string>(() => JSON.stringify(BENCHMARK_EXAMPLE, null, 2));
  const [predictionResult, setPredictionResult] = useState<ModelAPrediction | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedInput, setCopiedInput] = useState<boolean>(false);
  const [copiedOutput, setCopiedOutput] = useState<boolean>(false);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>('SEG-SIL-KOL');
  const [showRawResponse, setShowRawResponse] = useState<boolean>(false);

  // Live client-side schema validation
  const validation: ModelAValidationReport = useMemo(() => {
    return validateModelAJson(jsonInput);
  }, [jsonInput]);

  // Execute prediction with an explicit JSON payload (avoids stale closures entirely)
  const runInferenceDirectly = useCallback(async (payload: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await testCustomModelAJson(payload);
      setPredictionResult(res.prediction);
      setLatency(res.latencyMs);
    } catch (err: any) {
      setErrorMessage(err.message || 'Inference execution failed');
      setPredictionResult(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Wrapper that reads current jsonInput from state (for Ctrl+Enter and button clicks)
  const handleRunInference = useCallback(() => {
    runInferenceDirectly(jsonInput);
  }, [jsonInput, runInferenceDirectly]);

  // Initial benchmark run on mount
  useEffect(() => {
    runInferenceDirectly(JSON.stringify(BENCHMARK_EXAMPLE, null, 2));
  }, [runInferenceDirectly]);

  // Format JSON
  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      setJsonInput(JSON.stringify(parsed, null, 2));
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(`Cannot format invalid JSON: ${err.message}`);
    }
  };

  // Load from authentic road segment — auto-runs inference
  const handleLoadFromSegment = (segId: string) => {
    setSelectedSegmentId(segId);
    const seg = NER_SEGMENTS.find((s) => s.id === segId);
    if (!seg) return;
    const features = buildModelAFeatures(seg, rainfallMmHr);
    const payload = {
      segment_id: seg.id,
      segment_name: seg.name,
      highway: seg.highway,
      prediction_time: new Date().toISOString(),
      features,
    };
    const newJson = JSON.stringify(payload, null, 2);
    setJsonInput(newJson);
    setErrorMessage(null);
    runInferenceDirectly(newJson);
  };

  // Load a preset and immediately run inference
  const handleLoadPreset = useCallback((preset: Record<string, any>) => {
    const newJson = JSON.stringify(preset, null, 2);
    setJsonInput(newJson);
    setErrorMessage(null);
    runInferenceDirectly(newJson);
  }, [runInferenceDirectly]);

  const handleCopyInput = () => {
    navigator.clipboard.writeText(jsonInput);
    setCopiedInput(true);
    setTimeout(() => setCopiedInput(false), 2000);
  };

  const handleCopyOutput = () => {
    if (!predictionResult) return;
    navigator.clipboard.writeText(JSON.stringify(predictionResult, null, 2));
    setCopiedOutput(true);
    setTimeout(() => setCopiedOutput(false), 2000);
  };

  // Keyboard shortcut Ctrl+Enter / Cmd+Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRunInference();
    }
  };

  const prob = predictionResult ? predictionResult.probability : 0;
  const probPct = Math.round(prob * 100);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 text-text-primary">
      {/* ========================================================================= */}
      {/* 1. Header & Technical Specification Overview                              */}
      {/* ========================================================================= */}
      <div className="bg-surface rounded-lg p-5 border border-border shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1.5 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/30">
                <Cpu className="w-5 h-5" />
              </span>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>PRAVAH Model A — AI Inference &amp; Testing Lab</span>
              </h1>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-primary-tint text-primary border border-primary/30">
                v3.4.1 Frozen Baseline
              </span>
            </div>
            <p className="text-xs text-text-secondary">
              Interactive test bench to evaluate the frozen XGBoost road-disruption hazard classifier with arbitrary JSON payloads, real segment snapshots, and extreme weather profiles.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right font-mono text-xs">
              <div className="text-text-secondary text-[10px] uppercase">Decision Threshold</div>
              <div className="font-bold text-orange-400">0.50 (Strict)</div>
            </div>
            <div className="h-7 w-[1px] bg-border mx-1" />
            <div className="text-right font-mono text-xs">
              <div className="text-text-secondary text-[10px] uppercase">Frozen Features</div>
              <div className="font-bold text-primary">17 Features</div>
            </div>
          </div>
        </div>

        {/* Preset Selector Chips */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-border text-xs">
          <span className="text-[11px] font-semibold text-text-secondary mr-1 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Test Fixtures:</span>
          </span>

          <button
            onClick={() => handleLoadPreset(BENCHMARK_EXAMPLE)}
            className="px-2.5 py-1 rounded bg-surface-subtle hover:bg-surface border border-border hover:border-primary/50 text-[11px] font-medium transition cursor-pointer"
          >
            📌 Package Benchmark (~70.6%)
          </button>

          <button
            onClick={() => handleLoadPreset(MONSOON_STORM_EXAMPLE)}
            className="px-2.5 py-1 rounded bg-surface-subtle hover:bg-surface border border-border hover:border-red-500/50 text-[11px] font-medium text-rose-300 transition cursor-pointer"
          >
            🌧️ Extreme Cloudburst (High Risk)
          </button>

          <button
            onClick={() => handleLoadPreset(MODERATE_MOUNTAIN_EXAMPLE)}
            className="px-2.5 py-1 rounded bg-surface-subtle hover:bg-surface border border-border hover:border-amber-500/50 text-[11px] font-medium text-amber-300 transition cursor-pointer"
          >
            🏔️ Mountain Highway (Moderate)
          </button>

          <button
            onClick={() => handleLoadPreset(DRY_PLAINS_EXAMPLE)}
            className="px-2.5 py-1 rounded bg-surface-subtle hover:bg-surface border border-border hover:border-emerald-500/50 text-[11px] font-medium text-emerald-300 transition cursor-pointer"
          >
            🛣️ Dry Plains (Low Risk)
          </button>

          <div className="flex items-center gap-1 ml-auto">
            <span className="text-[10px] text-text-secondary">From Network:</span>
            <select
              value={selectedSegmentId}
              onChange={(e) => handleLoadFromSegment(e.target.value)}
              className="bg-surface-subtle border border-border rounded px-2 py-0.5 text-[11px] font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              {NER_SEGMENTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.highway}: {s.name.slice(0, 24)}...
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Main Two-Column Workstation: Editor & Results                          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN: JSON Input & Live Validation (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-surface rounded-lg border border-border shadow-xs overflow-hidden flex flex-col h-full">
            {/* Editor Toolbar */}
            <div className="p-3 bg-surface-subtle border-b border-border flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-primary" />
                <span className="font-semibold text-xs text-white">Observation JSON Payload</span>
                <span className="text-[10px] font-mono text-text-secondary">
                  (Press <kbd className="px-1 py-0.5 bg-surface border border-border rounded text-[9px]">Ctrl+Enter</kbd> to run)
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleFormatJson}
                  className="px-2 py-1 text-[11px] rounded bg-surface border border-border hover:bg-surface-subtle text-text-secondary hover:text-white transition cursor-pointer"
                  title="Format JSON"
                >
                  Format
                </button>
                <button
                  onClick={handleCopyInput}
                  className="px-2 py-1 text-[11px] rounded bg-surface border border-border hover:bg-surface-subtle text-text-secondary hover:text-white transition cursor-pointer flex items-center gap-1"
                  title="Copy JSON to clipboard"
                >
                  {copiedInput ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedInput ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* JSON Textarea Editor */}
            <div className="relative flex-1 p-3 bg-slate-950 font-mono text-xs">
              <textarea
                value={jsonInput}
                onChange={(e) => {
                  setJsonInput(e.target.value);
                  setErrorMessage(null);
                }}
                onKeyDown={handleKeyDown}
                rows={19}
                spellCheck={false}
                placeholder="Paste or edit Model A observation JSON..."
                className="w-full h-full bg-transparent text-emerald-300 resize-none focus:outline-none font-mono text-xs leading-relaxed selection:bg-primary/30 custom-scrollbar"
              />
            </div>

            {/* Action Footer */}
            <div className="p-3 bg-surface-subtle border-t border-border flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {validation.isValid ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>17 / 17 Frozen Features Valid</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>
                      {validation.missingFeatures.length > 0
                        ? `${validation.missingFeatures.length} Missing Feature${validation.missingFeatures.length > 1 ? 's' : ''}`
                        : 'Invalid Feature Values'}
                    </span>
                  </span>
                )}
              </div>

              <button
                onClick={handleRunInference}
                disabled={isLoading}
                className="px-4 py-2 rounded bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold text-xs flex items-center gap-2 shadow-xs transition btn-press cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Evaluating Model A...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Predict Disruption Risk</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Validation Checklist Drawer */}
          <div className="bg-surface rounded-lg p-3.5 border border-border text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                <span>Frozen 17-Feature Schema Verification</span>
              </span>
              <span className="font-mono text-[10px] text-text-secondary">
                Order: 1..17 strictly maintained
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px] font-mono">
              {FROZEN_MODEL_A_FEATURE_KEYS.map((key, idx) => {
                const isPresent = validation.parsedFeatures[key] !== undefined;
                const val = validation.parsedFeatures[key];
                return (
                  <div
                    key={key}
                    className={`p-1.5 rounded border flex items-center justify-between truncate ${
                      isPresent
                        ? 'bg-surface-subtle border-emerald-500/30 text-emerald-300'
                        : 'bg-red-500/10 border-red-500/30 text-red-300'
                    }`}
                  >
                    <span className="truncate mr-1 text-[10px]" title={key}>
                      {idx + 1}. {key}
                    </span>
                    <span className="font-bold shrink-0 text-[10px]">
                      {isPresent ? val : '✕'}
                    </span>
                  </div>
                );
              })}
            </div>

            {validation.extraFeatures.length > 0 && (
              <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Extra features ignored by frozen schema: {validation.extraFeatures.join(', ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Prediction Results & Evaluation (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/40 text-red-300 text-xs space-y-1 animate-fadeIn">
              <div className="font-bold flex items-center gap-1.5 text-red-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Inference Execution Error</span>
              </div>
              <p className="font-mono text-[11px] leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {/* Model Prediction Result Card */}
          {predictionResult ? (
            <div className="bg-surface rounded-lg p-5 border border-border shadow-md space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-3 h-3 rounded-full shadow-xs ${
                      predictionResult.risk_band === 'HIGH'
                        ? 'bg-rose-500 animate-pulse'
                        : predictionResult.risk_band === 'ELEVATED'
                        ? 'bg-orange-500 animate-pulse'
                        : predictionResult.risk_band === 'MODERATE'
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                    }`}
                  />
                  <span className="font-bold text-xs uppercase tracking-wider text-white">
                    Prediction Output
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-mono text-text-secondary">
                  {latency !== null && (
                    <span className="flex items-center gap-1 text-[11px]">
                      <Clock className="w-3 h-3 text-primary" />
                      <span>{latency} ms</span>
                    </span>
                  )}
                  <span>•</span>
                  <span className="text-orange-400 font-bold">{predictionResult.model_version}</span>
                </div>
              </div>

              {/* Big Probability Meter */}
              <div className="text-center p-4 rounded-lg bg-surface-subtle border border-border/80 space-y-2">
                <div className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold">
                  Documented Disruption Event Probability
                </div>

                <div className="flex items-baseline justify-center gap-1">
                  <span
                    className={`text-4xl sm:text-5xl font-black font-mono tracking-tight ${
                      predictionResult.risk_band === 'HIGH'
                        ? 'text-rose-500'
                        : predictionResult.risk_band === 'ELEVATED'
                        ? 'text-orange-400'
                        : predictionResult.risk_band === 'MODERATE'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {probPct}%
                  </span>
                  <span className="text-sm font-mono text-text-tertiary">
                    ({prob.toFixed(4)})
                  </span>
                </div>

                {/* Meter Bar */}
                <div className="space-y-1">
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden relative">
                    <div
                      className={`h-full transition-all duration-500 ${
                        predictionResult.risk_band === 'HIGH'
                          ? 'bg-rose-500'
                          : predictionResult.risk_band === 'ELEVATED'
                          ? 'bg-orange-500'
                          : predictionResult.risk_band === 'MODERATE'
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(2, probPct))}%` }}
                    />
                    {/* 0.50 Threshold Marker */}
                    <div
                      className="absolute top-0 bottom-0 w-[2px] bg-white shadow-xs z-10"
                      style={{ left: '50%' }}
                      title="Decision Threshold: 0.50"
                    />
                  </div>

                  <div className="flex justify-between text-[10px] font-mono text-text-tertiary px-0.5">
                    <span>0% (Low)</span>
                    <span className="text-white font-bold">Threshold: 50%</span>
                    <span>100% (High)</span>
                  </div>
                </div>

                {/* Risk Band & Classification Pill */}
                <div className="flex items-center justify-center gap-2 pt-2">
                  <span
                    className={`px-3 py-1 rounded font-bold text-xs uppercase tracking-wider border shadow-xs ${
                      predictionResult.risk_band === 'HIGH'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                        : predictionResult.risk_band === 'ELEVATED'
                        ? 'bg-orange-500/20 text-orange-300 border-orange-500/50'
                        : predictionResult.risk_band === 'MODERATE'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                    }`}
                  >
                    Risk Band: {predictionResult.risk_band}
                  </span>

                  <span className="px-2.5 py-1 rounded bg-surface border border-border font-mono text-xs text-text-secondary">
                    Prediction = <strong className="text-white">{predictionResult.prediction}</strong>
                  </span>
                </div>
              </div>

              {/* Interpretation & Tactical Meaning */}
              <div className="p-3 rounded-md bg-surface-subtle border border-border space-y-1.5 text-xs">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">
                  Model A Interpretation
                </span>
                <p className="text-text-primary leading-relaxed font-medium">
                  {predictionResult.interpretation}
                </p>
              </div>

              {/* Benchmark Validation Notice - only when input strictly matches the 17-feature benchmark vector */}
              {Math.abs(prob - 0.7061) < 0.005 &&
               validation.parsedFeatures.rainfall_24h === 85.7 &&
               validation.parsedFeatures.rainfall_72h === 163.2 &&
               validation.parsedFeatures.rainfall_7d === 210.5 &&
               validation.parsedFeatures.slope_degrees === 31.6 && (
                <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>
                    <strong>Benchmark Match:</strong> Input matches the official frozen Model A baseline benchmark fixture (Probability: 70.61%).
                  </span>
                </div>
              )}

              {/* Active Evaluation Context */}
              <div className="p-2.5 rounded bg-surface-subtle border border-border/70 text-[11px] font-mono text-text-secondary space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-text-tertiary">Segment / Fixture ID:</span>
                  <span className="text-text-primary font-bold">{predictionResult.segment_id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-tertiary">Evaluated Features:</span>
                  <span className="text-text-primary font-bold">17 Frozen XGBoost Features</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-tertiary">Inference Engine:</span>
                  <span className="text-emerald-400 font-bold">Live Microservice (Port 5005 / XGBoost)</span>
                </div>
              </div>

              {/* Operational Road Status Independence Principle */}
              <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] leading-relaxed">
                <span className="font-bold">Operational Principle: </span>
                Model A outputs statistical disruption probability. A probability of {probPct}% does <em>not</em> mark a road closed. Operational road status is determined strictly by confirmed BRO/field intelligence.
              </div>

              {/* Collapsible Raw JSON Response */}
              <div className="pt-2 border-t border-border">
                <button
                  onClick={() => setShowRawResponse(!showRawResponse)}
                  className="w-full flex items-center justify-between text-xs text-text-secondary hover:text-white py-1 cursor-pointer"
                >
                  <span className="font-semibold flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-primary" />
                    <span>Raw JSON Prediction Response</span>
                  </span>
                  {showRawResponse ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showRawResponse && (
                  <div className="mt-2 relative">
                    <pre className="p-3 rounded bg-slate-950 text-emerald-300 text-[11px] font-mono overflow-x-auto max-h-60 custom-scrollbar border border-border">
                      {JSON.stringify(predictionResult, null, 2)}
                    </pre>
                    <button
                      onClick={handleCopyOutput}
                      className="absolute top-2 right-2 px-2 py-1 text-[10px] rounded bg-surface border border-border text-text-secondary hover:text-white cursor-pointer flex items-center gap-1"
                    >
                      {copiedOutput ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedOutput ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-surface rounded-lg p-8 border border-border text-center space-y-3">
              <Cpu className="w-10 h-10 text-text-tertiary mx-auto opacity-50" />
              <div className="text-sm font-semibold text-text-secondary">No Prediction Yet</div>
              <p className="text-xs text-text-tertiary max-w-sm mx-auto">
                Click <strong>"Predict Disruption Risk"</strong> or press <kbd className="px-1 py-0.5 bg-surface-subtle border border-border rounded text-[10px]">Ctrl+Enter</kbd> to run the payload through the frozen Model A engine.
              </p>
            </div>
          )}

          {/* Quick Reference Guide */}
          <div className="bg-surface rounded-lg p-4 border border-border text-xs space-y-2.5">
            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-sky-400" />
              <span>Model A Specification</span>
            </span>

            <div className="space-y-1.5 text-[11px] text-text-secondary">
              <div className="flex justify-between border-b border-border/40 pb-1">
                <span>Model Architecture:</span>
                <span className="font-mono text-text-primary font-semibold">XGBoost Classifier</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1">
                <span>Target Definition:</span>
                <span className="font-mono text-text-primary">Road disruption event</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1">
                <span>Prediction Horizon:</span>
                <span className="font-mono text-text-primary">24 Hours Forward</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1">
                <span>Feature Schema:</span>
                <span className="font-mono text-text-primary">17 Frozen Features</span>
              </div>
              <div className="flex justify-between">
                <span>Classification Threshold:</span>
                <span className="font-mono text-text-primary font-bold text-orange-400">0.50</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
