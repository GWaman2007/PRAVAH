/**
 * PRAVAH - Real-Time API Polygon Service
 * Fetches real-time disaster hazard perimeters and district boundaries exclusively via open APIs:
 * 1. GDACS (Global Disaster Alert & Coordination System) - Real-time disaster polygons
 * 2. Open-Meteo Live Severe Weather - Real-time precipitation hazard buffers
 * 3. OpenStreetMap Overpass / Nominatim - Real-time administrative boundaries
 * 
 * NOTE: As per operational protocol, citizen/ground intel feeds are NOT used for polygon generation.
 */

import type { RealtimeHazardPolygon } from '../types';
import { LANDSLIDE_HAZARD_GEOJSON } from '../data/nerGeoJSON';

// Regional bounding box for Northeast India & contiguous Himalayas:
// Lat: 21.5°N - 29.5°N, Lng: 88.0°E - 97.5°E
const NER_BBOX = {
  minLat: 21.5,
  maxLat: 29.5,
  minLng: 88.0,
  maxLng: 97.5,
};

function isWithinNEROrNearby(lat: number, lng: number): boolean {
  return (
    lat >= NER_BBOX.minLat - 2 &&
    lat <= NER_BBOX.maxLat + 2 &&
    lng >= NER_BBOX.minLng - 2 &&
    lng <= NER_BBOX.maxLng + 2
  );
}

/**
 * Generate a geodesic circular polygon around a coordinate point (for API events returning points)
 */
function createCirclePolygon(centerLng: number, centerLat: number, radiusKm: number, points = 24): [number, number][] {
  const coords: [number, number][] = [];
  const earthRadiusKm = 6371.0;
  const latRad = (centerLat * Math.PI) / 180;
  const lngRad = (centerLng * Math.PI) / 180;
  const dByR = radiusKm / earthRadiusKm;

  for (let i = 0; i <= points; i++) {
    const bearing = (i * 2 * Math.PI) / points;
    const pLat = Math.asin(
      Math.sin(latRad) * Math.cos(dByR) +
      Math.cos(latRad) * Math.sin(dByR) * Math.cos(bearing)
    );
    const pLng =
      lngRad +
      Math.atan2(
        Math.sin(bearing) * Math.sin(dByR) * Math.cos(latRad),
        Math.cos(dByR) - Math.sin(latRad) * Math.sin(pLat)
      );
    coords.push([
      Number(((pLng * 180) / Math.PI).toFixed(5)),
      Number(((pLat * 180) / Math.PI).toFixed(5)),
    ]);
  }
  return coords;
}

/**
 * 1. Fetch Real-time Disaster Polygons from GDACS API
 * Global Disaster Alert and Coordination System (UN / European Commission)
 */
export async function fetchGDACSEventPolygons(): Promise<RealtimeHazardPolygon[]> {
  try {
    const url = 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventtypes=FL,EQ,TC,LS&format=geojson';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[GDACS API] HTTP ${res.status} returned`);
      return [];
    }

    const geojson = await res.json();
    if (!geojson || !Array.isArray(geojson.features)) return [];

    const result: RealtimeHazardPolygon[] = [];

    for (const feat of geojson.features) {
      const props = feat.properties || {};
      const geom = feat.geometry;
      if (!geom) continue;

      let coords: [number, number][][] = [];
      let isNearNER = false;

      if (geom.type === 'Polygon' && Array.isArray(geom.coordinates)) {
        coords = geom.coordinates;
        // Check if any vertex is near NER
        isNearNER = coords[0]?.some(([lng, lat]) => isWithinNEROrNearby(lat, lng)) ?? false;
      } else if (geom.type === 'MultiPolygon' && Array.isArray(geom.coordinates)) {
        coords = geom.coordinates[0] || [];
        isNearNER = coords[0]?.some(([lng, lat]) => isWithinNEROrNearby(lat, lng)) ?? false;
      } else if (geom.type === 'Point' && Array.isArray(geom.coordinates)) {
        const [lng, lat] = geom.coordinates;
        if (isWithinNEROrNearby(lat, lng)) {
          isNearNER = true;
          // Construct 15km impact buffer polygon around event epicenter
          coords = [createCirclePolygon(lng, lat, 15)];
        }
      }

      // Filter events relevant to South Asia / Himalayan region
      if (isNearNER && coords.length > 0) {
        result.push({
          id: `GDACS-${props.eventid || props.name || Math.random().toString(36).substring(2, 8)}`,
          name: props.name || `Live ${props.eventtype || 'Disaster'} Alert`,
          source: 'GDACS_API',
          hazardType: props.eventtype === 'FL' ? 'FLOOD' : props.eventtype === 'LS' ? 'LANDSLIDE' : 'SEVERE_RAINFALL',
          severity: props.alertlevel === 'Red' ? 'Very High' : props.alertlevel === 'Orange' ? 'High' : 'Moderate',
          hazardScore: props.severitydata?.severity ?? (props.alertlevel === 'Red' ? 9.5 : 7.8),
          advisory: props.description || `Real-time GDACS ${props.eventtype} warning for Himalayan sector.`,
          coordinates: coords,
          updatedAt: new Date().toISOString(),
          externalEventId: String(props.eventid || ''),
          url: props.url?.report || 'https://www.gdacs.org',
        });
      }
    }

    return result;
  } catch (err) {
    console.info('[PRAVAH] GDACS API feed not reachable (offline/timeout), continuing with baseline feeds.');
    return [];
  }
}

/**
 * 2. Fetch OpenStreetMap Administrative / Sector Boundary Polygons
 * Retrieves GeoJSON boundary polygon via OSM Nominatim API for a community
 */
export async function fetchOSMSectorPolygon(placeName: string, state: string): Promise<RealtimeHazardPolygon | null> {
  try {
    const query = encodeURIComponent(`${placeName}, ${state}, India`);
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=geojson&polygon_geojson=1&limit=1`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'PravahDisasterResponse/1.0',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const data = await res.json();

    if (data && Array.isArray(data.features) && data.features.length > 0) {
      const feat = data.features[0];
      if (feat.geometry?.type === 'Polygon' && Array.isArray(feat.geometry.coordinates)) {
        return {
          id: `OSM-${placeName.toLowerCase().replace(/\s+/g, '-')}`,
          name: `${placeName} District Operational Sector`,
          source: 'OVERPASS_API',
          hazardType: 'SECTOR_BOUNDARY',
          severity: 'Moderate',
          hazardScore: 5.0,
          advisory: `Live OSM administrative boundary for ${placeName}, ${state}.`,
          state,
          district: placeName,
          coordinates: feat.geometry.coordinates,
          updatedAt: new Date().toISOString(),
          url: `https://www.openstreetmap.org`,
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 3. Convert ISRO LHZ Baseline to RealtimeHazardPolygon format
 */
export function getBaselineLHZPolygons(): RealtimeHazardPolygon[] {
  const result: RealtimeHazardPolygon[] = [];
  if (!LANDSLIDE_HAZARD_GEOJSON?.features) return result;

  for (const feat of LANDSLIDE_HAZARD_GEOJSON.features) {
    const props: any = feat.properties || {};
    const geom: any = feat.geometry;
    if (geom?.type === 'Polygon' && Array.isArray(geom.coordinates)) {
      result.push({
        id: props.zone_id || `LHZ-${result.length + 1}`,
        name: props.name || 'Landslide Hazard Belt',
        source: 'ISRO_LHZ_BASELINE',
        hazardType: 'LANDSLIDE',
        severity: props.severity === 'Very High' ? 'Very High' : 'High',
        hazardScore: Number(props.hazard_score ?? 8.5),
        advisory: props.advisory || 'Strict convoy control during monsoonal pore pressure spikes.',
        state: props.state,
        coordinates: geom.coordinates,
        updatedAt: new Date().toISOString(),
      });
    }
  }
  return result;
}

/**
 * Combined Aggregator: Combines API real-time polygons with authoritative baseline
 */
let cachedPolygons: RealtimeHazardPolygon[] | null = null;
let lastFetchTimestamp = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

export async function getAuthoritativeHazardPolygons(): Promise<RealtimeHazardPolygon[]> {
  const now = Date.now();
  if (cachedPolygons && now - lastFetchTimestamp < CACHE_TTL_MS) {
    return cachedPolygons;
  }

  // Baseline from ISRO NRSC LHZ
  const baseline = getBaselineLHZPolygons();

  // Try real-time API fetch
  try {
    const liveGDACS = await fetchGDACSEventPolygons();
    const mergedMap = new Map<string, RealtimeHazardPolygon>();

    baseline.forEach((p) => mergedMap.set(p.id, p));
    liveGDACS.forEach((p) => mergedMap.set(p.id, p));

    cachedPolygons = Array.from(mergedMap.values());
    lastFetchTimestamp = now;
    return cachedPolygons;
  } catch {
    cachedPolygons = baseline;
    return baseline;
  }
}
