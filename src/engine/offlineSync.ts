import type { Incident } from '../types';

export const STORAGE_KEYS = {
  INCIDENTS: 'pravah_ner_incidents_v2',
  OFFLINE_QUEUE: 'pravah_ner_offline_queue_v2',
  SIMULATED_OFFLINE: 'pravah_simulated_offline_v2',
};

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
 * LocalStorage / IndexedDB queue utilities
 */
export function getOfflineQueue(): Incident[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
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
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function clearOfflineQueue(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
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
