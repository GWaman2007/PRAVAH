import React, { useState } from 'react';
import {
  Layers,
  ChevronDown,
  ChevronUp,
  Info,
  X,
  Radio,
  AlertTriangle,
  Building2,
  MapPin,
  Truck,
  ShieldAlert,
} from 'lucide-react';
import { useTranslation } from '../../data/uiTranslations';
import { DESTINATION_PIN_DATA_URL } from '../../assets/destinationPinBase64';

export const MapLegend: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'FLEET' | 'ROADS' | 'SECTORS'>('ALL');
  const { t } = useTranslation();

  return (
    <div className="absolute bottom-3 sm:bottom-4 left-2 sm:left-4 z-30 select-none max-w-[calc(100vw-16px)]">
      {/* Expanded Legend Drawer - Opens UPWARDS above the toggle button */}
      {isOpen && (
        <div className="mb-2 w-[calc(100vw-24px)] sm:w-96 max-h-[min(560px,calc(100vh-190px))] overflow-y-auto custom-scrollbar bg-slate-900/98 dark:bg-slate-950/98 text-slate-200 backdrop-blur-xl border border-slate-700/80 rounded-lg shadow-2xl p-3 sm:p-3.5 space-y-3 text-xs animate-in fade-in slide-in-from-bottom-2 duration-150 ring-1 ring-blue-500/20">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="p-1 rounded bg-blue-500/20 text-sky-400">
                <Info className="w-3.5 h-3.5" />
              </span>
              <div>
                <span className="font-bold uppercase tracking-wider text-[11px] text-white block leading-tight">
                  {t('mapSymbologyGuide')}
                </span>
                <span className="text-[10px] text-slate-400 block leading-tight">
                  PRAVAH Tactical GIS Symbology
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close legend"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded border border-slate-800 text-[10px]">
            {(
              [
                { id: 'ALL', label: 'All Symbols' },
                { id: 'FLEET', label: 'Fleet & Hubs' },
                { id: 'ROADS', label: 'Road Status' },
                { id: 'SECTORS', label: 'Hazard Sectors' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-1 rounded font-medium transition cursor-pointer text-center truncate ${
                  activeTab === tab.id
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* SECTION 1: Strategic Logistics Hubs & Mission Targets */}
          {(activeTab === 'ALL' || activeTab === 'FLEET') && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1">
                <Building2 className="w-3 h-3 text-sky-400" />
                <span>Logistics Nodes &amp; Targets</span>
              </span>
              <div className="bg-slate-950/50 rounded p-2 border border-slate-800/80 space-y-2">
                {/* 1. Warehouse */}
                <div className="flex items-start gap-2.5">
                  <div className="shrink-0 mt-0.5">
                    <svg className="w-5 h-5 shadow-xs" viewBox="0 0 44 44">
                      <rect x="3" y="3" width="38" height="38" rx="8" fill="#0284C7" stroke="#FFFFFF" strokeWidth="2.5" />
                      <path d="M11 20l11-8 11 8v12h-7v-7h-8v7h-7V20z" fill="#FFFFFF" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-semibold text-white block text-[11px]">
                      Strategic Warehouse / Logistics Hub
                    </span>
                    <span className="text-slate-400 block text-[10px] leading-relaxed">
                      Pre-positioned relief stockpiles, fuel reserves &amp; dispatch center (e.g. Silchar Strategic Depot, Kohima Capital Command).
                    </span>
                  </div>
                </div>

                {/* 2. Destination Pin */}
                <div className="flex items-start gap-2.5 pt-1.5 border-t border-slate-800/60">
                  <div className="shrink-0 flex items-center justify-center w-5 h-6">
                    <img
                      src={DESTINATION_PIN_DATA_URL}
                      alt="Mission Target Pin"
                      className="w-5 h-6 object-contain drop-shadow-sm"
                    />
                  </div>
                  <div>
                    <span className="font-semibold text-amber-300 block text-[11px] flex items-center gap-1">
                      <span>🚩 TARGET: Relief Delivery Endpoint</span>
                    </span>
                    <span className="text-slate-400 block text-[10px] leading-relaxed">
                      Active mission delivery endpoint &amp; road termination coordinate (e.g. Kolasib East, Zubza Choke Relief Terminal).
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: Tactical Fleet Vehicles & Convoys */}
          {(activeTab === 'ALL' || activeTab === 'FLEET') && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1">
                <Truck className="w-3 h-3 text-sky-400" />
                <span>Fleet Vehicles &amp; Status</span>
              </span>
              <div className="bg-slate-950/50 rounded p-2 border border-slate-800/80 space-y-2">
                {/* Vehicle SVG Gallery */}
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  {/* Truck */}
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                      <circle cx="24" cy="24" r="21" fill="#1B4B73" stroke="#FFFFFF" strokeWidth="3" />
                      <path d="M14 29V19h14v10m-14 0h20v-6l-4-4h-3" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="18" cy="29" r="2.8" fill="#FFFFFF" />
                      <circle cx="30" cy="29" r="2.8" fill="#FFFFFF" />
                    </svg>
                    <span className="text-slate-200 truncate">General Relief Truck</span>
                  </div>

                  {/* Ambulance */}
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                      <circle cx="24" cy="24" r="21" fill="#DC2626" stroke="#FFFFFF" strokeWidth="3" />
                      <rect x="21" y="13" width="6" height="22" fill="#FFFFFF" rx="1.5" />
                      <rect x="13" y="21" width="22" height="6" fill="#FFFFFF" rx="1.5" />
                    </svg>
                    <span className="text-slate-200 truncate">4x4 Medical Rig</span>
                  </div>

                  {/* Engineering */}
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                      <circle cx="24" cy="24" r="21" fill="#B45309" stroke="#FFFFFF" strokeWidth="3" />
                      <path d="M14 29h20M16 29l2-8h8l3 8m-9-8V13l6-2" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="19" cy="29" r="2.8" fill="#FFFFFF" />
                      <circle cx="29" cy="29" r="2.8" fill="#FFFFFF" />
                    </svg>
                    <span className="text-slate-200 truncate">BRO Engineering</span>
                  </div>

                  {/* Heavy Cargo */}
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                      <circle cx="24" cy="24" r="21" fill="#334155" stroke="#FFFFFF" strokeWidth="3" />
                      <rect x="11" y="17" width="16" height="12" fill="none" stroke="#FFFFFF" strokeWidth="2.2" rx="1" />
                      <path d="M27 20h6l4 4v5h-10v-9z" fill="none" stroke="#FFFFFF" strokeWidth="2.2" />
                      <circle cx="16" cy="29" r="2.5" fill="#FFFFFF" />
                      <circle cx="23" cy="29" r="2.5" fill="#FFFFFF" />
                      <circle cx="33" cy="29" r="2.5" fill="#FFFFFF" />
                    </svg>
                    <span className="text-slate-200 truncate">Heavy Flatbed</span>
                  </div>

                  {/* Tanker */}
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                      <circle cx="24" cy="24" r="21" fill="#0284C7" stroke="#FFFFFF" strokeWidth="3" />
                      <rect x="12" y="18" width="16" height="10" rx="5" fill="none" stroke="#FFFFFF" strokeWidth="2.5" />
                      <path d="M28 21h5l3 3v4h-8v-7z" fill="none" stroke="#FFFFFF" strokeWidth="2.2" />
                      <circle cx="17" cy="28" r="2.5" fill="#FFFFFF" />
                      <circle cx="23" cy="28" r="2.5" fill="#FFFFFF" />
                      <circle cx="32" cy="28" r="2.5" fill="#FFFFFF" />
                    </svg>
                    <span className="text-slate-200 truncate">Fuel/Water Tanker</span>
                  </div>

                  {/* Mobile Command */}
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                      <circle cx="24" cy="24" r="21" fill="#4338CA" stroke="#FFFFFF" strokeWidth="3" />
                      <circle cx="24" cy="24" r="5" fill="#FFFFFF" />
                      <path d="M16 24a8 8 0 0 1 16 0M11 24a13 13 0 0 1 26 0" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                    <span className="text-slate-200 truncate">Command &amp; Comms</span>
                  </div>
                </div>

                {/* Status States */}
                <div className="pt-2 border-t border-slate-800/60 space-y-1.5 text-[10px]">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border border-sky-400 bg-sky-400/20 flex items-center justify-center shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                    </div>
                    <span className="text-slate-300">
                      <strong className="text-sky-300">Selected Vehicle Ring:</strong> Cyan focus halo around active inspected vehicle.
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border border-red-500 bg-red-500/30 animate-pulse flex items-center justify-center shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    </div>
                    <span className="text-slate-300">
                      <strong className="text-red-400">Emergency SOS / Beacon:</strong> Red pulsing halo on rollover / engine breakdown.
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border border-amber-500 bg-amber-500/20 flex items-center justify-center shrink-0">
                      <Radio className="w-2.5 h-2.5 text-amber-400" />
                    </div>
                    <span className="text-slate-300">
                      <strong className="text-amber-300">Dead-Reckoning:</strong> Kinematic trajectory extrapolation in cellular blackout dead-zone.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: Road Infrastructure & Corridors */}
          {(activeTab === 'ALL' || activeTab === 'ROADS') && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3 h-3 text-sky-400" />
                <span>Road Network Status &amp; Routes</span>
              </span>
              <div className="bg-slate-950/50 rounded p-2 border border-slate-800/80 space-y-2 text-[10px]">
                {/* Active Selected Mission Route */}
                <div className="flex items-center gap-2.5">
                  <div className="w-6 flex items-center justify-center shrink-0">
                    <div className="w-6 h-1.5 rounded-full bg-[#2563EB] shadow-sm border border-slate-900" />
                  </div>
                  <div>
                    <span className="font-semibold text-white">Active Selected Mission Corridor</span>
                    <span className="text-slate-400 block text-[9.5px]">Highlighted route connecting depot to community</span>
                  </div>
                </div>

                {/* Open Highway */}
                <div className="flex items-center gap-2.5">
                  <div className="w-6 flex items-center justify-center shrink-0">
                    <div className="w-6 h-1 rounded-full bg-[#10B981]" />
                  </div>
                  <div>
                    <span className="font-medium text-emerald-400">Open / Clearance-Verified Highway</span>
                    <span className="text-slate-400 block text-[9.5px]">Clear transit with normal axle allowances</span>
                  </div>
                </div>

                {/* Degraded Corridor */}
                <div className="flex items-center gap-2.5">
                  <div className="w-6 flex items-center justify-center shrink-0">
                    <div className="w-6 h-1 rounded-full bg-[#F59E0B]" />
                  </div>
                  <div>
                    <span className="font-medium text-amber-400">Degraded / Cautionary Pass</span>
                    <span className="text-slate-400 block text-[9.5px]">Single-lane passable, monsoon soil saturation alert</span>
                  </div>
                </div>

                {/* Total Blockage */}
                <div className="flex items-center gap-2.5">
                  <div className="w-6 flex items-center justify-center shrink-0">
                    <div className="w-6 h-1 border-b-2 border-dashed border-red-500" />
                  </div>
                  <div>
                    <span className="font-medium text-red-400">Total Blockage / Impassable Cutoff</span>
                    <span className="text-slate-400 block text-[9.5px]">Landslide debris or bridge breach; mandatory reroute</span>
                  </div>
                </div>

                {/* Road Breakdown Point */}
                <div className="flex items-center gap-2.5 pt-1 border-t border-slate-800/60">
                  <div className="w-6 flex items-center justify-center shrink-0">
                    <div className="w-3.5 h-3.5 rounded-full bg-red-600 border-2 border-white shadow-xs animate-ping" />
                  </div>
                  <div>
                    <span className="font-medium text-red-400">Active Road Breakdown / Obstacle</span>
                    <span className="text-slate-400 block text-[9.5px]">Click for estimated clearance hours &amp; affected missions</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: Community Priority Tiers & Hazard Sectors */}
          {(activeTab === 'ALL' || activeTab === 'SECTORS') && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-sky-400" />
                <span>Communities &amp; Hazard Zonation</span>
              </span>
              <div className="bg-slate-950/50 rounded p-2 border border-slate-800/80 space-y-2 text-[10px]">
                {/* P1 Community */}
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-3.5 rounded-xs bg-red-600/35 border border-dashed border-red-500 shrink-0 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  </div>
                  <div>
                    <span className="font-semibold text-red-400">P1 Critical Isolated Sector</span>
                    <span className="text-slate-400 block text-[9.5px]">Zero open corridors; emergency air/expedited dispatch required</span>
                  </div>
                </div>

                {/* P2 Community */}
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-3.5 rounded-xs bg-amber-500/30 border border-dashed border-amber-500 shrink-0 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  </div>
                  <div>
                    <span className="font-semibold text-amber-400">P2 High Risk Sector</span>
                    <span className="text-slate-400 block text-[9.5px]">Single mountain access corridor threatened by rainfall/mudflow</span>
                  </div>
                </div>

                {/* P3 Community */}
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-3.5 rounded-xs bg-emerald-500/25 border border-dashed border-emerald-500 shrink-0 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  </div>
                  <div>
                    <span className="font-semibold text-emerald-400">P3 Monitored Sector</span>
                    <span className="text-slate-400 block text-[9.5px]">Multiple redundant supply corridors intact</span>
                  </div>
                </div>

                {/* Interactive Disaster Polygon */}
                <div className="flex items-start gap-2.5 pt-1.5 border-t border-slate-800/60">
                  <div className="w-5 h-3.5 rounded-xs bg-red-700/40 border border-dashed border-red-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-yellow-300 block flex items-center gap-1">
                      <span>⚠️ ISRO Bhuvan LHZ / Disaster Polygon</span>
                    </span>
                    <span className="text-slate-400 block text-[9.5px] leading-relaxed">
                      High-risk geological zones (e.g. Sinking Zones, Mudflows). <em>Hover for preview, click for sector clearance modal.</em>
                    </span>
                  </div>
                </div>

                {/* Cellular Blackout Zone */}
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-3.5 rounded-xs bg-slate-700/50 border border-dashed border-slate-400 shrink-0" />
                  <div>
                    <span className="font-medium text-slate-300">Cellular Blackout Zone</span>
                    <span className="text-slate-400 block text-[9.5px]">RF shadow dead-zone; convoys extrapolate position</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toggle Pill Button - Anchored right at the bottom */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900/95 hover:bg-slate-800 text-white border border-slate-700/90 backdrop-blur-md text-xs font-semibold shadow-xl transition-all cursor-pointer ring-1 ring-blue-500/30 hover:ring-blue-500/60 active:scale-95"
        title="Toggle Tactical GIS Map Symbology Guide"
      >
        <Layers className="w-3.5 h-3.5 text-sky-400 shrink-0" />
        <span>{t('tacticalLegend')}</span>
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 text-slate-300 shrink-0" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 text-slate-300 shrink-0" />
        )}
      </button>
    </div>
  );
};
