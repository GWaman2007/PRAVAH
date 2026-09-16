import React, { useState, useMemo } from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import { calculateIncidentConfidence, formatTimeAgo } from '../../engine/offlineSync';
import { playAckChime, playDispatchPacketSound } from '../../utils/audioAlert';
import { CorridorFilterBar, type FeedSortOption } from './CorridorFilterBar';
import { OfflineQueueDrawer } from './OfflineQueueDrawer';
import { SyncNotificationToast, type SyncNotification } from './SyncNotificationToast';
import { LightboxModal } from './LightboxModal';
import { IncidentReportModal } from './IncidentReportModal';
import type { CorridorFlair, IncidentType, IncidentSeverity, AuthorRole, OfflineQueueItem } from '../../types';
import {
  MessageSquare,
  ArrowBigUp,
  ArrowBigDown,
  ShieldCheck,
  Camera,
  Mic,
  FileText,
  MapPin,
  Plus,
  X,
  Send,
  WifiOff,
  Database,
  ZoomIn,
} from 'lucide-react';

export const GroundIntelligenceFeed: React.FC = () => {
  const {
    incidents,
    addIncident,
    voteIncident,
    addIncidentUpdate,
    userContext,
    isOnline,
    isSimulatedOffline,
    toggleSimulatedOffline,
    offlineQueue,
    offlineQueueCount,
    flushOfflineQueue,
    isSupabaseConfigured,
  } = usePravahStore();

  const [selectedFlair, setSelectedFlair] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<FeedSortOption>('Hot');
  const [reportModalOpen, setReportModalOpen] = useState<boolean>(false);
  const [initialReportMethod, setInitialReportMethod] = useState<'TEXT' | 'VOICE' | 'PHOTO'>('TEXT');
  const [isQueueDrawerOpen, setIsQueueDrawerOpen] = useState<boolean>(false);
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);
  const [syncNotifications, setSyncNotifications] = useState<SyncNotification[]>([]);

  // Active commenting
  const [commentingIncidentId, setCommentingIncidentId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  // Critical blockages count
  const criticalCount = useMemo(() => {
    return incidents.filter((i) => i.severity === 'Total Blockage').length;
  }, [incidents]);

  // Filtered and Sorted Incidents
  const filteredIncidents = useMemo(() => {
    let list = [...incidents];

    if (selectedFlair !== 'ALL') {
      list = list.filter((inc) => inc.corridorFlair === selectedFlair);
    }

    if (sortBy === 'Hot') {
      list.sort((a, b) => {
        const confA = calculateIncidentConfidence(a).score;
        const confB = calculateIncidentConfidence(b).score;
        return confB - confA;
      });
    } else if (sortBy === 'New') {
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } else if (sortBy === 'Critical') {
      list.sort((a, b) => {
        if (a.severity === 'Total Blockage' && b.severity !== 'Total Blockage') return -1;
        if (a.severity !== 'Total Blockage' && b.severity === 'Total Blockage') return 1;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
    }

    return list;
  }, [incidents, selectedFlair, sortBy]);

  // Formatted offline queue operations for drawer
  const formattedQueue: OfflineQueueItem[] = useMemo(() => {
    return offlineQueue.map((item) => ({
      id: item.id,
      action: 'CREATE_INCIDENT',
      timestamp: item.timestamp,
      payload: item,
    }));
  }, [offlineQueue]);

  const handleVote = (incidentId: string, type: 'up' | 'down') => {
    voteIncident(incidentId, type);
    playAckChime();
  };

  const handleAddComment = (incId: string) => {
    if (!commentText.trim()) return;
    addIncidentUpdate(incId, commentText);
    setCommentText('');
    setCommentingIncidentId(null);
  };

  const handleFlushQueue = () => {
    const result = flushOfflineQueue();
    if (result.syncedCount > 0) {
      playDispatchPacketSound();
      const notif: SyncNotification = {
        id: `sync-${Date.now()}`,
        timestamp: new Date().toISOString(),
        itemsSynced: result.syncedCount,
        details: result.details,
      };
      setSyncNotifications((prev) => [notif, ...prev]);
      setTimeout(() => {
        setSyncNotifications((prev) => prev.filter((n) => n.id !== notif.id));
      }, 5000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Toast notifications */}
      <SyncNotificationToast
        notifications={syncNotifications}
        onDismiss={(id) => setSyncNotifications((prev) => prev.filter((n) => n.id !== id))}
      />

      {/* Lightbox photo modal */}
      <LightboxModal
        imageUrl={activeLightboxImage}
        onClose={() => setActiveLightboxImage(null)}
      />

      {/* Offline queue drawer */}
      <OfflineQueueDrawer
        isOpen={isQueueDrawerOpen}
        onClose={() => setIsQueueDrawerOpen(false)}
        queue={formattedQueue}
        pendingIncidents={offlineQueue}
        isEffectiveOnline={isOnline}
        isSimulatedOffline={isSimulatedOffline}
        onToggleSimulatedOffline={toggleSimulatedOffline}
        onFlushQueue={handleFlushQueue}
      />

      {/* Feed Controls Header */}
      <div className="bg-surface border border-border p-4 rounded-md shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-text-primary flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <span>Ground Intelligence & Road Verification Feed</span>
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <p className="text-xs text-text-secondary">
              Crowdsourced and officer-verified road disruptions with offline local queueing and photo proof.
            </p>
            {isSupabaseConfigured ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Supabase Realtime Cloud DB
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 whitespace-nowrap" title="Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable cross-device live sync on Vercel">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Local Mode
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Offline Queue Inspector Trigger */}
          <button
            onClick={() => setIsQueueDrawerOpen(true)}
            className={`px-3 py-2 rounded-sm text-xs font-semibold flex items-center gap-1.5 transition-all btn-press border ${
              offlineQueueCount > 0
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400'
                : 'bg-surface border-border text-text-secondary hover:text-text-primary'
            }`}
            title="Inspect Offline Queue"
          >
            <Database className="w-4 h-4" />
            <span>Offline Queue</span>
            {offlineQueueCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-xs bg-amber-500 text-slate-950 font-mono font-bold text-[10px]">
                {offlineQueueCount}
              </span>
            )}
          </button>

          {/* Quick Voice Dispatch Button */}
          <button
            onClick={() => {
              setInitialReportMethod('VOICE');
              setReportModalOpen(true);
            }}
            className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-sm flex items-center justify-center space-x-1.5 btn-press shadow-xs cursor-pointer"
            title="Launch Voice Speech-to-Text Dispatch"
          >
            <Mic className="w-4 h-4" />
            <span className="hidden sm:inline">Voice Dispatch</span>
          </button>

          {/* Report Roadblock Button */}
          <button
            onClick={() => {
              setInitialReportMethod('TEXT');
              setReportModalOpen(true);
            }}
            className="px-3.5 py-2 bg-[#1B4B73] hover:bg-[#123A5A] dark:bg-[#2E6B9E] text-white text-xs font-semibold rounded-sm flex items-center justify-center space-x-1.5 btn-press shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Report Roadblock</span>
          </button>
        </div>
      </div>

      {/* Subreddit-style Corridor Filter Bar ported from Redditcloneforpravah */}
      <CorridorFilterBar
        activeFilter={selectedFlair}
        setActiveFilter={setSelectedFlair}
        sortBy={sortBy}
        setSortBy={setSortBy}
        totalCount={filteredIncidents.length}
        criticalCount={criticalCount}
      />

      {/* Incidents Stream */}
      <div className="space-y-4">
        {filteredIncidents.length === 0 ? (
          <div className="p-8 text-center bg-surface border border-border rounded-md text-text-secondary text-xs">
            No incident reports found matching active filter.
          </div>
        ) : (
          filteredIncidents.map((inc) => {
            const confidence = calculateIncidentConfidence(inc);

            return (
              <article
                key={inc.id}
                className="bg-surface border border-border rounded-md shadow-xs overflow-hidden"
              >
                <div className="flex">
                  {/* Left: Voting Console */}
                  <div className="w-12 bg-surface-subtle border-r border-border flex flex-col items-center py-3 space-y-1 select-none">
                    <button
                      onClick={() => handleVote(inc.id, 'up')}
                      aria-label="Upvote"
                      className={`p-1 rounded-sm transition-colors cursor-pointer ${
                        inc.votes.userVote === 'up'
                          ? 'text-status-open-solid bg-status-open-tint'
                          : 'text-text-tertiary hover:text-text-primary'
                      }`}
                    >
                      <ArrowBigUp className="w-6 h-6" />
                    </button>

                    <span className="font-bold text-xs font-mono text-text-primary">
                      {confidence.score}
                    </span>

                    <button
                      onClick={() => handleVote(inc.id, 'down')}
                      aria-label="Downvote"
                      className={`p-1 rounded-sm transition-colors cursor-pointer ${
                        inc.votes.userVote === 'down'
                          ? 'text-status-blocked-solid bg-status-blocked-tint'
                          : 'text-text-tertiary hover:text-text-primary'
                      }`}
                    >
                      <ArrowBigDown className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Right: Incident Content Body */}
                  <div className="flex-1 p-4 space-y-2.5">
                    {/* Metadata Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-semibold px-2 py-0.5 rounded-sm bg-surface-subtle border border-border text-text-primary">
                          {inc.corridorFlair}
                        </span>
                        <span className="text-text-secondary">•</span>
                        <span className="text-text-secondary">
                          Posted by <strong className="text-text-primary">{inc.author.name}</strong> ({inc.author.role})
                        </span>
                        <span className="text-text-tertiary">{formatTimeAgo(inc.timestamp)}</span>
                      </div>

                      {/* Confidence Badge */}
                      <div className="flex items-center space-x-1.5">
                        {confidence.hasOfficer && (
                          <span className="flex items-center space-x-1 text-[11px] font-bold px-2 py-0.5 rounded-sm bg-status-open-tint text-status-open-text border border-status-open-solid">
                            <ShieldCheck className="w-3.5 h-3.5 text-status-open-solid" />
                            <span>Officer Verified (+10)</span>
                          </span>
                        )}

                        {inc.sync_status === 'PENDING' && (
                          <span className="flex items-center space-x-1 text-[10px] font-medium px-2 py-0.5 rounded-sm bg-status-highrisk-tint text-status-highrisk-text border border-status-highrisk-solid">
                            <WifiOff className="w-3 h-3" />
                            <span>Queued Offline</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title & Severity */}
                    <div>
                      <h2 className="text-sm font-semibold text-text-primary">
                        {inc.title}
                      </h2>
                      <div className="flex items-center space-x-3 mt-1 text-xs">
                        <span className="flex items-center space-x-1 text-text-secondary">
                          <MapPin className="w-3.5 h-3.5 text-primary" />
                          <span>{inc.location.placeName}</span>
                        </span>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-sm border ${
                            inc.severity === 'Total Blockage'
                              ? 'bg-status-blocked-tint text-status-blocked-text border-status-blocked-solid'
                              : 'bg-status-highrisk-tint text-status-highrisk-text border-status-highrisk-solid'
                          }`}
                        >
                          {inc.severity}
                        </span>
                      </div>
                    </div>

                    {/* Geo-tagged Media Preview with Lightbox click */}
                    {inc.mediaUrl && (
                      <div 
                        onClick={() => setActiveLightboxImage(inc.mediaUrl)}
                        className="relative group rounded-sm overflow-hidden border border-border max-h-56 bg-black/10 cursor-pointer"
                      >
                        <img
                          src={inc.mediaUrl}
                          alt="Road blockage condition"
                          className="w-full h-48 object-cover group-hover:scale-102 transition-transform duration-200"
                          loading="lazy"
                        />
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded-sm flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                          <ZoomIn className="w-3 h-3" />
                          <span>Click to Expand</span>
                        </div>
                      </div>
                    )}

                    {/* Nested Status Updates */}
                    {inc.updates.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border space-y-2">
                        <span className="text-[11px] font-semibold text-text-secondary uppercase">
                          Ground Clearance Updates ({inc.updates.length}):
                        </span>
                        {inc.updates.map((u) => (
                          <div
                            key={u.id}
                            className="p-2.5 rounded-sm bg-surface-subtle border border-border text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between text-[11px] text-text-secondary">
                              <span className="font-semibold text-text-primary">{u.author} ({u.role})</span>
                              <span>{formatTimeAgo(u.timestamp)}</span>
                            </div>
                            <p className="text-text-primary">{u.message}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Comment CTA */}
                    <div className="pt-2 flex items-center space-x-3 text-xs">
                      {commentingIncidentId === inc.id ? (
                        <div className="w-full flex space-x-2">
                          <input
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Provide verified clearance update or field observation..."
                            className="flex-1 px-3 py-1.5 text-xs bg-surface border border-border rounded-sm text-text-primary focus:outline-none"
                          />
                          <button
                            onClick={() => handleAddComment(inc.id)}
                            className="px-3 py-1.5 bg-[#1B4B73] dark:bg-[#2E6B9E] text-white rounded-sm text-xs font-semibold btn-press flex items-center space-x-1 cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Post</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setCommentingIncidentId(inc.id)}
                          className="text-primary hover:underline font-medium flex items-center space-x-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Ground Clearance Update</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Unified Incident Report Modal */}
      <IncidentReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        defaultCorridor={selectedFlair !== 'ALL' ? (selectedFlair as CorridorFlair) : 'r/NH-29-Nagaland'}
        initialInputMethod={initialReportMethod}
      />
    </div>
  );
};
