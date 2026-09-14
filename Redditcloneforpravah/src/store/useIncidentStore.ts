import { useState, useEffect, useCallback, useMemo } from 'react';
import type { 
  Incident, 
  CorridorFlair, 
  FeedSortOption, 
  OfflineQueueItem, 
  AuthorRole, 
  IncidentType, 
  Severity 
} from '../types/incident';
import { 
  INITIAL_SEED_INCIDENTS 
} from '../data/seedIncidents';
import { 
  STORAGE_KEYS, 
  calculateIncidentConfidence 
} from '../utils/offlineEngine';
import type { SyncNotification } from '../utils/offlineEngine';

export function useIncidentStore() {
  // Load incidents from localStorage or fallback to initial seed
  const [incidents, setIncidents] = useState<Incident[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.INCIDENTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse cached incidents from localStorage:', e);
    }
    return INITIAL_SEED_INCIDENTS;
  });

  // Offline queue state
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse offline queue:', e);
    }
    return [];
  });

  // Simulated offline toggle
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SIMULATED_OFFLINE);
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  // Browser network online listener
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  // Effective online: only true if browser is online AND simulation is off
  const isEffectiveOnline = isBrowserOnline && !isSimulatedOffline;

  // Filter & Sort state
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<FeedSortOption>('Hot');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  // Modals & Panels
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isQueueDrawerOpen, setIsQueueDrawerOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  
  // Interactive coordinate picking mode for map
  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [pickedCoordinates, setPickedCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  // Diagnostic sync notifications
  const [syncNotifications, setSyncNotifications] = useState<SyncNotification[]>([]);

  // Persist incidents to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(incidents));
    } catch (e) {
      console.warn('LocalStorage write failed:', e);
    }
  }, [incidents]);

  // Persist offlineQueue to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(offlineQueue));
    } catch (e) {
      console.warn('LocalStorage queue write failed:', e);
    }
  }, [offlineQueue]);

  // Persist simulated offline setting
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SIMULATED_OFFLINE, JSON.stringify(isSimulatedOffline));
    } catch (e) {
      console.warn('LocalStorage simulated offline write failed:', e);
    }
  }, [isSimulatedOffline]);

  // Browser network listeners
  useEffect(() => {
    const handleOnline = () => setIsBrowserOnline(true);
    const handleOffline = () => setIsBrowserOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-flush queue worker when network switches back to online
  const flushQueue = useCallback(() => {
    if (offlineQueue.length === 0) {
      // Also ensure any pending status in incidents is marked synced
      setIncidents(prev => {
        let changed = false;
        const updated = prev.map(inc => {
          if (inc.sync_status === 'PENDING') {
            changed = true;
            return { ...inc, sync_status: 'SYNCED' as const };
          }
          return inc;
        });
        return changed ? updated : prev;
      });
      return;
    }

    const count = offlineQueue.length;
    const details = offlineQueue.map(item => {
      if (item.action === 'CREATE_INCIDENT') return `Published: "${item.payload.title?.slice(0, 32)}..."`;
      if (item.action === 'VOTE_INCIDENT') return `Vote recorded on incident #${item.payload.incidentId?.slice(-6)}`;
      if (item.action === 'ADD_UPDATE') return `Ground clearance update logged by ${item.payload.author}`;
      return `Offline operation processed`;
    });

    // Mark all pending incidents as SYNCED
    setIncidents(prev => 
      prev.map(inc => inc.sync_status === 'PENDING' ? { ...inc, sync_status: 'SYNCED' } : inc)
    );

    // Empty the queue
    setOfflineQueue([]);

    // Add toast notification
    const notification: SyncNotification = {
      id: 'sync-' + Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      itemsSynced: count,
      details
    };

    setSyncNotifications(prev => [notification, ...prev.slice(0, 4)]);
  }, [offlineQueue]);

  // Trigger flush automatically when connection is restored
  useEffect(() => {
    if (isEffectiveOnline && (offlineQueue.length > 0 || incidents.some(i => i.sync_status === 'PENDING'))) {
      const timer = setTimeout(() => {
        flushQueue();
      }, 700); // slight debounce for smooth transition
      return () => clearTimeout(timer);
    }
  }, [isEffectiveOnline, offlineQueue.length, flushQueue, incidents]);

  // DevTools toggle for simulated offline
  const toggleSimulatedOffline = useCallback(() => {
    setIsSimulatedOffline(prev => !prev);
  }, []);

  // Upvote / Downvote handler with Reddit voting mechanics
  const handleVote = useCallback((incidentId: string, voteType: 'up' | 'down') => {
    setIncidents(prev => {
      return prev.map(item => {
        if (item.id !== incidentId) return item;

        const currentVote = item.votes.userVote;
        let newUpvotes = item.votes.upvotes;
        let newDownvotes = item.votes.downvotes;
        let newUserVote: 'up' | 'down' | null = voteType;

        if (currentVote === voteType) {
          // Undoing current vote
          newUserVote = null;
          if (voteType === 'up') newUpvotes = Math.max(0, newUpvotes - 1);
          if (voteType === 'down') newDownvotes = Math.max(0, newDownvotes - 1);
        } else if (currentVote === null) {
          // New vote
          if (voteType === 'up') newUpvotes += 1;
          if (voteType === 'down') newDownvotes += 1;
        } else {
          // Switching from up to down or vice versa
          if (voteType === 'up') {
            newUpvotes += 1;
            newDownvotes = Math.max(0, newDownvotes - 1);
          } else {
            newDownvotes += 1;
            newUpvotes = Math.max(0, newUpvotes - 1);
          }
        }

        const updatedVotes = {
          upvotes: newUpvotes,
          downvotes: newDownvotes,
          userVote: newUserVote
        };

        const { score } = calculateIncidentConfidence({
          votes: updatedVotes,
          author: item.author,
          updates: item.updates,
          hasOfficerVerified: item.hasOfficerVerified
        });

        const sync_status = isEffectiveOnline ? item.sync_status : 'PENDING';

        return {
          ...item,
          votes: updatedVotes,
          confidenceScore: score,
          sync_status
        };
      });
    });

    // If offline, enqueue vote operation
    if (!isEffectiveOnline) {
      const queueItem: OfflineQueueItem = {
        id: 'q-vote-' + Date.now(),
        action: 'VOTE_INCIDENT',
        timestamp: new Date().toISOString(),
        payload: { incidentId, voteType }
      };
      setOfflineQueue(prev => [queueItem, ...prev]);
    }
  }, [isEffectiveOnline]);

  // Create new incident
  const createIncident = useCallback((data: {
    title: string;
    corridorFlair: CorridorFlair | string;
    incidentType: IncidentType;
    severity: Severity;
    placeName: string;
    state?: string;
    lat: number;
    lng: number;
    authorName: string;
    authorRole: AuthorRole;
    mediaUrl: string;
  }) => {
    const isOfficer = data.authorRole === 'Field Officer (BRO/Police)';
    const initialUpvotes = isOfficer ? 3 : 1;
    const initialDownvotes = 0;
    const initialConfidence = (initialUpvotes - initialDownvotes) + (isOfficer ? 10 : 0);

    const newIncident: Incident = {
      id: 'inc-' + Date.now(),
      title: data.title,
      corridorFlair: data.corridorFlair,
      incidentType: data.incidentType,
      severity: data.severity,
      location: {
        lat: data.lat,
        lng: data.lng,
        placeName: data.placeName,
        state: data.state || 'North East Region'
      },
      author: {
        name: data.authorName || (isOfficer ? 'BRO Officer' : 'Ground Reporter'),
        role: data.authorRole
      },
      timestamp: new Date().toISOString(),
      mediaUrl: data.mediaUrl,
      votes: {
        upvotes: initialUpvotes,
        downvotes: initialDownvotes,
        userVote: 'up' // creator automatically upvotes
      },
      hasOfficerVerified: isOfficer,
      confidenceScore: initialConfidence,
      updates: [],
      sync_status: isEffectiveOnline ? 'SYNCED' : 'PENDING',
      offlineQueuedAt: isEffectiveOnline ? undefined : new Date().toISOString()
    };

    setIncidents(prev => [newIncident, ...prev]);

    // If offline, append to offline sync queue
    if (!isEffectiveOnline) {
      const queueItem: OfflineQueueItem = {
        id: 'q-inc-' + Date.now(),
        action: 'CREATE_INCIDENT',
        timestamp: new Date().toISOString(),
        payload: newIncident
      };
      setOfflineQueue(prev => [queueItem, ...prev]);
    }

    // Auto-select and pan to new incident
    setSelectedIncidentId(newIncident.id);
    setIsCreateModalOpen(false);

    return newIncident;
  }, [isEffectiveOnline]);

  // Add threaded ground update
  const addGroundUpdate = useCallback((
    incidentId: string, 
    updateData: { author: string; role: AuthorRole; message: string }
  ) => {
    const isOfficer = updateData.role === 'Field Officer (BRO/Police)';
    const newUpdate = {
      id: 'upd-' + Date.now(),
      author: updateData.author.trim() || (isOfficer ? 'BRO Field Engineer' : 'Ground Driver'),
      role: updateData.role,
      message: updateData.message.trim(),
      timestamp: new Date().toISOString()
    };

    setIncidents(prev => {
      return prev.map(item => {
        if (item.id !== incidentId) return item;

        const updatedList = [...item.updates, newUpdate];
        const hasOfficerVerified = item.hasOfficerVerified || isOfficer;
        
        const { score } = calculateIncidentConfidence({
          votes: item.votes,
          author: item.author,
          updates: updatedList,
          hasOfficerVerified
        });

        const sync_status = isEffectiveOnline ? item.sync_status : 'PENDING';

        return {
          ...item,
          updates: updatedList,
          hasOfficerVerified,
          confidenceScore: score,
          sync_status
        };
      });
    });

    if (!isEffectiveOnline) {
      const queueItem: OfflineQueueItem = {
        id: 'q-upd-' + Date.now(),
        action: 'ADD_UPDATE',
        timestamp: new Date().toISOString(),
        payload: { incidentId, ...newUpdate }
      };
      setOfflineQueue(prev => [queueItem, ...prev]);
    }
  }, [isEffectiveOnline]);

  // Reset to seed data
  const resetToSeedData = useCallback(() => {
    setIncidents(INITIAL_SEED_INCIDENTS);
    setOfflineQueue([]);
    localStorage.removeItem(STORAGE_KEYS.INCIDENTS);
    localStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
    setSelectedIncidentId(null);
  }, []);

  // Filter and sort incidents for feed
  const filteredIncidents = useMemo(() => {
    let result = [...incidents];

    // Filter by corridor flair / state
    if (activeFilter !== 'All') {
      const filterLower = activeFilter.toLowerCase();
      result = result.filter(item => {
        const flairLower = item.corridorFlair.toLowerCase();
        const stateLower = (item.location.state || '').toLowerCase();
        const placeLower = item.location.placeName.toLowerCase();
        return flairLower.includes(filterLower) || stateLower.includes(filterLower) || placeLower.includes(filterLower);
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(item => 
        item.title.toLowerCase().includes(q) ||
        item.corridorFlair.toLowerCase().includes(q) ||
        item.location.placeName.toLowerCase().includes(q) ||
        item.incidentType.toLowerCase().includes(q) ||
        item.author.name.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortBy === 'Critical') {
      // Total blockages first, then by score
      result.sort((a, b) => {
        if (a.severity === 'Total Blockage' && b.severity !== 'Total Blockage') return -1;
        if (b.severity === 'Total Blockage' && a.severity !== 'Total Blockage') return 1;
        return b.confidenceScore - a.confidenceScore;
      });
    } else if (sortBy === 'New') {
      result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } else {
      // 'Hot' sort: confidenceScore weighted by recency
      result.sort((a, b) => {
        const ageHoursA = Math.max(0.5, (Date.now() - new Date(a.timestamp).getTime()) / (1000 * 60 * 60));
        const ageHoursB = Math.max(0.5, (Date.now() - new Date(b.timestamp).getTime()) / (1000 * 60 * 60));
        const hotScoreA = (a.confidenceScore + 5) / Math.pow(ageHoursA + 2, 1.2);
        const hotScoreB = (b.confidenceScore + 5) / Math.pow(ageHoursB + 2, 1.2);
        return hotScoreB - hotScoreA;
      });
    }

    return result;
  }, [incidents, activeFilter, searchQuery, sortBy]);

  // Dismiss notification toast
  const dismissNotification = useCallback((id: string) => {
    setSyncNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return {
    incidents,
    filteredIncidents,
    offlineQueue,
    isSimulatedOffline,
    isBrowserOnline,
    isEffectiveOnline,
    activeFilter,
    sortBy,
    searchQuery,
    selectedIncidentId,
    isCreateModalOpen,
    isQueueDrawerOpen,
    lightboxImage,
    isPickingLocation,
    pickedCoordinates,
    syncNotifications,
    // Setters / Actions
    setActiveFilter,
    setSortBy,
    setSearchQuery,
    setSelectedIncidentId,
    setIsCreateModalOpen,
    setIsQueueDrawerOpen,
    setLightboxImage,
    setIsPickingLocation,
    setPickedCoordinates,
    toggleSimulatedOffline,
    handleVote,
    createIncident,
    addGroundUpdate,
    flushQueue,
    resetToSeedData,
    dismissNotification,
  };
}
