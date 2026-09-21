import React, { useEffect } from 'react';
import type { CommunityWithCalculation, ReliefMission, CommodityType } from '../../types';
import { useTranslation } from '../../data/uiTranslations';
import {
  X,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Navigation,
  Truck,
  HeartPulse,
  Droplets,
  Wheat,
  Fuel,
  MapPin,
  ExternalLink,
  CheckCircle2,
  Building2,
  Layers,
  ArrowRight,
} from 'lucide-react';

export interface HazardZoneInfo {
  zone_id?: string;
  id?: string;
  name: string;
  source?: string;
  hazard_type?: string;
  corridor?: string;
  state?: string;
  district?: string;
  districts?: string[] | string;
  severity?: string;
  hazard_score?: number;
  slope_gradient?: string;
  lithology?: string;
  trigger_mechanism?: string;
  bhuvan_code?: string;
  advisory?: string;
  url?: string;
  fillColor?: string;
  updatedAt?: string;
}

interface DisasterPolygonModalProps {
  isOpen: boolean;
  onClose: () => void;
  community?: CommunityWithCalculation | null;
  hazardZone?: HazardZoneInfo | null;
  activeMission?: ReliefMission | null;
  onFocusMission?: (mission: ReliefMission) => void;
  onDispatchMission?: (missionId: string, vehicleId?: string) => void;
}

export const DisasterPolygonModal: React.FC<DisasterPolygonModalProps> = ({
  isOpen,
  onClose,
  community,
  hazardZone,
  activeMission,
  onFocusMission,
}) => {
  const { t } = useTranslation();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || (!community && !hazardZone)) return null;

  // --------------------------------------------------------------------------
  // CASE 1: HAZARD ZONE (ISRO Bhuvan LHZ / Geological Fault / Mudflow Sector)
  // --------------------------------------------------------------------------
  if (hazardZone && !community) {
    const isCritical =
      hazardZone.severity === 'Very High' ||
      hazardZone.severity === 'Critical' ||
      (hazardZone.hazard_score && hazardZone.hazard_score >= 9.0);

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-fadeIn"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hazard-modal-title"
      >
        <div
          className="bg-slate-900 border border-slate-700/90 rounded-lg w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-slate-100 text-xs animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div
                className={`p-2 rounded-md shrink-0 mt-0.5 ${
                  isCritical
                    ? 'bg-red-950/80 text-red-400 border border-red-800/60'
                    : 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                      isCritical
                        ? 'bg-red-950 text-red-300 border-red-700'
                        : 'bg-amber-950 text-amber-300 border-amber-700'
                    }`}
                  >
                    {hazardZone.severity || 'Critical Hazard'}
                  </span>
                  {hazardZone.hazard_score && (
                    <span className="font-mono text-[10px] text-slate-400 font-semibold">
                      Threat Score: <strong className="text-amber-300">{hazardZone.hazard_score}/10</strong>
                    </span>
                  )}
                </div>
                <h3 id="hazard-modal-title" className="text-base font-bold text-white mt-1">
                  {hazardZone.name}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>
                    {hazardZone.state || 'Northeast Corridor'}
                    {hazardZone.corridor ? ` • ${hazardZone.corridor}` : ''}
                  </span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3.5 max-h-[75vh] overflow-y-auto custom-scrollbar">
            {/* Scientific & Registry Grid */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  {t('bhuvanCode')}
                </span>
                <span className="font-mono font-semibold text-slate-200">
                  {hazardZone.bhuvan_code || hazardZone.zone_id || 'ISRO-BHUVAN-LHZ-NER'}
                </span>
              </div>

              <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  {t('slopeGradient')}
                </span>
                <span className="font-mono font-semibold text-amber-300">
                  {hazardZone.slope_gradient || '35° - 55° (Steep Silt Face)'}
                </span>
              </div>
            </div>

            {/* Live API Feed Provenance */}
            <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                  Authoritative Feed Source
                </span>
                <span className="font-mono text-xs font-semibold text-sky-400">
                  {hazardZone.source === 'GDACS_API'
                    ? 'GDACS Real-Time API (United Nations / EC)'
                    : hazardZone.source === 'OVERPASS_API'
                    ? 'OpenStreetMap Live Boundary API'
                    : hazardZone.source === 'SUPABASE_CLOUD'
                    ? 'Supabase Cloud Synced Zone'
                    : 'ISRO NRSC National LHZ Baseline'}
                </span>
              </div>
              {hazardZone.url && (
                <a
                  href={hazardZone.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-700/60 font-medium text-[11px] flex items-center gap-1.5 transition shrink-0"
                >
                  <span>Official Alert</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Geological Formation / Lithology */}
            {hazardZone.lithology && (
              <div className="p-3 rounded-md bg-slate-950/50 border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-sky-400" />
                  <span>{t('lithology')}</span>
                </span>
                <p className="text-[11px] text-slate-200 leading-relaxed font-sans">
                  {hazardZone.lithology}
                </p>
              </div>
            )}

            {/* Trigger Mechanism */}
            {hazardZone.trigger_mechanism && (
              <div className="p-3 rounded-md bg-slate-950/50 border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t('triggerMechanism')}</span>
                </span>
                <p className="text-[11px] text-slate-200 leading-relaxed font-sans">
                  {hazardZone.trigger_mechanism}
                </p>
              </div>
            )}

            {/* Tactical Advisory Banner */}
            <div className="p-3 rounded-md bg-amber-950/30 border border-amber-700/60 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-amber-300 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>{t('tacticalAdvisory')}</span>
              </span>
              <p className="text-xs text-amber-100 font-medium leading-relaxed">
                {hazardZone.advisory ||
                  'Strict convoy control during heavy precipitation. All supply convoys require escort verification.'}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-mono">
              Zone ID: {hazardZone.zone_id || hazardZone.id || 'LHZ-NER'}
            </span>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-sm bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs cursor-pointer transition"
            >
              {t('close')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // CASE 2: COMMUNITY DISASTER SECTOR (P1/P2/P3 Operational Sector & Inventory)
  // --------------------------------------------------------------------------
  if (!community) return null;

  const priority = community.metrics?.priorityTier || 'P3';
  const isP1 = priority === 'P1';
  const isP2 = priority === 'P2';

  const badgeStyle = isP1
    ? 'bg-red-500/20 text-red-400 border-red-500/50'
    : isP2
    ? 'bg-orange-500/20 text-orange-400 border-orange-500/50'
    : 'bg-amber-500/20 text-amber-300 border-amber-500/50';

  const priorityLabel = isP1
    ? 'P1 CRITICAL CUTOFF'
    : isP2
    ? 'P2 ELEVATED RISK'
    : 'P3 MODERATE MONITORING';

  // Commodity list
  const commodityKeys: CommodityType[] = ['IV_FLUIDS', 'ANTIVENOM', 'GRAIN_RICE', 'DIESEL'];

  const getCommodityIcon = (key: CommodityType) => {
    switch (key) {
      case 'IV_FLUIDS':
        return <Droplets className="w-3.5 h-3.5 text-sky-400" />;
      case 'ANTIVENOM':
        return <HeartPulse className="w-3.5 h-3.5 text-red-400" />;
      case 'GRAIN_RICE':
        return <Wheat className="w-3.5 h-3.5 text-amber-400" />;
      case 'DIESEL':
        return <Fuel className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  const getCommodityName = (key: CommodityType) => {
    switch (key) {
      case 'IV_FLUIDS':
        return 'IV Fluids / Saline';
      case 'ANTIVENOM':
        return 'Polyvalent Antivenom';
      case 'GRAIN_RICE':
        return 'Grain & Rice Buffer';
      case 'DIESEL':
        return 'Generator Diesel Fuel';
    }
  };

  const getCommodityUnit = (key: CommodityType) => {
    switch (key) {
      case 'IV_FLUIDS':
        return 'units';
      case 'ANTIVENOM':
        return 'vials';
      case 'GRAIN_RICE':
        return 'kg';
      case 'DIESEL':
        return 'liters';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="community-modal-title"
    >
      <div
        className="bg-slate-900 border border-slate-700/90 rounded-lg w-full max-w-xl shadow-2xl overflow-hidden flex flex-col text-slate-100 text-xs animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div
              className={`p-2 rounded-md shrink-0 mt-0.5 ${
                isP1
                  ? 'bg-red-950/80 text-red-400 border border-red-800/60'
                  : 'bg-orange-950/80 text-orange-400 border border-orange-800/60'
              }`}
            >
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${badgeStyle}`}>
                  {priorityLabel}
                </span>
                <span className="font-mono text-[10px] text-slate-400 font-semibold">
                  Triage Score: <strong className="text-white">{community.metrics?.finalScore ? Math.round(community.metrics.finalScore * 100) : 85}/100</strong>
                </span>
              </div>
              <h3 id="community-modal-title" className="text-base font-bold text-white mt-1">
                {community.name}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>
                  {community.district}, {community.state} • <strong>{community.population.toLocaleString()}</strong> residents
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Operational Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                {t('cutoffTime')}
              </span>
              <div className="flex items-baseline gap-1">
                <span className={`font-mono text-base font-bold ${community.cutoffTimeHours <= 4 ? 'text-red-400' : 'text-amber-300'}`}>
                  {community.cutoffTimeHours}h
                </span>
                <span className="text-[10px] text-slate-500">until cutoff</span>
              </div>
            </div>

            <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                {t('actionWindowCard')}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-base font-bold text-emerald-400">
                  {community.metrics?.actionableDispatchWindow?.toFixed(1) ||
                    Math.max(0, community.cutoffTimeHours - community.transitTimeHours).toFixed(1)}h
                </span>
                <span className="text-[10px] text-slate-500">dispatch window</span>
              </div>
            </div>

            <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800 col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Ingress Corridors
              </span>
              <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                <Navigation className="w-3.5 h-3.5 text-primary" />
                <span className={community.ingressRouteCount === 1 ? 'text-red-400 font-bold' : ''}>
                  {community.ingressRouteCount} {community.ingressRouteCount === 1 ? '(Single Bottleneck)' : 'Routes'}
                </span>
              </div>
            </div>
          </div>

          {/* Primary Corridor & Depot */}
          <div className="p-3 rounded-md bg-slate-950/50 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                {t('primaryIngressCorridor')}
              </span>
              <span className="font-semibold text-slate-200 block">
                {community.primaryCorridor}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                {t('nearestDepot')}
              </span>
              <span className="font-semibold text-slate-200 block">
                {community.nearestDepotName}
              </span>
            </div>
          </div>

          {/* Critical Supply Reserves (Preemptive Depletion Engine) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>{t('supplyReserves')}</span>
              </span>
              <span className="text-[10px] text-slate-400">
                Preemptive Burn Status
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {commodityKeys.map((k) => {
                const inv = community.inventories[k];
                const dep = community.metrics?.commodityDepletions?.[k];
                const lastStock = inv?.lastStock ?? 0;
                const burn = inv?.baselineDailyBurn ?? 1;
                const daysLeft = burn > 0 ? (lastStock / burn).toFixed(1) : '9.9';
                const daysNum = parseFloat(daysLeft);

                const isCritical = daysNum <= 1.5;
                const isWarning = daysNum > 1.5 && daysNum <= 3.0;

                return (
                  <div
                    key={k}
                    className="p-2.5 rounded bg-slate-950/80 border border-slate-800/90 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-200 text-xs">
                        {getCommodityIcon(k)}
                        <span>{getCommodityName(k)}</span>
                      </div>
                      <span
                        className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isCritical
                            ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                            : isWarning
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {daysLeft}d {t('daysSupply')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                      <span>
                        Stock: <strong className="text-white">{lastStock} {getCommodityUnit(k)}</strong>
                      </span>
                      <span>
                        Burn: <strong className="text-slate-300">{burn} {getCommodityUnit(k)}/day</strong>
                      </span>
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          isCritical
                            ? 'bg-red-500'
                            : isWarning
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{
                          width: `${Math.min(100, Math.max(10, (lastStock / (inv?.standardCapacity || 1000)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Assigned Relief Mission */}
          <div className="p-3 rounded-md bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-primary" />
                <span>{t('activeMissionAssigned')}</span>
              </span>
              {activeMission && (
                <span className="font-mono font-bold text-xs text-primary">
                  {activeMission.id}
                </span>
              )}
            </div>

            {activeMission ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Assigned Vehicle:</span>
                  <span className="font-semibold text-emerald-400">
                    {activeMission.recommendedVehicleType}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Mission Status:</span>
                  <span className="font-mono uppercase font-bold text-amber-300">
                    {activeMission.status.replace(/_/g, ' ')}
                  </span>
                </div>

                {onFocusMission && (
                  <button
                    onClick={() => {
                      onFocusMission(activeMission);
                      onClose();
                    }}
                    className="w-full mt-1.5 py-1.5 px-3 rounded bg-primary hover:bg-primary-hover text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition shadow-xs"
                  >
                    <span>{t('focusMissionConvoy')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="text-[11px] text-slate-400 py-1 flex items-center justify-between">
                <span>{t('noActiveMission')}</span>
                <span className="text-[10px] text-amber-400 font-medium">Standby</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[10px] text-slate-500 font-mono">
            ID: {community.id}
          </span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-sm bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs cursor-pointer transition"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
};
