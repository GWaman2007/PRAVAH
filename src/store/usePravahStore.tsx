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
} from '../types';
import { NER_SEGMENTS, NER_NODES, VEHICLE_PROFILES } from '../data/routingNetwork';
import { INITIAL_COMMUNITIES } from '../data/communitiesData';
import { INITIAL_VEHICLES, FLEET_ROUTES, BLACKOUT_ZONES, HAZARD_ZONES, INITIAL_RELIEF_MISSIONS } from '../data/fleetData';
import { INITIAL_DISTRICTS_HEALTH, INITIAL_BRO_BOTTLENECKS } from '../data/executiveData';
import { SUPPORTED_LANGUAGES, PRESET_TRANSLATIONS, PHONETIC_READINGS, generateBroadcastForIncident } from '../data/translationsData';
import { findKShortestPaths, evaluateAndRankPaths } from '../engine/routingEngine';
import { calculateCompositePriority } from '../engine/priorityEngine';
import { stepVehicleSimulation, initRouteDistances } from '../engine/telemetryEngine';
import {
  getOfflineQueue,
  queueIncidentOffline,
  clearOfflineQueue,
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
  broadcastCloudSOS,
  cancelCloudSOS,
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
  flushOfflineQueue: () => { syncedCount: number; details: string[] };
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

  // Multilingual Broadcasts
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
  approveAndDispatchMission: (missionId: string) => void;
  customizeMission: (mission: ReliefMission) => void;

  // Driver SOS Distress Signal Intercept
  pendingSOSAlert: AlertEvent | null;
  setPendingSOSAlert: (alert: AlertEvent | null) => void;

  // Interactive Walkthrough Demo
  runDemoStep1: () => void;
  runDemoStep2: () => void;
  runDemoStep3: () => void;
  resetDemoSimulation: () => void;
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

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && offlineQueue.length > 0) {
      // Flush queue into main incidents feed
      setIncidents((prev) => {
        const synced = offlineQueue.map((item) => ({
          ...item,
          sync_status: 'SYNCED' as const,
        }));
        const merged = [...synced, ...prev.filter((p) => !offlineQueue.some((q) => q.id === p.id))];
        persistIncidents(merged);
        return merged;
      });
      offlineQueue.forEach((item) => {
        if (socketRef.current?.connected) {
          socketRef.current.emit('SUBMIT_INCIDENT', item);
        }
      });
      clearOfflineQueue();
      setOfflineQueue([]);
    }
  }, [isOnline, offlineQueue]);

  const flushOfflineQueue = useCallback(() => {
    const queue = getOfflineQueue();
    const count = queue.length;
    if (count === 0) return { syncedCount: 0, details: [] };
    const details = queue.map((item) => `${item.title} (${item.corridorFlair})`);

    // 1. Update incidents state and mark as SYNCED
    setIncidents((prev) => {
      const merged = prev.map((p) => {
        const matched = queue.find((q) => q.id === p.id);
        return matched ? { ...p, sync_status: 'SYNCED' as const } : p;
      });
      queue.forEach((q) => {
        if (!merged.some((m) => m.id === q.id)) {
          merged.unshift({ ...q, sync_status: 'SYNCED' as const });
        }
      });
      persistIncidents(merged);
      return merged;
    });

    // 2. Synchronize each queued item to Supabase Cloud DB & broadcast
    queue.forEach((item) => {
      const syncedItem: Incident = { ...item, sync_status: 'SYNCED' };
      if (isSupabaseConfigured) {
        upsertCloudIncident(syncedItem);
        const matchedCorridor = item.location.corridorId || 'SEG-SIL-KOL';
        upsertCloudDisruption(matchedCorridor, {
          status: item.severity === 'Total Blockage' ? ('TOTAL_BLOCKAGE' as const) : ('SINGLE_LANE_PASSABLE' as const),
          cause: item.incidentType,
          description: item.title,
          reportedBy: `${item.author.name} (${item.author.role})`,
        });
      }
      if (socketRef.current?.connected) {
        socketRef.current.emit('SUBMIT_INCIDENT', syncedItem);
      }
    });

    clearOfflineQueue();
    setOfflineQueue([]);
    setLastDataSyncTime(Date.now());
    return { syncedCount: count, details };
  }, []);

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

  // 6b. Preemptive Relief Missions (10 Ongoing + 3 Suggested)
  const [activeMissions, setActiveMissions] = useState<ReliefMission[]>(() => {
    const persisted = typeof window !== 'undefined' ? getPersistedMissions() : null;
    if (persisted && persisted.length > 0) {
      // Synchronize with authoritative FLEET_ROUTES so stale localStorage geometry is refreshed
      return persisted.map((pm: ReliefMission) => {
        const init = INITIAL_RELIEF_MISSIONS.find((im) => im.id === pm.id);
        const fleetRoute = FLEET_ROUTES[pm.assignedRouteId];
        if (init && fleetRoute) {
          const routeCoords = fleetRoute.coordinates;
          const endCoord =
            routeCoords && routeCoords.length > 0
              ? routeCoords[routeCoords.length - 1]
              : init.destinationEndpoint;
          return {
            ...pm,
            destinationEndpoint: endCoord,
            destinationName: init.destinationName || pm.destinationName,
            originCoords: init.originCoords,
            originWarehouseId: init.originWarehouseId,
            originWarehouseName: init.originWarehouseName,
            routeDistanceKm: fleetRoute.distanceKm,
            routeDurationMinutes: fleetRoute.expectedDurationMinutes,
            routeGeometry: fleetRoute.coordinates,
          };
        }
        return pm;
      });
    }
    return INITIAL_RELIEF_MISSIONS;
  });
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>('MISSION-MZ-04');
  const activeMissionsRef = useRef<ReliefMission[]>(activeMissions);

  // Synchronize any in-memory or persisted missions with authoritative route terminus
  useEffect(() => {
    setActiveMissions((prev) =>
      prev.map((pm) => {
        const init = INITIAL_RELIEF_MISSIONS.find((im) => im.id === pm.id);
        const fleetRoute = FLEET_ROUTES[pm.assignedRouteId];
        if (init && fleetRoute) {
          const routeCoords = fleetRoute.coordinates;
          const endCoord =
            routeCoords && routeCoords.length > 0
              ? routeCoords[routeCoords.length - 1]
              : init.destinationEndpoint;
          return {
            ...pm,
            destinationEndpoint: endCoord,
            destinationName: init.destinationName || pm.destinationName,
            originCoords: init.originCoords,
            originWarehouseId: init.originWarehouseId,
            originWarehouseName: init.originWarehouseName,
            routeDistanceKm: fleetRoute.distanceKm,
            routeDurationMinutes: fleetRoute.expectedDurationMinutes,
            routeGeometry: fleetRoute.coordinates,
          };
        }
        return pm;
      })
    );
  }, []);

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

  useEffect(() => {
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
    setRawCommunities((prev) =>
      prev.map((c) =>
        c.id === communityId
          ? { ...c, elapsedTimeHours: Math.max(0, c.elapsedTimeHours + hours) }
          : c
      )
    );
  }, []);

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

      if (isSupabaseConfigured) {
        voteCloudIncident(
          incidentId,
          { upvotes: targetUpvotes, downvotes: targetDownvotes },
          targetScore,
          targetHasOfficer
        );
      }

      return next;
    });
  }, [activeRole]);

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
    if (isSupabaseConfigured) {
      const inc = incidents.find((i) => i.id === incidentId);
      const allUpdates = inc ? [...inc.updates, update] : [update];
      addCloudIncidentUpdate(incidentId, update, allUpdates);
    }
  }, [incidents, userContext]);

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

    // 5. Update Mission state to DELIVERED
    let deliveredMission: ReliefMission | undefined;
    setActiveMissions((prev) => {
      const next = prev.map((m) => {
        if (m.communityId === communityId || m.assignedVehicleId === targetVehId) {
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

    if (isSupabaseConfigured && deliveredMission) {
      upsertCloudMission(deliveredMission);
      broadcastCloudMissionDelivered(deliveredMission.id, targetVehId, deliveredMission.deliveredAt);
    }
  }, []);

  // 13. Mission Dispatch & Customization
  const approveMission = useCallback((missionId: string) => {
    let targetMission: ReliefMission | undefined;
    setActiveMissions((prev) => {
      const next = prev.map((m) => {
        if (m.id === missionId) {
          targetMission = { ...m, status: 'APPROVED' as const };
          return targetMission;
        }
        return m;
      });
      persistMissions(next);
      return next;
    });

    if (isSupabaseConfigured && targetMission) {
      upsertCloudMission(targetMission);
      broadcastCloudMissionApproved(missionId);
    }
  }, []);

  const dispatchMission = useCallback((missionId: string, vehicleId?: string) => {
    // 1. Synchronously resolve mission from current ref — never invent a fallback vehicle
    const targetMission = activeMissionsRef.current.find((m) => m.id === missionId);
    const assignedVehId = vehicleId || targetMission?.assignedVehicleId;
    if (!assignedVehId) {
      console.warn(`[PRAVAH] dispatchMission: No vehicle assigned for mission ${missionId}. Cannot dispatch without real vehicle assignment.`);
      return;
    }
    const originCoords = targetMission?.originCoords || [24.8333, 92.7789];
    const destName = targetMission?.destinationName || targetMission?.communityName || 'Disaster Operational Target';

    // 2. Transition mission to IN_TRANSIT with confirmed vehicle assignment
    let updatedMission: ReliefMission | undefined;
    setActiveMissions((prev) => {
      const next = prev.map((m) => {
        if (m.id === missionId) {
          updatedMission = {
            ...m,
            status: 'IN_TRANSIT' as const,
            assignedVehicleId: assignedVehId,
            dispatchedAt: new Date().toISOString(),
          };
          return updatedMission;
        }
        return m;
      });
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
    if (isSupabaseConfigured && updatedMission) {
      upsertCloudMission(updatedMission);
      broadcastCloudMissionDispatched(updatedMission, assignedVehId);
    }

    if (socketRef.current?.connected) {
      socketRef.current.emit('DISPATCH_MISSION', { missionId, vehicleId: assignedVehId });
    }
  }, []);

  const approveAndDispatchMission = useCallback((missionId: string) => {
    approveMission(missionId);
    dispatchMission(missionId);
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
      if (prev.some((m) => m.communityId === 'MZ-KOL-004')) {
        return prev.map((m) =>
          m.communityId === 'MZ-KOL-004' ? { ...m, status: 'SUGGESTED', urgency: 'P1_CRITICAL' } : m
        );
      }
      return [
        {
          id: 'MISSION-MZ-04',
          communityId: 'MZ-KOL-004',
          communityName: 'Kolasib District HQ & PHC',
          recommendedVehicleType: '4x4 Tata Xenon High-Clearance Medic Carrier',
          cargoAllocations: [
            { item: 'IV Fluids (RL / NS 500ml)', quantity: 350, unit: 'Bags' },
            { item: 'Polyvalent Snake Antivenom', quantity: 60, unit: 'Vials' },
            { item: 'Fortified High-Energy Biscuits & Grain', quantity: 800, unit: 'kg' },
            { item: 'Generator Diesel (Emergency)', quantity: 400, unit: 'Litres' },
          ],
          assignedRouteId: 'ROUTE-MZ-04',
          suggestedDetour: 'NH-306 Bilkhawthlir Escarpment alternate spur (via Bairabi Pass)',
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
          destinationEndpoint: [24.2650, 92.7300],
          destinationName: 'Kolasib District HQ & PHC',
          assignedVehicleId: 'Medic-01',
          routeDistanceKm: 68,
          routeDurationMinutes: 110,
          routeStatus: 'COMPUTED',
          routeGeometry: FLEET_ROUTES['ROUTE-MZ-04'].coordinates,
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
    approveAndDispatchMission('MISSION-MZ-04');
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
    setActiveMissions(INITIAL_RELIEF_MISSIONS);
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

    // 1. Initial hydration from cloud
    fetchCloudIncidents().then((cloudIncidents) => {
      if (cloudIncidents && cloudIncidents.length > 0) {
        setIncidents((prev) => {
          const userVoteMap = new Map<string, null | 'up' | 'down'>();
          prev.forEach((p) => {
            if (p.votes?.userVote) userVoteMap.set(p.id, p.votes.userVote);
          });
          const merged = cloudIncidents.map((c) => ({
            ...c,
            votes: {
              ...c.votes,
              userVote: userVoteMap.get(c.id) || c.votes.userVote || null,
            },
          }));
          persistIncidents(merged);
          return merged;
        });
      }
    });

    fetchCloudDisruptions().then((cloudDisruptions) => {
      if (cloudDisruptions && Object.keys(cloudDisruptions).length > 0) {
        setActiveDisruptions((prev) => {
          const next = { ...prev, ...cloudDisruptions };
          persistDisruptions(next);
          return next;
        });
      }
    });

    fetchCloudCommunities().then((cloudCommunities) => {
      if (cloudCommunities && cloudCommunities.length > 0) {
        setRawCommunities(cloudCommunities);
        persistCommunities(cloudCommunities);
      }
    });

    fetchCloudMissions().then((cloudMissions) => {
      if (cloudMissions && cloudMissions.length > 0) {
        setActiveMissions((prev) => {
          const cloudMap = new Map(cloudMissions.map((m) => [m.id, m]));
          const merged = prev.map((m) => cloudMap.get(m.id) || m);
          cloudMissions.forEach((cm) => {
            if (!merged.some((m) => m.id === cm.id)) {
              merged.push(cm);
            }
          });
          persistMissions(merged);
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
              const next = prev.map((m) => (m.id === mission.id ? { ...m, ...mission } : m));
              if (!next.some((m) => m.id === mission.id)) {
                next.push(mission);
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
        .on('broadcast', { event: 'MISSION_APPROVED' }, ({ payload }) => {
          if (payload?.missionId) {
            setActiveMissions((prev) => {
              const next = prev.map((m) => (m.id === payload.missionId ? { ...m, status: 'APPROVED' as const } : m));
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
    pendingSOSAlert,
    setPendingSOSAlert,
    runDemoStep1,
    runDemoStep2,
    runDemoStep3,
    resetDemoSimulation,
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
