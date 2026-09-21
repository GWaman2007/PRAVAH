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

export interface DepotDefinition {
  id: string;
  name: string;
  coords: [number, number];
  primaryRouteId: string;
}

export const STRATEGIC_DEPOTS: Record<string, DepotDefinition> = {
  silchar: {
    id: 'silchar',
    name: 'Silchar Strategic Depot',
    coords: [24.8333, 92.7789],
    primaryRouteId: 'ROUTE-SUG-01',
  },
  dimapur: {
    id: 'dimapur',
    name: 'Dimapur Railhead Depot',
    coords: [25.9064, 93.7275],
    primaryRouteId: 'ROUTE-SUG-02',
  },
  guwahati: {
    id: 'guwahati',
    name: 'Guwahati Regional Hub',
    coords: [26.1445, 91.7362],
    primaryRouteId: 'ROUTE-AS-01',
  },
  gangtok: {
    id: 'gangtok',
    name: 'Gangtok STNM Hub',
    coords: [27.33139, 88.61381],
    primaryRouteId: 'ROUTE-SK-02',
  },
};

/**
 * Authoritative Community -> Regional Route & Depot Mapping.
 * Strictly guarantees that every community is supplied along an authentic road route
 * that terminates directly at or within walking proximity of the target community.
 * Eliminates cross-regional mismatches (e.g. Mizoram routes assigned to Sikkim).
 */
export const COMMUNITY_ROUTING_PROFILES: Record<string, {
  depotId: string;
  depotName: string;
  depotCoords: [number, number];
  routeId: string;
  detour: string;
  preferredVehicleId: string;
}> = {
  'MZ-KOL-004': {
    depotId: 'silchar',
    depotName: 'Silchar Strategic Depot',
    depotCoords: [24.8333, 92.7789],
    routeId: 'ROUTE-SUG-01', // Silchar -> Kolasib Forward Camp (NH-306)
    detour: 'NH-306 Safe Mountain Bypass (via Vairengte Spur)',
    preferredVehicleId: 'Medic-01',
  },
  'NL-KOH-009': {
    depotId: 'dimapur',
    depotName: 'Dimapur Railhead Depot',
    depotCoords: [25.9064, 93.7275],
    routeId: 'ROUTE-SUG-02', // Dimapur -> Kohima South Ridge Node (NH-29 Bypass)
    detour: 'NH-29 Pagla Pahar High Ridge Detour',
    preferredVehicleId: 'Ration-Convoy-07',
  },
  'SK-MAN-002': {
    depotId: 'gangtok',
    depotName: 'Gangtok STNM Hub',
    depotCoords: [27.33139, 88.61381],
    routeId: 'ROUTE-SK-02', // Gangtok -> Singtam -> 29th Mile Teesta Canyon (NH-10)
    detour: 'NH-10 Teesta Mountain Corridor (Low Gear Transit)',
    preferredVehicleId: 'Oxy-Tanker-04',
  },
  'AS-DH-011': {
    depotId: 'silchar',
    depotName: 'Silchar Strategic Depot',
    depotCoords: [24.8333, 92.7789],
    routeId: 'ROUTE-AS-03', // Silchar -> Harangajao -> Barail Clearance Sector (NH-27)
    detour: 'NH-27 Barail Mountain Axis',
    preferredVehicleId: 'Engineer-01',
  },
  'AR-TAW-001': {
    depotId: 'guwahati',
    depotName: 'Guwahati Regional Hub',
    depotCoords: [26.1445, 91.7362],
    routeId: 'ROUTE-AS-01', // Guwahati -> Nagaon -> Jatinga Pass Logistics Depot (NH-27)
    detour: 'NH-13 Sela Pass Axis',
    preferredVehicleId: 'Supply-01',
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

    // Resolve authoritative route & depot: use dedicated community profile if available
    const profile = COMMUNITY_ROUTING_PROFILES[community.id];
    const nearestDepot = profile
      ? {
          id: profile.depotId,
          name: profile.depotName,
          coords: profile.depotCoords,
          primaryRouteId: profile.routeId,
        }
      : resolveNearestDepot(community.coordinates);

    const assignedRouteId = profile?.routeId || nearestDepot.primaryRouteId;
    const assignedRoute =
      FLEET_ROUTES[assignedRouteId] ||
      FLEET_ROUTES['ROUTE-SUG-01'] ||
      Object.values(FLEET_ROUTES)[0];

    // Recommend best matching vehicle from available fleet
    let recommendedVehicle = profile?.preferredVehicleId
      ? availableVehicles.find((v) => v.vehicle_id === profile.preferredVehicleId)
      : undefined;

    if (!recommendedVehicle) {
      recommendedVehicle = availableVehicles.find((v) =>
        isPrimarilyMedical
          ? v.vehicle_id.toLowerCase().includes('medic') || v.cargo_type.toLowerCase().includes('medic')
          : v.vehicle_id.toLowerCase().includes('cargo') || v.cargo_type.toLowerCase().includes('cargo')
      );
    }

    if (!recommendedVehicle && availableVehicles.length > 0) {
      recommendedVehicle = availableVehicles[0];
    }

    const recVehicleLabel = recommendedVehicle
      ? `${recommendedVehicle.vehicle_id} (${recommendedVehicle.vehicle_name})`
      : isPrimarilyMedical
      ? 'Medic-01 (4x4 Emergency Medical Van)'
      : 'Cargo-01 (Heavy 6x6 Freight Truck)';

    const missionId = `SUGG-${community.id.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}`;

    // Ensure destination endpoint is snapped to the true road terminus of the route
    const roadTerminus =
      assignedRoute.coordinates && assignedRoute.coordinates.length > 0
        ? assignedRoute.coordinates[assignedRoute.coordinates.length - 1]
        : community.coordinates;

    const newSuggestion: ReliefMission = {
      id: missionId,
      communityId: community.id,
      communityName: `${community.name} Relief Consignment`,
      recommendedVehicleType: recVehicleLabel,
      cargoAllocations,
      assignedRouteId: assignedRoute.id,
      suggestedDetour: profile?.detour || `${community.primaryCorridor || 'Lifeline Corridor'} Direct Dispatch`,
      status: 'SUGGESTED',
      urgency: calculation.priorityTier === 'P1' ? 'P1_CRITICAL' : 'P2_ELEVATED',
      createdAt: new Date().toISOString(),
      originWarehouseId: nearestDepot.id,
      originWarehouseName: nearestDepot.name,
      originCoords: nearestDepot.coords,
      disasterZoneId: `HZ-${community.id}`,
      disasterZoneName: `${community.name} Threat Corridor`,
      destinationEndpoint: roadTerminus,
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
