/**
 * PRAVAH — Driver Lightweight Incident & Hazard Report Modal
 * 
 * Allows convoy drivers to quickly flag road blockages, route hazards, accidents,
 * vehicle breakdowns, or unable-to-proceed situations from their current GPS location.
 * Fully operational offline: queues reports locally when disconnected.
 */
import React, { useState } from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import {
  X,
  AlertTriangle,
  Camera,
  MapPin,
  Send,
  AlertOctagon,
  Wrench,
  Ban,
  CheckCircle2,
} from 'lucide-react';
import type { IncidentType, IncidentSeverity } from '../../types';

interface DriverReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverCoords: [number, number];
  vehicleId: string;
  driverName: string;
}

const REPORT_CATEGORIES: {
  type: IncidentType;
  label: string;
  icon: React.ElementType;
  color: string;
  defaultSeverity: IncidentSeverity;
  hint: string;
}[] = [
  {
    type: 'Road Subsidence',
    label: 'Road Blockage',
    icon: Ban,
    color: 'text-red-400 bg-red-500/10 border-red-500/30',
    defaultSeverity: 'Total Blockage',
    hint: 'Debris, fallen rocks, or physical obstruction across carriageway',
  },
  {
    type: 'Landslide',
    label: 'Route Hazard',
    icon: AlertTriangle,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    defaultSeverity: 'Single Lane Passable',
    hint: 'Mudslide, slippery slope, erosion, or degraded pavement',
  },
  {
    type: 'Bridge Washout',
    label: 'Accident / Bridge Damage',
    icon: AlertOctagon,
    color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    defaultSeverity: 'Total Blockage',
    hint: 'Traffic collision, stranded transport, or bridge damage',
  },
  {
    type: 'Tree Fall',
    label: 'Vehicle Issue / Obstruction',
    icon: Wrench,
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    defaultSeverity: 'Caution/Hazard',
    hint: 'Fallen trees, powerlines, or mechanical vehicle issue',
  },
  {
    type: 'Flash Flood',
    label: 'Unable to Proceed (Waterlogged)',
    icon: Ban,
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    defaultSeverity: 'Total Blockage',
    hint: 'Waterlogged ford, washed-out culvert, or zero clearance',
  },
];

export const DriverReportModal: React.FC<DriverReportModalProps> = ({
  isOpen,
  onClose,
  driverCoords,
  vehicleId,
  driverName,
}) => {
  const { addIncident, isOnline, isSimulatedOffline } = usePravahStore();
  const effectiveOnline = isOnline && !isSimulatedOffline;

  const [selectedCategory, setSelectedCategory] = useState<IncidentType>('Road Subsidence');
  const [severity, setSeverity] = useState<IncidentSeverity>('Total Blockage');
  const [notes, setNotes] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSelectCategory = (cat: typeof REPORT_CATEGORIES[0]) => {
    setSelectedCategory(cat.type);
    setSeverity(cat.defaultSeverity);
  };

  const handleSimulatePhoto = () => {
    // Lightweight mock photo placeholder representing road condition
    setPhotoPreview('https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=60');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const activeCategory = REPORT_CATEGORIES.find((c) => c.type === selectedCategory) || REPORT_CATEGORIES[0];

    addIncident({
      title: `${activeCategory.label} reported by ${vehicleId}${notes ? `: ${notes}` : ''}`,
      corridorFlair: 'r/NH-29-Nagaland',
      incidentType: selectedCategory,
      severity,
      location: {
        lat: driverCoords[0],
        lng: driverCoords[1],
        placeName: `GPS ${driverCoords[0].toFixed(4)}°N, ${driverCoords[1].toFixed(4)}°E`,
        corridorId: 'NH-29',
      },
      author: {
        name: `${driverName} (${vehicleId})`,
        role: 'Registered Driver',
      },
      timestamp: new Date().toISOString(),
      mediaUrl: photoPreview || '',
    });

    setSubmitted(true);
    setTimeout(() => {
      onClose();
      setSubmitted(false);
      setNotes('');
      setPhotoPreview(null);
    }, 1200);
  };

  const severityOptions: IncidentSeverity[] = [
    'Caution/Hazard',
    'Single Lane Passable',
    'Total Blockage',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#111A29] border border-slate-700 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-[#0F172A]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Report Road Issue</h3>
              <p className="text-[10px] text-slate-400">Driver Quick Report • {vehicleId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-sm font-bold text-white">Report Transmitted</h4>
            <p className="text-xs text-slate-300 max-w-xs">
              {effectiveOnline
                ? 'Base Command & Dispatch have been notified with your current coordinates.'
                : 'Saved locally in offline queue. Will sync automatically upon connection.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-3.5 text-xs">
            {/* GPS Location Pill */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
              <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                GPS Coordinates
              </span>
              <span className="font-mono text-emerald-400 font-semibold">
                {driverCoords[0].toFixed(4)}°N, {driverCoords[1].toFixed(4)}°E
              </span>
            </div>

            {/* Offline notification banner if offline */}
            {!effectiveOnline && (
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                <span>Offline Mode: Report will be cached locally & sent on reconnect.</span>
              </div>
            )}

            {/* Category Selection */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Issue Type
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {REPORT_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.type;
                  return (
                    <button
                      key={cat.type}
                      type="button"
                      onClick={() => handleSelectCategory(cat)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        isSelected
                          ? `${cat.color} font-bold ring-1 ring-blue-400/50 shadow-sm`
                          : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 shrink-0" />
                        <div>
                          <span className="block leading-tight text-xs">{cat.label}</span>
                          <span className="text-[10px] text-slate-400 font-normal leading-none">{cat.hint}</span>
                        </div>
                      </div>
                      {isSelected && <span className="text-xs">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Severity Pill */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Severity Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {severityOptions.map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSeverity(sev)}
                    className={`py-1.5 px-1 rounded-lg text-center font-bold text-[10px] uppercase tracking-wider border transition-colors cursor-pointer ${
                      severity === sev
                        ? sev === 'Total Blockage'
                          ? 'bg-red-500/20 border-red-500 text-red-400'
                          : sev === 'Single Lane Passable'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                          : 'bg-blue-500/20 border-blue-500 text-blue-400'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {sev === 'Total Blockage' ? 'Blocked' : sev === 'Single Lane Passable' ? 'Single Lane' : 'Caution'}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Description / Notes */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Details / Observations (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Road split across right lane, boulder fallen at km 38, unable to bypass..."
                rows={2}
                className="w-full rounded-lg bg-slate-900 border border-slate-700/80 px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Optional Photo Attachment */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Photo Evidence (Optional)
              </label>
              {photoPreview ? (
                <div className="relative rounded-lg overflow-hidden border border-slate-700 group">
                  <img src={photoPreview} alt="Evidence" className="w-full h-24 object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotoPreview(null)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-red-600 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <span className="absolute bottom-1 left-1.5 text-[9px] bg-black/60 px-1.5 py-0.5 rounded text-white font-mono">
                    Captured from Dashcam
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleSimulatePhoto}
                  className="w-full py-2.5 px-3 rounded-lg border border-dashed border-slate-700 bg-slate-900/60 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
                >
                  <Camera className="w-4 h-4 text-blue-400" />
                  <span>Attach Photo / Dashcam Frame</span>
                </button>
              )}
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-red-950/50 cursor-pointer text-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Alert</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
