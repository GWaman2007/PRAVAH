import type { Incident, AuthorRole } from '../types/incident';

export interface SyncNotification {
  id: string;
  timestamp: string;
  itemsSynced: number;
  details: string[];
}

export const STORAGE_KEYS = {
  INCIDENTS: 'pravah_ner_incidents_v2',
  OFFLINE_QUEUE: 'pravah_ner_offline_queue_v2',
  SIMULATED_OFFLINE: 'pravah_simulated_offline_v2',
};

/**
 * Calculates confidence score based on specification:
 * Score = (Upvotes - Downvotes) + (OfficerVerification ? +10 : 0)
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
    (incident.updates && incident.updates.some(u => u.role === 'Field Officer (BRO/Police)')) ||
    false;

  const score = (upvotes - downvotes) + (hasOfficer ? 10 : 0);

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
 * Friendly time-ago formatter
 */
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

/**
 * Severity badge styling helper
 */
export function getSeverityStyle(severity: string): {
  bg: string;
  text: string;
  border: string;
  dot: string;
  pinColor: string;
} {
  switch (severity) {
    case 'Total Blockage':
      return {
        bg: 'bg-red-500/15',
        text: 'text-red-400',
        border: 'border-red-500/30',
        dot: 'bg-red-500',
        pinColor: '#ef4444' // Red
      };
    case 'Single Lane Passable':
      return {
        bg: 'bg-amber-500/15',
        text: 'text-amber-400',
        border: 'border-amber-500/30',
        dot: 'bg-amber-500',
        pinColor: '#f59e0b' // Amber
      };
    case 'Caution/Hazard':
    default:
      return {
        bg: 'bg-yellow-500/15',
        text: 'text-yellow-400',
        border: 'border-yellow-500/30',
        dot: 'bg-yellow-400',
        pinColor: '#eab308' // Yellow
      };
  }
}

/**
 * Role badge styling
 */
export function getRoleBadge(role: AuthorRole): {
  label: string;
  bg: string;
  text: string;
  border: string;
  isOfficer: boolean;
} {
  switch (role) {
    case 'Field Officer (BRO/Police)':
      return {
        label: 'BRO / Police Officer',
        bg: 'bg-emerald-950/70',
        text: 'text-emerald-400 font-semibold',
        border: 'border-emerald-500/40',
        isOfficer: true
      };
    case 'Registered Driver':
      return {
        label: 'Verified Freight Driver',
        bg: 'bg-blue-950/70',
        text: 'text-blue-400',
        border: 'border-blue-500/40',
        isOfficer: false
      };
    case 'Local Citizen':
    default:
      return {
        label: 'Local Citizen Report',
        bg: 'bg-slate-800/80',
        text: 'text-slate-300',
        border: 'border-slate-700',
        isOfficer: false
      };
  }
}
