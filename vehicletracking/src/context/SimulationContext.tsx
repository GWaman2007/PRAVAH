import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import type {
  VehicleTelemetry,
  AlertEvent,
  BlackoutZone,
  HazardZone,
  RouteDefinition,
  SimulationStats,
  BreadcrumbPoint,
} from '../types/fleet';
import {
  INITIAL_VEHICLES,
  NER_ROUTES,
  BLACKOUT_ZONES,
  HAZARD_ZONES,
} from '../data/nerFleetData';
import {
  initRouteDistances,
  stepVehicleSimulation,
  ROUTE_CUMULATIVE_DISTANCES,
} from '../engine/simulationEngine';
import { computeCumulativeDistances, interpolateAlongPolyline } from '../engine/gisMath';

// Initialize cumulative distances once
initRouteDistances(NER_ROUTES);

interface SimulationContextValue {
  vehicles: Record<string, VehicleTelemetry>;
  selectedVehicle: VehicleTelemetry | null;
  selectedVehicleId: string | null;
  setSelectedVehicleId: (id: string | null) => void;
  
  // Playback
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  speedMultiplier: number;
  setSpeedMultiplier: (multiplier: number) => void;
  stepForward: (seconds?: number) => void;
  resetSimulation: () => void;
  scrubProgress: (vehicleId: string, progressPct: number) => void;
  
  // Static GIS Data
  routes: Record<string, RouteDefinition>;
  blackoutZones: BlackoutZone[];
  hazardZones: HazardZone[];
  
  // Alerts & Active Tab
  alerts: AlertEvent[];
  dismissAlert: (id: string) => void;
  acknowledgeAlert: (id: string) => void;
  clearAllAlerts: () => void;
  activeTab: 'TELEMETRY' | 'ALERTS';
  setActiveTab: (tab: 'TELEMETRY' | 'ALERTS') => void;
  
  // Manual Anomaly Triggers
  toggleDeviation: (vehicleId: string) => void;
  toggleStopBreakdown: (vehicleId: string) => void;
  triggerSOS: (vehicleId: string) => void;
  clearSOS: (vehicleId: string) => void;
  resetVehicleAnomaly: (vehicleId: string) => void;
  
  // SOS Modal State
  activeSOSVehicle: VehicleTelemetry | null;
  closeSOSModal: () => void;
  
  // Camera Pan Target
  panTarget: [number, number] | null;
  setPanTarget: (coords: [number, number] | null) => void;
  focusVehicle: (vehicleId: string) => void;
  
  // Stats
  stats: SimulationStats;
}

const SimulationContext = createContext<SimulationContextValue | null>(null);

export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Convert initial array to record keyed by vehicle_id
  const [vehicles, setVehicles] = useState<Record<string, VehicleTelemetry>>(() => {
    const map: Record<string, VehicleTelemetry> = {};
    INITIAL_VEHICLES.forEach((v) => {
      map[v.vehicle_id] = { ...v };
    });
    return map;
  });

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>('medic-01');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [alerts, setAlerts] = useState<AlertEvent[]>([
    {
      id: 'initial-convoy-launch',
      vehicle_id: 'medic-01',
      vehicle_name: 'Medic-01 (Vaccine & Critical Care)',
      cargo_type: 'Medical Supplies',
      timestamp: new Date().toISOString(),
      severity: 'INFO',
      type: 'BLACKOUT_EXIT',
      title: 'NER Tactical Convoy Network Live',
      message: 'Autonomous GIS telemetry stream initialized across 3 strategic corridors. Cellular blackout and anomaly detection active.',
      coords: INITIAL_VEHICLES[0].current_coords,
      acknowledged: false,
    },
  ]);

  const [activeSOSVehicle, setActiveSOSVehicle] = useState<VehicleTelemetry | null>(null);
  const [panTarget, setPanTarget] = useState<[number, number] | null>(null);

  // Maintain ref to latest vehicles to avoid stale closures and double updater invocations
  const vehiclesRef = useRef(vehicles);
  vehiclesRef.current = vehicles;

  // Animation interval reference
  const timerRef = useRef<number | null>(null);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const acknowledgeAlert = useCallback((id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
    );
  }, []);

  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Safe deduplicating alert inserter
  const addAlerts = useCallback((newItems: AlertEvent[]) => {
    if (newItems.length === 0) return;
    setAlerts((prev) => {
      const existingIds = new Set(prev.map((a) => a.id));
      const recentKeys = new Set(
        prev.map(
          (a) =>
            `${a.vehicle_id}-${a.type}-${Math.floor(
              new Date(a.timestamp).getTime() / 4000
            )}`
        )
      );

      const unique = newItems.filter((item) => {
        if (existingIds.has(item.id)) return false;
        const key = `${item.vehicle_id}-${item.type}-${Math.floor(
          new Date(item.timestamp).getTime() / 4000
        )}`;
        if (recentKeys.has(key)) return false;
        recentKeys.add(key);
        existingIds.add(item.id);
        return true;
      });

      if (unique.length === 0) return prev;
      return [...unique, ...prev].slice(0, 50);
    });
  }, []);

  // Single step update function
  const stepSimulation = useCallback(
    (deltaSec: number) => {
      const prevVehicles = vehiclesRef.current;
      const nextVehicles: Record<string, VehicleTelemetry> = {};
      const incomingAlerts: AlertEvent[] = [];

      Object.values(prevVehicles).forEach((vehicle) => {
        const route = NER_ROUTES[vehicle.assigned_route_id];
        if (!route) {
          nextVehicles[vehicle.vehicle_id] = vehicle;
          return;
        }

        const { updatedVehicle, newAlerts } = stepVehicleSimulation(
          vehicle,
          route,
          BLACKOUT_ZONES,
          HAZARD_ZONES,
          deltaSec
        );

        nextVehicles[vehicle.vehicle_id] = updatedVehicle;
        if (newAlerts.length > 0) {
          incomingAlerts.push(...newAlerts);
        }
      });

      setVehicles(nextVehicles);
      if (incomingAlerts.length > 0) {
        addAlerts(incomingAlerts);
      }
    },
    [addAlerts]
  );

  const stepForward = useCallback(
    (seconds = 5) => {
      stepSimulation(seconds);
    },
    [stepSimulation]
  );

  // Main simulation timer loop (1 Hz interval, scaled by speed multiplier)
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    // Update every 1000ms, advancing simulation time by speedMultiplier seconds
    const intervalMs = 1000;
    timerRef.current = window.setInterval(() => {
      stepSimulation(speedMultiplier);
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, speedMultiplier, stepSimulation]);

  // Reset simulation back to start
  const resetSimulation = useCallback(() => {
    const map: Record<string, VehicleTelemetry> = {};
    INITIAL_VEHICLES.forEach((v) => {
      map[v.vehicle_id] = { ...v, last_ping_time: new Date().toISOString() };
    });
    setVehicles(map);
    setActiveSOSVehicle(null);
    setAlerts([
      {
        id: `reset-alert-${Date.now()}`,
        vehicle_id: 'medic-01',
        vehicle_name: 'Fleet Command',
        cargo_type: 'Medical Supplies',
        timestamp: new Date().toISOString(),
        severity: 'INFO',
        type: 'BLACKOUT_EXIT',
        title: 'Simulation Reset',
        message: 'All 3 convoy vehicles repositioned to corridor origins. Telemetry reset to baseline.',
        coords: INITIAL_VEHICLES[0].current_coords,
        acknowledged: false,
      },
    ]);
  }, []);

  // Scrub progress along assigned route
  const scrubProgress = useCallback(
    (vehicleId: string, progressPct: number) => {
      setVehicles((prev) => {
        const target = prev[vehicleId];
        if (!target) return prev;
        const route = NER_ROUTES[target.assigned_route_id];
        if (!route) return prev;

        const cumulativeDists =
          ROUTE_CUMULATIVE_DISTANCES[route.id] ||
          computeCumulativeDistances(route.coordinates);
        const totalDist = cumulativeDists[cumulativeDists.length - 1];
        const newTraveledKm = (progressPct / 100) * totalDist;

        // Immediately compute exact coordinates and heading along the route
        const interpolated = interpolateAlongPolyline(
          route.coordinates,
          cumulativeDists,
          newTraveledKm
        );

        // Reconstruct clean breadcrumbs conforming strictly to highway waypoints
        const cleanBreadcrumbs: BreadcrumbPoint[] = [];
        for (let i = 0; i <= interpolated.segmentIndex; i++) {
          cleanBreadcrumbs.push({
            coords: route.coordinates[i],
            status: 'ON_ROUTE',
            timestamp: new Date().toISOString(),
            speed_kmh: target.nominal_speed_kmh,
          });
        }
        cleanBreadcrumbs.push({
          coords: interpolated.coords,
          status: 'ON_ROUTE',
          timestamp: new Date().toISOString(),
          speed_kmh: target.nominal_speed_kmh,
        });

        return {
          ...prev,
          [vehicleId]: {
            ...target,
            current_coords: interpolated.coords,
            heading_deg: interpolated.heading,
            traveled_distance_km: Math.round(newTraveledKm * 10) / 10,
            route_progress_pct: progressPct,
            breadcrumbs: cleanBreadcrumbs,
          },
        };
      });
    },
    []
  );

  // Active Tab State for Inspector vs Alert Stream
  const [activeTab, setActiveTab] = useState<'TELEMETRY' | 'ALERTS'>('TELEMETRY');

  // Manual Anomaly Triggers
  const toggleDeviation = useCallback(
    (vehicleId: string) => {
      const v = vehiclesRef.current[vehicleId];
      if (!v) return;
      const willDeviate = !v.is_deviated_manual;

      setVehicles((prev) => ({
        ...prev,
        [vehicleId]: {
          ...prev[vehicleId],
          is_deviated_manual: willDeviate,
          status: willDeviate ? 'DEVIATED' : 'ON_ROUTE',
        },
      }));

      if (willDeviate) {
        const devAlert: AlertEvent = {
          id: `alert-dev-${vehicleId}-${Date.now()}`,
          vehicle_id: v.vehicle_id,
          vehicle_name: v.vehicle_name,
          cargo_type: v.cargo_type,
          timestamp: new Date().toISOString(),
          severity: 'CRITICAL',
          type: 'ROUTE_DEVIATION',
          title: 'VEHICLE DEVIATED FROM SAFE CORRIDOR',
          message: `UNAPPROVED ROUTE DETOUR: ${v.vehicle_name} (${v.license_plate}) has strayed >500m off ${v.corridor_name} onto an unverified mountain track. Red breadcrumbs engaged.`,
          coords: v.current_coords,
          acknowledged: false,
          extraDetails: { distance_m: 780 },
        };
        addAlerts([devAlert]);
      } else {
        const clearAlert: AlertEvent = {
          id: `alert-realign-${vehicleId}-${Date.now()}`,
          vehicle_id: v.vehicle_id,
          vehicle_name: v.vehicle_name,
          cargo_type: v.cargo_type,
          timestamp: new Date().toISOString(),
          severity: 'INFO',
          type: 'BLACKOUT_EXIT',
          title: 'Corridor Re-Alignment Verified',
          message: `${v.vehicle_name} has returned to the approved corridor polyline. Cross-track error cleared.`,
          coords: v.current_coords,
          acknowledged: false,
        };
        addAlerts([clearAlert]);
      }
    },
    [addAlerts]
  );

  const toggleStopBreakdown = useCallback(
    (vehicleId: string) => {
      const v = vehiclesRef.current[vehicleId];
      if (!v) return;
      const willStop = !v.is_stopped_manual;

      setVehicles((prev) => ({
        ...prev,
        [vehicleId]: {
          ...prev[vehicleId],
          is_stopped_manual: willStop,
          speed_kmh: willStop ? 0 : prev[vehicleId]?.nominal_speed_kmh || 50,
          stationary_timer_sec: 0,
        },
      }));

      if (willStop) {
        const stopAlert: AlertEvent = {
          id: `alert-breakdown-${vehicleId}-${Date.now()}`,
          vehicle_id: v.vehicle_id,
          vehicle_name: v.vehicle_name,
          cargo_type: v.cargo_type,
          timestamp: new Date().toISOString(),
          severity: 'HIGH RISK',
          type: 'STATIONARY_HAZARD',
          title: 'CONVOY BREAKDOWN / EMERGENCY HALT',
          message: `UNSCHEDULED STOP: ${v.vehicle_name} velocity dropped to 0 km/h on ${v.corridor_name} at [${v.current_coords[0].toFixed(4)}, ${v.current_coords[1].toFixed(4)}]. Engine halted.`,
          coords: v.current_coords,
          acknowledged: false,
          extraDetails: { duration_sec: 0 },
        };
        addAlerts([stopAlert]);
      } else {
        const resumeAlert: AlertEvent = {
          id: `alert-resume-${vehicleId}-${Date.now()}`,
          vehicle_id: v.vehicle_id,
          vehicle_name: v.vehicle_name,
          cargo_type: v.cargo_type,
          timestamp: new Date().toISOString(),
          severity: 'INFO',
          type: 'BLACKOUT_EXIT',
          title: 'Convoy Transit Resumed',
          message: `${v.vehicle_name} engine restarted. Resuming nominal speed (${v.nominal_speed_kmh} km/h).`,
          coords: v.current_coords,
          acknowledged: false,
        };
        addAlerts([resumeAlert]);
      }
    },
    [addAlerts]
  );

  const triggerSOS = useCallback(
    (vehicleId: string) => {
      const v = vehiclesRef.current[vehicleId];
      if (!v) return;

      const updated: VehicleTelemetry = {
        ...v,
        is_sos_manual: true,
        status: 'SOS_ALERT',
      };

      setActiveSOSVehicle(updated);

      setVehicles((prev) => ({
        ...prev,
        [vehicleId]: updated,
      }));

      const sosAlert: AlertEvent = {
        id: `sos-manual-${vehicleId}-${Date.now()}`,
        vehicle_id: v.vehicle_id,
        vehicle_name: v.vehicle_name,
        cargo_type: v.cargo_type,
        timestamp: new Date().toISOString(),
        severity: 'EMERGENCY',
        type: 'SOS_PANIC',
        title: 'EMERGENCY SOS PANIC BUTTON TRIGGERED',
        message: `CABIN DISTRESS: Driver ${v.driver_name} aboard ${v.vehicle_name} (${v.license_plate}) has activated the physical cabin distress beacon on ${v.corridor_name}! Immediate QRT dispatch required.`,
        coords: v.current_coords,
        acknowledged: false,
      };

      addAlerts([sosAlert]);
    },
    [addAlerts]
  );

  const clearSOS = useCallback((vehicleId: string) => {
    setVehicles((prev) => {
      const v = prev[vehicleId];
      if (!v) return prev;
      return {
        ...prev,
        [vehicleId]: {
          ...v,
          is_sos_manual: false,
          status: 'ON_ROUTE',
        },
      };
    });
    setActiveSOSVehicle(null);
  }, []);

  const resetVehicleAnomaly = useCallback(
    (vehicleId: string) => {
      const v = vehiclesRef.current[vehicleId];
      if (!v) return;

      setVehicles((prev) => ({
        ...prev,
        [vehicleId]: {
          ...prev[vehicleId],
          is_deviated_manual: false,
          is_stopped_manual: false,
          is_sos_manual: false,
          speed_kmh: v.nominal_speed_kmh,
          status: 'ON_ROUTE',
          stationary_timer_sec: 0,
        },
      }));

      setActiveSOSVehicle((current) =>
        current?.vehicle_id === vehicleId ? null : current
      );

      const resetAlert: AlertEvent = {
        id: `alert-reset-${vehicleId}-${Date.now()}`,
        vehicle_id: v.vehicle_id,
        vehicle_name: v.vehicle_name,
        cargo_type: v.cargo_type,
        timestamp: new Date().toISOString(),
        severity: 'INFO',
        type: 'BLACKOUT_EXIT',
        title: 'All Anomalies Reset',
        message: `${v.vehicle_name} restored to baseline corridor tracking. Deviation, stop timer, and SOS cleared.`,
        coords: v.current_coords,
        acknowledged: false,
      };
      addAlerts([resetAlert]);
    },
    [addAlerts]
  );

  const closeSOSModal = useCallback(() => {
    setActiveSOSVehicle(null);
  }, []);

  const focusVehicle = useCallback(
    (vehicleId: string) => {
      setSelectedVehicleId(vehicleId);
      const v = vehicles[vehicleId];
      if (v) {
        setPanTarget([...v.current_coords]);
      }
    },
    [vehicles]
  );

  const selectedVehicle = useMemo(
    () => (selectedVehicleId ? vehicles[selectedVehicleId] || null : null),
    [selectedVehicleId, vehicles]
  );

  // Aggregate stats
  const stats = useMemo<SimulationStats>(() => {
    const list = Object.values(vehicles);
    const deadReckoningCount = list.filter(
      (v) => v.status === 'DEAD_ZONE_EXTRAPOLATING'
    ).length;
    const anomalyCount = list.filter(
      (v) =>
        v.status === 'DEVIATED' ||
        v.status === 'CRITICAL_STATIONARY' ||
        v.status === 'SOS_ALERT'
    ).length;
    const activeCount = list.filter(
      (v) => v.status === 'ON_ROUTE' && v.speed_kmh > 0
    ).length;
    const totalBreadcrumbs = list.reduce(
      (sum, v) => sum + v.breadcrumbs.length,
      0
    );

    return {
      activeCount,
      deadReckoningCount,
      anomalyCount,
      totalBreadcrumbs,
    };
  }, [vehicles]);

  const value: SimulationContextValue = {
    vehicles,
    selectedVehicle,
    selectedVehicleId,
    setSelectedVehicleId,
    isPlaying,
    setIsPlaying,
    togglePlay,
    speedMultiplier,
    setSpeedMultiplier,
    stepForward,
    resetSimulation,
    scrubProgress,
    routes: NER_ROUTES,
    blackoutZones: BLACKOUT_ZONES,
    hazardZones: HAZARD_ZONES,
    alerts,
    dismissAlert,
    acknowledgeAlert,
    clearAllAlerts,
    activeTab,
    setActiveTab,
    toggleDeviation,
    toggleStopBreakdown,
    triggerSOS,
    clearSOS,
    resetVehicleAnomaly,
    activeSOSVehicle,
    closeSOSModal,
    panTarget,
    setPanTarget,
    focusVehicle,
    stats,
  };

  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = () => {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
};
