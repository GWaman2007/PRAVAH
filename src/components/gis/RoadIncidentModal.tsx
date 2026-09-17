import React from 'react';
import type { Segment, SegmentIncident, Incident, ReliefMission } from '../../types';
import { formatTimeAgo, calculateIncidentConfidence } from '../../engine/offlineSync';
import {
  X,
  AlertTriangle,
  Clock,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  Sliders,
  CheckCircle2,
} from 'lucide-react';

interface RoadIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  segment: Segment | null;
  disruption: SegmentIncident | null;
  incident?: Incident | null;
  affectedMissions: ReliefMission[];
  onOpenSegmentEngineering?: (segment: Segment) => void;
}

export const RoadIncidentModal: React.FC<RoadIncidentModalProps> = ({
  isOpen,
  onClose,
  segment,
  disruption,
  incident,
  affectedMissions,
  onOpenSegmentEngineering,
}) => {
  if (!isOpen || !segment || !disruption) return null;

  const confidence = incident ? calculateIncidentConfidence(incident) : null;
  const isTotalBlockage = disruption.status === 'TOTAL_BLOCKAGE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-lg w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-slate-100 text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3.5 sm:p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-red-950 text-red-400 font-bold border border-red-800/60">
              {segment.highway}
            </span>
            <div>
              <h3 className="text-sm font-semibold text-white m-0">
                {incident?.title || disruption.description || `${disruption.cause || 'Road Incident'} on ${segment.name}`}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Corridor: {segment.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-3.5 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Status & Cause Banner */}
          <div
            className={`p-3 rounded-md border flex items-start gap-2.5 ${
              isTotalBlockage
                ? 'bg-red-950/40 border-red-700/60 text-red-300'
                : 'bg-amber-950/40 border-amber-700/60 text-amber-300'
            }`}
          >
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider">
                  {disruption.status.replace(/_/g, ' ')}
                </span>
                {disruption.severity && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-red-900/60 text-red-200 border border-red-700/50">
                    Severity: {disruption.severity}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {disruption.description || `${disruption.cause || 'Incident'} affecting regular vehicular flow.`}
              </p>
            </div>
          </div>

          {/* Operational Metrics Grid */}
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Cause / Hazard</span>
              <span className="font-medium text-slate-200 mt-0.5 block">{disruption.cause || 'Road Breakdown'}</span>
            </div>

            <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Reporter</span>
              <span className="font-medium text-slate-200 mt-0.5 block truncate">
                {disruption.reportedBy || (incident ? `${incident.author.name} (${incident.author.role})` : 'Field Ground Control')}
              </span>
            </div>

            {confidence && (
              <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Verification Confidence</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono font-bold text-slate-100">{confidence.score} pts</span>
                  {confidence.hasOfficer ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> Verified
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-400 font-medium">Under Review</span>
                  )}
                </div>
              </div>
            )}

            {(incident?.timestamp || disruption.reportedTime) && (
              <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Last Updated</span>
                <div className="flex items-center gap-1 mt-0.5 text-slate-300">
                  <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>{formatTimeAgo(incident?.timestamp || disruption.reportedTime || '')}</span>
                </div>
              </div>
            )}

            {disruption.estimatedClearanceHours !== undefined && (
              <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800 col-span-2">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Clearance Estimate</span>
                <span className="font-semibold text-amber-400 mt-0.5 block">
                  ~{disruption.estimatedClearanceHours} hours until single-lane clearance
                </span>
              </div>
            )}
          </div>

          {/* Affected Active Relief Missions */}
          <div>
            <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
              Affected Relief Missions ({affectedMissions.length})
            </span>
            {affectedMissions.length === 0 ? (
              <div className="p-2.5 rounded bg-slate-950/40 border border-slate-800 text-[11px] text-slate-400">
                No active dispatched relief missions currently routed through this corridor.
              </div>
            ) : (
              <div className="space-y-1.5">
                {affectedMissions.map((m) => (
                  <div
                    key={m.id}
                    className="p-2.5 rounded bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-sky-400">{m.id}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-200 font-medium">{m.destinationName}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Vehicle: {m.assignedVehicleId || 'Unassigned'}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Reroute Advised
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between">
          {onOpenSegmentEngineering && (
            <button
              onClick={() => {
                onClose();
                onOpenSegmentEngineering(segment);
              }}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-400" />
              <span>Corridor Engineering Limits</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium transition cursor-pointer ml-auto"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
