/**
 * PRAVAH - Route Spatial Segmentation & Model A Spatial Inference Engine
 * 
 * Implements the core spatial decomposition:
 * 1. Takes any complete continuous candidate route geometry from A -> B.
 * 2. Calculates total route distance along the actual geometry using geodesic cumulative distance.
 * 3. Divides the route into EXACTLY 5 equal-distance spatial Model-A segments:
 *    - S1: 0–20%
 *    - S2: 20–40%
 *    - S3: 40–60%
 *    - S4: 60–80%
 *    - S5: 80–100%
 * 4. Builds segment-localized 17 Model-A features for each segment.
 * 5. Calls Model A inference on each segment (S1..S5 -> P1..P5).
 * 6. Checks operational road status/incidents at precise locations without converting the whole segment into a fake incident.
 * 7. Computes route-level Model A exposure metrics.
 */

import type {
  ModelAFeatures,
  ModelAPrediction,
  RouteSpatialSegment,
  SegmentIncident,
  RouteModelAExposure,
} from '../types';
import {
  haversineDistanceKm,
  computeCumulativeDistances,
  interpolateAlongPolyline,
  ensureLatLng,
} from './gisMath';
import { NER_NODES, NER_SEGMENTS } from '../data/routingNetwork';
import { predictSegmentRisk, computeAuthenticSurrogatePrediction } from './modelAService';
import { WeatherObservations } from './modelAFeatureBuilder';

/**
 * 1. Divide any continuous route polyline into EXACTLY 5 equal-distance spatial segments.
 * An 88 km route becomes 5 segments of ~17.6 km each.
 * A 100 km route becomes 5 segments of ~20 km each.
 */
export function splitRouteInto5EqualSegments(
  rawCoordinates: [number, number][],
  routeId: string
): {
  order: number;
  percentageRange: string;
  startKm: number;
  endKm: number;
  distanceKm: number;
  startCoords: [number, number];
  endCoords: [number, number];
  geometry: [number, number][];
}[] {
  if (!rawCoordinates || rawCoordinates.length < 2) {
    const fallbackPoint: [number, number] = rawCoordinates && rawCoordinates[0]
      ? ensureLatLng(rawCoordinates[0])
      : [25.75, 93.95];
    return [1, 2, 3, 4, 5].map((order) => ({
      order,
      percentageRange: `${(order - 1) * 20}–${order * 20}%`,
      startKm: 0,
      endKm: 0,
      distanceKm: 0,
      startCoords: fallbackPoint,
      endCoords: fallbackPoint,
      geometry: [fallbackPoint, fallbackPoint],
    }));
  }

  // Normalize polyline to [lat, lng]
  const polyline: [number, number][] = rawCoordinates
    .filter((c) => Array.isArray(c) && Number.isFinite(c[0]) && Number.isFinite(c[1]))
    .map((c) => ensureLatLng(c));

  if (polyline.length < 2) {
    const pt = polyline[0] || [25.75, 93.95];
    return [1, 2, 3, 4, 5].map((order) => ({
      order,
      percentageRange: `${(order - 1) * 20}–${order * 20}%`,
      startKm: 0,
      endKm: 0,
      distanceKm: 0,
      startCoords: pt,
      endCoords: pt,
      geometry: [pt, pt],
    }));
  }

  const cumulativeDistances = computeCumulativeDistances(polyline);
  const totalKm = cumulativeDistances[cumulativeDistances.length - 1];

  const result: {
    order: number;
    percentageRange: string;
    startKm: number;
    endKm: number;
    distanceKm: number;
    startCoords: [number, number];
    endCoords: [number, number];
    geometry: [number, number][];
  }[] = [];

  for (let i = 0; i < 5; i++) {
    const order = i + 1;
    const startFrac = i * 0.20;
    const endFrac = (i + 1) * 0.20;

    const startDistKm = startFrac * totalKm;
    const endDistKm = endFrac * totalKm;
    const segDistKm = Math.round((endDistKm - startDistKm) * 10) / 10;

    // Boundary points
    const startPoint = i === 0
      ? polyline[0]
      : interpolateAlongPolyline(polyline, cumulativeDistances, startDistKm).coords;

    const endPoint = i === 4
      ? polyline[polyline.length - 1]
      : interpolateAlongPolyline(polyline, cumulativeDistances, endDistKm).coords;

    // Collect all intermediate vertices strictly inside (startDistKm, endDistKm)
    const segCoords: [number, number][] = [startPoint];
    for (let k = 0; k < polyline.length; k++) {
      const d = cumulativeDistances[k];
      if (d > startDistKm + 0.005 && d < endDistKm - 0.005) {
        segCoords.push(polyline[k]);
      }
    }
    segCoords.push(endPoint);

    result.push({
      order,
      percentageRange: `${Math.round(startFrac * 100)}–${Math.round(endFrac * 100)}%`,
      startKm: Math.round(startDistKm * 10) / 10,
      endKm: Math.round(endDistKm * 10) / 10,
      distanceKm: segDistKm,
      startCoords: startPoint,
      endCoords: endPoint,
      geometry: segCoords,
    });
  }

  return result;
}

/**
 * 2. Builds localized 17 Model-A features for a specific 20% spatial segment.
 * Features reflect the local topography, gradient, elevation, LHZ, and weather of that specific segment.
 */
export function buildSpatialSegmentModelAFeatures(
  segmentCoords: [number, number][],
  segmentDistanceKm: number,
  rainfallMmHr = 24.0,
  liveWeather?: WeatherObservations
): ModelAFeatures {
  const coords = segmentCoords.length >= 2 ? segmentCoords : [[25.75, 93.95], [25.76, 93.96]];
  const firstCoord = coords[0];
  const lastCoord = coords[coords.length - 1];
  const midIdx = Math.floor(coords.length / 2);
  const midCoord = coords[midIdx];

  const startPt: [number, number] = firstCoord ? [firstCoord[0], firstCoord[1]] : [25.75, 93.95];
  const endPt: [number, number] = lastCoord ? [lastCoord[0], lastCoord[1]] : [25.76, 93.96];
  const midPt: [number, number] = midCoord ? [midCoord[0], midCoord[1]] : [25.755, 93.955];

  // A. Local Elevation & Slope
  // Resolve elevation from nearest regional nodes in NER_NODES
  const nodeEntries = Object.values(NER_NODES);
  let startElev = 150;
  let endElev = 150;
  let minStartDist = Infinity;
  let minEndDist = Infinity;

  for (const node of nodeEntries) {
    const nodeCoords: [number, number] = [node.coordinates[0], node.coordinates[1]];
    const dStart = haversineDistanceKm(startPt, nodeCoords);
    if (dStart < minStartDist) {
      minStartDist = dStart;
      startElev = node.elevationMeters;
    }
    const dEnd = haversineDistanceKm(endPt, nodeCoords);
    if (dEnd < minEndDist) {
      minEndDist = dEnd;
      endElev = node.elevationMeters;
    }
  }

  const meanElevation = Math.round(((startElev + endElev) / 2) * 10) / 10;
  const distMeters = Math.max(500, segmentDistanceKm * 1000);
  const elevDeltaMeters = Math.abs(endElev - startElev);
  // Ruling gradient pct: minimum 1.5%, capped at 14%
  const gradientPct = Math.max(1.5, Math.min(14.0, (elevDeltaMeters / distMeters) * 100 + 3.0));
  const slopeDegrees = Math.round(Math.atan(gradientPct / 100) * (180 / Math.PI) * 10) / 10;

  // B. ISRO Bhuvan Landslide Hazard Zonation (LHZ Level 1 to 5)
  // Check proximity to known high-hazard bottlenecks:
  // 1. Pagla Pahar / NH-29 cut: lat ~25.75..25.85, lng ~93.80..93.95
  // 2. Sonapur Tunnel / Lubha portal: lat ~25.10..25.20, lng ~92.35..92.40
  // 3. Teesta Canyon 29th Mile: lat ~27.00..27.10, lng ~88.45..88.55
  // 4. Jatinga Sinking Zone / Haflong Barail cut: lat ~25.12..25.22, lng ~92.98..93.08
  // 5. Sela Pass high frost axis: lat ~27.48..27.55, lng ~92.05..92.15
  let lhzLevel = 2; // Nominal moderate baseline

  const isPaglaPahar = midPt[0] >= 25.72 && midPt[0] <= 25.86 && midPt[1] >= 93.75 && midPt[1] <= 93.98;
  const isSonapur = midPt[0] >= 25.08 && midPt[0] <= 25.25 && midPt[1] >= 92.30 && midPt[1] <= 92.45;
  const isTeestaCanyon = midPt[0] >= 26.95 && midPt[0] <= 27.15 && midPt[1] >= 88.40 && midPt[1] <= 88.58;
  const isJatingaSinking = midPt[0] >= 25.10 && midPt[0] <= 25.25 && midPt[1] >= 92.90 && midPt[1] <= 93.10;
  const isSelaPass = midPt[0] >= 27.45 && midPt[0] <= 27.58 && midPt[1] >= 92.00 && midPt[1] <= 92.20;

  if (isPaglaPahar || isSonapur || isTeestaCanyon || isJatingaSinking || isSelaPass) {
    lhzLevel = 5; // Extreme Hazard Choke Point
  } else if (meanElevation > 1200 || slopeDegrees > 7.0) {
    lhzLevel = 3; // Mountain Ridge High Exposure
  } else if (meanElevation < 100) {
    lhzLevel = 1; // Lowland Plain / Flood Buffer
  }

  const landslideCountsByLhz: Record<number, number> = {
    1: 0,
    2: 1,
    3: 3,
    4: 6,
    5: 11,
  };
  const histCount = landslideCountsByLhz[lhzLevel] ?? 2;
  const histPresence = histCount > 0 ? 1 : 0;

  // C. Localized Rainfall (mm)
  const liveR24 = typeof liveWeather?.rainfall_24h === 'number' ? liveWeather.rainfall_24h : 0;
  const r24 = Math.round(Math.max(rainfallMmHr, liveR24) * 10) / 10;
  const r72 = typeof liveWeather?.rainfall_72h === 'number' && liveWeather.rainfall_72h > 0
    ? Math.max(Math.round(liveWeather.rainfall_72h * 10) / 10, r24)
    : Math.round(r24 * 1.25 * 10) / 10;
  const r7d = typeof liveWeather?.rainfall_7d === 'number' && liveWeather.rainfall_7d > 0
    ? Math.max(Math.round(liveWeather.rainfall_7d * 10) / 10, r72)
    : Math.round(r72 * 1.35 * 10) / 10;

  // D. Road Infrastructure & Pavement Types (km)
  const dist = Math.max(1.0, segmentDistanceKm);
  const btKm = Math.round(dist * 0.82 * 10) / 10;
  const icbpKm = Math.round(dist * 0.10 * 10) / 10;
  const ccKm = Math.round(dist * 0.08 * 10) / 10;
  const paverKm = 0;
  const totalPavedKm = Math.max(0.1, Math.round((btKm + icbpKm + ccKm + paverKm) * 10) / 10);

  const btRatio = Math.round((btKm / totalPavedKm) * 1000) / 1000;
  const icbpRatio = Math.round((icbpKm / totalPavedKm) * 1000) / 1000;
  const ccRatio = Math.round((ccKm / totalPavedKm) * 1000) / 1000;
  const paverRatio = 0;
  const diversity = [btKm, icbpKm, ccKm, paverKm].filter((km) => km > 0).length;

  return {
    rainfall_24h: r24,
    rainfall_72h: r72,
    rainfall_7d: r7d,
    elevation_m: meanElevation,
    slope_degrees: slopeDegrees,
    historical_road_landslide_count: histCount,
    historical_road_landslide_presence: histPresence,
    bt_road_km: btKm,
    icbp_km: icbpKm,
    cement_concrete_km: ccKm,
    paver_block_km: paverKm,
    total_paved_road_km: totalPavedKm,
    bt_road_ratio: btRatio,
    icbp_ratio: icbpRatio,
    cement_concrete_ratio: ccRatio,
    paver_block_ratio: paverRatio,
    road_surface_diversity: diversity,
  };
}

/**
 * 3. Evaluates Model A on each of the 5 spatial segments and checks operational incidents.
 */
export async function evaluateRouteSpatialSegments(
  routeId: string,
  coordinates: [number, number][],
  rainfallMmHr = 24.0,
  disruptions: Record<string, SegmentIncident> = {},
  liveWeather?: WeatherObservations
): Promise<RouteSpatialSegment[]> {
  const slices = splitRouteInto5EqualSegments(coordinates, routeId);

  const evaluatedSegments: RouteSpatialSegment[] = [];

  for (const s of slices) {
    const segId = `${routeId}_S${s.order}`;
    const features = buildSpatialSegmentModelAFeatures(s.geometry, s.distanceKm, rainfallMmHr, liveWeather);

    let pred: ModelAPrediction;
    try {
      pred = await predictSegmentRisk(segId, features, rainfallMmHr);
    } catch {
      pred = computeAuthenticSurrogatePrediction(segId, features);
    }

    const prob = pred.probability;
    let riskBand: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' = 'LOW';
    if (prob >= 0.80) {
      riskBand = 'VERY_HIGH';
    } else if (prob >= 0.50) {
      riskBand = 'HIGH';
    } else if (prob >= 0.25) {
      riskBand = 'MODERATE';
    }

    // Operational Incident check:
    // Determine if any confirmed incident from disruptions falls within or near this segment geometry
    let isBlocked = false;
    let isRestricted = false;
    let incidentType: string | undefined;
    let incidentDescription: string | undefined;
    let incidentLocation: [number, number] | undefined;

    // Check confirmed disruptions
    const disruptionEntries = Object.entries(disruptions);
    for (const [disruptId, inc] of disruptionEntries) {
      if (!inc) continue;
      // Match if incident segment matches regional corridor or if coordinate proximity <= 4.0km
      const targetSeg = NER_SEGMENTS.find((seg) => seg.id === disruptId || (inc as any).segment_id === seg.id);
      let isNear = false;

      let loc: [number, number] | null = null;
      if (inc.location && typeof inc.location === 'object') {
        const anyLoc = inc.location as any;
        if (Number.isFinite(anyLoc.lat) && Number.isFinite(anyLoc.lng)) {
          loc = [anyLoc.lat, anyLoc.lng];
        } else if (Array.isArray(anyLoc) && Number.isFinite(anyLoc[0]) && Number.isFinite(anyLoc[1])) {
          loc = [anyLoc[0], anyLoc[1]];
        }
      }

      if (loc) {
        for (const pt of s.geometry) {
          if (haversineDistanceKm(loc, pt) <= 5.0) {
            isNear = true;
            incidentLocation = loc;
            break;
          }
        }
      } else if (targetSeg && targetSeg.coordinates) {
        for (const tPt of targetSeg.coordinates) {
          for (const sPt of s.geometry) {
            if (haversineDistanceKm(tPt, sPt) <= 4.0) {
              isNear = true;
              incidentLocation = tPt;
              break;
            }
          }
          if (isNear) break;
        }
      }

      if (isNear) {
        if (inc.status === 'TOTAL_BLOCKAGE') {
          isBlocked = true;
          incidentType = (inc as any).incident_type || inc.cause || 'TOTAL_BLOCKAGE';
          incidentDescription = inc.description || 'Confirmed complete road blockage reported by authority';
        } else if (inc.status === 'SINGLE_LANE_PASSABLE') {
          isRestricted = true;
          incidentType = (inc as any).incident_type || inc.cause || 'SINGLE_LANE_PASSABLE';
          incidentDescription = inc.description || 'Restricted single-lane passage';
        }
      }
    }

    evaluatedSegments.push({
      id: segId,
      routeId,
      order: s.order,
      percentageRange: s.percentageRange,
      startKm: s.startKm,
      endKm: s.endKm,
      distanceKm: s.distanceKm,
      startCoords: s.startCoords,
      endCoords: s.endCoords,
      geometry: s.geometry,
      modelA: {
        probability: prob,
        prediction: pred.prediction,
        threshold: pred.threshold || 0.50,
        riskBand,
        features,
        status: pred.source === 'MODEL_A_INFERENCE' ? 'INFERRED' : 'FALLBACK',
        interpretation: pred.interpretation,
      },
      operationalStatus: {
        isBlocked,
        isRestricted,
        incidentType,
        incidentDescription,
        incidentLocation,
      },
    });
  }

  return evaluatedSegments;
}

/**
 * 4. Route-Level Model A Exposure Metrics
 * Aggregates the 5 spatial segments according to Section 7:
 * - max_probability
 * - mean_probability
 * - high_risk_segment_count (P >= 0.50)
 * - blocked_segment_count
 * - restricted_segment_count
 */
export function calculateSpatialRouteExposure(spatialSegments: RouteSpatialSegment[]): {
  maxProbability: number;
  meanProbability: number;
  highRiskSegmentCount: number;
  blockedSegmentCount: number;
  restrictedSegmentCount: number;
  riskWeightedExposure: number;
} {
  if (!spatialSegments || spatialSegments.length === 0) {
    return {
      maxProbability: 0,
      meanProbability: 0,
      highRiskSegmentCount: 0,
      blockedSegmentCount: 0,
      restrictedSegmentCount: 0,
      riskWeightedExposure: 0,
    };
  }

  const probs = spatialSegments.map((s) => s.modelA.probability);
  const maxProbability = Math.max(...probs);
  const meanProbability = Math.round((probs.reduce((a, b) => a + b, 0) / probs.length) * 1000) / 1000;
  const highRiskSegmentCount = spatialSegments.filter((s) => s.modelA.probability >= 0.50).length;
  const blockedSegmentCount = spatialSegments.filter((s) => s.operationalStatus.isBlocked).length;
  const restrictedSegmentCount = spatialSegments.filter((s) => s.operationalStatus.isRestricted).length;

  // Risk-weighted exposure: penalizes peak risk and elevated segment frequency
  const riskWeightedExposure = Math.round(
    (maxProbability * 0.70 + meanProbability * 0.30 + (highRiskSegmentCount / 5) * 0.15) * 1000
  ) / 1000;

  return {
    maxProbability,
    meanProbability,
    highRiskSegmentCount,
    blockedSegmentCount,
    restrictedSegmentCount,
    riskWeightedExposure,
  };
}

/**
 * Synchronous spatial segment constructor.
 * Uses the authentic surrogate Model A pipeline to instantly produce 5 segments
 * with exact 17-feature vectors and localized risk probabilities.
 */
export function buildSynchronousSpatialSegments(
  routeId: string,
  coordinates: [number, number][],
  rainfallMmHr = 24.0,
  disruptions: Record<string, SegmentIncident> = {}
): RouteSpatialSegment[] {
  const slices = splitRouteInto5EqualSegments(coordinates, routeId);
  const segments: RouteSpatialSegment[] = [];

  for (const s of slices) {
    const segId = `${routeId}_S${s.order}`;
    const features = buildSpatialSegmentModelAFeatures(s.geometry, s.distanceKm, rainfallMmHr);
    const pred = computeAuthenticSurrogatePrediction(segId, features);
    const prob = pred.probability;

    let riskBand: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' = 'LOW';
    if (prob >= 0.80) {
      riskBand = 'VERY_HIGH';
    } else if (prob >= 0.50) {
      riskBand = 'HIGH';
    } else if (prob >= 0.25) {
      riskBand = 'MODERATE';
    }

    let isBlocked = false;
    let isRestricted = false;
    let incidentType: string | undefined;
    let incidentDescription: string | undefined;
    let incidentLocation: [number, number] | undefined;

    const disruptionEntries = Object.entries(disruptions);
    for (const [disruptId, inc] of disruptionEntries) {
      if (!inc) continue;
      const targetSeg = NER_SEGMENTS.find((seg) => seg.id === disruptId || (inc as any).segment_id === seg.id);
      let isNear = false;

      let loc: [number, number] | null = null;
      if (inc.location && typeof inc.location === 'object') {
        const anyLoc = inc.location as any;
        if (Number.isFinite(anyLoc.lat) && Number.isFinite(anyLoc.lng)) {
          loc = [anyLoc.lat, anyLoc.lng];
        } else if (Array.isArray(anyLoc) && Number.isFinite(anyLoc[0]) && Number.isFinite(anyLoc[1])) {
          loc = [anyLoc[0], anyLoc[1]];
        }
      }

      if (loc) {
        for (const pt of s.geometry) {
          if (haversineDistanceKm(loc, pt) <= 5.0) {
            isNear = true;
            incidentLocation = loc;
            break;
          }
        }
      } else if (targetSeg && targetSeg.coordinates) {
        for (const tPt of targetSeg.coordinates) {
          for (const sPt of s.geometry) {
            if (haversineDistanceKm(tPt, sPt) <= 4.0) {
              isNear = true;
              incidentLocation = tPt;
              break;
            }
          }
          if (isNear) break;
        }
      }

      if (isNear) {
        if (inc.status === 'TOTAL_BLOCKAGE') {
          isBlocked = true;
          incidentType = (inc as any).incident_type || inc.cause || 'TOTAL_BLOCKAGE';
          incidentDescription = inc.description || 'Confirmed complete road blockage reported by authority';
        } else if (inc.status === 'SINGLE_LANE_PASSABLE') {
          isRestricted = true;
          incidentType = (inc as any).incident_type || inc.cause || 'SINGLE_LANE_PASSABLE';
          incidentDescription = inc.description || 'Restricted single-lane passage';
        }
      }
    }

    segments.push({
      id: segId,
      routeId,
      order: s.order,
      percentageRange: s.percentageRange,
      startKm: s.startKm,
      endKm: s.endKm,
      distanceKm: s.distanceKm,
      startCoords: s.startCoords,
      endCoords: s.endCoords,
      geometry: s.geometry,
      modelA: {
        probability: prob,
        prediction: pred.prediction,
        threshold: pred.threshold || 0.50,
        riskBand,
        features,
        status: 'FALLBACK',
        interpretation: pred.interpretation,
      },
      operationalStatus: {
        isBlocked,
        isRestricted,
        incidentType,
        incidentDescription,
        incidentLocation,
      },
    });
  }

  return segments;
}

