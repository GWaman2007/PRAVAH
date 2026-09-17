import type {
  VehicleTelemetry,
  ReliefMission,
  Segment,
  SegmentIncident,
  CommunityWithCalculation,
  RouteDefinition,
  HazardZone,
  Incident,
} from '../types';
import { NER_NODES } from '../data/routingNetwork';
import { LANDSLIDE_HAZARD_GEOJSON } from '../data/nerGeoJSON';
import { DESTINATION_PIN_DATA_URL } from '../assets/destinationPinBase64';
import { FLEET_ROUTES } from '../data/fleetData';
import { haversineDistanceKm } from './gisMath';

/**
 * Transforms [lat, lng] to RFC 7946 GeoJSON [lng, lat]
 */
export function toGeoJSONCoords(coord: [number, number]): [number, number] {
  if (!coord || !Number.isFinite(coord[0]) || !Number.isFinite(coord[1])) {
    return [92.7789, 24.8333];
  }
  return [coord[1], coord[0]];
}

export function toGeoJSONLineString(coords: [number, number][]): [number, number][] {
  if (!coords || !Array.isArray(coords)) return [];
  return coords
    .filter((c) => Array.isArray(c) && Number.isFinite(c[0]) && Number.isFinite(c[1]))
    .map((c) => [c[1], c[0]]);
}

/**
 * Validates and resolves the authoritative road route for a mission.
 * Ensures that:
 * 1. The route starts near the mission origin.
 * 2. The route terminates EXACTLY on the destination endpoint marker.
 * 3. Detects and trims any route overshoots or U-turn loops past the endpoint.
 */
export function validateAndResolveMissionRoute(
  mission: ReliefMission,
  fleetRoutes: Record<string, RouteDefinition>
): [number, number][] | null {
  const fleetRouteCoords = fleetRoutes[mission.assignedRouteId]?.coordinates;
  const missionCoords = mission.routeGeometry;

  // Use authoritative verified route from fleetRoutes
  let rawCoords = fleetRouteCoords && fleetRouteCoords.length >= 2 ? fleetRouteCoords : missionCoords;
  if (!rawCoords || rawCoords.length < 2) return null;

  const dest = mission.destinationEndpoint;
  if (dest && dest.length === 2 && Number.isFinite(dest[0]) && Number.isFinite(dest[1])) {
    // Check if route reaches destinationEndpoint earlier and then loops/overshoots past it
    let firstArrivalIdx = -1;
    for (let i = Math.floor(rawCoords.length * 0.6); i < rawCoords.length; i++) {
      const d = haversineDistanceKm(dest, rawCoords[i]);
      if (d <= 0.15) { // within 150 meters
        firstArrivalIdx = i;
        break;
      }
    }

    if (firstArrivalIdx !== -1 && firstArrivalIdx < rawCoords.length - 1) {
      let maxOvershootKm = 0;
      for (let j = firstArrivalIdx + 1; j < rawCoords.length; j++) {
        const d = haversineDistanceKm(dest, rawCoords[j]);
        if (d > maxOvershootKm) maxOvershootKm = d;
      }
      if (maxOvershootKm > 0.3) {
        rawCoords = rawCoords.slice(0, firstArrivalIdx + 1);
      }
    }

    // Force the final point of rawCoords to match the destination endpoint EXACTLY
    const lastIdx = rawCoords.length - 1;
    rawCoords = [...rawCoords.slice(0, lastIdx), [dest[0], dest[1]]];
  }

  return rawCoords;
}

/**
 * 1. Vehicles GeoJSON Source (Points)
 */
export function createVehiclesGeoJSON(
  vehicles: VehicleTelemetry[],
  selectedVehicleId: string | null
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = vehicles.map((v) => {
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
  fleetRoutes: Record<string, RouteDefinition>,
  selectedMissionId: string | null
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

    // Subdued slate styling for non-selected active routes so they don't blend with or visually extend the selected route
    const color = selectedMissionId ? '#64748B' : '#2563EB';
    const glowColor = selectedMissionId ? '#475569' : '#60A5FA';
    const lineWeight = selectedMissionId ? 1.8 : 3.5;
    const opacity = selectedMissionId ? 0.22 : 0.85;

    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: toGeoJSONLineString(rawCoords),
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
 * 5. Selected Mission Route GeoJSON (Single highlighted route with prominent emphasis)
 */
export function createSelectedMissionRouteGeoJSON(
  selectedMission: ReliefMission | null | undefined,
  fleetRoutes: Record<string, RouteDefinition>
): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  if (!selectedMission) {
    return { type: 'FeatureCollection', features: [] };
  }

  const rawCoords = validateAndResolveMissionRoute(selectedMission, fleetRoutes);

  if (!rawCoords || rawCoords.length < 2) {
    return { type: 'FeatureCollection', features: [] };
  }

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: toGeoJSONLineString(rawCoords),
        },
        properties: {
          mission_id: selectedMission.id,
          community_name: selectedMission.communityName,
          destination_name: selectedMission.destinationName,
          status: selectedMission.status,
          corridor_name: selectedMission.suggestedDetour || selectedMission.destinationName,
          distance_km: selectedMission.routeDistanceKm || 0,
        },
      },
    ],
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
 * 7. Disasters GeoJSON - Removed older bigger generic hazard polygons (community-related polygons are used exclusively)
 */
export function createDisastersGeoJSON(
  _hazardZones?: HazardZone[]
): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  return {
    type: 'FeatureCollection',
    features: [],
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
export function createWarehousesGeoJSON(): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const hubs = Object.values(NER_NODES).filter((n) => n.isHub);

  const features: GeoJSON.Feature<GeoJSON.Point>[] = hubs.map((h) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: toGeoJSONCoords(h.coordinates),
    },
    properties: {
      hub_id: h.id,
      name: h.name,
      state: h.state,
      elevation: h.elevationMeters,
      icon: 'icon-warehouse',
    },
  }));

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
      if (m.assignedRouteId?.includes(seg.highway) || m.suggestedDetour?.includes(seg.highway)) return true;
      if (seg.name.toLowerCase().includes(m.destinationName.toLowerCase())) return true;
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
