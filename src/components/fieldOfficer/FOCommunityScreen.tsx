/**
 * PRAVAH Field Officer — Community Screen
 * Detailed view of the assigned community: situation, roads, resources, missions, recent reports.
 */
import React, { useState } from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import { NER_SEGMENTS } from '../../data/routingNetwork';
import type { Segment } from '../../types';
import type { QuickReportTab } from './QuickFieldReportModal';
import {
  MapPin,
  Shield,
  AlertTriangle,
  Truck,
  Package,
  ChevronRight,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Map,
} from 'lucide-react';

interface FOCommunityScreenProps {
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

export const FOCommunityScreen: React.FC<FOCommunityScreenProps> = ({ onNavigateToMap, onOpenAction }) => {
  const {
    userContext,
    communities,
    activeMissions,
    activeDisruptions,
    incidents,
    reportMissionDeliveryByField,
  } = usePravahStore();

  const community = communities.find(c => c.id === userContext.communityId) || communities[0];
  const communityMissions = activeMissions.filter(m => m.communityId === community?.id);
  const activeMission = communityMissions.find(
    m => m.status === 'IN_TRANSIT' || m.status === 'APPROVED' || m.status === 'SUGGESTED'
  ) || communityMissions[0];

  // Road segments with disruption info
  const roadSegments = NER_SEGMENTS.slice(0, 8).map((seg: Segment) => {
    const disruption = activeDisruptions[seg.id];
    let status: 'OPEN' | 'RESTRICTED' | 'BLOCKED' = 'OPEN';
    if (disruption?.status === 'TOTAL_BLOCKAGE') status = 'BLOCKED';
    else if (disruption?.status === 'SINGLE_LANE_PASSABLE') status = 'RESTRICTED';
    return { ...seg, roadStatus: status, disruption };
  });

  const blockedRoads = roadSegments.filter(r => r.roadStatus === 'BLOCKED');
  const restrictedRoads = roadSegments.filter(r => r.roadStatus === 'RESTRICTED');
  const openRoads = roadSegments.filter(r => r.roadStatus === 'OPEN');

  const depletions = community?.metrics?.commodityDepletions;

  const communityIncidents = incidents.filter(
    i => i.location.placeName.toLowerCase().includes(community?.name?.toLowerCase().split(' ')[0] || '')
  ).slice(0, 3);

  return (
    <div className="fo-screen-content px-4 pt-4 pb-4 space-y-4">
      {/* ─── COMMUNITY HERO ─── */}
      <div className="fo-card p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center border border-blue-500/30">
            <MapPin className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Assigned Community</span>
            <h2 className="text-base font-bold text-white">{community?.name || 'Community'}</h2>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="fo-stat-chip">
            <span className="text-[10px] text-slate-400">Priority Tier</span>
            <span className={`text-lg font-bold font-mono ${
              community?.metrics?.priorityTier === 'P1' ? 'text-red-400' :
              community?.metrics?.priorityTier === 'P2' ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {community?.metrics?.priorityTier || 'P3'}
            </span>
          </div>
          <div className="fo-stat-chip">
            <span className="text-[10px] text-slate-400">Risk Score</span>
            <span className="text-lg font-bold font-mono text-white">{community?.metrics?.finalScore?.toFixed(1) || '0.0'}</span>
          </div>
        </div>

        <button
          onClick={onNavigateToMap}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold hover:bg-blue-500/15 transition-colors cursor-pointer"
        >
          <Map className="w-4 h-4" /> View on Map
        </button>
      </div>

      {/* ─── ROAD STATUS ─── */}
      <div className="fo-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" /> Affected Roads
          </h3>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="flex items-center gap-1 text-red-400"><span className="w-2 h-2 rounded-full bg-red-500" />{blockedRoads.length}</span>
            <span className="flex items-center gap-1 text-amber-400"><span className="w-2 h-2 rounded-full bg-amber-500" />{restrictedRoads.length}</span>
            <span className="flex items-center gap-1 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-500" />{openRoads.length}</span>
          </div>
        </div>

        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {roadSegments.map(seg => (
            <div key={seg.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-semibold text-white block truncate">{seg.name}</span>
                <span className="text-[10px] text-slate-500">{seg.highway}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                seg.roadStatus === 'BLOCKED' ? 'text-red-400 bg-red-500/10 border-red-500/30' :
                seg.roadStatus === 'RESTRICTED' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' :
                'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
              }`}>
                {seg.roadStatus === 'BLOCKED' ? <XCircle className="w-3 h-3" /> :
                 seg.roadStatus === 'RESTRICTED' ? <AlertTriangle className="w-3 h-3" /> :
                 <CheckCircle className="w-3 h-3" />}
                {seg.roadStatus}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── RESOURCE REQUIREMENTS ─── */}
      {depletions && (
        <div className="fo-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-purple-400" /> Resource Requirements
            </h3>
            <button onClick={() => onOpenAction('RESOURCE_REQUEST')} className="text-[10px] text-blue-400 font-semibold flex items-center gap-0.5 cursor-pointer hover:text-blue-300">
              Request <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {Object.entries(depletions).map(([key, dep]) => {
              const pct = dep.lastStock > 0 ? (dep.currentStock / dep.lastStock) * 100 : 0;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-white font-medium">{dep.label}</span>
                    <span className="text-slate-400 font-mono">{Math.round(dep.currentStock)} / {Math.round(dep.lastStock)} {dep.unit}</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct < 30 ? 'bg-red-500' : pct < 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.max(pct, 3)}%` }}
                    />
                  </div>
                  {dep.currentStock < dep.lastStock * 0.3 && (
                    <span className="text-[10px] text-red-400 font-semibold">
                      Shortage: -{Math.round(dep.lastStock - dep.currentStock)} {dep.unit}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── ACTIVE MISSION ─── */}
      {activeMission && (
        <div className="fo-card p-4">
          <h3 className="text-xs font-bold text-white flex items-center gap-2 mb-3">
            <Truck className="w-4 h-4 text-emerald-400" /> Active Mission
          </h3>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-blue-400">{activeMission.id}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                activeMission.status === 'IN_TRANSIT' ? 'text-blue-400 bg-blue-500/10 border-blue-500/30' :
                'text-amber-400 bg-amber-500/10 border-amber-500/30'
              }`}>
                {activeMission.status === 'IN_TRANSIT' ? 'En Route' : activeMission.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="fo-stat-chip">
                <span className="text-[10px] text-slate-400">Destination</span>
                <span className="text-white font-semibold text-[11px]">{activeMission.communityName}</span>
              </div>
              <div className="fo-stat-chip">
                <span className="text-[10px] text-slate-400">Vehicle</span>
                <span className="text-white font-semibold text-[11px]">{activeMission.assignedVehicleId || 'Convoy'}</span>
              </div>
              <div className="fo-stat-chip">
                <span className="text-[10px] text-slate-400">Driver</span>
                <span className="text-white font-semibold text-[11px]">{activeMission.assignedDriver || 'TBD'}</span>
              </div>
              <div className="fo-stat-chip">
                <span className="text-[10px] text-slate-400">ETA</span>
                <span className="text-blue-400 font-bold text-[11px]">{activeMission.routeDurationMinutes ? `${activeMission.routeDurationMinutes} min` : '42 min'}</span>
              </div>
            </div>

            {/* Cargo */}
            <div className="pt-1">
              <span className="text-[10px] text-slate-400 font-semibold block mb-1">Cargo Manifest</span>
              <div className="flex flex-wrap gap-1.5">
                {activeMission.cargoAllocations?.map((cargo, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded-full bg-slate-700/50 text-[10px] text-slate-300 font-medium border border-slate-700">
                    {cargo.item}: {cargo.quantity} {cargo.unit}
                  </span>
                ))}
              </div>
            </div>

            {/* Delivery Verification Card (Requirement 14) */}
            {(activeMission.status === 'PENDING_ADMIN_CLOSEOUT' || activeMission.status === 'IN_TRANSIT') && (
              <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-emerald-950/70 to-emerald-900/40 border border-emerald-500/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">DELIVERY ARRIVED</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">100% Verified</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="bg-slate-900/80 p-1.5 rounded-lg border border-slate-700/60">
                    <span className="text-[9px] text-slate-400 block">Food</span>
                    <span className="text-[11px] font-bold text-white font-mono">100/100</span>
                  </div>
                  <div className="bg-slate-900/80 p-1.5 rounded-lg border border-slate-700/60">
                    <span className="text-[9px] text-slate-400 block">Water</span>
                    <span className="text-[11px] font-bold text-white font-mono">50/50</span>
                  </div>
                  <div className="bg-slate-900/80 p-1.5 rounded-lg border border-slate-700/60">
                    <span className="text-[9px] text-slate-400 block">Medical</span>
                    <span className="text-[11px] font-bold text-white font-mono">20/20</span>
                  </div>
                </div>
                <button
                  onClick={() => reportMissionDeliveryByField(activeMission.id)}
                  disabled={activeMission.status === 'PENDING_ADMIN_CLOSEOUT'}
                  className={`w-full py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeMission.status === 'PENDING_ADMIN_CLOSEOUT'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md btn-press'
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  {activeMission.status === 'PENDING_ADMIN_CLOSEOUT' ? 'RECEIPT CONFIRMED' : 'CONFIRM RECEIPT'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── RECENT REPORTS ─── */}
      {communityIncidents.length > 0 && (
        <div className="fo-card p-4">
          <h3 className="text-xs font-bold text-white flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-orange-400" /> Recent Reports
          </h3>
          <div className="space-y-2">
            {communityIncidents.map(inc => (
              <div key={inc.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-300 shrink-0">
                  {inc.author.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[11px] font-bold text-white truncate">{inc.title}</h4>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                    <span>{formatTimeAgo(inc.timestamp)}</span>
                    <span>•</span>
                    <span className={`font-semibold ${
                      inc.severity === 'Total Blockage' ? 'text-red-400' : 'text-amber-400'
                    }`}>{inc.severity === 'Total Blockage' ? 'Critical' : 'High'}</span>
                  </div>
                </div>
                {inc.mediaUrl && (
                  <img src={inc.mediaUrl} alt="" className="w-10 h-10 rounded-md object-cover shrink-0 border border-slate-700" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
