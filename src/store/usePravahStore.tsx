//test

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  UserRole,
  UserContext,
  ActiveView,
  CandidateRoute,
  VehicleProfile,
  VehicleTelemetry,
  AlertEvent,
  Incident,
  CommunityBase,
  CommunityWithCalculation,
  DistrictHealth,
  BROBottleneck,
  BroadcastDraft,
  LanguageId,
  SegmentIncident,
  ReliefMission,
  RealtimeHazardPolygon,
  DraftIncidentPlot,
  RejectedReport,
  RerouteProposal,
  MultimodalAdminIntelInput,
} from '../types';
import {
  verifyAndStructureCitizenReport,
  structureOfficerReport,
  editMissionWithAi,
  editRerouteWithAi,
  type CitizenVerificationResult,
} from '../engine/geminiService';
import {
  getGeminiApiKey,
  setGeminiApiKey as persistGeminiApiKey,
  hasGeminiApiKey,
  GEMINI_CONFIG,
} from '../engine/geminiConfig';
import { NER_SEGMENTS, NER_NODES, VEHICLE_PROFILES, resolveCorridorSegmentId } from '../data/routingNetwork';
import { ensureLngLat, ensureLatLng } from '../engine/gisMath';
import { INITIAL_COMMUNITIES } from '../data/communitiesData';
import { INITIAL_VEHICLES, FLEET_ROUTES, BLACKOUT_ZONES, HAZARD_ZONES } from '../data/fleetData';
import { INITIAL_DISTRICTS_HEALTH, INITIAL_BRO_BOTTLENECKS } from '../data/executiveData';
import { SUPPORTED_LANGUAGES, PRESET_TRANSLATIONS, PHONETIC_READINGS, generateBroadcastForIncident } from '../data/translationsData';
import { findKShortestPaths, evaluateAndRankPaths } from '../engine/routingEngine';
import { calculateCompositePriority } from '../engine/priorityEngine';
import { stepVehicleSimulation, initRouteDistances } from '../engine/telemetryEngine';
import { generateDynamicMissionSuggestions, isMissionOngoing, COMMUNITY_ROUTING_PROFILES } from '../engine/missionEngine';
import { getAuthoritativeHazardPolygons } from '../engine/realtimePolygonService';
import {
  getOfflineQueue,
  queueIncidentOffline,
  clearOfflineQueue,
  getOfflineMutationQueue,
  queueOfflineMutation,
  clearOfflineMutationQueue,
  resolveMissionConflict,
  resolveIncidentConflict,
  resolveDisruptionConflict,
  resolveCommunityConflict,
  type OfflineMutation,
  calculateIncidentConfidence,
  STORAGE_KEYS,
  DEFAULT_INCIDENTS,
  getPersistedIncidents,
  persistIncidents,
  getPersistedDisruptions,
  persistDisruptions,
  getPersistedMissions,
  persistMissions,
  getPersistedCommunities,
  persistCommunities,
} from '../engine/offlineSync';
import {
  isSupabaseConfigured,
  supabase,
  getRealtimeChannel,
  fetchCloudIncidents,
  upsertCloudIncident,
  voteCloudIncident,
  addCloudIncidentUpdate,
  fetchCloudDisruptions,
  upsertCloudDisruption,
  fetchCloudCommunities,
  upsertCloudCommunity,
  fetchCloudMissions,
  upsertCloudMission,
  broadcastCloudMissionDispatched,
  broadcastCloudMissionApproved,
  broadcastCloudMissionDelivered,
  broadcastCloudMissionPendingCloseout,
  broadcastCloudMissionClosedOut,
  fetchCloudHazardZones,
  upsertCloudHazardZone,
  broadcastCloudSOS,
  cancelCloudSOS,
  fetchCloudDraftReports,
  upsertCloudDraftReport,
  deleteCloudDraftReport,
} from '../engine/supabaseClient';

interface PravahStoreContextType {
  // UAC & Role
  userContext: UserContext;
  activeRole: UserRole;
  switchRole: (role: UserRole) => void;

  // View Navigation
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;

  // Theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // Network & Offline PWA
  isOnline: boolean;
  isSimulatedOffline: boolean;
  offlineQueueCount: number;
  offlineQueue: Incident[];
  lastDataSyncTime: number;
  lastOfflineTransitionTime: number | null;
  toggleSimulatedOffline: () => void;
  flushOfflineQueue: () => Promise<{ syncedCount: number; details: string[] }>;
  isSupabaseConfigured: boolean;

  // Routing State
  originHub: string;
  setOriginHub: (hub: string) => void;
  destinationHub: string;
  setDestinationHub: (hub: string) => void;
  selectedVehicle: VehicleProfile;
  setSelectedVehicle: (v: VehicleProfile) => void;
  candidateRoutes: CandidateRoute[];
  selectedRouteIndex: number;
  setSelectedRouteIndex: (idx: number) => void;
  activeDisruptions: Record<string, SegmentIncident>;
  setSegmentDisruption: (segmentId: string, disruption: SegmentIncident | null) => void;
  clearAllDisruptions: () => void;
  triggerScenarioNH6Landslide: () => void;
  triggerScenarioNH29FlashFlood: () => void;
  triggerScenarioHaflongBridgeRisk: () => void;

  // GIS Layers & Weather
  activeLayers: {
    lhz: boolean;
    imd: boolean;
    rainfall: boolean;
    satellite: boolean;
    routes: boolean;
    fleet: boolean;
    roadStatus: boolean;
  };
  toggleLayer: (layer: keyof PravahStoreContextType['activeLayers']) => void;
  imdFilter: 'ALL' | 'Red' | 'Orange' | 'Yellow' | 'Green';
  setImdFilter: (f: 'ALL' | 'Red' | 'Orange' | 'Yellow' | 'Green') => void;
  rainfallMmHr: number;
  setRainfallMmHr: (val: number) => void;
  isMonsoonDownpourSimulated: boolean;
  toggleMonsoonDownpourSimulation: () => void;

  // Telemetry & Watchdog
  vehicles: VehicleTelemetry[];
  selectedVehicleId: string | null;
  setSelectedVehicleId: (id: string | null) => void;
  alerts: AlertEvent[];
  acknowledgeAlert: (alertId: string) => void;
  isSimulationRunning: boolean;
  toggleSimulation: () => void;
  simulationSpeed: number;
  setSimulationSpeed: (speed: number) => void;
  toggleVehicleHalt: (id: string) => void;
  toggleVehicleDeviation: (id: string) => void;
  triggerVehicleSOS: (id: string) => void;
  cancelVehicleSOS: (id: string) => void;

  // Priority Communities
  communities: CommunityWithCalculation[];
  selectedCommunityId: string | null;
  setSelectedCommunityId: (id: string | null) => void;
  advanceCommunityElapsedHours: (communityId: string, hours: number) => void;

  // Field Intelligence Feed
  incidents: Incident[];
  addIncident: (incident: Omit<Incident, 'id' | 'votes' | 'confidenceScore' | 'updates' | 'sync_status'>) => void;
  voteIncident: (incidentId: string, type: 'up' | 'down') => void;
  addIncidentUpdate: (incidentId: string, message: string) => void;

  // Executive & BRO Priority
  districtsHealth: DistrictHealth[];
  broBottlenecks: BROBottleneck[];
  deployBROAsset: (bottleneckId: string, assetName: string) => void;

  // Multilingual & Global Regional Language
  currentLanguage: LanguageId;
  setLanguage: (lang: LanguageId) => void;
  broadcastDrafts: BroadcastDraft[];
  activeBroadcastLanguage: LanguageId;
  setActiveBroadcastLanguage: (lang: LanguageId) => void;
  sendBroadcast: (draftId: string) => void;

  // Closed-Loop Actions
  markMissionDelivered: (communityId: string, vehicleId?: string) => void;

  // Relief Missions & Dispatch
  activeMissions: ReliefMission[];
  selectedMissionId: string | null;
  setSelectedMissionId: (id: string | null) => void;
  customizingMission: ReliefMission | null;
  setCustomizingMission: (mission: ReliefMission | null) => void;
  approveMission: (missionId: string) => void;
  dispatchMission: (missionId: string, vehicleId?: string) => void;
  approveAndDispatchMission: (missionId: string, vehicleId?: string) => void;
  customizeMission: (mission: ReliefMission) => void;
  reportMissionDeliveryByField: (missionId: string) => void;
  adminCloseoutMission: (missionId: string) => void;

  // Real-Time Hazard Polygons (APIs & Cloud)
  hazardPolygons: RealtimeHazardPolygon[];
  refreshHazardPolygons: () => Promise<void>;

  // Driver SOS Distress Signal Intercept
  pendingSOSAlert: AlertEvent | null;
  setPendingSOSAlert: (alert: AlertEvent | null) => void;

  // Interactive Walkthrough Demo
  runDemoStep1: () => void;
  runDemoStep2: () => void;
  runDemoStep3: () => void;
  resetDemoSimulation: () => void;

  // 12. Gemini AI Intelligence Pipeline
  draftPlots: DraftIncidentPlot[];
  approvedDraftPlots: DraftIncidentPlot[];
  rejectedReports: RejectedReport[];
  rerouteProposals: RerouteProposal[];
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;
  submitCitizenReport: (params: {
    rawText: string;
    coords: [number, number];
    reporterName?: string;
    photoUrl?: string;
    voiceNoteUrl?: string;
  }) => Promise<CitizenVerificationResult>;
  submitOfficerReport: (params: {
    rawText: string;
    coords: [number, number];
    officerName?: string;
    nearestLandmark?: string;
    photoUrl?: string;
  }) => Promise<DraftIncidentPlot>;
  addDraftPlot: (plot: DraftIncidentPlot) => void;
  approveDraftPlot: (draftOrId: string | DraftIncidentPlot) => Promise<void>;
  dismissDraftPlot: (draftId: string) => void;
  approveRerouteProposal: (proposalId: string) => void;
  dismissRerouteProposal: (proposalId: string) => void;
  updateMissionWithAi: (missionId: string, prompt: string) => Promise<string>;
  updateRerouteWithAi: (proposalId: string, prompt: string) => Promise<string>;
  pendingMapFocus: { coords: [number, number]; zoom?: number; draftId?: string; timestamp?: number } | null;
  setPendingMapFocus: (focus: { coords: [number, number]; zoom?: number; draftId?: string; timestamp?: number } | null) => void;
  focusMapOnCoords: (coords: [number, number], zoom?: number, draftId?: string) => void;
}

const PravahStoreContext = createContext<PravahStoreContextType | null>(null);

export const PravahStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize routes
  useEffect(() => {
    initRouteDistances(FLEET_ROUTES);
  }, []);

  // 1. UAC & Role Switcher
  const [activeRole, setActiveRole] = useState<UserRole>('SUPER_ADMIN');
  const activeRoleRef = useRef<UserRole>(activeRole);
  useEffect(() => {
    activeRoleRef.current = activeRole;
  }, [activeRole]);

  const userContext: UserContext = useMemo(() => {
    switch (activeRole) {
      case 'SUPER_ADMIN':
        return {
          role: 'SUPER_ADMIN',
          name: 'Shri A. Sarma, IAS',
          department: 'MDoNER National Logistics Command',
          badgeId: 'NER-CMD-001',
          jurisdictionState: 'All 8 NER States',
        };
      case 'FLEET_DISPATCHER':
        return {
          role: 'FLEET_DISPATCHER',
          name: 'Major P. K. Baruah',
          department: 'Regional Emergency Transit Coordination',
          badgeId: 'NER-DISP-044',
          jurisdictionState: 'Interstate Corridors',
        };
      case 'FIELD_OFFICER':
        return {
          role: 'FIELD_OFFICER',
          name: 'Inspector L. Hmar',
          department: 'Mizoram Police / Quick Response Team',
          badgeId: 'MZ-QRT-019',
          activeMissionId: 'MZ-04',
          assignedVehicleId: 'Medic-01',
          jurisdictionState: 'Mizoram (Kolasib Sector)',
        };
      case 'DRIVER':
        return {
          role: 'DRIVER',
          name: 'Rajesh Mech',
          department: 'State Emergency Transport Corps',
          badgeId: 'DRV-NER-882',
          activeMissionId: 'MZ-04',
          assignedVehicleId: 'Medic-01',
          jurisdictionState: 'Corridor NH-306',
        };
    }
  }, [activeRole]);

  const switchRole = useCallback((role: UserRole) => {
    setActiveRole(role);
    if (role === 'DRIVER' || role === 'FIELD_OFFICER') {
      setActiveView('MOBILE_COCKPIT');
    } else {
      setActiveView((current) => (current === 'MOBILE_COCKPIT' ? 'GIS_COMMAND' : current));
    }
  }, []);

  // 2. Navigation View with localStorage persistence across browser refresh
  const [activeView, setActiveView] = useState<ActiveView>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('pravah_active_view');
        if (stored === 'COMMUNITY_PRIORITY') return 'COMMUNITIES';
        const validViews: ActiveView[] = [
          'GIS_COMMAND',
          'MISSIONS',
          'COMMUNITIES',
          'EXECUTIVE_INFRA',
          'GROUND_FEED',
          'BROADCAST_CENTER',
          'MOBILE_COCKPIT',
        ];
        if (stored && validViews.includes(stored as ActiveView)) {
          return stored as ActiveView;
        }
      } catch (err) {
        console.warn('Failed to read pravah_active_view from localStorage', err);
      }
    }
    return 'GIS_COMMAND';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('pravah_active_view', activeView);
      } catch (err) {
        console.warn('Failed to write pravah_active_view to localStorage', err);
      }
    }
  }, [activeView]);

  // Map Camera Focus Queue (for automatic zoom & centering when plots/incidents are approved)
  const [pendingMapFocus, setPendingMapFocus] = useState<{
    coords: [number, number];
    zoom?: number;
    draftId?: string;
    timestamp?: number;
  } | null>(null);

  const focusMapOnCoords = useCallback(
    (coords: [number, number], zoom = 13.5, draftId?: string) => {
      const lngLat = ensureLngLat(coords);
      const focusPayload = { coords: lngLat, zoom, draftId, timestamp: Date.now() };
      setPendingMapFocus(focusPayload);
      setActiveView('GIS_COMMAND');

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('pravah:fly-to', {
            detail: focusPayload,
          })
        );
        // Double dispatch after short delay to ensure MapLibre container resize/mount has completed
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent('pravah:fly-to', {
              detail: focusPayload,
            })
          );
        }, 120);
      }
    },
    [setActiveView]
  );

  // 3. Theme
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('pravah_theme');
      if (stored === 'dark' || stored === 'light') return stored;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('pravah_theme', next);
      return next;
    });
  }, []);

  // 4. Network Status & Offline PWA Sync
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.SIMULATED_OFFLINE) === 'true';
  });
  const [realOnline, setRealOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const isOnline = realOnline && !isSimulatedOffline;
  const [offlineQueue, setOfflineQueue] = useState<Incident[]>(() => getOfflineQueue());
  const [lastDataSyncTime, setLastDataSyncTime] = useState<number>(() => Date.now());
  const [lastOfflineTransitionTime, setLastOfflineTransitionTime] = useState<number | null>(() => {
    return localStorage.getItem(STORAGE_KEYS.SIMULATED_OFFLINE) === 'true' ? Date.now() - 360000 : null;
  });

  useEffect(() => {
    const handleOnline = () => setRealOnline(true);
    const handleOffline = () => setRealOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Universal Offline Queue Flush & Conflict Reconciliation
  const flushOfflineQueue = useCallback(async () => {
    const queue = getOfflineQueue();
    const mutationQueue = getOfflineMutationQueue();
    const totalCount = queue.length + mutationQueue.length;
    const details: string[] = [];

    // 1. Flush any pending offline mutations to Cloud DB
    if (mutationQueue.length > 0) {
      for (const mutation of mutationQueue) {
        try {
          if (mutation.type === 'APPROVE_MISSION') {
            if (isSupabaseConfigured) {
              await upsertCloudMission(mutation.payload);
              broadcastCloudMissionApproved(mutation.payload);
            }
            details.push(`Approved Mission: ${mutation.payload.id}`);
          } else if (mutation.type === 'DISPATCH_MISSION') {
            if (isSupabaseConfigured) {
              await upsertCloudMission(mutation.payload);
              broadcastCloudMissionDispatched(mutation.payload, mutation.payload.assignedVehicleId);
            }
            details.push(`Dispatched Mission: ${mutation.payload.id}`);
          } else if (mutation.type === 'DELIVER_MISSION') {
            if (isSupabaseConfigured) {
              await upsertCloudMission(mutation.payload);
              broadcastCloudMissionPendingCloseout(mutation.payload.id, mutation.payload.assignedVehicleId);
            }
            details.push(`Delivered Mission: ${mutation.payload.id}`);
          } else if (mutation.type === 'CLOSEOUT_MISSION') {
            if (isSupabaseConfigured) {
              if (mutation.payload?.mission) await upsertCloudMission(mutation.payload.mission);
              if (mutation.payload?.community) await upsertCloudCommunity(mutation.payload.community);
              broadcastCloudMissionClosedOut(mutation.entityId, mutation.payload?.community?.id);
            }
            details.push(`Closed Out Mission: ${mutation.entityId}`);
          } else if (mutation.type === 'UPSERT_MISSION') {
            if (isSupabaseConfigured) {
              await upsertCloudMission(mutation.payload);
            }
            details.push(`Synced Mission: ${mutation.entityId}`);
          } else if (mutation.type === 'UPSERT_DISRUPTION') {
            if (isSupabaseConfigured) {
              await upsertCloudDisruption(mutation.entityId, mutation.payload);
            }
            details.push(`Disruption: ${mutation.entityId}`);
          } else if (mutation.type === 'UPSERT_COMMUNITY') {
            if (isSupabaseConfigured) {
              await upsertCloudCommunity(mutation.payload);
            }
            details.push(`Community: ${mutation.entityId}`);
          } else if (mutation.type === 'UPSERT_INCIDENT') {
            if (isSupabaseConfigured) {
              await upsertCloudIncident(mutation.payload);
            }
            details.push(`Incident: ${mutation.payload.title}`);
          } else if (mutation.type === 'ADD_INCIDENT_UPDATE') {
            if (isSupabaseConfigured) {
              await addCloudIncidentUpdate(mutation.entityId, mutation.payload.update, mutation.payload.allUpdates);
            }
            details.push(`Incident Update: ${mutation.entityId}`);
          } else if (mutation.type === 'VOTE_INCIDENT') {
            if (isSupabaseConfigured) {
              await upsertCloudIncident(mutation.payload);
            }
          }
        } catch (err) {
          console.warn('[PRAVAH] Error flushing mutation:', mutation, err);
        }
      }
      clearOfflineMutationQueue();
    }

    // 2. Synchronize legacy queued incident reports
    if (queue.length > 0) {
      for (const item of queue) {
        const syncedItem: Incident = { ...item, sync_status: 'SYNCED' };
        if (isSupabaseConfigured) {
          await upsertCloudIncident(syncedItem);
          const matchedCorridor = item.location.corridorId || 'SEG-SIL-KOL';
          await upsertCloudDisruption(matchedCorridor, {
            status: item.severity === 'Total Blockage' ? ('TOTAL_BLOCKAGE' as const) : ('SINGLE_LANE_PASSABLE' as const),
            cause: item.incidentType,
            description: item.title,
            reportedBy: `${item.author.name} (${item.author.role})`,
          });
        }
        if (socketRef.current?.connected) {
          socketRef.current.emit('SUBMIT_INCIDENT', syncedItem);
        }
        details.push(item.title);
      }
      clearOfflineQueue();
      setOfflineQueue([]);
    }

    // 3. Bidirectional Reconciliation: Fetch cloud DB state and reconcile with local storage
    if (isSupabaseConfigured) {
      try {
        const [cloudMissions, cloudIncidents, cloudDisruptions, cloudCommunities] = await Promise.all([
          fetchCloudMissions(),
          fetchCloudIncidents(),
          fetchCloudDisruptions(),
          fetchCloudCommunities(),
        ]);

        if (cloudMissions && cloudMissions.length > 0) {
          const cleanCloud = cloudMissions.filter(
            (m) => m && typeof m.id === 'string' && !m.id.startsWith('MISSION-') && !m.id.startsWith('MOCK-')
          );
          setActiveMissions((prev) => {
            const next = resolveMissionConflict(prev, cleanCloud);
            persistMissions(next);
            return next;
          });

          // Sync vehicle status for active in-transit cloud missions
          cleanCloud.forEach((cm) => {
            if (
              (cm.status === 'IN_TRANSIT' || cm.status === 'PENDING_ADMIN_CLOSEOUT') &&
              cm.assignedVehicleId
            ) {
              setVehicles((prev) =>
                prev.map((v) =>
                  v.vehicle_id === cm.assignedVehicleId
                    ? {
                        ...v,
                        status: 'ON_ROUTE',
                        mission_id: cm.id,
                        assigned_route_id: cm.assignedRouteId,
                        destination_name: cm.destinationName,
                      }
                    : v
                )
              );
            }
          });
        }

        if (cloudIncidents && cloudIncidents.length > 0) {
          setIncidents((prev) => {
            const next = resolveIncidentConflict(prev, cloudIncidents);
            persistIncidents(next);
            return next;
          });
        }

        if (cloudDisruptions) {
          setActiveDisruptions((prev) => {
            const next = resolveDisruptionConflict(prev, cloudDisruptions);
            persistDisruptions(next);
            return next;
          });
        }

        if (cloudCommunities && cloudCommunities.length > 0) {
          setRawCommunities((prev) => {
            const next = resolveCommunityConflict(prev, cloudCommunities);
            persistCommunities(next);
            return next;
          });
        }
      } catch (err) {
        console.warn('[PRAVAH] Error reconciling cloud state after flush:', err);
      }
    }

    setLastDataSyncTime(Date.now());
    return { syncedCount: totalCount, details };
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline) {
      const mutCount = getOfflineMutationQueue().length;
      const incCount = getOfflineQueue().length;
      if (mutCount > 0 || incCount > 0) {
        flushOfflineQueue();
      }
    }
  }, [isOnline, flushOfflineQueue]);

  const toggleSimulatedOffline = useCallback(() => {
    setIsSimulatedOffline((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEYS.SIMULATED_OFFLINE, String(next));
      if (next) {
        setLastOfflineTransitionTime(Date.now());
      } else {
        setLastOfflineTransitionTime(null);
        setLastDataSyncTime(Date.now());
        // Automatically flush queue when coming back online
        setTimeout(() => {
          flushOfflineQueue();
        }, 150);
      }
      return next;
    });
  }, [flushOfflineQueue]);

  // Auto-flush queue whenever actual browser network comes online
  useEffect(() => {
    const handleBrowserOnline = () => {
      setIsSimulatedOffline(false);
      localStorage.setItem(STORAGE_KEYS.SIMULATED_OFFLINE, 'false');
      setLastOfflineTransitionTime(null);
      setLastDataSyncTime(Date.now());
      setTimeout(() => {
        flushOfflineQueue();
      }, 200);
    };

    window.addEventListener('online', handleBrowserOnline);
    return () => window.removeEventListener('online', handleBrowserOnline);
  }, [flushOfflineQueue]);

  // 5. GIS, Weather & Routing
  const [originHub, setOriginHub] = useState<string>('guwahati');
  const [destinationHub, setDestinationHub] = useState<string>('kohima');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleProfile>(VEHICLE_PROFILES[0]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);

  const [activeLayers, setActiveLayers] = useState({
    lhz: true,
    imd: true,
    rainfall: true,
    satellite: false,
    routes: true,
    fleet: true,
    roadStatus: false, // Default hidden so default map is clean!
  });

  const toggleLayer = useCallback((layer: keyof PravahStoreContextType['activeLayers']) => {
    setActiveLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  const [imdFilter, setImdFilter] = useState<'ALL' | 'Red' | 'Orange' | 'Yellow' | 'Green'>('ALL');
  const [rainfallMmHr, setRainfallMmHr] = useState<number>(24);
  const [isMonsoonDownpourSimulated, setIsMonsoonDownpourSimulated] = useState<boolean>(false);

  const toggleMonsoonDownpourSimulation = useCallback(() => {
    setIsMonsoonDownpourSimulated((prev) => {
      const next = !prev;
      setRainfallMmHr(next ? 58 : 24);
      return next;
    });
  }, []);

  // Active road disruptions map
  const [activeDisruptions, setActiveDisruptions] = useState<Record<string, SegmentIncident>>(() => {
    const persisted = typeof window !== 'undefined' ? getPersistedDisruptions() : null;
    return persisted || {
      'SEG-DIM-KOH-MAIN': {
        status: 'TOTAL_BLOCKAGE',
        cause: 'Landslide_Debris',
        description: 'Major mudflow at Pagla Pahar KM-144',
        reportedBy: 'Field Officer (BRO Project Sewak)',
      },
      'SEG-SIL-KOL': {
        status: 'SINGLE_LANE_PASSABLE',
        cause: 'Road_Subsidence',
        description: 'Bilkhawthlir silt collapse - 18T load restriction',
        reportedBy: 'Insp. L. Hmar',
      },
    };
  });

  useEffect(() => {
    persistDisruptions(activeDisruptions);
  }, [activeDisruptions]);

  const setSegmentDisruption = useCallback((segmentId: string, disruption: SegmentIncident | null) => {
    setActiveDisruptions((prev) => {
      const next = { ...prev };
      if (!disruption) {
        delete next[segmentId];
      } else {
        next[segmentId] = disruption;
      }
      persistDisruptions(next);
      return next;
    });

    if (isOnline && isSupabaseConfigured) {
      upsertCloudDisruption(segmentId, disruption);
    } else {
      queueOfflineMutation({ type: 'UPSERT_DISRUPTION', entityId: segmentId, payload: disruption });
    }
  }, [isOnline]);

  const clearAllDisruptions = useCallback(() => {
    setActiveDisruptions({});
    persistDisruptions({});
    if (isOnline && isSupabaseConfigured) {
      fetchCloudDisruptions().then((cloudDisruptions) => {
        if (cloudDisruptions) {
          Object.keys(cloudDisruptions).forEach((corridorId) => {
            upsertCloudDisruption(corridorId, null);
          });
        }
      });
    }
  }, [isOnline]);

  const triggerScenarioNH6Landslide = useCallback(() => {
    setActiveDisruptions((prev) => ({
      ...prev,
      'SEG-SHL-SIL-MAIN': {
        status: 'TOTAL_BLOCKAGE',
        cause: 'Major Hillside Slope Failure',
        description: 'Slope collapse near Lubha Bridge cutting NH-6. Impassable for all vehicles.',
        reportedBy: 'Meghalaya PWD & BRO Project Setuk',
      },
    }));
  }, []);

  const triggerScenarioNH29FlashFlood = useCallback(() => {
    setActiveDisruptions((prev) => ({
      ...prev,
      'SEG-DIM-KOH-MAIN': {
        status: 'TOTAL_BLOCKAGE',
        cause: 'Flash Flood & Mudflow',
        description: 'Torrential mudflow at Pagla Pahar KM-144 on NH-29. Roadbed compromised.',
        reportedBy: 'BRO Project Sewak / Nagaland Police',
      },
    }));
  }, []);

  const triggerScenarioHaflongBridgeRisk = useCallback(() => {
    setActiveDisruptions((prev) => ({
      ...prev,
      'SEG-NOW-HAF-SIL': {
        status: 'SINGLE_LANE_PASSABLE',
        cause: 'Bridge Structural Scour',
        description: 'Barail Pass bridge foundation scour. 18T axle weight restriction strictly enforced.',
        reportedBy: 'Assam PWD Disaster Cell',
      },
    }));
  }, []);

  // Calculate Candidate Routes
  const candidateRoutes = useMemo(() => {
    const rawPaths = findKShortestPaths(originHub, destinationHub, NER_SEGMENTS, 5);
    return evaluateAndRankPaths(rawPaths, NER_SEGMENTS, selectedVehicle, rainfallMmHr, activeDisruptions);
  }, [originHub, destinationHub, selectedVehicle, rainfallMmHr, activeDisruptions]);

  // 6. Telemetry & Watchdog
  const [vehicles, setVehicles] = useState<VehicleTelemetry[]>(() =>
    INITIAL_VEHICLES.map((v) => ({
      ...v,
      status: 'AVAILABLE' as const,
      speed_kmh: 0,
      mission_id: '',
      route_progress_pct: 0,
    }))
  );
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<AlertEvent[]>([
    {
      id: 'init-alert-01',
      vehicle_id: 'Oxy-Tanker-04',
      vehicle_name: 'Oxy-Tanker-04 (Cryogenic 32T)',
      cargo_type: 'Liquid Medical Oxygen',
      timestamp: new Date().toISOString(),
      severity: 'WARNING',
      type: 'WATCHDOG_OVERDUE_AMBER',
      title: 'DEAD-ZONE WATCHDOG: Overdue in 29th Mile Teesta Gorge',
      message: 'Vehicle is 14 minutes inside cellular blackout zone. Approaching maximum transit SLA buffer.',
      coords: [27.0200, 88.4600],
      acknowledged: false,
    },
  ]);
  const [isSimulationRunning, setIsSimulationRunning] = useState<boolean>(true);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1);

  // 6b. Preemptive Relief Missions (0 Ongoing initial state; dynamic suggestions from community deficits)
  const [activeMissions, setActiveMissions] = useState<ReliefMission[]>(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('pravah_relief_missions');
        if (
          stored &&
          (stored.includes('"MISSION-') ||
            stored.includes('"MOCK-') ||
            stored.includes('MISSION-MZ-') ||
            stored.includes('ROUTE-MZ-02') ||
            stored.includes('ROUTE-MZ-04') ||
            stored.includes('ROUTE-NL-01'))
        ) {
          localStorage.removeItem('pravah_relief_missions');
        }
      } catch {
        // ignore
      }
    }
    const persisted = typeof window !== 'undefined' ? getPersistedMissions() : null;
    if (persisted && persisted.length > 0) {
      // Filter out stale mock in-transit missions so ongoing starts with real user-approved missions
      const cleaned = persisted.filter(
        (pm: ReliefMission) =>
          !pm.id.startsWith('MISSION-') &&
          !pm.id.startsWith('MOCK-') &&
          (pm.status === 'APPROVED' ||
            pm.status === 'IN_TRANSIT' ||
            pm.status === 'PENDING_ADMIN_CLOSEOUT' ||
            pm.status === 'SUGGESTED' ||
            pm.status === 'DELIVERED')
      );
      if (cleaned.length > 0) {
        // Evict any local SUGGESTED mission if an active (APPROVED, IN_TRANSIT, PENDING_ADMIN_CLOSEOUT) mission exists for that community
        const activeCommIds = new Set(
          cleaned
            .filter((m) => m.status === 'APPROVED' || m.status === 'IN_TRANSIT' || m.status === 'PENDING_ADMIN_CLOSEOUT')
            .map((m) => m.communityId)
        );
        const deduplicated = cleaned.filter((m) => !(m.status === 'SUGGESTED' && activeCommIds.has(m.communityId)));

        // Sanitize any route references using COMMUNITY_ROUTING_PROFILES
        const sanitized = deduplicated.map((pm: ReliefMission) => {
          const profile = COMMUNITY_ROUTING_PROFILES[pm.communityId];
          if (profile && pm.assignedRouteId !== profile.routeId) {
            const r = FLEET_ROUTES[profile.routeId];
            return {
              ...pm,
              assignedRouteId: profile.routeId,
              suggestedDetour: profile.detour,
              originWarehouseId: profile.depotId,
              originWarehouseName: profile.depotName,
              originCoords: profile.depotCoords,
              routeGeometry: r?.coordinates || pm.routeGeometry,
              routeDistanceKm: r?.distanceKm || pm.routeDistanceKm,
              routeDurationMinutes: r?.expectedDurationMinutes || pm.routeDurationMinutes,
              destinationEndpoint: r?.coordinates ? r.coordinates[r.coordinates.length - 1] : pm.destinationEndpoint,
            };
          }
          return pm;
        });
        return sanitized;
      }
    }
    // Generate realistic dynamic suggestions from community depletion metrics
    return generateDynamicMissionSuggestions(INITIAL_COMMUNITIES, INITIAL_VEHICLES, []);
  });
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(() => {
    const first = activeMissions.find((m) => m.status === 'SUGGESTED' || m.status === 'IN_TRANSIT');
    return first?.id || null;
  });
  const activeMissionsRef = useRef<ReliefMission[]>(activeMissions);

  // 6c. Real-Time Hazard Polygons (APIs & Supabase Cloud)
  const [hazardPolygons, setHazardPolygons] = useState<RealtimeHazardPolygon[]>([]);

  const refreshHazardPolygons = useCallback(async () => {
    try {
      const polygons = await getAuthoritativeHazardPolygons();
      if (polygons && polygons.length > 0) {
        setHazardPolygons(polygons);
      }
      if (isSupabaseConfigured) {
        const cloudZones = await fetchCloudHazardZones();
        if (cloudZones && cloudZones.length > 0) {
          setHazardPolygons((prev) => {
            const merged = new Map(prev.map((p) => [p.id, p]));
            cloudZones.forEach((cz) => merged.set(cz.id, cz));
            return Array.from(merged.values());
          });
        }
      }
    } catch (err) {
      console.warn('[PRAVAH] Failed to refresh hazard polygons:', err);
    }
  }, []);

  useEffect(() => {
    refreshHazardPolygons();
  }, [refreshHazardPolygons]);


  useEffect(() => {
    activeMissionsRef.current = activeMissions;
    persistMissions(activeMissions);
  }, [activeMissions]);

  const [customizingMission, setCustomizingMission] = useState<ReliefMission | null>(null);
  const [pendingSOSAlert, setPendingSOSAlert] = useState<AlertEvent | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const toggleSimulation = useCallback(() => setIsSimulationRunning((p) => !p), []);

  const acknowledgeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
  }, []);

  const toggleVehicleHalt = useCallback((id: string) => {
    setVehicles((prev) =>
      prev.map((v) => (v.vehicle_id === id ? { ...v, is_stopped_manual: !v.is_stopped_manual } : v))
    );
  }, []);

  const toggleVehicleDeviation = useCallback((id: string) => {
    setVehicles((prev) =>
      prev.map((v) => (v.vehicle_id === id ? { ...v, is_deviated_manual: !v.is_deviated_manual } : v))
    );
  }, []);

  const triggerVehicleSOS = useCallback((id: string) => {
    setVehicles((prev) =>
      prev.map((v) => (v.vehicle_id === id ? { ...v, is_sos_manual: true, status: 'SOS_ALERT' } : v))
    );
    const target = vehicles.find((v) => v.vehicle_id === id);
    if (target) {
      const sosAlert: AlertEvent = {
        id: `sos-${id}-${Date.now()}`,
        vehicle_id: id,
        vehicle_name: target.vehicle_name,
        cargo_type: target.cargo_type,
        timestamp: new Date().toISOString(),
        severity: 'CRITICAL',
        type: 'SOS_TRIGGERED',
        title: 'EMERGENCY SOS PANIC BEACON ACTIVATED',
        message: `Manual SOS triggered by ${target.driver_name} (${target.driver_phone}) on Mission ${target.mission_id}! Immediate search & rescue dispatched.`,
        coords: target.current_coords,
        acknowledged: false,
      };
      setAlerts((prev) => [sosAlert, ...prev]);

      // RBAC: Only Super Admin and Fleet Dispatcher see the executive QRT dispatch modal
      if (activeRoleRef.current === 'SUPER_ADMIN' || activeRoleRef.current === 'FLEET_DISPATCHER') {
        setPendingSOSAlert(sosAlert);
      }

      if (socketRef.current?.connected) {
        socketRef.current.emit('TRIGGER_DRIVER_SOS', { vehicleId: id, alert: sosAlert });
      }
      if (isSupabaseConfigured) {
        broadcastCloudSOS(id, sosAlert);
      }
    }
  }, [vehicles]);

  const cancelVehicleSOS = useCallback((id: string) => {
    setVehicles((prev) =>
      prev.map((v) => (v.vehicle_id === id ? { ...v, is_sos_manual: false, status: 'ON_ROUTE' } : v))
    );
    setPendingSOSAlert((curr) => (curr?.vehicle_id === id ? null : curr));
    if (socketRef.current?.connected) {
      socketRef.current.emit('CANCEL_DRIVER_SOS', { vehicleId: id });
    }
    if (isSupabaseConfigured) {
      cancelCloudSOS(id);
    }
  }, []);

  // Telemetry simulation tick loop
  useEffect(() => {
    if (!isSimulationRunning) return;
    const interval = setInterval(() => {
      if (isOnline) {
        setLastDataSyncTime(Date.now());
      }
      setVehicles((prev) => {
        let allNewAlerts: AlertEvent[] = [];
        const nextVehicles = prev.map((v) => {
          // Explicit mission association: find vehicle's assigned mission from latest ref
          const assignedMission = activeMissionsRef.current.find(
            (m) => m.assignedVehicleId === v.vehicle_id || m.id === v.mission_id
          );

          // If vehicle is available, delivered-idle, or has no active ongoing mission, keep stationary
          if (
            v.status === 'AVAILABLE' ||
            v.status === 'DELIVERED_IDLE' ||
            v.status === 'DELIVERED_COMPLETED' ||
            !assignedMission ||
            !isMissionOngoing(assignedMission)
          ) {
            return {
              ...v,
              speed_kmh: 0,
            };
          }

          let route = FLEET_ROUTES[v.assigned_route_id] || FLEET_ROUTES['ROUTE-MZ-04'];
          if (assignedMission && assignedMission.routeGeometry && assignedMission.routeGeometry.length >= 2) {
            route = {
              id: assignedMission.assignedRouteId || assignedMission.id,
              name: assignedMission.suggestedDetour || assignedMission.destinationName,
              startHub: assignedMission.originWarehouseName,
              endHub: assignedMission.destinationName,
              distanceKm: assignedMission.routeDistanceKm || route?.distanceKm || 60,
              expectedDurationMinutes: assignedMission.routeDurationMinutes || route?.expectedDurationMinutes || 100,
              coordinates: assignedMission.routeGeometry,
              deviationPath: route?.deviationPath || [],
            };
          }

          const deltaSec = 2 * simulationSpeed;
          const { updatedVehicle, newAlerts } = stepVehicleSimulation(
            v,
            route,
            BLACKOUT_ZONES,
            HAZARD_ZONES,
            deltaSec
          );
          if (newAlerts.length > 0) {
            allNewAlerts = [...allNewAlerts, ...newAlerts];
          }
          return updatedVehicle;
        });

        if (allNewAlerts.length > 0) {
          setAlerts((a) => [...allNewAlerts, ...a]);
        }
        return nextVehicles;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSimulationRunning, simulationSpeed]);

  // 7. Community Preemptive Depletion & Priority
  const [rawCommunities, setRawCommunities] = useState<CommunityBase[]>(() => {
    if (typeof window !== 'undefined') {
      const persisted = getPersistedCommunities();
      if (persisted && Array.isArray(persisted) && persisted.length > 0) {
        return persisted;
      }
    }
    return INITIAL_COMMUNITIES;
  });

  const rawCommunitiesRef = useRef<CommunityBase[]>(rawCommunities);
  useEffect(() => {
    rawCommunitiesRef.current = rawCommunities;
    persistCommunities(rawCommunities);
  }, [rawCommunities]);

  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('pravah_selected_community_id');
        if (stored) return stored;
      } catch {}
    }
    return null;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        if (selectedCommunityId) {
          localStorage.setItem('pravah_selected_community_id', selectedCommunityId);
        } else {
          localStorage.removeItem('pravah_selected_community_id');
        }
      } catch {}
    }
  }, [selectedCommunityId]);

  const communities: CommunityWithCalculation[] = useMemo(() => {
    return rawCommunities.map((c) => {
      const calc = calculateCompositePriority(c);
      return {
        ...c,
        metrics: calc,
      };
    }).sort((a, b) => b.metrics.finalScore - a.metrics.finalScore);
  }, [rawCommunities]);

  const advanceCommunityElapsedHours = useCallback((communityId: string, hours: number) => {
    let targetCommunity: CommunityBase | undefined;
    setRawCommunities((prev) => {
      const next = prev.map((c) => {
        if (c.id === communityId) {
          const updated = { ...c, elapsedTimeHours: Math.max(0, c.elapsedTimeHours + hours) };
          targetCommunity = updated;
          return updated;
        }
        return c;
      });
      persistCommunities(next);
      return next;
    });

    if (targetCommunity) {
      if (isOnline && isSupabaseConfigured) {
        upsertCloudCommunity(targetCommunity);
      } else {
        queueOfflineMutation({ type: 'UPSERT_COMMUNITY', entityId: communityId, payload: targetCommunity });
      }
    }
  }, [isOnline]);

  // 8. Field Intelligence Feed
  const [incidents, setIncidents] = useState<Incident[]>(() => {
    if (typeof window !== 'undefined') {
      return getPersistedIncidents();
    }
    return DEFAULT_INCIDENTS;
  });

  useEffect(() => {
    persistIncidents(incidents);
  }, [incidents]);

  // 9. Executive Macro Analytics & BRO Priority
  const [districtsHealth, setDistrictsHealth] = useState<DistrictHealth[]>(INITIAL_DISTRICTS_HEALTH);
  const [broBottlenecks, setBroBottlenecks] = useState<BROBottleneck[]>(INITIAL_BRO_BOTTLENECKS);

  const deployBROAsset = useCallback((bottleneckId: string, assetName: string) => {
    setBroBottlenecks((prev) =>
      prev.map((b) =>
        b.id === bottleneckId
          ? {
            ...b,
            status: 'CREW_DEPLOYED' as const,
            recommendedAsset: `${assetName} (Deployed & Active on Site)`,
            estimatedClearanceHours: Math.max(2, Math.round(b.estimatedClearanceHours * 0.5)),
            lastUpdated: 'Just now',
          }
          : b
      )
    );
  }, []);

  // 10. Multilingual Emergency Broadcasts & Global Interface Language
  const [currentLanguage, setCurrentLanguage] = useState<LanguageId>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('pravah_language') as LanguageId;
      if (stored && ['en', 'hi', 'as', 'bn', 'mn'].includes(stored)) {
        return stored;
      }
    }
    return 'en';
  });

  const [activeBroadcastLanguage, setActiveBroadcastLanguage] = useState<LanguageId>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('pravah_language') as LanguageId;
      if (stored && ['en', 'hi', 'as', 'bn', 'mn'].includes(stored)) {
        return stored;
      }
    }
    return 'en';
  });

  const setLanguage = useCallback((lang: LanguageId) => {
    setCurrentLanguage(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pravah_language', lang);
    }
    setActiveBroadcastLanguage(lang);
  }, []);
  const [broadcastDrafts, setBroadcastDrafts] = useState<BroadcastDraft[]>([
    {
      id: 'draft-nh29',
      incidentId: 'inc-nh29-kohima',
      highway: 'NH-29',
      location: 'Kohima Bypass (Km 142)',
      disruptionType: 'Major Landslide & Total Blockage',
      translations: PRESET_TRANSLATIONS['inc-nh29-kohima'],
      phoneticFallback: PHONETIC_READINGS['inc-nh29-kohima'],
      channels: [
        {
          channel: 'DRIVER_SMS',
          targetAudience: '142 Commercial Freight & Tanker Drivers',
          totalRecipients: 142,
          sentCount: 142,
          deliveredCount: 139,
          readCount: 124,
          failedCount: 3,
          status: 'DELIVERED',
        },
        {
          channel: 'WHATSAPP_CARD',
          targetAudience: 'Regional Fleet Dispatchers & Logistics Hubs',
          totalRecipients: 48,
          sentCount: 48,
          deliveredCount: 48,
          readCount: 44,
          failedCount: 0,
          status: 'DELIVERED',
        },
        {
          channel: 'DISTRICT_SIREN',
          targetAudience: 'Kohima & Chumukedima DDMA Siren Nodes',
          totalRecipients: 4,
          sentCount: 4,
          deliveredCount: 4,
          readCount: 4,
          failedCount: 0,
          status: 'DELIVERED',
        },
      ],
      createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
      dispatchedAt: new Date(Date.now() - 25 * 60000).toISOString(),
      status: 'SENT',
    },
    {
      id: 'draft-nh306',
      incidentId: 'inc-nh306-kolasib',
      highway: 'NH-306',
      location: 'Bilkhawthlir Hill Escarpment',
      disruptionType: 'Silt Subsidence & Load Restriction',
      translations: PRESET_TRANSLATIONS['inc-nh306-kolasib'],
      phoneticFallback: PHONETIC_READINGS['inc-nh306-kolasib'],
      channels: [
        {
          channel: 'DRIVER_SMS',
          targetAudience: 'Mizoram Arterial Transport Drivers',
          totalRecipients: 84,
          sentCount: 84,
          deliveredCount: 80,
          readCount: 71,
          failedCount: 4,
          status: 'DELIVERED',
        },
        {
          channel: 'WHATSAPP_CARD',
          targetAudience: 'Silchar & Kolasib Logistics Coops',
          totalRecipients: 26,
          sentCount: 26,
          deliveredCount: 26,
          readCount: 22,
          failedCount: 0,
          status: 'DELIVERED',
        },
        {
          channel: 'DISTRICT_SIREN',
          targetAudience: 'Kolasib District Emergency Operations',
          totalRecipients: 2,
          sentCount: 2,
          deliveredCount: 2,
          readCount: 2,
          failedCount: 0,
          status: 'DELIVERED',
        },
      ],
      createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
      dispatchedAt: new Date(Date.now() - 10 * 60000).toISOString(),
      status: 'SENT',
    },
  ]);

  const sendBroadcast = useCallback((draftId: string) => {
    setBroadcastDrafts((prev) =>
      prev.map((d) => {
        if (d.id === draftId) {
          return {
            ...d,
            status: 'SENT',
            dispatchedAt: new Date().toISOString(),
            channels: d.channels.map((ch) => ({
              ...ch,
              status: 'DELIVERED',
              sentCount: ch.totalRecipients,
              deliveredCount: Math.round(ch.totalRecipients * 0.96),
              readCount: Math.round(ch.totalRecipients * 0.85),
            })),
          };
        }
        return d;
      })
    );
  }, []);

  // =========================================================================
  // 11. CROSS-MODULE REACTIVE EVENT BUS: Adding an incident triggers cascades
  // =========================================================================
  const addIncident = useCallback((
    incidentData: Omit<Incident, 'id' | 'votes' | 'confidenceScore' | 'updates' | 'sync_status'>
  ) => {
    const isOfficer =
      incidentData.author.role === 'Field Officer (BRO/Police)' ||
      userContext.role === 'FIELD_OFFICER';

    const newIncident: Incident = {
      ...incidentData,
      id: `inc-${Date.now()}`,
      votes: { upvotes: 1, downvotes: 0, userVote: 'up' },
      confidenceScore: isOfficer ? 11 : 1,
      hasOfficerVerified: isOfficer,
      sync_status: isOnline ? 'SYNCED' : 'PENDING',
      updates: [],
    };

    if (!isOnline) {
      queueIncidentOffline(newIncident);
      queueOfflineMutation({ type: 'UPSERT_INCIDENT', entityId: newIncident.id, payload: newIncident });
      setOfflineQueue((q) => [...q, newIncident]);
      // Also display immediately in local feed as PENDING sync
      setIncidents((prev) => {
        const next = [newIncident, ...prev];
        persistIncidents(next);
        return next;
      });
      return;
    }

    // 1. Add to incidents feed
    setIncidents((prev) => {
      const next = [newIncident, ...prev];
      persistIncidents(next);
      return next;
    });

    // 2. Cascade to Module 3 (Routing): Penalize or block road segment
    const matchedCorridor = incidentData.location.corridorId || 'SEG-SIL-KOL';
    setActiveDisruptions((prev) => {
      const next = {
        ...prev,
        [matchedCorridor]: {
          status: incidentData.severity === 'Total Blockage' ? ('TOTAL_BLOCKAGE' as const) : ('SINGLE_LANE_PASSABLE' as const),
          cause: incidentData.incidentType,
          description: incidentData.title,
          reportedBy: `${incidentData.author.name} (${incidentData.author.role})`,
        },
      };
      persistDisruptions(next);
      return next;
    });

    if (socketRef.current?.connected) {
      socketRef.current.emit('SUBMIT_INCIDENT', newIncident);
    }
    if (isSupabaseConfigured) {
      upsertCloudIncident(newIncident);
      upsertCloudDisruption(matchedCorridor, {
        status: incidentData.severity === 'Total Blockage' ? ('TOTAL_BLOCKAGE' as const) : ('SINGLE_LANE_PASSABLE' as const),
        cause: incidentData.incidentType,
        description: incidentData.title,
        reportedBy: `${incidentData.author.name} (${incidentData.author.role})`,
      });
    }

    // 3. Cascade to Module 6 (Priority): Shorten cutoff time and increase disruption probability
    setRawCommunities((prev) =>
      prev.map((c) => {
        if (c.primaryCorridor.includes(incidentData.location.placeName) || c.id === 'MZ-KOL-004') {
          return {
            ...c,
            cutoffTimeHours: Math.max(1.0, c.cutoffTimeHours - 1.5),
            disruptionProbMax: Math.min(0.98, c.disruptionProbMax + 0.1),
            elapsedTimeHours: c.elapsedTimeHours + 4.0, // Accelerate run-rate urgency
          };
        }
        return c;
      })
    );

    // 4. Cascade to Module 7 (Executive): Lower district health score and add/raise BRO priority
    setDistrictsHealth((prev) =>
      prev.map((d) => {
        if (d.id === 'kolasib' || d.id === 'kohima') {
          return {
            ...d,
            accessibilityScore: Math.max(15, d.accessibilityScore - 12),
            connectivityCategory: 'CRITICAL',
            openCorridorsCount: 0,
          };
        }
        return d;
      })
    );

    // 5. Cascade to Module 5 (Broadcast): Auto-generate 5-language broadcast draft
    const generated = generateBroadcastForIncident(
      incidentData.corridorFlair,
      incidentData.location.placeName,
      incidentData.severity,
      'designated safe alternate corridor'
    );

    const newDraft: BroadcastDraft = {
      id: `draft-${Date.now()}`,
      incidentId: newIncident.id,
      highway: incidentData.corridorFlair,
      location: incidentData.location.placeName,
      disruptionType: `${incidentData.incidentType} (${incidentData.severity})`,
      translations: generated,
      phoneticFallback: generated.en,
      channels: [
        {
          channel: 'DRIVER_SMS',
          targetAudience: 'Active Convoys within 50km radius',
          totalRecipients: 95,
          sentCount: 0,
          deliveredCount: 0,
          readCount: 0,
          failedCount: 0,
          status: 'QUEUED',
        },
        {
          channel: 'WHATSAPP_CARD',
          targetAudience: 'Logistics Fleet Dispatchers',
          totalRecipients: 34,
          sentCount: 0,
          deliveredCount: 0,
          readCount: 0,
          failedCount: 0,
          status: 'QUEUED',
        },
        {
          channel: 'DISTRICT_SIREN',
          targetAudience: 'District Disaster Management Cells',
          totalRecipients: 3,
          sentCount: 0,
          deliveredCount: 0,
          readCount: 0,
          failedCount: 0,
          status: 'QUEUED',
        },
      ],
      createdAt: new Date().toISOString(),
      status: 'DRAFT',
    };

    setBroadcastDrafts((b) => [newDraft, ...b]);
  }, [isOnline, userContext]);

  // Vote on incident
  const voteIncident = useCallback((incidentId: string, type: 'up' | 'down') => {
    setIncidents((prev) => {
      let targetUpvotes = 0;
      let targetDownvotes = 0;
      let targetScore = 0;
      let targetHasOfficer = false;

      const next = prev.map((inc) => {
        if (inc.id !== incidentId) return inc;
        let upvotes = inc.votes.upvotes;
        let downvotes = inc.votes.downvotes;
        let userVote = inc.votes.userVote;

        if (userVote === type) {
          // undo vote
          if (type === 'up') upvotes--;
          else downvotes--;
          userVote = null;
        } else {
          if (userVote === 'up') upvotes--;
          if (userVote === 'down') downvotes--;
          if (type === 'up') upvotes++;
          else downvotes++;
          userVote = type;
        }

        const hasOfficer = inc.hasOfficerVerified || activeRole === 'FIELD_OFFICER';
        const score = upvotes - downvotes + (hasOfficer ? 10 : 0);

        targetUpvotes = upvotes;
        targetDownvotes = downvotes;
        targetScore = score;
        targetHasOfficer = Boolean(hasOfficer);

        return {
          ...inc,
          votes: { upvotes, downvotes, userVote },
          confidenceScore: score,
          hasOfficerVerified: hasOfficer,
        };
      });

      persistIncidents(next);

      if (socketRef.current?.connected) {
        socketRef.current.emit('VOTE_INCIDENT', {
          incidentId,
          votes: { upvotes: targetUpvotes, downvotes: targetDownvotes },
          confidenceScore: targetScore,
          hasOfficerVerified: targetHasOfficer,
        });
      }

      if (isOnline && isSupabaseConfigured) {
        voteCloudIncident(
          incidentId,
          { upvotes: targetUpvotes, downvotes: targetDownvotes },
          targetScore,
          targetHasOfficer
        );
      } else {
        const targetInc = next.find((i) => i.id === incidentId);
        if (targetInc) {
          queueOfflineMutation({ type: 'VOTE_INCIDENT', entityId: incidentId, payload: targetInc });
        }
      }

      return next;
    });
  }, [activeRole, isOnline]);

  // Add nested ground update comment
  const addIncidentUpdate = useCallback((incidentId: string, message: string) => {
    const update = {
      id: `u-${Date.now()}`,
      author: userContext.name,
      role: (userContext.role === 'FIELD_OFFICER' ? 'Field Officer (BRO/Police)' : 'Registered Driver') as any,
      message,
      timestamp: new Date().toISOString(),
    };

    setIncidents((prev) => {
      const next = prev.map((inc) => {
        if (inc.id !== incidentId) return inc;
        return {
          ...inc,
          updates: [...inc.updates, update],
        };
      });
      persistIncidents(next);
      return next;
    });

    if (socketRef.current?.connected) {
      socketRef.current.emit('ADD_INCIDENT_UPDATE', { incidentId, update });
    }
    const inc = incidents.find((i) => i.id === incidentId);
    const allUpdates = inc ? [...inc.updates, update] : [update];
    if (isOnline && isSupabaseConfigured) {
      addCloudIncidentUpdate(incidentId, update, allUpdates);
    } else {
      queueOfflineMutation({ type: 'ADD_INCIDENT_UPDATE', entityId: incidentId, payload: { update, allUpdates } });
    }
  }, [incidents, isOnline, userContext]);

  // =========================================================================
  // 12. CLOSED-LOOP GROUND TRUTH: Mark Mission Delivered
  // =========================================================================
  const markMissionDelivered = useCallback((communityId: string, vehicleId?: string) => {
    // Resolve vehicle from actual mission assignment — never hardcode a fallback vehicle
    const matchingMission = activeMissionsRef.current.find((m) => m.communityId === communityId);
    const targetVehId = vehicleId || matchingMission?.assignedVehicleId;
    if (!targetVehId) {
      console.warn(`[PRAVAH] markMissionDelivered: No vehicle assigned for community ${communityId}`);
      return;
    }

    // 1. Reset community inventory to 100% capacity and reset elapsed time Delta-t = 0
    let updatedCommunity: CommunityBase | undefined;
    setRawCommunities((prev) => {
      const next = prev.map((c) => {
        if (c.id === communityId) {
          updatedCommunity = {
            ...c,
            elapsedTimeHours: 0,
            hasActiveIndent: false,
            disruptionProbMax: 0.10,
            isMonsoonAlertActive: false,
            cutoffTimeHours: 24.0,
            inventories: {
              IV_FLUIDS: {
                ...c.inventories.IV_FLUIDS,
                lastStock: 450,
              },
              ANTIVENOM: {
                ...c.inventories.ANTIVENOM,
                lastStock: c.inventories.ANTIVENOM.standardCapacity,
              },
              GRAIN_RICE: {
                ...c.inventories.GRAIN_RICE,
                lastStock: c.inventories.GRAIN_RICE.standardCapacity,
              },
              DIESEL: {
                ...c.inventories.DIESEL,
                lastStock: c.inventories.DIESEL.standardCapacity,
              },
            },
          };
          return updatedCommunity;
        }
        return c;
      });
      persistCommunities(next);
      return next;
    });

    if (updatedCommunity) {
      if (isOnline && isSupabaseConfigured) {
        upsertCloudCommunity(updatedCommunity);
      } else {
        queueOfflineMutation({ type: 'UPSERT_COMMUNITY', entityId: communityId, payload: updatedCommunity });
      }
    }

    // 2. Update Vehicle Status
    setVehicles((prev) =>
      prev.map((v) => {
        if (v.vehicle_id === targetVehId) {
          return {
            ...v,
            status: 'DELIVERED_COMPLETED' as const,
            speed_kmh: 0,
            route_progress_pct: 100,
          };
        }
        return v;
      })
    );

    // 3. Update District Health score
    setDistrictsHealth((prev) =>
      prev.map((d) => {
        if (d.id === 'kolasib') {
          return {
            ...d,
            accessibilityScore: Math.min(100, d.accessibilityScore + 35),
            minSupplyDays: 14.0,
            isStockoutRisk: false,
            statusNote: 'Relief mission MZ-04 successfully delivered. Emergency medical stocks restored.',
          };
        }
        return d;
      })
    );

    // 4. Push High-Priority Success Alert
    setAlerts((prev) => [
      {
        id: `deliv-${Date.now()}`,
        vehicle_id: targetVehId,
        vehicle_name: targetVehId,
        cargo_type: 'Mission Cargo Manifest Handover',
        timestamp: new Date().toISOString(),
        severity: 'INFO',
        type: 'DELIVERY_COMPLETED',
        title: 'MISSION ACCOMPLISHED: Handover Signed Off',
        message: `Relief consignment successfully delivered and verified by Field Officer at ${communityId}. Inventories replenished to 100% capacity; community priority tier reset to P4 (Nominal).`,
        coords: [24.2246, 92.6784],
        acknowledged: false,
      },
      ...prev,
    ]);

    // 5. Update Mission state to DELIVERED and evict any lingering SUGGESTED mission for this community
    let deliveredMission: ReliefMission | undefined;
    setActiveMissions((prev) => {
      const filtered = prev.filter(
        (m) => !(m.status === 'SUGGESTED' && m.communityId === communityId)
      );
      const next = filtered.map((m) => {
        if (m.communityId === communityId || (targetVehId && m.assignedVehicleId === targetVehId)) {
          deliveredMission = {
            ...m,
            status: 'DELIVERED' as const,
            deliveredAt: new Date().toISOString(),
          };
          return deliveredMission;
        }
        return m;
      });
      persistMissions(next);
      return next;
    });

    if (deliveredMission) {
      if (isOnline && isSupabaseConfigured) {
        upsertCloudMission(deliveredMission);
        broadcastCloudMissionDelivered(deliveredMission.id, targetVehId, deliveredMission.deliveredAt);
      } else {
        queueOfflineMutation({ type: 'DELIVER_MISSION', entityId: deliveredMission.id, payload: deliveredMission });
      }
    }
  }, [isOnline]);

  // 13. Mission Dispatch & Customization
  const approveMission = useCallback((missionId: string) => {
    const existing = activeMissionsRef.current.find((m) => m.id === missionId);
    if (!existing) return;
    const targetMission: ReliefMission = { ...existing, status: 'APPROVED' as const };

    setActiveMissions((prev) => {
      // Evict any other SUGGESTED mission for this community
      const filtered = prev.filter(
        (m) => !(m.status === 'SUGGESTED' && m.communityId === existing.communityId && m.id !== missionId)
      );
      const next = filtered.map((m) => (m.id === missionId ? targetMission : m));
      persistMissions(next);
      return next;
    });

    if (isOnline && isSupabaseConfigured) {
      upsertCloudMission(targetMission);
      broadcastCloudMissionApproved(targetMission);
    } else {
      queueOfflineMutation({ type: 'APPROVE_MISSION', entityId: targetMission.id, payload: targetMission });
    }
  }, [isOnline]);

  const dispatchMission = useCallback((missionId: string, vehicleId?: string) => {
    const targetMission = activeMissionsRef.current.find((m) => m.id === missionId);
    if (!targetMission) {
      console.warn(`[PRAVAH] dispatchMission: Cannot find mission ${missionId}`);
      return;
    }
    const assignedVehId = vehicleId || targetMission.assignedVehicleId;
    if (!assignedVehId) {
      console.warn(`[PRAVAH] dispatchMission: No vehicle assigned for mission ${missionId}. Cannot dispatch without real vehicle assignment.`);
      return;
    }
    const originCoords = targetMission.originCoords || [24.8333, 92.7789];
    const destName = targetMission.destinationName || targetMission.communityName || 'Disaster Operational Target';

    // 2. Transition mission to IN_TRANSIT with confirmed vehicle assignment
    const updatedMission: ReliefMission = {
      ...targetMission,
      status: 'IN_TRANSIT' as const,
      assignedVehicleId: assignedVehId,
      dispatchedAt: new Date().toISOString(),
    };

    setActiveMissions((prev) => {
      // Evict any other SUGGESTED mission for this community
      const filtered = prev.filter(
        (m) => !(m.status === 'SUGGESTED' && m.communityId === targetMission.communityId && m.id !== missionId)
      );
      const next = filtered.map((m) => (m.id === missionId ? updatedMission : m));
      if (!next.some((m) => m.id === missionId)) {
        next.push(updatedMission);
      }
      persistMissions(next);
      return next;
    });

    // 3. Immediately focus and select dispatched mission and vehicle
    setSelectedMissionId(missionId);
    setSelectedVehicleId(assignedVehId);

    // 4. Update or add vehicle with ON_ROUTE status and origin coordinates
    setVehicles((prev) => {
      const exists = prev.some((v) => v.vehicle_id === assignedVehId);
      if (exists) {
        return prev.map((v) =>
          v.vehicle_id === assignedVehId
            ? {
              ...v,
              status: 'ON_ROUTE',
              mission_id: missionId,
              assigned_route_id: targetMission?.assignedRouteId || missionId,
              destination_name: destName,
              speed_kmh: 42,
              is_stopped_manual: false,
              current_coords: originCoords,
              route_progress_pct: 0,
              traveled_distance_km: 0,
              breadcrumbs: [
                {
                  coords: originCoords,
                  status: 'ON_ROUTE',
                  timestamp: new Date().toISOString(),
                  speed_kmh: 42,
                },
              ],
            }
            : v
        );
      } else {
        const newVeh: VehicleTelemetry = {
          vehicle_id: assignedVehId,
          vehicle_name: `${assignedVehId} (${targetMission?.recommendedVehicleType || 'Disaster Rig'})`,
          driver_name: 'Duty Dispatch Driver',
          driver_phone: '+91 94350-00000',
          convoy_lead_officer: 'Convoy Lead Officer',
          mission_id: missionId,
          cargo_type: targetMission?.cargoAllocations?.[0]?.item || 'Relief Consignment',
          cargo_manifest: targetMission?.cargoAllocations || [{ item: 'Critical Supplies', quantity: 500, unit: 'kg' }],
          destination_community_id: targetMission?.communityId || missionId,
          destination_name: destName,
          assigned_route_id: targetMission?.assignedRouteId || missionId,
          current_coords: originCoords,
          nominal_speed_kmh: 45,
          speed_kmh: 42,
          heading_deg: 180,
          status: 'ON_ROUTE',
          battery_pct: 99,
          last_ping_time: new Date().toISOString(),
          route_progress_pct: 0,
          signal_strength_dbm: -62,
          satellite_count: 14,
          stationary_timer_sec: 0,
          traveled_distance_km: 0,
          deviation_distance_m: 0,
          dead_reckoning_distance_m: 0,
          breadcrumbs: [
            {
              coords: originCoords,
              status: 'ON_ROUTE',
              timestamp: new Date().toISOString(),
              speed_kmh: 42,
            },
          ],
        };
        return [newVeh, ...prev];
      }
    });

    // 5. Add operational dispatch event log
    setAlerts((prev) => [
      {
        id: `dispatch-${Date.now()}`,
        vehicle_id: assignedVehId,
        vehicle_name: assignedVehId,
        cargo_type: targetMission?.cargoAllocations?.[0]?.item || 'Relief Consignment',
        timestamp: new Date().toISOString(),
        severity: 'INFO',
        type: 'WATCHDOG_OVERDUE_AMBER',
        title: `MISSION DISPATCH CONFIRMED: ${missionId} Active`,
        message: `Convoy unit ${assignedVehId} deployed from ${targetMission?.originWarehouseName || 'depot'} to ${destName}. Real OSRM highway tracking active.`,
        coords: originCoords,
        acknowledged: false,
      },
      ...prev,
    ]);

    // 6. Supabase Cloud DB Persistence & Realtime Broadcast
    if (updatedMission) {
      if (isOnline && isSupabaseConfigured) {
        upsertCloudMission(updatedMission);
        broadcastCloudMissionDispatched(updatedMission, assignedVehId);
      } else {
        queueOfflineMutation({ type: 'DISPATCH_MISSION', entityId: updatedMission.id, payload: updatedMission });
      }
    }

    if (socketRef.current?.connected) {
      socketRef.current.emit('DISPATCH_MISSION', { missionId, vehicleId: assignedVehId });
    }
  }, [isOnline]);

  const approveAndDispatchMission = useCallback((missionId: string, vehicleId?: string) => {
    approveMission(missionId);
    dispatchMission(missionId, vehicleId);
  }, [approveMission, dispatchMission]);

  const customizeMission = useCallback((mission: ReliefMission) => {
    setActiveMissions((prev) => {
      const next = prev.map((m) => (m.id === mission.id ? mission : m));
      persistMissions(next);
      return next;
    });
    if (isSupabaseConfigured) {
      upsertCloudMission(mission);
    }
    approveAndDispatchMission(mission.id);
  }, [approveAndDispatchMission]);

  // Field Officer / Driver: Report Delivery Finished (moves to PENDING_ADMIN_CLOSEOUT)
  const reportMissionDeliveryByField = useCallback((missionId: string) => {
    const existing = activeMissionsRef.current.find((m) => m.id === missionId);
    if (!existing) return;

    const deliveredMission: ReliefMission = {
      ...existing,
      status: 'PENDING_ADMIN_CLOSEOUT' as const,
      deliveredAt: new Date().toISOString(),
    };
    const targetVehId = existing.assignedVehicleId;

    setActiveMissions((prev) => {
      const next = prev.map((m) => (m.id === missionId ? deliveredMission : m));
      persistMissions(next);
      return next;
    });

    if (targetVehId) {
      setVehicles((prev) =>
        prev.map((v) =>
          v.vehicle_id === targetVehId
            ? { ...v, status: 'DELIVERED_IDLE' as const, speed_kmh: 0, route_progress_pct: 100 }
            : v
        )
      );
    }

    const officerName = activeRoleRef.current === 'FIELD_OFFICER' ? 'Inspector L. Hmar (Field Officer)' : 'Convoy Lead Driver';
    const alertId = `closeout-pending-${Date.now()}`;
    const newAlert: AlertEvent = {
      id: alertId,
      vehicle_id: targetVehId || 'Convoy',
      vehicle_name: targetVehId || 'Convoy Unit',
      cargo_type: existing.cargoAllocations?.[0]?.item || 'Relief Consignment',
      timestamp: new Date().toISOString(),
      severity: 'HIGH RISK',
      type: 'DELIVERY_PENDING_CLOSEOUT',
      title: 'FIELD DELIVERY COMPLETED — PENDING ADMIN SIGN-OFF',
      message: `${officerName} reported relief delivery finished for mission ${missionId} at ${existing.destinationName || 'destination'}. Awaiting Central Command Admin review and sign-off.`,
      coords: existing.destinationEndpoint || [24.22, 92.67],
      acknowledged: false,
    };
    setAlerts((prev) => [newAlert, ...prev]);

    if (isOnline && isSupabaseConfigured) {
      upsertCloudMission(deliveredMission);
      broadcastCloudMissionPendingCloseout(missionId, targetVehId, officerName);
    } else {
      queueOfflineMutation({ type: 'DELIVER_MISSION', entityId: deliveredMission.id, payload: deliveredMission });
    }
  }, [isOnline]);

  // Central Super Admin: Review & Closeout Mission
  const adminCloseoutMission = useCallback((missionId: string) => {
    const existing = activeMissionsRef.current.find((m) => m.id === missionId);
    if (!existing) return;

    const closedMission: ReliefMission = {
      ...existing,
      status: 'DELIVERED' as const,
      deliveredAt: existing.deliveredAt || new Date().toISOString(),
    };
    const commId = existing.communityId;
    const vehId = existing.assignedVehicleId;

    setActiveMissions((prev) => {
      const next = prev.map((m) => (m.id === missionId ? closedMission : m));
      persistMissions(next);
      return next;
    });

    // Replenish Community inventories to 100% capacity and reset priority tier
    if (commId) {
      setRawCommunities((prev) => {
        const next = prev.map((c) => {
          if (c.id === commId) {
            const replenished: CommunityBase = {
              ...c,
              elapsedTimeHours: 0,
              cutoffTimeHours: Math.max(c.cutoffTimeHours, 72.0),
              isMonsoonAlertActive: false,
              hasActiveIndent: false,
              inventories: {
                IV_FLUIDS: { lastStock: 400, baselineDailyBurn: c.inventories.IV_FLUIDS?.baselineDailyBurn || 40, standardCapacity: c.inventories.IV_FLUIDS?.standardCapacity || 400 },
                ANTIVENOM: { lastStock: 120, baselineDailyBurn: c.inventories.ANTIVENOM?.baselineDailyBurn || 12, standardCapacity: c.inventories.ANTIVENOM?.standardCapacity || 120 },
                GRAIN_RICE: { lastStock: 1500, baselineDailyBurn: c.inventories.GRAIN_RICE?.baselineDailyBurn || 120, standardCapacity: c.inventories.GRAIN_RICE?.standardCapacity || 1500 },
                DIESEL: { lastStock: 800, baselineDailyBurn: c.inventories.DIESEL?.baselineDailyBurn || 60, standardCapacity: c.inventories.DIESEL?.standardCapacity || 800 },
              },
            };
            if (isOnline && isSupabaseConfigured) {
              upsertCloudCommunity(replenished);
            } else {
              queueOfflineMutation({ type: 'UPSERT_COMMUNITY', entityId: replenished.id, payload: replenished });
            }
            return replenished;
          }
          return c;
        });
        persistCommunities(next);
        return next;
      });
    }

    // Release Vehicle back to AVAILABLE
    if (vehId) {
      setVehicles((prev) =>
        prev.map((v) =>
          v.vehicle_id === vehId
            ? { ...v, status: 'AVAILABLE' as const, speed_kmh: 0, mission_id: '', route_progress_pct: 0 }
            : v
        )
      );
    }

    // Push Success Alert
    setAlerts((prev) => [
      {
        id: `closeout-done-${Date.now()}`,
        vehicle_id: vehId || 'Fleet Unit',
        vehicle_name: vehId || 'Fleet Unit',
        cargo_type: 'Relief Inventory Signed Off',
        timestamp: new Date().toISOString(),
        severity: 'INFO',
        type: 'DELIVERY_COMPLETED',
        title: 'MISSION CLOSED OUT & STOCKS RESTORED',
        message: `Admin signed off mission ${missionId}. Community inventory restored to 100% capacity (Priority P4 Nominal). Vehicle ${vehId || 'unit'} released to AVAILABLE.`,
        coords: closedMission.destinationEndpoint || [24.22, 92.67],
        acknowledged: false,
      },
      ...prev,
    ]);

    if (isOnline && isSupabaseConfigured) {
      upsertCloudMission(closedMission);
      broadcastCloudMissionClosedOut(missionId, commId || '', vehId);
    } else {
      const matchingComm = rawCommunitiesRef.current.find((c) => c.id === commId);
      queueOfflineMutation({
        type: 'CLOSEOUT_MISSION',
        entityId: missionId,
        payload: { mission: closedMission, community: matchingComm },
      });
    }
  }, [isOnline]);

  // 14. Interactive 1-Click Walkthrough Demo Actions
  const runDemoStep1 = useCallback(() => {
    setRainfallMmHr(65);
    setIsMonsoonDownpourSimulated(true);

    setActiveDisruptions((prev) => ({
      ...prev,
      'SEG-SIL-KOL': {
        status: 'TOTAL_BLOCKAGE',
        cause: 'Torrential Silt Mudflow (65mm/hr)',
        description: 'Severe slope wash out along Bilkhawthlir escarpment. All heavy transport severed.',
        reportedBy: 'Field Officer (Insp. L. Hmar / Mizoram Police)',
      },
    }));

    setRawCommunities((prev) =>
      prev.map((c) => {
        if (c.id === 'MZ-KOL-004') {
          return {
            ...c,
            cutoffTimeHours: 2.1,
            disruptionProbMax: 0.98,
            elapsedTimeHours: 14.0,
            isMonsoonAlertActive: true,
          };
        }
        return c;
      })
    );

    setDistrictsHealth((prev) =>
      prev.map((d) => (d.id === 'kolasib' ? { ...d, accessibilityScore: 18, connectivityCategory: 'CRITICAL', openCorridorsCount: 0 } : d))
    );

    setActiveMissions((prev) => {
      const kolasibRoute = FLEET_ROUTES['ROUTE-SUG-01'];
      const kolasibTerminus = kolasibRoute.coordinates[kolasibRoute.coordinates.length - 1];

      if (prev.some((m) => m.communityId === 'MZ-KOL-004')) {
        return prev.map((m) =>
          m.communityId === 'MZ-KOL-004'
            ? {
                ...m,
                status: 'SUGGESTED',
                urgency: 'P1_CRITICAL',
                assignedRouteId: 'ROUTE-SUG-01',
                suggestedDetour: 'NH-306 Safe Mountain Bypass (via Vairengte Spur)',
                routeGeometry: kolasibRoute.coordinates,
                routeDistanceKm: kolasibRoute.distanceKm,
                routeDurationMinutes: kolasibRoute.expectedDurationMinutes,
                destinationEndpoint: kolasibTerminus,
              }
            : m
        );
      }
      return [
        {
          id: `SUGG-MZKOL004-DEMO`,
          communityId: 'MZ-KOL-004',
          communityName: 'Kolasib District HQ & PHC',
          recommendedVehicleType: '4x4 Tata Xenon High-Clearance Medic Carrier',
          cargoAllocations: [
            { item: 'IV Fluids (RL / NS 500ml)', quantity: 350, unit: 'Bags' },
            { item: 'Polyvalent Snake Antivenom', quantity: 60, unit: 'Vials' },
            { item: 'Fortified High-Energy Biscuits & Grain', quantity: 800, unit: 'kg' },
            { item: 'Generator Diesel (Emergency)', quantity: 400, unit: 'Litres' },
          ],
          assignedRouteId: 'ROUTE-SUG-01',
          suggestedDetour: 'NH-306 Safe Mountain Bypass (via Vairengte Spur)',
          status: 'SUGGESTED',
          urgency: 'P1_CRITICAL',
          createdAt: new Date().toISOString(),
          assignedDriver: 'Rajesh Mech (+91 94350-18492)',
          assignedOfficer: 'Insp. L. Hmar (MZ-QRT-019)',
          originWarehouseId: 'silchar',
          originWarehouseName: 'Silchar Strategic Depot',
          originCoords: [24.8333, 92.7789],
          disasterZoneId: 'LHZ-MZ-01',
          disasterZoneName: 'NH-306 Bilkhawthlir Hill Escarpment',
          destinationEndpoint: kolasibTerminus,
          destinationName: 'Kolasib District HQ & PHC',
          assignedVehicleId: 'Medic-01',
          routeDistanceKm: kolasibRoute.distanceKm,
          routeDurationMinutes: kolasibRoute.expectedDurationMinutes,
          routeStatus: 'OPTIMAL',
          routeGeometry: kolasibRoute.coordinates,
        },
        ...prev,
      ];
    });

    setIncidents((prev) => [
      {
        id: `inc-kolasib-${Date.now()}`,
        title: 'Massive Hillside Silt Slide Severing NH-306 at Bilkhawthlir KM-18',
        corridorFlair: 'r/Mizoram-NH-306',
        incidentType: 'Landslide',
        severity: 'Total Blockage',
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
        timestamp: new Date().toISOString(),
        mediaUrl: 'https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?auto=format&fit=crop&w=800&q=80',
        votes: { upvotes: 42, downvotes: 0, userVote: 'up' },
        confidenceScore: 52,
        hasOfficerVerified: true,
        sync_status: 'SYNCED',
        updates: [
          {
            id: `u-kol-${Date.now()}`,
            author: 'Insp. L. Hmar',
            role: 'Field Officer (BRO/Police)',
            message: 'Main highway impassable. Advising dispatch to divert via Bairabi Pass bypass road.',
            timestamp: new Date().toISOString(),
          },
        ],
      },
      ...prev,
    ]);

    if (socketRef.current?.connected) {
      socketRef.current.emit('TRIGGER_DEMO_STEP', { step: 1 });
    }
  }, []);

  const runDemoStep2 = useCallback(() => {
    const kolasibMission =
      activeMissionsRef.current.find((m) => m.communityId === 'MZ-KOL-004') ||
      activeMissionsRef.current[0];
    if (kolasibMission) {
      approveAndDispatchMission(kolasibMission.id, 'Medic-01');
    }
    setSelectedVehicleId('Medic-01');
    setVehicles((prev) =>
      prev.map((v) =>
        v.vehicle_id === 'Medic-01'
          ? {
            ...v,
            status: 'ON_ROUTE',
            route_progress_pct: 35,
            speed_kmh: 44,
            is_stopped_manual: false,
            next_chokepoint: 'Bairabi Pass Alternate Spur',
          }
          : v
      )
    );

    if (socketRef.current?.connected) {
      socketRef.current.emit('TRIGGER_DEMO_STEP', { step: 2 });
    }
  }, [approveAndDispatchMission]);

  const runDemoStep3 = useCallback(() => {
    markMissionDelivered('MZ-KOL-004', 'Medic-01');
    setActiveMissions((prev) =>
      prev.map((m) =>
        m.communityId === 'MZ-KOL-004'
          ? { ...m, status: 'DELIVERED', deliveredAt: new Date().toISOString() }
          : m
      )
    );

    if (socketRef.current?.connected) {
      socketRef.current.emit('TRIGGER_DEMO_STEP', { step: 3 });
    }
  }, [markMissionDelivered]);

  const resetDemoSimulation = useCallback(() => {
    setRawCommunities(INITIAL_COMMUNITIES);
    setActiveDisruptions({
      'SEG-DIM-KOH-MAIN': {
        status: 'TOTAL_BLOCKAGE',
        cause: 'Landslide_Debris',
        description: 'Major mudflow at Pagla Pahar KM-144',
        reportedBy: 'Field Officer (BRO Project Sewak)',
      },
      'SEG-SIL-KOL': {
        status: 'SINGLE_LANE_PASSABLE',
        cause: 'Road_Subsidence',
        description: 'Bilkhawthlir silt collapse - 18T load restriction',
        reportedBy: 'Insp. L. Hmar',
      },
    });
    setVehicles(INITIAL_VEHICLES);
    const freshDynamicSuggestions = generateDynamicMissionSuggestions(INITIAL_COMMUNITIES, INITIAL_VEHICLES, []);
    setActiveMissions(freshDynamicSuggestions);
    persistMissions(freshDynamicSuggestions);
    setPendingSOSAlert(null);
    setRainfallMmHr(24);
    setIsMonsoonDownpourSimulated(false);
    setDistrictsHealth(INITIAL_DISTRICTS_HEALTH);

    if (socketRef.current?.connected) {
      socketRef.current.emit('TRIGGER_DEMO_STEP', { step: 0 });
    }
  }, []);

  // 15. Real-Time Socket Synchronization
  useEffect(() => {
    try {
      const socketUrl = import.meta.env.VITE_SOCKET_URL || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:3001' : null);
      if (!socketUrl) {
        console.log('ℹ️ PRAVAH running in standalone in-browser reactive mode (Vercel deployment)');
        return;
      }

      const socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        timeout: 3000,
        reconnectionAttempts: 3,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log(`✅ Connected to PRAVAH Realtime Event Bus at ${socketUrl}`);
      });

      socket.on('INITIAL_STATE_SYNC', (serverState: any) => {
        console.log('📡 [PRAVAH Socket] Received INITIAL_STATE_SYNC');
        if (serverState?.groundReports && Array.isArray(serverState.groundReports)) {
          setIncidents((prev) => {
            const userVoteMap = new Map<string, null | 'up' | 'down'>();
            prev.forEach((p) => {
              if (p.votes?.userVote) {
                userVoteMap.set(p.id, p.votes.userVote);
              }
            });

            const serverReports: Incident[] = serverState.groundReports.map((r: any) => ({
              id: r.id,
              title: r.title,
              corridorFlair: r.corridorFlair || 'r/Mizoram-NH-306',
              incidentType: r.incidentType || 'Landslide',
              severity: r.severity || 'Total Blockage',
              location: r.location || {
                lat: 25.75,
                lng: 93.98,
                placeName: r.placeName || 'NH-29 Sector',
                corridorId: r.corridorId || 'SEG-DIM-KOH-MAIN',
              },
              author: r.author && typeof r.author === 'object' ? r.author : {
                name: r.author || 'Field Reporter',
                role: r.role || 'Citizen Driver',
              },
              timestamp: r.timestamp || new Date().toISOString(),
              mediaUrl: r.mediaUrl || '',
              votes: {
                upvotes: r.votes?.upvotes ?? 1,
                downvotes: r.votes?.downvotes ?? 0,
                userVote: userVoteMap.get(r.id) || r.votes?.userVote || null,
              },
              confidenceScore: r.confidenceScore ?? 1,
              hasOfficerVerified: Boolean(r.hasOfficerVerified),
              sync_status: 'SYNCED' as const,
              updates: Array.isArray(r.updates) ? r.updates : [],
            }));

            const serverIds = new Set(serverReports.map((s) => s.id));
            const localOnly = prev.filter((p) => !serverIds.has(p.id));
            const merged = [...serverReports, ...localOnly];
            persistIncidents(merged);
            return merged;
          });
        }

        if (serverState?.disruptions && Object.keys(serverState.disruptions).length > 0) {
          setActiveDisruptions((prev) => {
            const next = { ...prev, ...serverState.disruptions };
            persistDisruptions(next);
            return next;
          });
        }

        if (serverState?.activeMissions && typeof serverState.activeMissions === 'object') {
          const missionsArr = Object.values(serverState.activeMissions) as any[];
          if (missionsArr.length > 0) {
            setActiveMissions((prev) => {
              const prevIds = new Set(prev.map((m) => m.id));
              const merged = [...prev];
              missionsArr.forEach((sm) => {
                if (!prevIds.has(sm.id)) {
                  merged.unshift(sm);
                }
              });
              persistMissions(merged);
              return merged;
            });
          }
        }
      });

      socket.on('INCIDENT_ADDED', (payload: any) => {
        if (payload.incident) {
          const inc = payload.incident;
          setIncidents((prev) => {
            const exists = prev.some((p) => p.id === inc.id);
            if (exists) return prev;
            const next = [inc, ...prev];
            persistIncidents(next);
            return next;
          });
        }
        if (payload.disruptions) {
          setActiveDisruptions((prev) => {
            const next = { ...prev, ...payload.disruptions };
            persistDisruptions(next);
            return next;
          });
        }
      });

      socket.on('INCIDENT_VERIFIED', (payload: any) => {
        if (payload.incident) {
          const inc = payload.incident;
          setIncidents((prev) => {
            const exists = prev.some((p) => p.id === inc.id);
            const next = exists
              ? prev.map((p) => (p.id === inc.id ? { ...p, ...inc, votes: { ...inc.votes, userVote: p.votes?.userVote || null } } : p))
              : [inc, ...prev];
            persistIncidents(next);
            return next;
          });
        }
        if (payload.disruptions) {
          setActiveDisruptions((prev) => {
            const next = { ...prev, ...payload.disruptions };
            persistDisruptions(next);
            return next;
          });
        }
      });

      socket.on('INCIDENT_VOTED', (payload: any) => {
        if (payload.incidentId) {
          setIncidents((prev) => {
            const next = prev.map((p) => {
              if (p.id !== payload.incidentId) return p;
              return {
                ...p,
                votes: {
                  upvotes: payload.votes?.upvotes ?? p.votes.upvotes,
                  downvotes: payload.votes?.downvotes ?? p.votes.downvotes,
                  userVote: p.votes.userVote,
                },
                confidenceScore: payload.confidenceScore ?? p.confidenceScore,
                hasOfficerVerified: payload.hasOfficerVerified ?? p.hasOfficerVerified,
              };
            });
            persistIncidents(next);
            return next;
          });
        }
      });

      socket.on('INCIDENT_UPDATE_ADDED', (payload: any) => {
        if (payload.incidentId && payload.update) {
          setIncidents((prev) => {
            const next = prev.map((p) => {
              if (p.id !== payload.incidentId) return p;
              const updates = Array.isArray(payload.updates)
                ? payload.updates
                : [...p.updates, payload.update];
              return {
                ...p,
                updates,
              };
            });
            persistIncidents(next);
            return next;
          });
        }
      });

      socket.on('DRIVER_SOS_SIGNAL', (payload: any) => {
        console.warn('🚨 RECEIVED SOS FROM WEBSOCKET:', payload);
        if (payload.alert) {
          setAlerts((prev) => [payload.alert, ...prev]);
          // Only Command roles receive the modal to authorize QRT dispatch
          if (activeRoleRef.current === 'SUPER_ADMIN' || activeRoleRef.current === 'FLEET_DISPATCHER') {
            setPendingSOSAlert(payload.alert);
          }
        }
        const vId = payload.vehicleId || payload.vehicle?.vehicle_id;
        if (vId) {
          setVehicles((prev) =>
            prev.map((v) => (v.vehicle_id === vId ? { ...v, is_sos_manual: true, status: 'SOS_ALERT' } : v))
          );
        }
      });

      socket.on('DRIVER_SOS_CANCELLED', (payload: any) => {
        const vId = payload.vehicleId;
        if (vId) {
          setVehicles((prev) =>
            prev.map((v) => (v.vehicle_id === vId ? { ...v, is_sos_manual: false, status: 'ON_ROUTE' } : v))
          );
          setPendingSOSAlert((curr) => (curr?.vehicle_id === vId ? null : curr));
        }
      });

      socket.on('MISSION_RECOMMENDED', (payload: any) => {
        if (payload.mission) {
          setActiveMissions((prev) => {
            if (prev.some((m) => m.id === payload.mission.id)) return prev;
            return [payload.mission, ...prev];
          });
        }
      });

      socket.on('MISSION_DISPATCHED', (payload: any) => {
        if (payload.missionId) {
          setActiveMissions((prev) =>
            prev.map((m) =>
              m.id === payload.missionId
                ? { ...m, status: 'IN_TRANSIT', dispatchedAt: new Date().toISOString() }
                : m
            )
          );
        }
      });

      socket.on('MISSION_DELIVERED_RESTOCK', (payload: any) => {
        if (payload.communityId) {
          markMissionDelivered(payload.communityId, payload.vehicleId);
        }
      });

      socket.on('WEATHER_SURGE_TICK', (payload: any) => {
        if (payload.multiplier && payload.multiplier > 1.5) {
          setRainfallMmHr(Math.round(24 * payload.multiplier));
        }
      });

      socket.on('disconnect', () => {
        console.log('PRAVAH Socket disconnected - running offline fallback');
      });
    } catch (err) {
      console.warn('PRAVAH Socket fallback:', err);
    }

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [markMissionDelivered]);

  // 16. Supabase Cloud Realtime Multi-Device Synchronization
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      console.log('ℹ️ Supabase not configured: running local offline / socket fallback');
      return;
    }

    console.log('⚡ Connected to Supabase Cloud Database & Realtime Event Bus');

    // 1. Initial hydration from cloud with bidirectional conflict resolution
    fetchCloudIncidents().then((cloudIncidents) => {
      if (cloudIncidents && cloudIncidents.length > 0) {
        setIncidents((prev) => {
          const merged = resolveIncidentConflict(prev, cloudIncidents);
          persistIncidents(merged);
          return merged;
        });
      }
    });

    fetchCloudDisruptions().then((cloudDisruptions) => {
      if (cloudDisruptions && Object.keys(cloudDisruptions).length > 0) {
        setActiveDisruptions((prev) => {
          const next = resolveDisruptionConflict(prev, cloudDisruptions);
          persistDisruptions(next);
          return next;
        });
      }
    });

    fetchCloudCommunities().then((cloudCommunities) => {
      if (cloudCommunities && cloudCommunities.length > 0) {
        setRawCommunities((prev) => {
          const next = resolveCommunityConflict(prev, cloudCommunities);
          persistCommunities(next);
          return next;
        });
      }
    });

    fetchCloudMissions().then((cloudMissions) => {
      if (cloudMissions && cloudMissions.length > 0) {
        const cleanCloud = cloudMissions.filter(
          (m) => m && typeof m.id === 'string' && !m.id.startsWith('MISSION-') && !m.id.startsWith('MOCK-')
        );
        if (cleanCloud.length > 0) {
          setActiveMissions((prev) => {
            const merged = resolveMissionConflict(prev, cleanCloud);
            persistMissions(merged);
            return merged;
          });

          // Sync vehicle status for active in-transit cloud missions across devices
          cleanCloud.forEach((cm) => {
            if (
              (cm.status === 'IN_TRANSIT' || cm.status === 'PENDING_ADMIN_CLOSEOUT') &&
              cm.assignedVehicleId
            ) {
              setVehicles((prev) =>
                prev.map((v) =>
                  v.vehicle_id === cm.assignedVehicleId
                    ? {
                        ...v,
                        status: 'ON_ROUTE',
                        mission_id: cm.id,
                        assigned_route_id: cm.assignedRouteId,
                        destination_name: cm.destinationName,
                      }
                    : v
                )
              );
            }
          });
        }
      }
    });

    fetchCloudDraftReports().then((cloudDrafts) => {
      if (cloudDrafts && cloudDrafts.length > 0) {
        const pending = cloudDrafts.filter((cd) => cd.status !== 'APPROVED');
        const approved = cloudDrafts.filter((cd) => cd.status === 'APPROVED');

        if (pending.length > 0) {
          setDraftPlots((prev) => {
            const ids = new Set(prev.map((d) => d.id));
            const additions = pending.filter((cd) => !ids.has(cd.id));
            return [...prev, ...additions];
          });
        }
        if (approved.length > 0) {
          setApprovedDraftPlots((prev) => {
            const ids = new Set(prev.map((d) => d.id));
            const additions = approved.filter((cd) => !ids.has(cd.id));
            return [...prev, ...additions];
          });
        }
      }
    });

    // 2. Realtime Broadcast Channel Listener on shared global bus
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase.channel('pravah-global-bus', {
        config: { broadcast: { ack: true } },
      });

      channel
        .on('broadcast', { event: 'DRAFT_REPORT_UPDATED' }, ({ payload }: any) => {
          if (payload?.draft) {
            const d = payload.draft;
            if (d.status === 'APPROVED') {
              setDraftPlots((prev) => prev.filter((item) => item.id !== d.id));
              setApprovedDraftPlots((prev) => [d, ...prev.filter((item) => item.id !== d.id)]);
            } else {
              setDraftPlots((prev) => [d, ...prev.filter((item) => item.id !== d.id)]);
            }
          }
        })
        .on('broadcast', { event: 'DRAFT_REPORT_DELETED' }, ({ payload }: any) => {
          if (payload?.draftId) {
            setDraftPlots((prev) => prev.filter((item) => item.id !== payload.draftId));
            setApprovedDraftPlots((prev) => prev.filter((item) => item.id !== payload.draftId));
          }
        })
        .on('broadcast', { event: 'INCIDENT_ADDED' }, ({ payload }: any) => {
          if (payload?.incident) {
            setIncidents((prev) => {
              if (prev.some((p) => p.id === payload.incident.id)) return prev;
              const next = [payload.incident, ...prev];
              persistIncidents(next);
              return next;
            });
          }
        })
        .on('broadcast', { event: 'INCIDENT_VOTED' }, ({ payload }: any) => {
          if (payload?.incidentId) {
            setIncidents((prev) => {
              const next = prev.map((p) => {
                if (p.id !== payload.incidentId) return p;
                return {
                  ...p,
                  votes: {
                    upvotes: payload.votes?.upvotes ?? p.votes.upvotes,
                    downvotes: payload.votes?.downvotes ?? p.votes.downvotes,
                    userVote: p.votes.userVote,
                  },
                  confidenceScore: payload.confidenceScore ?? p.confidenceScore,
                  hasOfficerVerified: payload.hasOfficerVerified ?? p.hasOfficerVerified,
                };
              });
              persistIncidents(next);
              return next;
            });
          }
        })
        .on('broadcast', { event: 'INCIDENT_UPDATE_ADDED' }, ({ payload }: any) => {
          if (payload?.incidentId && payload?.update) {
            setIncidents((prev) => {
              const next = prev.map((p) => {
                if (p.id !== payload.incidentId) return p;
                const updates = Array.isArray(payload.updates)
                  ? payload.updates
                  : [...p.updates, payload.update];
                return { ...p, updates };
              });
              persistIncidents(next);
              return next;
            });
          }
        })
        .on('broadcast', { event: 'DISRUPTION_UPDATED' }, ({ payload }: any) => {
          if (payload?.corridorId) {
            setActiveDisruptions((prev) => {
              const next = { ...prev };
              if (!payload.disruption) {
                delete next[payload.corridorId];
              } else {
                next[payload.corridorId] = payload.disruption;
              }
              persistDisruptions(next);
              return next;
            });
          }
        })
        .on('broadcast', { event: 'COMMUNITY_UPDATED' }, ({ payload }: any) => {
          if (payload?.community) {
            setRawCommunities((prev) => {
              const next = prev.map((c) => (c.id === payload.community.id ? payload.community : c));
              persistCommunities(next);
              return next;
            });
          }
        })
        .on('broadcast', { event: 'MISSION_DISPATCHED' }, ({ payload }) => {
          if (payload?.mission) {
            const { mission, vehicleId } = payload;
            setActiveMissions((prev) => {
              // Evict any other SUGGESTED mission for this community
              const filtered = prev.filter(
                (m) => !(mission.communityId && m.communityId === mission.communityId && m.status === 'SUGGESTED')
              );
              const next = filtered.map((m) => (m.id === mission.id ? { ...m, ...mission, status: 'IN_TRANSIT' as const } : m));
              if (!next.some((m) => m.id === mission.id)) {
                next.push({ ...mission, status: 'IN_TRANSIT' as const });
              }
              persistMissions(next);
              return next;
            });
            if (vehicleId) {
              setVehicles((prev) =>
                prev.map((v) =>
                  v.vehicle_id === vehicleId
                    ? {
                        ...v,
                        status: 'ON_ROUTE',
                        mission_id: mission.id,
                        assigned_route_id: mission.assignedRouteId,
                        destination_name: mission.destinationName,
                      }
                    : v
                )
              );
            }
            setAlerts((prev) => [
              {
                id: `dispatch-${Date.now()}`,
                vehicle_id: vehicleId || mission.assignedVehicleId || 'Convoy',
                vehicle_name: vehicleId || mission.assignedVehicleId || 'Convoy',
                cargo_type: mission.cargoAllocations?.[0]?.item || 'Relief Consignment',
                timestamp: new Date().toISOString(),
                severity: 'INFO',
                type: 'WATCHDOG_OVERDUE_AMBER',
                title: `MISSION DISPATCH CONFIRMED: ${mission.id} Active`,
                message: `Convoy unit ${vehicleId} deployed to ${mission.destinationName}. Live multi-device tracking active.`,
                coords: mission.originCoords || [24.83, 92.77],
                acknowledged: false,
              },
              ...prev,
            ]);
          }
        })
        .on('broadcast', { event: 'MISSION_APPROVED' }, ({ payload }: any) => {
          if (payload?.missionId || payload?.mission) {
            const mId = payload.missionId || payload.mission?.id;
            const commId = payload.communityId || payload.mission?.communityId;
            setActiveMissions((prev) => {
              // Evict any other SUGGESTED mission for this community
              const filtered = prev.filter(
                (m) => !(commId && m.communityId === commId && m.status === 'SUGGESTED' && m.id !== mId)
              );
              let found = false;
              const next = filtered.map((m) => {
                if (m.id === mId || (commId && m.communityId === commId && m.status === 'SUGGESTED')) {
                  found = true;
                  return payload.mission
                    ? { ...payload.mission, status: 'APPROVED' as const }
                    : { ...m, status: 'APPROVED' as const };
                }
                return m;
              });
              if (!found && payload.mission) {
                next.push({ ...payload.mission, status: 'APPROVED' as const });
              }
              persistMissions(next);
              return next;
            });
          }
        })
        .on('broadcast', { event: 'MISSION_DELIVERED' }, ({ payload }) => {
          if (payload?.missionId) {
            setActiveMissions((prev) => {
              const next = prev.map((m) =>
                m.id === payload.missionId
                  ? { ...m, status: 'DELIVERED' as const, deliveredAt: payload.deliveredAt || new Date().toISOString() }
                  : m
              );
              persistMissions(next);
              return next;
            });
            if (payload?.vehicleId) {
              setVehicles((prev) =>
                prev.map((v) => (v.vehicle_id === payload.vehicleId ? { ...v, status: 'DELIVERED_COMPLETED' as const, speed_kmh: 0 } : v))
              );
            }
          }
        })
        .on('broadcast', { event: 'DRIVER_SOS_SIGNAL' }, ({ payload }) => {
          if (payload?.alert) {
            setAlerts((prev) => [payload.alert, ...prev]);
            if (activeRoleRef.current === 'SUPER_ADMIN' || activeRoleRef.current === 'FLEET_DISPATCHER') {
              setPendingSOSAlert(payload.alert);
            }
          }
          if (payload?.vehicleId) {
            setVehicles((prev) =>
              prev.map((v) => (v.vehicle_id === payload.vehicleId ? { ...v, is_sos_manual: true, status: 'SOS_ALERT' } : v))
            );
          }
        })
        .on('broadcast', { event: 'DRIVER_SOS_CANCELLED' }, ({ payload }: any) => {
          if (payload?.vehicleId) {
            setVehicles((prev) =>
              prev.map((v) => (v.vehicle_id === payload.vehicleId ? { ...v, is_sos_manual: false, status: 'ON_ROUTE' } : v))
            );
            setPendingSOSAlert((curr) => (curr?.vehicle_id === payload.vehicleId ? null : curr));
          }
        })
        .on('broadcast', { event: 'MISSION_PENDING_CLOSEOUT' }, ({ payload }: any) => {
          if (payload?.missionId) {
            setActiveMissions((prev) => {
              const next = prev.map((m) =>
                m.id === payload.missionId ? { ...m, status: 'PENDING_ADMIN_CLOSEOUT' as const } : m
              );
              persistMissions(next);
              return next;
            });
            if (payload?.vehicleId) {
              setVehicles((prev) =>
                prev.map((v) =>
                  v.vehicle_id === payload.vehicleId
                    ? { ...v, status: 'DELIVERED_IDLE' as const, speed_kmh: 0, route_progress_pct: 100 }
                    : v
                )
              );
            }
            setAlerts((prev) => [
              {
                id: `pending-closeout-sync-${Date.now()}`,
                vehicle_id: payload.vehicleId || 'Convoy',
                vehicle_name: payload.vehicleId || 'Convoy',
                cargo_type: 'Relief Handover',
                timestamp: new Date().toISOString(),
                severity: 'HIGH RISK',
                type: 'DELIVERY_PENDING_CLOSEOUT',
                title: 'FIELD DELIVERY COMPLETED — PENDING ADMIN SIGN-OFF',
                message: `${payload.reportedBy || 'Field Officer'} reported relief delivery finished for mission ${payload.missionId}. Awaiting Admin sign-off.`,
                coords: [24.22, 92.67],
                acknowledged: false,
              },
              ...prev,
            ]);
          }
        })
        .on('broadcast', { event: 'MISSION_CLOSED_OUT' }, ({ payload }: any) => {
          if (payload?.missionId) {
            setActiveMissions((prev) => {
              const filtered = prev.filter(
                (m) => !(payload.communityId && m.communityId === payload.communityId && m.status === 'SUGGESTED')
              );
              const next = filtered.map((m) =>
                m.id === payload.missionId ? { ...m, status: 'DELIVERED' as const } : m
              );
              persistMissions(next);
              return next;
            });
            if (payload?.vehicleId) {
              setVehicles((prev) =>
                prev.map((v) =>
                  v.vehicle_id === payload.vehicleId
                    ? { ...v, status: 'AVAILABLE' as const, speed_kmh: 0, mission_id: '', route_progress_pct: 0 }
                    : v
                )
              );
            }
            if (payload?.communityId) {
              setRawCommunities((prev) => {
                const next = prev.map((c) =>
                  c.id === payload.communityId
                    ? {
                        ...c,
                        elapsedTimeHours: 0,
                        inventories: {
                          IV_FLUIDS: { lastStock: 400, baselineDailyBurn: c.inventories.IV_FLUIDS?.baselineDailyBurn || 40, standardCapacity: c.inventories.IV_FLUIDS?.standardCapacity || 400 },
                          ANTIVENOM: { lastStock: 120, baselineDailyBurn: c.inventories.ANTIVENOM?.baselineDailyBurn || 12, standardCapacity: c.inventories.ANTIVENOM?.standardCapacity || 120 },
                          GRAIN_RICE: { lastStock: 1500, baselineDailyBurn: c.inventories.GRAIN_RICE?.baselineDailyBurn || 120, standardCapacity: c.inventories.GRAIN_RICE?.standardCapacity || 1500 },
                          DIESEL: { lastStock: 800, baselineDailyBurn: c.inventories.DIESEL?.baselineDailyBurn || 60, standardCapacity: c.inventories.DIESEL?.standardCapacity || 800 },
                        },
                      }
                    : c
                );
                persistCommunities(next);
                return next;
              });
            }
          }
        })
        .on('broadcast', { event: 'HAZARD_ZONE_UPDATED' }, ({ payload }: any) => {
          if (payload?.zone) {
            setHazardPolygons((prev) => {
              const exists = prev.some((z) => z.id === payload.zone.id);
              return exists
                ? prev.map((z) => (z.id === payload.zone.id ? payload.zone : z))
                : [payload.zone, ...prev];
            });
          }
        })
        .subscribe();
    } catch (err) {
      console.warn('[PRAVAH] Supabase Realtime channel setup error:', err);
    }

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

const INITIAL_DRAFT_PLOTS: DraftIncidentPlot[] = [
  {
    id: 'DRAFT-CITIZEN-001',
    title: 'NH-29 Pagla Pahar Landslide',
    corridor: 'NH-29 (Dimapur-Kohima Corridor)',
    coordinates: [25.765, 93.948],
    hazardType: 'Landslide',
    severity: 'TOTAL_BLOCKAGE',
    estimatedCutoffHours: 6,
    summary: 'Massive mudflow and boulders blocking both lanes near Pagla Pahar bridge. Convoy passage impassable.',
    citationsCount: 4,
    sourceReport: {
      reporterName: 'Toshi Ao',
      role: 'Local Citizen',
      rawText: 'Huge landslide at Pagla Pahar on NH-29 right after the bridge, mud and heavy rocks covering highway completely.',
      timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    },
    aiValidation: {
      isGeographicallyConsistent: true,
      confidenceScore: 9,
      landmarkVerified: 'Pagla Pahar Bridge Sector (NH-29)',
      geminiModelUsed: 'gemini-3.5-flash-lite',
    },
    status: 'PENDING_APPROVAL',
    submittedAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
  },
  {
    id: 'DRAFT-CITIZEN-002',
    title: 'NH-10 Teesta River Corridor Rockfall',
    corridor: 'NH-10 (Siliguri-Gangtok Corridor)',
    coordinates: [27.085, 88.465],
    hazardType: 'Rockfall',
    severity: 'SINGLE_LANE_PASSABLE',
    estimatedCutoffHours: 3,
    summary: 'Debris from hill cutting near 29th Mile. Single lane passable with high caution for light utility rigs.',
    citationsCount: 2,
    sourceReport: {
      reporterName: 'Sonam Bhutia',
      role: 'Field Officer (BRO/Police)',
      rawText: 'Active rockfall near 29th Mile on NH-10. BRO earthmovers deployed, single lane movement operating slowly.',
      timestamp: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    },
    aiValidation: {
      isGeographicallyConsistent: true,
      confidenceScore: 8,
      landmarkVerified: '29th Mile Teesta Gorge Sector (NH-10)',
      geminiModelUsed: 'gemini-3.5-flash-lite',
    },
    status: 'PENDING_APPROVAL',
    submittedAt: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
  },
];

const INITIAL_APPROVED_PLOTS: DraftIncidentPlot[] = [
  {
    id: 'APR-DISPATCH-001',
    title: 'NH-306 Kolasib Mountain Slump Verified',
    corridor: 'NH-306 (Silchar-Aizawl Corridor)',
    coordinates: [24.225, 92.68],
    hazardType: 'Road Subsidence',
    severity: 'TOTAL_BLOCKAGE',
    estimatedCutoffHours: 8,
    summary: 'Road subsidence at Km 42 near Kolasib North. Verified by District Magistrate and plotted to active tactical map.',
    citationsCount: 6,
    sourceReport: {
      reporterName: 'Lalrempuia (Mizoram State Transport)',
      role: 'Field Officer (BRO/Police)',
      rawText: 'Pavement caved in following torrential rain overnight. Heavy vehicles halted at Vairengte border.',
      timestamp: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
    },
    aiValidation: {
      isGeographicallyConsistent: true,
      confidenceScore: 10,
      landmarkVerified: 'Kolasib North Km 42 (NH-306)',
      geminiModelUsed: 'gemini-3.5-flash-lite',
    },
    status: 'APPROVED',
    submittedAt: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
  },
];

const INITIAL_REJECTED_REPORTS: RejectedReport[] = [
  {
    id: 'REJ-001',
    rawText: 'Aliens spotted landing flying saucer near Kohima bypass road, traffic halted!',
    reporterName: 'Anonymous Troll',
    timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    rejectionReason: 'Gemini Safety Filter & Fact Verification: Hallucinatory or fictitious emergency claim devoid of regional geographic corroboration.',
    flaggedAs: 'SPAM_TROLL',
  },
];

  // =========================================================================
  // 16. Gemini AI Intelligence Pipeline (Native Multimodal & Adaptive Rerouting)
  // =========================================================================
  const [draftPlots, setDraftPlots] = useState<DraftIncidentPlot[]>(() => INITIAL_DRAFT_PLOTS);
  const [approvedDraftPlots, setApprovedDraftPlots] = useState<DraftIncidentPlot[]>(() => INITIAL_APPROVED_PLOTS);
  const [rejectedReports, setRejectedReports] = useState<RejectedReport[]>(() => INITIAL_REJECTED_REPORTS);

  const [rerouteProposals, setRerouteProposals] = useState<RerouteProposal[]>([]);
  const [geminiApiKey, setGeminiApiKeyState] = useState<string>(() => getGeminiApiKey());

  const setGeminiApiKey = useCallback((key: string) => {
    persistGeminiApiKey(key);
    setGeminiApiKeyState(key);
  }, []);

  const submitCitizenReport = useCallback(
    async (params: {
      rawText: string;
      coords: [number, number];
      reporterName?: string;
      photoUrl?: string;
      voiceNoteUrl?: string;
    }): Promise<CitizenVerificationResult> => {
      const result = await verifyAndStructureCitizenReport({
        rawText: params.rawText,
        coords: params.coords,
        reporterName: params.reporterName || 'Local Citizen',
        existingPlots: draftPlots,
        photoUrl: params.photoUrl,
        voiceNoteUrl: params.voiceNoteUrl,
      });

      if (result.status === 'REJECTED') {
        const rej: RejectedReport = {
          id: `REJ-${Date.now()}`,
          rawText: params.rawText,
          reporterName: params.reporterName || 'Anonymous Citizen',
          timestamp: new Date().toISOString(),
          rejectionReason: result.rejectionReason || 'Filtered by AI spam/coercion detector',
          flaggedAs: result.flaggedAs || 'SPAM_TROLL',
        };
        setRejectedReports((prev) => [rej, ...prev]);
      } else if (result.status === 'DUPLICATE' && result.duplicateOfId) {
        setDraftPlots((prev) =>
          prev.map((d) => (d.id === result.duplicateOfId ? { ...d, citationsCount: d.citationsCount + 1 } : d))
        );
      } else if (result.status === 'NEW_DRAFT' && result.draftPlot) {
        setDraftPlots((prev) => [result.draftPlot!, ...prev]);
        upsertCloudDraftReport(result.draftPlot!);
      }

      return result;
    },
    [draftPlots]
  );

  const submitOfficerReport = useCallback(
    async (params: {
      rawText: string;
      coords: [number, number];
      officerName?: string;
      nearestLandmark?: string;
      photoUrl?: string;
    }): Promise<DraftIncidentPlot> => {
      const structured = await structureOfficerReport({
        rawText: params.rawText,
        coords: params.coords,
        officerName: params.officerName || 'BRO Field Commander',
        nearestLandmark: params.nearestLandmark,
        photoUrl: params.photoUrl,
      });

      // Direct fast-track: plot immediately to live map!
      addIncident({
        title: structured.title,
        corridorFlair: structured.corridor,
        incidentType: structured.hazardType as any,
        severity: structured.severity === 'TOTAL_BLOCKAGE' ? 'Total Blockage' : 'Single Lane Passable',
        location: {
          lat: structured.coordinates[0],
          lng: structured.coordinates[1],
          placeName: structured.corridor,
          corridorId: structured.corridor.includes('NH-29')
            ? 'SEG-DIM-KOH'
            : structured.corridor.includes('NH-306')
            ? 'SEG-SIL-KOL'
            : 'SEG-TEESTA-GANG',
        },
        author: {
          name: structured.sourceReport.reporterName,
          role: structured.sourceReport.role,
        },
        timestamp: structured.sourceReport.timestamp,
        mediaUrl: structured.sourceReport.photoUrl || '',
      });

      return structured;
    },
    [addIncident]
  );

  const addDraftPlot = useCallback((plot: DraftIncidentPlot) => {
    setDraftPlots((prev) => [plot, ...prev.filter((d) => d.id !== plot.id)]);
    upsertCloudDraftReport(plot);
  }, []);

  const approveDraftPlot = useCallback(
    async (draftOrId: string | DraftIncidentPlot) => {
      const target =
        typeof draftOrId === 'string'
          ? draftPlots.find((d) => d.id === draftOrId) || approvedDraftPlots.find((d) => d.id === draftOrId)
          : draftOrId;
      if (!target) return;

      // 1. Move to approvedDraftPlots & remove from pending review queue
      const approvedPlot: DraftIncidentPlot = {
        ...target,
        status: 'APPROVED',
      };
      setApprovedDraftPlots((prev) => [approvedPlot, ...prev.filter((d) => d.id !== target.id)]);
      setDraftPlots((prev) => prev.filter((d) => d.id !== target.id));

      // Persist approved draft state to Supabase Cloud
      upsertCloudDraftReport(approvedPlot);

      // 2. Add to live incidents & road disruptions with guaranteed valid coordinates
      const [lat, lng] = ensureLatLng(target.coordinates);
      const corridorId = resolveCorridorSegmentId(target.corridor, [lat, lng]);

      const newIncident: Incident = {
        id: `inc-${Date.now()}`,
        title: target.title,
        corridorFlair: target.corridor,
        incidentType: target.hazardType as any,
        severity: target.severity === 'TOTAL_BLOCKAGE' ? 'Total Blockage' : 'Single Lane Passable',
        location: {
          lat,
          lng,
          placeName: target.corridor,
          corridorId,
        },
        author: {
          name: target.sourceReport?.reporterName || 'Gemini AI Copilot',
          role: 'Field Officer (BRO/Police)',
        },
        timestamp: target.sourceReport?.timestamp || new Date().toISOString(),
        mediaUrl: target.sourceReport?.photoUrl || '',
        votes: { upvotes: 1, downvotes: 0, userVote: 'up' },
        confidenceScore: 15,
        hasOfficerVerified: true,
        sync_status: isOnline ? 'SYNCED' : 'PENDING',
        updates: [],
      };

      // 3. Add to local and persisted incidents feed
      setIncidents((prev) => {
        const next = [newIncident, ...prev.filter((i) => i.id !== newIncident.id)];
        persistIncidents(next);
        return next;
      });

      // 4. Update road disruptions so routing engines immediately calculate detours
      const disruptionData: SegmentIncident = {
        status: target.severity === 'TOTAL_BLOCKAGE' ? ('TOTAL_BLOCKAGE' as const) : ('SINGLE_LANE_PASSABLE' as const),
        cause: target.hazardType,
        description: target.title,
        reportedBy: `${newIncident.author.name} (${newIncident.author.role})`,
        location: { lat, lng },
        incidentId: newIncident.id,
        severity: target.severity,
      };

      setActiveDisruptions((prev) => {
        const next = {
          ...prev,
          [corridorId]: disruptionData,
        };
        if (corridorId === 'SEG-DIM-KOH-MAIN') {
          next['SEG-DIM-KOH'] = disruptionData;
        }
        persistDisruptions(next);
        return next;
      });

      // 5. Save incident and disruption directly to Supabase
      if (isSupabaseConfigured) {
        upsertCloudIncident(newIncident);
        upsertCloudDisruption(corridorId, disruptionData);
        if (corridorId === 'SEG-DIM-KOH-MAIN') {
          upsertCloudDisruption('SEG-DIM-KOH', disruptionData);
        }
      }

      // 6. Broadcast event over socket if connected
      if (socketRef.current?.connected) {
        socketRef.current.emit('SUBMIT_INCIDENT', newIncident);
      }

      // 7. Redirect and focus map directly onto the approved incident coordinates
      focusMapOnCoords([lat, lng], 13.5, target.id);

      // 8. Adaptive Rerouting Cascade: Check ongoing convoys traversing affected corridor
      const affectedMissions = activeMissions.filter(
        (m) =>
          isMissionOngoing(m) &&
          ((corridorId.includes('DIM-KOH') && (m.assignedRouteId?.includes('NL') || m.id.includes('NL'))) ||
            (corridorId.includes('SIL-KOL') && (m.assignedRouteId?.includes('MZ') || m.id.includes('MZ'))) ||
            (target.corridor.includes('NH-10') && (m.assignedRouteId?.includes('SK') || m.id.includes('SK'))))
      );

      for (const mission of affectedMissions) {
        const vehicle = vehicles.find((v) => v.vehicle_id === mission.assignedVehicleId) || vehicles[0];
        const newProposal: RerouteProposal = {
          id: `REROUTE-${mission.id}-${Date.now()}`,
          missionId: mission.id,
          vehicleId: vehicle.vehicle_id,
          vehicleName: vehicle.vehicle_name,
          driverName: vehicle.driver_name,
          blockedSegmentId: corridorId,
          blockedSegmentName: target.corridor,
          incidentSummary: target.summary,
          currentRouteId: mission.assignedRouteId || 'ROUTE-DEFAULT',
          proposedRouteId: corridorId.includes('DIM-KOH') ? 'ROUTE-NL-02' : 'ROUTE-SUG-02',
          proposedRouteName: corridorId.includes('DIM-KOH')
            ? 'Mokokchung / Wokha Mountain Bypass'
            : 'NH-108 Tripura / Mamit High-Clearance Bypass',
          distanceDeltaKm: 34.5,
          etaDeltaMinutes: 55,
          status: 'PENDING_APPROVAL',
          proposedAt: new Date().toISOString(),
        };
        setRerouteProposals((prev) => [newProposal, ...prev.filter((p) => p.missionId !== mission.id)]);
      }
    },
    [draftPlots, approvedDraftPlots, activeMissions, vehicles, isOnline, isSupabaseConfigured, focusMapOnCoords]
  );

  const dismissDraftPlot = useCallback((draftId: string) => {
    const target = draftPlots.find((d) => d.id === draftId);
    setDraftPlots((prev) => prev.filter((d) => d.id !== draftId));
    deleteCloudDraftReport(draftId);
    if (target) {
      setRejectedReports((prev) => [
        {
          id: `REJ-${Date.now()}`,
          rawText: target.sourceReport.rawText,
          reporterName: target.sourceReport.reporterName,
          timestamp: new Date().toISOString(),
          rejectionReason: 'Dismissed by Dispatcher: Insufficient ground verification or non-actionable obstruction.',
          flaggedAs: 'GEOGRAPHIC_MISMATCH',
        },
        ...prev,
      ]);
    }
  }, [draftPlots]);

  const approveRerouteProposal = useCallback(
    (proposalId: string) => {
      const proposal = rerouteProposals.find((p) => p.id === proposalId);
      if (!proposal) return;

      setRerouteProposals((prev) =>
        prev.map((p) => (p.id === proposalId ? { ...p, status: 'APPROVED' as const } : p))
      );

      // Update mission assigned route
      setActiveMissions((prev) =>
        prev.map((m) => {
          if (m.id === proposal.missionId) {
            return {
              ...m,
              assignedRouteId: proposal.proposedRouteId,
            };
          }
          return m;
        })
      );

      // Update vehicle route & push dispatch alert
      setVehicles((prev) =>
        prev.map((v) => {
          if (v.vehicle_id === proposal.vehicleId) {
            return {
              ...v,
              assigned_route_id: proposal.proposedRouteId,
            };
          }
          return v;
        })
      );

      const targetVeh = vehicles.find((v) => v.vehicle_id === proposal.vehicleId);
      const rerouteAlert: AlertEvent = {
        id: `alert-reroute-${Date.now()}`,
        vehicle_id: proposal.vehicleId,
        vehicle_name: proposal.vehicleName,
        cargo_type: 'Relief Convoy',
        timestamp: new Date().toISOString(),
        severity: 'WARNING',
        type: 'ROUTE_DEVIATION',
        title: 'OFFICIAL DETOUR ROUTE ASSIGNED',
        message: `Command Dispatch has approved ${proposal.proposedRouteName} due to blockage on ${proposal.blockedSegmentName}. GPS guidance updated.`,
        coords: targetVeh?.current_coords || [24.833, 92.778],
        acknowledged: false,
      };
      setAlerts((prev) => [rerouteAlert, ...prev]);

      if (socketRef.current?.connected) {
        socketRef.current.emit('DRIVER_REROUTE_ASSIGNED', { proposal, alert: rerouteAlert });
      }
    },
    [rerouteProposals]
  );

  const dismissRerouteProposal = useCallback((proposalId: string) => {
    setRerouteProposals((prev) => prev.filter((p) => p.id !== proposalId));
  }, []);

  const updateMissionWithAi = useCallback(
    async (missionId: string, prompt: string): Promise<string> => {
      const mission = activeMissions.find((m) => m.id === missionId);
      if (!mission) throw new Error('Mission not found');

      const { modifiedMission, explanation } = await editMissionWithAi(mission, prompt);
      setActiveMissions((prev) => prev.map((m) => (m.id === missionId ? modifiedMission : m)));
      return explanation;
    },
    [activeMissions]
  );

  const updateRerouteWithAi = useCallback(
    async (proposalId: string, prompt: string): Promise<string> => {
      const proposal = rerouteProposals.find((p) => p.id === proposalId);
      if (!proposal) throw new Error('Proposal not found');

      const { modifiedProposal, explanation } = await editRerouteWithAi(proposal, prompt);
      setRerouteProposals((prev) => prev.map((p) => (p.id === proposalId ? modifiedProposal : p)));
      return explanation;
    },
    [rerouteProposals]
  );

  const value = {
    userContext,
    activeRole,
    switchRole,
    activeView,
    setActiveView,
    theme,
    toggleTheme,
    isOnline,
    isSimulatedOffline,
    offlineQueueCount: offlineQueue.length + getOfflineMutationQueue().length,
    offlineQueue,
    lastDataSyncTime,
    lastOfflineTransitionTime,
    toggleSimulatedOffline,
    flushOfflineQueue,
    isSupabaseConfigured,
    originHub,
    setOriginHub,
    destinationHub,
    setDestinationHub,
    selectedVehicle,
    setSelectedVehicle,
    candidateRoutes,
    selectedRouteIndex,
    setSelectedRouteIndex,
    activeDisruptions,
    setSegmentDisruption,
    clearAllDisruptions,
    triggerScenarioNH6Landslide,
    triggerScenarioNH29FlashFlood,
    triggerScenarioHaflongBridgeRisk,
    activeLayers,
    toggleLayer,
    imdFilter,
    setImdFilter,
    rainfallMmHr,
    setRainfallMmHr,
    isMonsoonDownpourSimulated,
    toggleMonsoonDownpourSimulation,
    vehicles,
    selectedVehicleId,
    setSelectedVehicleId,
    alerts,
    acknowledgeAlert,
    isSimulationRunning,
    toggleSimulation,
    simulationSpeed,
    setSimulationSpeed,
    toggleVehicleHalt,
    toggleVehicleDeviation,
    triggerVehicleSOS,
    cancelVehicleSOS,
    communities,
    selectedCommunityId,
    setSelectedCommunityId,
    advanceCommunityElapsedHours,
    incidents,
    addIncident,
    voteIncident,
    addIncidentUpdate,
    districtsHealth,
    broBottlenecks,
    deployBROAsset,
    currentLanguage,
    setLanguage,
    broadcastDrafts,
    activeBroadcastLanguage,
    setActiveBroadcastLanguage,
    sendBroadcast,
    markMissionDelivered,
    activeMissions,
    selectedMissionId,
    setSelectedMissionId,
    customizingMission,
    setCustomizingMission,
    approveMission,
    dispatchMission,
    approveAndDispatchMission,
    customizeMission,
    reportMissionDeliveryByField,
    adminCloseoutMission,
    hazardPolygons,
    refreshHazardPolygons,
    pendingSOSAlert,
    setPendingSOSAlert,
    runDemoStep1,
    runDemoStep2,
    runDemoStep3,
    resetDemoSimulation,
    // 12. Gemini AI Intelligence Pipeline
    draftPlots,
    approvedDraftPlots,
    rejectedReports,
    rerouteProposals,
    geminiApiKey,
    setGeminiApiKey,
    submitCitizenReport,
    submitOfficerReport,
    addDraftPlot,
    approveDraftPlot,
    dismissDraftPlot,
    approveRerouteProposal,
    dismissRerouteProposal,
    updateMissionWithAi,
    updateRerouteWithAi,
    pendingMapFocus,
    setPendingMapFocus,
    focusMapOnCoords,
  };

  return <PravahStoreContext.Provider value={value}>{children}</PravahStoreContext.Provider>;
};

export const usePravahStore = (): PravahStoreContextType => {
  const context = useContext(PravahStoreContext);
  if (!context) {
    throw new Error('usePravahStore must be used within a PravahStoreProvider');
  }
  return context;
};
