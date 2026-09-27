/**
 * PRAVAH - Model B Client Inference Service
 * Connects frontend routing & mission systems to the Model B delay-factor regressor.
 * Enforces strict bounds [1.0, 1.75], validates reconstructed ETA, and exposes typed results.
 */

import type { ModelBFeatures } from './modelBFeatureBuilder';
import { validateModelBFeatures } from './modelBFeatureBuilder';

export interface ModelBPredictionResult {
  raw_delay_factor: number;
  predicted_delay_factor: number;
  osrm_duration_minutes: number;
  predicted_eta_minutes: number;
  eta_overhead_minutes: number;
  model_version: string;
  clamped: boolean;
}

export interface ModelBMultiRouteInput {
  route_id: string;
  route_number: number;
  features: ModelBFeatures;
}

export interface ModelBMultiRouteResult extends ModelBPredictionResult {
  route_id: string;
  route_number: number;
  distance_km: number;
  predicted_route_rank: number;
  predicted_preferred_route: boolean;
}

const PRIMARY_MODEL_B_URL = '/api/model-b/predict';
const MULTI_MODEL_B_URL = '/api/model-b/multi_predict';
const DIRECT_BACKEND_URL = 'http://localhost:3001/api/model-b/predict';
const DIRECT_MULTI_BACKEND_URL = 'http://localhost:3001/api/model-b/multi_predict';
const MICROSERVICE_URL = 'http://127.0.0.1:5006/predict';

/**
 * Predicts the delay factor for a single candidate route using Model B.
 */
export async function predictRouteDelayFactor(
  features: ModelBFeatures
): Promise<ModelBPredictionResult> {
  const validation = validateModelBFeatures(features);
  if (!validation.isValid) {
    throw new Error(
      `Model B feature validation failed. Missing: [${validation.missing.join(', ')}], Invalid: [${validation.invalid.join(', ')}]`
    );
  }

  const isNode = typeof window === 'undefined';
  const endpoints = isNode
    ? [DIRECT_BACKEND_URL, 'http://127.0.0.1:3001/api/model-b/predict', MICROSERVICE_URL]
    : [PRIMARY_MODEL_B_URL, DIRECT_BACKEND_URL, MICROSERVICE_URL];
  let lastError: Error | null = null;

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const rawDelay = Number(data.raw_delay_factor ?? data.predicted_delay_factor);
        // Strictly clamp to [1.0, 1.75]
        const clampedDelay = Math.max(1.0, Math.min(1.75, Number(data.predicted_delay_factor) || rawDelay));
        const osrmDur = Number(data.osrm_duration_minutes ?? features.osrm_duration_minutes);
        const predictedEta = Number(data.predicted_eta_minutes) || osrmDur * clampedDelay;
        const overhead = Number(data.eta_overhead_minutes) || Math.max(0, predictedEta - osrmDur);

        return {
          raw_delay_factor: rawDelay,
          predicted_delay_factor: clampedDelay,
          osrm_duration_minutes: osrmDur,
          predicted_eta_minutes: predictedEta,
          eta_overhead_minutes: overhead,
          model_version: data.model_version || 'prototype_v2_delay_factor',
          clamped: rawDelay !== clampedDelay,
        };
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  throw new Error(`Model B service unavailable: ${lastError?.message || 'Inference failed across all endpoints'}`);
}

/**
 * Runs batch Model B prediction and ranks multiple candidate routes by predicted ETA ascending.
 */
export async function predictAndRankCandidateRoutes(
  candidates: ModelBMultiRouteInput[]
): Promise<ModelBMultiRouteResult[]> {
  if (!candidates || candidates.length === 0) {
    return [];
  }

  const isNode = typeof window === 'undefined';
  const endpoints = isNode
    ? [DIRECT_MULTI_BACKEND_URL, 'http://127.0.0.1:3001/api/model-b/multi_predict']
    : [MULTI_MODEL_B_URL, DIRECT_MULTI_BACKEND_URL];
  let lastError: Error | null = null;

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routes: candidates }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const results: ModelBMultiRouteResult[] = data.results || data;
        if (Array.isArray(results) && results.length > 0) {
          // Verify bounds and sorting
          results.forEach((r) => {
            r.predicted_delay_factor = Math.max(1.0, Math.min(1.75, Number(r.predicted_delay_factor)));
          });
          results.sort((a, b) => a.predicted_eta_minutes - b.predicted_eta_minutes);
          results.forEach((r, idx) => {
            r.predicted_route_rank = idx + 1;
            r.predicted_preferred_route = (idx === 0);
          });
          return results;
        }
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  // Fallback: evaluate sequentially using predictRouteDelayFactor
  console.warn('[Model B] Multi-endpoint failed, falling back to sequential route evaluation:', lastError?.message);
  const sequentialResults: ModelBMultiRouteResult[] = [];
  for (const candidate of candidates) {
    try {
      const single = await predictRouteDelayFactor(candidate.features);
      sequentialResults.push({
        ...single,
        route_id: candidate.route_id,
        route_number: candidate.route_number,
        distance_km: candidate.features.distance_km,
        predicted_route_rank: 0,
        predicted_preferred_route: false,
      });
    } catch (singleErr) {
      console.error(`[Model B] Failed to predict candidate ${candidate.route_id}:`, singleErr);
    }
  }

  if (sequentialResults.length === 0) {
    throw new Error(`Model B unavailable: ${lastError?.message || 'Could not rank candidate routes'}`);
  }

  sequentialResults.sort((a, b) => a.predicted_eta_minutes - b.predicted_eta_minutes);
  sequentialResults.forEach((r, idx) => {
    r.predicted_route_rank = idx + 1;
    r.predicted_preferred_route = (idx === 0);
  });

  return sequentialResults;
}

/**
 * Health check to verify Model B service availability.
 */
export async function checkModelBHealth(): Promise<{ status: string; service: string; model_version: string } | null> {
  try {
    const res = await fetch('/api/model-b/health');
    if (res.ok) {
      return await res.json();
    }
    return null;
  } catch {
    return null;
  }
}
