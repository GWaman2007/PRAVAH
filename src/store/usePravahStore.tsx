import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type {
  UserRole,
  UserContext,
  ActiveView,
  CandidateRoute,
  VehicleProfile,
  VehicleTelemetry,
  AlertEvent,
  Incident,
  CommunityWithCalculation,
  DistrictHealth,
  BROBottleneck,
  BroadcastDraft,
  LanguageId,
  SegmentIncident,
} from '../types';
import { NER_SEGMENTS, NER_NODES, VEHICLE_PROFILES } from '../data/routingNetwork';
import { INITIAL_COMMUNITIES } from '../data/communitiesData';
import { INITIAL_VEHICLES, FLEET_ROUTES, BLACKOUT_ZONES, HAZARD_ZONES } from '../data/fleetData';
import { INITIAL_DISTRICTS_HEALTH, INITIAL_BRO_BOTTLENECKS } from '../data/executiveData';
import { SUPPORTED_LANGUAGES, PRESET_TRANSLATIONS, PHONETIC_READINGS, generateBroadcastForIncident } from '../data/translationsData';
import { findKShortestPaths, evaluateAndRankPaths } from '../engine/routingEngine';
import { calculateCompositePriority } from '../engine/priorityEngine';
import { stepVehicleSimulation, initRouteDistances } from '../engine/telemetryEngine';
import { getOfflineQueue, queueIncidentOffline, clearOfflineQueue, calculateIncidentConfidence, STORAGE_KEYS } from '../engine/offlineSync';

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
  toggleSimulatedOffline: () => void;
  flushOfflineQueue: () => { syncedCount: number; details: string[] };

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

  // Multilingual Broadcasts
  broadcastDrafts: BroadcastDraft[];
  activeBroadcastLanguage: LanguageId;
  setActiveBroadcastLanguage: (lang: LanguageId) => void;
  sendBroadcast: (draftId: string) => void;

  // Closed-Loop Actions
  markMissionDelivered: (communityId: string, vehicleId?: string) => void;
}

const PravahStoreContext = createContext<PravahStoreContextType | null>(null);

export const PravahStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize routes
  useEffect(() => {
    initRouteDistances(FLEET_ROUTES);
  }, []);

  // 1. UAC & Role Switcher
  const [activeRole, setActiveRole] = useState<UserRole>('SUPER_ADMIN');
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
    }
  }, []);

  // 2. Navigation View
  const [activeView, setActiveView] = useState<ActiveView>('GIS_COMMAND');

  // 3. Theme
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('pravah_theme');
      if (stored === 'dark' || stored === 'light') return stored;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('pravah_theme', next);
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
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

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && offlineQueue.length > 0) {
      // Flush queue into main incidents feed
      setIncidents((prev) => {
        const synced = offlineQueue.map((item) => ({
          ...item,
          sync_status: 'SYNCED' as const,
        }));
        return [...synced, ...prev];
      });
      clearOfflineQueue();
      setOfflineQueue([]);
    }
  }, [isOnline, offlineQueue]);

  const toggleSimulatedOffline = useCallback(() => {
    setIsSimulatedOffline((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEYS.SIMULATED_OFFLINE, String(next));
      return next;
    });
  }, []);

  const flushOfflineQueue = useCallback(() => {
    const queue = getOfflineQueue();
    const count = queue.length;
    if (count === 0) return { syncedCount: 0, details: [] };
    const details = queue.map((item) => `${item.title} (${item.corridorFlair})`);
    setIncidents((prev) => {
      const synced = queue.map((item) => ({
        ...item,
        sync_status: 'SYNCED' as const,
      }));
      return [...synced, ...prev.filter((p) => !queue.some((q) => q.id === p.id))];
    });
    clearOfflineQueue();
    setOfflineQueue([]);
    return { syncedCount: count, details };
  }, []);

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
  const [activeDisruptions, setActiveDisruptions] = useState<Record<string, SegmentIncident>>({
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

  const setSegmentDisruption = useCallback((segmentId: string, disruption: SegmentIncident | null) => {
    setActiveDisruptions((prev) => {
      const next = { ...prev };
      if (!disruption) {
        delete next[segmentId];
      } else {
        next[segmentId] = disruption;
      }
      return next;
    });
  }, []);

  const clearAllDisruptions = useCallback(() => {
    setActiveDisruptions({});
  }, []);

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
  const [vehicles, setVehicles] = useState<VehicleTelemetry[]>(INITIAL_VEHICLES);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>('Medic-01');
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
      setAlerts((prev) => [
        {
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
        },
        ...prev,
      ]);
    }
  }, [vehicles]);

  // Telemetry simulation tick loop
  useEffect(() => {
    if (!isSimulationRunning) return;
    const interval = setInterval(() => {
      setVehicles((prev) => {
        let allNewAlerts: AlertEvent[] = [];
        const nextVehicles = prev.map((v) => {
          const route = FLEET_ROUTES[v.assigned_route_id] || FLEET_ROUTES['ROUTE-MZ-04'];
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
  const [rawCommunities, setRawCommunities] = useState(INITIAL_COMMUNITIES);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>('MZ-KOL-004');

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
    setRawCommunities((prev) =>
      prev.map((c) =>
        c.id === communityId
          ? { ...c, elapsedTimeHours: Math.max(0, c.elapsedTimeHours + hours) }
          : c
      )
    );
  }, []);

  // 8. Field Intelligence Feed
  const [incidents, setIncidents] = useState<Incident[]>([
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
  ]);

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

  // 10. Multilingual Emergency Broadcasts
  const [activeBroadcastLanguage, setActiveBroadcastLanguage] = useState<LanguageId>('en');
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
      setOfflineQueue((q) => [...q, newIncident]);
      return;
    }

    // 1. Add to incidents feed
    setIncidents((prev) => [newIncident, ...prev]);

    // 2. Cascade to Module 3 (Routing): Penalize or block road segment
    const matchedCorridor = incidentData.location.corridorId || 'SEG-SIL-KOL';
    setActiveDisruptions((prev) => ({
      ...prev,
      [matchedCorridor]: {
        status: incidentData.severity === 'Total Blockage' ? 'TOTAL_BLOCKAGE' : 'SINGLE_LANE_PASSABLE',
        cause: incidentData.incidentType,
        description: incidentData.title,
        reportedBy: `${incidentData.author.name} (${incidentData.author.role})`,
      },
    }));

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
    setIncidents((prev) =>
      prev.map((inc) => {
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

        return {
          ...inc,
          votes: { upvotes, downvotes, userVote },
          confidenceScore: score,
          hasOfficerVerified: hasOfficer,
        };
      })
    );
  }, [activeRole]);

  // Add nested ground update comment
  const addIncidentUpdate = useCallback((incidentId: string, message: string) => {
    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id !== incidentId) return inc;
        return {
          ...inc,
          updates: [
            ...inc.updates,
            {
              id: `u-${Date.now()}`,
              author: userContext.name,
              role: userContext.role === 'FIELD_OFFICER' ? 'Field Officer (BRO/Police)' : 'Registered Driver',
              message,
              timestamp: new Date().toISOString(),
            },
          ],
        };
      })
    );
  }, [userContext]);

  // =========================================================================
  // 12. CLOSED-LOOP GROUND TRUTH: Mark Mission Delivered
  // =========================================================================
  const markMissionDelivered = useCallback((communityId: string, vehicleId?: string) => {
    const targetVehId = vehicleId || 'Medic-01';

    // 1. Reset community inventory to 100% capacity and reset elapsed time Delta-t = 0
    setRawCommunities((prev) =>
      prev.map((c) => {
        if (c.id === communityId) {
          return {
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
        }
        return c;
      })
    );

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
  }, []);

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
    offlineQueueCount: offlineQueue.length,
    offlineQueue,
    toggleSimulatedOffline,
    flushOfflineQueue,
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
    broadcastDrafts,
    activeBroadcastLanguage,
    setActiveBroadcastLanguage,
    sendBroadcast,
    markMissionDelivered,
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
