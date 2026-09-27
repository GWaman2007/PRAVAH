/**
 * PRAVAH Field Officer — Map Screen
 * Embeds the full TacticalMapDeck inside the mobile viewport with road status filter chips
 * and interactive incident inspection card (matching Reference Screen 2).
 */
import React, { useState, useEffect } from 'react';
import { TacticalMapDeck } from '../gis/TacticalMapDeck';
import { usePravahStore } from '../../store/usePravahStore';
import { NER_SEGMENTS } from '../../data/routingNetwork';
import { RoadIncidentModal } from '../gis/RoadIncidentModal';
import {
  Search,
  MapPin,
  ChevronRight,
  AlertTriangle,
  Crosshair,
  Plus,
  Minus,
  Navigation,
  Truck,
} from 'lucide-react';
import type { Segment, SegmentIncident, Incident } from '../../types';

type RoadFilter = 'ALL' | 'BLOCKED' | 'RESTRICTED' | 'OPEN';

export interface FOMapScreenProps {
  onNavigateToMission?: (missionId: string) => void;
}

export const FOMapScreen: React.FC<FOMapScreenProps> = ({ onNavigateToMission }) => {
  const {
    activeDisruptions,
    communities,
    userContext,
    incidents,
    setSelectedCommunityId,
    setSelectedMissionId,
    focusMapOnCoords,
    activeMissions,
  } = usePravahStore();

  const [activeFilter, setActiveFilter] = useState<RoadFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIncidentModal, setSelectedIncidentModal] = useState<{
    segment: Segment | null;
    disruption: SegmentIncident | null;
    incident: Incident | null;
  } | null>(null);

  const community = communities.find(c => c.id === userContext.communityId) || communities[0];

  // Specific mission assigned to this officer's sector
  const officerMission = activeMissions.find(
    (m) =>
      m.communityId === userContext.communityId ||
      m.id === userContext.activeMissionId ||
      Boolean(userContext.communityName && m.communityName && m.communityName.toLowerCase().includes(userContext.communityName.toLowerCase().split(' ')[0]))
  ) || activeMissions[0];

  // Auto-focus on community and officer mission when FOMapScreen mounts
  useEffect(() => {
    if (community) {
      setSelectedCommunityId(community.id);
      focusMapOnCoords([community.coordinates[0], community.coordinates[1]], 12);
    }
    if (officerMission) {
      setSelectedMissionId(officerMission.id);
    }
  }, [community?.id, officerMission?.id, setSelectedCommunityId, setSelectedMissionId, focusMapOnCoords]);

  const filters: { id: RoadFilter; label: string; color: string; dot: string }[] = [
    { id: 'ALL', label: 'All', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30', dot: '' },
    { id: 'BLOCKED', label: 'Blocked', color: 'bg-red-500/15 text-red-400 border-red-500/30', dot: 'bg-red-500' },
    { id: 'RESTRICTED', label: 'Restricted', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30', dot: 'bg-amber-500' },
    { id: 'OPEN', label: 'Open', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-500' },
  ];

  const blockedCount = Object.values(activeDisruptions).filter(d => d.status === 'TOTAL_BLOCKAGE').length;
  const restrictedCount = Object.values(activeDisruptions).filter(d => d.status === 'SINGLE_LANE_PASSABLE').length;

  // Find the primary featured incident (e.g. Bridge B-04 or highest severity)
  const featuredIncident = incidents.find(i => i.severity === 'Total Blockage') || incidents[0];

  const handleOpenFeaturedIncident = () => {
    if (!featuredIncident) return;
    const seg = NER_SEGMENTS.find(s => s.highway.includes('NH-29') || s.name.includes(featuredIncident.location.placeName)) || NER_SEGMENTS[0];
    const disruption = Object.values(activeDisruptions)[0] || {
      status: 'TOTAL_BLOCKAGE' as const,
      cause: 'Flood_Inundation',
      description: featuredIncident.title,
      reportedBy: featuredIncident.author.name,
    };
    setSelectedIncidentModal({
      segment: seg || null,
      disruption: disruption as SegmentIncident,
      incident: featuredIncident,
    });
  };

  const handleLocateCommunity = () => {
    if (community) {
      focusMapOnCoords([community.coordinates[0], community.coordinates[1]], 14);
    }
  };

  return (
    <div className="fo-map-screen">
      {/* Search bar */}
      <div className="px-3 pt-3 pb-2 z-10 bg-[#0F172A]/90 backdrop-blur-xs">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search location, road, community..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
          />
        </div>
      </div>

      {/* Filter chips */}
      <div className="px-3 pb-2 flex items-center gap-2 overflow-x-auto no-scrollbar z-10 bg-[#0F172A]/90 backdrop-blur-xs border-b border-slate-800">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap transition-all cursor-pointer ${
              activeFilter === f.id ? f.color : 'bg-transparent text-slate-400 border-slate-700 hover:border-slate-600'
            }`}
          >
            {f.dot && <span className={`w-2 h-2 rounded-full ${f.dot}`} />}
            {f.label}
            {f.id === 'BLOCKED' && blockedCount > 0 && <span className="text-[9px] opacity-70">({blockedCount})</span>}
            {f.id === 'RESTRICTED' && restrictedCount > 0 && <span className="text-[9px] opacity-70">({restrictedCount})</span>}
          </button>
        ))}
      </div>

      {/* Map container */}
      <div className="fo-map-container">
        <TacticalMapDeck compactMobileOnly={true} onNavigateToMission={onNavigateToMission} />

        {/* Mission route badge for this field officer's assigned sector */}
        {officerMission && (
          <button
            onClick={() => onNavigateToMission?.(officerMission.id)}
            title="View this mission in Missions section"
            className="absolute top-3 left-3 z-[450] bg-slate-900/95 backdrop-blur-md border border-blue-500/40 hover:border-blue-400 rounded-lg px-2.5 py-1.5 shadow-xl flex items-center gap-2 transition-all cursor-pointer btn-press"
          >
            <Truck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <div className="text-left">
              <span className="text-[11px] font-bold text-white block leading-tight">
                Mission: {officerMission.id}
              </span>
              <span className="text-[9px] font-semibold text-emerald-400">
                {officerMission.status === 'IN_TRANSIT' ? 'En Route' : officerMission.status} • Tap to view →
              </span>
            </div>
          </button>
        )}

        {/* Community label badge top-right */}
        {community && (
          <div className="absolute top-3 right-3 z-[450] bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg px-2.5 py-1.5 shadow-xl pointer-events-none">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <div>
                <span className="text-[11px] font-bold text-white block leading-tight">{community.name}</span>
                <span className={`text-[9px] font-bold ${
                  community.metrics.priorityTier === 'P1' ? 'text-red-400' :
                  community.metrics.priorityTier === 'P2' ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  Priority {community.metrics.priorityTier}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Map Floating Zoom & Locate Controls (Right side) */}
        <div className="absolute right-3 top-16 z-[450] flex flex-col gap-1.5">
          <button
            onClick={handleLocateCommunity}
            title="Locate assigned community"
            className="w-8 h-8 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 flex items-center justify-center shadow-lg transition-colors cursor-pointer"
          >
            <Crosshair className="w-4 h-4 text-blue-400" />
          </button>
        </div>

        {/* Floating Featured Incident Card (Reference Screen 2) */}
        {featuredIncident && (
          <div
            onClick={handleOpenFeaturedIncident}
            className="absolute left-3 right-3 bottom-4 z-[450] bg-slate-900/95 backdrop-blur-md border border-red-500/40 rounded-xl p-3 shadow-2xl flex items-center gap-3 cursor-pointer hover:border-red-500/70 transition-all btn-press"
          >
            {featuredIncident.mediaUrl ? (
              <img
                src={featuredIncident.mediaUrl}
                alt=""
                className="w-12 h-12 rounded-lg object-cover shrink-0 border border-slate-700"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white truncate">{featuredIncident.title}</h4>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-bold text-red-400">Blocked</span>
                <span className="text-slate-500 text-[10px]">•</span>
                <span className="text-[10px] text-amber-400 font-medium">High Severity</span>
                <span className="text-slate-500 text-[10px]">•</span>
                <span className="text-[10px] text-slate-400 truncate">{featuredIncident.location.placeName}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Incident Detail Modal */}
      {selectedIncidentModal && (
        <RoadIncidentModal
          isOpen={true}
          onClose={() => setSelectedIncidentModal(null)}
          segment={selectedIncidentModal.segment}
          disruption={selectedIncidentModal.disruption}
          incident={selectedIncidentModal.incident}
          affectedMissions={activeMissions}
        />
      )}
    </div>
  );
};
