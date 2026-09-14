import React, { useState } from 'react';
import { 
  AlertTriangle, 
  MapPin, 
  Clock, 
  Navigation, 
  ShieldAlert, 
  PlusCircle, 
  Sliders, 
  Check, 
  X,
  Truck,
  Activity,
  Layers
} from 'lucide-react';
import { PRESET_INCIDENTS, DISRUPTION_TYPES, SEVERITY_LEVELS, NER_HIGHWAYS } from '../data/incidents';

export default function IncidentSelector({ 
  activeIncident, 
  onSelectIncident, 
  customIncident, 
  onSaveCustomIncident 
}) {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customForm, setCustomForm] = useState(customIncident || {
    id: 'inc-custom',
    title: 'Custom Incident 4: Custom Highway Disruption',
    shortTitle: 'Custom Disruption',
    highway: 'NH-06',
    corridor: 'Shillong - Jowai - Badarpur - Silchar',
    state: 'Meghalaya / Assam Border',
    district: 'East Jaintia Hills (Sonapur Tunnel)',
    disruptionType: 'Road Collapse / Mudslide',
    severity: 'CRITICAL',
    severityColor: 'red',
    stretch: 'Sonapur Tunnel sector (Km 92)',
    detourRoute: 'Bypass via Umkiang - Badarpurghat',
    estimatedDelay: '5 Hours',
    delayHours: 5,
    geofenceRadiusKm: 55,
    helpline: '112 / 1070 (State Emergency Ops)',
    targetAudience: {
      commercialDrivers: 165,
      districtAdmins: 7,
      qrtBroUnits: 15,
      fuelTankers: 38,
    }
  });

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    const updated = {
      ...customForm,
      id: 'inc-custom-' + Date.now(),
      title: `Incident 4 (Custom): ${customForm.disruptionType} on ${customForm.highway}`,
      shortTitle: `${customForm.highway} ${customForm.disruptionType.split(' ')[0]}`,
      estimatedDelay: `${customForm.delayHours} Hours`,
      targetAudience: {
        commercialDrivers: Math.round(customForm.geofenceRadiusKm * 3.2),
        districtAdmins: Math.max(4, Math.round(customForm.geofenceRadiusKm / 8)),
        qrtBroUnits: Math.max(6, Math.round(customForm.geofenceRadiusKm / 4)),
        fuelTankers: Math.round(customForm.geofenceRadiusKm * 0.7),
      }
    };
    onSaveCustomIncident(updated);
    onSelectIncident(updated);
    setShowCustomModal(false);
  };

  const isCustomActive = activeIncident.id.startsWith('inc-custom');

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-xl">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <span>1. Incident Trigger Selector</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono border border-slate-700">
                NER Network
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Select an active highway emergency or configure a custom operational alert
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCustomModal(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
            isCustomActive
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-lg shadow-amber-500/20'
              : 'bg-slate-900/90 text-amber-300 border-amber-500/30 hover:bg-amber-500/10'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>{isCustomActive ? 'Custom Incident Active' : '+ Custom Incident Creator'}</span>
        </button>
      </div>

      {/* Preset Incident Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {PRESET_INCIDENTS.map((inc, index) => {
          const isSelected = activeIncident.id === inc.id;
          const isCritical = inc.severity === 'CRITICAL';

          return (
            <div
              key={inc.id}
              onClick={() => onSelectIncident(inc)}
              className={`group relative p-3.5 rounded-xl cursor-pointer transition-all duration-200 border text-left ${
                isSelected
                  ? isCritical
                    ? 'bg-red-950/40 border-red-500/80 shadow-lg shadow-red-950/50 ring-1 ring-red-500/50'
                    : 'bg-amber-950/40 border-amber-500/80 shadow-lg shadow-amber-950/50 ring-1 ring-amber-500/50'
                  : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
              }`}
            >
              {/* Card Header & Badges */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                    {inc.highway}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                    isCritical 
                      ? 'bg-red-500/20 text-red-300 border-red-500/30' 
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                    {inc.severity}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  #{index + 1}
                </span>
              </div>

              {/* Title & Disruption */}
              <h3 className="text-xs sm:text-sm font-semibold text-white group-hover:text-amber-200 transition-colors line-clamp-2 mb-1.5">
                {inc.title.replace(`Incident ${index + 1}: `, '')}
              </h3>

              {/* Stretch / Location */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">{inc.district}</span>
              </div>

              {/* Detour & Delay footer */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1 text-slate-300">
                  <Navigation className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span className="truncate max-w-[130px]" title={inc.detourRoute}>
                    {inc.detourRoute.split('via')[1] || inc.detourRoute}
                  </span>
                </div>
                <div className="flex items-center gap-1 font-mono text-amber-400 shrink-0">
                  <Clock className="w-3 h-3" />
                  <span>+{inc.delayHours}h</span>
                </div>
              </div>

              {/* Selected Pill Indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-slate-950 shadow-md">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Active Incident Details Banner */}
      <div className="mt-3.5 px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-slate-400">Active Incident:</span>
          <span className="font-semibold text-white">
            {activeIncident.title}
          </span>
        </div>
        <div className="flex items-center gap-4 text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Recommended Detour:</span>
            <span className="font-mono text-cyan-300 font-medium">
              {activeIncident.detourRoute}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Delay:</span>
            <span className="font-mono text-amber-400 font-bold">
              {activeIncident.estimatedDelay}
            </span>
          </div>
        </div>
      </div>

      {/* Custom Incident Creator Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Incident 4: Custom Incident Creator</h3>
                  <p className="text-xs text-slate-400">Configure road obstruction, detour, and severity in the NER network</p>
                </div>
              </div>
              <button
                onClick={() => setShowCustomModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Custom Form */}
            <form onSubmit={handleCustomSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Highway Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Target Highway Corridor
                  </label>
                  <select
                    value={customForm.highway}
                    onChange={(e) => {
                      const hw = NER_HIGHWAYS.find(h => h.code === e.target.value);
                      setCustomForm(prev => ({
                        ...prev,
                        highway: e.target.value,
                        corridor: hw ? hw.name : prev.corridor,
                        state: hw ? hw.state : prev.state
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-amber-400 focus:outline-none"
                  >
                    {NER_HIGHWAYS.map(h => (
                      <option key={h.code} value={h.code}>{h.name}</option>
                    ))}
                  </select>
                </div>

                {/* Disruption Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Disruption Type
                  </label>
                  <select
                    value={customForm.disruptionType}
                    onChange={(e) => setCustomForm(prev => ({ ...prev, disruptionType: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-amber-400 focus:outline-none"
                  >
                    {DISRUPTION_TYPES.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Severity Level */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Alert Severity
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {SEVERITY_LEVELS.map(s => (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => setCustomForm(prev => ({ ...prev, severity: s.id, severityColor: s.color }))}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                          customForm.severity === s.id
                            ? `${s.badgeBg} ring-1 ring-amber-400/50`
                            : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {s.label.split('/')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Estimated Delay */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Estimated Delay (Hours)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="1"
                      max="12"
                      value={customForm.delayHours}
                      onChange={(e) => setCustomForm(prev => ({ ...prev, delayHours: parseInt(e.target.value) }))}
                      className="flex-1 accent-amber-400"
                    />
                    <span className="font-mono text-amber-400 font-bold text-sm min-w-[50px]">
                      {customForm.delayHours} hrs
                    </span>
                  </div>
                </div>
              </div>

              {/* Affected Stretch / District */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Affected Geographic Stretch & District
                </label>
                <input
                  type="text"
                  value={customForm.district}
                  onChange={(e) => setCustomForm(prev => ({ ...prev, district: e.target.value, stretch: e.target.value }))}
                  placeholder="e.g. Sonapur Tunnel sector (Km 92) / East Jaintia Hills"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-amber-400 focus:outline-none"
                  required
                />
              </div>

              {/* Recommended Detour */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Recommended Detour / Diversion Route
                </label>
                <input
                  type="text"
                  value={customForm.detourRoute}
                  onChange={(e) => setCustomForm(prev => ({ ...prev, detourRoute: e.target.value }))}
                  placeholder="e.g. Bypass via Umkiang - Badarpurghat or NH-02"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-amber-400 focus:outline-none"
                  required
                />
              </div>

              {/* Geofence Buffer */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Geofenced Vehicle Broadcast Radius
                  </label>
                  <span className="text-xs font-mono text-cyan-300">
                    {customForm.geofenceRadiusKm} km (~{Math.round(customForm.geofenceRadiusKm * 3.2)} commercial vehicles)
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={customForm.geofenceRadiusKm}
                  onChange={(e) => setCustomForm(prev => ({ ...prev, geofenceRadiusKm: parseInt(e.target.value) }))}
                  className="w-full accent-cyan-400"
                />
              </div>

              {/* Helpline */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Emergency Helpline / Control Room Number
                </label>
                <input
                  type="text"
                  value={customForm.helpline}
                  onChange={(e) => setCustomForm(prev => ({ ...prev, helpline: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:ring-1 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Deploy Custom Incident Alert</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
