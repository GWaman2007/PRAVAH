import React, { useState, useMemo } from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import { calculateIncidentConfidence, formatTimeAgo } from '../../engine/offlineSync';
import { playAckChime, playDispatchPacketSound } from '../../utils/audioAlert';
import { CorridorFilterBar, type FeedSortOption } from './CorridorFilterBar';
import { OfflineQueueDrawer } from './OfflineQueueDrawer';
import { SyncNotificationToast, type SyncNotification } from './SyncNotificationToast';
import { LightboxModal } from './LightboxModal';
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
  } = usePravahStore();

  const [selectedFlair, setSelectedFlair] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<FeedSortOption>('Hot');
  const [reportModalOpen, setReportModalOpen] = useState<boolean>(false);
  const [isQueueDrawerOpen, setIsQueueDrawerOpen] = useState<boolean>(false);
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);
  const [syncNotifications, setSyncNotifications] = useState<SyncNotification[]>([]);

  // Form State for Report Modal
  const [formTitle, setFormTitle] = useState('');
  const [formCorridor, setFormCorridor] = useState<CorridorFlair>('r/NH-29-Nagaland');
  const [formType, setFormType] = useState<IncidentType>('Landslide');
  const [formSeverity, setFormSeverity] = useState<IncidentSeverity>('Total Blockage');
  const [formLocationName, setFormLocationName] = useState('');
  const [formInputMethod, setFormInputMethod] = useState<'TEXT' | 'VOICE' | 'PHOTO'>('TEXT');
  const [formVoiceRecording, setFormVoiceRecording] = useState(false);

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

  const handleCreateReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formLocationName) return;

    addIncident({
      title: formTitle,
      corridorFlair: formCorridor,
      incidentType: formType,
      severity: formSeverity,
      location: {
        lat: 25.7500,
        lng: 93.9800,
        placeName: formLocationName,
        corridorId: 'SEG-DIM-KOH-MAIN',
      },
      author: {
        name: userContext.name,
        role: (userContext.role === 'FIELD_OFFICER'
          ? 'Field Officer (BRO/Police)'
          : userContext.role === 'DRIVER'
          ? 'Registered Driver'
          : 'Local Citizen') as AuthorRole,
      },
      timestamp: new Date().toISOString(),
      mediaUrl:
        formType === 'Landslide'
          ? 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80'
          : 'https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?auto=format&fit=crop&w=800&q=80',
    });

    setFormTitle('');
    setFormLocationName('');
    setReportModalOpen(false);
  };

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
          <p className="text-xs text-text-secondary mt-0.5">
            Crowdsourced and officer-verified road disruptions with offline local queueing and photo proof.
          </p>
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

          {/* Report Roadblock Button */}
          <button
            onClick={() => setReportModalOpen(true)}
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
                            className="px-3 py-1.5 bg-primary text-white rounded-sm text-xs font-semibold btn-press flex items-center space-x-1 cursor-pointer"
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

      {/* Report Incident Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-surface border border-border rounded-md max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="font-semibold text-base text-text-primary">
                Report Field Incident / Roadblock
              </h2>
              <button
                onClick={() => setReportModalOpen(false)}
                className="p-1 rounded-sm text-text-secondary hover:text-text-primary cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReport} className="space-y-4 text-xs">
              {/* Three input methods: Text, Voice, Photo */}
              <div>
                <label className="font-medium text-text-secondary block mb-1">
                  Preferred Reporting Mode:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormInputMethod('TEXT')}
                    className={`p-2.5 rounded-sm border flex flex-col items-center justify-center space-y-1 font-medium transition-colors cursor-pointer ${
                      formInputMethod === 'TEXT'
                        ? 'border-primary bg-primary-tint text-primary'
                        : 'border-border bg-surface text-text-secondary'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Text Details</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormInputMethod('VOICE');
                      setFormVoiceRecording(!formVoiceRecording);
                      if (!formVoiceRecording) {
                        setFormTitle('Audio Dispatch: Mudflow blocking NH-29 single lane pass');
                        setFormLocationName('Km 142 Pagla Pahar bypass');
                      }
                    }}
                    className={`p-2.5 rounded-sm border flex flex-col items-center justify-center space-y-1 font-medium transition-colors cursor-pointer ${
                      formInputMethod === 'VOICE'
                        ? 'border-primary bg-primary-tint text-primary'
                        : 'border-border bg-surface text-text-secondary'
                    }`}
                  >
                    <Mic className={`w-4 h-4 ${formVoiceRecording ? 'text-status-blocked-solid animate-pulse' : ''}`} />
                    <span>{formVoiceRecording ? 'Recording (Voice)' : 'Voice Audio'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormInputMethod('PHOTO')}
                    className={`p-2.5 rounded-sm border flex flex-col items-center justify-center space-y-1 font-medium transition-colors cursor-pointer ${
                      formInputMethod === 'PHOTO'
                        ? 'border-primary bg-primary-tint text-primary'
                        : 'border-border bg-surface text-text-secondary'
                    }`}
                  >
                    <Camera className="w-4 h-4" />
                    <span>Photo Proof</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="font-medium text-text-secondary block mb-1">
                  Corridor Channel Flair:
                </label>
                <select
                  value={formCorridor}
                  onChange={(e) => setFormCorridor(e.target.value as CorridorFlair)}
                  className="w-full p-2 bg-surface border border-border rounded-sm text-text-primary focus:outline-none"
                >
                  <option value="r/NH-29-Nagaland">r/NH-29-Nagaland (Kohima Lifeline)</option>
                  <option value="r/NH-10-Sikkim">r/NH-10-Sikkim (Teesta Valley)</option>
                  <option value="r/Mizoram-NH-306">r/Mizoram-NH-306 (Kolasib Sector)</option>
                  <option value="r/Assam-DimaHasao">r/Assam-DimaHasao (Barail Cut)</option>
                  <option value="r/East-Khasi-Hills">r/East-Khasi-Hills (Sohra Ridge)</option>
                </select>
              </div>

              <div>
                <label className="font-medium text-text-secondary block mb-1">
                  Incident Headline / Summary:
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Major rockfall cleaving bridge shoulder at KM-42"
                  className="w-full p-2 bg-surface border border-border rounded-sm text-text-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-text-secondary block mb-1">Type:</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as IncidentType)}
                    className="w-full p-2 bg-surface border border-border rounded-sm text-text-primary focus:outline-none"
                  >
                    <option value="Landslide">Landslide</option>
                    <option value="Flash Flood">Flash Flood</option>
                    <option value="Bridge Washout">Bridge Washout</option>
                    <option value="Road Subsidence">Road Subsidence</option>
                  </select>
                </div>

                <div>
                  <label className="font-medium text-text-secondary block mb-1">Severity:</label>
                  <select
                    value={formSeverity}
                    onChange={(e) => setFormSeverity(e.target.value as IncidentSeverity)}
                    className="w-full p-2 bg-surface border border-border rounded-sm text-text-primary focus:outline-none"
                  >
                    <option value="Total Blockage">Total Blockage</option>
                    <option value="Single Lane Passable">Single Lane Passable</option>
                    <option value="Caution/Hazard">Caution/Hazard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-medium text-text-secondary block mb-1">
                  Exact Landmark / Location:
                </label>
                <input
                  type="text"
                  required
                  value={formLocationName}
                  onChange={(e) => setFormLocationName(e.target.value)}
                  placeholder="e.g. Near Pagla Pahar waterfall KM-144"
                  className="w-full p-2 bg-surface border border-border rounded-sm text-text-primary focus:outline-none"
                />
              </div>

              {!isOnline && (
                <div className="p-3 rounded-sm bg-status-highrisk-tint text-status-highrisk-text border border-status-highrisk-solid flex items-center space-x-2">
                  <WifiOff className="w-4 h-4 shrink-0" />
                  <span>
                    You are working offline. This report will be queued in local storage and synced automatically once signal is recovered.
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-border flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="px-3 py-2 text-xs font-medium border border-border rounded-sm text-text-secondary hover:bg-surface-subtle btn-press cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1B4B73] hover:bg-[#123A5A] dark:bg-[#2E6B9E] text-white rounded-sm text-xs font-semibold btn-press shadow-xs flex items-center space-x-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Incident Report</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
