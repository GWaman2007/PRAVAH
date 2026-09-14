import React, { useState, useEffect } from 'react';
import { useSimulation } from '../context/SimulationContext';
import { evaluateSegment } from '../engine/constraintEvaluator';
import type { DisruptionCause, DisruptionType } from '../types';
import { 
  X, 
  AlertTriangle, 
  Send
} from 'lucide-react';

export const SegmentModal: React.FC = () => {
  const {
    inspectedSegment,
    inspectedSegmentId,
    setInspectedSegmentId,
    disruptions,
    setSegmentDisruption,
    selectedVehicle,
    rainfallMmHr,
  } = useSimulation();

  const [status, setStatus] = useState<DisruptionType>('NORMAL');
  const [cause, setCause] = useState<DisruptionCause>('LANDSLIDE');
  const [description, setDescription] = useState('');

  // Sync state when inspected segment changes
  useEffect(() => {
    if (!inspectedSegmentId) return;
    const existing = disruptions[inspectedSegmentId];
    if (existing) {
      setStatus(existing.status);
      setCause(existing.cause);
      setDescription(existing.description);
    } else {
      setStatus('NORMAL');
      setCause('LANDSLIDE');
      setDescription('');
    }
  }, [inspectedSegmentId, disruptions]);

  if (!inspectedSegment) return null;

  // Real-time evaluation of this segment with the current settings
  const currentDisruption = disruptions[inspectedSegment.id];
  const evalSeg = evaluateSegment(inspectedSegment, selectedVehicle, rainfallMmHr, currentDisruption);

  const handleSaveDisruption = () => {
    setSegmentDisruption(
      inspectedSegment.id,
      status,
      status === 'NORMAL' ? 'NONE' : cause,
      description || `${cause.replace('_', ' ')} reported on ${inspectedSegment.name}`
    );
    setInspectedSegmentId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-slate-200 text-xs"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                {inspectedSegment.highwayCode}
              </span>
              <h3 className="text-sm font-bold text-white m-0 truncate max-w-[280px]">
                {inspectedSegment.name}
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Corridor Segment Inspection &amp; Ground Incident Dispatch
            </p>
          </div>

          <button
            onClick={() => setInspectedSegmentId(null)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto max-h-[80vh] custom-scrollbar">
          {/* 1. Physical Specifications Grid */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Physical Road &amp; Structural Limits
            </span>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Max Load</span>
                <span className={`font-mono text-xs font-bold ${
                  selectedVehicle.weight_tonnes > inspectedSegment.max_weight_limit ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {inspectedSegment.max_weight_limit} Tonnes
                </span>
                <span className="text-[9px] text-slate-500 block">
                  {selectedVehicle.weight_tonnes > inspectedSegment.max_weight_limit ? '⚠️ Fails Load' : '✓ Passes'}
                </span>
              </div>

              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Height Clear</span>
                <span className={`font-mono text-xs font-bold ${
                  selectedVehicle.height_m > inspectedSegment.max_height_limit ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {inspectedSegment.max_height_limit}m
                </span>
                <span className="text-[9px] text-slate-500 block">
                  {selectedVehicle.height_m > inspectedSegment.max_height_limit ? '⚠️ Fails Height' : '✓ Passes'}
                </span>
              </div>

              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Pass Width</span>
                <span className={`font-mono text-xs font-bold ${
                  selectedVehicle.width_m > inspectedSegment.max_width_limit ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {inspectedSegment.max_width_limit}m
                </span>
                <span className="text-[9px] text-slate-500 block">
                  {selectedVehicle.width_m > inspectedSegment.max_width_limit ? '⚠️ Fails Width' : '✓ Passes'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
              <div>
                <span className="text-slate-400 block text-[10px]">Gradient</span>
                <span className="font-mono text-slate-200 font-semibold">{inspectedSegment.gradient_pct}% slope</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Bhuvan LHZ</span>
                <span className="font-mono text-amber-300 font-semibold">Level {inspectedSegment.bhuvan_lhz_level} / 5</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Surface</span>
                <span className="capitalize font-mono text-slate-200 font-semibold">{inspectedSegment.surface_type.replace('_', ' ')}</span>
              </div>
            </div>

            {inspectedSegment.bridgeName && (
              <div className="text-[11px] text-sky-300 bg-sky-950/30 p-2 rounded border border-sky-800/40">
                🌉 <strong>Bridge Infrastructure:</strong> {inspectedSegment.bridgeName}
              </div>
            )}
          </div>

          {/* 2. ML Dynamic Simulation Factors */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Multi-Factor ML Risk &amp; Speed Degradation
            </span>

            <div className="grid grid-cols-3 gap-2 text-center font-mono">
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px] font-sans">Effective Speed</span>
                <span className="text-white font-bold">{Math.round(evalSeg.effectiveSpeedKmh)} km/h</span>
                <span className="text-slate-500 text-[9px] block">Base: {inspectedSegment.base_speed_kmh} km/h</span>
              </div>

              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px] font-sans">Delay Multiplier</span>
                <span className="text-amber-400 font-bold">{evalSeg.delayMultiplier.toFixed(2)}x</span>
                <span className="text-slate-500 text-[9px] block">Terrain &amp; Rain</span>
              </div>

              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px] font-sans">Segment Risk</span>
                <span className={`font-bold ${evalSeg.segmentRisk > 0.5 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {Math.round(evalSeg.segmentRisk * 100)}%
                </span>
                <span className="text-slate-500 text-[9px] block">LHZ+Rain+Incident</span>
              </div>
            </div>

            {evalSeg.hardConstraintFailures.length > 0 && (
              <div className="p-2 rounded bg-rose-950/50 border border-rose-600/50 text-rose-200 text-[11px] space-y-1">
                <span className="font-bold text-rose-300">Stage 1 Hard Constraint Failures:</span>
                {evalSeg.hardConstraintFailures.map((f, i) => (
                  <div key={i}>• {f}</div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Disruption Injector for this segment */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Ground Officer Incident Dispatch
            </span>

            {/* Status Selector */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setStatus('NORMAL')}
                className={`py-2 px-1 rounded-lg border font-semibold text-center transition ${
                  status === 'NORMAL'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Normal / Clear
              </button>

              <button
                type="button"
                onClick={() => setStatus('SINGLE_LANE_PASSABLE')}
                className={`py-2 px-1 rounded-lg border font-semibold text-center transition ${
                  status === 'SINGLE_LANE_PASSABLE'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Single Lane Passable
              </button>

              <button
                type="button"
                onClick={() => setStatus('TOTAL_BLOCKAGE')}
                className={`py-2 px-1 rounded-lg border font-semibold text-center transition ${
                  status === 'TOTAL_BLOCKAGE'
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Total Blockage
              </button>
            </div>

            {/* Cause & Description inputs if not normal */}
            {status !== 'NORMAL' && (
              <div className="space-y-2 pt-1 animate-fadeIn">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Disruption Cause</label>
                  <select
                    value={cause}
                    onChange={e => setCause(e.target.value as DisruptionCause)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"
                  >
                    <option value="LANDSLIDE">Major Hill Landslide</option>
                    <option value="BRIDGE_DAMAGE">Bridge Pier Scouring / Damage</option>
                    <option value="MUDSLIDE">Slope Mudslide / Debris Flow</option>
                    <option value="TREE_FALL">Uprooted Tree / Electrical Lines</option>
                    <option value="FLASH_FLOOD">River Overflow / Flash Flooding</option>
                    <option value="ROAD_COLLAPSE">Embankment / Road Subsidence</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Field Incident Report Details</label>
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="e.g. 5,000 cu.m debris across both carriageways"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            onClick={() => setInspectedSegmentId(null)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveDisruption}
            className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold transition text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
          >
            <Send className="w-3.5 h-3.5" />
            Apply Incident Update
          </button>
        </div>
      </div>
    </div>
  );
};
