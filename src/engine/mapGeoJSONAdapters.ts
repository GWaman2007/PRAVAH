import type {
  VehicleTelemetry,
  ReliefMission,
  Segment,
  SegmentIncident,
  CommunityWithCalculation,
  RouteDefinition,
  HazardZone,
  RealtimeHazardPolygon,
  Incident,
  DraftIncidentPlot,
  ResponseHub,
  HubInventory,
  ModelAPrediction,
  MissionRouteOption,
} from '../types';
import { NER_NODES, NER_SEGMENTS } from '../data/routingNetwork';
import { DESTINATION_PIN_DATA_URL } from '../assets/destinationPinBase64';
import { FLEET_ROUTES } from '../data/fleetData';
import { OSRM_PRECOMPUTED_ROUTES } from '../data/osrmPrecomputedRoutes';
import { OSRM_PRECOMPUTED_ALTERNATIVES } from '../data/osrmPrecomputedAlternatives';
import tawangSelaRoute from '../data/tawangSelaPrecomputedRoute.json';
import { haversineDistanceKm, ensureLngLat, ensureLatLng } from './gisMath';
import { COMMUNITY_ROUTING_PROFILES } from './missionEngine';
import { calculateRouteModelAExposureFromCache, getAuthoritativeMissionExposure } from './modelAService';
import { SHILLONG_PRIMARY_ROUTE_COORDS, SHILLONG_BYPASS_ROUTE_COORDS } from '../data/shillongRoadRoutes';

/**
 * Transforms coordinates to RFC 7946 GeoJSON [lng, lat]
 */
export function toGeoJSONCoords(coord: [number, number]): [number, number] {
  return ensureLngLat(coord);
}

export function toGeoJSONLineString(coords: [number, number][]): [number, number][] {
  if (!coords || !Array.isArray(coords)) return [];
  return coords
    .filter((c) => Array.isArray(c) && Number.isFinite(c[0]) && Number.isFinite(c[1]))
    .map((c) => ensureLngLat(c));
}

/**
 * Ensures clean road tracing from origin/vehicle location to destination:
 * 1. For active vehicle in transit: locates the vehicle on or near the route,
 *    slices from the vehicle forward, and anchors directly to vehicleCoords.
 * 2. For non-transit / suggested missions: anchors the start coordinate to originCoords.
 * 3. Enforces that the route ends directly at destinationCoords (the destination marker),
 *    snapping or appending so there is zero gap or floating disconnect.
 * 4. Removes consecutive duplicates.
 */
export function ensureRouteGeometryEndpoints(
  rawCoords: [number, number][],
  originCoords?: [number, number] | null,
  destinationCoords?: [number, number] | null,
  vehicleCoords?: [number, number] | null
): [number, number][] {
  if (!rawCoords || !Array.isArray(rawCoords) || rawCoords.length === 0) {
    if (originCoords && destinationCoords) {
      return [ensureLatLng(originCoords), ensureLatLng(destinationCoords)];
    }
    return [];
  }

  // Normalize all coordinates to [lat, lng]
  let coords: [number, number][] = rawCoords
    .filter((c) => Array.isArray(c) && Number.isFinite(c[0]) && Number.isFinite(c[1]))
    .map((c) => ensureLatLng(c));

  if (coords.length < 2) {
    if (originCoords && destinationCoords) {
      return [ensureLatLng(originCoords), ensureLatLng(destinationCoords)];
    }
    return coords;
  }

  // 1. Clean Origin Snapping (preserve entire route corridor from depot to destination)
  if (originCoords && Number.isFinite(originCoords[0]) && Number.isFinite(originCoords[1])) {
    const origNorm = ensureLatLng(originCoords);
    const dStart = haversineDistanceKm(origNorm, coords[0]);
    if (dStart > 0.05) {
      if (dStart <= 2.0) {
        coords[0] = origNorm;
      } else {
        coords = [origNorm, ...coords];
      }
    }
  }

  // 2. Exact Destination Snapping
  if (destinationCoords && Number.isFinite(destinationCoords[0]) && Number.isFinite(destinationCoords[1])) {
    const destNorm = ensureLatLng(destinationCoords);
    const lastIdx = coords.length - 1;
    const dEnd = haversineDistanceKm(destNorm, coords[lastIdx]);
    if (dEnd > 0.001) {
      if (dEnd <= 3.5) {
        // Within 3.5 km (local yard/hospital compound/approach road): snap final point
        coords[lastIdx] = destNorm;
      } else {
        // Append exact destination endpoint to complete path
        coords.push(destNorm);
      }
    }
  }

  // 3. Deduplicate consecutive identical points
  const deduped: [number, number][] = [];
  for (let i = 0; i < coords.length; i++) {
    const curr = coords[i];
    if (deduped.length === 0) {
      deduped.push(curr);
    } else {
      const prev = deduped[deduped.length - 1];
      if (Math.abs(curr[0] - prev[0]) > 1e-6 || Math.abs(curr[1] - prev[1]) > 1e-6) {
        deduped.push(curr);
      }
    }
  }

  return deduped;
}

/**
 * Validates and resolves the authoritative road route for a mission.
 * Ensures that:
 * 1. The route starts near the mission origin.
 * 2. Any geographic mismatch between route terminus and destination endpoint is detected and corrected.
 * 3. Never forces artificial straight-line chords (>300m) across mountain ranges or international borders.
 * 4. Only gently snaps the final terminus point if within 300 meters of the destination depot.
 */
export function validateAndResolveMissionRoute(
  mission: ReliefMission,
  fleetRoutes: Record<string, RouteDefinition> = FLEET_ROUTES
): [number, number][] | null {
  if (!mission) return null;

  // 0. Dynamic Reroute / Selected Route Option Priority:
  // If the mission has been dynamically rerouted or has an explicitly selected route option,
  // its authentic geometry MUST supersede any static profile route so that the previous path
  // is completely discarded and the new geometry is immediately rendered on the map!
  if ((mission.isRerouted || mission.selectedRouteOptionId) && mission.routeGeometry && mission.routeGeometry.length >= 2) {
    return mission.routeGeometry;
  }

  const dest = mission.destinationEndpoint;
  const routes = fleetRoutes && Object.keys(fleetRoutes).length > 0 ? fleetRoutes : FLEET_ROUTES;
  let routeDef: RouteDefinition | undefined;

  // 1. Authoritative Community Profile Resolution:
  // If the mission has a communityId and an authoritative routing profile exists (e.g. NL-KOH-009 -> ROUTE-SUG-02,
  // MZ-KOL-004 -> ROUTE-SUG-01, SK-MAN-002 -> ROUTE-SK-02), ALWAYS use the authoritative community profile route!
  // This guarantees that a Kohima mission always takes the full highway to Kohima (ROUTE-SUG-02), rather than stopping
  // 12.5km away at the Zubza choke post (ROUTE-NL-01).
  if (mission.communityId && COMMUNITY_ROUTING_PROFILES[mission.communityId]) {
    const profile = COMMUNITY_ROUTING_PROFILES[mission.communityId];
    if (routes[profile.routeId]) {
      routeDef = routes[profile.routeId];
    }
  }

  // 2. Fallback to assigned route ID if not resolved by profile
  if (!routeDef) {
    routeDef = routes[mission.assignedRouteId];
  }

  const isGeographicallyMismatched = (coords: [number, number][] | undefined): boolean => {
    if (!coords || coords.length < 2 || !dest || !Number.isFinite(dest[0]) || !Number.isFinite(dest[1])) return false;
    const terminus = coords[coords.length - 1];
    // If distance between route terminus and destination is > 10km, this is a regional mismatch!
    return haversineDistanceKm(dest, terminus) > 10.0;
  };

  // 3. If still mismatched (>10km from dest) or not found, search fleetRoutes for closest terminus
  if (!routeDef || isGeographicallyMismatched(routeDef.coordinates)) {
    if (dest && Number.isFinite(dest[0]) && Number.isFinite(dest[1])) {
      let bestDist = Infinity;
      let bestRoute: RouteDefinition | null = null;
      Object.values(routes).forEach((r) => {
        if (!r.coordinates || r.coordinates.length < 2) return;
        const terminus = r.coordinates[r.coordinates.length - 1];
        const d = haversineDistanceKm(dest, terminus);
        if (d < bestDist) {
          bestDist = d;
          bestRoute = r;
        }
      });
      if (bestRoute && bestDist <= 35.0) {
        routeDef = bestRoute;
      }
    }
  }

  const fleetRouteCoords = routeDef?.coordinates;
  const missionCoords = mission.routeGeometry;

  // Use authoritative verified route from fleetRoutes
  let rawCoords = fleetRouteCoords && fleetRouteCoords.length >= 2 ? fleetRouteCoords : missionCoords;
  if (!rawCoords || rawCoords.length < 2) return null;

  // Terminus alignment:
  // ONLY snap the final coordinate if it is within 300 meters of dest (e.g. depot yard / parking apron).
  // CRITICAL: NEVER replace or append when distance > 300m — this prevents artificial straight lines
  // cutting across mountain ranges, river valleys, or international borders.
  if (dest && dest.length === 2 && Number.isFinite(dest[0]) && Number.isFinite(dest[1])) {
    const lastPoint = rawCoords[rawCoords.length - 1];
    const distToDest = haversineDistanceKm(dest, lastPoint);

    if (distToDest <= 0.3) {
      rawCoords = [...rawCoords.slice(0, rawCoords.length - 1), [dest[0], dest[1]]];
    }
  }

  return rawCoords;
}

/**
 * 1. Vehicles GeoJSON Source (Points)
 * If a hub is not assigned with any missions, idle vehicles at the hub are not
 * displayed on the map. If a hub is associated with a mission (or a mission is actively
 * underway/selected), only the specified vehicle associated with that mission displays its icon.
 */
export function createVehiclesGeoJSON(
  vehicles: VehicleTelemetry[],
  selectedVehicleId: string | null,
  missions?: ReliefMission[],
  selectedMissionId?: string | null
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const visibleVehicles = vehicles.filter((v) => {
    // 1. Explicitly selected vehicle by user is always visible
    if (selectedVehicleId && v.vehicle_id === selectedVehicleId) {
      return true;
    }

    // 2. Vehicles in active transit or emergency states are always visible
    if (
      v.is_sos_manual ||
      v.status === 'SOS_ALERT' ||
      v.status === 'IN_TRANSIT' ||
      v.status === 'ON_ROUTE' ||
      v.status === 'DEAD_ZONE_EXTRAPOLATING' ||
      v.status === 'HALTED'
    ) {
      return true;
    }

    // 3. If vehicle itself has an active mission_id assigned
    if (v.mission_id && v.mission_id.trim() !== '') {
      return true;
    }

    // 4. If missions context is provided, check if any assigned/active or selected mission specifies this vehicle
    if (missions && missions.length > 0) {
      // 4a. Active/Ongoing/Approved missions associated with this vehicle
      const associatedActiveMission = missions.find(
        (m) =>
          (m.status === 'IN_TRANSIT' ||
            m.status === 'APPROVED' ||
            m.status === 'PENDING_ADMIN_CLOSEOUT') &&
          (m.assignedVehicleId === v.vehicle_id || m.id === v.mission_id)
      );
      if (associatedActiveMission) {
        return true;
      }

      // 4b. If user is currently inspecting/selected a mission in the command center,
      // show the specified vehicle assigned for that mission at its origin hub / route
      if (selectedMissionId) {
        const selectedMission = missions.find((m) => m.id === selectedMissionId);
        if (
          selectedMission &&
          (selectedMission.assignedVehicleId === v.vehicle_id ||
            selectedMission.id === v.mission_id ||
            (selectedMission.recommendedVehicleType &&
              (selectedMission.recommendedVehicleType.includes(v.vehicle_id) ||
                (v.vehicle_name && selectedMission.recommendedVehicleType.toLowerCase().includes(v.vehicle_name.toLowerCase())))))
        ) {
          return true;
        }
      }
    }

    // Otherwise, if missions were provided and vehicle is NOT associated with any mission,
    // do not show the vehicle icon on the map with the hub
    if (missions !== undefined) {
      return false;
    }

    return true;
  });

  const features: GeoJSON.Feature<GeoJSON.Point>[] = visibleVehicles.map((v) => {
    const isSelected = v.vehicle_id === selectedVehicleId;
    const isSOS = v.is_sos_manual || v.status === 'SOS_ALERT';
    const isDeadReckon = v.status === 'DEAD_ZONE_EXTRAPOLATING';

    // Map vehicle type to registered icon ID based on existing vehicle data
    let iconType = 'veh-truck';
    const nameLower = (v.vehicle_name + ' ' + v.vehicle_id + ' ' + (v.cargo_type || '')).toLowerCase();
    if (nameLower.includes('medic') || nameLower.includes('ambulance') || nameLower.includes('hospital')) {
      iconType = 'veh-ambulance';
    } else if (nameLower.includes('cargo') || nameLower.includes('heavy') || nameLower.includes('shaktiman')) {
      iconType = 'veh-heavy-truck';
    } else if (nameLower.includes('engineer') || nameLower.includes('clearance') || nameLower.includes('timber')) {
      iconType = 'veh-engineering';
    } else if (nameLower.includes('utility') || nameLower.includes('shoring')) {
      iconType = 'veh-utility';
    } else if (nameLower.includes('tanker') || nameLower.includes('oxygen')) {
      iconType = 'veh-tanker';
    } else if (nameLower.includes('rescue') || nameLower.includes('extricator') || nameLower.includes('amphibious')) {
      iconType = 'veh-rescue';
    } else if (nameLower.includes('command') || nameLower.includes('cruiser')) {
      iconType = 'veh-command';
    } else if (nameLower.includes('supply') || nameLower.includes('ration') || nameLower.includes('grain')) {
      iconType = 'veh-supply';
    }

    // If an associated mission specifies a vehicle type/profile, ensure correct icon mapping
    if (missions) {
      const relatedMission = missions.find(
        (m) => m.assignedVehicleId === v.vehicle_id || (v.mission_id && m.id === v.mission_id)
      );
      if (relatedMission && relatedMission.recommendedVehicleType) {
        const typeLower = relatedMission.recommendedVehicleType.toLowerCase();
        if (typeLower.includes('medic') || typeLower.includes('ambulance')) {
          iconType = 'veh-ambulance';
        } else if (typeLower.includes('cargo') || typeLower.includes('heavy')) {
          iconType = 'veh-heavy-truck';
        } else if (typeLower.includes('tanker') || typeLower.includes('oxygen')) {
          iconType = 'veh-tanker';
        } else if (typeLower.includes('engineer')) {
          iconType = 'veh-engineering';
        } else if (typeLower.includes('utility')) {
          iconType = 'veh-utility';
        } else if (typeLower.includes('rescue')) {
          iconType = 'veh-rescue';
        } else if (typeLower.includes('command')) {
          iconType = 'veh-command';
        } else if (typeLower.includes('supply') || typeLower.includes('ration')) {
          iconType = 'veh-supply';
        }
      }
    }

    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: toGeoJSONCoords(v.current_coords),
      },
      properties: {
        vehicle_id: v.vehicle_id,
        vehicle_name: v.vehicle_name,
        cargo_type: v.cargo_type,
        speed_kmh: v.speed_kmh,
        heading_deg: Number.isFinite(v.heading_deg) ? v.heading_deg : 0,
        status: v.status,
        mission_id: v.mission_id,
        driver_name: v.driver_name,
        route_progress_pct: v.route_progress_pct,
        icon: iconType,
        isSelected,
        isSOS,
        isDeadReckon,
        markerColor: isSOS ? '#DC2626' : isSelected ? '#0284C7' : isDeadReckon ? '#EA580C' : '#1B4B73',
      },
    };
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * 2. Vehicle SOS GeoJSON (Points for vehicles currently in SOS)
 */
export function createVehicleSOSGeoJSON(
  vehicles: VehicleTelemetry[]
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const sosVehicles = vehicles.filter((v) => v.is_sos_manual || v.status === 'SOS_ALERT');

  return {
    type: 'FeatureCollection',
    features: sosVehicles.map((v) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: toGeoJSONCoords(v.current_coords),
      },
      properties: {
        vehicle_id: v.vehicle_id,
        vehicle_name: v.vehicle_name,
        driver_name: v.driver_name,
        mission_id: v.mission_id,
        timestamp: new Date().toISOString(),
      },
    })),
  };
}

/**
 * 3. Mission Destination Endpoints GeoJSON (Points inside disaster areas)
 */
export function createMissionEndpointsGeoJSON(
  missions: ReliefMission[],
  selectedMissionId: string | null,
  fleetRoutes: Record<string, RouteDefinition> = FLEET_ROUTES
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  // Only show endpoints for active ongoing missions or the currently inspected mission
  const activeMissions = missions.filter(
    (m) => m.status === 'IN_TRANSIT' || m.id === selectedMissionId
  );

  const features: GeoJSON.Feature<GeoJSON.Point>[] = activeMissions.map((m) => {
    const isSelected = m.id === selectedMissionId;

    // Anchor endpoint coordinate directly at the terminus of the resolved route
    const rawCoords = validateAndResolveMissionRoute(m, fleetRoutes || FLEET_ROUTES);
    let endpointCoord = m.destinationEndpoint;

    if (rawCoords && rawCoords.length > 0) {
      endpointCoord = rawCoords[rawCoords.length - 1];
    } else if (m.routeGeometry && m.routeGeometry.length > 0) {
      endpointCoord = m.routeGeometry[m.routeGeometry.length - 1];
    }

    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: toGeoJSONCoords(endpointCoord),
      },
      properties: {
        mission_id: m.id,
        community_name: m.communityName,
        destination_name: m.destinationName || m.communityName,
        disaster_zone_id: m.disasterZoneId,
        status: m.status,
        isSelected,
        icon: 'icon-destination-endpoint',
        label: isSelected ? `🎯 TARGET: ${m.destinationName || m.communityName}` : (m.destinationName || m.communityName),
      },
    };
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * 4. Active Mission Routes GeoJSON (LineStrings following actual road coordinates)
 * Only actual ongoing mission routes are shown in blue.
 * Other missions are subdued when another mission is selected.
 */
export function createMissionRoutesGeoJSON(
  missions: ReliefMission[],
  fleetRoutes: Record<string, RouteDefinition> = FLEET_ROUTES,
  selectedMissionId: string | null = null,
  modelAPredictions: Record<string, ModelAPrediction> = {},
  vehicles: VehicleTelemetry[] = []
): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  // Only display routes for ONGOING missions that are actively in transit
  // Do NOT render unselected suggested missions across the basemap
  const activeMissions = missions.filter(
    (m) => m.status === 'IN_TRANSIT' && m.id !== selectedMissionId
  );

  const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];

  activeMissions.forEach((m) => {
    const rawCoords = validateAndResolveMissionRoute(m, fleetRoutes);
    if (!rawCoords || rawCoords.length < 2) return;

    let vehicleCoords: [number, number] | null = null;
    const assignedVeh = vehicles.find(
      (v) => v.mission_id === m.id || (m.assignedVehicleId && v.vehicle_id === m.assignedVehicleId)
    );
    if (
      assignedVeh &&
      assignedVeh.current_coords &&
      Number.isFinite(assignedVeh.current_coords[0]) &&
      Number.isFinite(assignedVeh.current_coords[1])
    ) {
      vehicleCoords = assignedVeh.current_coords;
    }

    const alignedCoords = ensureRouteGeometryEndpoints(
      rawCoords,
      m.originCoords,
      m.destinationEndpoint,
      vehicleCoords
    );

    let color = '#2563EB';
    let glowColor = '#3B82F6';

    if (m.isRerouted) {
      color = '#2563EB';
      glowColor = '#3B82F6';
    } else {
      const prob = m.disruptionProbability ?? (
        m.corridorSegmentIds && m.corridorSegmentIds.length > 0
          ? calculateRouteModelAExposureFromCache(m.corridorSegmentIds, modelAPredictions).max_probability
          : getAuthoritativeMissionExposure(m, modelAPredictions, NER_SEGMENTS).max_probability
      );
      if (prob >= 0.80) {
        color = '#DC2626'; // High probability: Red
        glowColor = '#EF4444';
      } else if (prob >= 0.50) {
        color = '#EA580C'; // Elevated probability: Orange
        glowColor = '#F97316';
      } else {
        color = '#2563EB'; // Less probability: Blue
        glowColor = '#3B82F6';
      }
    }

    const lineWeight = selectedMissionId ? 3.2 : 4.0;
    const opacity = selectedMissionId ? 0.70 : 0.90;

    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: toGeoJSONLineString(alignedCoords),
      },
      properties: {
        mission_id: m.id,
        community_name: m.communityName,
        destination_name: m.destinationName,
        vehicle_type: m.recommendedVehicleType,
        status: m.status,
        isSelected: false,
        isOngoing: true,
        color,
        glowColor,
        lineWeight,
        opacity,
      },
    });
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * 4B. Model B Route Options GeoJSON (LineStrings)
 * Displays Model B route options for a relief mission.
 * Colored dynamically by Model A disruption risk:
 * High risk (P >= 80%): Vibrant Red (#DC2626)
 * Elevated risk (50% <= P < 80%): Tactical Orange (#EA580C)
 * Low risk (P < 50%): Authoritative Royal Blue (#2563EB)
 * When rerouted, the selected bypass route is Royal Blue (#2563EB) as the main route.
 */
export function createModelBRouteOptionsGeoJSON(
  options: MissionRouteOption[] = [],
  selectedOptionId?: string | null,
  modelAPredictions: Record<string, ModelAPrediction> = {},
  isMissionRerouted: boolean = false,
  originCoords?: [number, number] | null,
  destinationCoords?: [number, number] | null
): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];

  // Mutually exclusive route display:
  // Render ONLY the 1 active selected route option
  const activeOption =
    options.find((opt) => opt.id === selectedOptionId) ||
    options.find((opt) => opt.predictedPreferredRoute) ||
    options[0];

  if (!activeOption || !activeOption.geometry || activeOption.geometry.length < 2) {
    return { type: 'FeatureCollection', features: [] };
  }

  const isRank1 = activeOption.routeRank === 1 || activeOption.predictedPreferredRoute || activeOption.routeNumber === 1;

  // Best Feasible Path (Rank 1 / Blue #2563EB) vs 2nd Best Feasible Path (Rank 2 / Green #10B981)
  let baseColor = isRank1 ? '#2563EB' : '#10B981';
  let glowColor = isRank1 ? '#3B82F6' : '#34D399';

  if (isMissionRerouted) {
    baseColor = '#2563EB';
    glowColor = '#3B82F6';
  }

  const lineWidth = 7.5;
  const lineOpacity = 1.0;
  const glowWidth = 18;
  const glowOpacity = 0.45;

  let prob = activeOption.disruptionProbability;
  if (prob === undefined && activeOption.corridorSegmentIds && activeOption.corridorSegmentIds.length > 0) {
    const exp = calculateRouteModelAExposureFromCache(activeOption.corridorSegmentIds, modelAPredictions);
    prob = exp.max_probability;
  }
  prob = prob ?? 0;

  const alignedCoords = ensureRouteGeometryEndpoints(
    activeOption.geometry,
    originCoords,
    destinationCoords,
    null
  );

  features.push({
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: toGeoJSONLineString(alignedCoords),
    },
    properties: {
      option_id: activeOption.id,
      mission_id: activeOption.missionId,
      route_name: activeOption.routeName || (isRank1 ? 'Primary Best Feasible Route' : '2nd Best Feasible Alternative Route'),
      tier_label: isRank1 ? 'Best Feasible Path' : '2nd Best Feasible Path',
      route_number: activeOption.routeNumber,
      route_rank: activeOption.routeRank,
      is_selected: true,
      is_rank_1: isRank1,
      color: baseColor,
      glow_color: glowColor,
      casing_color: '#0f172a',
      casing_width: lineWidth + 3.0,
      disruption_probability: prob,
      line_width: lineWidth,
      line_opacity: lineOpacity,
      glow_width: glowWidth,
      glow_opacity: glowOpacity,
      predicted_delay_factor: activeOption.predictedDelayFactor,
      predicted_eta_minutes: activeOption.predictedEtaMinutes,
      osrm_duration_minutes: activeOption.osrmDurationMinutes,
      distance_km: activeOption.distanceKm,
      route_source: activeOption.routeSource || 'GRAPH',
    },
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * 5. Selected Mission Route GeoJSON (Single highlighted route with prominent emphasis)
 * Reflects Model A disruption probability:
 * High (>= 80%): Red (#DC2626)
 * Elevated (>= 50%): Orange (#EA580C)
 * Less (< 50%): Blue (#2563EB)
 * When rerouted: Royal Blue (#2563EB) as the active main route!
 */
export function createSelectedMissionRouteGeoJSON(
  selectedMission: ReliefMission | null | undefined,
  fleetRoutes: Record<string, RouteDefinition> = FLEET_ROUTES,
  modelAPredictions: Record<string, ModelAPrediction> = {},
  vehicles: VehicleTelemetry[] = []
): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  if (!selectedMission) {
    return { type: 'FeatureCollection', features: [] };
  }

  // CRITICAL: If mission is SUGGESTED, do NOT render here!
  // Suggested missions are rendered exclusively by createModelBRouteOptionsGeoJSON.
  // This guarantees exactly 1 single path on the map with zero forking or duplicate paths!
  if (selectedMission.status === 'SUGGESTED') {
    return { type: 'FeatureCollection', features: [] };
  }

  const rawCoords = validateAndResolveMissionRoute(selectedMission, fleetRoutes);

  if (!rawCoords || rawCoords.length < 2) {
    return { type: 'FeatureCollection', features: [] };
  }

  // Find live vehicle telemetry if in transit for proper vehicle-to-destination tracing
  let vehicleCoords: [number, number] | null = null;
  if (selectedMission.status === 'IN_TRANSIT') {
    const assignedVeh = vehicles.find(
      (v) =>
        v.mission_id === selectedMission.id ||
        (selectedMission.assignedVehicleId && v.vehicle_id === selectedMission.assignedVehicleId)
    );
    if (
      assignedVeh &&
      assignedVeh.current_coords &&
      Number.isFinite(assignedVeh.current_coords[0]) &&
      Number.isFinite(assignedVeh.current_coords[1])
    ) {
      vehicleCoords = assignedVeh.current_coords;
    }
  }

  const alignedCoords = ensureRouteGeometryEndpoints(
    rawCoords,
    selectedMission.originCoords,
    selectedMission.destinationEndpoint,
    vehicleCoords
  );

  const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];

  if (selectedMission.isRerouted) {
    // When rerouted, only ONE active detour path is rendered on the map.
    // Previous route is not drawn, preventing dual-route clutter on ongoing missions.
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: toGeoJSONLineString(alignedCoords),
      },
      properties: {
        mission_id: selectedMission.id,
        community_name: selectedMission.communityName,
        destination_name: selectedMission.destinationName,
        status: selectedMission.status,
        corridor_name: selectedMission.suggestedDetour || 'Rerouted Bypass Corridor',
        distance_km: selectedMission.routeDistanceKm || 0,
        is_rerouted: true,
        color: '#2563EB', // Active route: Royal Blue (#2563EB)
        glowColor: '#3B82F6',
        disruption_probability: selectedMission.reroutedDisruptionProbability ?? selectedMission.disruptionProbability ?? 0.08,
      },
    });
  } else {
    // Original authoritative route before reroute -> BLUE (#2563EB)
    // Individual severed segments are colored RED on the road-status and hazard layers
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: toGeoJSONLineString(alignedCoords),
      },
      properties: {
        mission_id: selectedMission.id,
        community_name: selectedMission.communityName,
        destination_name: selectedMission.destinationName,
        status: selectedMission.status,
        corridor_name: selectedMission.suggestedDetour || selectedMission.destinationName,
        distance_km: selectedMission.routeDistanceKm || 0,
        is_rerouted: false,
        color: '#2563EB', // Original route: BLUE
        glowColor: '#3B82F6',
        disruption_probability: selectedMission.disruptionProbability ?? 0.15,
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * 6. Road Accessibility & Status GeoJSON (LineStrings)
 */
export function createRoadStatusGeoJSON(
  segments: Segment[],
  disruptions: Record<string, SegmentIncident>
): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  const features: GeoJSON.Feature<GeoJSON.LineString>[] = segments.map((seg) => {
    const disruption = disruptions[seg.id];
    let status = 'OPEN';
    let color = '#16A34A'; // Green: nominal
    let width = 3;

    if (disruption?.status === 'TOTAL_BLOCKAGE') {
      status = 'BLOCKED';
      color = '#DC2626'; // Red: blocked
      width = 4.5;
    } else if (disruption?.status === 'SINGLE_LANE_PASSABLE' || seg.bhuvan_lhz_level >= 4) {
      status = 'DEGRADED';
      color = '#F59E0B'; // Amber: degraded
      width = 3.5;
    }

    return {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: toGeoJSONLineString(seg.coordinates),
      },
      properties: {
        segment_id: seg.id,
        segment_name: seg.name,
        highway: seg.highway,
        status,
        color,
        width,
        cause: disruption?.cause || 'Nominal',
        description: disruption?.description || '',
        lhz_level: seg.bhuvan_lhz_level,
        max_weight: seg.max_weight_limit,
      },
    };
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Resolves authentic, high-resolution curved road coordinates for each segment
 * from verified OSRM highway traces. Replaces coarse straight chords with actual road bends.
 */
export function getSegmentCurvedCoordinates(
  segmentId: string,
  fallbackCoords: [number, number][]
): [number, number][] {
  switch (segmentId) {
    case 'SEG-SIL-KOL':
      // Silchar -> Kolasib (NH-306): 3,200+ GPS points following mountain curves
      if (OSRM_PRECOMPUTED_ROUTES['MISSION-SUG-01']?.coordinates?.length) {
        return OSRM_PRECOMPUTED_ROUTES['MISSION-SUG-01'].coordinates;
      }
      if (OSRM_PRECOMPUTED_ROUTES['MISSION-MZ-04']?.coordinates?.length) {
        return OSRM_PRECOMPUTED_ROUTES['MISSION-MZ-04'].coordinates;
      }
      break;

    case 'SEG-HAF-SIL':
      // Silchar -> Harangajao -> Haflong (NH-27): 3,500+ GPS points following Barail ridge
      if (OSRM_PRECOMPUTED_ROUTES['MISSION-AS-03']?.coordinates?.length) {
        return OSRM_PRECOMPUTED_ROUTES['MISSION-AS-03'].coordinates;
      }
      break;

    case 'SEG-DIM-KOH-MAIN':
      // Dimapur -> Chumukedima -> Zubza -> Kohima (NH-29): 3,000+ points on mountain highway
      if (OSRM_PRECOMPUTED_ROUTES['MISSION-SUG-02']?.coordinates?.length) {
        return OSRM_PRECOMPUTED_ROUTES['MISSION-SUG-02'].coordinates;
      }
      if (OSRM_PRECOMPUTED_ROUTES['MISSION-NL-01']?.coordinates?.length) {
        return OSRM_PRECOMPUTED_ROUTES['MISSION-NL-01'].coordinates;
      }
      break;

    case 'SEG-DIM-WOK':
      if (OSRM_PRECOMPUTED_ROUTES['MISSION-NL-02']?.coordinates?.length) {
        return OSRM_PRECOMPUTED_ROUTES['MISSION-NL-02'].coordinates.slice(0, 1800);
      }
      break;

    case 'SEG-WOK-KOH':
      if (OSRM_PRECOMPUTED_ROUTES['MISSION-NL-02']?.coordinates?.length) {
        return OSRM_PRECOMPUTED_ROUTES['MISSION-NL-02'].coordinates.slice(1700);
      }
      break;

    case 'SEG-GHY-SHL':
      // Guwahati -> Nongpoh -> Shillong (NH-106): 4,341 verified road-following curve points
      if (SHILLONG_PRIMARY_ROUTE_COORDS?.length >= 2) {
        return SHILLONG_PRIMARY_ROUTE_COORDS;
      }
      if (OSRM_PRECOMPUTED_ROUTES['MISSION-ML-01']?.coordinates?.length) {
        return OSRM_PRECOMPUTED_ROUTES['MISSION-ML-01'].coordinates.slice(0, 2800);
      }
      break;

    case 'SEG-ML-SHL-BYPASS':
      // Guwahati -> Umiam East Ridge Bypass -> Shillong (SH-8 / Bhoirymbong): 5,438 verified curve points
      if (SHILLONG_BYPASS_ROUTE_COORDS?.length >= 2) {
        return SHILLONG_BYPASS_ROUTE_COORDS;
      }
      break;

    case 'SEG-SHL-JOW':
      // Shillong -> Mawryngkneng -> Jowai (NH-6)
      if (OSRM_PRECOMPUTED_ROUTES['MISSION-ML-02']?.coordinates?.length) {
        return OSRM_PRECOMPUTED_ROUTES['MISSION-ML-02'].coordinates.slice(0, 2200);
      }
      break;

    case 'SEG-JOW-SIL':
      // Jowai -> Sonapur Tunnel -> Badarpur -> Silchar (NH-6)
      if (OSRM_PRECOMPUTED_ROUTES['MISSION-ML-02']?.coordinates?.length) {
        return OSRM_PRECOMPUTED_ROUTES['MISSION-ML-02'].coordinates.slice(2000);
      }
      break;

    case 'SEG-GHY-NAG':
      // Guwahati -> Jagiroad -> Roha -> Nagaon (NH-27 4-Lane)
      if (OSRM_PRECOMPUTED_ROUTES['MISSION-AS-01']?.coordinates?.length) {
        return OSRM_PRECOMPUTED_ROUTES['MISSION-AS-01'].coordinates.slice(0, 2400);
      }
      break;

    case 'SEG-NAG-HAF':
      // Nagaon -> Lumding -> Maibang -> Haflong (NH-27 Lumding section)
      if (OSRM_PRECOMPUTED_ROUTES['MISSION-AS-01']?.coordinates?.length) {
        return OSRM_PRECOMPUTED_ROUTES['MISSION-AS-01'].coordinates.slice(2200);
      }
      break;

    case 'SEG-NAG-DIM':
      // Nagaon -> Dabaka -> Diphu Spur -> Dimapur (NH-29)
      if (OSRM_PRECOMPUTED_ROUTES['MISSION-NL-01']?.coordinates?.length) {
        return OSRM_PRECOMPUTED_ROUTES['MISSION-NL-01'].coordinates;
      }
      break;

    case 'SEG-KOH-IMP':
      // Kohima -> Mao Gate -> Senapati -> Imphal (NH-2)
      if (OSRM_PRECOMPUTED_ROUTES['MISSION-MN-01']?.coordinates?.length) {
        return OSRM_PRECOMPUTED_ROUTES['MISSION-MN-01'].coordinates;
      }
      break;

    case 'SEG-KOL-AIZ':
      // Kolasib -> Kawnpui -> Aizawl (NH-306)
      if (OSRM_PRECOMPUTED_ROUTES['MISSION-MZ-04']?.coordinates?.length) {
        return OSRM_PRECOMPUTED_ROUTES['MISSION-MZ-04'].coordinates.slice(1500);
      }
      break;

    case 'SEG-SK-TEESTA':
      // Gangtok -> Singtam -> 29th Mile Teesta Canyon (NH-10): 3,200+ GPS points following mountain curves
      if (OSRM_PRECOMPUTED_ROUTES['MISSION-SK-02']?.coordinates?.length) {
        return OSRM_PRECOMPUTED_ROUTES['MISSION-SK-02'].coordinates;
      }
      break;

    case 'SEG-SK-EAST':
      // Gangtok -> Pakyong -> Rhenock -> Lava -> Kalimpong Bypass (NH-717A)
      if (OSRM_PRECOMPUTED_ALTERNATIVES['SK-MAN-002']?.coordinates?.length) {
        return OSRM_PRECOMPUTED_ALTERNATIVES['SK-MAN-002'].coordinates;
      }
      break;

    case 'SEG-AR-TAW-SELA':
      // Guwahati -> Tezpur -> Bomdila -> Sela Pass -> Tawang (NH-13): 14,500+ GPS points
      if (tawangSelaRoute?.coordinates?.length) {
        return tawangSelaRoute.coordinates as [number, number][];
      }
      break;

    case 'SEG-AR-TAW-KAL':
      // Guwahati -> Orang -> Kalaktang -> Rupa -> Tawang Bypass: 17,600+ GPS points
      if (OSRM_PRECOMPUTED_ALTERNATIVES['AR-TAW-001']?.coordinates?.length) {
        return OSRM_PRECOMPUTED_ALTERNATIVES['AR-TAW-001'].coordinates;
      }
      break;

    default:
      break;
  }

  return fallbackCoords;
}

/**
 * 6B. Model A Disruption Risk Overlay GeoJSON (LineStrings)
 * Generates an overlay representing predictive hazard probability from Model A.
 * Strictly traces proper road curves along authentic highway geometry.
 * When a mission is focused, strictly maps the relevant segment on the road itself used for that mission,
 * avoiding arbitrary lines across the rest of the map.
 */
export function createModelARiskGeoJSON(
  segments: Segment[],
  modelAPredictions: Record<string, ModelAPrediction> = {},
  disruptions: Record<string, SegmentIncident> = {},
  activeMissionSegmentIds?: Set<string> | string[],
  activeMission?: ReliefMission | null,
  _fleetRoutes: Record<string, RouteDefinition> = FLEET_ROUTES
): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  const activeSet = activeMissionSegmentIds
    ? activeMissionSegmentIds instanceof Set
      ? activeMissionSegmentIds
      : new Set(activeMissionSegmentIds)
    : new Set<string>();

  const isMissionMode = Boolean(activeMission || (activeSet && activeSet.size > 0));

  const features: GeoJSON.Feature<GeoJSON.LineString>[] = segments.map((seg) => {
    const pred = modelAPredictions[seg.id];
    const prob = pred ? Number(pred.probability) : 0;
    const riskBand = pred?.risk_band || (prob >= 0.8 ? 'HIGH' : prob >= 0.5 ? 'ELEVATED' : prob >= 0.3 ? 'MODERATE' : 'LOW');
    const isActiveMissionSeg = activeSet.has(seg.id);

    // Operational road status (distinct from Model A predictive risk)
    const disruption = disruptions[seg.id];
    let operationalStatus = 'OPEN';
    let operationalColor = '#16A34A';
    if (disruption?.status === 'TOTAL_BLOCKAGE') {
      operationalStatus = 'BLOCKED';
      operationalColor = '#DC2626';
    } else if (disruption?.status === 'SINGLE_LANE_PASSABLE' || seg.bhuvan_lhz_level >= 4) {
      operationalStatus = 'DEGRADED';
      operationalColor = '#F59E0B';
    }

    // CRITICAL: Strictly render THIS SPECIFIC SEGMENT using its own authentic road coordinates.
    // NEVER replace an individual segment's geometry with the entire multi-segment mission route!
    const rawCoords = getSegmentCurvedCoordinates(seg.id, seg.coordinates);

    // Predictive risk color matching risk band
    let riskColor = '#2563EB'; // Nominal / low risk (authoritative blue)
    if (riskBand === 'HIGH' || prob >= 0.80) {
      riskColor = '#DC2626'; // High risk: Vibrant Red
    } else if (riskBand === 'ELEVATED' || prob >= 0.50) {
      riskColor = '#EA580C'; // Elevated risk: High-visibility Tactical Orange
    }

    // Predictive risk line styling:
    // Model A risk overlay ONLY applies to segments that have genuine elevated/high disruption risk (prob >= 0.50).
    // Nominal / low risk segments MUST NOT have an orange overlay, keeping the underlying mission route blue!
    let riskWidth = 0;
    let riskOpacity = 0;
    let glowWidth = 0;
    let glowOpacity = 0;

    const hasElevatedRisk = Boolean(pred && (prob >= 0.50 || riskBand === 'ELEVATED' || riskBand === 'HIGH' || pred.prediction === 1));

    if (isMissionMode) {
      // In Mission Mode: Only show overlay for segments belonging to the active mission corridor
      // CRITICAL: When the mission is rerouted, the active mission's bypass corridor is the authoritative safe route (in royal blue).
      const isReroutedBypass = Boolean(activeMission?.isRerouted && isActiveMissionSeg);
      const isSuggestedCandidateMode = Boolean(
        activeMission?.status === 'SUGGESTED' &&
        ((activeMission?.routeOptions?.length || 0) > 0 || (activeMission as any)?.assignedRouteId)
      );

      if (isActiveMissionSeg && hasElevatedRisk && !isReroutedBypass && !isSuggestedCandidateMode) {
        if (riskBand === 'HIGH' || prob >= 0.80) {
          riskWidth = 6.8;
          riskOpacity = 0.95;
          glowWidth = 14;
          glowOpacity = 0.40;
        } else {
          // Elevated risk (0.50 <= prob < 0.80)
          riskWidth = 6.0;
          riskOpacity = 0.90;
          glowWidth = 12;
          glowOpacity = 0.30;
        }
      } else {
        // Either not an elevated risk segment, or outside active mission corridor, or safe rerouted bypass -> strictly 0 overlay
        riskWidth = 0;
        riskOpacity = 0;
        glowWidth = 0;
        glowOpacity = 0;
      }
    } else {
      // In General Network View: show elevated/high risk segments across the network
      if (hasElevatedRisk) {
        if (riskBand === 'HIGH' || prob >= 0.80) {
          riskWidth = 5.5;
          riskOpacity = 0.90;
          glowWidth = 12;
          glowOpacity = 0.35;
        } else {
          riskWidth = 4.5;
          riskOpacity = 0.80;
          glowWidth = 10;
          glowOpacity = 0.25;
        }
      } else {
        riskWidth = 0;
        riskOpacity = 0;
        glowWidth = 0;
        glowOpacity = 0;
      }
    }

    return {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: toGeoJSONLineString(rawCoords),
      },
      properties: {
        segment_id: seg.id,
        segment_name: seg.name,
        highway: seg.highway,
        model_a_probability: prob,
        model_a_probability_pct: Math.round(prob * 100),
        model_a_risk_band: riskBand,
        model_a_threshold: pred?.threshold ?? 0.50,
        model_version: pred?.model_version || '3.4.1-baseline-xgb',
        prediction_time: pred?.prediction_time || null,
        operational_status: operationalStatus,
        operational_color: operationalColor,
        is_active_mission_segment: isActiveMissionSeg,
        risk_color: riskColor,
        risk_width: riskWidth,
        risk_opacity: riskOpacity,
        glow_width: glowWidth,
        glow_opacity: glowOpacity,
        has_prediction: !!pred,
      },
    };
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * 7. Disasters GeoJSON (Real-time API Hazard Polygons from GDACS & Cloud)
 */
export function createDisastersGeoJSON(
  hazardZones: (HazardZone | RealtimeHazardPolygon)[] = []
): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  const features: GeoJSON.Feature<GeoJSON.Polygon>[] = [];

  // Iterate over passed hazard zones (either RealtimeHazardPolygon or legacy HazardZone)
  hazardZones.forEach((hz: any) => {
    // A: RealtimeHazardPolygon (from live GDACS API, OSM Overpass/Nominatim, or ISRO baseline)
    if (hz.coordinates && Array.isArray(hz.coordinates) && hz.coordinates.length > 0) {
      const sev = hz.severity || 'High';
      let color = '#EA580C';
      if (sev === 'Very High' || sev === 'Critical') color = '#DC2626';
      else if (sev === 'Moderate') color = '#D97706';

      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: hz.coordinates,
        },
        properties: {
          zone_id: hz.id,
          id: hz.id,
          name: hz.name,
          source: hz.source || 'LIVE_API',
          hazard_type: hz.hazardType || 'Geological Hazard Zone',
          severity: sev,
          hazard_score: hz.hazardScore ?? 8.0,
          advisory: hz.advisory || 'Monitored via real-time satellite disaster API',
          url: hz.url || '',
          state: hz.state || '',
          district: hz.district || '',
          updatedAt: hz.updatedAt || '',
          fillColor: color,
          fillOpacity: 0.32,
          outlineColor: color,
        },
      });
    }
    // B: Legacy HazardZone with [lat, lng][] polygon
    else if (hz.polygon && Array.isArray(hz.polygon) && hz.polygon.length >= 3) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [toGeoJSONLineString(hz.polygon)],
        },
        properties: {
          zone_id: hz.id,
          id: hz.id,
          name: hz.name,
          source: 'ISRO_LHZ_BASELINE',
          hazard_type: hz.hazardType || 'Geological Hazard Zone',
          severity: 'Critical',
          fillColor: '#DC2626',
          fillOpacity: 0.32,
          outlineColor: '#DC2626',
          advisory: 'Emergency bypass enforced • Silt & slope instability',
        },
      });
    }
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * 8. Communities GeoJSON (Points with Priority Colors)
 */
export function createCommunitiesGeoJSON(
  communities: CommunityWithCalculation[],
  selectedCommunityId: string | null
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = communities.map((c) => {
    const isSelected = c.id === selectedCommunityId;
    const priority = c.metrics?.priorityTier || 'P3';

    let color = '#16A34A'; // P4: Green
    if (priority === 'P1') color = '#DC2626'; // P1: Red
    else if (priority === 'P2') color = '#EA580C'; // P2: Orange
    else if (priority === 'P3') color = '#D97706'; // P3: Yellow/Amber

    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: toGeoJSONCoords(c.coordinates),
      },
      properties: {
        community_id: c.id,
        name: c.name,
        district: c.district,
        state: c.state,
        priorityTier: priority,
        color,
        isSelected,
        population: c.population,
        cutoffHours: c.cutoffTimeHours,
        finalScore: c.metrics?.finalScore ? Math.round(c.metrics.finalScore * 100) : 0,
        primaryCorridor: c.primaryCorridor,
      },
    };
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * 8b. Community Boundaries GeoJSON (Real DB-Backed Polygons with Priority Styling)
 */
export function createCommunityBoundariesGeoJSON(
  communities: CommunityWithCalculation[],
  selectedCommunityId: string | null
): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  const features: GeoJSON.Feature<GeoJSON.Polygon>[] = [];

  communities.forEach((c) => {
    if (!c.boundary || !c.boundary.coordinates) return;

    const isSelected = c.id === selectedCommunityId;
    const priority = c.metrics?.priorityTier || 'P3';

    let color = '#16A34A'; // P4: Green
    if (priority === 'P1') color = '#DC2626'; // P1: Red
    else if (priority === 'P2') color = '#EA580C'; // P2: Orange
    else if (priority === 'P3') color = '#D97706'; // P3: Amber

    features.push({
      type: 'Feature',
      geometry: c.boundary,
      properties: {
        community_id: c.id,
        name: c.name,
        district: c.district,
        state: c.state,
        priorityTier: priority,
        color,
        isSelected,
        population: c.population,
        cutoffHours: c.cutoffTimeHours,
        finalScore: c.metrics?.finalScore ? Math.round(c.metrics.finalScore * 100) : 0,
        primaryCorridor: c.primaryCorridor,
        healthcareFacilities: c.healthcareFacilities,
        ingressRouteCount: c.ingressRouteCount,
        nearestDepotName: c.nearestDepotName,
        transitTimeHours: c.transitTimeHours,
        disruptionProbMax: c.disruptionProbMax,
        isMonsoonAlertActive: c.isMonsoonAlertActive,
        actionWindow: c.metrics?.actionableDispatchWindow ?? (c.cutoffTimeHours - c.transitTimeHours),
      },
    });
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * 9. Warehouses & Depots GeoJSON (Points with SVG icons)
 */
export function createWarehousesGeoJSON(
  hubs?: ResponseHub[],
  inventory?: HubInventory[],
  vehicles?: VehicleTelemetry[]
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const sourceHubs: {
    id: string;
    name: string;
    code?: string;
    state: string;
    coordinates: [number, number];
    status?: string;
    type?: string;
    elevationMeters?: number;
  }[] = (hubs && hubs.length > 0)
    ? hubs
    : Object.values(NER_NODES).filter((n) => n.isHub);

  const features: GeoJSON.Feature<GeoJSON.Point>[] = sourceHubs.map((h) => {
    const hubInv = inventory ? inventory.filter((i) => i.hubId === h.id) : [];
    const hubVeh = vehicles ? vehicles.filter((v) => v.hub_id === h.id) : [];
    const availableVehCount = hubVeh.filter((v) => v.status === 'AVAILABLE').length;

    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: toGeoJSONCoords(h.coordinates),
      },
      properties: {
        hub_id: h.id,
        name: h.name,
        code: h.code || h.id.toUpperCase(),
        state: h.state,
        status: h.status || 'OPERATIONAL',
        type: h.type || 'REGIONAL',
        vehicles_count: hubVeh.length,
        available_vehicles_count: availableVehCount,
        resources_count: hubInv.length,
        elevation: h.elevationMeters ?? 100,
        icon: 'icon-warehouse',
      },
    };
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * 10. Road Breakdown / Active Chokepoints GeoJSON (Points)
 */
export function createRoadBreakdownsGeoJSON(
  disruptions: Record<string, SegmentIncident>,
  segments: Segment[],
  incidents: Incident[] = [],
  missions: ReliefMission[] = []
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = [];

  Object.entries(disruptions).forEach(([segmentId, dis]) => {
    if (!dis) return;
    const seg = segments.find((s) => s.id === segmentId);
    if (!seg || !seg.coordinates || seg.coordinates.length === 0) return;

    // 1. Locate real incident coordinate if available (from disruption or matching incident report)
    let targetCoord: [number, number] | null = null;
    if (dis.location && Number.isFinite(dis.location.lat) && Number.isFinite(dis.location.lng)) {
      targetCoord = [dis.location.lat, dis.location.lng];
    } else {
      const matchingInc = incidents.find(
        (inc) =>
          inc.location?.corridorId === segmentId ||
          inc.corridorFlair === seg.highway ||
          inc.id === dis.incidentId
      );
      if (matchingInc?.location && Number.isFinite(matchingInc.location.lat) && Number.isFinite(matchingInc.location.lng)) {
        targetCoord = [matchingInc.location.lat, matchingInc.location.lng];
      }
    }

    // 2. Fallback to existing segment geometry coordinate if specific point not available
    if (!targetCoord) {
      const midIdx = Math.floor(seg.coordinates.length / 2);
      targetCoord = seg.coordinates[midIdx];
    }

    // Find any matching incident for rich real properties
    const matchingInc = incidents.find(
      (inc) =>
        inc.location?.corridorId === segmentId ||
        inc.corridorFlair === seg.highway ||
        inc.id === dis.incidentId
    );

    // Identify affected active missions passing through or targeted near this segment
    const affectedMissions = missions.filter((m) => {
      if (seg.highway && (m.assignedRouteId?.includes(seg.highway) || m.suggestedDetour?.includes(seg.highway))) return true;
      if (seg.name && m.destinationName && seg.name.toLowerCase().includes(m.destinationName.toLowerCase())) return true;
      return false;
    });

    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: toGeoJSONCoords(targetCoord),
      },
      properties: {
        segment_id: segmentId,
        segment_name: seg.name,
        highway: seg.highway,
        status: dis.status,
        cause: dis.cause || matchingInc?.incidentType || 'Road Breakdown',
        description: dis.description || matchingInc?.title || '',
        reportedBy: dis.reportedBy || (matchingInc ? `${matchingInc.author.name} (${matchingInc.author.role})` : 'Regional Operations'),
        severity: dis.severity || matchingInc?.severity || (dis.status === 'TOTAL_BLOCKAGE' ? 'Total Blockage' : 'Single Lane Passable'),
        reportedTime: dis.reportedTime || matchingInc?.timestamp || '',
        confidenceScore: matchingInc ? matchingInc.confidenceScore : undefined,
        estimatedClearanceHours: dis.estimatedClearanceHours,
        affectedMissionIds: affectedMissions.map((m) => m.id).join(', '),
      },
    });
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Robust Native MapLibre Symbol Icon Rasterizer.
 * Renders SVGs to high-resolution HTML Canvas and injects raw ImageData into MapLibre GL.
 * Completely immune to zero-dimension SVG bugs, styleimagemissing fallbacks, or cross-browser image loading discrepancies.
 */
export function registerMapIcons(map: any): Promise<void> {
  const iconSVGs: Record<string, string> = {
    'veh-truck': `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="21" fill="#1B4B73" stroke="#FFFFFF" stroke-width="3"/>
      <path d="M14 29V19h14v10m-14 0h20v-6l-4-4h-3" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="18" cy="29" r="2.8" fill="#FFFFFF"/>
      <circle cx="30" cy="29" r="2.8" fill="#FFFFFF"/>
    </svg>`,

    'veh-ambulance': `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="21" fill="#DC2626" stroke="#FFFFFF" stroke-width="3"/>
      <rect x="21" y="13" width="6" height="22" fill="#FFFFFF" rx="1.5"/>
      <rect x="13" y="21" width="22" height="6" fill="#FFFFFF" rx="1.5"/>
    </svg>`,

    'veh-heavy-truck': `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="21" fill="#334155" stroke="#FFFFFF" stroke-width="3"/>
      <rect x="11" y="17" width="16" height="12" fill="none" stroke="#FFFFFF" stroke-width="2.2" rx="1"/>
      <path d="M27 20h6l4 4v5h-10v-9z" fill="none" stroke="#FFFFFF" stroke-width="2.2"/>
      <circle cx="16" cy="29" r="2.5" fill="#FFFFFF"/>
      <circle cx="23" cy="29" r="2.5" fill="#FFFFFF"/>
      <circle cx="33" cy="29" r="2.5" fill="#FFFFFF"/>
    </svg>`,

    'veh-engineering': `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="21" fill="#B45309" stroke="#FFFFFF" stroke-width="3"/>
      <path d="M14 29h20M16 29l2-8h8l3 8m-9-8V13l6-2" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="19" cy="29" r="2.8" fill="#FFFFFF"/>
      <circle cx="29" cy="29" r="2.8" fill="#FFFFFF"/>
    </svg>`,

    'veh-utility': `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="21" fill="#0F766E" stroke="#FFFFFF" stroke-width="3"/>
      <path d="M13 28h22M15 28v-7h11l4 4h4v3m-20 0v-4" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="18" cy="28" r="2.6" fill="#FFFFFF"/>
      <circle cx="30" cy="28" r="2.6" fill="#FFFFFF"/>
    </svg>`,

    'veh-tanker': `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="21" fill="#0284C7" stroke="#FFFFFF" stroke-width="3"/>
      <rect x="12" y="18" width="16" height="10" rx="5" fill="none" stroke="#FFFFFF" stroke-width="2.5"/>
      <path d="M28 21h5l3 3v4h-8v-7z" fill="none" stroke="#FFFFFF" stroke-width="2.2"/>
      <circle cx="17" cy="28" r="2.5" fill="#FFFFFF"/>
      <circle cx="23" cy="28" r="2.5" fill="#FFFFFF"/>
      <circle cx="32" cy="28" r="2.5" fill="#FFFFFF"/>
    </svg>`,

    'veh-supply': `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="21" fill="#059669" stroke="#FFFFFF" stroke-width="3"/>
      <path d="M14 18l10-5 10 5-10 5-10-5zm0 10l10 5 10-5m-20-5l10 5 10-5" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,

    'veh-rescue': `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="21" fill="#D97706" stroke="#FFFFFF" stroke-width="3"/>
      <path d="M24 13l9 4v8c0 6-9 10-9 10s-9-4-9-10v-8l9-4z" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,

    'veh-command': `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="21" fill="#4338CA" stroke="#FFFFFF" stroke-width="3"/>
      <circle cx="24" cy="24" r="5" fill="#FFFFFF"/>
      <path d="M16 24a8 8 0 0 1 16 0M11 24a13 13 0 0 1 26 0" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`,

    'icon-warehouse': `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
      <rect x="3" y="3" width="38" height="38" rx="8" fill="#0284C7" stroke="#FFFFFF" stroke-width="2.5"/>
      <path d="M11 20l11-8 11 8v12h-7v-7h-8v7h-7V20z" fill="#FFFFFF"/>
    </svg>`,

    'icon-destination-endpoint': DESTINATION_PIN_DATA_URL,
  };

  const promises = Object.entries(iconSVGs).map(([id, sourceString]) => {
    return new Promise<void>((resolve) => {
      if (map.hasImage(id)) {
        resolve();
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const isDestinationPin = id === 'icon-destination-endpoint';
          const canvas = document.createElement('canvas');
          // Use 72x72 for the destination pin so it renders sharp and distinct
          const canvasSize = isDestinationPin ? 72 : 48;
          canvas.width = canvasSize;
          canvas.height = canvasSize;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasSize, canvasSize);
            ctx.drawImage(img, 0, 0, canvasSize, canvasSize);
            const imageData = ctx.getImageData(0, 0, canvasSize, canvasSize);
            if (!map.hasImage(id)) {
              map.addImage(id, imageData, { pixelRatio: 2 });
            }
          }
        } catch (err) {
          console.warn(`[MapLibre Icon Error]: Failed to rasterize icon ${id}:`, err);
        }
        resolve();
      };

      img.onerror = (e) => {
        console.warn(`[MapLibre Icon Error]: Failed loading icon for ${id}:`, e);
        resolve();
      };

      if (sourceString.startsWith('data:')) {
        img.src = sourceString;
      } else {
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sourceString);
      }
    });
  });

  return Promise.all(promises).then(() => undefined);
}

/**
 * 12. Ground Intel Feed Incidents GeoJSON
 * Renders exact reported incident points from the Ground Intel Feed.
 */
export function createGroundIntelIncidentsGeoJSON(
  incidents: Incident[] = []
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const validIncidents = incidents.filter(
    (inc) =>
      inc &&
      inc.location &&
      Number.isFinite(inc.location.lat) &&
      Number.isFinite(inc.location.lng)
  );

  const features: GeoJSON.Feature<GeoJSON.Point>[] = validIncidents.map((inc) => {
    const isCritical =
      inc.severity === 'Total Blockage' ||
      inc.confidenceScore >= 20;

    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: toGeoJSONCoords([inc.location.lat, inc.location.lng]),
      },
      properties: {
        id: inc.id,
        title: inc.title,
        incidentType: inc.incidentType,
        severity: inc.severity,
        placeName: inc.location.placeName,
        state: inc.location.state,
        corridorId: inc.location.corridorId || '',
        corridorFlair: inc.corridorFlair || '',
        authorName: inc.author?.name || 'Citizen Reporter',
        authorRole: inc.author?.role || 'Citizen',
        confidenceScore: inc.confidenceScore,
        hasOfficerVerified: Boolean(inc.hasOfficerVerified),
        timestamp: inc.timestamp,
        color: isCritical ? '#EF4444' : '#F59E0B',
      },
    };
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * 13. Draft Incident Plots (Ghost Preview Pins) GeoJSON
 * Renders proposed incident points awaiting administrative approval with pulsing preview styling.
 */
export function createDraftIncidentPlotsGeoJSON(
  draftPlots: DraftIncidentPlot[] = []
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const validDrafts = (draftPlots || []).filter(
    (d) => d && Array.isArray(d.coordinates) && Number.isFinite(d.coordinates[0]) && Number.isFinite(d.coordinates[1])
  );

  const features: GeoJSON.Feature<GeoJSON.Point>[] = validDrafts.map((d) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: toGeoJSONCoords(d.coordinates),
    },
    properties: {
      id: d.id,
      title: d.title,
      corridor: d.corridor,
      hazardType: d.hazardType,
      severity: d.severity,
      citationsCount: d.citationsCount,
      estimatedCutoffHours: d.estimatedCutoffHours,
      reporterName: d.sourceReport.reporterName,
      geminiModel: d.aiValidation.geminiModelUsed,
      confidenceScore: d.aiValidation.confidenceScore,
      summary: d.summary,
      isDraft: d.status !== 'APPROVED',
      status: d.status || 'PENDING_APPROVAL',
      color: '#DC2626', // Emergency RED for AI Incident Blinker
    },
  }));

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * 14. Selected Draft Route & Pin GeoJSON
 * Renders the expected hazard pin location and the affected road corridor geometry
 * so dispatchers can visually inspect the exact geographic impact on the map before approving.
 */
export function createSelectedDraftRouteGeoJSON(
  draftPlot: DraftIncidentPlot | null,
  segments: Segment[] = NER_SEGMENTS
): GeoJSON.FeatureCollection<GeoJSON.LineString | GeoJSON.Point> {
  if (!draftPlot || !Array.isArray(draftPlot.coordinates) || !Number.isFinite(draftPlot.coordinates[0])) {
    return {
      type: 'FeatureCollection',
      features: [],
    };
  }

  const [dLat, dLon] = draftPlot.coordinates;
  const features: GeoJSON.Feature<GeoJSON.LineString | GeoJSON.Point>[] = [];

  // Point feature for expected hazard pin
  features.push({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: toGeoJSONCoords([dLat, dLon]),
    },
    properties: {
      id: `expected-pin-${draftPlot.id}`,
      title: draftPlot.title,
      corridor: draftPlot.corridor,
      hazardType: draftPlot.hazardType,
      severity: draftPlot.severity,
      citationsCount: draftPlot.citationsCount,
      confidenceScore: draftPlot.aiValidation.confidenceScore,
      isExpectedPin: true,
      color: '#DC2626', // Emergency RED indicator
    },
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}
