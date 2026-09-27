import type { Incident, CommunityBase, ReliefMission, SegmentIncident, ResponseHub, HubInventory, InventoryTransaction } from '../types';

export const STORAGE_KEYS = {
  INCIDENTS: 'pravah_ner_incidents_v2',
  DISRUPTIONS: 'pravah_ner_disruptions_v2',
  MISSIONS: 'pravah_ner_missions_v9',
  COMMUNITIES: 'pravah_ner_communities_v2',
  OFFLINE_QUEUE: 'pravah_ner_offline_queue_v2',
  MUTATION_QUEUE: 'pravah_ner_mutations_v1',
  SIMULATED_OFFLINE: 'pravah_simulated_offline_v2',
  HUBS: 'pravah_ner_hubs_v1',
  HUB_INVENTORY: 'pravah_ner_hub_inventory_v1',
  INVENTORY_TRANSACTIONS: 'pravah_ner_inventory_transactions_v1',
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
      [
        'pravah_relief_missions',
        'pravah_ner_missions_v1',
        'pravah_ner_missions_v2',
        'pravah_ner_missions_v3',
        'pravah_ner_missions_v4',
        'pravah_ner_missions_v5',
        'pravah_ner_missions_v6',
        'pravah_ner_missions_v7',
        'pravah_ner_missions_v8',
      ].forEach((k) => {
        localStorage.removeItem(k);
      });
      const raw = localStorage.getItem(STORAGE_KEYS.MISSIONS);
      if (
        raw &&
        (!raw.includes('SUGG-MLSHL003-OPT-1') ||
          !raw.includes('SUGG-ASDH011-OPT-1') ||
          raw.includes('"MISSION-') ||
          raw.includes('"MOCK-') ||
          raw.includes('MISSION-MZ-'))
      ) {
        localStorage.removeItem(STORAGE_KEYS.MISSIONS);
        console.log('[OfflineSync] Refreshed missions storage with updated suggested missions.');
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

// =========================================================================
// 8. Initial Seed Data & Offline Storage for Response Hubs & Inventory
// =========================================================================
export const INITIAL_RESPONSE_HUBS: ResponseHub[] = [
  {
    id: 'guwahati',
    name: 'Guwahati Regional Hub',
    code: 'HUB-AS-GAU',
    state: 'Assam',
    district: 'Kamrup Metropolitan',
    city: 'Guwahati',
    address: 'Khanapara Central Supply Depot, NH-27 Bypass',
    coordinates: [26.1445, 91.7362],
    type: 'REGIONAL',
    status: 'OPERATIONAL',
    storageCapacityKg: 100000,
    coldStorageCapacityKg: 25000,
    fuelStorageCapacityLitres: 50000,
    sourceType: 'OFFICIAL_REFERENCE',
    sourceNote: 'Inter-state apex staging terminal for lower Assam and Western Corridor',
    routingNodeId: 'guwahati',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'silchar',
    name: 'Silchar Strategic Depot',
    code: 'HUB-AS-SIL',
    state: 'Assam',
    district: 'Cachar',
    city: 'Silchar',
    address: 'Tarapur Staging Base, NH-306 Terminal',
    coordinates: [24.8333, 92.7789],
    type: 'REGIONAL',
    status: 'OPERATIONAL',
    storageCapacityKg: 80000,
    coldStorageCapacityKg: 15000,
    fuelStorageCapacityLitres: 40000,
    sourceType: 'OFFICIAL_REFERENCE',
    sourceNote: 'Primary lifeline staging hub for Mizoram, Barak Valley, and Dima Hasao',
    routingNodeId: 'silchar',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'dimapur',
    name: 'Dimapur Railhead Depot',
    code: 'HUB-NL-DMU',
    state: 'Nagaland',
    district: 'Dimapur',
    city: 'Dimapur',
    address: 'Railway Goods Yard Logistics Terminal, NH-29 Junction',
    coordinates: [25.9095, 93.7266],
    type: 'REGIONAL',
    status: 'OPERATIONAL',
    storageCapacityKg: 75000,
    coldStorageCapacityKg: 12000,
    fuelStorageCapacityLitres: 35000,
    sourceType: 'OFFICIAL_REFERENCE',
    sourceNote: 'Primary heavy bulk rail-to-road transshipment depot feeding Nagaland & Manipur',
    routingNodeId: 'dimapur',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'gangtok',
    name: 'Gangtok STNM Hub',
    code: 'HUB-SK-GTK',
    state: 'Sikkim',
    district: 'East Sikkim',
    city: 'Gangtok',
    address: 'Sir Thutob Namgyal Memorial Hospital Complex Staging',
    coordinates: [27.3314, 88.6138],
    type: 'FORWARD',
    status: 'OPERATIONAL',
    storageCapacityKg: 40000,
    coldStorageCapacityKg: 15000,
    fuelStorageCapacityLitres: 20000,
    sourceType: 'OFFICIAL_REFERENCE',
    sourceNote: 'High-altitude medical cold chain and mountain emergency staging base',
    routingNodeId: 'gangtok',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'shillong',
    name: 'Shillong Forward Base',
    code: 'HUB-ML-SHL',
    state: 'Meghalaya',
    district: 'East Khasi Hills',
    city: 'Shillong',
    address: 'Mawlai Emergency Transit Staging Base, NH-6',
    coordinates: [25.5788, 91.8933],
    type: 'DISTRICT',
    status: 'OPERATIONAL',
    storageCapacityKg: 50000,
    coldStorageCapacityKg: 10000,
    fuelStorageCapacityLitres: 25000,
    sourceType: 'OFFICIAL_REFERENCE',
    sourceNote: 'Central Meghalaya plateau transit hub for Khasi and Jaintia Hills',
    routingNodeId: 'shillong',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'kohima',
    name: 'Kohima Capital Command',
    code: 'HUB-NL-KOH',
    state: 'Nagaland',
    district: 'Kohima',
    city: 'Kohima',
    address: 'Highland Capital Disaster Staging Depot, NH-29',
    coordinates: [25.6751, 94.1086],
    type: 'DISTRICT',
    status: 'OPERATIONAL',
    storageCapacityKg: 45000,
    coldStorageCapacityKg: 8000,
    fuelStorageCapacityLitres: 20000,
    sourceType: 'OFFICIAL_REFERENCE',
    sourceNote: 'High-altitude tactical relay base for southern Nagaland mountain sectors',
    routingNodeId: 'kohima',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'imphal',
    name: 'Imphal Supply Base',
    code: 'HUB-MN-IMP',
    state: 'Manipur',
    district: 'Imphal West',
    city: 'Imphal',
    address: 'Lamphelpat Relief Distribution Center, NH-37 Axis',
    coordinates: [24.8170, 93.9368],
    type: 'REGIONAL',
    status: 'OPERATIONAL',
    storageCapacityKg: 60000,
    coldStorageCapacityKg: 12000,
    fuelStorageCapacityLitres: 30000,
    sourceType: 'OFFICIAL_REFERENCE',
    sourceNote: 'Apex logistics distribution depot for Manipur valley and hill districts',
    routingNodeId: 'imphal',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'aizawl',
    name: 'Aizawl Forward Depot',
    code: 'HUB-MZ-AZL',
    state: 'Mizoram',
    district: 'Aizawl',
    city: 'Aizawl',
    address: 'Durtlang Forward Supply Terminal, NH-306 Southern End',
    coordinates: [23.7271, 92.7176],
    type: 'FORWARD',
    status: 'OPERATIONAL',
    storageCapacityKg: 40000,
    coldStorageCapacityKg: 9000,
    fuelStorageCapacityLitres: 20000,
    sourceType: 'OFFICIAL_REFERENCE',
    sourceNote: 'Central Mizoram mountain terminus depot for onward distribution',
    routingNodeId: 'aizawl',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const RAW_INITIAL_HUB_INVENTORY: HubInventory[] = [
  // Silchar Strategic Depot
  { id: 'inv-sil-rice', hubId: 'silchar', resourceType: 'FOOD', resourceName: 'Subsistence Rice / Rations', quantity: 5000, unit: 'kg', minimumStock: 1000, maximumCapacity: 10000, reservedQuantity: 0, priority: 'HIGH', lastUpdated: new Date().toISOString() },
  { id: 'inv-sil-meals', hubId: 'silchar', resourceType: 'FOOD', resourceName: 'Ready-to-Eat Emergency Meals', quantity: 3000, unit: 'packs', minimumStock: 500, maximumCapacity: 6000, reservedQuantity: 0, priority: 'MEDIUM', lastUpdated: new Date().toISOString() },
  { id: 'inv-sil-water', hubId: 'silchar', resourceType: 'WATER', resourceName: 'Potable Drinking Water (Cans)', quantity: 8000, unit: 'L', minimumStock: 2000, maximumCapacity: 15000, reservedQuantity: 0, priority: 'HIGH', lastUpdated: new Date().toISOString() },
  { id: 'inv-sil-iv', hubId: 'silchar', resourceType: 'MEDICAL', resourceName: 'IV Fluids (Ringer Lactate)', quantity: 650, unit: 'bottles', minimumStock: 150, maximumCapacity: 1200, reservedQuantity: 0, priority: 'CRITICAL', lastUpdated: new Date().toISOString() },
  { id: 'inv-sil-antivenom', hubId: 'silchar', resourceType: 'MEDICAL', resourceName: 'Polyvalent Snake Antivenom', quantity: 220, unit: 'vials', minimumStock: 50, maximumCapacity: 400, reservedQuantity: 0, priority: 'CRITICAL', lastUpdated: new Date().toISOString() },
  { id: 'inv-sil-diesel', hubId: 'silchar', resourceType: 'FUEL', resourceName: 'High-Flashpoint Diesel Fuel', quantity: 4500, unit: 'L', minimumStock: 1000, maximumCapacity: 10000, reservedQuantity: 0, priority: 'HIGH', lastUpdated: new Date().toISOString() },
  { id: 'inv-sil-rescue', hubId: 'silchar', resourceType: 'RESCUE', resourceName: 'Ghat Collapse Rescue Kits', quantity: 45, unit: 'kits', minimumStock: 10, maximumCapacity: 100, reservedQuantity: 0, priority: 'MEDIUM', lastUpdated: new Date().toISOString() },

  // Dimapur Railhead Depot
  { id: 'inv-dmu-rice', hubId: 'dimapur', resourceType: 'FOOD', resourceName: 'Subsistence Rice / Rations', quantity: 6000, unit: 'kg', minimumStock: 1200, maximumCapacity: 12000, reservedQuantity: 0, priority: 'HIGH', lastUpdated: new Date().toISOString() },
  { id: 'inv-dmu-meals', hubId: 'dimapur', resourceType: 'FOOD', resourceName: 'Ready-to-Eat Emergency Meals', quantity: 2500, unit: 'packs', minimumStock: 400, maximumCapacity: 5000, reservedQuantity: 0, priority: 'MEDIUM', lastUpdated: new Date().toISOString() },
  { id: 'inv-dmu-water', hubId: 'dimapur', resourceType: 'WATER', resourceName: 'Potable Drinking Water (Cans)', quantity: 6000, unit: 'L', minimumStock: 1500, maximumCapacity: 12000, reservedQuantity: 0, priority: 'HIGH', lastUpdated: new Date().toISOString() },
  { id: 'inv-dmu-iv', hubId: 'dimapur', resourceType: 'MEDICAL', resourceName: 'IV Fluids (Ringer Lactate)', quantity: 500, unit: 'bottles', minimumStock: 120, maximumCapacity: 1000, reservedQuantity: 0, priority: 'CRITICAL', lastUpdated: new Date().toISOString() },
  { id: 'inv-dmu-antivenom', hubId: 'dimapur', resourceType: 'MEDICAL', resourceName: 'Polyvalent Snake Antivenom', quantity: 180, unit: 'vials', minimumStock: 40, maximumCapacity: 350, reservedQuantity: 0, priority: 'CRITICAL', lastUpdated: new Date().toISOString() },
  { id: 'inv-dmu-diesel', hubId: 'dimapur', resourceType: 'FUEL', resourceName: 'High-Flashpoint Diesel Fuel', quantity: 5500, unit: 'L', minimumStock: 1200, maximumCapacity: 12000, reservedQuantity: 0, priority: 'HIGH', lastUpdated: new Date().toISOString() },

  // Guwahati Regional Hub
  { id: 'inv-gau-rice', hubId: 'guwahati', resourceType: 'FOOD', resourceName: 'Subsistence Rice / Rations', quantity: 15000, unit: 'kg', minimumStock: 3000, maximumCapacity: 30000, reservedQuantity: 0, priority: 'HIGH', lastUpdated: new Date().toISOString() },
  { id: 'inv-gau-water', hubId: 'guwahati', resourceType: 'WATER', resourceName: 'Potable Drinking Water (Cans)', quantity: 20000, unit: 'L', minimumStock: 5000, maximumCapacity: 40000, reservedQuantity: 0, priority: 'HIGH', lastUpdated: new Date().toISOString() },
  { id: 'inv-gau-iv', hubId: 'guwahati', resourceType: 'MEDICAL', resourceName: 'IV Fluids (Ringer Lactate)', quantity: 1500, unit: 'bottles', minimumStock: 300, maximumCapacity: 3000, reservedQuantity: 0, priority: 'CRITICAL', lastUpdated: new Date().toISOString() },
  { id: 'inv-gau-antivenom', hubId: 'guwahati', resourceType: 'MEDICAL', resourceName: 'Polyvalent Snake Antivenom', quantity: 400, unit: 'vials', minimumStock: 80, maximumCapacity: 800, reservedQuantity: 0, priority: 'CRITICAL', lastUpdated: new Date().toISOString() },
  { id: 'inv-gau-diesel', hubId: 'guwahati', resourceType: 'FUEL', resourceName: 'High-Flashpoint Diesel Fuel', quantity: 12000, unit: 'L', minimumStock: 2500, maximumCapacity: 25000, reservedQuantity: 0, priority: 'HIGH', lastUpdated: new Date().toISOString() },

  // Gangtok STNM Hub
  { id: 'inv-gtk-rice', hubId: 'gangtok', resourceType: 'FOOD', resourceName: 'Subsistence Rice / Rations', quantity: 3500, unit: 'kg', minimumStock: 800, maximumCapacity: 8000, reservedQuantity: 0, priority: 'HIGH', lastUpdated: new Date().toISOString() },
  { id: 'inv-gtk-water', hubId: 'gangtok', resourceType: 'WATER', resourceName: 'Potable Drinking Water (Cans)', quantity: 4000, unit: 'L', minimumStock: 1000, maximumCapacity: 8000, reservedQuantity: 0, priority: 'HIGH', lastUpdated: new Date().toISOString() },
  { id: 'inv-gtk-iv', hubId: 'gangtok', resourceType: 'MEDICAL', resourceName: 'IV Fluids (Ringer Lactate)', quantity: 450, unit: 'bottles', minimumStock: 100, maximumCapacity: 900, reservedQuantity: 0, priority: 'CRITICAL', lastUpdated: new Date().toISOString() },
  { id: 'inv-gtk-antivenom', hubId: 'gangtok', resourceType: 'MEDICAL', resourceName: 'Polyvalent Snake Antivenom', quantity: 150, unit: 'vials', minimumStock: 30, maximumCapacity: 300, reservedQuantity: 0, priority: 'CRITICAL', lastUpdated: new Date().toISOString() },
  { id: 'inv-gtk-diesel', hubId: 'gangtok', resourceType: 'FUEL', resourceName: 'High-Flashpoint Diesel Fuel', quantity: 3000, unit: 'L', minimumStock: 600, maximumCapacity: 6000, reservedQuantity: 0, priority: 'HIGH', lastUpdated: new Date().toISOString() },

  // Shillong Forward Base
  { id: 'inv-shl-rice', hubId: 'shillong', resourceType: 'FOOD', resourceName: 'Subsistence Rice / Rations', quantity: 4000, unit: 'kg', minimumStock: 1000, maximumCapacity: 8000, reservedQuantity: 0, priority: 'HIGH', lastUpdated: new Date().toISOString() },
  { id: 'inv-shl-water', hubId: 'shillong', resourceType: 'WATER', resourceName: 'Potable Drinking Water (Cans)', quantity: 5000, unit: 'L', minimumStock: 1200, maximumCapacity: 10000, reservedQuantity: 0, priority: 'HIGH', lastUpdated: new Date().toISOString() },
  { id: 'inv-shl-iv', hubId: 'shillong', resourceType: 'MEDICAL', resourceName: 'IV Fluids (Ringer Lactate)', quantity: 380, unit: 'bottles', minimumStock: 80, maximumCapacity: 800, reservedQuantity: 0, priority: 'CRITICAL', lastUpdated: new Date().toISOString() },
  { id: 'inv-shl-diesel', hubId: 'shillong', resourceType: 'FUEL', resourceName: 'High-Flashpoint Diesel Fuel', quantity: 3500, unit: 'L', minimumStock: 800, maximumCapacity: 8000, reservedQuantity: 0, priority: 'HIGH', lastUpdated: new Date().toISOString() },

  // Kohima Capital Command
  { id: 'inv-koh-rice', hubId: 'kohima', resourceType: 'FOOD', resourceName: 'Subsistence Rice / Rations', quantity: 4500, unit: 'kg', minimumStock: 1000, maximumCapacity: 9000, reservedQuantity: 0, priority: 'HIGH', lastUpdated: new Date().toISOString() },
  { id: 'inv-koh-water', hubId: 'kohima', resourceType: 'WATER', resourceName: 'Potable Drinking Water (Cans)', quantity: 5500, unit: 'L', minimumStock: 1200, maximumCapacity: 10000, reservedQuantity: 0, priority: 'HIGH', lastUpdated: new Date().toISOString() },
  { id: 'inv-koh-iv', hubId: 'kohima', resourceType: 'MEDICAL', resourceName: 'IV Fluids (Ringer Lactate)', quantity: 320, unit: 'bottles', minimumStock: 90, maximumCapacity: 750, reservedQuantity: 0, priority: 'CRITICAL', lastUpdated: new Date().toISOString() },
  { id: 'inv-koh-diesel', hubId: 'kohima', resourceType: 'FUEL', resourceName: 'High-Flashpoint Diesel Fuel', quantity: 2800, unit: 'L', minimumStock: 700, maximumCapacity: 7000, reservedQuantity: 0, priority: 'HIGH', lastUpdated: new Date().toISOString() },

  // Imphal Supply Base
  { id: 'inv-imp-rice', hubId: 'imphal', resourceType: 'FOOD', resourceName: 'Subsistence Rice / Rations', quantity: 7000, unit: 'kg', minimumStock: 1500, maximumCapacity: 15000, reservedQuantity: 0, priority: 'HIGH', lastUpdated: new Date().toISOString() },
  { id: 'inv-imp-water', hubId: 'imphal', resourceType: 'WATER', resourceName: 'Potable Drinking Water (Cans)', quantity: 7500, unit: 'L', minimumStock: 2000, maximumCapacity: 15000, reservedQuantity: 0, priority: 'HIGH', lastUpdated: new Date().toISOString() },
  { id: 'inv-imp-iv', hubId: 'imphal', resourceType: 'MEDICAL', resourceName: 'IV Fluids (Ringer Lactate)', quantity: 480, unit: 'bottles', minimumStock: 110, maximumCapacity: 1000, reservedQuantity: 0, priority: 'CRITICAL', lastUpdated: new Date().toISOString() },
  { id: 'inv-imp-antivenom', hubId: 'imphal', resourceType: 'MEDICAL', resourceName: 'Polyvalent Snake Antivenom', quantity: 160, unit: 'vials', minimumStock: 35, maximumCapacity: 350, reservedQuantity: 0, priority: 'CRITICAL', lastUpdated: new Date().toISOString() },
  { id: 'inv-imp-diesel', hubId: 'imphal', resourceType: 'FUEL', resourceName: 'High-Flashpoint Diesel Fuel', quantity: 4200, unit: 'L', minimumStock: 1000, maximumCapacity: 10000, reservedQuantity: 0, priority: 'HIGH', lastUpdated: new Date().toISOString() },

  // Aizawl Forward Depot
  { id: 'inv-azl-rice', hubId: 'aizawl', resourceType: 'FOOD', resourceName: 'Subsistence Rice / Rations', quantity: 3800, unit: 'kg', minimumStock: 800, maximumCapacity: 8000, reservedQuantity: 0, priority: 'HIGH', lastUpdated: new Date().toISOString() },
  { id: 'inv-azl-water', hubId: 'aizawl', resourceType: 'WATER', resourceName: 'Potable Drinking Water (Cans)', quantity: 4200, unit: 'L', minimumStock: 1000, maximumCapacity: 8000, reservedQuantity: 0, priority: 'HIGH', lastUpdated: new Date().toISOString() },
  { id: 'inv-azl-iv', hubId: 'aizawl', resourceType: 'MEDICAL', resourceName: 'IV Fluids (Ringer Lactate)', quantity: 310, unit: 'bottles', minimumStock: 75, maximumCapacity: 700, reservedQuantity: 0, priority: 'CRITICAL', lastUpdated: new Date().toISOString() },
  { id: 'inv-azl-diesel', hubId: 'aizawl', resourceType: 'FUEL', resourceName: 'High-Flashpoint Diesel Fuel', quantity: 2900, unit: 'L', minimumStock: 650, maximumCapacity: 6000, reservedQuantity: 0, priority: 'HIGH', lastUpdated: new Date().toISOString() },
];

export const INITIAL_HUB_INVENTORY: HubInventory[] = RAW_INITIAL_HUB_INVENTORY.map((item) => ({
  ...item,
  commodityName: item.resourceName,
  category: item.resourceType,
  lowStockThreshold: item.minimumStock,
}));

export const INITIAL_INVENTORY_TRANSACTIONS: InventoryTransaction[] = [
  {
    id: 'tx-init-01',
    hubId: 'silchar',
    inventoryId: 'inv-sil-iv',
    type: 'ADD',
    quantity: 650,
    previousQuantity: 0,
    newQuantity: 650,
    previousReserved: 0,
    newReserved: 0,
    performedBy: 'Cachar Health Depot Staging Lead',
    note: 'Initial emergency buffer stock intake under monsoon protocol',
    timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
    commodityName: 'IV Fluids (Ringer Lactate)',
    quantityDelta: 650,
    previousAvailable: 0,
    resultingAvailable: 650,
    referenceNote: 'Initial emergency buffer stock intake under monsoon protocol',
  },
  {
    id: 'tx-init-02',
    hubId: 'dimapur',
    inventoryId: 'inv-dmu-diesel',
    type: 'ADD',
    quantity: 5500,
    previousQuantity: 0,
    newQuantity: 5500,
    previousReserved: 0,
    newReserved: 0,
    performedBy: 'Railhead IOCL Logistics Manager',
    note: 'Rail tank wagon discharge to Dimapur buffer tanks',
    timestamp: new Date(Date.now() - 3600000 * 14).toISOString(),
    commodityName: 'High-Flashpoint Diesel Fuel',
    quantityDelta: 5500,
    previousAvailable: 0,
    resultingAvailable: 5500,
    referenceNote: 'Rail tank wagon discharge to Dimapur buffer tanks',
  },
  {
    id: 'tx-init-03',
    hubId: 'guwahati',
    inventoryId: 'inv-gau-rice',
    type: 'ADD',
    quantity: 15000,
    previousQuantity: 0,
    newQuantity: 15000,
    previousReserved: 0,
    newReserved: 0,
    performedBy: 'FCI Khanapara Godown In-Charge',
    note: 'Central food grain buffer stock intake',
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    commodityName: 'Subsistence Rice / Rations',
    quantityDelta: 15000,
    previousAvailable: 0,
    resultingAvailable: 15000,
    referenceNote: 'Central food grain buffer stock intake',
  },
];

export function loadOfflineHubs(): ResponseHub[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HUBS);
    if (!raw) return INITIAL_RESPONSE_HUBS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_RESPONSE_HUBS;
  } catch {
    return INITIAL_RESPONSE_HUBS;
  }
}

export function saveOfflineHubs(hubs: ResponseHub[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.HUBS, JSON.stringify(hubs));
  } catch (err) {
    console.warn('⚠️ [OfflineSync] Failed to save hubs:', err);
  }
}

export function loadOfflineInventory(): HubInventory[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HUB_INVENTORY);
    const source = raw ? JSON.parse(raw) : INITIAL_HUB_INVENTORY;
    const list = Array.isArray(source) && source.length > 0 ? source : INITIAL_HUB_INVENTORY;
    return list.map((item: any) => ({
      ...item,
      commodityName: item.commodityName || item.resourceName || 'Emergency Resource',
      category: item.category || item.resourceType || 'FOOD',
      lowStockThreshold: item.lowStockThreshold ?? item.minimumStock ?? 0,
      resourceName: item.resourceName || item.commodityName || 'Emergency Resource',
      resourceType: item.resourceType || item.category || 'FOOD',
      minimumStock: item.minimumStock ?? item.lowStockThreshold ?? 0,
    }));
  } catch {
    return INITIAL_HUB_INVENTORY;
  }
}

export function saveOfflineInventory(inventory: HubInventory[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.HUB_INVENTORY, JSON.stringify(inventory));
  } catch (err) {
    console.warn('⚠️ [OfflineSync] Failed to save hub inventory:', err);
  }
}

export function loadOfflineTransactions(): InventoryTransaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INVENTORY_TRANSACTIONS);
    if (!raw) return INITIAL_INVENTORY_TRANSACTIONS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_INVENTORY_TRANSACTIONS;
  } catch {
    return INITIAL_INVENTORY_TRANSACTIONS;
  }
}

export function saveOfflineTransactions(transactions: InventoryTransaction[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.INVENTORY_TRANSACTIONS, JSON.stringify(transactions));
  } catch (err) {
    console.warn('⚠️ [OfflineSync] Failed to save inventory transactions:', err);
  }
}


