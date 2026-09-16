import type {
  VehicleTelemetry,
  ReliefMission,
  Segment,
  SegmentIncident,
  CommunityWithCalculation,
  RouteDefinition,
  HazardZone,
} from '../types';
import { NER_NODES } from '../data/routingNetwork';
import { LANDSLIDE_HAZARD_GEOJSON } from '../data/nerGeoJSON';

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
    .filter((c) => c && Number.isFinite(c[0]) && Number.isFinite(c[1]))
    .map((c) => [c[1], c[0]]);
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

    // Map vehicle type to registered icon ID
    let iconType = 'veh-truck';
    const nameLower = (v.vehicle_name + ' ' + v.vehicle_id + ' ' + (v.cargo_type || '')).toLowerCase();
    if (nameLower.includes('medic') || nameLower.includes('ambulance') || nameLower.includes('hospital')) {
      iconType = 'veh-ambulance';
    } else if (nameLower.includes('rescue') || nameLower.includes('extricator') || nameLower.includes('amphibious')) {
      iconType = 'veh-rescue';
    } else if (nameLower.includes('command') || nameLower.includes('cruiser')) {
      iconType = 'veh-command';
    } else if (nameLower.includes('supply') || nameLower.includes('ration') || nameLower.includes('grain') || nameLower.includes('tanker')) {
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
  selectedMissionId: string | null
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  // Only show endpoints for active ongoing missions or the currently inspected mission
  const activeMissions = missions.filter(
    (m) => m.status === 'IN_TRANSIT' || m.id === selectedMissionId
  );

  const features: GeoJSON.Feature<GeoJSON.Point>[] = activeMissions.map((m) => {
    const isSelected = m.id === selectedMissionId;
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: toGeoJSONCoords(m.destinationEndpoint),
      },
      properties: {
        mission_id: m.id,
        community_name: m.communityName,
        destination_name: m.destinationName,
        disaster_zone_id: m.disasterZoneId,
        status: m.status,
        isSelected,
        icon: 'icon-destination-endpoint',
        label: `DEST: ${m.id}`,
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
    const rawCoords =
      m.routeGeometry && m.routeGeometry.length >= 2
        ? m.routeGeometry
        : fleetRoutes[m.assignedRouteId]?.coordinates;
    if (!rawCoords || rawCoords.length < 2) return;

    // Tactical Blue route for active ongoing missions
    const color = '#2563EB';
    const glowColor = '#60A5FA';
    const lineWeight = selectedMissionId ? 2.5 : 3.5;
    const opacity = selectedMissionId ? 0.35 : 0.85;

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

  const rawCoords =
    selectedMission.routeGeometry && selectedMission.routeGeometry.length >= 2
      ? selectedMission.routeGeometry
      : fleetRoutes[selectedMission.assignedRouteId]?.coordinates;

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
 * 7. Disasters GeoJSON (Real Polygons / MultiPolygons from LHZ and Hazard zones)
 */
export function createDisastersGeoJSON(
  hazardZones: HazardZone[]
): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  const features: GeoJSON.Feature<GeoJSON.Polygon>[] = [];

  if (LANDSLIDE_HAZARD_GEOJSON && Array.isArray(LANDSLIDE_HAZARD_GEOJSON.features)) {
    LANDSLIDE_HAZARD_GEOJSON.features.forEach((feat: any) => {
      if (feat.geometry?.type === 'Polygon') {
        const sev = feat.properties?.severity || 'High';
        let color = '#B8860B';
        if (sev === 'Very High' || sev === 'Critical') color = '#DC2626';
        else if (sev === 'High') color = '#EA580C';

        features.push({
          type: 'Feature',
          geometry: feat.geometry,
          properties: {
            ...feat.properties,
            hazard_type: 'Landslide Hazard Zone',
            fillColor: color,
            fillOpacity: 0.28,
            outlineColor: color,
          },
        });
      }
    });
  }

  hazardZones.forEach((hz) => {
    if (hz.polygon && hz.polygon.length >= 3) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [toGeoJSONLineString(hz.polygon)],
        },
        properties: {
          zone_id: hz.id,
          name: hz.name,
          hazard_type: hz.hazardType,
          severity: 'Critical',
          fillColor: '#DC2626',
          fillOpacity: 0.3,
          outlineColor: '#DC2626',
          advisory: 'Emergency recovery & bypass enforced',
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
  segments: Segment[]
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = [];

  Object.entries(disruptions).forEach(([segmentId, dis]) => {
    if (!dis) return;
    const seg = segments.find((s) => s.id === segmentId);
    if (!seg || !seg.coordinates || seg.coordinates.length === 0) return;

    const midIdx = Math.floor(seg.coordinates.length / 2);
    const coord = seg.coordinates[midIdx];

    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: toGeoJSONCoords(coord),
      },
      properties: {
        segment_id: segmentId,
        segment_name: seg.name,
        highway: seg.highway,
        status: dis.status,
        cause: dis.cause || 'Road Breakdown',
        description: dis.description || '',
        reportedBy: dis.reportedBy || 'Regional Ops',
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

    'veh-supply': `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="21" fill="#0D9488" stroke="#FFFFFF" stroke-width="3"/>
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

    'icon-destination-endpoint': `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="21" fill="#DC2626" fill-opacity="0.25" stroke="#DC2626" stroke-width="2.5" stroke-dasharray="4 2"/>
      <circle cx="24" cy="24" r="14" fill="#DC2626" stroke="#FFFFFF" stroke-width="2.5"/>
      <circle cx="24" cy="24" r="5" fill="#FFFFFF"/>
      <path d="M24 4v6M24 38v6M4 24h6M38 24h6" stroke="#DC2626" stroke-width="3" stroke-linecap="round"/>
    </svg>`,
  };

  const promises = Object.entries(iconSVGs).map(([id, svgString]) => {
    return new Promise<void>((resolve) => {
      if (map.hasImage(id)) {
        resolve();
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 48;
          canvas.height = 48;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, 48, 48);
            ctx.drawImage(img, 0, 0, 48, 48);
            const imageData = ctx.getImageData(0, 0, 48, 48);
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
        console.warn(`[MapLibre Icon Error]: Failed loading SVG for ${id}:`, e);
        resolve();
      };

      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
    });
  });

  return Promise.all(promises).then(() => undefined);
}
