/**
 * PRAVAH - Dynamic Relief Mission Engine
 * Generates dynamic mission suggestions from the Preemptive Community Depletion Engine,
 * matches strategic depots and vehicles, and enforces closed-loop delivery lifecycles.
 */

import type {
  ReliefMission,
  CommunityBase,
  CommunityWithCalculation,
  VehicleTelemetry,
  CommodityType,
  CurrentMissionRouteResolved,
  MissionRouteOption,
  ResourceRequest,
  FieldOfficerProfile,
} from '../types';
import { calculateCompositePriority, COMMODITY_CONFIG } from './priorityEngine';
import { FLEET_ROUTES } from '../data/fleetData';
import { SHILLONG_PRIMARY_ROUTE_COORDS, SHILLONG_BYPASS_ROUTE_COORDS } from '../data/shillongRoadRoutes';
import { OSRM_PRECOMPUTED_ALTERNATIVES } from '../data/osrmPrecomputedAlternatives';
import { haversineDistanceKm } from './gisMath';
import { ROUTE_SEGMENT_MAPPING } from '../data/routingNetwork';
import {
  buildSynchronousSpatialSegments,
  calculateSpatialRouteExposure,
} from './spatialSegmentService';

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

/**
 * Helper to attach 5 equal-distance spatial Model-A segments and exposure metrics
 */
function attachSpatialSegmentsToOption(opt: any, rainfall = 24.0): MissionRouteOption {
  const segs = buildSynchronousSpatialSegments(opt.routeId || opt.id, opt.geometry, rainfall);
  const exp = calculateSpatialRouteExposure(segs);
  return {
    ...opt,
    spatialSegments: segs,
    highRiskSegmentCount: exp.highRiskSegmentCount,
    restrictedSegmentCount: exp.restrictedSegmentCount,
    blockedSegmentCount: exp.blockedSegmentCount,
    meanDisruptionProbability: exp.meanProbability,
    isFeasible: exp.blockedSegmentCount === 0,
  };
}

export const SHILLONG_MODEL_B_ROUTE_OPTIONS: MissionRouteOption[] = [
  {
    id: 'SUGG-MLSHL003-OPT-1',
    missionId: 'SUGG-MLSHL003',
    routeNumber: 1,
    routeRank: 1,
    routeId: 'ROUTE-ML-SHL-02',
    routeName: 'NH-106 / SH-8 Umiam East Ridge Bypass (via Bhoirymbong)',
    routeSource: 'GRAPH',
    geometry: SHILLONG_BYPASS_ROUTE_COORDS,
    distanceKm: 114.5,
    osrmDurationMinutes: 136,
    predictedDelayFactor: 1.38,
    predictedEtaMinutes: 188,
    etaOverheadMinutes: 52,
    predictedPreferredRoute: true,
    modelVersion: 'model_b_v2.1_calibrated',
    corridorSegmentIds: ['SEG-ML-SHL-BYPASS'],
    disruptionProbability: 0.18,
  },
  {
    id: 'SUGG-MLSHL003-OPT-2',
    missionId: 'SUGG-MLSHL003',
    routeNumber: 2,
    routeRank: 2,
    routeId: 'ROUTE-ML-SHL-01',
    routeName: 'NH-106 Guwahati - Shillong Expressway (Direct Primary Corridor)',
    routeSource: 'OSRM',
    geometry: SHILLONG_PRIMARY_ROUTE_COORDS,
    distanceKm: 97.3,
    osrmDurationMinutes: 106,
    predictedDelayFactor: 1.47,
    predictedEtaMinutes: 156,
    etaOverheadMinutes: 50,
    predictedPreferredRoute: false,
    modelVersion: 'model_b_v2.1_calibrated',
    corridorSegmentIds: ['SEG-GHY-SHL'],
    disruptionProbability: 0.81,
  },
].map((opt) => attachSpatialSegmentsToOption(opt, 18.0));

export const HAFLONG_MODEL_B_ROUTE_OPTIONS: MissionRouteOption[] = [
  {
    id: 'SUGG-ASDH011-OPT-1',
    missionId: 'SUGG-ASDH011',
    routeNumber: 1,
    routeRank: 1,
    routeId: 'ROUTE-AS-04',
    routeName: 'NH-27 / SH-Diyung Valley Eastern Ridge Detour (via Badarpur Spur)',
    routeSource: 'GRAPH',
    geometry: OSRM_PRECOMPUTED_ALTERNATIVES['AS-DH-011']?.coordinates || FLEET_ROUTES['ROUTE-AS-03']?.coordinates || [],
    distanceKm: OSRM_PRECOMPUTED_ALTERNATIVES['AS-DH-011']?.distanceKm || 138.6,
    osrmDurationMinutes: OSRM_PRECOMPUTED_ALTERNATIVES['AS-DH-011']?.durationMinutes || 127,
    predictedDelayFactor: 1.34,
    predictedEtaMinutes: 170,
    etaOverheadMinutes: 43,
    predictedPreferredRoute: true,
    modelVersion: 'model_b_v2.1_calibrated',
    corridorSegmentIds: ['SEG-NAG-HAF'],
    disruptionProbability: 0.22,
  },
  {
    id: 'SUGG-ASDH011-OPT-2',
    missionId: 'SUGG-ASDH011',
    routeNumber: 2,
    routeRank: 2,
    routeId: 'ROUTE-AS-03',
    routeName: 'NH-27 Silchar - Harangajao - Haflong Barail Hill Axis',
    routeSource: 'OSRM',
    geometry: FLEET_ROUTES['ROUTE-AS-03']?.coordinates || [],
    distanceKm: 88.0,
    osrmDurationMinutes: 120,
    predictedDelayFactor: 1.42,
    predictedEtaMinutes: 170,
    etaOverheadMinutes: 50,
    predictedPreferredRoute: false,
    modelVersion: 'model_b_v2.1_calibrated',
    corridorSegmentIds: ['SEG-HAF-SIL'],
    disruptionProbability: 0.78,
  },
].map((opt) => attachSpatialSegmentsToOption(opt, 22.0));

export const KOLASIB_MODEL_B_ROUTE_OPTIONS: MissionRouteOption[] = [
  {
    id: 'SUGG-MZKOL004-OPT-1',
    missionId: 'SUGG-MZKOL004',
    routeNumber: 1,
    routeRank: 1,
    routeId: 'ROUTE-MZ-BHAIRABI',
    routeName: 'NH-306 / SH-42 Bhairabi Ridge Bypass (Safe Mountain Corridor)',
    routeSource: 'GRAPH',
    geometry: OSRM_PRECOMPUTED_ALTERNATIVES['MZ-KOL-004']?.coordinates || FLEET_ROUTES['ROUTE-SUG-01']?.coordinates || [],
    distanceKm: OSRM_PRECOMPUTED_ALTERNATIVES['MZ-KOL-004']?.distanceKm || 158.6,
    osrmDurationMinutes: OSRM_PRECOMPUTED_ALTERNATIVES['MZ-KOL-004']?.durationMinutes || 175,
    predictedDelayFactor: 1.22,
    predictedEtaMinutes: 195,
    etaOverheadMinutes: 20,
    predictedPreferredRoute: true,
    modelVersion: 'model_b_v2.1_calibrated',
    corridorSegmentIds: ['SEG-SIL-KOL'],
    disruptionProbability: 0.20,
  },
  {
    id: 'SUGG-MZKOL004-OPT-2',
    missionId: 'SUGG-MZKOL004',
    routeNumber: 2,
    routeRank: 2,
    routeId: 'ROUTE-SUG-01',
    routeName: 'NH-306 Direct Lifeline Arterial via Bilkhawthlir (Active Mudflow Threat)',
    routeSource: 'OSRM',
    geometry: FLEET_ROUTES['ROUTE-SUG-01']?.coordinates || [],
    distanceKm: 95.5,
    osrmDurationMinutes: 110,
    predictedDelayFactor: 1.55,
    predictedEtaMinutes: 170,
    etaOverheadMinutes: 60,
    predictedPreferredRoute: false,
    modelVersion: 'model_b_v2.1_calibrated',
    corridorSegmentIds: ['SEG-SIL-KOL'],
    disruptionProbability: 0.82,
  },
].map((opt) => attachSpatialSegmentsToOption(opt, 20.0));

export const TAWANG_MODEL_B_ROUTE_OPTIONS: MissionRouteOption[] = [
  {
    id: 'SUGG-ARTAW001-OPT-1',
    missionId: 'SUGG-ARTAW001',
    routeNumber: 1,
    routeRank: 1,
    routeId: 'ROUTE-AR-ALT',
    routeName: 'Trans-Arunachal Highway via Orang - Kalaktang - Rupa (Low Hazard Bypass)',
    routeSource: 'GRAPH',
    geometry: OSRM_PRECOMPUTED_ALTERNATIVES['AR-TAW-001']?.coordinates || FLEET_ROUTES['ROUTE-AR-01']?.coordinates || [],
    distanceKm: OSRM_PRECOMPUTED_ALTERNATIVES['AR-TAW-001']?.distanceKm || 447.0,
    osrmDurationMinutes: OSRM_PRECOMPUTED_ALTERNATIVES['AR-TAW-001']?.durationMinutes || 480,
    predictedDelayFactor: 1.25,
    predictedEtaMinutes: 600,
    etaOverheadMinutes: 120,
    predictedPreferredRoute: true,
    modelVersion: 'model_b_v2.1_calibrated',
    corridorSegmentIds: ['SEG-GHY-TAW'],
    disruptionProbability: 0.22,
  },
  {
    id: 'SUGG-ARTAW001-OPT-2',
    missionId: 'SUGG-ARTAW001',
    routeNumber: 2,
    routeRank: 2,
    routeId: 'ROUTE-AR-01',
    routeName: 'NH-13 Bhalukpong - Bomdila - Sela Pass Axis (Severe Avalanche Risk)',
    routeSource: 'OSRM',
    geometry: FLEET_ROUTES['ROUTE-AR-01']?.coordinates || [],
    distanceKm: 488.5,
    osrmDurationMinutes: 535,
    predictedDelayFactor: 1.62,
    predictedEtaMinutes: 865,
    etaOverheadMinutes: 330,
    predictedPreferredRoute: false,
    modelVersion: 'model_b_v2.1_calibrated',
    corridorSegmentIds: ['SEG-GHY-TAW'],
    disruptionProbability: 0.79,
  },
].map((opt) => attachSpatialSegmentsToOption(opt, 25.0));

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
          ? (v.vehicle_id || '').toLowerCase().includes('medic') || (v.cargo_type || '').toLowerCase().includes('medic')
          : (v.vehicle_id || '').toLowerCase().includes('cargo') || (v.cargo_type || '').toLowerCase().includes('cargo')
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

    const isShl = community.id.includes('ML-SHL') || (community.name || '').toLowerCase().includes('shillong');
    const isAs = community.id.includes('AS-DH') || (community.name || '').toLowerCase().includes('haflong');
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

  // 1. Ongoing Missions on High-Hazard Corridors (4 In-Transit Convoys)
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
    disruptionProbability: 0.15,
    initialDisruptionProbability: 0.15,
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
    urgency: 'P2_ELEVATED',
    createdAt: past2h,
    dispatchedAt: past2h,
    assignedDriver: 'Rajesh Mech',
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
    disruptionProbability: 0.28,
    initialDisruptionProbability: 0.28,
  };

  const skRoute = FLEET_ROUTES['ROUTE-SK-02'];
  const skBypassCoords = OSRM_PRECOMPUTED_ALTERNATIVES['SK-MAN-002']?.coordinates || [];
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
    suggestedDetour: 'NH-717A Pakyong - Lava Ridge Bypass (Safe Mountain Corridor)',
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
    routeStatus: 'UNAVAILABLE',
    corridorSegmentIds: ['SEG-SK-TEESTA'],
    isRerouted: false,
    disruptionProbability: 0.86,
    initialDisruptionProbability: 0.86,
    routeOptions: [
      {
        id: 'ROUTE-SK-02',
        missionId: 'MSN-ONGOING-SK01',
        routeNumber: 1,
        routeRank: 1,
        routeId: 'ROUTE-SK-02',
        routeName: 'NH-10 Teesta Canyon Lifeline (Severed at 29th Mile)',
        routeSource: 'OSRM',
        geometry: skRoute?.coordinates || [],
        distanceKm: 66.5,
        osrmDurationMinutes: 105,
        predictedDelayFactor: 1.85,
        predictedEtaMinutes: 195,
        etaOverheadMinutes: 90,
        predictedPreferredRoute: false,
        corridorSegmentIds: ['SEG-SK-TEESTA'],
        disruptionProbability: 0.86,
        modelVersion: 'model_b_v2.1_calibrated',
      },
      {
        id: 'ROUTE-SK-02_BYPASS',
        missionId: 'MSN-ONGOING-SK01',
        routeNumber: 2,
        routeRank: 2,
        routeId: 'ROUTE-SK-02_BYPASS',
        routeName: 'NH-717A Pakyong - Lava Ridge Bypass (Safe Mountain Corridor)',
        routeSource: 'GRAPH',
        geometry: skBypassCoords,
        distanceKm: 83.8,
        osrmDurationMinutes: 94,
        predictedDelayFactor: 1.15,
        predictedEtaMinutes: 108,
        etaOverheadMinutes: 14,
        predictedPreferredRoute: true,
        corridorSegmentIds: ['SEG-SK-EAST'],
        disruptionProbability: 0.18,
        modelVersion: 'model_b_v2.1_calibrated',
      },
    ],
  };

  const asOngoingRoute = FLEET_ROUTES['ROUTE-AS-03'];
  const ongoingAssam: ReliefMission = {
    id: 'MSN-ONGOING-AS01',
    communityId: 'AS-DH-011',
    communityName: 'Haflong Mountain Township Consignment',
    recommendedVehicleType: 'Cargo-01 (Heavy 10T Logistics Truck)',
    cargoAllocations: [
      { item: 'Dry Rations & Pulses (50kg Bags)', quantity: 400, unit: 'kg' },
      { item: 'High-Density Fuel (Diesel 20L Jerrycans)', quantity: 200, unit: 'liters' },
    ],
    assignedRouteId: asOngoingRoute?.id || 'ROUTE-AS-03',
    suggestedDetour: 'NH-27 Silchar - Haflong Expressway',
    status: 'IN_TRANSIT',
    urgency: 'P2_ELEVATED',
    createdAt: past2h,
    dispatchedAt: past2h,
    assignedDriver: 'Malsawma Lushai',
    assignedOfficer: 'Maj. S. Saikia (BRO Field Officer)',
    originWarehouseId: 'silchar',
    originWarehouseName: 'Silchar Strategic Depot',
    originCoords: [24.8333, 92.7789],
    disasterZoneId: 'LHZ-AS-01',
    disasterZoneName: 'NH-27 Barail Hill Clearance Sector',
    destinationEndpoint: [25.1801, 93.0165],
    destinationName: 'Haflong Sub-Divisional Depot',
    assignedVehicleId: 'Cargo-01',
    routeGeometry: asOngoingRoute?.coordinates || [],
    routeDistanceKm: asOngoingRoute?.distanceKm || 88.0,
    routeDurationMinutes: asOngoingRoute?.expectedDurationMinutes || 120,
    routeStatus: 'OPTIMAL',
    corridorSegmentIds: ['SEG-HAF-SIL'],
    isRerouted: false,
    disruptionProbability: 0.64,
    initialDisruptionProbability: 0.64,
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
    assignedRouteId: 'ROUTE-ML-SHL-02',
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
    routeDurationMinutes: SHILLONG_MODEL_B_ROUTE_OPTIONS[0].predictedEtaMinutes,
    routeStatus: 'OPTIMAL',
    corridorSegmentIds: ['SEG-ML-SHL-BYPASS'],
    isRerouted: false,
    selectedRouteOptionId: SHILLONG_MODEL_B_ROUTE_OPTIONS[0].id,
    routeOptions: SHILLONG_MODEL_B_ROUTE_OPTIONS,
  };

  const asRoute = FLEET_ROUTES['ROUTE-AS-04'];

  const suggestedHaflong: ReliefMission = {
    id: 'SUGG-ASDH011',
    communityId: 'AS-DH-011',
    communityName: 'Haflong Mountain Township Consignment',
    recommendedVehicleType: 'Engineer-01 (12T BRO Tactical Shoring Rig)',
    cargoAllocations: [
      { item: 'Emergency River Shoring Kit', quantity: 1, unit: 'set' },
      { item: 'High-Density Fuel (Diesel 20L Jerrycans)', quantity: 350, unit: 'liters' },
    ],
    assignedRouteId: asRoute?.id || 'ROUTE-AS-04',
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
    routeDurationMinutes: HAFLONG_MODEL_B_ROUTE_OPTIONS[0].predictedEtaMinutes,
    routeStatus: 'OPTIMAL',
    corridorSegmentIds: ['SEG-NAG-HAF'],
    isRerouted: false,
    selectedRouteOptionId: HAFLONG_MODEL_B_ROUTE_OPTIONS[0].id,
    routeOptions: HAFLONG_MODEL_B_ROUTE_OPTIONS,
    source: 'FIELD_REQUISITION',
    isFieldRequisition: true,
    requestedByOfficer: 'Maj. S. Saikia (BRO Field Officer)',
    resourceRequestId: 'REQ-BRO-011',
    notes: 'Ground Requisition: Emergency River Shoring Rig & Diesel needed at Haflong Mountain Township following bridge subsidence on NH-27.',
  };

  const suggestedKolasib: ReliefMission = {
    id: 'SUGG-MZKOL004',
    communityId: 'MZ-KOL-004',
    communityName: 'Kolasib Sub-Divisional Hospital & Refugee Camp',
    recommendedVehicleType: 'Medic-01 (4x4 Emergency Medical Van)',
    cargoAllocations: [
      { item: 'IV Fluids (Ringer Lactate 500ml)', quantity: 300, unit: 'units' },
      { item: 'Anti-Snake Venom (ASV Polyvalent Vials)', quantity: 120, unit: 'vials' },
      { item: 'High-Calorie Nutrient Biscuit Packs', quantity: 450, unit: 'packs' },
    ],
    assignedRouteId: 'ROUTE-MZ-BHAIRABI',
    suggestedDetour: 'NH-306 / SH-42 Bhairabi Ridge Bypass (Safe Mountain Corridor)',
    status: 'SUGGESTED',
    urgency: 'P1_CRITICAL',
    createdAt: now.toISOString(),
    originWarehouseId: 'silchar',
    originWarehouseName: 'Silchar Strategic Depot',
    originCoords: [24.8333, 92.7789],
    disasterZoneId: 'LHZ-MZ-01',
    disasterZoneName: 'Bilkhawthlir Mudflow Siltation Axis (LHZ-MZ-01)',
    destinationEndpoint: [24.2246, 92.6784],
    destinationName: 'Kolasib Medical Supply Receiving Depot',
    assignedVehicleId: 'Medic-01',
    routeGeometry: KOLASIB_MODEL_B_ROUTE_OPTIONS[0].geometry,
    routeDistanceKm: KOLASIB_MODEL_B_ROUTE_OPTIONS[0].distanceKm,
    routeDurationMinutes: KOLASIB_MODEL_B_ROUTE_OPTIONS[0].predictedEtaMinutes,
    routeStatus: 'OPTIMAL',
    corridorSegmentIds: ['SEG-SIL-KOL'],
    isRerouted: false,
    selectedRouteOptionId: KOLASIB_MODEL_B_ROUTE_OPTIONS[0].id,
    routeOptions: KOLASIB_MODEL_B_ROUTE_OPTIONS,
    source: 'FIELD_REQUISITION',
    isFieldRequisition: true,
    requestedByOfficer: 'Insp. L. Hmar (BRO Liaison)',
    notes: 'AI Predictive Sortie: Imminent mudflow along NH-306 threatens to isolate Kolasib sub-division. Preemptive dispatch of emergency medical stock recommended.',
  };

  const suggestedTawang: ReliefMission = {
    id: 'SUGG-ARTAW001',
    communityId: 'AR-TAW-001',
    communityName: 'Tawang Frontier Forward Hospital',
    recommendedVehicleType: 'All-Terrain 6x6 Heavy Rig',
    cargoAllocations: [
      { item: 'High-Altitude Oxygen Cylinders (47L Type D)', quantity: 40, unit: 'cylinders' },
      { item: 'Thermal Hypothermia Blankets & Snow Kits', quantity: 200, unit: 'sets' },
      { item: 'Sub-Zero Winterized Diesel (20L Jerrycans)', quantity: 500, unit: 'liters' },
    ],
    assignedRouteId: 'ROUTE-AR-ALT',
    suggestedDetour: 'Trans-Arunachal Highway via Orang - Kalaktang - Rupa (Low Hazard Bypass)',
    status: 'SUGGESTED',
    urgency: 'P1_CRITICAL',
    createdAt: now.toISOString(),
    originWarehouseId: 'guwahati',
    originWarehouseName: 'Guwahati Regional Hub',
    originCoords: [26.1158, 91.7086],
    disasterZoneId: 'LHZ-AR-01',
    disasterZoneName: 'Sela Pass Avalanche Vulnerability Axis (LHZ-AR-01)',
    destinationEndpoint: [27.5861, 91.8594],
    destinationName: 'Tawang District Civil Hospital Depot',
    assignedVehicleId: 'Heavy-Recovery-01',
    routeGeometry: TAWANG_MODEL_B_ROUTE_OPTIONS[0].geometry,
    routeDistanceKm: TAWANG_MODEL_B_ROUTE_OPTIONS[0].distanceKm,
    routeDurationMinutes: TAWANG_MODEL_B_ROUTE_OPTIONS[0].predictedEtaMinutes,
    routeStatus: 'OPTIMAL',
    corridorSegmentIds: ['SEG-GHY-TAW'],
    isRerouted: false,
    selectedRouteOptionId: TAWANG_MODEL_B_ROUTE_OPTIONS[0].id,
    routeOptions: TAWANG_MODEL_B_ROUTE_OPTIONS,
    notes: 'AI Strategic Pre-positioning: Meteorological alert warns of Sela Pass closure within 14 hours. Route via Orang-Kalaktang bypass selected.',
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
    suggestedTawang,
    ongoingNagaland,
    ongoingMizoram,
    ongoingSikkim,
    ongoingAssam,
    deliveredImphal,
    deliveredAgartala,
  ];
}

export const FIELD_OFFICERS: FieldOfficerProfile[] = [
  {
    id: 'hmar',
    name: 'Inspector L. Hmar',
    rank: 'Inspector',
    department: 'Mizoram Police / Quick Response Team',
    badgeId: 'MZ-QRT-019',
    communityId: 'MZ-KOL-004',
    communityName: 'Kolasib East Community',
    activeMissionId: 'MSN-ONGOING-MZ01',
    assignedVehicleId: 'Medic-01',
    jurisdictionState: 'Mizoram (Kolasib Sector)',
    phone: '+91 94361 22891',
  },
  {
    id: 'sema',
    name: 'Subedar K. Sema',
    rank: 'Subedar',
    department: 'Nagaland Police / Sector Command',
    badgeId: 'NL-QRT-008',
    communityId: 'NL-KOH-009',
    communityName: 'Kohima South Sector (Phesama)',
    activeMissionId: 'MSN-ONGOING-NL01',
    assignedVehicleId: 'Ration-Convoy-07',
    jurisdictionState: 'Nagaland (Kohima Sector)',
    phone: '+91 94360 41102',
  },
  {
    id: 'bhutia',
    name: 'Capt. P. Bhutia',
    rank: 'Captain',
    department: 'BRO Project Swastik / Liaison Unit',
    badgeId: 'SK-QRT-012',
    communityId: 'SK-MAN-002',
    communityName: 'Teesta Canyon 29th Mile Hub',
    activeMissionId: 'MSN-ONGOING-SK01',
    assignedVehicleId: 'Eng-03',
    jurisdictionState: 'Sikkim (Mangan Sector)',
    phone: '+91 94340 78219',
  },
  {
    id: 'sharma',
    name: 'Havildar B. Sharma',
    rank: 'Havildar',
    department: 'Assam State Disaster Management Authority',
    badgeId: 'AS-QRT-031',
    communityId: 'AS-HAF-001',
    communityName: 'Haflong Hill Station Post',
    activeMissionId: 'SUGG-ASDH011',
    assignedVehicleId: 'Cargo-04',
    jurisdictionState: 'Assam (Dima Hasao Sector)',
    phone: '+91 94350 99403',
  },
];

/**
 * Connected PRAVAH Engine Workflow:
 * Evaluates a Field Officer Resource Request against community priority,
 * nearest depot stock, vehicle capacity, and corridor risk to generate
 * an authoritative Suggested Mission for Central Command approval.
 */
export function generateMissionFromResourceRequest(
  request: ResourceRequest,
  communities: (CommunityBase | CommunityWithCalculation)[]
): ReliefMission {
  const comm = communities.find((c) => c.id === request.communityId) || communities[0];
  const depot = resolveNearestDepot(comm.coordinates);

  const routeConfig = COMMUNITY_ROUTING_PROFILES[comm.id] || {
    depotId: depot.id,
    depotName: depot.name,
    depotCoords: depot.coords,
    routeId: depot.primaryRouteId,
    detour: 'Direct Clearance Priority Corridor',
    preferredVehicleId: 'Medic-01',
  };

  const fleetRoute = FLEET_ROUTES[routeConfig.routeId] || Object.values(FLEET_ROUTES)[0];
  const reqLower = (request.resourceType || '').toLowerCase();
  const isMedical = reqLower.includes('medic') || reqLower.includes('anti') || reqLower.includes('iv') || reqLower.includes('first aid');
  const isLiquid = reqLower.includes('water') || reqLower.includes('fuel') || reqLower.includes('diesel');

  let vehicleType = 'Ration-07 (Heavy 6x6 Freight Truck)';
  let vehicleId = 'Ration-Convoy-07';
  let driver = 'Temsu Ao';

  if (isMedical) {
    vehicleType = 'Medic-01 (4x4 Emergency Medical Van)';
    vehicleId = 'Medic-01';
    driver = 'Lalrinsanga';
  } else if (isLiquid) {
    vehicleType = 'Tanker-01 (6x6 Bulk Liquid Tanker)';
    vehicleId = 'Tanker-01';
    driver = 'Rajesh Mech';
  }

  const missionId = `MSN-REQ-${Date.now().toString().slice(-6)}`;

  return {
    id: missionId,
    communityId: comm.id,
    communityName: comm.name,
    recommendedVehicleType: vehicleType,
    cargoAllocations: [
      {
        item: request.resourceType,
        quantity: request.quantity,
        unit: request.unit,
      },
    ],
    assignedRouteId: routeConfig.routeId,
    suggestedDetour: routeConfig.detour,
    status: 'SUGGESTED',
    urgency: request.urgency === 'Critical' ? 'P1_CRITICAL' : 'P2_ELEVATED',
    createdAt: new Date().toISOString(),
    assignedDriver: driver,
    assignedOfficer: `${request.officerName} (${request.officerRole})`,
    originWarehouseId: routeConfig.depotId,
    originWarehouseName: routeConfig.depotName,
    originCoords: routeConfig.depotCoords,
    disasterZoneId: `HZ-${comm.id}`,
    disasterZoneName: `${comm.name} Priority Sector`,
    destinationEndpoint: comm.coordinates,
    destinationName: `${comm.name} Community Depot`,
    assignedVehicleId: vehicleId,
    routeGeometry: fleetRoute?.coordinates || [],
    routeDistanceKm: fleetRoute?.distanceKm || 85.0,
    routeDurationMinutes: fleetRoute?.expectedDurationMinutes || 120,
    routeStatus: 'OPTIMAL',
    corridorSegmentIds: [comm.primaryCorridor || 'SEG-SIL-KOL'],
    isRerouted: false,
    source: 'FIELD_REQUISITION',
    isFieldRequisition: true,
    requestedByOfficer: `${request.officerName} (${request.officerRole || 'Field Officer'})`,
    notes: `Field Requisition (Genuine Ground Need): Submitted by ${request.officerName} for ${request.communityName}. Reason: "${request.reason}"`,
    resourceRequestId: request.id,
  };
}

/**
 * Manual Mission Creation:
 * Allows authorized operational dispatchers or admins to manually configure
 * and dispatch real mission sorties within the operational fleet network.
 */
export function createManualReliefMission(params: {
  missionName: string;
  originWarehouseId: string;
  destinationCommunityId: string;
  cargoAllocations: { item: string; quantity: number; unit: string }[];
  urgency: 'P1_CRITICAL' | 'P2_ELEVATED';
  assignedVehicleId?: string;
  assignedDriver?: string;
  notes?: string;
  deadline?: string;
  communities: (CommunityBase | CommunityWithCalculation)[];
}): ReliefMission {
  const comm = params.communities.find((c) => c.id === params.destinationCommunityId) || params.communities[0];
  const depot = STRATEGIC_DEPOTS[params.originWarehouseId] || STRATEGIC_DEPOTS.silchar;
  const routeConfig = COMMUNITY_ROUTING_PROFILES[comm.id] || {
    depotId: depot.id,
    depotName: depot.name,
    depotCoords: depot.coords,
    routeId: depot.primaryRouteId,
    detour: 'Direct Clearance Priority Corridor',
    preferredVehicleId: 'Medic-01',
  };
  const fleetRoute = FLEET_ROUTES[routeConfig.routeId] || Object.values(FLEET_ROUTES)[0];
  const missionId = `MSN-MANUAL-${Date.now().toString().slice(-6)}`;

  return {
    id: missionId,
    communityId: comm.id,
    communityName: comm.name,
    recommendedVehicleType: params.assignedVehicleId ? `${params.assignedVehicleId} (Manual Assignment)` : 'General Relief Transport',
    cargoAllocations: params.cargoAllocations,
    assignedRouteId: routeConfig.routeId,
    suggestedDetour: routeConfig.detour,
    status: 'APPROVED',
    urgency: params.urgency,
    createdAt: new Date().toISOString(),
    assignedDriver: params.assignedDriver || 'Assigned Logistics Driver',
    assignedOfficer: 'Central Operations Command',
    originWarehouseId: depot.id,
    originWarehouseName: depot.name,
    originCoords: depot.coords,
    disasterZoneId: `HZ-${comm.id}`,
    disasterZoneName: `${params.missionName} Delivery Zone`,
    destinationEndpoint: comm.coordinates,
    destinationName: `${comm.name} Community Depot`,
    assignedVehicleId: params.assignedVehicleId || 'Medic-01',
    routeGeometry: fleetRoute?.coordinates || [],
    routeDistanceKm: fleetRoute?.distanceKm || 75.0,
    routeDurationMinutes: fleetRoute?.expectedDurationMinutes || 110,
    routeStatus: 'OPTIMAL',
    corridorSegmentIds: [comm.primaryCorridor || 'SEG-SIL-KOL'],
    isRerouted: false,
    source: 'MANUAL',
    notes: params.notes || `Manually dispatched: ${params.missionName}`,
    deadline: params.deadline,
  };
}
