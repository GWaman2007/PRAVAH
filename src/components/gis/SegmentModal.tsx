import React, { useState } from 'react';
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
  Sliders
} from 'lucide-react';

interface SegmentModalProps {
  segment: Segment | null;
  vehicle: VehicleProfile;
  rainfallMmHr: number;
  currentDisruption?: SegmentIncident;
  onClose: () => void;
  onApplyDisruption: (segmentId: string, disruption: SegmentIncident | null) => void;
}

export const SegmentModal: React.FC<SegmentModalProps> = ({
  segment,
  vehicle,
  rainfallMmHr,
  currentDisruption,
  onClose,
  onApplyDisruption,
}) => {
  if (!segment) return null;

  const evaluation = evaluateSegment(segment, vehicle, rainfallMmHr, currentDisruption);

  const [status, setStatus] = useState<'TOTAL_BLOCKAGE' | 'SINGLE_LANE_PASSABLE' | 'CLEAR'>(
    currentDisruption ? currentDisruption.status : 'CLEAR'
  );
  const [cause, setCause] = useState<string>(currentDisruption?.cause || 'Major Landslide / Rockfall');
  const [description, setDescription] = useState<string>(currentDisruption?.description || '');

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-surface border border-border rounded-md w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-text-primary text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-surface-subtle border-b border-border flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded-xs bg-primary-tint text-primary font-bold border border-primary/30">
                {segment.highway}
              </span>
              <h3 className="text-sm font-semibold text-text-primary m-0 truncate max-w-[280px]">
                {segment.name}
              </h3>
            </div>
            <p className="text-[11px] text-text-secondary mt-1">
              Corridor Segment Clearance & Structural Limits
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-sm text-text-secondary hover:text-text-primary hover:bg-surface border border-transparent hover:border-border cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto max-h-[80vh] custom-scrollbar">
          {/* 1. Constraint Status Banner */}
          {evaluation.passHardConstraints ? (
            <div className="p-3 bg-status-open-tint text-status-open-text border border-status-open-solid rounded-sm flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 shrink-0 text-status-open-solid mt-0.5" />
              <div>
                <span className="font-bold text-xs block">Safe for {vehicle.name}</span>
                <span className="text-[11px] text-text-secondary">
                  Vehicle gross tonnage ({vehicle.weight_tonnes}T) and dimensions ({vehicle.height_m}m H × {vehicle.width_m}m W) clear all structural safety limits.
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-status-blocked-tint text-status-blocked-text border border-status-blocked-solid rounded-sm flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 shrink-0 text-status-blocked-solid mt-0.5" />
              <div>
                <span className="font-bold text-xs block">Hard Constraint Violations Detected!</span>
                <ul className="list-disc pl-4 text-[11px] text-text-secondary space-y-0.5 mt-1">
                  {evaluation.hardConstraintFailures.map((fail, i) => (
                    <li key={i}>{fail}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* 2. Structural Limits */}
          <div className="p-3 bg-surface-subtle/50 rounded-sm border border-border space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block">
              Physical Road & Structural Capacity
            </span>

            <div className="grid grid-cols-3 gap-2 text-center">
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
        <div className="p-3 bg-surface-subtle border-t border-border flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-sm border border-border text-text-secondary hover:bg-surface btn-press cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-sm bg-[#1B4B73] hover:bg-[#123A5A] dark:bg-[#2E6B9E] text-white font-semibold shadow-xs flex items-center gap-1.5 btn-press cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Apply Segment State</span>
          </button>
        </div>
      </div>
    </div>
  );
};
