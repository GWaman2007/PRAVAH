import React from 'react';
import { 
  Users, 
  Radio, 
  MessageSquare, 
  PhoneCall, 
  Bell, 
  ShieldCheck, 
  Truck, 
  Building2, 
  HardHat, 
  Sliders, 
  CheckSquare, 
  Square,
  AlertCircle,
  WifiOff
} from 'lucide-react';

export default function AudienceAndChannels({
  activeIncident,
  targetGroups,
  onToggleTargetGroup,
  geofenceRadius,
  onChangeGeofenceRadius,
  channels,
  onToggleChannel,
  totalAudienceCount
}) {
  // Calculated audience based on geofence
  const calculatedDrivers = Math.round(geofenceRadius * 2.84);
  const calculatedFuelTankers = Math.round(geofenceRadius * 0.65);
  const calculatedAdmins = activeIncident.targetAudience?.districtAdmins || 8;
  const calculatedBroUnits = activeIncident.targetAudience?.qrtBroUnits || 14;

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <span>3. Channel & Audience Targeting Matrix</span>
            </h2>
            <p className="text-xs text-slate-400">
              Select recipient groups, geofence radius, and transmission gateways
            </p>
          </div>
        </div>

        <div className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-700 text-right">
          <div className="text-[10px] text-slate-400 uppercase font-mono">Total Reach</div>
          <div className="text-sm font-mono font-bold text-emerald-400">
            {totalAudienceCount} Endpoints
          </div>
        </div>
      </div>

      {/* Target Group Filters */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300 block">
          Target Audience Groups:
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Commercial Freight & Tanker Drivers */}
          <div
            onClick={() => onToggleTargetGroup('commercialDrivers')}
            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
              targetGroups.commercialDrivers
                ? 'bg-emerald-950/40 border-emerald-500/60 shadow-md shadow-emerald-950/40 ring-1 ring-emerald-500/30'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-850'
            }`}
          >
            <div className="mt-0.5 text-emerald-400">
              {targetGroups.commercialDrivers ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-600" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-emerald-400" />
                  Freight Drivers
                </span>
                <span className="text-xs font-mono font-bold text-emerald-300">
                  {calculatedDrivers}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Heavy convoys & {calculatedFuelTankers} tankers within {geofenceRadius} km
              </p>
            </div>
          </div>

          {/* District Magistrates & SDMA Officials */}
          <div
            onClick={() => onToggleTargetGroup('districtAdmins')}
            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
              targetGroups.districtAdmins
                ? 'bg-purple-950/40 border-purple-500/60 shadow-md shadow-purple-950/40 ring-1 ring-purple-500/30'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-850'
            }`}
          >
            <div className="mt-0.5 text-purple-400">
              {targetGroups.districtAdmins ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-600" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-purple-400" />
                  DMs & SDMA
                </span>
                <span className="text-xs font-mono font-bold text-purple-300">
                  {calculatedAdmins}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Civil administration & emergency disaster cells
              </p>
            </div>
          </div>

          {/* BRO & PWD Quick Response Teams */}
          <div
            onClick={() => onToggleTargetGroup('broQrt')}
            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
              targetGroups.broQrt
                ? 'bg-amber-950/40 border-amber-500/60 shadow-md shadow-amber-950/40 ring-1 ring-amber-500/30'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-850'
            }`}
          >
            <div className="mt-0.5 text-amber-400">
              {targetGroups.broQrt ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-600" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <HardHat className="w-3.5 h-3.5 text-amber-400" />
                  BRO & PWD QRT
                </span>
                <span className="text-xs font-mono font-bold text-amber-300">
                  {calculatedBroUnits}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Highway clearance & recovery machinery teams
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Geofence Slider */}
      <div className="px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-slate-300 flex items-center gap-1.5 font-medium">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            Geofenced Alert Perimeter:
          </span>
          <span className="font-mono text-cyan-300 font-bold">
            {geofenceRadius} km radius ({Math.round(geofenceRadius * 3.14 * 2)} km² coverage)
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-500 font-mono">10 km</span>
          <input
            type="range"
            min="10"
            max="100"
            step="5"
            value={geofenceRadius}
            onChange={(e) => onChangeGeofenceRadius(parseInt(e.target.value))}
            className="flex-1 accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <span className="text-[10px] text-slate-500 font-mono">100 km</span>
        </div>
      </div>

      {/* Dispatch Channels Matrix */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300">
            Multi-Channel Dispatch Gateways:
          </label>
          <span className="text-[11px] text-slate-400">
            Simultaneous multi-protocol broadcast
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Channel 1: High Priority SMS */}
          <div
            onClick={() => onToggleChannel('sms')}
            className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
              channels.sms
                ? 'bg-blue-950/40 border-blue-500/60 shadow-md shadow-blue-950/40 ring-1 ring-blue-500/30'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-850'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                <Radio className="w-4 h-4" />
              </span>
              {channels.sms ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">ACTIVE</span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 font-mono">OFF</span>
              )}
            </div>
            <div>
              <div className="text-xs font-bold text-white">Priority SMS (GSM)</div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                2G fallback & dead-zone hill buffer
              </p>
            </div>
          </div>

          {/* Channel 2: WhatsApp Business API */}
          <div
            onClick={() => onToggleChannel('whatsapp')}
            className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
              channels.whatsapp
                ? 'bg-emerald-950/40 border-emerald-500/60 shadow-md shadow-emerald-950/40 ring-1 ring-emerald-500/30'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-850'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                <MessageSquare className="w-4 h-4" />
              </span>
              {channels.whatsapp ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">ACTIVE</span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 font-mono">OFF</span>
              )}
            </div>
            <div>
              <div className="text-xs font-bold text-white">WhatsApp Rich Cards</div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Interactive cards with detour maps
              </p>
            </div>
          </div>

          {/* Channel 3: Driver Cabin Audio */}
          <div
            onClick={() => onToggleChannel('audioVoice')}
            className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
              channels.audioVoice
                ? 'bg-amber-950/40 border-amber-500/60 shadow-md shadow-amber-950/40 ring-1 ring-amber-500/30'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-850'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                <PhoneCall className="w-4 h-4" />
              </span>
              {channels.audioVoice ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">ACTIVE</span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 font-mono">OFF</span>
              )}
            </div>
            <div>
              <div className="text-xs font-bold text-white">Cabin Voice Prompt</div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                In-app TTS audio playback
              </p>
            </div>
          </div>

          {/* Channel 4: Siren & Push Notification */}
          <div
            onClick={() => onToggleChannel('pushSiren')}
            className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
              channels.pushSiren
                ? 'bg-red-950/40 border-red-500/60 shadow-md shadow-red-950/40 ring-1 ring-red-500/30'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-850'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="p-1.5 rounded-lg bg-red-500/20 text-red-400">
                <Bell className="w-4 h-4" />
              </span>
              {channels.pushSiren ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-mono">ACTIVE</span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 font-mono">OFF</span>
              )}
            </div>
            <div>
              <div className="text-xs font-bold text-white">Emergency Push / Siren</div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                High-priority cabin alarm sound
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
