export type CorridorFlair = 
  | 'r/NH-29-Nagaland'
  | 'r/NH-10-Sikkim'
  | 'r/East-Khasi-Hills'
  | 'r/Assam-DimaHasao'
  | 'r/Arunachal-Tawang'
  | 'r/Manipur-NH-37'
  | 'r/Mizoram-NH-306'
  | 'r/Tripura-NH-08';

export type IncidentType = 
  | 'Landslide' 
  | 'Flash Flood' 
  | 'Bridge Washout' 
  | 'Tree Fall' 
  | 'Road Subsidence';

export type Severity = 
  | 'Total Blockage' 
  | 'Single Lane Passable' 
  | 'Caution/Hazard';

export type AuthorRole = 
  | 'Field Officer (BRO/Police)' 
  | 'Registered Driver' 
  | 'Local Citizen';

export interface LocationData {
  lat: number;
  lng: number;
  placeName: string;
  state?: string;
}

export interface GroundUpdate {
  id: string;
  author: string;
  role: AuthorRole;
  message: string;
  timestamp: string;
}

export interface VoteData {
  upvotes: number;
  downvotes: number;
  userVote: null | 'up' | 'down';
}

export type SyncStatus = 'SYNCED' | 'PENDING';

export interface Incident {
  id: string;
  title: string;
  corridorFlair: CorridorFlair | string;
  incidentType: IncidentType;
  severity: Severity;
  location: LocationData;
  author: {
    name: string;
    role: AuthorRole;
  };
  timestamp: string;
  mediaUrl: string;
  votes: VoteData;
  confidenceScore: number;
  updates: GroundUpdate[];
  sync_status: SyncStatus;
  offlineQueuedAt?: string;
  hasOfficerVerified?: boolean;
}

export type FeedSortOption = 'Hot' | 'New' | 'Critical';

export interface OfflineQueueItem {
  id: string;
  action: 'CREATE_INCIDENT' | 'VOTE_INCIDENT' | 'ADD_UPDATE';
  timestamp: string;
  payload: any;
}
