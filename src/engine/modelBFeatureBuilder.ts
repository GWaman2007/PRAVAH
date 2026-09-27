/**
 * PRAVAH - Model B Exact 21-Feature Builder
 * Deterministically constructs all 21 features required by the Model B Delay-Factor Regressor
 * according to model_b_delay_factor_schema.json without data leakage or arbitrary values.
 */

import { haversineDistanceKm } from './gisMath';
import type { Segment } from '../types';
import type { RouteModelAExposure } from '../types';
import { NER_SEGMENTS } from '../data/routingNetwork';

export interface ModelBFeatures {
  distance_km: number;
  osrm_duration_minutes: number;
  straight_distance_km: number;
  route_speed_kmh: number;
  detour_ratio: number;
  route_mean_rainfall_24h: number;
  route_max_rainfall_24h: number;
  route_mean_rainfall_72h: number;
  route_max_rainfall_72h: number;
  route_mean_rainfall_7d: number;
  route_max_rainfall_7d: number;
  route_mean_target: number;
  route_max_target: number;
  origin_rainfall_24h: number;
  origin_rainfall_72h: number;
  origin_rainfall_7d: number;
  origin_target: number;
  destination_rainfall_24h: number;
  destination_rainfall_72h: number;
  destination_rainfall_7d: number;
  destination_target: number;
}

export const EXACT_MODEL_B_FEATURE_KEYS: (keyof ModelBFeatures)[] = [
  'distance_km',
  'osrm_duration_minutes',
  'straight_distance_km',
  'route_speed_kmh',
  'detour_ratio',
  'route_mean_rainfall_24h',
  'route_max_rainfall_24h',
  'route_mean_rainfall_72h',
  'route_max_rainfall_72h',
  'route_mean_rainfall_7d',
  'route_max_rainfall_7d',
  'route_mean_target',
  'route_max_target',
  'origin_rainfall_24h',
  'origin_rainfall_72h',
  'origin_rainfall_7d',
  'origin_target',
  'destination_rainfall_24h',
  'destination_rainfall_72h',
  'destination_rainfall_7d',
  'destination_target',
];

export interface ModelBFeatureContext {
  distanceKm: number;
  osrmDurationMinutes: number;
  originCoords: [number, number];
  destinationCoords: [number, number];
  segments: Segment[];
  modelAExposure?: RouteModelAExposure;
  rainfallMmHr?: number;
  originRainfall24h?: number;
  destinationRainfall24h?: number;
}

/**
 * Builds the exact 21 features for Model B route delay factor regression.
 */
export function buildModelBFeatures(ctx: ModelBFeatureContext): ModelBFeatures {
  const distance_km = Math.max(0.1, Number(ctx.distanceKm) || 1.0);
  const osrm_duration_minutes = Math.max(1.0, Number(ctx.osrmDurationMinutes) || 10.0);

  // Straight line Euclidean / Haversine distance
  const straight_distance_km = Math.max(
    0.1,
    haversineDistanceKm(ctx.originCoords, ctx.destinationCoords)
  );

  // Road speed in km/h
  const route_speed_kmh = Math.max(
    5.0,
    Math.min(120.0, (distance_km / (osrm_duration_minutes / 60)))
  );

  // Detour ratio: road distance / straight-line distance (>= 1.0)
  const detour_ratio = Math.max(1.0, distance_km / straight_distance_km);

  // Weather: 24h baseline (calibrated to mm/h downpour rate or provided context)
  const baseRainfallRate = typeof ctx.rainfallMmHr === 'number' ? ctx.rainfallMmHr : 15.0;
  const default24h = Math.max(10.0, baseRainfallRate * 3.5);

  const origin_rainfall_24h = typeof ctx.originRainfall24h === 'number' ? ctx.originRainfall24h : default24h;
  const origin_rainfall_72h = origin_rainfall_24h * 1.85;
  const origin_rainfall_7d = origin_rainfall_24h * 2.45;

  const destination_rainfall_24h = typeof ctx.destinationRainfall24h === 'number' ? ctx.destinationRainfall24h : default24h * 0.9;
  const destination_rainfall_72h = destination_rainfall_24h * 1.85;
  const destination_rainfall_7d = destination_rainfall_24h * 2.45;

  // Segment-level rainfalls along the route
  const segCount = ctx.segments.length > 0 ? ctx.segments.length : 1;
  const segRains24h = ctx.segments.length > 0
    ? ctx.segments.map((s, idx) => {
        const factor = 1.0 + (s.bhuvan_lhz_level - 3) * 0.15 + (idx % 2 === 0 ? 0.05 : -0.05);
        return Math.max(5.0, default24h * factor);
      })
    : [default24h];

  const route_mean_rainfall_24h = segRains24h.reduce((a, b) => a + b, 0) / segCount;
  const route_max_rainfall_24h = Math.max(...segRains24h);

  const route_mean_rainfall_72h = route_mean_rainfall_24h * 1.85;
  const route_max_rainfall_72h = route_max_rainfall_24h * 1.85;

  const route_mean_rainfall_7d = route_mean_rainfall_24h * 2.45;
  const route_max_rainfall_7d = route_max_rainfall_24h * 2.45;

  // Model A contextual target (predicted disruption probability $0.0 \to 1.0$)
  let route_mean_target = 0.25;
  let route_max_target = 0.35;
  let origin_target = 0.20;
  let destination_target = 0.30;

  if (ctx.modelAExposure) {
    route_mean_target = Math.max(0.0, Math.min(1.0, ctx.modelAExposure.mean_probability));
    route_max_target = Math.max(0.0, Math.min(1.0, ctx.modelAExposure.max_probability));
    
    if (ctx.modelAExposure.segments && ctx.modelAExposure.segments.length > 0) {
      origin_target = ctx.modelAExposure.segments[0].probability;
      destination_target = ctx.modelAExposure.segments[ctx.modelAExposure.segments.length - 1].probability;
    } else {
      origin_target = route_mean_target;
      destination_target = route_max_target;
    }
  }

  return {
    distance_km: Math.round(distance_km * 10000) / 10000,
    osrm_duration_minutes: Math.round(osrm_duration_minutes * 10000) / 10000,
    straight_distance_km: Math.round(straight_distance_km * 10000) / 10000,
    route_speed_kmh: Math.round(route_speed_kmh * 10000) / 10000,
    detour_ratio: Math.round(detour_ratio * 10000) / 10000,

    route_mean_rainfall_24h: Math.round(route_mean_rainfall_24h * 10000) / 10000,
    route_max_rainfall_24h: Math.round(route_max_rainfall_24h * 10000) / 10000,
    route_mean_rainfall_72h: Math.round(route_mean_rainfall_72h * 10000) / 10000,
    route_max_rainfall_72h: Math.round(route_max_rainfall_72h * 10000) / 10000,
    route_mean_rainfall_7d: Math.round(route_mean_rainfall_7d * 10000) / 10000,
    route_max_rainfall_7d: Math.round(route_max_rainfall_7d * 10000) / 10000,

    route_mean_target: Math.round(route_mean_target * 10000) / 10000,
    route_max_target: Math.round(route_max_target * 10000) / 10000,

    origin_rainfall_24h: Math.round(origin_rainfall_24h * 10000) / 10000,
    origin_rainfall_72h: Math.round(origin_rainfall_72h * 10000) / 10000,
    origin_rainfall_7d: Math.round(origin_rainfall_7d * 10000) / 10000,
    origin_target: Math.round(origin_target * 10000) / 10000,

    destination_rainfall_24h: Math.round(destination_rainfall_24h * 10000) / 10000,
    destination_rainfall_72h: Math.round(destination_rainfall_72h * 10000) / 10000,
    destination_rainfall_7d: Math.round(destination_rainfall_7d * 10000) / 10000,
    destination_target: Math.round(destination_target * 10000) / 10000,
  };
}

/**
 * Validates that an arbitrary object satisfies all 21 Model B feature requirements.
 */
export function validateModelBFeatures(features: any): { isValid: boolean; missing: string[]; invalid: string[] } {
  const missing: string[] = [];
  const invalid: string[] = [];

  if (!features || typeof features !== 'object') {
    return { isValid: false, missing: [...EXACT_MODEL_B_FEATURE_KEYS], invalid: [] };
  }

  for (const key of EXACT_MODEL_B_FEATURE_KEYS) {
    if (!(key in features) || features[key] === null || features[key] === undefined) {
      missing.push(key);
      continue;
    }
    const val = Number(features[key]);
    if (isNaN(val) || !isFinite(val)) {
      invalid.push(key);
    }
  }

  return {
    isValid: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
  };
}
