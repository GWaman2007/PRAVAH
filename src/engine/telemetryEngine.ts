import type {
  VehicleTelemetry,
  AlertEvent,
  BlackoutZone,
  HazardZone,
  RouteDefinition,
  VehicleStatus,
} from '../types';
import {
  computeCumulativeDistances,
  interpolateAlongPolyline,
  isPointInPolygon,
  pointToPolylineDistanceM,
  haversineDistanceKm,
} from './gisMath';

export const ROUTE_CUMULATIVE_DISTANCES: Record<string, number[]> = {};

export function initRouteDistances(routes: Record<string, RouteDefinition>) {
  Object.values(routes).forEach((route) => {
    ROUTE_CUMULATIVE_DISTANCES[route.id] = computeCumulativeDistances(route.coordinates);
  });
}

/**
 * Step calculation for a single vehicle over deltaSeconds
 */
export function stepVehicleSimulation(
  vehicle: VehicleTelemetry,
  route: RouteDefinition,
  blackoutZones: BlackoutZone[],
  hazardZones: HazardZone[],
  deltaSeconds: number
): {
  updatedVehicle: VehicleTelemetry;
  newAlerts: AlertEvent[];
} {
  const newAlerts: AlertEvent[] = [];
  const cumulativeDists =
    ROUTE_CUMULATIVE_DISTANCES[route.id] ||
    computeCumulativeDistances(route.coordinates);

  const totalDistKm = cumulativeDists[cumulativeDists.length - 1];

  // 1. Effective Speed
  let currentSpeed = vehicle.is_stopped_manual ? 0 : vehicle.nominal_speed_kmh;
  if (currentSpeed > 0) {
    const jitter = Math.sin(vehicle.traveled_distance_km * 3) * 2;
    currentSpeed = Math.max(15, Math.min(75, Math.round(vehicle.nominal_speed_kmh + jitter)));
  }

  // 2. Traveled Distance
  const distanceCoveredKm = currentSpeed * (deltaSeconds / 3600);
  let newTraveledKm = vehicle.traveled_distance_km + distanceCoveredKm;

  if (newTraveledKm > totalDistKm) {
    newTraveledKm = 0; // Wrap around for continuous live simulation
  }

  // 3. Interpolate Position
  let newCoords: [number, number];
  let newHeading: number;

  if (currentSpeed === 0 && vehicle.current_coords) {
    newCoords = vehicle.current_coords;
    newHeading = vehicle.heading_deg;
  } else if (vehicle.is_deviated_manual && route.deviationPath.length >= 2) {
    const devCumulative = computeCumulativeDistances(route.deviationPath);
    const devTotal = devCumulative[devCumulative.length - 1];
    const devProgress = (newTraveledKm * 0.7) % devTotal;
    const interpolated = interpolateAlongPolyline(route.deviationPath, devCumulative, devProgress);
    newCoords = interpolated.coords;
    newHeading = interpolated.heading;
  } else {
    const interpolated = interpolateAlongPolyline(route.coordinates, cumulativeDists, newTraveledKm);
    newCoords = interpolated.coords;
    newHeading = interpolated.heading;
  }

  const routeProgressPct = Math.min(
    100,
    Math.max(0, Math.round((newTraveledKm / (totalDistKm || 1)) * 100))
  );

  // 4. Check Geofence Cross-track deviation (>500m)
  const { minDistanceM } = pointToPolylineDistanceM(newCoords, route.coordinates);
  const isOffRoute = minDistanceM > 500;

  // 5. Check Cellular Blackout Zone
  let activeBlackoutZone: BlackoutZone | null = null;
  for (const zone of blackoutZones) {
    if (isPointInPolygon(newCoords, zone.polygon)) {
      activeBlackoutZone = zone;
      break;
    }
  }

  const wasInBlackout = vehicle.status === 'DEAD_ZONE_EXTRAPOLATING';
  const isNowInBlackout = activeBlackoutZone !== null;

  let entryTime = vehicle.entry_blackout_time;
  let expectedExitTime = vehicle.expected_blackout_exit_time;
  let overdueMin = 0;
  let isAmber = false;
  let isRed = false;

  // Transition into blackout
  if (!wasInBlackout && isNowInBlackout && activeBlackoutZone) {
    const now = new Date();
    entryTime = now.toISOString();

    const transitMinutes = activeBlackoutZone.expectedTransitMinutes * (1.0 + activeBlackoutZone.bufferMultiplier);
    expectedExitTime = new Date(now.getTime() + transitMinutes * 60000).toISOString();

    newAlerts.push({
      id: `alert-blackout-in-${vehicle.vehicle_id}-${Date.now()}`,
      vehicle_id: vehicle.vehicle_id,
      vehicle_name: vehicle.vehicle_name,
      cargo_type: vehicle.cargo_type,
      timestamp: now.toISOString(),
      severity: 'INFO',
      type: 'BLACKOUT_ENTER',
      title: 'Entered Cellular & GPS Blackout Zone',
      message: `${vehicle.vehicle_name} entered ${activeBlackoutZone.name}. Live satellite telemetry severed; dead-reckoning extrapolation engaged.`,
      coords: newCoords,
      acknowledged: false,
      extraDetails: { zoneName: activeBlackoutZone.name, expectedExit: expectedExitTime },
    });
  } else if (wasInBlackout && !isNowInBlackout) {
    // Transition out of blackout ONLY if vehicle is not overdue missing SLA
    const now = Date.now();
    const isOverdue = expectedExitTime && now > new Date(expectedExitTime).getTime();

    if (!isOverdue) {
      entryTime = undefined;
      expectedExitTime = undefined;
      newAlerts.push({
        id: `alert-blackout-out-${vehicle.vehicle_id}-${Date.now()}`,
        vehicle_id: vehicle.vehicle_id,
        vehicle_name: vehicle.vehicle_name,
        cargo_type: vehicle.cargo_type,
        timestamp: new Date().toISOString(),
        severity: 'INFO',
        type: 'BLACKOUT_EXIT',
        title: 'GPS Signal Re-acquired',
        message: `Full constellation fix re-established for ${vehicle.vehicle_name}. Snapping dead-reckoning extrapolation back to verified GPS telemetry.`,
        coords: newCoords,
        acknowledged: false,
      });
    }
  }

  // Watchdog SLA Timer Calculation
  if ((isNowInBlackout || wasInBlackout || vehicle.status === 'DEAD_ZONE_EXTRAPOLATING') && expectedExitTime) {
    const now = Date.now();
    const exitMs = new Date(expectedExitTime).getTime();
    if (now > exitMs) {
      overdueMin = Math.round((now - exitMs) / 60000);
      if (overdueMin > 30) {
        isRed = true;
        if (!vehicle.is_watchdog_red) {
          newAlerts.push({
            id: `alert-wd-red-${vehicle.vehicle_id}-${Date.now()}`,
            vehicle_id: vehicle.vehicle_id,
            vehicle_name: vehicle.vehicle_name,
            cargo_type: vehicle.cargo_type,
            timestamp: new Date().toISOString(),
            severity: 'CRITICAL',
            type: 'WATCHDOG_OVERDUE_RED',
            title: 'DEAD-ZONE WATCHDOG: Emergency SOS Search Triggered',
            message: `${vehicle.vehicle_name} is ${overdueMin} minutes OVERDUE exiting ${activeBlackoutZone?.name}! Exceeded 30-minute SLA buffer. Ground QRT and search beacon initiated.`,
            coords: newCoords,
            acknowledged: false,
          });
        }
      } else if (overdueMin > 0) {
        isAmber = true;
        if (!vehicle.is_watchdog_amber) {
          newAlerts.push({
            id: `alert-wd-amber-${vehicle.vehicle_id}-${Date.now()}`,
            vehicle_id: vehicle.vehicle_id,
            vehicle_name: vehicle.vehicle_name,
            cargo_type: vehicle.cargo_type,
            timestamp: new Date().toISOString(),
            severity: 'WARNING',
            type: 'WATCHDOG_OVERDUE_AMBER',
            title: 'DEAD-ZONE WATCHDOG: Overdue Warning',
            message: `${vehicle.vehicle_name} is ${overdueMin} minutes overdue exiting ${activeBlackoutZone?.name}. Cellular blackout SLA threshold breached.`,
            coords: newCoords,
            acknowledged: false,
          });
        }
      }
    }
  }

  // Dead-Reckoning Distance Accumulation
  let deadReckoningM = vehicle.dead_reckoning_distance_m;
  if (isNowInBlackout) {
    deadReckoningM += distanceCoveredKm * 1000;
  } else {
    deadReckoningM = 0;
  }

  // 6. Hazard Zone & Stationary in Hazard Zone Check
  let activeHazardZone: HazardZone | null = null;
  for (const zone of hazardZones) {
    if (isPointInPolygon(newCoords, zone.polygon)) {
      activeHazardZone = zone;
      break;
    }
  }

  let stationaryTimer = vehicle.stationary_timer_sec;
  if (currentSpeed === 0 && activeHazardZone !== null) {
    stationaryTimer += deltaSeconds;
  } else if (currentSpeed > 0) {
    stationaryTimer = 0;
  }

  const isStationaryHazard = stationaryTimer >= 10 && activeHazardZone !== null;
  if (isStationaryHazard && vehicle.stationary_timer_sec < 10) {
    newAlerts.push({
      id: `alert-hazard-${vehicle.vehicle_id}-${Date.now()}`,
      vehicle_id: vehicle.vehicle_id,
      vehicle_name: vehicle.vehicle_name,
      cargo_type: vehicle.cargo_type,
      timestamp: new Date().toISOString(),
      severity: 'HIGH RISK',
      type: 'STATIONARY_HAZARD',
      title: 'Stationary in High-Risk Hazard Zone',
      message: `CRITICAL STOP: ${vehicle.vehicle_name} is stationary (${Math.round(stationaryTimer)}s) inside ${activeHazardZone?.name}. High hazard risk!`,
      coords: newCoords,
      acknowledged: false,
    });
  }

  // 7. Route Deviation Alert
  if (vehicle.is_deviated_manual && vehicle.status !== 'DEVIATED') {
    newAlerts.push({
      id: `alert-dev-${vehicle.vehicle_id}-${Date.now()}`,
      vehicle_id: vehicle.vehicle_id,
      vehicle_name: vehicle.vehicle_name,
      cargo_type: vehicle.cargo_type,
      timestamp: new Date().toISOString(),
      severity: 'CRITICAL',
      type: 'ROUTE_DEVIATION',
      title: 'Route Deviation Detected (>500m)',
      message: `UNAPPROVED ROUTE: ${vehicle.vehicle_name} has strayed ${Math.round(minDistanceM)}m off the designated mountain corridor.`,
      coords: newCoords,
      acknowledged: false,
    });
  }

  // 8. Overall Status
  let status: VehicleStatus = 'ON_ROUTE';
  if (vehicle.is_sos_manual || isRed) {
    status = 'SOS_ALERT';
  } else if (isStationaryHazard) {
    status = 'CRITICAL_STATIONARY';
  } else if (vehicle.is_deviated_manual || isOffRoute) {
    status = 'DEVIATED';
  } else if (isNowInBlackout || (wasInBlackout && isAmber)) {
    status = 'DEAD_ZONE_EXTRAPOLATING';
  }

  // 9. Signal & Battery
  const satelliteCount = isNowInBlackout ? 0 : 12 + Math.floor(Math.random() * 3);
  const signalDbm = isNowInBlackout ? -120 : -66 - Math.floor(Math.random() * 8);
  const batteryPct = Math.max(10, +(vehicle.battery_pct - 0.001 * deltaSeconds).toFixed(2));

  // 10. Breadcrumbs
  const lastBreadcrumb = vehicle.breadcrumbs[vehicle.breadcrumbs.length - 1];
  const distSinceLastBreadcrumbM = lastBreadcrumb
    ? haversineDistanceKm(lastBreadcrumb.coords, newCoords) * 1000
    : 1000;

  let newBreadcrumbs = [...vehicle.breadcrumbs];
  if (distSinceLastBreadcrumbM > 2500) {
    newBreadcrumbs = [
      {
        coords: newCoords,
        status,
        timestamp: new Date().toISOString(),
        speed_kmh: currentSpeed,
      },
    ];
  } else if (distSinceLastBreadcrumbM >= 180 || lastBreadcrumb.status !== status || vehicle.breadcrumbs.length === 1) {
    newBreadcrumbs.push({
      coords: newCoords,
      status,
      timestamp: new Date().toISOString(),
      speed_kmh: currentSpeed,
    });
    if (newBreadcrumbs.length > 120) {
      newBreadcrumbs.shift();
    }
  }

  const updatedVehicle: VehicleTelemetry = {
    ...vehicle,
    current_coords: newCoords,
    speed_kmh: currentSpeed,
    heading_deg: newHeading,
    status,
    battery_pct: batteryPct,
    last_ping_time: isNowInBlackout ? vehicle.last_ping_time : new Date().toISOString(),
    route_progress_pct: routeProgressPct,
    signal_strength_dbm: signalDbm,
    satellite_count: satelliteCount,
    stationary_timer_sec: stationaryTimer,
    traveled_distance_km: Math.round(newTraveledKm * 10) / 10,
    deviation_distance_m: Math.round(minDistanceM),
    breadcrumbs: newBreadcrumbs,
    dead_reckoning_distance_m: Math.round(deadReckoningM),
    entry_blackout_time: entryTime,
    expected_blackout_exit_time: expectedExitTime,
    overdue_duration_min: overdueMin,
    is_watchdog_amber: isAmber,
    is_watchdog_red: isRed,
  };

  return { updatedVehicle, newAlerts };
}
