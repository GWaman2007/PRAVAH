/**
 * PRAVAH Field Officer — Reports / Ground Intel Feed
 * Reddit/thread-style mobile feed with incident reports, resource requests, and field updates.
 */
import React, { useState } from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import type { QuickReportTab } from './QuickFieldReportModal';
import {
  MapPin,
  Eye,
  MessageCircle,
  Clock,
  Camera,
  ChevronRight,
  Search,
  Filter,
  AlertTriangle,
  Package,
  FileText,
  Zap,
} from 'lucide-react';

interface FOReportsScreenProps {
  onOpenAction: (tab: QuickReportTab) => void;
}

type FeedFilter = 'ALL' | 'INCIDENTS' | 'RESOURCE_REQUESTS' | 'UPDATES';

const formatTimeAgo = (ts: string): string => {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export const FOReportsScreen: React.FC<FOReportsScreenProps> = ({ onOpenAction }) => {
  const {
    incidents,
    resourceRequests,
    setActiveView,
    focusMapOnCoords,
  } = usePravahStore();

  const [activeFilter, setActiveFilter] = useState<FeedFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filters: { id: FeedFilter; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'ALL', label: 'All', icon: Zap },
    { id: 'INCIDENTS', label: 'Incidents', icon: AlertTriangle },
    { id: 'RESOURCE_REQUESTS', label: 'Resource Requests', icon: Package },
    { id: 'UPDATES', label: 'Updates', icon: FileText },
  ];

  // Build a unified feed from incidents + resource requests
  const feedItems = [
    ...incidents.map(inc => ({
      type: 'INCIDENT' as const,
      id: inc.id,
      title: inc.title,
      author: inc.author.name,
      authorRole: inc.author.role,
      timestamp: inc.timestamp,
      severity: inc.severity,
      location: inc.location.placeName,
      locationCoords: [inc.location.lat, inc.location.lng] as [number, number],
      mediaUrl: inc.mediaUrl,
      corridor: inc.corridorFlair,
      votes: inc.votes,
      updates: inc.updates,
    })),
    ...resourceRequests.map(req => ({
      type: 'RESOURCE_REQUEST' as const,
      id: req.id,
      title: `Resource Request: ${req.resourceType}`,
      author: req.officerName,
      authorRole: req.officerRole,
      timestamp: req.createdAt || new Date().toISOString(),
      severity: req.urgency === 'Critical' ? 'Total Blockage' as const : 'Caution/Hazard' as const,
      location: req.communityName,
      locationCoords: [0, 0] as [number, number],
      mediaUrl: req.evidencePhoto,
      corridor: '',
      votes: { upvotes: 0, downvotes: 0, userVote: null as null },
      updates: [],
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const filteredItems = feedItems.filter(item => {
    if (activeFilter === 'INCIDENTS') return item.type === 'INCIDENT';
    if (activeFilter === 'RESOURCE_REQUESTS') return item.type === 'RESOURCE_REQUEST';
    return true;
  }).filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return item.title.toLowerCase().includes(q) || item.location.toLowerCase().includes(q) || item.author.toLowerCase().includes(q);
  });

  const getSeverityBadge = (severity: string) => {
    if (severity === 'Total Blockage') return { label: 'Critical', cls: 'text-red-400 bg-red-500/10 border-red-500/30' };
    if (severity === 'Single Lane Passable') return { label: 'High', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    return { label: 'Caution', cls: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' };
  };

  return (
    <div className="fo-screen-content">
      {/* Search bar */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search reports, locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-4 pb-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {filters.map(f => {
          const Icon = f.icon;
          return (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border whitespace-nowrap transition-all cursor-pointer ${
                activeFilter === f.id
                  ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                  : 'bg-transparent text-slate-400 border-slate-700 hover:border-slate-600'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Feed */}
      <div className="px-4 pb-4 space-y-3">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-xs font-medium">No reports yet</p>
            <p className="text-[10px] mt-1">Tap + to file a report</p>
          </div>
        ) : (
          filteredItems.map(item => {
            const badge = getSeverityBadge(item.severity);
            const initials = item.author.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

            return (
              <div key={item.id} className="fo-card p-0 overflow-hidden">
                {/* Post header */}
                <div className="flex items-center gap-3 px-4 pt-3 pb-2">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                    item.type === 'RESOURCE_REQUEST' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-white truncate">{item.author}</span>
                      <span className="text-[10px] text-slate-500">{formatTimeAgo(item.timestamp)}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{item.authorRole}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${badge.cls}`}>{badge.label}</span>
                </div>

                {/* Post title */}
                <div className="px-4 pb-2">
                  <h3 className="text-sm font-bold text-white leading-snug">{item.title}</h3>
                </div>

                {/* Media */}
                {item.mediaUrl && (
                  <div className="px-4 pb-2">
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                      <img
                        src={item.mediaUrl}
                        alt="Evidence"
                        className="w-full max-h-40 object-cover rounded-lg border border-slate-700"
                      />
                    </div>
                  </div>
                )}

                {/* Location + stats footer */}
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-700/50 bg-slate-800/30">
                  <div className="flex items-center gap-3 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-blue-400" />
                      {item.location}
                    </span>
                    {item.corridor && (
                      <span className="flex items-center gap-1 text-slate-500">
                        {item.corridor}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {item.votes.upvotes}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" /> {item.updates.length}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
