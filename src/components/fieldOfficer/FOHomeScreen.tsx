/**
 * PRAVAH Field Officer — Home Screen
 * Compact mobile dashboard: community status, active mission, resource situation, recent reports.
 */
import React from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import type { QuickReportTab } from './QuickFieldReportModal';
import {
  MapPin,
  Truck,
  Package,
  AlertTriangle,
  ChevronRight,
  ShieldAlert,
  Droplets,
  Heart,
  Activity,
  Clock,
  Camera,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';

interface FOHomeScreenProps {
  onNavigateToMap: () => void;
  onOpenAction: (tab: QuickReportTab) => void;
}

const formatTimeAgo = (ts: string): string => {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export const FOHomeScreen: React.FC<FOHomeScreenProps> = ({ onNavigateToMap, onOpenAction }) => {
  const {
    userContext,
    communities,
    activeMissions,
    incidents,
    activeDisruptions,
    reportMissionDeliveryByField,
  } = usePravahStore();

  const community = communities.find(c => c.id === userContext.communityId) || communities[0];
  const communityMissions = activeMissions.filter(m => m.communityId === community?.id);
  const activeMission = communityMissions.find(
    m => m.status === 'IN_TRANSIT' || m.status === 'APPROVED' || m.status === 'SUGGESTED'
  ) || communityMissions[0];

  const hasDisruption = Object.values(activeDisruptions).some(
    d => d.status === 'TOTAL_BLOCKAGE'
  );
  const hasRestriction = Object.values(activeDisruptions).some(
    d => d.status === 'SINGLE_LANE_PASSABLE'
  );

  const recentIncidents = incidents.slice(0, 3);

  // Resource depletion summary from community metrics
  const depletions = community?.metrics?.commodityDepletions;
  const resourceCards = depletions ? [
    { label: 'Food Kits', icon: Package, current: Math.round(depletions.GRAIN_RICE?.currentStock || 0), total: Math.round(depletions.GRAIN_RICE?.lastStock || 100), color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Water', icon: Droplets, current: Math.round(depletions.DIESEL?.currentStock || 0), total: Math.round(depletions.DIESEL?.lastStock || 50), color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Medical', icon: Heart, current: Math.round(depletions.IV_FLUIDS?.currentStock || 0), total: Math.round(depletions.IV_FLUIDS?.lastStock || 20), color: 'text-rose-400', bg: 'bg-rose-500/10' },
  ] : [];

  const accessibilityStatus = hasDisruption ? 'Blocked' : hasRestriction ? 'Restricted' : 'Clear';
  const accessibilityColor = hasDisruption ? 'text-red-400 bg-red-500/10 border-red-500/30' : hasRestriction ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';

  const situationLabel = community?.metrics?.priorityTier === 'P1' ? 'Critical Emergency' : community?.metrics?.priorityTier === 'P2' ? 'Elevated Risk' : 'Moderate';
  const situationColor = community?.metrics?.priorityTier === 'P1' ? 'text-red-400' : community?.metrics?.priorityTier === 'P2' ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div className="fo-screen-content px-4 pt-4 pb-4 space-y-4">
      {/* ─── COMMUNITY STATUS CARD ─── */}
      <div className="fo-card p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Community</span>
              <h2 className="text-sm font-bold text-white leading-tight">{community?.name || 'Assigned Community'}</h2>
            </div>
          </div>
          <button onClick={onNavigateToMap} className="text-[10px] text-blue-400 font-semibold flex items-center gap-0.5 cursor-pointer hover:text-blue-300">
            View Map <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="fo-stat-chip">
            <span className="text-[10px] text-slate-400">Priority</span>
            <span className={`text-sm font-bold font-mono ${community?.metrics?.priorityTier === 'P1' ? 'text-red-400' : 'text-amber-400'}`}>
              {community?.metrics?.priorityTier || 'P3'}
            </span>
          </div>
          <div className="fo-stat-chip">
            <span className="text-[10px] text-slate-400">Situation</span>
            <span className={`text-[11px] font-bold ${situationColor}`}>{situationLabel}</span>
          </div>
          <div className="fo-stat-chip">
            <span className="text-[10px] text-slate-400">Access</span>
            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full border ${accessibilityColor}`}>{accessibilityStatus}</span>
          </div>
        </div>
      </div>

      {/* ─── ACTIVE MISSION CARD ─── */}
      {activeMission && (
        <div className="fo-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <Truck className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Active Mission</span>
                <h3 className="text-sm font-bold text-white">{activeMission.id}</h3>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              activeMission.status === 'IN_TRANSIT' ? 'text-blue-400 bg-blue-500/10 border-blue-500/30' :
              activeMission.status === 'DELIVERED' || activeMission.status === 'PENDING_ADMIN_CLOSEOUT' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' :
              'text-amber-400 bg-amber-500/10 border-amber-500/30'
            }`}>
              {activeMission.status === 'IN_TRANSIT' ? 'En Route' :
               activeMission.status === 'DELIVERED' ? 'Delivered' :
               activeMission.status === 'PENDING_ADMIN_CLOSEOUT' ? 'Arrived' :
               activeMission.status === 'APPROVED' ? 'Approved' : 'Suggested'}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 flex items-center gap-1"><Truck className="w-3 h-3" /> {activeMission.recommendedVehicleType?.split('(')[0]?.trim() || 'Convoy'}</span>
              <span className="text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> ETA: {activeMission.routeDurationMinutes ? `${activeMission.routeDurationMinutes} min` : '42 min'}</span>
            </div>
            
            {/* Progress bar */}
            {activeMission.status === 'IN_TRANSIT' && (
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-500" style={{ width: '60%' }} />
              </div>
            )}

            {/* Cargo summary */}
            <div className="flex flex-wrap gap-1.5 mt-1">
              {activeMission.cargoAllocations?.slice(0, 3).map((cargo, idx) => (
                <span key={idx} className="px-2 py-0.5 rounded-full bg-slate-700/50 text-[10px] text-slate-300 font-medium">
                  {cargo.item}: {cargo.quantity} {cargo.unit}
                </span>
              ))}
            </div>

            {/* Route Updated Warning (Requirement 13) */}
            {(hasDisruption || (activeMission as any)?.isRerouted) && (
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between mt-2">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-[11px] font-bold text-amber-400">ROUTE UPDATED</span>
                </div>
                <button
                  onClick={onNavigateToMap}
                  className="text-[10px] text-blue-400 font-semibold hover:underline cursor-pointer"
                >
                  VIEW UPDATED ROUTE →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── FIELD OFFICER DELIVERY VERIFICATION (Requirement 14) ─── */}
      {activeMission && (activeMission.status === 'PENDING_ADMIN_CLOSEOUT' || activeMission.status === 'IN_TRANSIT') && (
        <div className="fo-card p-4 border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 to-slate-900">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">DELIVERY ARRIVED</span>
                <h4 className="text-xs font-semibold text-white">Supplies Reached Community Checkpoint</h4>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              {activeMission.status === 'PENDING_ADMIN_CLOSEOUT' ? 'Verified' : 'Ready'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center mb-3">
            <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60">
              <span className="text-[10px] text-slate-400 block">Food Kits</span>
              <span className="text-xs font-bold text-white font-mono">100 / 100</span>
            </div>
            <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60">
              <span className="text-[10px] text-slate-400 block">Water</span>
              <span className="text-xs font-bold text-white font-mono">50 / 50</span>
            </div>
            <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60">
              <span className="text-[10px] text-slate-400 block">Medical</span>
              <span className="text-xs font-bold text-white font-mono">20 / 20</span>
            </div>
          </div>

          <button
            onClick={() => reportMissionDeliveryByField(activeMission.id)}
            disabled={activeMission.status === 'PENDING_ADMIN_CLOSEOUT'}
            className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeMission.status === 'PENDING_ADMIN_CLOSEOUT'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md btn-press'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            {activeMission.status === 'PENDING_ADMIN_CLOSEOUT' ? 'RECEIPT CONFIRMED' : 'CONFIRM RECEIPT'}
          </button>
        </div>
      )}

      {/* ─── RESOURCE SITUATION ─── */}
      {resourceCards.length > 0 && (
        <div className="fo-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
                <Activity className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Resource Situation</span>
              </div>
            </div>
            <button onClick={() => onOpenAction('RESOURCE_REQUEST')} className="text-[10px] text-blue-400 font-semibold flex items-center gap-0.5 cursor-pointer hover:text-blue-300">
              Request <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {resourceCards.map((res, idx) => {
              const Icon = res.icon;
              const shortage = res.total - res.current;
              const pct = res.total > 0 ? (res.current / res.total) * 100 : 0;
              return (
                <div key={idx} className="text-center space-y-1">
                  <div className={`w-8 h-8 rounded-lg ${res.bg} flex items-center justify-center mx-auto`}>
                    <Icon className={`w-4 h-4 ${res.color}`} />
                  </div>
                  <span className="text-[10px] text-slate-400 block">{res.label}</span>
                  <div className="text-sm font-bold text-white">{res.current}<span className="text-slate-500 text-[10px] font-normal">/{res.total}</span></div>
                  <div className="h-1 bg-slate-700 rounded-full overflow-hidden mx-auto w-full">
                    <div className={`h-full rounded-full transition-all ${pct < 30 ? 'bg-red-500' : pct < 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.max(pct, 5)}%` }} />
                  </div>
                  <span className="text-[10px] text-red-400 font-semibold">-{shortage}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── RECENT GROUND REPORTS ─── */}
      <div className="fo-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Recent Ground Reports</span>
            </div>
          </div>
          <button onClick={() => onOpenAction('INCIDENT')} className="text-[10px] text-blue-400 font-semibold flex items-center gap-0.5 cursor-pointer hover:text-blue-300">
            View All <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {recentIncidents.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs">
            <ShieldAlert className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No reports filed yet
          </div>
        ) : (
          <div className="space-y-2">
            {recentIncidents.map(inc => (
              <div key={inc.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300 shrink-0 mt-0.5">
                  {inc.author.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-white truncate">{inc.author.name}</span>
                    <span className="text-[10px] text-slate-500 shrink-0">{formatTimeAgo(inc.timestamp)}</span>
                  </div>
                  <h4 className="text-xs font-bold text-white mt-0.5 line-clamp-1">{inc.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                      inc.severity === 'Total Blockage' ? 'text-red-400 bg-red-500/10 border-red-500/30' :
                      inc.severity === 'Single Lane Passable' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' :
                      'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
                    }`}>
                      {inc.severity === 'Total Blockage' ? 'Critical' : inc.severity === 'Single Lane Passable' ? 'High' : 'Caution'}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5" /> {inc.location.placeName}
                    </span>
                  </div>
                </div>

                {inc.mediaUrl && (
                  <img src={inc.mediaUrl} alt="" className="w-12 h-12 rounded-md object-cover shrink-0 border border-slate-700" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
