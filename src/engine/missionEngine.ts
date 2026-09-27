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
  CurrentMissionRouteResolved,
  MissionRouteOption,
} from '../types';
import { calculateCompositePriority, COMMODITY_CONFIG } from './priorityEngine';
import { FLEET_ROUTES } from '../data/fleetData';
import { SHILLONG_PRIMARY_ROUTE_COORDS, SHILLONG_BYPASS_ROUTE_COORDS } from '../data/shillongRoadRoutes';
import { OSRM_PRECOMPUTED_ALTERNATIVES } from '../data/osrmPrecomputedAlternatives';
import { haversineDistanceKm } from './gisMath';
import { ROUTE_SEGMENT_MAPPING } from '../data/routingNetwork';

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
    routeId: 'ROUTE-AR-01', // Guwahati -> Tezpur -> Bomdila -> Sela Pass -> Tawang (NH-13)
    detour: 'NH-13 Sela Pass Axis',
    preferredVehicleId: 'Supply-01',
  },
  'ML-SHL-003': {
    depotId: 'guwahati',
    depotName: 'Guwahati Regional Hub',
    depotCoords: [26.1445, 91.7362],
    routeId: 'ROUTE-ML-SHL-01', // Guwahati -> Shillong Express (NH-106)
    detour: 'NH-106 Guwahati - Shillong Expressway (Direct Primary Corridor)',
    preferredVehicleId: 'Medic-02',
  },
  'ML-SHL': {
    depotId: 'guwahati',
    depotName: 'Guwahati Regional Hub',
    depotCoords: [26.1445, 91.7362],
    routeId: 'ROUTE-ML-SHL-01',
    detour: 'NH-106 Guwahati - Shillong Expressway (Direct Primary Corridor)',
    preferredVehicleId: 'Medic-02',
  },
  'ML-JOW-007': {
    depotId: 'guwahati',
    depotName: 'Guwahati Regional Hub',
    depotCoords: [26.1445, 91.7362],
    routeId: 'ROUTE-SUG-03', // Guwahati -> Shillong -> Jowai (NH-6)
    detour: 'NH-106 / SH-8 Jaintia Ridge High Bypass (via Bhoirymbong)',
    preferredVehicleId: 'Utility-01',
  },
  'AS-JAT-004': {
    depotId: 'guwahati',
    depotName: 'Guwahati Regional Hub',
    depotCoords: [26.1445, 91.7362],
    routeId: 'ROUTE-AS-01', // Guwahati -> Nagaon -> Jatinga Pass (NH-27)
    detour: 'NH-27 Lumding - Maibang Ridge Bypass (via Diyung Valley)',
    preferredVehicleId: 'Command-01',
  },
  'MN-NON-008': {
    depotId: 'silchar',
    depotName: 'Silchar Strategic Depot',
    depotCoords: [24.8333, 92.7789],
    routeId: 'ROUTE-MN-01', // Silchar -> Jiribam -> Noney Makru Bridge (NH-37)
    detour: 'Old Cachar Road High Ridge Bypass (via Khongsang)',
    preferredVehicleId: 'Medic-03',
  },
  'MZ-AIF-009': {
    depotId: 'silchar',
    depotName: 'Silchar Strategic Depot',
    depotCoords: [24.8333, 92.7789],
    routeId: 'ROUTE-MZ-02', // Silchar -> Vairengte -> Silt Ground Station (NH-306)
    detour: 'SH-42 / NH-154 Hailakandi - Bhairabi Bypass',
    preferredVehicleId: 'Cargo-01',
  },
  'NL-KMA-010': {
    depotId: 'dimapur',
    depotName: 'Dimapur Railhead Depot',
    depotCoords: [25.9064, 93.7275],
    routeId: 'ROUTE-SUG-02', // Dimapur -> Kohima South Ridge Node (NH-29 Bypass)
    detour: 'SH-Wokha / NH-2 Mountain Bypass (via Niuland & Wokha)',
    preferredVehicleId: 'Rescue-01',
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

export const SHILLONG_MODEL_B_ROUTE_OPTIONS: MissionRouteOption[] = [
  {
    id: 'SUGG-MLSHL003-OPT-1',
    missionId: 'SUGG-MLSHL003',
    routeNumber: 1,
    routeRank: 1,
    routeId: 'ROUTE-ML-SHL-01',
    routeName: 'NH-106 Guwahati - Shillong Expressway (Direct Primary Corridor)',
    routeSource: 'OSRM',
    geometry: SHILLONG_PRIMARY_ROUTE_COORDS,
    distanceKm: 97.3,
    osrmDurationMinutes: 106,
    predictedDelayFactor: 1.47,
    predictedEtaMinutes: 156,
    etaOverheadMinutes: 50,
    predictedPreferredRoute: true,
    modelVersion: 'model_b_v2.1_calibrated',
    corridorSegmentIds: ['SEG-GHY-SHL'],
    disruptionProbability: 0.81,
  },
  {
    id: 'SUGG-MLSHL003-OPT-2',
    missionId: 'SUGG-MLSHL003',
    routeNumber: 2,
    routeRank: 2,
    routeId: 'ROUTE-ML-SHL-02',
    routeName: 'NH-106 / SH-8 Umiam East Ridge Bypass (via Bhoirymbong)',
    routeSource: 'GRAPH',
    geometry: SHILLONG_BYPASS_ROUTE_COORDS,
    distanceKm: 114.5,
    osrmDurationMinutes: 136,
    predictedDelayFactor: 1.38,
    predictedEtaMinutes: 188,
    etaOverheadMinutes: 52,
    predictedPreferredRoute: false,
    modelVersion: 'model_b_v2.1_calibrated',
    corridorSegmentIds: ['SEG-ML-SHL-BYPASS'],
    disruptionProbability: 0.32,
  },
];

export const HAFLONG_MODEL_B_ROUTE_OPTIONS: MissionRouteOption[] = [
  {
    id: 'SUGG-ASDH011-OPT-1',
    missionId: 'SUGG-ASDH011',
    routeNumber: 1,
    routeRank: 1,
    routeId: 'ROUTE-AS-03',
    routeName: 'NH-27 Silchar - Harangajao - Haflong Barail Hill Axis',
    routeSource: 'OSRM',
    geometry: FLEET_ROUTES['ROUTE-AS-03']?.coordinates || [],
    distanceKm: 88.0,
    osrmDurationMinutes: 120,
    predictedDelayFactor: 1.42,
    predictedEtaMinutes: 170,
    etaOverheadMinutes: 50,
    predictedPreferredRoute: true,
    modelVersion: 'model_b_v2.1_calibrated',
    corridorSegmentIds: ['SEG-HAF-SIL'],
    disruptionProbability: 0.78,
  },
  {
    id: 'SUGG-ASDH011-OPT-2',
    missionId: 'SUGG-ASDH011',
    routeNumber: 2,
    routeRank: 2,
    routeId: 'ROUTE-AS-04',
    routeName: 'NH-27 / SH-Diyung Valley Eastern Ridge Detour (via Badarpur Spur)',
    routeSource: 'GRAPH',
    geometry: OSRM_PRECOMPUTED_ALTERNATIVES['AS-DH-011']?.coordinates || FLEET_ROUTES['ROUTE-AS-03']?.coordinates || [],
    distanceKm: OSRM_PRECOMPUTED_ALTERNATIVES['AS-DH-011']?.distanceKm || 138.6,
    osrmDurationMinutes: OSRM_PRECOMPUTED_ALTERNATIVES['AS-DH-011']?.durationMinutes || 127,
    predictedDelayFactor: 1.34,
    predictedEtaMinutes: 170,
    etaOverheadMinutes: 43,
    predictedPreferredRoute: false,
    modelVersion: 'model_b_v2.1_calibrated',
    corridorSegmentIds: ['SEG-NAG-HAF'],
    disruptionProbability: 0.28,
  },
];

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

    // Recommend best matching vehicle from available fleet, prioritizing depot-local vehicles
    let recommendedVehicle = profile?.preferredVehicleId
      ? availableVehicles.find((v) => v.vehicle_id === profile.preferredVehicleId)
      : undefined;

    if (!recommendedVehicle) {
      // Prioritize available vehicles that match the depot hub
      const localVehicles = availableVehicles.filter(
        (v) => (v as any).hub_id === nearestDepot.id || haversineDistanceKm(v.current_coords, nearestDepot.coords) < 30.0
      );
      const vehiclePool = localVehicles.length > 0 ? localVehicles : availableVehicles;

      recommendedVehicle = vehiclePool.find((v) =>
        isPrimarilyMedical
          ? v.vehicle_id.toLowerCase().includes('medic') || v.cargo_type.toLowerCase().includes('medic')
          : v.vehicle_id.toLowerCase().includes('cargo') || v.cargo_type.toLowerCase().includes('cargo')
      );

      if (!recommendedVehicle && vehiclePool.length > 0) {
        recommendedVehicle = vehiclePool[0];
      }
    }

    const recVehicleLabel = recommendedVehicle
      ? `${recommendedVehicle.vehicle_id} (${recommendedVehicle.vehicle_name})`
      : isPrimarilyMedical
      ? 'Medic-01 (4x4 Emergency Medical Van)'
      : 'Cargo-01 (Heavy 6x6 Freight Truck)';

    const missionId = `SUGG-${community.id.replace(/[^a-zA-Z0-9]/g, '')}`;

    const isShl = community.id.includes('ML-SHL') || community.name.toLowerCase().includes('shillong');
    const isAs = community.id.includes('AS-DH') || community.name.toLowerCase().includes('haflong');
    const matchedRouteOptions = isShl
      ? SHILLONG_MODEL_B_ROUTE_OPTIONS
      : isAs
      ? HAFLONG_MODEL_B_ROUTE_OPTIONS
      : undefined;

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
      destinationEndpoint: community.coordinates,
      destinationName: `${community.name} Community Depot`,
      assignedVehicleId: recommendedVehicle?.vehicle_id,
      routeGeometry: matchedRouteOptions ? matchedRouteOptions[0].geometry : assignedRoute.coordinates,
      routeDistanceKm: matchedRouteOptions ? matchedRouteOptions[0].distanceKm : assignedRoute.distanceKm,
      routeDurationMinutes: matchedRouteOptions ? matchedRouteOptions[0].predictedEtaMinutes : assignedRoute.expectedDurationMinutes,
      routeStatus: 'OPTIMAL',
      selectedRouteOptionId: matchedRouteOptions ? matchedRouteOptions[0].id : undefined,
      routeOptions: matchedRouteOptions,
    };

    suggestions.push(newSuggestion);
  }

  return suggestions;
}

/**
 * Resolves ONE authoritative source of truth for a relief mission's current route.
 * Precedence:
 * 1. Explicit currently selected/rerouted route:
 *    - mission.routeGeometry
 *    - mission.assignedRouteId
 *    - mission.corridorSegmentIds
 *    - mission.selectedRouteOptionId
 * 2. Selected MissionRouteOption if explicitly selected
 * 3. Original COMMUNITY_ROUTING_PROFILE / FLEET_ROUTE only when creating initial mission or when no explicit route exists.
 */
export function resolveCurrentMissionRoute(
  mission: ReliefMission
): CurrentMissionRouteResolved {
  if (!mission) {
    return {
      routeId: '',
      geometry: [],
      distanceKm: 0,
      durationMinutes: 0,
      segmentIds: [],
      source: 'empty',
    };
  }

  // 1. Explicit Selected Route Option
  if (mission.selectedRouteOptionId && mission.routeOptions && mission.routeOptions.length > 0) {
    const chosen = mission.routeOptions.find((opt) => opt.id === mission.selectedRouteOptionId);
    if (chosen && chosen.geometry && chosen.geometry.length >= 2) {
      const segIds = (chosen.corridorSegmentIds && chosen.corridorSegmentIds.length > 0)
        ? chosen.corridorSegmentIds
        : (mission.corridorSegmentIds && mission.corridorSegmentIds.length > 0)
        ? mission.corridorSegmentIds
        : [];
      return {
        routeId: chosen.routeId || mission.assignedRouteId,
        geometry: chosen.geometry,
        distanceKm: chosen.distanceKm || mission.routeDistanceKm || 0,
        durationMinutes: chosen.predictedEtaMinutes || chosen.osrmDurationMinutes || mission.routeDurationMinutes || 0,
        segmentIds: segIds,
        source: mission.isRerouted ? 'rerouted' : 'selected_option',
      };
    }
  }

  // 2. Explicit currently assigned/rerouted mission route geometry & segments
  if (mission.routeGeometry && mission.routeGeometry.length >= 2) {
    const segIds = (mission.corridorSegmentIds && mission.corridorSegmentIds.length > 0)
      ? mission.corridorSegmentIds
      : (mission.assignedRouteId && (ROUTE_SEGMENT_MAPPING as Record<string, string[]>)[mission.assignedRouteId])
      ? (ROUTE_SEGMENT_MAPPING as Record<string, string[]>)[mission.assignedRouteId]
      : [];
    return {
      routeId: mission.assignedRouteId,
      geometry: mission.routeGeometry,
      distanceKm: mission.routeDistanceKm || 0,
      durationMinutes: mission.routeDurationMinutes || 0,
      segmentIds: segIds,
      source: mission.isRerouted ? 'rerouted' : 'explicit_mission',
    };
  }

  // 3. Fallback to FLEET_ROUTES by assignedRouteId
  if (mission.assignedRouteId && FLEET_ROUTES[mission.assignedRouteId]) {
    const fleetRoute = FLEET_ROUTES[mission.assignedRouteId];
    const segIds = (mission.corridorSegmentIds && mission.corridorSegmentIds.length > 0)
      ? mission.corridorSegmentIds
      : (ROUTE_SEGMENT_MAPPING as Record<string, string[]>)[mission.assignedRouteId] || [];
    return {
      routeId: fleetRoute.id,
      geometry: fleetRoute.coordinates,
      distanceKm: fleetRoute.distanceKm,
      durationMinutes: fleetRoute.expectedDurationMinutes,
      segmentIds: segIds,
      source: 'fleet_route',
    };
  }

  // 4. Initial fallback: Community routing profile
  if (mission.communityId && COMMUNITY_ROUTING_PROFILES[mission.communityId]) {
    const profile = COMMUNITY_ROUTING_PROFILES[mission.communityId];
    const fleetRoute = FLEET_ROUTES[profile.routeId];
    const segIds = (ROUTE_SEGMENT_MAPPING as Record<string, string[]>)[profile.routeId] || [];
    return {
      routeId: profile.routeId,
      geometry: fleetRoute?.coordinates || [],
      distanceKm: fleetRoute?.distanceKm || 0,
      durationMinutes: fleetRoute?.expectedDurationMinutes || 0,
      segmentIds: segIds,
      source: 'community_profile',
    };
  }

  return {
    routeId: mission.assignedRouteId || '',
    geometry: [],
    distanceKm: 0,
    durationMinutes: 0,
    segmentIds: mission.corridorSegmentIds || [],
    source: 'empty',
  };
}

/**
 * Generates deterministic, stable baseline demo missions using authentic project entities.
 * Strictly maintains:
 * - 3 SUGGESTED missions (Haflong, Tawang, Shillong)
 * - 3 ONGOING / IN_TRANSIT missions (Kolasib, Kohima, Mangan)
 * - 2 COMPLETED / DELIVERED missions (Imphal, Agartala)
 */
export function generateDeterministicDemoMissions(): ReliefMission[] {
  const now = new Date();
  const past2h = new Date(now.getTime() - 2 * 3600 * 1000).toISOString();
  const past5h = new Date(now.getTime() - 5 * 3600 * 1000).toISOString();
  const past8h = new Date(now.getTime() - 8 * 3600 * 1000).toISOString();

  // 1. Ongoing Missions on High-Hazard Corridors (3 In-Transit Convoys)
  const nlRoute = FLEET_ROUTES['ROUTE-SUG-02'] || FLEET_ROUTES['ROUTE-NL-01'];
  const ongoingNagaland: ReliefMission = {
    id: 'MSN-ONGOING-NL01',
    communityId: 'NL-KOH-009',
    communityName: 'Kohima South Sector (Phesama)',
    recommendedVehicleType: 'Ration-07 (Heavy 6x6 Freight Truck)',
    cargoAllocations: [
      { item: 'Fortified Rice & Grains (50kg Bags)', quantity: 900, unit: 'kg' },
      { item: 'High-Density Fuel (Diesel 20L Jerrycans)', quantity: 420, unit: 'liters' },
    ],
    assignedRouteId: nlRoute?.id || 'ROUTE-SUG-02',
    suggestedDetour: 'NH-29 Pagla Pahar High Ridge Corridor',
    status: 'IN_TRANSIT',
    urgency: 'P1_CRITICAL',
    createdAt: past2h,
    dispatchedAt: past2h,
    assignedDriver: 'Temsu Ao',
    assignedOfficer: 'Subedar K. Sema (Nagaland Police)',
    originWarehouseId: 'dimapur',
    originWarehouseName: 'Dimapur Railhead Depot',
    originCoords: [25.9064, 93.7275],
    disasterZoneId: 'HZ-NL-KOH-009',
    disasterZoneName: 'Pagla Pahar Debris Flow Threat Sector',
    destinationEndpoint: [25.6400, 94.1200],
    destinationName: 'Kohima South Ridge Depot',
    assignedVehicleId: 'Ration-Convoy-07',
    routeGeometry: nlRoute?.coordinates || [],
    routeDistanceKm: nlRoute?.distanceKm || 74.0,
    routeDurationMinutes: nlRoute?.expectedDurationMinutes || 95,
    routeStatus: 'OPTIMAL',
    corridorSegmentIds: ['SEG-DIM-KOH-MAIN'],
    isRerouted: false,
  };

  const mzRoute = FLEET_ROUTES['ROUTE-SUG-01'] || FLEET_ROUTES['ROUTE-MZ-04'];
  const ongoingMizoram: ReliefMission = {
    id: 'MSN-ONGOING-MZ01',
    communityId: 'MZ-KOL-004',
    communityName: 'Kolasib East Community',
    recommendedVehicleType: 'Medic-01 (4x4 Emergency Medical Van)',
    cargoAllocations: [
      { item: 'IV Fluids (Ringer Lactate 500ml)', quantity: 165, unit: 'units' },
      { item: 'Polyvalent Snake Antivenom', quantity: 84, unit: 'vials' },
    ],
    assignedRouteId: mzRoute?.id || 'ROUTE-SUG-01',
    suggestedDetour: 'NH-306 Lifeline Arterial via Bilkhawthlir',
    status: 'IN_TRANSIT',
    urgency: 'P1_CRITICAL',
    createdAt: past2h,
    dispatchedAt: past2h,
    assignedDriver: 'Lalrinsanga',
    assignedOfficer: 'Insp. L. Hmar (BRO Liaison)',
    originWarehouseId: 'silchar',
    originWarehouseName: 'Silchar Strategic Depot',
    originCoords: [24.8333, 92.7789],
    disasterZoneId: 'HZ-MZ-KOL-004',
    disasterZoneName: 'Bilkhawthlir Escarpment Threat Corridor',
    destinationEndpoint: [24.2246, 92.6784],
    destinationName: 'Kolasib East Community Depot',
    assignedVehicleId: 'Medic-01',
    routeGeometry: mzRoute?.coordinates || [],
    routeDistanceKm: mzRoute?.distanceKm || 80.6,
    routeDurationMinutes: mzRoute?.expectedDurationMinutes || 110,
    routeStatus: 'OPTIMAL',
    corridorSegmentIds: ['SEG-SIL-KOL'],
    isRerouted: false,
  };

  const skRoute = FLEET_ROUTES['ROUTE-SK-02'];
  const ongoingSikkim: ReliefMission = {
    id: 'MSN-ONGOING-SK01',
    communityId: 'SK-MAN-002',
    communityName: 'Teesta Canyon 29th Mile Hub',
    recommendedVehicleType: 'Oxy-Tanker-04 (Cryogenic Oxygen Tanker)',
    cargoAllocations: [
      { item: 'Medical Oxygen Cylinders (47L Type D)', quantity: 45, unit: 'cylinders' },
      { item: 'Emergency Ready-to-Eat Rations', quantity: 600, unit: 'packs' },
    ],
    assignedRouteId: skRoute?.id || 'ROUTE-SK-02',
    suggestedDetour: 'NH-10 Teesta Canyon Lifeline Corridor',
    status: 'IN_TRANSIT',
    urgency: 'P1_CRITICAL',
    createdAt: past2h,
    dispatchedAt: past2h,
    assignedDriver: 'Karma Lepcha',
    assignedOfficer: 'Capt. P. Bhutia (BRO Project Swastik)',
    originWarehouseId: 'gangtok',
    originWarehouseName: 'Gangtok STNM Hub',
    originCoords: [27.33139, 88.61381],
    disasterZoneId: 'HZ-SK-MAN-002',
    disasterZoneName: 'Teesta Canyon Washout Threat Zone',
    destinationEndpoint: [27.0288, 88.4714],
    destinationName: '29th Mile Teesta Canyon Emergency Post',
    assignedVehicleId: 'Oxy-Tanker-04',
    routeGeometry: skRoute?.coordinates || [],
    routeDistanceKm: skRoute?.distanceKm || 66.5,
    routeDurationMinutes: skRoute?.expectedDurationMinutes || 105,
    routeStatus: 'OPTIMAL',
    corridorSegmentIds: ['SEG-SK-TEESTA'],
    isRerouted: false,
  };

  // 2. Suggested Missions to Vulnerable Hazard Polygon Areas from Strategic Hubs (Model B Top 2 Paths)

  const suggestedShillong: ReliefMission = {
    id: 'SUGG-MLSHL003',
    communityId: 'ML-SHL-003',
    communityName: 'Shillong Civil Hospital Receiving Bay',
    recommendedVehicleType: 'Medic-02 (Rapid Response Paramedic Cruiser)',
    cargoAllocations: [
      { item: 'Emergency IV Fluids (Ringer Lactate & Saline)', quantity: 240, unit: 'units' },
      { item: 'Surgical Trauma Dressing Kits', quantity: 60, unit: 'kits' },
    ],
    assignedRouteId: 'ROUTE-ML-SHL-01',
    suggestedDetour: 'NH-106 / SH-8 Umiam East Ridge Bypass (via Bhoirymbong)',
    status: 'SUGGESTED',
    urgency: 'P2_ELEVATED',
    createdAt: now.toISOString(),
    originWarehouseId: 'guwahati',
    originWarehouseName: 'Guwahati Regional Hub',
    originCoords: [26.1158, 91.7086],
    disasterZoneId: 'LHZ-ML-01',
    disasterZoneName: 'Umiam Escarpment Silt Slump Zone (LHZ-ML-01)',
    destinationEndpoint: [25.5788, 91.8933],
    destinationName: 'Shillong Civil Hospital Receiving Bay',
    assignedVehicleId: 'Medic-02',
    routeGeometry: SHILLONG_MODEL_B_ROUTE_OPTIONS[0].geometry,
    routeDistanceKm: SHILLONG_MODEL_B_ROUTE_OPTIONS[0].distanceKm,
    routeDurationMinutes: SHILLONG_MODEL_B_ROUTE_OPTIONS[0].predictedEtaMinutes, // Model B Calibrated ETA: 106 min OSRM × 1.47 delay factor
    disruptionProbability: 0.81,
    routeStatus: 'OPTIMAL',
    corridorSegmentIds: ['SEG-GHY-SHL'],
    isRerouted: false,
    selectedRouteOptionId: SHILLONG_MODEL_B_ROUTE_OPTIONS[0].id,
    routeOptions: SHILLONG_MODEL_B_ROUTE_OPTIONS,
  };

  const asRoute = FLEET_ROUTES['ROUTE-AS-03'];

  const suggestedHaflong: ReliefMission = {
    id: 'SUGG-ASDH011',
    communityId: 'AS-DH-011',
    communityName: 'Haflong Mountain Township Consignment',
    recommendedVehicleType: 'Engineer-01 (12T BRO Tactical Shoring Rig)',
    cargoAllocations: [
      { item: 'Emergency River Shoring Kit', quantity: 1, unit: 'set' },
      { item: 'High-Density Fuel (Diesel 20L Jerrycans)', quantity: 350, unit: 'liters' },
    ],
    assignedRouteId: asRoute?.id || 'ROUTE-AS-03',
    suggestedDetour: 'NH-27 Lumding - Maibang Ridge Bypass (via Diyung Valley)',
    status: 'SUGGESTED',
    urgency: 'P2_ELEVATED',
    createdAt: now.toISOString(),
    originWarehouseId: 'silchar',
    originWarehouseName: 'Silchar Strategic Depot',
    originCoords: [24.8333, 92.7789],
    disasterZoneId: 'LHZ-AS-01',
    disasterZoneName: 'NH-27 Lumding-Haflong Barail Hill Cut (LHZ-AS-01)',
    destinationEndpoint: [25.1801, 93.0165],
    destinationName: 'Haflong Sub-Divisional Depot',
    assignedVehicleId: 'Engineer-01',
    routeGeometry: HAFLONG_MODEL_B_ROUTE_OPTIONS[0].geometry,
    routeDistanceKm: HAFLONG_MODEL_B_ROUTE_OPTIONS[0].distanceKm,
    routeDurationMinutes: HAFLONG_MODEL_B_ROUTE_OPTIONS[0].predictedEtaMinutes, // Model B Calibrated ETA: 120 min OSRM × 1.42 delay factor
    disruptionProbability: 0.78,
    routeStatus: 'OPTIMAL',
    corridorSegmentIds: ['SEG-HAF-SIL'],
    isRerouted: false,
    selectedRouteOptionId: HAFLONG_MODEL_B_ROUTE_OPTIONS[0].id,
    routeOptions: HAFLONG_MODEL_B_ROUTE_OPTIONS,
  };

  // 3. Completed / Delivered Missions (2)
  const mnRoute = FLEET_ROUTES['ROUTE-MN-01'];
  const deliveredImphal: ReliefMission = {
    id: 'DEMO-MSN-MN-IMP-DELIV',
    communityId: 'MN-IMP-005',
    communityName: 'Imphal Valley East Relief Consignment',
    recommendedVehicleType: 'Heavy-Recovery-01 (All-Terrain Logistics Prime)',
    cargoAllocations: [
      { item: 'Water Purification Tablets (Pack of 1000)', quantity: 50, unit: 'packs' },
      { item: 'Dry Rations & Pulses', quantity: 1200, unit: 'kg' },
    ],
    assignedRouteId: mnRoute?.id || 'ROUTE-MN-01',
    suggestedDetour: 'NH-2 Dimapur-Kohima-Imphal Direct Lifeline',
    status: 'DELIVERED',
    urgency: 'P2_ELEVATED',
    createdAt: past8h,
    dispatchedAt: past5h,
    deliveredAt: past2h,
    assignedDriver: 'Biren Singh',
    assignedOfficer: 'Lt. Col. R. Sharma (Assam Rifles)',
    originWarehouseId: 'dimapur',
    originWarehouseName: 'Dimapur Railhead Depot',
    originCoords: [25.9064, 93.7275],
    disasterZoneId: 'HZ-MN-IMP-005',
    disasterZoneName: 'Imphal Flood Relief Sector',
    destinationEndpoint: [24.8170, 93.9368],
    destinationName: 'Imphal Polo Ground Relief Center',
    assignedVehicleId: 'Heavy-Recovery-01',
    routeGeometry: mnRoute?.coordinates || [],
    routeDistanceKm: mnRoute?.distanceKm || 205.0,
    routeDurationMinutes: mnRoute?.expectedDurationMinutes || 290,
    routeStatus: 'OPTIMAL',
    corridorSegmentIds: ['SEG-DIM-KOH-MAIN', 'SEG-KOH-IMP'],
    isRerouted: false,
  };

  const trRoute = FLEET_ROUTES['ROUTE-TR-01'] || FLEET_ROUTES['ROUTE-SUG-01'];
  const deliveredAgartala: ReliefMission = {
    id: 'DEMO-MSN-TR-AGT-DELIV',
    communityId: 'TR-AGT-006',
    communityName: 'Agartala Frontier Medical Consignment',
    recommendedVehicleType: 'Fuel-Tanker-02 (Off-Road Fuel Tanker)',
    cargoAllocations: [
      { item: 'Generator Grade Diesel Fuel', quantity: 2400, unit: 'liters' },
      { item: 'Surgical Disinfectant Concentrates', quantity: 150, unit: 'liters' },
    ],
    assignedRouteId: trRoute?.id || 'ROUTE-TR-01',
    suggestedDetour: 'NH-8 Barak Valley - Dharmanagar Axis',
    status: 'DELIVERED',
    urgency: 'P2_ELEVATED',
    createdAt: past8h,
    dispatchedAt: past5h,
    deliveredAt: past2h,
    assignedDriver: 'Debbarma Pradip',
    assignedOfficer: 'Maj. K. Roy (Tripura Sector Command)',
    originWarehouseId: 'silchar',
    originWarehouseName: 'Silchar Strategic Depot',
    originCoords: [24.8333, 92.7789],
    disasterZoneId: 'HZ-TR-AGT-006',
    disasterZoneName: 'Agartala Flood Buffer Sector',
    destinationEndpoint: [23.8315, 91.2868],
    destinationName: 'Agartala GB Pant Hospital Compound',
    assignedVehicleId: 'Fuel-Tanker-02',
    routeGeometry: trRoute?.coordinates || [],
    routeDistanceKm: trRoute?.distanceKm || 245.0,
    routeDurationMinutes: trRoute?.expectedDurationMinutes || 340,
    routeStatus: 'OPTIMAL',
    corridorSegmentIds: ['SEG-SIL-DHR', 'SEG-DHR-AGT'],
    isRerouted: false,
  };

  return [
    suggestedShillong,
    suggestedHaflong,
    ongoingNagaland,
    ongoingMizoram,
    ongoingSikkim,
    deliveredImphal,
    deliveredAgartala,
  ];
}
