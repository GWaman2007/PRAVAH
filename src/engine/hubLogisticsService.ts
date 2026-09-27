/**
 * PRAVAH - Hub Logistics & Resource Allocation Service
 * Provides business logic for inventory derivations, feasibility checks,
 * vehicle matching, and candidate hub discovery for community relief demands.
 */

import type {
  ResponseHub,
  HubInventory,
  VehicleTelemetry,
  CommunityBase,
  CandidateHubEvaluation,
} from '../types';
import { haversineDistanceKm } from './gisMath';

/**
 * 1. Available Quantity Calculation
 * Available = Quantity (Total) - Reserved Quantity
 */
export function calculateAvailableQuantity(inv: HubInventory): number {
  return Math.max(0, Number(inv.quantity) - Number(inv.reservedQuantity || 0));
}
export const getAvailableInventory = calculateAvailableQuantity;

/**
 * 2. Low Stock Indicator
 * Triggered when available stock falls at or below configured low-stock threshold
 */
export function isInventoryLowStock(inv: HubInventory): boolean {
  const available = calculateAvailableQuantity(inv);
  const threshold = Number(inv.lowStockThreshold ?? (inv as any).minimumStock ?? 0);
  return available <= threshold;
}
export const isInventoryItemLow = isInventoryLowStock;

/**
 * 3. Check Hub Inventory Feasibility
 * Returns true only if the hub has sufficient available stock for every required item
 */
export function checkHubInventoryFeasibility(
  hubId: string,
  inventory: HubInventory[],
  requiredItems: { resourceName: string; quantity: number }[]
): {
  isFeasible: boolean;
  missingResources: string[];
  availableQuantities: Record<string, number>;
} {
  const hubItems = inventory.filter((item) => item.hubId === hubId);
  const availableMap: Record<string, number> = {};
  const missingResources: string[] = [];

  hubItems.forEach((item) => {
    const rName = (item.resourceName || (item as any).resourceType || '').toLowerCase();
    if (rName) {
      availableMap[rName] = calculateAvailableQuantity(item);
    }
  });

  for (const req of requiredItems) {
    const reqName = (req.resourceName || (req as any).item || (req as any).resourceType || '').toLowerCase();
    // Fuzzy matching on commodity names (e.g. 'rice', 'iv fluids', 'antivenom', 'diesel')
    const matchKey = Object.keys(availableMap).find(
      (k) => (reqName && k.includes(reqName)) || (reqName && reqName.includes(k))
    );

    const available = matchKey ? (availableMap[matchKey] ?? 0) : 0;
    if (available < req.quantity) {
      missingResources.push(
        `${req.resourceName || (req as any).item || 'Resource'} (Needed: ${req.quantity}, Available: ${available})`
      );
    }
  }

  return {
    isFeasible: missingResources.length === 0,
    missingResources,
    availableQuantities: availableMap,
  };
}

/**
 * 4. Check Hub Vehicle Feasibility
 * Returns available vehicles stationed at the hub capable of transporting the payload
 */
export function checkHubVehicleFeasibility(
  hubId: string,
  vehicles: VehicleTelemetry[],
  totalPayloadKg: number,
  requiredCargoCategory?: string
): {
  isFeasible: boolean;
  availableVehicles: VehicleTelemetry[];
  bestVehicle?: VehicleTelemetry;
} {
  const hasDedicatedVehicles = vehicles.some((v) => v.hub_id === hubId);
  const hubVehicles = vehicles.filter(
    (v) =>
      v.status === 'AVAILABLE' &&
      (v.hub_id === hubId || (!hasDedicatedVehicles && (!v.hub_id || v.status === 'AVAILABLE')))
  );

  const reqCat = (requiredCargoCategory || '').toLowerCase();

  const capableVehicles = hubVehicles.filter((v) => {
    const capacity = v.capacity_kg ?? 3500;
    const isPayloadFeasible = capacity >= totalPayloadKg;

    if (!reqCat) return isPayloadFeasible;

    const cargoMatch =
      !v.compatible_cargo_types ||
      v.compatible_cargo_types.length === 0 ||
      v.compatible_cargo_types.some((cat) =>
        Boolean(cat && cat.toLowerCase().includes(reqCat))
      ) ||
      Boolean(v.cargo_type && v.cargo_type.toLowerCase().includes(reqCat));

    return isPayloadFeasible && cargoMatch;
  });

  // Sort by closest capacity fit to minimize wasted capacity
  capableVehicles.sort((a, b) => (a.capacity_kg ?? 3500) - (b.capacity_kg ?? 3500));

  return {
    isFeasible: capableVehicles.length > 0,
    availableVehicles: capableVehicles,
    bestVehicle: capableVehicles[0],
  };
}

/**
 * 5. Candidate Hub Discovery for Community Relief Requirements
 * Evaluates candidate hubs across physical availability and distance
 */
export function findCandidateHubsForCommunity(
  community: { coordinates: [number, number]; id?: string; name?: string } | CommunityBase,
  hubs: ResponseHub[],
  inventory: HubInventory[],
  vehicles: VehicleTelemetry[],
  requirements: { resourceName: string; quantity: number; unit?: string }[] = []
): CandidateHubEvaluation[] {
  const operationalHubs = hubs.filter((h) => h.status !== 'TEMPORARILY_CLOSED');
  const totalPayloadEstimateKg = requirements.reduce((acc, r) => acc + r.quantity, 0);

  const evaluations: CandidateHubEvaluation[] = operationalHubs.map((hub) => {
    const distanceKm = haversineDistanceKm(hub.coordinates, community.coordinates);
    const estDurationMinutes = Math.round((distanceKm / 40) * 60); // 40 km/h nominal mountain speed

    const invCheck = checkHubInventoryFeasibility(hub.id, inventory, requirements);
    const vehCheck = checkHubVehicleFeasibility(hub.id, vehicles, totalPayloadEstimateKg);

    return {
      hub,
      isInventoryFeasible: invCheck.isFeasible,
      isVehicleFeasible: vehCheck.isFeasible,
      missingResources: invCheck.missingResources,
      availableVehicles: vehCheck.availableVehicles,
      distanceKm: Math.round(distanceKm * 10) / 10,
      durationMinutes: estDurationMinutes,
    };
  });

  // Rank candidate hubs: feasible ones first, then sorted by distance
  evaluations.sort((a, b) => {
    const aFeasible = a.isInventoryFeasible && a.isVehicleFeasible ? 1 : 0;
    const bFeasible = b.isInventoryFeasible && b.isVehicleFeasible ? 1 : 0;
    if (aFeasible !== bFeasible) return bFeasible - aFeasible;
    return (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999);
  });

  return evaluations;
}

/**
 * 5b. Demand Evaluation Wrapper for Multi-Factor Hub Discovery
 */
export function evaluateCandidateHubsForDemand(
  communityId: string,
  communityCoords: [number, number],
  requirements: { commodityName: string; quantity: number }[],
  hubs: ResponseHub[],
  inventory: HubInventory[],
  vehicles: VehicleTelemetry[],
  _disruptions?: any,
  _segments?: any
): {
  hub: ResponseHub;
  distanceKm: number;
  hasSufficientInventory: boolean;
  hasAvailableVehicles: boolean;
  roadAccessibilityScore: number;
}[] {
  const commObj = {
    id: communityId,
    name: communityId,
    coordinates: communityCoords,
  };
  const reqNormalized = requirements.map((r) => ({
    resourceName: r.commodityName,
    quantity: r.quantity,
  }));
  const evals = findCandidateHubsForCommunity(commObj, hubs, inventory, vehicles, reqNormalized);
  return evals.map((e) => ({
    hub: e.hub,
    distanceKm: e.distanceKm ?? 0,
    hasSufficientInventory: e.isInventoryFeasible,
    hasAvailableVehicles: e.isVehicleFeasible,
    roadAccessibilityScore: 1.0,
  }));
}

/**
 * 6. Connected Communities for a Selected Hub
 * Maps communities to this hub based on existing primary corridors and strategic depot assignments
 */
export function getConnectedCommunitiesForHub(
  hubId: string,
  hubNameOrCommunities: string | any[],
  maybeCommunities?: any[]
): any[] {
  const lowerId = (hubId || '').toLowerCase();
  const communities: any[] = Array.isArray(hubNameOrCommunities)
    ? hubNameOrCommunities
    : (maybeCommunities || []);
  const lowerName = typeof hubNameOrCommunities === 'string'
    ? hubNameOrCommunities.toLowerCase()
    : lowerId;

  return communities.filter((c: any) => {
    const depotName = (c.nearest_depot_name || c.nearestDepotName || '').toLowerCase();
    const corridor = (c.primary_corridor || c.primaryCorridor || '').toLowerCase();
    const state = c.state || '';

    return (
      depotName.includes(lowerId) ||
      depotName.includes(lowerName.slice(0, 5)) ||
      (lowerId === 'silchar' && (corridor.includes('nh-306') || corridor.includes('nh-27') || corridor.includes('nh-6') || state === 'Mizoram' || state === 'Assam')) ||
      (lowerId === 'dimapur' && (corridor.includes('nh-29') || state === 'Nagaland')) ||
      (lowerId === 'gangtok' && (corridor.includes('nh-10') || state === 'Sikkim')) ||
      (lowerId === 'guwahati' && (corridor.includes('nh-27') || corridor.includes('nh-13') || state === 'Arunachal Pradesh')) ||
      (lowerId === 'shillong' && (corridor.includes('nh-6') || state === 'Meghalaya')) ||
      (lowerId === 'imphal' && (corridor.includes('nh-2') || corridor.includes('nh-37') || state === 'Manipur')) ||
      (lowerId === 'aizawl' && (corridor.includes('nh-306') || state === 'Mizoram')) ||
      (lowerId === 'kohima' && (corridor.includes('nh-29') || corridor.includes('nh-2') || state === 'Nagaland'))
    );
  });
}
