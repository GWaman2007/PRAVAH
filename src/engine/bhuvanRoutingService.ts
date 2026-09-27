/**
 * PRAVAH - ISRO Bhuvan Shortest Path Service Adapter
 * 
 * Provides authenticated integration with ISRO Bhuvan Shortest Path API
 * strictly via the secure backend proxy (/api/bhuvan/shortest-path) so the
 * access token is never exposed to client-side code.
 * 
 * Requirements:
 * - Real Bhuvan geometry only (no fake/fallback geometry).
 * - Silent continuation with existing routing flow if Bhuvan is unavailable/fails.
 * - Route source tagged as 'BHUVAN'.
 */

export interface BhuvanRouteResult {
  routeSource: 'BHUVAN';
  coordinates: [number, number][];
}

const bhuvanCache = new Map<string, BhuvanRouteResult | null>();

/**
 * Fetches the shortest road path between origin and destination from ISRO Bhuvan.
 * Returns null if Bhuvan is unavailable, coordinates cross state boundaries without support,
 * or the service returns an error.
 */
export async function fetchBhuvanShortestPath(
  origin: [number, number],
  destination: [number, number]
): Promise<BhuvanRouteResult | null> {
  if (!origin || !destination || origin.length < 2 || destination.length < 2) {
    return null;
  }

  const cacheKey = `${origin[0].toFixed(4)},${origin[1].toFixed(4)}->${destination[0].toFixed(4)},${destination[1].toFixed(4)}`;
  if (bhuvanCache.has(cacheKey)) {
    return bhuvanCache.get(cacheKey) || null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout for ISRO Bhuvan routing

    const baseUrl = typeof window !== 'undefined'
      ? ''
      : (typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.PRAVAH_BACKEND_URL) || 'http://localhost:3001';
    const targetUrl = `${baseUrl}/api/bhuvan/shortest-path`;

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        origin: [origin[0], origin[1]],
        destination: [destination[0], destination[1]],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[Bhuvan Routing Service] Proxy returned status ${res.status}`);
      bhuvanCache.set(cacheKey, null);
      return null;
    }

    const data = await res.json();
    if (data?.success && Array.isArray(data?.coordinates) && data.coordinates.length >= 2) {
      const result: BhuvanRouteResult = {
        routeSource: 'BHUVAN',
        coordinates: data.coordinates,
      };
      bhuvanCache.set(cacheKey, result);
      return result;
    }

    // Bhuvan returned expected non-success (e.g. interstate or no road found)
    bhuvanCache.set(cacheKey, null);
    return null;
  } catch (err: any) {
    // If Bhuvan fails or backend proxy is offline, silently continue without breaking flow
    console.warn('[Bhuvan Routing Service] Bhuvan shortest path query skipped/failed:', err?.message || err);
    bhuvanCache.set(cacheKey, null);
    return null;
  }
}
