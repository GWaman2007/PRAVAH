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
  VehicleStatus,
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
  DriverEmergencyRouteAlert,
  DraftIncidentPlot,
  RejectedReport,
  RerouteProposal,
  MultimodalAdminIntelInput,
  ResponseHub,
  HubInventory,
  InventoryTransaction,
  CandidateHubEvaluation,
  ModelAPrediction,
  MissionRouteOption,
  ResourceRequirementItem,
  ResourceRequest,
  FieldOfficerProfile,
  CommodityType,
} from '../types';
import {
  generateAndRankMissionRoutes,
  calculateMissionReroute,
  resolveCorridorBypassSegments,
  spliceRouteFromVehicleCoords,
  computePolylineDistanceKm,
  haversineDistanceKm,
} from '../engine/modelBRouteRankingService';
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
import { OSRM_PRECOMPUTED_ALTERNATIVES } from '../data/osrmPrecomputedAlternatives';
import { INITIAL_DISTRICTS_HEALTH, INITIAL_BRO_BOTTLENECKS } from '../data/executiveData';
import { SUPPORTED_LANGUAGES, PRESET_TRANSLATIONS, PHONETIC_READINGS, generateBroadcastForIncident } from '../data/translationsData';
import { findKShortestPaths, evaluateAndRankPaths } from '../engine/routingEngine';
import { calculateCompositePriority } from '../engine/priorityEngine';
import { stepVehicleSimulation, initRouteDistances } from '../engine/telemetryEngine';
import {
  generateDynamicMissionSuggestions,
  isMissionOngoing,
  COMMUNITY_ROUTING_PROFILES,
  generateDeterministicDemoMissions,
  FIELD_OFFICERS,
  generateMissionFromResourceRequest,
  createManualReliefMission,
} from '../engine/missionEngine';
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
  loadOfflineHubs,
  saveOfflineHubs,
  loadOfflineInventory,
  saveOfflineInventory,
  loadOfflineTransactions,
  saveOfflineTransactions,
} from '../engine/offlineSync';
import {
  calculateAvailableQuantity,
  isInventoryLowStock,
  checkHubInventoryFeasibility,
  checkHubVehicleFeasibility,
  findCandidateHubsForCommunity,
} from '../engine/hubLogisticsService';
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
  fetchCloudHubs,
  upsertCloudHub,
  fetchCloudInventory,
  upsertCloudInventory,
  fetchCloudTransactions,
  insertCloudTransaction,
  fetchCloudModelAPredictions,
  upsertCloudModelAPrediction,
  upsertCloudMissionRouteOptions,
  fetchCloudMissionRouteOptions,
  fetchCloudResourceRequests,
  upsertCloudResourceRequest,
} from '../engine/supabaseClient';
import { predictSegmentRisk, batchPredictSegmentRisks, clearModelCache, getAuthoritativeMissionExposure, calculateRouteModelAExposureFromCache } from '../engine/modelAService';
import { buildModelAFeatures } from '../engine/modelAFeatureBuilder';

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
    modelA: boolean;
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
  activeDriverEmergencyAlert: DriverEmergencyRouteAlert | null;
  dispatchDriverEmergencyAlert: (alert: DriverEmergencyRouteAlert) => void;
  acknowledgeDriverEmergencyAlert: (alertId: string) => void;

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

  // Model B Route Options & Dynamic Routing
  missionRouteOptionsByMissionId: Record<string, MissionRouteOption[]>;
  selectedRouteOptionByMissionId: Record<string, string>;
  modelBLoading: boolean;
  modelBError: string | null;
  generateMissionRouteOptions: (mission: ReliefMission) => Promise<MissionRouteOption[]>;
  selectMissionRoute: (missionId: string, optionId: string) => void;
  rerouteMission: (missionId: string, customOption?: MissionRouteOption, reason?: string) => Promise<boolean>;

  // Real-Time Hazard Polygons (APIs & Cloud)
  hazardPolygons: RealtimeHazardPolygon[];
  refreshHazardPolygons: () => Promise<void>;

  // Driver SOS Distress Signal Intercept
  pendingSOSAlert: AlertEvent | null;
  setPendingSOSAlert: (alert: AlertEvent | null) => void;

  // Demo Mode (Data Injection Only, No Running Scripts)
  isDemoMode: boolean;
  toggleDemoMode: () => void;
  resetDemoMode: (action?: 'restart' | 'turn_off') => void;
  resetCommunityScenario: (communityId?: string) => void;

  // Field Officer Multi-Context & Requisitions
  activeOfficerId: string;
  setActiveOfficerId: (officerId: string) => void;
  resourceRequirements: Record<string, ResourceRequirementItem[]>;
  resourceRequests: ResourceRequest[];
  submitResourceRequest: (reqData: Omit<ResourceRequest, 'id' | 'createdAt' | 'status'>) => void;
  createManualMission: (params: {
    missionName: string;
    originWarehouseId: string;
    destinationCommunityId: string;
    cargoAllocations: { item: string; quantity: number; unit: string }[];
    urgency: 'P1_CRITICAL' | 'P2_ELEVATED';
    assignedVehicleId?: string;
    assignedDriver?: string;
    notes?: string;
    deadline?: string;
  }) => void;

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

  // 13. Hubs & Emergency Logistics Resources Layer
  hubs: ResponseHub[];
  selectedHubId: string | null;
  inventory: HubInventory[];
  transactions: InventoryTransaction[];
  setSelectedHubId: (id: string | null) => void;
  getHubById: (id: string) => ResponseHub | undefined;
  getHubInventory: (hubId: string) => HubInventory[];
  getHubVehicles: (hubId: string) => VehicleTelemetry[];
  getAvailableInventory: (hubId: string) => HubInventory[];
  getAvailableVehicles: (hubId?: string) => VehicleTelemetry[];
  findInventoryFeasibleHubs: (requiredItems: { resourceName: string; quantity: number }[]) => ResponseHub[];
  updateHubStatus: (hubId: string, status: ResponseHub['status']) => Promise<boolean>;
  updateHubDetails: (hub: Partial<ResponseHub> & { id: string }) => Promise<boolean>;
  adjustHubInventory: (hubId: string, inventoryId: string, deltaQuantity: number, reason: string) => Promise<boolean>;
  addHubInventoryItem: (hubId: string, item: Omit<HubInventory, 'id' | 'hubId' | 'lastUpdated'>) => Promise<boolean>;
  reserveInventoryForMission: (hubId: string, allocations: { resourceName: string; quantity: number }[], missionId: string) => Promise<boolean>;
  releaseMissionInventory: (hubId: string, missionId: string) => Promise<boolean>;
  dispatchReservedInventory: (hubId: string, missionId: string) => Promise<boolean>;
  assignVehicleToHub: (vehicleId: string, hubId: string) => Promise<boolean>;

  // 14. Model A Road-Disruption Predictive Risk Layer
  modelAPredictions: Record<string, ModelAPrediction>;
  isModelALoading: boolean;
  modelAError: string | null;
  fetchModelAPrediction: (segmentId: string) => Promise<ModelAPrediction | null>;
  fetchModelAPredictionsForSegments: (segmentIds: string[], forceFresh?: boolean) => Promise<Record<string, ModelAPrediction>>;
  refreshModelAPredictions: () => Promise<void>;
  getModelAPrediction: (segmentId: string) => ModelAPrediction | undefined;
}

const KOLASIB_RESOURCE_REQUIREMENTS: ResourceRequirementItem[] = [
  { resourceType: 'Food Kits', required: 100, available: 20, shortage: 80, unit: 'kits', urgency: 'CRITICAL', lastUpdated: '12 min ago' },
  { resourceType: 'Water Units', required: 50, available: 10, shortage: 40, unit: 'cans (20L)', urgency: 'CRITICAL', lastUpdated: '15 min ago' },
  { resourceType: 'Medical Kits', required: 20, available: 3, shortage: 17, unit: 'trauma kits', urgency: 'CRITICAL', lastUpdated: '10 min ago' },
  { resourceType: 'Tarpaulins / Shelter Kits', required: 40, available: 15, shortage: 25, unit: 'sets', urgency: 'HIGH', lastUpdated: '35 min ago' },
];

const INITIAL_RESOURCE_REQUIREMENTS: Record<string, ResourceRequirementItem[]> = {
  'MZ-KOL-004': KOLASIB_RESOURCE_REQUIREMENTS,
  COMMUNITY_KOLASIB: KOLASIB_RESOURCE_REQUIREMENTS,
  COMMUNITY_KOHIMA: [
    { resourceType: 'Food Kits', required: 80, available: 35, shortage: 45, unit: 'kits', urgency: 'HIGH', lastUpdated: '1 hr ago' },
    { resourceType: 'Water Units', required: 60, available: 25, shortage: 35, unit: 'cans (20L)', urgency: 'HIGH', lastUpdated: '1 hr ago' },
    { resourceType: 'Medical Kits', required: 15, available: 5, shortage: 10, unit: 'trauma kits', urgency: 'MEDIUM', lastUpdated: '2 hr ago' },
  ],
  COMMUNITY_TEESTA: [
    { resourceType: 'Food Kits', required: 120, available: 20, shortage: 100, unit: 'kits', urgency: 'CRITICAL', lastUpdated: '25 min ago' },
    { resourceType: 'Water Units', required: 80, available: 15, shortage: 65, unit: 'cans (20L)', urgency: 'CRITICAL', lastUpdated: '20 min ago' },
    { resourceType: 'Medical Kits', required: 30, available: 4, shortage: 26, unit: 'trauma kits', urgency: 'CRITICAL', lastUpdated: '18 min ago' },
  ],
  COMMUNITY_HAFLONG: [
    { resourceType: 'Food Kits', required: 50, available: 20, shortage: 30, unit: 'kits', urgency: 'MEDIUM', lastUpdated: '3 hr ago' },
    { resourceType: 'Water Units', required: 40, available: 15, shortage: 25, unit: 'cans (20L)', urgency: 'MEDIUM', lastUpdated: '3 hr ago' },
    { resourceType: 'Medical Kits', required: 10, available: 2, shortage: 8, unit: 'trauma kits', urgency: 'HIGH', lastUpdated: '3 hr ago' },
  ],
};

const INITIAL_RESOURCE_REQUESTS: ResourceRequest[] = [
  {
    id: 'REQ-MZ-001',
    officerId: 'hmar',
    officerName: 'Inspector L. Hmar',
    communityId: 'MZ-KOL-004',
    communityName: 'Kolasib East Community Depot',
    resourceType: 'Medical Kits',
    quantity: 17,
    unit: 'trauma kits',
    urgency: 'CRITICAL',
    reason: 'Medical stock depleted due to flood inundation and trauma cases.',
    notes: 'Access via Silchar-Kolasib road restricted. Urgent resupply needed.',
    status: 'PROCESSING',
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
];

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

  // Demo Mode State (Always OFF on initial reload/mount)
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Guarantee demo mode and any leftover demo keys are completely purged on mount/reload
  useEffect(() => {
    try {
      localStorage.removeItem('pravah_demo_mode');
      const storedMissions = localStorage.getItem(STORAGE_KEYS.MISSIONS);
      if (storedMissions && (storedMissions.includes('ROUTE-SUG-01-DETOUR') || storedMissions.includes('MSN-REQ-MZKOL-DEMO'))) {
        localStorage.removeItem(STORAGE_KEYS.MISSIONS);
      }
      const storedDisruptions = localStorage.getItem(STORAGE_KEYS.DISRUPTIONS);
      if (storedDisruptions && storedDisruptions.includes('65mm/hr')) {
        localStorage.removeItem(STORAGE_KEYS.DISRUPTIONS);
      }
    } catch {}
  }, []);

  // Field Officer multi-selection state
  const [activeOfficerId, setActiveOfficerId] = useState<string>('hmar');

  // Field Officer Multi-Context & Requisitions State
  const [resourceRequirements, setResourceRequirements] = useState<Record<string, ResourceRequirementItem[]>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('pravah_resource_requirements');
        if (stored) return JSON.parse(stored);
      } catch (e) {
        console.warn('Failed to load stored resource requirements', e);
      }
    }
    return INITIAL_RESOURCE_REQUIREMENTS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('pravah_resource_requirements', JSON.stringify(resourceRequirements));
    } catch (e) {
      // ignore
    }
  }, [resourceRequirements]);

  const [resourceRequests, setResourceRequests] = useState<ResourceRequest[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('pravah_resource_requests');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            return parsed.filter((r: ResourceRequest) => r.id !== 'REQ-MZ-KOL-DEMO');
          }
        }
      } catch (e) {
        console.warn('Failed to load stored resource requests', e);
      }
    }
    return INITIAL_RESOURCE_REQUESTS;
  });

  useEffect(() => {
    if (!isDemoMode) {
      try {
        localStorage.setItem('pravah_resource_requests', JSON.stringify(resourceRequests));
      } catch (e) {
        // ignore
      }
    }
  }, [resourceRequests, isDemoMode]);

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
      case 'FIELD_OFFICER': {
        const officer = FIELD_OFFICERS.find((o) => o.id === activeOfficerId) || FIELD_OFFICERS[0];
        return {
          role: 'FIELD_OFFICER',
          name: officer.name,
          department: officer.department,
          badgeId: officer.badgeId,
          activeMissionId: officer.activeMissionId,
          assignedVehicleId: officer.assignedVehicleId,
          jurisdictionState: officer.jurisdictionState,
          communityId: officer.communityId,
          communityName: officer.communityName,
          officerId: officer.id,
          avatar: officer.avatar,
        };
      }
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
  }, [activeRole, activeOfficerId]);

  const switchRole = useCallback((role: UserRole) => {
    setActiveRole(role);
    if (role === 'DRIVER') {
      setActiveView('MOBILE_COCKPIT');
    } else if (role === 'FIELD_OFFICER') {
      setActiveView('FO_COMMUNITY');
    } else {
      setActiveView((current) => (current === 'MOBILE_COCKPIT' || current.startsWith('FO_') ? 'GIS_COMMAND' : current));
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
          'HUBS_RESOURCES',
          'FO_COMMUNITY',
          'FO_MISSIONS',
          'FO_REQUIREMENTS',
          'FO_MY_REPORTS',
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
    modelA: true, // Visible by default for tactical hazard intelligence!
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
    const baseDisruptions: Record<string, SegmentIncident> = {
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
      'SEG-SK-TEESTA': {
        status: 'TOTAL_BLOCKAGE',
        cause: 'Rockfall_Washout',
        description: '29th Mile Teesta River Canyon road breach',
        reportedBy: 'Capt. P. Bhutia (BRO Project Swastik)',
      },
    };
    const persisted = typeof window !== 'undefined' ? getPersistedDisruptions() : null;
    const merged = persisted ? { ...baseDisruptions, ...persisted } : baseDisruptions;
    if (merged['SEG-SIL-KOL']?.cause?.includes('65mm/hr') || merged['SEG-SIL-KOL']?.status === 'TOTAL_BLOCKAGE') {
      merged['SEG-SIL-KOL'] = baseDisruptions['SEG-SIL-KOL'];
      try {
        localStorage.setItem(STORAGE_KEYS.DISRUPTIONS, JSON.stringify(merged));
      } catch {}
    }
    return merged;
  });

  useEffect(() => {
    if (!isDemoMode) {
      persistDisruptions(activeDisruptions);
    }
  }, [activeDisruptions, isDemoMode]);

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
    INITIAL_VEHICLES.map((v) => {
      let defaultHubId = 'silchar';
      if (v.vehicle_id.includes('Ration') || v.vehicle_id.includes('Rescue')) defaultHubId = 'dimapur';
      else if (v.vehicle_id.includes('Supply') || v.vehicle_id.includes('Utility') || v.vehicle_id.includes('Command')) defaultHubId = 'guwahati';
      else if (v.vehicle_id.includes('Oxy')) defaultHubId = 'gangtok';

      let capacity = 3500;
      if (v.vehicle_id.includes('Medic')) capacity = 900;
      else if (v.vehicle_id.includes('Cargo') || v.vehicle_id.includes('Ration')) capacity = 5000;
      else if (v.vehicle_id.includes('Oxy')) capacity = 12000;
      else if (v.vehicle_id.includes('Engineer')) capacity = 8000;

      return {
        ...v,
        hub_id: v.hub_id || defaultHubId,
        capacity_kg: v.capacity_kg || capacity,
        fuel_capacity_litres: v.fuel_capacity_litres || 250,
        fuel_level_litres: v.fuel_level_litres || 210,
        status: (v.status || 'AVAILABLE') as VehicleStatus,
        speed_kmh: v.status === 'ON_ROUTE' ? (v.speed_kmh || v.nominal_speed_kmh || 38) : 0,
        mission_id: v.mission_id || '',
        route_progress_pct: v.route_progress_pct || 0,
      };
    })
  );

  // 6a. Hubs & Emergency Logistics Resources State
  const [hubs, setHubs] = useState<ResponseHub[]>(() => loadOfflineHubs());
  const [selectedHubId, setSelectedHubId] = useState<string | null>(() => 'silchar');
  const [inventory, setInventory] = useState<HubInventory[]>(() => loadOfflineInventory());
  const [transactions, setTransactions] = useState<InventoryTransaction[]>(() => loadOfflineTransactions());

  // Hubs & Inventory Offline Persistence
  useEffect(() => {
    saveOfflineHubs(hubs);
  }, [hubs]);

  useEffect(() => {
    saveOfflineInventory(inventory);
  }, [inventory]);

  useEffect(() => {
    saveOfflineTransactions(transactions);
  }, [transactions]);

  // Initial cloud fetch for Hubs, Inventory, and Transactions
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    fetchCloudHubs().then((cloudHubs) => {
      if (cloudHubs && cloudHubs.length > 0) {
        setHubs(cloudHubs);
        saveOfflineHubs(cloudHubs);
      }
    });
    fetchCloudInventory().then((cloudInv) => {
      if (cloudInv && cloudInv.length > 0) {
        setInventory(cloudInv);
        saveOfflineInventory(cloudInv);
      }
    });
    fetchCloudTransactions().then((cloudTx) => {
      if (cloudTx && cloudTx.length > 0) {
        setTransactions(cloudTx);
        saveOfflineTransactions(cloudTx);
      }
    });
    fetchCloudModelAPredictions().then((cloudPreds) => {
      if (cloudPreds && Object.keys(cloudPreds).length > 0) {
        setModelAPredictions((prev) => ({ ...cloudPreds, ...prev }));
      }
    });
  }, [isSupabaseConfigured]);

  // 14. Model A Road-Disruption Predictive Risk State
  const [modelAPredictions, setModelAPredictions] = useState<Record<string, ModelAPrediction>>({});
  const [isModelALoading, setIsModelALoading] = useState<boolean>(false);
  const [modelAError, setModelAError] = useState<string | null>(null);

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
        [
          'pravah_relief_missions',
          'pravah_ner_missions_v1',
          'pravah_ner_missions_v2',
          'pravah_ner_missions_v3',
          'pravah_ner_missions_v4',
        ].forEach((k) => localStorage.removeItem(k));
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
          pm.id !== 'MSN-REQ-MZKOL-DEMO' &&
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

        // Preserve explicit route geometry & rerouted status - NEVER sanitize user-approved rerouted missions, but ensure demo mission starts nominal
        const preserved = deduplicated.map((pm: ReliefMission) => {
          if (pm.id === 'MSN-ONGOING-NL01') {
            const nlRoute = FLEET_ROUTES['ROUTE-SUG-02'] || FLEET_ROUTES['ROUTE-NL-01'];
            return {
              ...pm,
              destinationName: 'Kohima South Ridge Depot',
              isRerouted: false,
              assignedRouteId: nlRoute?.id || 'ROUTE-SUG-02',
              suggestedDetour: 'NH-29 Pagla Pahar High Ridge Corridor',
              routeGeometry: nlRoute?.coordinates || pm.routeGeometry,
              routeStatus: 'OPTIMAL' as const,
              disruptionProbability: 0.15,
              initialDisruptionProbability: 0.15,
            };
          }
          if (pm.id === 'MSN-ONGOING-SK01') {
            return {
              ...pm,
              destinationName: '29th Mile Teesta Canyon Emergency Post',
              routeStatus: 'UNAVAILABLE' as const,
              disruptionProbability: 0.86,
              initialDisruptionProbability: 0.86,
            };
          }
          if (pm.id === 'MSN-ONGOING-AS01') {
            return {
              ...pm,
              destinationName: 'Haflong Sub-Divisional Depot',
              disruptionProbability: 0.64,
              initialDisruptionProbability: 0.64,
            };
          }
          if (pm.id === 'MSN-ONGOING-MZ01') {
            const mzRoute = FLEET_ROUTES['ROUTE-SUG-01'] || FLEET_ROUTES['ROUTE-MZ-04'];
            return {
              ...pm,
              destinationName: 'Kolasib East Community Depot',
              isRerouted: false,
              disruptionProbability: 0.28,
              initialDisruptionProbability: 0.28,
              assignedRouteId: mzRoute?.id || 'ROUTE-SUG-01',
              suggestedDetour: 'NH-306 Lifeline Arterial via Bilkhawthlir',
              routeGeometry: mzRoute?.coordinates || [],
              routeStatus: 'OPTIMAL' as const,
            };
          }
          if (pm.isRerouted || (pm.routeGeometry && pm.routeGeometry.length > 0)) {
            return pm;
          }
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

        // Ensure baseline demo missions exist (3 Suggested, 3 In Transit, 2 Delivered)
        const demoMissions = generateDeterministicDemoMissions();
        const demoSuggestedIds = new Set(demoMissions.filter((d) => d.status === 'SUGGESTED').map((d) => d.id));
        const legacyDemoIds = new Set(['DEMO-MSN-NL-KOH', 'DEMO-MSN-MZ-KOL', 'DEMO-MSN-SK-MAN', 'SUGG-NLKOH009', 'SUGG-SKMAN002', 'SUGG-NLKOH002', 'SUGG-MZAIF008', 'SUGG-MLJOW005', 'SUGG-ASJAT007', 'SUGG-MNNON006']);
        const cleanedPreserved = preserved.filter((m) => {
          if (m.status === 'SUGGESTED') {
            return demoSuggestedIds.has(m.id);
          }
          return !legacyDemoIds.has(m.id);
        });
        const existingIds = new Set(cleanedPreserved.map((m) => m.id));
        const missingDemos = demoMissions.filter((d) => !existingIds.has(d.id));

        // Guarantee all 3 suggested missions (Shillong, Haflong, Bilkhawthlir) are in the queue
        const currentSuggestedIds = new Set(cleanedPreserved.filter((m) => m.status === 'SUGGESTED').map((m) => m.id));
        const missingSuggestedDemos = demoMissions.filter((d) => d.status === 'SUGGESTED' && !currentSuggestedIds.has(d.id));

        const merged = [...cleanedPreserved, ...missingDemos];
        missingSuggestedDemos.forEach((d) => {
          if (!merged.some((m) => m.id === d.id)) {
            merged.push(d);
          }
        });

        return merged;
      }
    }
    // Default initial deterministic demo missions (4 Suggested, 3 In Transit, 2 Delivered)
    return generateDeterministicDemoMissions();
  });
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(() => {
    const firstActive = activeMissions.find((m) => m.status === 'IN_TRANSIT' || m.status === 'APPROVED');
    return firstActive?.id || null;
  });
  const activeMissionsRef = useRef<ReliefMission[]>(activeMissions);

  // 6b-ii. Model B Route Options & Selection State
  const [missionRouteOptionsByMissionId, setMissionRouteOptionsByMissionId] = useState<Record<string, MissionRouteOption[]>>(() => {
    const initialMap: Record<string, MissionRouteOption[]> = {};
    activeMissions.forEach((m) => {
      if (m.routeOptions && m.routeOptions.length > 0) {
        initialMap[m.id] = m.routeOptions;
      }
    });
    return initialMap;
  });
  const [selectedRouteOptionByMissionId, setSelectedRouteOptionByMissionId] = useState<Record<string, string>>(() => {
    const initialMap: Record<string, string> = {};
    activeMissions.forEach((m) => {
      if (m.selectedRouteOptionId) {
        initialMap[m.id] = m.selectedRouteOptionId;
      } else if (m.routeOptions && m.routeOptions.length > 0) {
        initialMap[m.id] = m.routeOptions[0].id;
      }
    });
    return initialMap;
  });
  const [modelBLoading, setModelBLoading] = useState<boolean>(false);
  const [modelBError, setModelBError] = useState<string | null>(null);

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
    if (!isDemoMode) {
      persistMissions(activeMissions);
    }
  }, [activeMissions, isDemoMode]);

  // Ensure all suggested relief missions are populated in the queue on mount with latest calibrated parameters
  useEffect(() => {
    setActiveMissions((prev) => {
      const demoMissions = generateDeterministicDemoMissions();
      const demoSuggested = demoMissions.filter((d) => d.status === 'SUGGESTED');
      const demoSuggestedIds = new Set(demoSuggested.map((d) => d.id));
      let changed = false;

      // Filter out any stale suggested missions not in demoSuggested
      const filtered = prev.filter((m) => {
        if (m.status === 'SUGGESTED') {
          return demoSuggestedIds.has(m.id);
        }
        return true;
      });
      if (filtered.length !== prev.length) {
        changed = true;
      }

      const updated = filtered.map((m) => {
        if (m.status === 'SUGGESTED') {
          const fresh = demoSuggested.find((d) => d.id === m.id);
          if (fresh) {
            changed = true;
            return {
              ...m,
              disasterZoneId: fresh.disasterZoneId,
              disasterZoneName: fresh.disasterZoneName,
              routeDurationMinutes: fresh.routeDurationMinutes,
              routeDistanceKm: fresh.routeDistanceKm,
              disruptionProbability: fresh.disruptionProbability,
              routeGeometry: fresh.routeGeometry,
              assignedRouteId: fresh.assignedRouteId,
              selectedRouteOptionId: fresh.selectedRouteOptionId,
              routeOptions: fresh.routeOptions,
            };
          }
        }
        return m;
      });
      demoSuggested.forEach((d) => {
        if (!updated.some((m) => m.id === d.id)) {
          updated.push(d);
          changed = true;
        }
        if (d.routeOptions && d.routeOptions.length > 0) {
          setMissionRouteOptionsByMissionId((prevOpts) => {
            if (!prevOpts[d.id] || prevOpts[d.id].length < 2) {
              return { ...prevOpts, [d.id]: d.routeOptions! };
            }
            return prevOpts;
          });
          setSelectedRouteOptionByMissionId((prevSel) => {
            if (!prevSel[d.id] && d.selectedRouteOptionId) {
              return { ...prevSel, [d.id]: d.selectedRouteOptionId };
            }
            return prevSel;
          });
        }
      });
      return changed ? updated : prev;
    });
  }, []);

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
        // Scrub demo Kolasib override on initial reload so reload is always pristine nominal
        return persisted.map((c) => {
          if (c.id === 'MZ-KOL-004' && (c.cutoffTimeHours < 5 || c.disruptionProbMax > 0.9)) {
            const baseKolasib = INITIAL_COMMUNITIES.find((b) => b.id === 'MZ-KOL-004');
            return baseKolasib || c;
          }
          return c;
        });
      }
    }
    return INITIAL_COMMUNITIES;
  });

  const rawCommunitiesRef = useRef<CommunityBase[]>(rawCommunities);
  useEffect(() => {
    rawCommunitiesRef.current = rawCommunities;
    if (!isDemoMode) {
      persistCommunities(rawCommunities);
    }
  }, [rawCommunities, isDemoMode]);

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
      const persisted = getPersistedIncidents().filter((i) => i.id !== 'inc-demo-kolasib' && !i.id.startsWith('inc-kolasib-'));
      if (persisted.length > 0 && persisted.length <= 5 && persisted.some((i) => i.id === 'inc-04')) {
        return persisted;
      }
      persistIncidents(DEFAULT_INCIDENTS);
    }
    return DEFAULT_INCIDENTS;
  });

  useEffect(() => {
    if (!isDemoMode) {
      persistIncidents(incidents);
    }
  }, [incidents, isDemoMode]);

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

  // 10B. Dedicated Driver Emergency Route Alert Dispatch & Acknowledgment
  const [activeDriverEmergencyAlert, setActiveDriverEmergencyAlert] = useState<DriverEmergencyRouteAlert | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('pravah_driver_emergency_alert');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (!parsed.acknowledged) return parsed;
        }
      } catch (e) {
        console.warn('Failed to parse pravah_driver_emergency_alert', e);
      }
    }
    return null;
  });

  const dispatchDriverEmergencyAlert = useCallback((alert: DriverEmergencyRouteAlert) => {
    setActiveDriverEmergencyAlert(alert);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pravah_driver_emergency_alert', JSON.stringify(alert));
    }

    const alertEvent: AlertEvent = {
      id: alert.id,
      vehicle_id: alert.vehicleId,
      vehicle_name: `${alert.vehicleId} (${alert.driverName})`,
      cargo_type: 'Emergency Rerouted Consignment',
      timestamp: alert.timestamp,
      severity: 'CRITICAL',
      type: 'ROUTE_DEVIATION',
      title: `EMERGENCY ROUTE ALERT: ${alert.incidentTitle}`,
      message: `${alert.affectedRoute} affected. Rerouted via ${alert.newRouteName}. Updated ETA: ${alert.updatedEtaMinutes} min.`,
      coords: alert.currentGps,
      acknowledged: false,
      extraDetails: alert,
    };

    setAlerts((prev) => [alertEvent, ...prev.filter((a) => a.id !== alert.id)]);

    if (socketRef.current?.connected) {
      socketRef.current.emit('EMERGENCY_ROUTE_ALERT_DISPATCHED', alert);
    }
  }, []);

  const acknowledgeDriverEmergencyAlert = useCallback((alertId: string) => {
    setActiveDriverEmergencyAlert((prev) => {
      if (prev && prev.id === alertId) {
        const updated = { ...prev, acknowledged: true };
        if (typeof window !== 'undefined') {
          localStorage.setItem('pravah_driver_emergency_alert', JSON.stringify(updated));
        }
        return updated;
      }
      return prev;
    });

    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a))
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

  // 13. Model B Route Generation & Selection
  const generateMissionRouteOptions = useCallback(
    async (mission: ReliefMission): Promise<MissionRouteOption[]> => {
      if (!mission) return [];
      setModelBLoading(true);
      setModelBError(null);
      try {
        const ranking = await generateAndRankMissionRoutes(mission, {
          allSegments: NER_SEGMENTS,
          rainfallMmHr: rainfallMmHr,
          disruptions: activeDisruptions,
        });

        if (ranking.options.length > 0) {
          setMissionRouteOptionsByMissionId((prev) => ({
            ...prev,
            [mission.id]: ranking.options,
          }));

          // Default selection to Rank 1 (MODEL B RECOMMENDED) if not already selected
          const currentSelected = selectedRouteOptionByMissionId[mission.id];
          const bestOption = ranking.options.find((o) => o.predictedPreferredRoute) || ranking.options[0];

          if (!currentSelected && bestOption) {
            setSelectedRouteOptionByMissionId((prev) => ({
              ...prev,
              [mission.id]: bestOption.id,
            }));

            // Sync onto mission record
            setActiveMissions((prevMissions) => {
              const updated = prevMissions.map((m) => {
                if (m.id === mission.id) {
                  return {
                    ...m,
                    selectedRouteOptionId: bestOption.id,
                    routeGeometry: bestOption.geometry,
                    routeDistanceKm: bestOption.distanceKm,
                    routeDurationMinutes: bestOption.predictedEtaMinutes,
                    assignedRouteId: bestOption.routeId,
                    routeOptions: ranking.options,
                  };
                }
                return m;
              });
              persistMissions(updated);
              return updated;
            });
          }

          // Persist route options to Supabase if configured
          if (isOnline && isSupabaseConfigured) {
            upsertCloudMissionRouteOptions(ranking.options);
          }
        }
        return ranking.options;
      } catch (err: any) {
        console.error('[PRAVAH] generateMissionRouteOptions failed:', err);
        setModelBError(err?.message || 'Model B route ranking failed');
        return [];
      } finally {
        setModelBLoading(false);
      }
    },
    [rainfallMmHr, activeDisruptions, selectedRouteOptionByMissionId, isOnline]
  );

  const fetchModelAPredictionsForSegments = useCallback(
    async (segmentIds: string[], forceFresh?: boolean): Promise<Record<string, ModelAPrediction>> => {
      if (!segmentIds || segmentIds.length === 0) return {};
      setIsModelALoading(true);
      setModelAError(null);
      try {
        const preds = await batchPredictSegmentRisks(segmentIds, rainfallMmHr, forceFresh);
        setModelAPredictions((prev) => ({ ...prev, ...preds }));
        if (isSupabaseConfigured) {
          Object.values(preds).forEach((p) => upsertCloudModelAPrediction(p).catch(() => {}));
        }
        return preds;
      } catch (err: any) {
        setModelAError(err?.message || 'Failed to batch fetch Model A predictions');
        return {};
      } finally {
        setIsModelALoading(false);
      }
    },
    [rainfallMmHr, isSupabaseConfigured]
  );

  const selectMissionRoute = useCallback(
    (missionId: string, optionId: string) => {
      const targetMission = activeMissionsRef.current.find((m) => m.id === missionId);
      const options = missionRouteOptionsByMissionId[missionId] || targetMission?.routeOptions || [];
      const chosen = options.find((o) => o.id === optionId);
      if (!chosen) {
        console.warn(`[PRAVAH] selectMissionRoute: Option ${optionId} not found for mission ${missionId}`);
        return;
      }

      setSelectedRouteOptionByMissionId((prev) => ({
        ...prev,
        [missionId]: optionId,
      }));

      // Trigger dynamic Model A risk prediction for the selected route option's segments
      if (chosen.corridorSegmentIds && chosen.corridorSegmentIds.length > 0) {
        fetchModelAPredictionsForSegments(chosen.corridorSegmentIds).catch(() => {});
      }

      // Calculate option's disruption probability
      const optSegs = chosen.corridorSegmentIds || [];
      const optExposure = calculateRouteModelAExposureFromCache(optSegs, modelAPredictions);
      const optProb = chosen.disruptionProbability ?? optExposure.max_probability;

      setActiveMissions((prevMissions) => {
        const next = prevMissions.map((m) => {
          if (m.id === missionId) {
            const updated: ReliefMission = {
              ...m,
              selectedRouteOptionId: optionId,
              corridorSegmentIds: optSegs.length > 0 ? optSegs : m.corridorSegmentIds,
              routeGeometry: chosen.geometry,
              routeDistanceKm: chosen.distanceKm,
              routeDurationMinutes: chosen.predictedEtaMinutes,
              assignedRouteId: chosen.routeId,
              routeOptions: options,
              disruptionProbability: optProb,
            };
            if (isOnline && isSupabaseConfigured) {
              upsertCloudMission(updated);
            }
            return updated;
          }
          return m;
        });
        persistMissions(next);
        return next;
      });
    },
    [missionRouteOptionsByMissionId, isOnline, fetchModelAPredictionsForSegments, modelAPredictions]
  );

  const rerouteMission = useCallback(
    async (missionId: string, customOption?: MissionRouteOption, customReason?: string): Promise<boolean> => {
      const targetMission = activeMissionsRef.current.find((m) => m.id === missionId);
      if (!targetMission) {
        console.warn(`[PRAVAH] rerouteMission: Cannot find mission ${missionId}`);
        return false;
      }

      setModelBLoading(true);
      setModelBError(null);

      try {
        const assignedVeh = vehicles.find(
          (v) => v.mission_id === missionId || v.vehicle_id === targetMission.assignedVehicleId
        );

        let chosenOption = customOption;
        let rerouteReason = customReason;

        const originCoords = targetMission.originCoords || [25.9064, 93.7275];
        const currentVehCoords = assignedVeh?.current_coords;
        const distFromOriginKm = currentVehCoords ? haversineDistanceKm(currentVehCoords, originCoords) : 0;

        // Vehicle has ONLY left the source if it is IN_TRANSIT and has made genuine physical progress along road
        const vehicleHasLeftSource = Boolean(
          assignedVeh &&
          targetMission.status === 'IN_TRANSIT' &&
          currentVehCoords &&
          (
            (assignedVeh.route_progress_pct !== undefined && assignedVeh.route_progress_pct > 2) ||
            (assignedVeh.traveled_distance_km !== undefined && assignedVeh.traveled_distance_km > 1.5) ||
            distFromOriginKm > 3.0
          )
        );

        let reroutedFrom = vehicleHasLeftSource && currentVehCoords
          ? currentVehCoords
          : originCoords;

        // If no custom option was explicitly passed, check if user pre-selected a route option card
        if (!chosenOption) {
          const preSelectedId = selectedRouteOptionByMissionId[missionId] || targetMission.selectedRouteOptionId;
          const availableOpts = missionRouteOptionsByMissionId[missionId] || targetMission.routeOptions || [];
          if (preSelectedId && availableOpts.length > 0) {
            chosenOption = availableOpts.find((o) => o.id === preSelectedId);
          }
          if (!chosenOption && availableOpts.length > 1) {
            chosenOption =
              availableOpts.find((o) => o.predictedPreferredRoute) ||
              availableOpts.find((o) => o.id !== targetMission.assignedRouteId && o.id !== targetMission.selectedRouteOptionId) ||
              availableOpts[1];
          }
        }

        if (targetMission.id === 'MSN-ONGOING-SK01' && !rerouteReason) {
          rerouteReason = 'Rerouted via NH-717A Pakyong-Lava Ridge Bypass to avoid 29th Mile Teesta Canyon blockage';
        }

        if (chosenOption) {
          // If vehicle has physically departed source, splice remaining route from vehicle's live GPS point forward to destination
          if (vehicleHasLeftSource && currentVehCoords) {
            const splicedCoords = spliceRouteFromVehicleCoords(chosenOption.geometry, currentVehCoords);
            const splicedDist = computePolylineDistanceKm(splicedCoords);
            const ratio = chosenOption.distanceKm > 0 ? splicedDist / chosenOption.distanceKm : 1;
            chosenOption = {
              ...chosenOption,
              geometry: splicedCoords,
              distanceKm: splicedDist,
              predictedEtaMinutes: Math.max(1, Math.round(chosenOption.predictedEtaMinutes * ratio)),
              osrmDurationMinutes: Math.max(1, Math.round(chosenOption.osrmDurationMinutes * ratio)),
            };
          }
        } else {
          // Calculate fresh route: if vehicle has not departed, compute full route from origin to destination
          const rerouteResult = await calculateMissionReroute(targetMission, {
            vehicle: vehicleHasLeftSource ? assignedVeh : undefined,
            allSegments: NER_SEGMENTS,
            rainfallMmHr,
            disruptions: activeDisruptions,
            modelAPredictions,
          });

          chosenOption = rerouteResult.selectedOption;
          rerouteReason = customReason || rerouteResult.reason;
          reroutedFrom = rerouteResult.reroutedFromCoords;
        }

        if (!chosenOption) {
          console.warn(`[PRAVAH] rerouteMission: No viable alternative route found for ${missionId}`);
          return false;
        }

        const newGeom = chosenOption.geometry;
        const newDist = chosenOption.distanceKm;
        const newEta = chosenOption.predictedEtaMinutes;
        const newRouteId = chosenOption.routeId;

        let newCorridorSegmentIds =
          chosenOption.corridorSegmentIds && chosenOption.corridorSegmentIds.length > 0
            ? chosenOption.corridorSegmentIds
            : resolveCorridorBypassSegments(targetMission.corridorSegmentIds?.[0], targetMission);
        if (newCorridorSegmentIds.length === 0) {
          newCorridorSegmentIds = resolveCorridorBypassSegments(undefined, targetMission);
        }

        // Record initial prior hazard probability on the old corridor before detour
        const prevExposure = getAuthoritativeMissionExposure(targetMission, modelAPredictions, NER_SEGMENTS);
        const initialProb = targetMission.initialDisruptionProbability ?? prevExposure.max_probability;

        // Authoritatively re-evaluate Model A predictions fresh for the NEW route's corridor segments
        let freshPreds: Record<string, ModelAPrediction> = {};
        if (newCorridorSegmentIds.length > 0) {
          try {
            freshPreds = await fetchModelAPredictionsForSegments(newCorridorSegmentIds, true);
          } catch (e) {
            console.warn('[PRAVAH] Model A batch prediction failed for new segments:', e);
          }
        }

        // Calculate the fresh probability of this new rerouted detour route
        const combinedPreds = { ...modelAPredictions, ...freshPreds };
        const newExposure = calculateRouteModelAExposureFromCache(newCorridorSegmentIds, combinedPreds);
        const calculatedRerouteProb = newExposure.max_probability;

        const updatedChosenOption: MissionRouteOption = {
          ...chosenOption,
          corridorSegmentIds: newCorridorSegmentIds,
          disruptionProbability: calculatedRerouteProb,
        };

        const updatedMission: ReliefMission = {
          ...targetMission,
          isRerouted: true,
          initialDisruptionProbability: initialProb,
          disruptionProbability: calculatedRerouteProb,
          reroutedDisruptionProbability: calculatedRerouteProb,
          rerouteReason: rerouteReason || 'Model B Predictive Hazard Detour Applied',
          reroutedAt: new Date().toISOString(),
          reroutedFromCoords: reroutedFrom,
          routeGeometry: newGeom,
          routeDistanceKm: newDist,
          routeDurationMinutes: newEta,
          assignedRouteId: newRouteId,
          selectedRouteOptionId: updatedChosenOption.id,
          corridorSegmentIds: newCorridorSegmentIds,
          routeOptions: [updatedChosenOption],
        };

        setActiveMissions((prev) => {
          const next = prev.map((m) => (m.id === missionId ? updatedMission : m));
          persistMissions(next);
          return next;
        });

        // Store selected route option state
        setSelectedRouteOptionByMissionId((prev) => ({
          ...prev,
          [missionId]: chosenOption!.id,
        }));
        setMissionRouteOptionsByMissionId((prev) => ({
          ...prev,
          [missionId]: [updatedChosenOption],
        }));

        // Keep vehicle at exact current coordinates if in transit, or at origin if not yet departed
        if (assignedVeh) {
          setVehicles((prev) =>
            prev.map((v) =>
              v.vehicle_id === assignedVeh.vehicle_id
                ? {
                    ...v,
                    assigned_route_id: newRouteId,
                    traveled_distance_km: vehicleHasLeftSource ? v.traveled_distance_km : 0,
                    route_progress_pct: vehicleHasLeftSource ? 0 : 0,
                    current_coords: vehicleHasLeftSource ? v.current_coords : originCoords,
                  }
                : v
            )
          );
        }

        const rerouteAlert: AlertEvent = {
          id: `alert-reroute-${Date.now()}`,
          vehicle_id: assignedVeh?.vehicle_id || targetMission.assignedVehicleId || 'Convoy',
          vehicle_name: assignedVeh?.vehicle_name || 'Convoy Squadron',
          cargo_type: targetMission.cargoAllocations?.[0]?.item || 'Relief Consignment',
          timestamp: new Date().toISOString(),
          severity: 'WARNING',
          type: 'ROUTE_DEVIATION',
          title: `DYNAMIC CONVOY REROUTE: ${targetMission.destinationName || targetMission.communityName}`,
          message: `${rerouteReason}. Convoy routing updated from GPS [${reroutedFrom[0].toFixed(3)}, ${reroutedFrom[1].toFixed(3)}] to bypass high risk road.`,
          coords: reroutedFrom,
          acknowledged: false,
        };

        setAlerts((prev) => [rerouteAlert, ...prev]);

        if (socketRef.current?.connected) {
          socketRef.current.emit('CONVOY_REROUTED', {
            missionId,
            vehicleId: assignedVeh?.vehicle_id,
            updatedMission,
            alert: rerouteAlert,
          });
        }

        if (isOnline && isSupabaseConfigured) {
          upsertCloudMission(updatedMission);
        }

        return true;
      } catch (err: any) {
        console.error('[PRAVAH] rerouteMission failed:', err);
        setModelBError(err?.message || 'Failed to calculate dynamic reroute');
        return false;
      } finally {
        setModelBLoading(false);
      }
    },
    [vehicles, rainfallMmHr, activeDisruptions, modelAPredictions, isOnline, fetchModelAPredictionsForSegments]
  );

  // Automatically precalculate Model B options for SUGGESTED missions
  useEffect(() => {
    const suggested = activeMissions.filter((m) => m.status === 'SUGGESTED');
    suggested.forEach((m) => {
      const currentOpts = missionRouteOptionsByMissionId[m.id];
      if (!currentOpts || currentOpts.length < 2) {
        generateMissionRouteOptions(m);
      }
    });
  }, [activeMissions, missionRouteOptionsByMissionId, generateMissionRouteOptions]);

  // 14. Mission Dispatch & Customization
  const approveMission = useCallback((missionId: string) => {
    const existing = activeMissionsRef.current.find((m) => m.id === missionId);
    if (!existing) return;

    // Ensure selected route option or Rank 1 is preserved
    const routeOptions = existing.routeOptions || missionRouteOptionsByMissionId[missionId] || [];
    const chosenOption = existing.selectedRouteOptionId
      ? routeOptions.find((o) => o.id === existing.selectedRouteOptionId)
      : (selectedRouteOptionByMissionId[missionId]
          ? routeOptions.find((o) => o.id === selectedRouteOptionByMissionId[missionId])
          : routeOptions.find((o) => o.predictedPreferredRoute) || routeOptions[0]);

    // Compute Model A disruption probability for the approved route option
    let chosenProb = chosenOption?.disruptionProbability;
    if (chosenProb === undefined && chosenOption?.corridorSegmentIds && chosenOption.corridorSegmentIds.length > 0) {
      const exp = calculateRouteModelAExposureFromCache(chosenOption.corridorSegmentIds, modelAPredictions);
      chosenProb = exp.max_probability;
    }
    chosenProb = chosenProb ?? existing.disruptionProbability ?? 0.81;

    // Trigger asynchronous Model A feature predictions for the approved route segments
    if (chosenOption?.corridorSegmentIds && chosenOption.corridorSegmentIds.length > 0) {
      fetchModelAPredictionsForSegments(chosenOption.corridorSegmentIds).catch(() => {});
    }

    const targetMission: ReliefMission = {
      ...existing,
      status: 'APPROVED' as const,
      selectedRouteOptionId: chosenOption?.id || existing.selectedRouteOptionId,
      routeGeometry: chosenOption?.geometry || existing.routeGeometry,
      routeDistanceKm: chosenOption?.distanceKm || existing.routeDistanceKm,
      routeDurationMinutes: chosenOption?.predictedEtaMinutes || existing.routeDurationMinutes,
      assignedRouteId: chosenOption?.routeId || existing.assignedRouteId,
      routeOptions: routeOptions.length > 0 ? routeOptions : existing.routeOptions,
      disruptionProbability: chosenProb,
    };

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
  }, [isOnline, missionRouteOptionsByMissionId, selectedRouteOptionByMissionId]);

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

    // Resolve selected route option or Rank 1 default
    const routeOptions = targetMission.routeOptions || missionRouteOptionsByMissionId[missionId] || [];
    const chosenOption = targetMission.selectedRouteOptionId
      ? routeOptions.find((o) => o.id === targetMission.selectedRouteOptionId)
      : (selectedRouteOptionByMissionId[missionId]
          ? routeOptions.find((o) => o.id === selectedRouteOptionByMissionId[missionId])
          : routeOptions.find((o) => o.predictedPreferredRoute) || routeOptions[0]);

    const finalRouteGeom = chosenOption?.geometry && chosenOption.geometry.length > 0
      ? chosenOption.geometry
      : targetMission.routeGeometry;
    const finalDistKm = chosenOption?.distanceKm || targetMission.routeDistanceKm;
    const finalDurMin = chosenOption?.predictedEtaMinutes || targetMission.routeDurationMinutes;
    const finalRouteId = chosenOption?.routeId || targetMission.assignedRouteId;

    // 2. Transition mission to IN_TRANSIT with confirmed vehicle assignment
    const updatedMission: ReliefMission = {
      ...targetMission,
      status: 'IN_TRANSIT' as const,
      assignedVehicleId: assignedVehId,
      dispatchedAt: new Date().toISOString(),
      selectedRouteOptionId: chosenOption?.id || targetMission.selectedRouteOptionId,
      routeGeometry: finalRouteGeom,
      routeDistanceKm: finalDistKm,
      routeDurationMinutes: finalDurMin,
      assignedRouteId: finalRouteId,
      routeOptions: routeOptions.length > 0 ? routeOptions : targetMission.routeOptions,
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
              assigned_route_id: finalRouteId || missionId,
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
          assigned_route_id: finalRouteId || missionId,
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
  }, [isOnline, missionRouteOptionsByMissionId, selectedRouteOptionByMissionId]);

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

  // 14. Demo Mode: Synchronous Data Injection, Reset & Clean Purge (NO Running Scripts or Timeouts)
  const injectDemoData = useCallback(() => {
    // 1. Environmental disruption: Monsoon downpour spike to 65 mm/hr
    setRainfallMmHr(65);
    setIsMonsoonDownpourSimulated(true);

    // 2. Road Network Severance: NH-306 at Bilkhawthlir Escarpment (SEG-SIL-KOL) -> TOTAL_BLOCKAGE
    setActiveDisruptions((prev) => ({
      ...prev,
      'SEG-SIL-KOL': {
        status: 'TOTAL_BLOCKAGE',
        cause: 'Torrential Silt Mudflow (65mm/hr)',
        description: 'Severe slope wash out along Bilkhawthlir escarpment. All heavy transport severed.',
        reportedBy: 'Field Officer (Insp. L. Hmar / Mizoram Police)',
      },
    }));

    // 3. Isolated Community Distress: Kolasib East Community (MZ-KOL-004) drops to P1 isolation
    setRawCommunities((prev) =>
      prev.map((c) =>
        c.id === 'MZ-KOL-004'
          ? {
              ...c,
              cutoffTimeHours: 2.1,
              disruptionProbMax: 0.98,
              elapsedTimeHours: 14.0,
              isMonsoonAlertActive: true,
              hasActiveIndent: true,
            }
          : c
      )
    );

    setDistrictsHealth((prev) =>
      prev.map((d) => (d.id === 'kolasib' ? { ...d, accessibilityScore: 18, connectivityCategory: 'CRITICAL', openCorridorsCount: 0 } : d))
    );

    // 4. Vehicle Telemetry: Medic-01 stopped before debris obstruction on NH-306 (NOT rerouted)
    const vehicleCoords: [number, number] = [24.5015, 92.76491];
    setSelectedVehicleId('Medic-01');
    setSelectedMissionId('MSN-ONGOING-MZ01');
    setSelectedCommunityId('MZ-KOL-004');
    focusMapOnCoords([24.40, 92.73], 10);
    setVehicles((prev) =>
      prev.map((v) =>
        v.vehicle_id === 'Medic-01'
          ? {
              ...v,
              status: 'ON_ROUTE',
              current_coords: vehicleCoords,
              speed_kmh: 0,
              is_stopped_manual: true,
              next_chokepoint: 'Bilkhawthlir KM-18 Mudflow Hazard Zone',
            }
          : v
      )
    );

    // 5. In-Transit Mission: Reset all missions to deterministic fresh demo baseline, then set MSN-ONGOING-MZ01 to obstructed & un-rerouted
    const freshMissions = generateDeterministicDemoMissions();
    const updatedMissions = freshMissions.map((m) =>
      m.id === 'MSN-ONGOING-MZ01' || m.communityId === 'MZ-KOL-004'
        ? {
            ...m,
            urgency: 'P1_CRITICAL' as const,
            routeStatus: 'UNAVAILABLE' as const,
            disruptionProbability: 0.98,
            initialDisruptionProbability: 0.98,
            isRerouted: false,
          }
        : m
    );
    setActiveMissions(updatedMissions);
    persistMissions(updatedMissions);

    // 6. Ground Intel Incident Report
    setIncidents((prev) => [
      {
        id: 'inc-demo-kolasib',
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
        confidenceScore: 96,
        hasOfficerVerified: true,
        sync_status: 'SYNCED',
        updates: [
          {
            id: 'u-demo-kol-1',
            author: 'Insp. L. Hmar',
            role: 'Field Officer (BRO/Police)',
            message: 'Main highway impassable. Advising dispatch to divert via Bairabi Pass bypass road.',
            timestamp: new Date().toISOString(),
          },
        ],
      },
      ...prev.filter((i) => i.id !== 'inc-demo-kolasib' && !i.id.startsWith('inc-kolasib-')),
    ]);

    // 7. Critical Blockage & Reroute Alert
    setAlerts((prev) => [
      {
        id: 'alert-demo-nh306',
        vehicle_id: 'Medic-01',
        vehicle_name: 'Medic-01',
        cargo_type: 'Emergency Medical Solutions & Antivenom',
        timestamp: new Date().toISOString(),
        severity: 'CRITICAL',
        type: 'STATIONARY_HAZARD',
        title: 'NH-306 Severed at Bilkhawthlir KM-18',
        message: 'Torrential 65mm/hr mudflow severed NH-306. Active convoy Medic-01 route compromised. Model B detour computation recommended.',
        coords: vehicleCoords,
        acknowledged: false,
        extraDetails: {
          affectedCorridor: 'SEG-SIL-KOL',
          source: 'Field Officer Ground Intel (Insp. L. Hmar)',
        },
      },
      ...prev.filter((a) => a.id !== 'alert-demo-nh306' && !a.id.startsWith('alert-nh306-') && !a.id.startsWith('alert-reroute-')),
    ]);

    // 8. Field Officer Resource Request
    const demoReq: ResourceRequest = {
      id: 'REQ-MZ-KOL-DEMO',
      officerId: 'hmar',
      officerName: 'Inspector L. Hmar',
      communityId: 'MZ-KOL-004',
      communityName: 'Kolasib East Community Depot',
      resourceType: 'Medical Kits',
      quantity: 17,
      unit: 'trauma kits',
      urgency: 'CRITICAL',
      reason: 'Critical medical trauma inventory depleted due to landslide casualties and monsoon isolation.',
      notes: 'NH-306 blocked. Emergency resupply requested via Bhairabi bypass. Silchar Depot pre-allocated.',
      status: 'PROCESSING',
      createdAt: new Date().toISOString(),
    };
    setResourceRequests((prev) => [demoReq, ...prev.filter((r) => r.id !== 'REQ-MZ-KOL-DEMO')]);
  }, [focusMapOnCoords]);

  const purgeDemoData = useCallback(() => {
    // 1. Environmental disruption reset
    setRainfallMmHr(24);
    setIsMonsoonDownpourSimulated(false);

    // 2. Road network disruption reset
    setActiveDisruptions((prev) => ({
      ...prev,
      'SEG-SIL-KOL': {
        status: 'SINGLE_LANE_PASSABLE',
        cause: 'Road_Subsidence',
        description: 'Bilkhawthlir silt collapse - 18T load restriction',
        reportedBy: 'Insp. L. Hmar',
      },
    }));

    // 3. Kolasib Community reset to baseline
    setRawCommunities(INITIAL_COMMUNITIES);
    setDistrictsHealth(INITIAL_DISTRICTS_HEALTH);

    // 4. Vehicles reset & clear selection
    setVehicles(INITIAL_VEHICLES);
    setSelectedVehicleId(null);
    setSelectedMissionId(null);
    setSelectedCommunityId(null);
    focusMapOnCoords([26.2006, 92.9376], 7);

    // 5. Missions reset to clean baseline
    const freshMissions = generateDeterministicDemoMissions();
    setActiveMissions(freshMissions);
    persistMissions(freshMissions);

    // 6. Purge demo incidents
    setIncidents((prev) => prev.filter((i) => i.id !== 'inc-demo-kolasib' && !i.id.startsWith('inc-kolasib-')));

    // 7. Purge demo alerts
    setAlerts((prev) =>
      prev.filter(
        (a) =>
          a.id !== 'alert-demo-nh306' &&
          !a.id.startsWith('alert-nh306-') &&
          !a.id.startsWith('alert-reroute-') &&
          !a.id.startsWith('alert-delivered-')
      )
    );

    // 8. Purge demo resource requests & restore requirements
    setResourceRequests((prev) => prev.filter((r) => r.id !== 'REQ-MZ-KOL-DEMO'));
    setResourceRequirements(INITIAL_RESOURCE_REQUIREMENTS);

    // Clean local storage cache
    try {
      localStorage.removeItem('pravah_active_disruptions');
      localStorage.removeItem('pravah_missions');
      localStorage.removeItem('pravah_resource_requirements');
      localStorage.removeItem('pravah_resource_requests');
    } catch (e) {
      console.warn('Failed clearing localStorage demo items', e);
    }
  }, [focusMapOnCoords]);

  const toggleDemoMode = useCallback(() => {
    setIsDemoMode((prevMode) => {
      const nextMode = !prevMode;
      if (nextMode) {
        injectDemoData();
      } else {
        purgeDemoData();
      }
      return nextMode;
    });
  }, [injectDemoData, purgeDemoData]);

  const resetDemoMode = useCallback(
    (action: 'restart' | 'turn_off' = 'restart') => {
      if (action === 'turn_off') {
        setIsDemoMode(false);
        purgeDemoData();
      } else {
        setIsDemoMode(true);
        injectDemoData();
      }
    },
    [injectDemoData, purgeDemoData]
  );

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

    fetchCloudResourceRequests().then((cloudRequests) => {
      if (cloudRequests && cloudRequests.length > 0) {
        setResourceRequests((prev) => {
          const ids = new Set(prev.map((r) => r.id));
          const newItems = cloudRequests.filter((r) => !ids.has(r.id));
          const merged = [...newItems, ...prev];
          try {
            localStorage.setItem('pravah_resource_requests', JSON.stringify(merged));
          } catch {}
          return merged;
        });
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
        .on('broadcast', { event: 'HUB_UPDATED' }, ({ payload }: any) => {
          if (payload?.hub) {
            setHubs((prev) => {
              const next = prev.map((h) => (h.id === payload.hub.id ? payload.hub : h));
              if (!next.some((h) => h.id === payload.hub.id)) next.push(payload.hub);
              saveOfflineHubs(next);
              return next;
            });
          }
        })
        .on('broadcast', { event: 'HUB_INVENTORY_UPDATED' }, ({ payload }: any) => {
          if (payload?.item) {
            setInventory((prev) => {
              const next = prev.map((item) => (item.id === payload.item.id ? payload.item : item));
              if (!next.some((item) => item.id === payload.item.id)) next.push(payload.item);
              saveOfflineInventory(next);
              return next;
            });
          }
        })
        .on('broadcast', { event: 'INVENTORY_TRANSACTION_CREATED' }, ({ payload }: any) => {
          if (payload?.transaction) {
            setTransactions((prev) => {
              if (prev.some((tx) => tx.id === payload.transaction.id)) return prev;
              const next = [payload.transaction, ...prev];
              saveOfflineTransactions(next);
              return next;
            });
          }
        })
        .on('broadcast', { event: 'MODEL_A_PREDICTION_UPDATED' }, ({ payload }: any) => {
          if (payload?.prediction) {
            const p = payload.prediction as ModelAPrediction;
            setModelAPredictions((prev) => ({
              ...prev,
              [p.segment_id]: p,
            }));
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
        .on('broadcast', { event: 'RESOURCE_REQUEST_ADDED' }, ({ payload }: any) => {
          if (payload?.request) {
            setResourceRequests((prev) => {
              if (prev.some((r) => r.id === payload.request.id)) return prev;
              const next = [payload.request, ...prev];
              try {
                localStorage.setItem('pravah_resource_requests', JSON.stringify(next));
              } catch {}
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
    rejectionReason: 'AI Safety Filter & Fact Verification: Hallucinatory or fictitious emergency claim devoid of regional geographic corroboration.',
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
          name: target.sourceReport?.reporterName || 'PRAVAH AI Copilot',
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
        const proposedRouteId = corridorId.includes('DIM-KOH') ? 'ROUTE-NL-02' : 'ROUTE-SUG-02';
        const proposedRouteName = corridorId.includes('DIM-KOH')
          ? 'Mokokchung / Wokha Mountain Bypass'
          : 'NH-108 Tripura / Mamit High-Clearance Bypass';

        const optCandidate = missionRouteOptionsByMissionId[mission.id]?.find((o) => o.id === proposedRouteId);
        const detourSegs = optCandidate?.corridorSegmentIds && optCandidate.corridorSegmentIds.length > 0
          ? optCandidate.corridorSegmentIds
          : resolveCorridorBypassSegments(corridorId, mission);
        const detourProb = detourSegs.length > 0
          ? calculateRouteModelAExposureFromCache(detourSegs, modelAPredictions).max_probability
          : (optCandidate?.disruptionProbability ?? 0.18);

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
          proposedRouteId,
          proposedRouteName,
          distanceDeltaKm: 34.5,
          etaDeltaMinutes: 55,
          status: 'PENDING_APPROVAL',
          proposedAt: new Date().toISOString(),
          disruptionProbability: detourProb,
        };
        setRerouteProposals((prev) => [newProposal, ...prev.filter((p) => p.missionId !== mission.id)]);
      }
    },
    [draftPlots, approvedDraftPlots, activeMissions, vehicles, isOnline, isSupabaseConfigured, focusMapOnCoords, missionRouteOptionsByMissionId, modelAPredictions]
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
    async (proposalId: string) => {
      const proposal = rerouteProposals.find((p) => p.id === proposalId);
      if (!proposal) return;

      setRerouteProposals((prev) =>
        prev.map((p) => (p.id === proposalId ? { ...p, status: 'APPROVED' as const } : p))
      );

      // Trigger authoritative complete reroute: updates geometry, segments, distance, ETA, Model A, and persists
      const reason = proposal.incidentSummary
        ? `Approved Dispatch Detour: ${proposal.incidentSummary}`
        : `Approved Detour via ${proposal.proposedRouteName} bypassing ${proposal.blockedSegmentName}`;
      await rerouteMission(proposal.missionId, undefined, reason);
    },
    [rerouteProposals, rerouteMission]
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

    // 13. Hubs & Emergency Logistics Actions
    const getHubById = useCallback((id: string): ResponseHub | undefined => {
      return hubs.find((h) => h.id === id);
    }, [hubs]);

    const getHubInventory = useCallback((hubId: string): HubInventory[] => {
      return inventory.filter((item) => item.hubId === hubId);
    }, [inventory]);

    const getHubVehicles = useCallback((hubId: string): VehicleTelemetry[] => {
      return vehicles.filter((v) => v.hub_id === hubId);
    }, [vehicles]);

    const getAvailableInventory = useCallback((hubId: string): HubInventory[] => {
      return inventory.filter((item) => item.hubId === hubId && calculateAvailableQuantity(item) > 0);
    }, [inventory]);

    const getAvailableVehicles = useCallback((hubId?: string): VehicleTelemetry[] => {
      return vehicles.filter((v) => (!hubId || v.hub_id === hubId) && v.status === 'AVAILABLE');
    }, [vehicles]);

    const findInventoryFeasibleHubs = useCallback(
      (requiredItems: { resourceName: string; quantity: number }[]): ResponseHub[] => {
        return hubs.filter((h) => {
          if (h.status === 'TEMPORARILY_CLOSED') return false;
          const check = checkHubInventoryFeasibility(h.id, inventory, requiredItems);
          return check.isFeasible;
        });
      },
      [hubs, inventory]
    );

    const updateHubStatus = useCallback(
      async (hubId: string, status: ResponseHub['status']): Promise<boolean> => {
        let updatedHub: ResponseHub | undefined;
        setHubs((prev) => {
          const next = prev.map((h) => {
            if (h.id === hubId) {
              updatedHub = { ...h, status, updatedAt: new Date().toISOString() };
              return updatedHub;
            }
            return h;
          });
          saveOfflineHubs(next);
          return next;
        });
        if (updatedHub && isOnline && isSupabaseConfigured) {
          upsertCloudHub(updatedHub);
        }
        return true;
      },
      [isOnline]
    );

    const updateHubDetails = useCallback(
      async (hubUpdate: Partial<ResponseHub> & { id: string }): Promise<boolean> => {
        let updatedHub: ResponseHub | undefined;
        setHubs((prev) => {
          const next = prev.map((h) => {
            if (h.id === hubUpdate.id) {
              updatedHub = { ...h, ...hubUpdate, updatedAt: new Date().toISOString() };
              return updatedHub;
            }
            return h;
          });
          saveOfflineHubs(next);
          return next;
        });
        if (updatedHub && isOnline && isSupabaseConfigured) {
          upsertCloudHub(updatedHub);
        }
        return true;
      },
      [isOnline]
    );

    const adjustHubInventory = useCallback(
      async (hubId: string, inventoryId: string, deltaQuantity: number, reason: string): Promise<boolean> => {
        const item = inventory.find((i) => i.id === inventoryId && i.hubId === hubId);
        if (!item) {
          console.warn(`[PRAVAH Hubs] Inventory item ${inventoryId} not found in hub ${hubId}`);
          return false;
        }

        const newQuantity = Number(item.quantity) + deltaQuantity;
        if (newQuantity < item.reservedQuantity) {
          console.warn(`[PRAVAH Hubs] Cannot reduce stock below reserved quantity (${item.reservedQuantity})`);
          return false;
        }
        if (newQuantity < 0) {
          console.warn('[PRAVAH Hubs] Cannot reduce stock below zero');
          return false;
        }

        const updatedItem: HubInventory = {
          ...item,
          quantity: newQuantity,
          lastUpdated: new Date().toISOString(),
        };

        const tx: InventoryTransaction = {
          id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          hubId,
          inventoryId,
          type: deltaQuantity >= 0 ? 'ADD' : 'ADJUSTMENT',
          quantity: Math.abs(deltaQuantity),
          previousQuantity: item.quantity,
          newQuantity,
          previousReserved: item.reservedQuantity,
          newReserved: item.reservedQuantity,
          performedBy: userContext.name || 'Logistics Officer',
          note: reason || 'Inventory adjustment via command deck',
          timestamp: new Date().toISOString(),
        };

        setInventory((prev) => {
          const next = prev.map((i) => (i.id === inventoryId ? updatedItem : i));
          saveOfflineInventory(next);
          return next;
        });

        setTransactions((prev) => {
          const next = [tx, ...prev];
          saveOfflineTransactions(next);
          return next;
        });

        if (isOnline && isSupabaseConfigured) {
          upsertCloudInventory(updatedItem);
          insertCloudTransaction(tx);
        }
        return true;
      },
      [inventory, isOnline, userContext.name]
    );

    const addHubInventoryItem = useCallback(
      async (hubId: string, itemData: Omit<HubInventory, 'id' | 'hubId' | 'lastUpdated'>): Promise<boolean> => {
        const newItem: HubInventory = {
          ...itemData,
          id: `inv-${hubId}-${(itemData.resourceType || itemData.resourceName || 'res').toLowerCase()}-${Date.now().toString().slice(-4)}`,
          hubId,
          reservedQuantity: 0,
          lastUpdated: new Date().toISOString(),
        };

        const tx: InventoryTransaction = {
          id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          hubId,
          inventoryId: newItem.id,
          type: 'ADD',
          quantity: newItem.quantity,
          previousQuantity: 0,
          newQuantity: newItem.quantity,
          previousReserved: 0,
          newReserved: 0,
          performedBy: userContext.name || 'Logistics Officer',
          note: `New commodity ${newItem.resourceName} added to hub inventory`,
          timestamp: new Date().toISOString(),
        };

        setInventory((prev) => {
          const next = [...prev, newItem];
          saveOfflineInventory(next);
          return next;
        });

        setTransactions((prev) => {
          const next = [tx, ...prev];
          saveOfflineTransactions(next);
          return next;
        });

        if (isOnline && isSupabaseConfigured) {
          upsertCloudInventory(newItem);
          insertCloudTransaction(tx);
        }
        return true;
      },
      [isOnline, userContext.name]
    );

    const reserveInventoryForMission = useCallback(
      async (hubId: string, allocations: { resourceName: string; quantity: number }[], missionId: string): Promise<boolean> => {
        const hubItems = inventory.filter((i) => i.hubId === hubId);
        const newTransactions: InventoryTransaction[] = [];
        const updatedItems: HubInventory[] = [];

        for (const alloc of allocations) {
          const item = hubItems.find((i) => {
            const rA = (i.resourceName || '').toLowerCase();
            const rB = (alloc.resourceName || '').toLowerCase();
            return Boolean(rA && rB && (rA.includes(rB) || rB.includes(rA)));
          });
          if (item) {
            const available = calculateAvailableQuantity(item);
            const reserveAmt = Math.min(available, alloc.quantity);
            const newReserved = Number(item.reservedQuantity || 0) + reserveAmt;

            const updated: HubInventory = {
              ...item,
              reservedQuantity: newReserved,
              lastUpdated: new Date().toISOString(),
            };
            updatedItems.push(updated);

            newTransactions.push({
              id: `tx-res-${missionId}-${item.id.slice(-4)}-${Date.now()}`,
              hubId,
              inventoryId: item.id,
              missionId,
              type: 'RESERVE',
              quantity: reserveAmt,
              previousQuantity: item.quantity,
              newQuantity: item.quantity,
              previousReserved: item.reservedQuantity,
              newReserved,
              performedBy: userContext.name || 'Mission Dispatcher',
              note: `Reserved ${reserveAmt} ${item.unit} for mission ${missionId}`,
              timestamp: new Date().toISOString(),
            });
          }
        }

        if (updatedItems.length > 0) {
          setInventory((prev) => {
            const next = prev.map((item) => {
              const matched = updatedItems.find((u) => u.id === item.id);
              return matched || item;
            });
            saveOfflineInventory(next);
            return next;
          });

          setTransactions((prev) => {
            const next = [...newTransactions, ...prev];
            saveOfflineTransactions(next);
            return next;
          });

          if (isOnline && isSupabaseConfigured) {
            updatedItems.forEach((u) => upsertCloudInventory(u));
            newTransactions.forEach((tx) => insertCloudTransaction(tx));
          }
        }
        return true;
      },
      [inventory, isOnline, userContext.name]
    );

    const releaseMissionInventory = useCallback(
      async (hubId: string, missionId: string): Promise<boolean> => {
        const relatedTxs = transactions.filter((tx) => tx.hubId === hubId && tx.missionId === missionId && tx.type === 'RESERVE');
        if (relatedTxs.length === 0) return false;

        const updatedItems: HubInventory[] = [];
        const releaseTxs: InventoryTransaction[] = [];

        relatedTxs.forEach((rtx) => {
          const item = inventory.find((i) => i.id === rtx.inventoryId);
          if (item) {
            const newReserved = Math.max(0, item.reservedQuantity - rtx.quantity);
            const updated: HubInventory = {
              ...item,
              reservedQuantity: newReserved,
              lastUpdated: new Date().toISOString(),
            };
            updatedItems.push(updated);

            releaseTxs.push({
              id: `tx-rel-${missionId}-${item.id.slice(-4)}-${Date.now()}`,
              hubId,
              inventoryId: item.id,
              missionId,
              type: 'RELEASE',
              quantity: rtx.quantity,
              previousQuantity: item.quantity,
              newQuantity: item.quantity,
              previousReserved: item.reservedQuantity,
              newReserved,
              performedBy: userContext.name || 'Mission Controller',
              note: `Released reserved ${rtx.quantity} ${item.unit} on mission ${missionId} modification/cancellation`,
              timestamp: new Date().toISOString(),
            });
          }
        });

        if (updatedItems.length > 0) {
          setInventory((prev) => {
            const next = prev.map((item) => {
              const matched = updatedItems.find((u) => u.id === item.id);
              return matched || item;
            });
            saveOfflineInventory(next);
            return next;
          });

          setTransactions((prev) => {
            const next = [...releaseTxs, ...prev];
            saveOfflineTransactions(next);
            return next;
          });

          if (isOnline && isSupabaseConfigured) {
            updatedItems.forEach((u) => upsertCloudInventory(u));
            releaseTxs.forEach((tx) => insertCloudTransaction(tx));
          }
        }
        return true;
      },
      [inventory, transactions, isOnline, userContext.name]
    );

    const dispatchReservedInventory = useCallback(
      async (hubId: string, missionId: string): Promise<boolean> => {
        const relatedTxs = transactions.filter((tx) => tx.hubId === hubId && tx.missionId === missionId && tx.type === 'RESERVE');
        if (relatedTxs.length === 0) return false;

        const updatedItems: HubInventory[] = [];
        const dispatchTxs: InventoryTransaction[] = [];

        relatedTxs.forEach((rtx) => {
          const item = inventory.find((i) => i.id === rtx.inventoryId);
          if (item) {
            const newQuantity = Math.max(0, item.quantity - rtx.quantity);
            const newReserved = Math.max(0, item.reservedQuantity - rtx.quantity);
            const updated: HubInventory = {
              ...item,
              quantity: newQuantity,
              reservedQuantity: newReserved,
              lastUpdated: new Date().toISOString(),
            };
            updatedItems.push(updated);

            dispatchTxs.push({
              id: `tx-dsp-${missionId}-${item.id.slice(-4)}-${Date.now()}`,
              hubId,
              inventoryId: item.id,
              missionId,
              type: 'DISPATCH',
              quantity: rtx.quantity,
              previousQuantity: item.quantity,
              newQuantity,
              previousReserved: item.reservedQuantity,
              newReserved,
              performedBy: userContext.name || 'Fleet Dispatcher',
              note: `Dispatched ${rtx.quantity} ${item.unit} for convoy transit under mission ${missionId}`,
              timestamp: new Date().toISOString(),
            });
          }
        });

        if (updatedItems.length > 0) {
          setInventory((prev) => {
            const next = prev.map((item) => {
              const matched = updatedItems.find((u) => u.id === item.id);
              return matched || item;
            });
            saveOfflineInventory(next);
            return next;
          });

          setTransactions((prev) => {
            const next = [...dispatchTxs, ...prev];
            saveOfflineTransactions(next);
            return next;
          });

          if (isOnline && isSupabaseConfigured) {
            updatedItems.forEach((u) => upsertCloudInventory(u));
            dispatchTxs.forEach((tx) => insertCloudTransaction(tx));
          }
        }
        return true;
      },
      [inventory, transactions, isOnline, userContext.name]
    );

    const assignVehicleToHub = useCallback(
      async (vehicleId: string, hubId: string): Promise<boolean> => {
        setVehicles((prev) => {
          const next = prev.map((v) => (v.vehicle_id === vehicleId ? { ...v, hub_id: hubId } : v));
          return next;
        });
        return true;
      },
      []
    );

    // 14. Model A Road-Disruption Predictive Risk Actions
    const getModelAPrediction = useCallback(
      (segmentId: string): ModelAPrediction | undefined => {
        return modelAPredictions[segmentId];
      },
      [modelAPredictions]
    );

    const fetchModelAPrediction = useCallback(
      async (segmentId: string): Promise<ModelAPrediction | null> => {
        setIsModelALoading(true);
        setModelAError(null);
        try {
          const features = buildModelAFeatures(segmentId, rainfallMmHr);
          const pred = await predictSegmentRisk(segmentId, features, rainfallMmHr);
          if (pred) {
            setModelAPredictions((prev) => ({ ...prev, [segmentId]: pred }));
            if (isSupabaseConfigured) {
              upsertCloudModelAPrediction(pred).catch(() => {});
            }
          }
          return pred;
        } catch (err: any) {
          setModelAError(err?.message || 'Failed to fetch Model A prediction');
          return null;
        } finally {
          setIsModelALoading(false);
        }
      },
      [rainfallMmHr, isSupabaseConfigured]
    );

    const refreshModelAPredictions = useCallback(async () => {
      const allIds = NER_SEGMENTS.map((s) => s.id);
      await fetchModelAPredictionsForSegments(allIds);
    }, [fetchModelAPredictionsForSegments]);

    // Background warmup/update on rainfall or mount
    // When rainfallMmHr changes, clear the prediction cache first so
    // batchPredictSegmentRisks doesn't return stale cached values.
    useEffect(() => {
      let isMounted = true;
      // Evict all cached predictions so fresh values are computed with the new rainfall
      clearModelCache();
      setModelAPredictions({});
      const allIds = NER_SEGMENTS.map((s) => s.id);
      fetchModelAPredictionsForSegments(allIds).catch(() => {});
      return () => {
        isMounted = false;
      };
    }, [rainfallMmHr, fetchModelAPredictionsForSegments]);

    // Field Officer Multi-Context, Requisitions & Manual Missions
    const submitResourceRequest = useCallback(
      (reqData: Omit<ResourceRequest, 'id' | 'createdAt' | 'status'>) => {
        const newReqId = `REQ-${Date.now().toString(36).toUpperCase()}`;
        const newRequest: ResourceRequest = {
          ...reqData,
          id: newReqId,
          status: 'PROCESSING',
          createdAt: new Date().toISOString(),
        };

        // 1. Sync resource request to Cloud Database & LocalStorage
        setResourceRequests((prev) => [newRequest, ...prev]);
        if (isOnline && isSupabaseConfigured) {
          upsertCloudResourceRequest(newRequest);
        }

        // 2. Update community resource requirements state & LocalStorage
        setResourceRequirements((prev) => {
          const commReqs = prev[reqData.communityId] ? [...prev[reqData.communityId]] : [];
          const idx = commReqs.findIndex(
            (r) => (r.resourceType || '').toLowerCase() === (reqData.resourceType || '').toLowerCase()
          );
          if (idx >= 0) {
            commReqs[idx] = {
              ...commReqs[idx],
              required: Math.max(commReqs[idx].required, commReqs[idx].available + reqData.quantity),
              shortage: Math.max(0, (commReqs[idx].required || reqData.quantity) - commReqs[idx].available),
              urgency: reqData.urgency,
              lastUpdated: 'Just now',
            };
          } else {
            commReqs.push({
              resourceType: reqData.resourceType,
              required: reqData.quantity,
              available: 0,
              shortage: reqData.quantity,
              unit: reqData.unit || 'units',
              urgency: reqData.urgency,
              lastUpdated: 'Just now',
            });
          }
          return { ...prev, [reqData.communityId]: commReqs };
        });

        // 3. Mark community with active indent & persist to Cloud Database so calculations recalculate
        let updatedCommObj: CommunityBase | undefined;
        setRawCommunities((prev) => {
          const next = prev.map((c) => {
            if (c.id === reqData.communityId) {
              const updatedInventories = { ...c.inventories };
              const reqLower = (reqData.resourceType || '').toLowerCase();

              let matchedCommodity: CommodityType | undefined;
              if (reqLower.includes('fluid') || reqLower.includes('iv') || reqLower.includes('ringer')) {
                matchedCommodity = 'IV_FLUIDS';
              } else if (reqLower.includes('antivenom') || reqLower.includes('snake')) {
                matchedCommodity = 'ANTIVENOM';
              } else if (reqLower.includes('rice') || reqLower.includes('ration') || reqLower.includes('food') || reqLower.includes('grain')) {
                matchedCommodity = 'GRAIN_RICE';
              } else if (reqLower.includes('diesel') || reqLower.includes('fuel') || reqLower.includes('generator')) {
                matchedCommodity = 'DIESEL';
              }

              if (matchedCommodity && updatedInventories[matchedCommodity]) {
                const cur = updatedInventories[matchedCommodity]!;
                updatedInventories[matchedCommodity] = {
                  ...cur,
                  lastStock: Math.max(0, cur.lastStock - reqData.quantity),
                };
              }

              const updated: CommunityBase = {
                ...c,
                hasActiveIndent: true,
                inventories: updatedInventories,
                elapsedTimeHours: Math.max(c.elapsedTimeHours, 6.0),
              };
              updatedCommObj = updated;
              return updated;
            }
            return c;
          });
          persistCommunities(next);
          return next;
        });

        if (updatedCommObj) {
          if (isOnline && isSupabaseConfigured) {
            upsertCloudCommunity(updatedCommObj);
          } else {
            queueOfflineMutation({ type: 'UPSERT_COMMUNITY', entityId: updatedCommObj.id, payload: updatedCommObj });
          }
        }

        // 4. PRAVAH ENGINE: Generate a mission recommendation tagged with FIELD_REQUISITION
        const recommendedMission = generateMissionFromResourceRequest(newRequest, rawCommunities);
        if (recommendedMission) {
          setActiveMissions((prev) => {
            const exists = prev.some((m) => m.id === recommendedMission.id);
            if (exists) {
              return prev.map((m) => (m.id === recommendedMission.id ? recommendedMission : m));
            }
            return [recommendedMission, ...prev];
          });
          persistMissions([recommendedMission, ...activeMissions]);
          if (isOnline && isSupabaseConfigured) {
            upsertCloudMission(recommendedMission);
          } else {
            queueOfflineMutation({ type: 'UPSERT_MISSION', entityId: recommendedMission.id, payload: recommendedMission });
          }
        }

        // 5. Add to incident / field intel feed
        addIncident({
          title: `Resource Requisition: ${reqData.resourceType} (${reqData.urgency})`,
          corridorFlair: 'NH-306',
          incidentType: 'Road Subsidence',
          severity: 'Caution/Hazard',
          location: {
            placeName: reqData.communityName,
            lat: 24.22,
            lng: 92.68,
          },
          author: {
            name: userContext.name || 'Field Officer',
            role: 'Field Officer (BRO/Police)',
          },
          timestamp: new Date().toISOString(),
          mediaUrl: reqData.evidencePhoto || '',
          hasOfficerVerified: true,
        });
      },
      [rawCommunities, activeMissions, addIncident, userContext.name, userContext.badgeId, isOnline, isSupabaseConfigured]
    );

    const createManualMission = useCallback(
      (params: {
        missionName: string;
        originWarehouseId: string;
        destinationCommunityId: string;
        cargoAllocations: { item: string; quantity: number; unit: string }[];
        urgency: 'P1_CRITICAL' | 'P2_ELEVATED';
        assignedVehicleId?: string;
        assignedDriver?: string;
        notes?: string;
        deadline?: string;
      }) => {
        const newMission = createManualReliefMission({
          ...params,
          communities: rawCommunities,
        });
        setActiveMissions((prev) => [newMission, ...prev]);
        persistMissions([newMission, ...activeMissions]);

        // Attempt inventory reservation
        const allocations = params.cargoAllocations.map((c) => ({
          resourceName: c.item,
          quantity: c.quantity,
        }));
        reserveInventoryForMission(params.originWarehouseId, allocations, newMission.id).catch((e) => {
          console.warn('Inventory reservation warning:', e);
        });
      },
      [activeMissions, rawCommunities, reserveInventoryForMission]
    );

    const resetCommunityScenario = useCallback(
      (targetCommunityId?: string) => {
        const commId = targetCommunityId || (activeRole === 'FIELD_OFFICER' ? (FIELD_OFFICERS.find((o) => o.id === activeOfficerId)?.communityId || 'COMMUNITY_KOLASIB') : 'COMMUNITY_KOLASIB');

        // Reset resource requirements to baseline
        setResourceRequirements((prev) => ({
          ...prev,
          [commId]: INITIAL_RESOURCE_REQUIREMENTS[commId] || [
            { resourceType: 'Food Kits', required: 100, available: 20, shortage: 80, unit: 'kits', urgency: 'CRITICAL', lastUpdated: 'Just now' },
            { resourceType: 'Water Units', required: 50, available: 10, shortage: 40, unit: 'cans (20L)', urgency: 'CRITICAL', lastUpdated: 'Just now' },
            { resourceType: 'Medical Kits', required: 20, available: 3, shortage: 17, unit: 'trauma kits', urgency: 'CRITICAL', lastUpdated: 'Just now' },
          ],
        }));

        // Reset resource requests for this community
        setResourceRequests((prev) =>
          prev.filter((r) => r.communityId !== commId).concat(
            INITIAL_RESOURCE_REQUESTS.filter((r) => r.communityId === commId)
          )
        );

        if (commId === 'COMMUNITY_KOLASIB') {
          // Reset Kolasib road disruption
          setActiveDisruptions((prev) => ({
            ...prev,
            'SEG-SIL-KOL': {
              status: 'SINGLE_LANE_PASSABLE',
              cause: 'Road_Subsidence',
              description: 'Bilkhawthlir silt collapse - 18T load restriction',
              reportedBy: 'Insp. L. Hmar',
            },
          }));

          // Reset vehicle Medic-01
          setVehicles((prev) =>
            prev.map((v) =>
              v.vehicle_id === 'Medic-01'
                ? {
                    ...v,
                    status: 'ON_ROUTE',
                    currentSpeedKmph: 34,
                    latitude: 24.582,
                    longitude: 92.798,
                    fuelPercent: 88,
                    currentBearingDeg: 165,
                    progressPercent: 18,
                    etaMinutes: 42,
                    assignedMissionId: 'MZ-04',
                    diverted: false,
                    halted: false,
                  }
                : v
            )
          );

          // Reset mission MZ-04
          setActiveMissions((prev) =>
            prev.map((m) =>
              m.id === 'MZ-04'
                ? {
                    ...m,
                    status: 'IN_TRANSIT',
                    statusProgress: 18,
                    etaMinutes: 42,
                    deliveryConfirmedByField: false,
                    deliveryConfirmedAt: undefined,
                  }
                : m
            )
          );

          clearModelCache();
        }

        // Reset community metrics & persist to Cloud Database
        setRawCommunities((prev) => {
          const next = prev.map((c) => {
            if (c.id === commId) {
              const orig = INITIAL_COMMUNITIES.find((ic) => ic.id === commId);
              const resetItem = orig ? { ...orig } : c;
              if (isOnline && isSupabaseConfigured) {
                upsertCloudCommunity(resetItem);
              }
              return resetItem;
            }
            return c;
          });
          persistCommunities(next);
          return next;
        });
      },
      [activeOfficerId, activeRole, isOnline, isSupabaseConfigured]
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
      activeDriverEmergencyAlert,
      dispatchDriverEmergencyAlert,
      acknowledgeDriverEmergencyAlert,
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
      // Model B Route Options & Dynamic Routing
      missionRouteOptionsByMissionId,
      selectedRouteOptionByMissionId,
      modelBLoading,
      modelBError,
      generateMissionRouteOptions,
      selectMissionRoute,
      rerouteMission,
      hazardPolygons,
      refreshHazardPolygons,
      pendingSOSAlert,
      setPendingSOSAlert,
      isDemoMode,
      toggleDemoMode,
      resetDemoMode,
      resetCommunityScenario,
      activeOfficerId,
      setActiveOfficerId,
      resourceRequirements,
      resourceRequests,
      submitResourceRequest,
      createManualMission,
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
      // 13. Hubs & Resources Logistics
      hubs,
      selectedHubId,
      inventory,
      transactions,
      setSelectedHubId,
      getHubById,
      getHubInventory,
      getHubVehicles,
      getAvailableInventory,
      getAvailableVehicles,
      findInventoryFeasibleHubs,
      updateHubStatus,
      updateHubDetails,
      adjustHubInventory,
      addHubInventoryItem,
      reserveInventoryForMission,
      releaseMissionInventory,
      dispatchReservedInventory,
      assignVehicleToHub,
      // 14. Model A Road-Disruption Predictive Risk
      modelAPredictions,
      isModelALoading,
      modelAError,
      fetchModelAPrediction,
      fetchModelAPredictionsForSegments,
      refreshModelAPredictions,
      getModelAPrediction,
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
