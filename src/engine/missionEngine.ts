/**
 * PRAVAH - Dynamic Relief Mission Engine
 * Generates dynamic mission suggestions from the Preemptive Community Depletion Engine,
 * matches strategic depots and vehicles, and enforces closed-loop delivery lifecycles.
 */

import type {
  ReliefMission,
  CommunityBase,
  VehicleTelemetry,
  CommodityType,
} from '../types';
import { calculateCompositePriority, COMMODITY_CONFIG } from './priorityEngine';
import { FLEET_ROUTES } from '../data/fleetData';

interface DepotDefinition {
  id: string;
  name: string;
  coords: [number, number];
  primaryRouteId: string;
}

const STRATEGIC_DEPOTS: Record<string, DepotDefinition> = {
  silchar: {
    id: 'silchar',
    name: 'Silchar Strategic Depot',
    coords: [24.8333, 92.7789],
    primaryRouteId: 'ROUTE-MZ-04',
  },
  dimapur: {
    id: 'dimapur',
    name: 'Dimapur Railhead Depot',
    coords: [25.9064, 93.7275],
    primaryRouteId: 'ROUTE-NL-01',
  },
  guwahati: {
    id: 'guwahati',
    name: 'Guwahati Regional Hub',
    coords: [26.1445, 91.7362],
    primaryRouteId: 'ROUTE-AS-01',
  },
  gangtok: {
    id: 'gangtok',
    name: 'Siliguri-Gangtok Forward Base',
    coords: [26.7271, 88.4329],
    primaryRouteId: 'ROUTE-MZ-02',
  },
};

/**
 * Determine nearest depot for a given community coordinate
 */
function resolveNearestDepot(coords: [number, number]): DepotDefinition {
  const [lat, lng] = coords;
  // Simple Euclidean distance heuristic for regional depot routing
  let bestDepot = STRATEGIC_DEPOTS.silchar;
  let bestDistSq = Infinity;

  Object.values(STRATEGIC_DEPOTS).forEach((depot) => {
    const dLat = lat - depot.coords[0];
    const dLng = lng - depot.coords[1];
    const distSq = dLat * dLat + dLng * dLng;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      bestDepot = depot;
    }
  });

  return bestDepot;
}

/**
 * Filter ongoing missions: ONLY missions that are IN_TRANSIT or PENDING_ADMIN_CLOSEOUT
 */
export function isMissionOngoing(mission: ReliefMission): boolean {
  return mission.status === 'IN_TRANSIT' || mission.status === 'PENDING_ADMIN_CLOSEOUT';
}

/**
 * Filter suggested missions
 */
export function isMissionSuggested(mission: ReliefMission): boolean {
  return mission.status === 'SUGGESTED';
}

/**
 * Filter delivered/archived missions
 */
export function isMissionDelivered(mission: ReliefMission): boolean {
  return mission.status === 'DELIVERED';
}

/**
 * Generates dynamic mission suggestions based on evaluated community depletion & cutoff countdowns.
 */
export function generateDynamicMissionSuggestions(
  communities: CommunityBase[],
  vehicles: VehicleTelemetry[],
  existingMissions: ReliefMission[] = []
): ReliefMission[] {
  const suggestions: ReliefMission[] = [];

  // Track communities that already have an active suggested or ongoing mission
  const activeCommunityIds = new Set<string>();
  existingMissions.forEach((m) => {
    if (m.status !== 'DELIVERED') {
      activeCommunityIds.add(m.communityId);
    }
  });

  // Track vehicles already assigned to active missions
  const assignedVehicleIds = new Set<string>();
  existingMissions.forEach((m) => {
    if (isMissionOngoing(m) && m.assignedVehicleId) {
      assignedVehicleIds.add(m.assignedVehicleId);
    }
  });

  // Available vehicles for recommendation
  const availableVehicles = vehicles.filter((v) => !assignedVehicleIds.has(v.vehicle_id));

  for (const community of communities) {
    // If community already has an active mission, skip duplicate suggestion
    if (activeCommunityIds.has(community.id)) continue;

    // Run priority calculation engine
    const calculation = calculateCompositePriority(community);

    // Only generate suggestion if priority tier is elevated (P1, P2, or P3 with impending cutoff / deficit)
    const isUrgent =
      calculation.priorityTier === 'P1' ||
      calculation.priorityTier === 'P2' ||
      (calculation.priorityTier === 'P3' && calculation.supplyDeficitFactor >= 0.40) ||
      community.cutoffTimeHours <= 24.0;

    if (!isUrgent) continue;

    // Build cargo allocation to replenish depleted items to standard capacity
    const cargoAllocations: { item: string; quantity: number; unit: string }[] = [];
    const commodityKeys: CommodityType[] = ['IV_FLUIDS', 'ANTIVENOM', 'GRAIN_RICE', 'DIESEL'];

    let isPrimarilyMedical = false;

    commodityKeys.forEach((key) => {
      const state = calculation.commodityDepletions[key];
      const config = COMMODITY_CONFIG[key];
      const deficit = Math.max(0, config.standardCapacity - state.currentStock);

      if (deficit > 0) {
        if (config.isMedical && (key === 'IV_FLUIDS' || key === 'ANTIVENOM')) {
          isPrimarilyMedical = true;
        }
        cargoAllocations.push({
          item: config.label,
          quantity: Math.round(deficit),
          unit: config.unit,
        });
      }
    });

    if (cargoAllocations.length === 0) continue;

    // Resolve nearest depot and route
    const nearestDepot = resolveNearestDepot(community.coordinates);
    const assignedRoute =
      FLEET_ROUTES[nearestDepot.primaryRouteId] ||
      FLEET_ROUTES['ROUTE-MZ-04'] ||
      Object.values(FLEET_ROUTES)[0];

    // Recommend best matching vehicle from available fleet
    let recommendedVehicle = availableVehicles.find((v) =>
      isPrimarilyMedical
        ? v.vehicle_id.toLowerCase().includes('medic') || v.cargo_type.toLowerCase().includes('medic')
        : v.vehicle_id.toLowerCase().includes('cargo') || v.cargo_type.toLowerCase().includes('cargo')
    );

    if (!recommendedVehicle && availableVehicles.length > 0) {
      recommendedVehicle = availableVehicles[0];
    }

    const recVehicleLabel = recommendedVehicle
      ? `${recommendedVehicle.vehicle_id} (${recommendedVehicle.vehicle_name})`
      : isPrimarilyMedical
      ? 'Medic-01 (4x4 Emergency Medical Van)'
      : 'Cargo-01 (Heavy 6x6 Freight Truck)';

    const missionId = `SUGG-${community.id.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}`;

    const newSuggestion: ReliefMission = {
      id: missionId,
      communityId: community.id,
      communityName: `${community.name} Relief Consignment`,
      recommendedVehicleType: recVehicleLabel,
      cargoAllocations,
      assignedRouteId: assignedRoute.id,
      suggestedDetour: `${community.primaryCorridor || 'Lifeline Corridor'} Direct Dispatch`,
      status: 'SUGGESTED',
      urgency: calculation.priorityTier === 'P1' ? 'P1_CRITICAL' : 'P2_ELEVATED',
      createdAt: new Date().toISOString(),
      originWarehouseId: nearestDepot.id,
      originWarehouseName: nearestDepot.name,
      originCoords: nearestDepot.coords,
      disasterZoneId: `HZ-${community.id}`,
      disasterZoneName: `${community.name} Threat Corridor`,
      destinationEndpoint: community.coordinates,
      destinationName: `${community.name} Community Depot`,
      assignedVehicleId: recommendedVehicle?.vehicle_id,
      routeGeometry: assignedRoute.coordinates,
      routeDistanceKm: assignedRoute.distanceKm,
      routeDurationMinutes: assignedRoute.expectedDurationMinutes,
      routeStatus: 'OPTIMAL',
    };

    suggestions.push(newSuggestion);
  }

  return suggestions;
}
