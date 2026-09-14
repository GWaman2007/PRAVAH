/**
 * GIS and Mathematical utilities for geodesic distance, bearing calculation,
 * point-in-polygon checks, perpendicular cross-track deviation, and polyline interpolation.
 */

const EARTH_RADIUS_KM = 6371.0;
const DEG_TO_RAD = Math.PI / 180.0;
const RAD_TO_DEG = 180.0 / Math.PI;

/**
 * Great-circle distance between two [lat, lng] coordinates in Kilometers
 */
export function haversineDistanceKm(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const [lat1, lng1] = coord1;
  const [lat2, lng2] = coord2;

  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLng = (lng2 - lng1) * DEG_TO_RAD;

  const rLat1 = lat1 * DEG_TO_RAD;
  const rLat2 = lat2 * DEG_TO_RAD;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Great-circle distance between two [lat, lng] coordinates in Meters
 */
export function haversineDistanceM(
  coord1: [number, number],
  coord2: [number, number]
): number {
  return haversineDistanceKm(coord1, coord2) * 1000.0;
}

/**
 * Computes forward azimuth/bearing in degrees (0 to 360) from coord1 to coord2
 */
export function calculateBearing(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const [lat1, lng1] = coord1;
  const [lat2, lng2] = coord2;

  const phi1 = lat1 * DEG_TO_RAD;
  const phi2 = lat2 * DEG_TO_RAD;
  const deltaLambda = (lng2 - lng1) * DEG_TO_RAD;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  const bearing = (theta * RAD_TO_DEG + 360) % 360;
  return Math.round(bearing * 10) / 10;
}

/**
 * Standard Ray-Casting algorithm to test if a [lat, lng] point is inside a polygon
 */
export function isPointInPolygon(
  point: [number, number],
  polygon: [number, number][]
): boolean {
  if (polygon.length < 3) return false;

  const [lat, lng] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [latI, lngI] = polygon[i];
    const [latJ, lngJ] = polygon[j];

    const intersect =
      latI > lat !== latJ > lat &&
      lng < ((lngJ - lngI) * (lat - latI)) / (latJ - latI + 1e-12) + lngI;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Perpendicular cross-track distance in meters from point P to line segment AB
 */
export function pointToSegmentDistanceM(
  point: [number, number],
  a: [number, number],
  b: [number, number]
): number {
  const midLat = (a[0] + b[0]) / 2;
  const metersPerDegLat = 111132.0;
  const metersPerDegLng = 111412.0 * Math.cos(midLat * DEG_TO_RAD);

  const ax = 0;
  const ay = 0;
  const bx = (b[1] - a[1]) * metersPerDegLng;
  const by = (b[0] - a[0]) * metersPerDegLat;
  const px = (point[1] - a[1]) * metersPerDegLng;
  const py = (point[0] - a[0]) * metersPerDegLat;

  const segDx = bx - ax;
  const segDy = by - ay;
  const segLenSq = segDx * segDx + segDy * segDy;

  if (segLenSq < 1e-6) {
    return Math.sqrt(px * px + py * py);
  }

  // Projection scalar t on line segment
  const t = Math.max(0, Math.min(1, (px * segDx + py * segDy) / segLenSq));
  const projX = ax + t * segDx;
  const projY = ay + t * segDy;

  const distM = Math.sqrt((px - projX) * (px - projX) + (py - projY) * (py - projY));
  return distM;
}

/**
 * Calculates minimum distance in meters from point to an entire polyline
 */
export function pointToPolylineDistanceM(
  point: [number, number],
  polyline: [number, number][]
): { minDistanceM: number; nearestSegmentIndex: number } {
  if (polyline.length < 2) {
    return {
      minDistanceM: polyline.length === 1 ? haversineDistanceM(point, polyline[0]) : 0,
      nearestSegmentIndex: 0,
    };
  }

  let minDistanceM = Infinity;
  let nearestSegmentIndex = 0;

  for (let i = 0; i < polyline.length - 1; i++) {
    const dist = pointToSegmentDistanceM(point, polyline[i], polyline[i + 1]);
    if (dist < minDistanceM) {
      minDistanceM = dist;
      nearestSegmentIndex = i;
    }
  }

  return { minDistanceM, nearestSegmentIndex };
}

/**
 * Computes cumulative distance array for polyline segments in km
 */
export function computeCumulativeDistances(polyline: [number, number][]): number[] {
  const distances = [0];
  let total = 0;

  for (let i = 0; i < polyline.length - 1; i++) {
    const d = haversineDistanceKm(polyline[i], polyline[i + 1]);
    total += d;
    distances.push(total);
  }

  return distances;
}

/**
 * Total length of polyline in km
 */
export function getPolylineLengthKm(polyline: [number, number][]): number {
  let total = 0;
  for (let i = 0; i < polyline.length - 1; i++) {
    total += haversineDistanceKm(polyline[i], polyline[i + 1]);
  }
  return total;
}

/**
 * Interpolates exact [lat, lng] and heading at a given distance along a polyline
 */
export function interpolateAlongPolyline(
  polyline: [number, number][],
  cumulativeDistances: number[],
  targetDistKm: number
): {
  coords: [number, number];
  heading: number;
  segmentIndex: number;
} {
  const n = polyline.length;
  if (n === 0) {
    return { coords: [0, 0], heading: 0, segmentIndex: 0 };
  }
  if (n === 1 || targetDistKm <= 0) {
    const h = n > 1 ? calculateBearing(polyline[0], polyline[1]) : 0;
    return { coords: polyline[0], heading: h, segmentIndex: 0 };
  }

  const totalDist = cumulativeDistances[cumulativeDistances.length - 1];
  if (targetDistKm >= totalDist) {
    const h = calculateBearing(polyline[n - 2], polyline[n - 1]);
    return { coords: polyline[n - 1], heading: h, segmentIndex: n - 2 };
  }

  // Find containing segment
  let segIndex = 0;
  for (let i = 0; i < cumulativeDistances.length - 1; i++) {
    if (
      targetDistKm >= cumulativeDistances[i] &&
      targetDistKm <= cumulativeDistances[i + 1]
    ) {
      segIndex = i;
      break;
    }
  }

  const startDist = cumulativeDistances[segIndex];
  const endDist = cumulativeDistances[segIndex + 1];
  const segDist = endDist - startDist;

  const ratio = segDist > 1e-6 ? (targetDistKm - startDist) / segDist : 0;

  const p1 = polyline[segIndex];
  const p2 = polyline[segIndex + 1];

  const lat = p1[0] + (p2[0] - p1[0]) * ratio;
  const lng = p1[1] + (p2[1] - p1[1]) * ratio;
  const heading = calculateBearing(p1, p2);

  return {
    coords: [lat, lng],
    heading,
    segmentIndex: segIndex,
  };
}

/**
 * Generates intermediate interpolated points between two coordinates for smooth rendering
 */
export function smoothInterpolatePoints(
  p1: [number, number],
  p2: [number, number],
  steps: number = 5
): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push([p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t]);
  }
  return points;
}
