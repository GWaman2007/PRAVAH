import type { Incident, CommunityBase, ReliefMission, SegmentIncident } from '../types';

export const STORAGE_KEYS = {
  INCIDENTS: 'pravah_ner_incidents_v2',
  DISRUPTIONS: 'pravah_ner_disruptions_v2',
  MISSIONS: 'pravah_ner_missions_v3',
  COMMUNITIES: 'pravah_ner_communities_v2',
  OFFLINE_QUEUE: 'pravah_ner_offline_queue_v2',
  MUTATION_QUEUE: 'pravah_ner_mutations_v1',
  SIMULATED_OFFLINE: 'pravah_simulated_offline_v2',
};

export const DEFAULT_INCIDENTS: Incident[] = [
  {
    id: 'inc-01',
    title: 'Massive Mudflow Severing NH-29 Pagla Pahar Sector',
    corridorFlair: 'r/NH-29-Nagaland',
    incidentType: 'Landslide',
    severity: 'Total Blockage',
    location: {
      lat: 25.7500,
      lng: 93.9800,
      placeName: 'Pagla Pahar (Km 144), Kohima District',
      state: 'Nagaland',
      corridorId: 'SEG-DIM-KOH-MAIN',
    },
    author: {
      name: 'Subedar K. Sema',
      role: 'Field Officer (BRO/Police)',
    },
    timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
    mediaUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
    votes: { upvotes: 38, downvotes: 2, userVote: null },
    confidenceScore: 46, // 36 + 10 officer verification
    hasOfficerVerified: true,
    sync_status: 'SYNCED',
    updates: [
      {
        id: 'u-1',
        author: 'BRO Project Sewak Lead',
        role: 'Field Officer (BRO/Police)',
        message: 'Heavy bulldozer units deployed at southern shoulder. Est clearance: 6 hours.',
        timestamp: new Date(Date.now() - 20 * 60000).toISOString(),
      },
    ],
  },
  {
    id: 'inc-02',
    title: 'Bilkhawthlir Silt Subsidence on NH-306',
    corridorFlair: 'r/Mizoram-NH-306',
    incidentType: 'Road Subsidence',
    severity: 'Single Lane Passable',
    location: {
      lat: 24.2850,
      lng: 92.7350,
      placeName: 'Bilkhawthlir Escarpment, Kolasib District',
      state: 'Mizoram',
      corridorId: 'SEG-SIL-KOL',
    },
    author: {
      name: 'Inspector L. Hmar',
      role: 'Field Officer (BRO/Police)',
    },
    timestamp: new Date(Date.now() - 90 * 60000).toISOString(),
    mediaUrl: 'https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?auto=format&fit=crop&w=800&q=80',
    votes: { upvotes: 24, downvotes: 1, userVote: null },
    confidenceScore: 33,
    hasOfficerVerified: true,
    sync_status: 'SYNCED',
    updates: [
      {
        id: 'u-2',
        author: 'Insp. L. Hmar',
        role: 'Field Officer (BRO/Police)',
        message: 'Single alternate lane opened. Axle limit strictly 18T. Medic-01 escorted through.',
        timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
      },
    ],
  },
  {
    id: 'inc-03',
    title: 'Flash Flood Submerging NH-27 Haflong Ghat Section',
    corridorFlair: 'r/Assam-DimaHasao',
    incidentType: 'Flash Flood',
    severity: 'Total Blockage',
    location: {
      lat: 25.18,
      lng: 93.01,
      placeName: 'Haflong Ghat (Km 87), Dima Hasao District',
      state: 'Assam',
      corridorId: 'SEG-NOW-HAF-SIL',
    },
    author: {
      name: 'Maj. S. Saikia',
      role: 'Field Officer (BRO/Police)',
    },
    timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
    mediaUrl: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80',
    votes: { upvotes: 31, downvotes: 1, userVote: null },
    confidenceScore: 40,
    hasOfficerVerified: true,
    sync_status: 'SYNCED',
    updates: [
      {
        id: 'u-3',
        author: 'BRO Project Pushpak Ops',
        role: 'Field Officer (BRO/Police)',
        message: 'Water level rising 0.3m/hr. All heavy vehicle transit suspended. Pumping operations commenced.',
        timestamp: new Date(Date.now() - 90 * 60000).toISOString(),
      },
    ],
  },
  {
    id: 'inc-04',
    title: 'Bailey Bridge Structural Failure at Sevoke Approach NH-10',
    corridorFlair: 'r/NH-10-Sikkim',
    incidentType: 'Bridge Washout',
    severity: 'Total Blockage',
    location: {
      lat: 26.95,
      lng: 88.45,
      placeName: 'Sevoke Bridge Approach (Km 12), Darjeeling District',
      state: 'West Bengal',
      corridorId: 'SEG-SIL-GANG',
    },
    author: {
      name: 'Capt. P. Bhutia',
      role: 'Field Officer (BRO/Police)',
    },
    timestamp: new Date(Date.now() - 180 * 60000).toISOString(),
    mediaUrl: 'https://images.unsplash.com/photo-1545830790-68e2b043e5d1?auto=format&fit=crop&w=800&q=80',
    votes: { upvotes: 27, downvotes: 0, userVote: null },
    confidenceScore: 37,
    hasOfficerVerified: true,
    sync_status: 'SYNCED',
    updates: [
      {
        id: 'u-4',
        author: 'Capt. P. Bhutia',
        role: 'Field Officer (BRO/Police)',
        message: 'Bailey bridge southern abutment scoured. Emergency pontoon being assembled. ETA 8 hours.',
        timestamp: new Date(Date.now() - 150 * 60000).toISOString(),
      },
    ],
  },
  {
    id: 'inc-05',
    title: 'Massive Tree Fall Blocking NH-37 Noney Tunnel Approach',
    corridorFlair: 'r/Manipur-NH-37',
    incidentType: 'Tree Fall',
    severity: 'Single Lane Passable',
    location: {
      lat: 24.78,
      lng: 93.58,
      placeName: 'Noney Tunnel Approach (Km 62), Noney District',
      state: 'Manipur',
      corridorId: 'SEG-SIL-IMP',
    },
    author: {
      name: 'Dr. L. Meitei',
      role: 'Field Officer (BRO/Police)',
    },
    timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
    mediaUrl: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=800&q=80',
    votes: { upvotes: 18, downvotes: 2, userVote: null },
    confidenceScore: 26,
    hasOfficerVerified: true,
    sync_status: 'SYNCED',
    updates: [
      {
        id: 'u-5',
        author: 'Dr. L. Meitei',
        role: 'Field Officer (BRO/Police)',
        message: 'Two large sal trees across roadway. Chainsaw crew deployed. Single lane cleared for light vehicles under escort.',
        timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
      },
    ],
  },
  {
    id: 'inc-06',
    title: 'Active Landslip Zone Destabilising NH-6 Sonapur Tunnel Sector',
    corridorFlair: 'r/East-Khasi-Hills',
    incidentType: 'Landslide',
    severity: 'Single Lane Passable',
    location: {
      lat: 25.10,
      lng: 92.42,
      placeName: 'Sonapur Tunnel South Portal, Jaintia Hills',
      state: 'Meghalaya',
      corridorId: 'SEG-SHL-SIL-MAIN',
    },
    author: {
      name: 'Lt. Col. D. Sangma',
      role: 'Field Officer (BRO/Police)',
    },
    timestamp: new Date(Date.now() - 240 * 60000).toISOString(),
    mediaUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    votes: { upvotes: 22, downvotes: 1, userVote: null },
    confidenceScore: 31,
    hasOfficerVerified: true,
    sync_status: 'SYNCED',
    updates: [
      {
        id: 'u-6',
        author: 'BRO Project Setuk Lead',
        role: 'Field Officer (BRO/Police)',
        message: 'Continuous debris creep from eastern hillside. Gabion wire mesh deployment underway. Restricted to 12T axle load.',
        timestamp: new Date(Date.now() - 210 * 60000).toISOString(),
      },
    ],
  },
];

/**
 * Confidence Score Calculation:
 * Score = (Upvotes - Downvotes) + (OfficerVerification ? 10 : 0)
 */
export function calculateIncidentConfidence(incident: Partial<Incident>): {
  score: number;
  badge: 'High Confidence (Verified)' | 'Under Review' | 'Disputed / Likely Cleared';
  badgeColor: string;
  hasOfficer: boolean;
} {
  const upvotes = incident.votes?.upvotes ?? 0;
  const downvotes = incident.votes?.downvotes ?? 0;

  const hasOfficer =
    incident.hasOfficerVerified ||
    incident.author?.role === 'Field Officer (BRO/Police)' ||
    (incident.updates && incident.updates.some((u) => u.role === 'Field Officer (BRO/Police)')) ||
    false;

  const score = upvotes - downvotes + (hasOfficer ? 10 : 0);

  let badge: 'High Confidence (Verified)' | 'Under Review' | 'Disputed / Likely Cleared';
  let badgeColor: string;

  if (score > 10) {
    badge = 'High Confidence (Verified)';
    badgeColor = 'emerald';
  } else if (score >= 1) {
    badge = 'Under Review';
    badgeColor = 'amber';
  } else {
    badge = 'Disputed / Likely Cleared';
    badgeColor = 'slate';
  }

  return { score, badge, badgeColor, hasOfficer };
}

/**
 * LocalStorage Incidents Persistence
 */
export function getPersistedIncidents(): Incident[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.INCIDENTS) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[OfflineSync] Failed to read persisted incidents:', err);
  }
  return DEFAULT_INCIDENTS;
}

export function persistIncidents(incidents: Incident[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(incidents));
    }
  } catch (err) {
    console.warn('[OfflineSync] Failed to save incidents to localStorage:', err);
  }
}

/**
 * Disruptions Persistence
 */
export function getPersistedDisruptions(): Record<string, any> | null {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.DISRUPTIONS) : null;
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function persistDisruptions(disruptions: Record<string, any>): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.DISRUPTIONS, JSON.stringify(disruptions));
    }
  } catch (err) {
    console.warn('[OfflineSync] Failed to save disruptions to localStorage:', err);
  }
}

/**
 * Missions Persistence
 */
export function purgeLegacyMockMissions(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEYS.MISSIONS);
      if (raw && (raw.includes('"MISSION-') || raw.includes('"MOCK-') || raw.includes('MISSION-MZ-'))) {
        localStorage.removeItem(STORAGE_KEYS.MISSIONS);
        console.log('[OfflineSync] Purged legacy hardcoded missions from localStorage.');
      }
    }
  } catch {
    // ignore
  }
}

export function getPersistedMissions(): any[] | null {
  try {
    purgeLegacyMockMissions();
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.MISSIONS) : null;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const cleaned = parsed.filter(
      (m: any) =>
        m &&
        typeof m.id === 'string' &&
        !m.id.startsWith('MISSION-') &&
        !m.id.startsWith('MOCK-')
    );
    return cleaned.length > 0 ? cleaned : null;
  } catch {
    return null;
  }
}

export function persistMissions(missions: any[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.MISSIONS, JSON.stringify(missions));
    }
  } catch (err) {
    console.warn('[OfflineSync] Failed to save missions to localStorage:', err);
  }
}

/**
 * Communities Persistence
 */
export function getPersistedCommunities(): CommunityBase[] | null {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.COMMUNITIES) : null;
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function persistCommunities(communities: CommunityBase[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.COMMUNITIES, JSON.stringify(communities));
    }
  } catch (err) {
    console.warn('[OfflineSync] Failed to save communities to localStorage:', err);
  }
}

/**
 * LocalStorage / IndexedDB queue utilities
 */
export function getOfflineQueue(): Incident[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE) : null;
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function queueIncidentOffline(incident: Incident): Incident[] {
  try {
    const queue = getOfflineQueue();
    const updated = [
      ...queue,
      {
        ...incident,
        sync_status: 'PENDING' as const,
        offlineQueuedAt: new Date().toISOString(),
      },
    ];
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(updated));
    }
    return updated;
  } catch {
    return [];
  }
}

export function clearOfflineQueue(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
    }
  } catch {}
}

/**
 * Universal Offline Mutation Queue
 * Stores any user action taken while offline (mission approval, dispatch, delivery,
 * disruption, incident vote, update, community restock) so it can be flushed
 * to Supabase DB once internet connectivity returns.
 */
export type OfflineMutationType =
  | 'UPSERT_INCIDENT'
  | 'VOTE_INCIDENT'
  | 'ADD_INCIDENT_UPDATE'
  | 'UPSERT_DISRUPTION'
  | 'UPSERT_MISSION'
  | 'APPROVE_MISSION'
  | 'DISPATCH_MISSION'
  | 'DELIVER_MISSION'
  | 'CLOSEOUT_MISSION'
  | 'UPSERT_COMMUNITY';

export interface OfflineMutation {
  id: string;
  type: OfflineMutationType;
  entityId: string;
  payload: any;
  timestamp: string;
}

export function getOfflineMutationQueue(): OfflineMutation[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.MUTATION_QUEUE) : null;
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function queueOfflineMutation(mutation: Omit<OfflineMutation, 'id' | 'timestamp'>): OfflineMutation[] {
  try {
    const queue = getOfflineMutationQueue();
    const newEntry: OfflineMutation = {
      ...mutation,
      id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    // Deduplicate / replace existing pending mutation for same entityId and type
    const filtered = queue.filter((m) => !(m.entityId === mutation.entityId && m.type === mutation.type));
    filtered.push(newEntry);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.MUTATION_QUEUE, JSON.stringify(filtered));
    }
    return filtered;
  } catch (err) {
    console.warn('[OfflineSync] Failed to queue offline mutation:', err);
    return [];
  }
}

export function clearOfflineMutationQueue(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.MUTATION_QUEUE);
    }
  } catch {}
}

/**
 * Conflict Resolution Engine
 * Handles bidirectional reconciliation between LocalStorage and Cloud Database:
 * 1. Cloud changes override LocalStorage when Local has no uncommitted offline changes.
 * 2. LocalStorage offline changes override Cloud DB upon reconnect by pushing mutations.
 * 3. Conflicts are resolved via deterministic lifecycle rankings and timestamps.
 */

const MISSION_LIFECYCLE_RANK: Record<string, number> = {
  SUGGESTED: 0,
  APPROVED: 1,
  IN_TRANSIT: 2,
  PENDING_ADMIN_CLOSEOUT: 3,
  DELIVERED: 4,
};

export function resolveMissionConflict(
  localMissions: ReliefMission[],
  cloudMissions: ReliefMission[]
): ReliefMission[] {
  if (!cloudMissions || cloudMissions.length === 0) return localMissions;
  const result: ReliefMission[] = [];
  const processedCommIds = new Set<string>();

  const cloudById = new Map(cloudMissions.map((m) => [m.id, m]));

  // Active cloud communities that already have a non-suggested mission
  const activeCloudCommunities = new Set(
    cloudMissions
      .filter((cm) => cm.status === 'APPROVED' || cm.status === 'IN_TRANSIT' || cm.status === 'PENDING_ADMIN_CLOSEOUT')
      .map((cm) => cm.communityId)
  );

  // 1. Process all cloud missions (cloud is authoritative unless local has an uncommitted higher status)
  for (const cm of cloudMissions) {
    // Find matching local mission: either exact ID match, or matching community for active missions
    const lm = localMissions.find((m) => {
      if (m.id === cm.id) return true;
      if (m.communityId === cm.communityId) {
        if (cm.status !== 'DELIVERED') return true;
        if (cm.status === 'DELIVERED' && m.status === 'DELIVERED') return true;
      }
      return false;
    });
    if (!lm) {
      result.push(cm);
      processedCommIds.add(cm.communityId);
      continue;
    }

    const cRank = MISSION_LIFECYCLE_RANK[cm.status] ?? 0;
    const lRank = MISSION_LIFECYCLE_RANK[lm.status] ?? 0;

    // If local has advanced further (e.g. dispatched locally while cloud was approved), local wins
    if (lRank > cRank) {
      result.push(lm);
    } else {
      // Cloud is equal or further advanced -> Cloud wins and overrides local
      result.push(cm);
    }
    processedCommIds.add(cm.communityId);
  }

  // 2. Process local missions not present in cloud
  for (const lm of localMissions) {
    if (cloudById.has(lm.id)) continue;
    // If this community already has an active cloud mission, evict any local SUGGESTED mission
    if (activeCloudCommunities.has(lm.communityId) && lm.status === 'SUGGESTED') {
      continue; // EVICT / POP
    }
    if (processedCommIds.has(lm.communityId)) {
      continue; // Already reconciled for this community
    }
    // Local mission for community with no cloud equivalent
    result.push(lm);
    processedCommIds.add(lm.communityId);
  }

  return result;
}

export function resolveIncidentConflict(
  localIncidents: Incident[],
  cloudIncidents: Incident[]
): Incident[] {
  if (!cloudIncidents || cloudIncidents.length === 0) return localIncidents;
  const result: Incident[] = [];
  const cloudMap = new Map(cloudIncidents.map((inc) => [inc.id, inc]));

  for (const ci of cloudIncidents) {
    const li = localIncidents.find((i) => i.id === ci.id);
    if (!li) {
      result.push(ci);
      continue;
    }

    // Merge updates arrays without duplicates
    const updateMap = new Map<string, any>();
    (ci.updates || []).forEach((u) => updateMap.set(u.id, u));
    (li.updates || []).forEach((u) => updateMap.set(u.id, u));

    const mergedIncident: Incident = {
      ...ci,
      updates: Array.from(updateMap.values()),
      hasOfficerVerified: ci.hasOfficerVerified || li.hasOfficerVerified,
      confidenceScore: Math.max(ci.confidenceScore, li.confidenceScore),
      votes: {
        upvotes: Math.max(ci.votes.upvotes, li.votes.upvotes),
        downvotes: Math.max(ci.votes.downvotes, li.votes.downvotes),
        userVote: li.votes.userVote || ci.votes.userVote || null,
      },
      sync_status: 'SYNCED',
    };
    result.push(mergedIncident);
  }

  // Include any locally created incidents not yet in cloud
  for (const li of localIncidents) {
    if (!cloudMap.has(li.id)) {
      result.push(li);
    }
  }

  return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function resolveDisruptionConflict(
  localDisruptions: Record<string, SegmentIncident>,
  cloudDisruptions: Record<string, SegmentIncident>
): Record<string, SegmentIncident> {
  if (!cloudDisruptions) return localDisruptions;
  return {
    ...localDisruptions,
    ...cloudDisruptions,
  };
}

export function resolveCommunityConflict(
  localCommunities: CommunityBase[],
  cloudCommunities: CommunityBase[]
): CommunityBase[] {
  if (!cloudCommunities || cloudCommunities.length === 0) return localCommunities;
  const cloudMap = new Map(cloudCommunities.map((c) => [c.id, c]));

  return localCommunities.map((lc) => {
    const cc = cloudMap.get(lc.id);
    if (!cc) return lc;
    return {
      ...lc,
      ...cc,
      inventories: cc.inventories || lc.inventories,
      elapsedTimeHours: cc.elapsedTimeHours ?? lc.elapsedTimeHours,
    };
  });
}

export function formatTimeAgo(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    if (diffMs < 0) return 'just now';

    const minutes = Math.floor(diffMs / (60 * 1000));
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days === 1) return 'yesterday';
    return `${days}d ago`;
  } catch {
    return 'recently';
  }
}

