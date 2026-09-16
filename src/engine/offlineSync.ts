import type { Incident } from '../types';

export const STORAGE_KEYS = {
  INCIDENTS: 'pravah_ner_incidents_v2',
  DISRUPTIONS: 'pravah_ner_disruptions_v2',
  MISSIONS: 'pravah_ner_missions_v2',
  COMMUNITIES: 'pravah_ner_communities_v2',
  OFFLINE_QUEUE: 'pravah_ner_offline_queue_v2',
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
export function getPersistedMissions(): any[] | null {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.MISSIONS) : null;
    return raw ? JSON.parse(raw) : null;
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

