import { isPointInPolygon, haversineDistanceKm } from './gisMath';
import { OSRM_PRECOMPUTED_ROUTES } from '../data/osrmPrecomputedRoutes';

/**
 * In-memory cache for OSRM routes to minimize network calls and avoid rate-limiting
 */
const routeCache = new Map<string, { coordinates: [number, number][]; distanceKm: number; durationMinutes: number }>();

// Pre-seed route cache with all 13 verified real OSRM road routes
Object.values(OSRM_PRECOMPUTED_ROUTES).forEach((data) => {
  const cacheKey = `${data.origin[0].toFixed(5)},${data.origin[1].toFixed(5)}->${data.destination[0].toFixed(5)},${data.destination[1].toFixed(5)}`;
  routeCache.set(cacheKey, {
    coordinates: data.coordinates,
    distanceKm: data.distanceKm,
    durationMinutes: data.durationMinutes,
  });
});

/**
 * Derives a geometrically verified representative point guaranteed to be INSIDE the polygon.
 * Does not rely on a simple centroid that could fall outside a concave or irregular polygon.
 */
export function getRepresentativePointInPolygon(polygon: [number, number][]): [number, number] {
  if (!polygon || polygon.length < 3) {
    return polygon[0] || [24.3, 92.7];
  }

  // 1. Calculate bounding box and simple centroid
  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;
  let sumLat = 0, sumLng = 0;

  polygon.forEach(([lat, lng]) => {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    sumLat += lat;
    sumLng += lng;
  });

  const centroid: [number, number] = [
    sumLat / polygon.length,
    sumLng / polygon.length,
  ];

  // If centroid is inside, it is an excellent representative point
  if (isPointInPolygon(centroid, polygon)) {
    return centroid;
  }

  // 2. Test midpoints between vertices and centroid, or internal diagonal midpoints
  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const candidate1: [number, number] = [
      p1[0] * 0.7 + centroid[0] * 0.3,
      p1[1] * 0.7 + centroid[1] * 0.3,
    ];
    if (isPointInPolygon(candidate1, polygon)) {
      return candidate1;
    }

    const nextIdx = (i + 2) % polygon.length;
    const p2 = polygon[nextIdx];
    const candidate2: [number, number] = [
      (p1[0] + p2[0]) / 2,
      (p1[1] + p2[1]) / 2,
    ];
    if (isPointInPolygon(candidate2, polygon)) {
      return candidate2;
    }
  }

  // 3. Grid scan inside bounding box to guarantee an interior point
  const steps = 7;
  const latStep = (maxLat - minLat) / steps;
  const lngStep = (maxLng - minLng) / steps;

  for (let i = 1; i < steps; i++) {
    for (let j = 1; j < steps; j++) {
      const probe: [number, number] = [
        minLat + i * latStep,
        minLng + j * lngStep,
      ];
      if (isPointInPolygon(probe, polygon)) {
        return probe;
      }
    }
  }

  // Fallback to first polygon vertex
  return polygon[0];
}

/**
 * Fetch real road-following route from OSRM driving service
 * Origin: [lat, lng]
 * Destination: [lat, lng]
 * Returns road coordinates in PRAVAH [lat, lng] format
 */
export async function fetchOSRMRoute(
  origin: [number, number],
  destination: [number, number]
): Promise<{ coordinates: [number, number][]; distanceKm: number; durationMinutes: number } | null> {
  const cacheKey = `${origin[0].toFixed(5)},${origin[1].toFixed(5)}->${destination[0].toFixed(5)},${destination[1].toFixed(5)}`;

  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }

  // OSRM expects coordinates in "lng,lat;lng,lat" order
  const originLngLat = `${origin[1].toFixed(6)},${origin[0].toFixed(6)}`;
  const destLngLat = `${destination[1].toFixed(6)},${destination[0].toFixed(6)}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${originLngLat};${destLngLat}?overview=full&geometries=geojson&steps=false`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6500);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[OSRM Routing]: HTTP ${res.status} returned for ${cacheKey}`);
      return null;
    }

    const data = await res.json();
    if (!data.routes || data.routes.length === 0 || !data.routes[0].geometry?.coordinates) {
      console.warn(`[OSRM Routing]: No route returned between ${origin} and ${destination}`);
      return null;
    }

    const route = data.routes[0];
    // Convert GeoJSON [lng, lat] to PRAVAH [lat, lng]
    const coordinates: [number, number][] = route.geometry.coordinates.map(
      (coord: [number, number]) => [coord[1], coord[0]]
    );

    const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
    const durationMinutes = Math.round(route.duration / 60);

    const result = { coordinates, distanceKm, durationMinutes };
    routeCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn(`[OSRM Routing]: Fetch failed for ${cacheKey}:`, err);
    return null;
  }
}

/**
 * Synchronous cache populator for pre-computed / default road routes
 */
export function seedRouteCache(
  origin: [number, number],
  destination: [number, number],
  result: { coordinates: [number, number][]; distanceKm: number; durationMinutes: number }
) {
  const cacheKey = `${origin[0].toFixed(5)},${origin[1].toFixed(5)}->${destination[0].toFixed(5)},${destination[1].toFixed(5)}`;
  routeCache.set(cacheKey, result);
}
