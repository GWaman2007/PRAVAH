import type {
  VehicleTelemetry,
  AlertEvent,
  BlackoutZone,
  HazardZone,
  RouteDefinition,
  VehicleStatus,
} from '../types/fleet';
import {
  computeCumulativeDistances,
  interpolateAlongPolyline,
  isPointInPolygon,
  pointToPolylineDistanceM,
  haversineDistanceKm,
} from './gisMath';

// Precompute cumulative distances for all routes
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

  // 1. Determine Effective Speed
  let currentSpeed = vehicle.is_stopped_manual ? 0 : vehicle.nominal_speed_kmh;
  if (currentSpeed > 0) {
    // Subtle realistic mountain speed jitter +/- 2 km/h
    const jitter = (Math.sin(vehicle.traveled_distance_km * 3) * 3);
    currentSpeed = Math.max(15, Math.min(80, Math.round(vehicle.nominal_speed_kmh + jitter)));
  }

  // 2. Advance Traveled Distance
  // Distance = Speed (km/h) * time (h)
  const distanceCoveredKm = (currentSpeed * (deltaSeconds / 3600));
  let newTraveledKm = vehicle.traveled_distance_km + distanceCoveredKm;

  // Loop back if reached destination to keep simulation running infinitely
  if (newTraveledKm > totalDistKm) {
    newTraveledKm = 0;
  }

  // 3. Interpolate Position along Route or Deviation
  let newCoords: [number, number];
  let newHeading: number;

  if (currentSpeed === 0 && vehicle.current_coords) {
    // Retain exact position when vehicle is halted
    newCoords = vehicle.current_coords;
    newHeading = vehicle.heading_deg;
  } else if (vehicle.is_deviated_manual && route.deviationPath.length >= 2) {
    // Advance along deviation path
    const devCumulative = computeCumulativeDistances(route.deviationPath);
    const devTotal = devCumulative[devCumulative.length - 1];
    const devProgress = (newTraveledKm * 0.7) % devTotal; // Detour distance
    const interpolated = interpolateAlongPolyline(
      route.deviationPath,
      devCumulative,
      devProgress
    );
    newCoords = interpolated.coords;
    newHeading = interpolated.heading;
  } else {
    const interpolated = interpolateAlongPolyline(
      route.coordinates,
      cumulativeDists,
      newTraveledKm
    );
    newCoords = interpolated.coords;
    newHeading = interpolated.heading;
  }

  const routeProgressPct = Math.min(
    100,
    Math.max(0, Math.round((newTraveledKm / (totalDistKm || 1)) * 100))
  );

  // 4. Check Perpendicular Distance to Assigned Route (Off-Route Deviation)
  const { minDistanceM } = pointToPolylineDistanceM(newCoords, route.coordinates);
  const isOffRoute = minDistanceM > 500;

  // 5. Check if inside Cellular / GPS Blackout Zone
  let activeBlackoutZone: BlackoutZone | null = null;
  for (const zone of blackoutZones) {
    if (isPointInPolygon(newCoords, zone.polygon)) {
      activeBlackoutZone = zone;
      break;
    }
  }

  const wasInBlackout = vehicle.status === 'DEAD_ZONE_EXTRAPOLATING';
  const isNowInBlackout = activeBlackoutZone !== null;

  // Signal Reacquisition / Blackout Transition Events
  if (!wasInBlackout && isNowInBlackout) {
    newAlerts.push({
      id: `alert-blackout-in-${vehicle.vehicle_id}-${Date.now()}`,
      vehicle_id: vehicle.vehicle_id,
      vehicle_name: vehicle.vehicle_name,
      cargo_type: vehicle.cargo_type,
      timestamp: new Date().toISOString(),
      severity: 'INFO',
      type: 'BLACKOUT_ENTER',
      title: 'Entered Cellular & GPS Blackout Zone',
      message: `${vehicle.vehicle_name} has entered ${activeBlackoutZone?.name}. Live GPS link severed. Dead-Reckoning extrapolation initiated along highway polyline.`,
      coords: newCoords,
      acknowledged: false,
      extraDetails: { zone_name: activeBlackoutZone?.name },
    });
  } else if (wasInBlackout && !isNowInBlackout) {
    newAlerts.push({
      id: `alert-blackout-out-${vehicle.vehicle_id}-${Date.now()}`,
      vehicle_id: vehicle.vehicle_id,
      vehicle_name: vehicle.vehicle_name,
      cargo_type: vehicle.cargo_type,
      timestamp: new Date().toISOString(),
      severity: 'INFO',
      type: 'BLACKOUT_EXIT',
      title: 'GPS Signal Re-acquired',
      message: `Full satellite constellation fix re-established for ${vehicle.vehicle_name}. Snapping dead-reckoning extrapolation back to verified GPS telemetry.`,
      coords: newCoords,
      acknowledged: false,
    });
  }

  // Dead-Reckoning Distance Accumulator
  let deadReckoningM = vehicle.dead_reckoning_distance_m;
  if (isNowInBlackout) {
    deadReckoningM += distanceCoveredKm * 1000;
  } else {
    deadReckoningM = 0;
  }

  // 6. Check if inside Hazard Zone & Calculate Stationary Timer
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

  // Stationary in Hazard Zone Alert (> 10 seconds at 0 km/h)
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
      message: `CRITICAL STOP: ${vehicle.vehicle_name} is stationary (${Math.round(stationaryTimer)}s) inside ${activeHazardZone?.name} (${activeHazardZone?.hazardType}). High risk of debris collapse or falling rock strike!`,
      coords: newCoords,
      acknowledged: false,
      extraDetails: {
        duration_sec: Math.round(stationaryTimer),
        zone_name: activeHazardZone?.name,
      },
    });
  }

  // 7. Route Deviation Alert (> 500 meters)
  if (isOffRoute && !vehicle.is_deviated_manual && minDistanceM > 500) {
    // Only fire if not already acknowledged or fired recently
  }
  if (vehicle.is_deviated_manual && vehicle.status !== 'DEVIATED') {
    newAlerts.push({
      id: `alert-dev-${vehicle.vehicle_id}-${Date.now()}`,
      vehicle_id: vehicle.vehicle_id,
      vehicle_name: vehicle.vehicle_name,
      cargo_type: vehicle.cargo_type,
      timestamp: new Date().toISOString(),
      severity: 'CRITICAL',
      type: 'ROUTE_DEVIATION',
      title: 'Vehicle Deviated From Safe Corridor',
      message: `UNAPPROVED ROUTE: ${vehicle.vehicle_name} has strayed ${Math.round(minDistanceM)}m off the designated mountain corridor onto an unverified bypass.`,
      coords: newCoords,
      acknowledged: false,
      extraDetails: { distance_m: Math.round(minDistanceM) },
    });
  }

  // 8. Determine Overall Status
  let status: VehicleStatus = 'ON_ROUTE';
  if (vehicle.is_sos_manual) {
    status = 'SOS_ALERT';
  } else if (isStationaryHazard) {
    status = 'CRITICAL_STATIONARY';
  } else if (vehicle.is_deviated_manual || isOffRoute) {
    status = 'DEVIATED';
  } else if (isNowInBlackout) {
    status = 'DEAD_ZONE_EXTRAPOLATING';
  }

  // 9. Update Telemetry Signal & Battery
  const satelliteCount = isNowInBlackout ? 0 : 12 + Math.floor(Math.random() * 3);
  const signalDbm = isNowInBlackout ? -120 : -65 - Math.floor(Math.random() * 12);
  const batteryPct = Math.max(10, +(vehicle.battery_pct - 0.001 * deltaSeconds).toFixed(2));

  // 10. Update Breadcrumb Trail (Sample every ~200 meters or when status changes)
  const lastBreadcrumb = vehicle.breadcrumbs[vehicle.breadcrumbs.length - 1];
  const distSinceLastBreadcrumbM = lastBreadcrumb
    ? haversineDistanceKm(lastBreadcrumb.coords, newCoords) * 1000
    : 1000;

  let newBreadcrumbs = [...vehicle.breadcrumbs];
  if (distSinceLastBreadcrumbM > 2500) {
    // Re-seed breadcrumbs on manual scrubber jumps or wrap-arounds to prevent straight jump chords
    newBreadcrumbs = [
      {
        coords: newCoords,
        status,
        timestamp: new Date().toISOString(),
        speed_kmh: currentSpeed,
      },
    ];
  } else if (
    distSinceLastBreadcrumbM >= 180 ||
    lastBreadcrumb.status !== status ||
    vehicle.breadcrumbs.length === 1
  ) {
    newBreadcrumbs.push({
      coords: newCoords,
      status,
      timestamp: new Date().toISOString(),
      speed_kmh: currentSpeed,
    });
    // Keep max 150 breadcrumb points for memory performance
    if (newBreadcrumbs.length > 150) {
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
  };

  return { updatedVehicle, newAlerts };
}
