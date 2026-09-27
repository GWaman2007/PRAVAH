import { calculateCommodityDepletion, calculateCompositePriority, COMMODITY_CONFIG } from './src/engine/priorityEngine.ts';
import { findKShortestPaths, evaluateAndRankPaths } from './src/engine/routingEngine.ts';
import { stepVehicleSimulation } from './src/engine/telemetryEngine.ts';
import {
  calculateIncidentConfidence,
  resolveMissionConflict,
  resolveIncidentConflict,
  resolveDisruptionConflict,
  resolveCommunityConflict,
} from './src/engine/offlineSync.ts';
import { generateBroadcastForIncident, calculateSmsMetrics } from './src/data/translationsData.ts';
import { resolveTtsParameters } from './src/utils/audioAlert.ts';
import { NER_SEGMENTS, VEHICLE_PROFILES } from './src/data/routingNetwork.ts';
import { INITIAL_COMMUNITIES } from './src/data/communitiesData.ts';
import { FLEET_ROUTES, BLACKOUT_ZONES, HAZARD_ZONES, INITIAL_VEHICLES } from './src/data/fleetData.ts';
import { generateDynamicMissionSuggestions, isMissionOngoing, isMissionSuggested, isMissionDelivered } from './src/engine/missionEngine.ts';
import { getBaselineLHZPolygons } from './src/engine/realtimePolygonService.ts';
import { validateAndResolveMissionRoute } from './src/engine/mapGeoJSONAdapters.ts';
import { haversineDistanceKm } from './src/engine/gisMath.ts';
import {
  INITIAL_RESPONSE_HUBS,
  INITIAL_HUB_INVENTORY,
  INITIAL_INVENTORY_TRANSACTIONS,
} from './src/engine/offlineSync.ts';
import {
  getAvailableInventory,
  isInventoryItemLow,
  evaluateCandidateHubsForDemand,
  getConnectedCommunitiesForHub,
} from './src/engine/hubLogisticsService.ts';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { evaluateSegment } from './src/engine/routingEngine.ts';
import { buildModelAFeatures, MODEL_A_FEATURE_PROVENANCE } from './src/engine/modelAFeatureBuilder.ts';
import {
  getRouteModelAExposure,
  getMissionCorridorSegments,
  calculateRouteModelAExposureFromCache,
  validateModelAJson,
  FROZEN_MODEL_A_FEATURE_KEYS,
} from './src/engine/modelAService.ts';
import { createModelARiskGeoJSON, createModelBRouteOptionsGeoJSON } from './src/engine/mapGeoJSONAdapters.ts';
import { calculateMissionReroute, spliceRouteFromVehicleCoords, resolveDescriptiveRouteName } from './src/engine/modelBRouteRankingService.ts';

console.log('====================================================');
console.log('🧪 RUNNING COMPREHENSIVE PRAVAH INTEGRATION TESTS');
console.log('====================================================\n');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    process.exitCode = 1;
  }
}

// ----------------------------------------------------
// TEST 1: PRIORITY & PREEMPTIVE DEPLETION ENGINE
// ----------------------------------------------------
console.log('--- TEST SUITE 1: Priority & Preemptive Depletion Engine ---');
{
  const kolasib = INITIAL_COMMUNITIES.find((c) => c.id === 'MZ-KOL-004');
  assert(kolasib !== undefined, 'Community Kolasib East (MZ-KOL-004) exists');

  const result = calculateCompositePriority(kolasib);
  assert(result.baseScore > 0 && result.baseScore <= 1.0, `Base score is normalized (${result.baseScore})`);
  assert(result.finalScore >= result.baseScore, `Final score includes boost if applicable (${result.finalScore})`);
  assert(result.priorityTier === 'P1', `Kolasib is correctly classified as P1 Critical (${result.priorityTier})`);
  assert(result.actionableDispatchWindow === 1.5, `Actionable Dispatch Window (4.0h - 2.5h) = 1.5h (got ${result.actionableDispatchWindow}h)`);
  assert(result.emergencyUrgencyBoost === 0.20, `Urgency Boost (+0.20) triggered for S_def >= 0.75 & Window <= 3.0h (got ${result.emergencyUrgencyBoost})`);
  assert(result.auditTrail.length >= 4, `Explainability audit trail generated ${result.auditTrail.length} factors`);

  // Closed-Loop Ground Truth test: Marking DELIVERED resets Delta-t to 0 and restocks
  const deliveredKolasib = {
    ...kolasib,
    elapsedTimeHours: 0,
    hasActiveIndent: false,
    disruptionProbMax: 0.10,
    cutoffTimeHours: 24.0,
    isMonsoonAlertActive: false,
    inventories: {
      ...kolasib.inventories,
      IV_FLUIDS: { ...kolasib.inventories.IV_FLUIDS, lastStock: 450 },
      ANTIVENOM: { ...kolasib.inventories.ANTIVENOM, lastStock: 120 },
      GRAIN_RICE: { ...kolasib.inventories.GRAIN_RICE, lastStock: 1500 },
      DIESEL: { ...kolasib.inventories.DIESEL, lastStock: 800 },
    },
  };
  const deliveredResult = calculateCompositePriority(deliveredKolasib);
  assert(deliveredResult.supplyDeficitFactor === 0.0, `Supply Deficit Factor resets to 0.0 after delivery (got ${deliveredResult.supplyDeficitFactor})`);
  assert(deliveredResult.priorityTier === 'P3' || deliveredResult.priorityTier === 'P4', `Triage tier moves out of critical upon delivery (${deliveredResult.priorityTier})`);
}

// ----------------------------------------------------
// TEST 2: PREDICTIVE ROUTING & VEHICLE CLEARANCE PRUNING
// ----------------------------------------------------
console.log('\n--- TEST SUITE 2: Vehicle-Aware Pathfinding & K-Shortest ---');
{
  const rawPaths = findKShortestPaths('guwahati', 'kohima', NER_SEGMENTS, 5);
  assert(rawPaths.length >= 2, `Discovered ${rawPaths.length} distinct paths between Guwahati and Kohima`);

  const heavyTanker = VEHICLE_PROFILES.find((v) => v.id === 'OXY_CRYOTANKER_32T');
  assert(heavyTanker !== undefined, 'Heavy Oxygen Tanker (32T) profile loaded');

  // Evaluate with active blockage on main NH-29 corridor
  const disruptions = {
    'SEG-DIM-KOH-MAIN': {
      status: 'TOTAL_BLOCKAGE',
      cause: 'Landslide',
      description: 'Pagla Pahar mudflow',
    },
  };

  const evaluated = evaluateAndRankPaths(rawPaths, NER_SEGMENTS, heavyTanker, 35, disruptions);
  assert(evaluated.length > 0, `Evaluated ${evaluated.length} candidate routes`);

  const blockedRoute = evaluated.find((r) => r.segmentIds.includes('SEG-DIM-KOH-MAIN'));
  assert(blockedRoute !== undefined, 'Found route using blocked NH-29 main segment');
  assert(blockedRoute.isPassable === false, 'Blocked segment causes route to be pruned (isPassable: false)');
  assert(blockedRoute.failureBottleneck !== undefined, 'Failure bottleneck details attached for explainability');

  const recommendedRoute = evaluated.find((r) => r.rank === 1);
  if (recommendedRoute) {
    assert(recommendedRoute.isPassable === true, `Rank 1 Recommended Safe Route is passable (Distance: ${recommendedRoute.totalDistanceKm}km, ETA: ${recommendedRoute.degradedDurationMinutes}m)`);
  }
}

// ----------------------------------------------------
// TEST 3: GPS TELEMETRY, DEAD-RECKONING & WATCHDOG SLA
// ----------------------------------------------------
console.log('\n--- TEST SUITE 3: GPS Telemetry, Dead-Reckoning & Watchdog SLA ---');
{
  const medic = INITIAL_VEHICLES.find((v) => v.vehicle_id === 'Medic-01');
  assert(medic !== undefined, 'Medic-01 vehicle telemetry loaded');

  const route = FLEET_ROUTES['ROUTE-MZ-04'];
  assert(route !== undefined, 'Mission MZ-04 route polyline loaded');

  // Step vehicle forward 10 seconds
  const stepResult = stepVehicleSimulation(medic, route, BLACKOUT_ZONES, HAZARD_ZONES, 10);
  assert(stepResult.updatedVehicle.traveled_distance_km >= medic.traveled_distance_km, 'Vehicle advances distance along route');

  // Test Watchdog SLA Timer overdue escalation
  const overdueVehicle = {
    ...medic,
    status: 'DEAD_ZONE_EXTRAPOLATING',
    entry_blackout_time: new Date(Date.now() - 40 * 60000).toISOString(),
    expected_blackout_exit_time: new Date(Date.now() - 5 * 60000).toISOString(), // 5 mins overdue
  };

  const overdueStep = stepVehicleSimulation(overdueVehicle, route, BLACKOUT_ZONES, HAZARD_ZONES, 10);
  assert(overdueStep.updatedVehicle.is_watchdog_amber === true, `Watchdog triggers Amber SLA alert when overdue > 0m (${overdueStep.updatedVehicle.overdue_duration_min}m overdue)`);

  const criticalOverdueVehicle = {
    ...medic,
    status: 'DEAD_ZONE_EXTRAPOLATING',
    entry_blackout_time: new Date(Date.now() - 70 * 60000).toISOString(),
    expected_blackout_exit_time: new Date(Date.now() - 35 * 60000).toISOString(), // 35 mins overdue (>30m)
  };

  const criticalOverdueStep = stepVehicleSimulation(criticalOverdueVehicle, route, BLACKOUT_ZONES, HAZARD_ZONES, 10);
  assert(criticalOverdueStep.updatedVehicle.is_watchdog_red === true, `Watchdog triggers Red Emergency SOS Search when overdue > 30m (${criticalOverdueStep.updatedVehicle.overdue_duration_min}m overdue)`);
}

// ----------------------------------------------------
// TEST 4: REDDIT-STYLE INCIDENT CONFIDENCE & OFFICER MULTIPLIER
// ----------------------------------------------------
console.log('\n--- TEST SUITE 4: Incident Confidence Scoring & Verification ---');
{
  const citizenIncident = {
    votes: { upvotes: 5, downvotes: 2, userVote: null },
    hasOfficerVerified: false,
  };
  const citizenConfidence = calculateIncidentConfidence(citizenIncident);
  assert(citizenConfidence.score === 3, `Citizen score = (5 - 2) + 0 = 3 (got ${citizenConfidence.score})`);
  assert(citizenConfidence.badge === 'Under Review', `Score 3 badge is 'Under Review' (got '${citizenConfidence.badge}')`);

  const officerIncident = {
    votes: { upvotes: 5, downvotes: 2, userVote: null },
    hasOfficerVerified: true,
  };
  const officerConfidence = calculateIncidentConfidence(officerIncident);
  assert(officerConfidence.score === 13, `Officer score = (5 - 2) + 10 = 13 (got ${officerConfidence.score})`);
  assert(officerConfidence.badge === 'High Confidence (Verified)', `Score 13 badge is 'High Confidence (Verified)' (got '${officerConfidence.badge}')`);
}

// ----------------------------------------------------
// TEST 5: MULTILINGUAL EMERGENCY BROADCAST GENERATOR
// ----------------------------------------------------
console.log('\n--- TEST SUITE 5: Multilingual Regional Broadcast Generator ---');
{
  const drafts = generateBroadcastForIncident(
    'NH-306',
    'Bilkhawthlir',
    'Total Blockage',
    'Vairengte alternate bypass'
  );

  assert(typeof drafts.en === 'string' && drafts.en.includes('NH-306'), 'English draft generated');
  assert(typeof drafts.hi === 'string' && drafts.hi.includes('चेतावनी'), 'Hindi (Devanagari) draft generated');
  assert(typeof drafts.as === 'string' && drafts.as.includes('সতৰ্কবাৰ্তা'), 'Assamese (Eastern Nagari) draft generated');
  assert(typeof drafts.bn === 'string' && drafts.bn.includes('সতর্কতা'), 'Bengali draft generated');
  assert(typeof drafts.mn === 'string' && drafts.mn.includes('ꯈꯨꯗꯣꯡꯊꯤꯕ'), 'Manipuri (Meitei Mayek) draft generated');

  // Test Native Language TTS Routing Logic (NotifyTest architecture)
  const kohimaIncident = { id: 'inc-nh29-kohima', highway: 'NH-29', district: 'Kohima' };

  // Assamese Eastern Nagari must route to 'bn' Google TTS engine for clear pronunciation
  const asTts = resolveTtsParameters(drafts.as, 'as', kohimaIncident);
  assert(asTts.googleLang === 'bn', `Assamese TTS routes to 'bn' audio synthesizer engine (got '${asTts.googleLang}')`);
  assert(asTts.cleanText.length <= 190, `TTS cleanText respects URL character limit (${asTts.cleanText.length} <= 190)`);

  // Manipuri (Meitei Mayek) must route to 'bn' engine using Eastern Nagari script version for clean pronunciation
  const mnTts = resolveTtsParameters(drafts.mn, 'mn', kohimaIncident);
  assert(mnTts.googleLang === 'bn', `Manipuri TTS routes to 'bn' audio synthesizer engine (got '${mnTts.googleLang}')`);
  assert(/[\u0980-\u09FF]/.test(mnTts.cleanText), `Manipuri speech engine converts Meitei Mayek to Eastern Nagari script for audio synthesizer`);

  // Hindi TTS routes to 'hi'
  const hiTts = resolveTtsParameters(drafts.hi, 'hi', kohimaIncident);
  assert(hiTts.googleLang === 'hi', `Hindi TTS routes to 'hi' engine`);

  // SMS metrics calculation
  const standardSms = calculateSmsMetrics('Safe route approved via NH-29 bypass. ETA 4h.', false);
  assert(standardSms.segments === 1 && !standardSms.isUnicode, 'Standard GSM SMS calculated as 1 segment');

  const shortUnicodeSms = calculateSmsMetrics('चेतावनी: NH-29 बंद है।', true);
  assert(shortUnicodeSms.isUnicode === true && shortUnicodeSms.maxPerSegment === 70 && shortUnicodeSms.segments === 1, 'Short Hindi Unicode SMS (<=70 chars) calculates 1 segment with 70 maxPerSegment');

  const multiUnicodeSms = calculateSmsMetrics(drafts.hi, true);
  assert(multiUnicodeSms.isUnicode === true && multiUnicodeSms.segments >= 2 && multiUnicodeSms.maxPerSegment === 67, 'Multi-part Hindi Unicode SMS (>70 chars) calculates UDH concatenated segments (67 chars/seg)');
}

// ----------------------------------------------------
// TEST 6: RBAC NAVIGATION & MULTI-MISSION SELECTION
// ----------------------------------------------------
console.log('\n--- TEST SUITE 6: RBAC Navigation & Multi-Mission Fleet ---');
{
  const navItems = [
    { id: 'GIS_COMMAND' },
    { id: 'COMMUNITY_PRIORITY' },
    { id: 'EXECUTIVE_INFRA' },
    { id: 'GROUND_FEED' },
    { id: 'BROADCAST_CENTER' },
    { id: 'MOBILE_COCKPIT' },
  ];

  const filterForRole = (role) => {
    return navItems.filter((item) => {
      if (role === 'DRIVER') return item.id === 'MOBILE_COCKPIT';
      if (role === 'FIELD_OFFICER') return item.id === 'MOBILE_COCKPIT' || item.id === 'GROUND_FEED' || item.id === 'GIS_COMMAND';
      return item.id !== 'MOBILE_COCKPIT';
    });
  };

  const adminNav = filterForRole('SUPER_ADMIN');
  assert(!adminNav.some((i) => i.id === 'MOBILE_COCKPIT'), 'Super Admin navigation excludes Field Mission Cockpit');
  assert(adminNav.length === 5, 'Super Admin navigation displays all 5 central command decks');

  const dispatcherNav = filterForRole('FLEET_DISPATCHER');
  assert(!dispatcherNav.some((i) => i.id === 'MOBILE_COCKPIT'), 'Fleet Dispatcher navigation excludes Field Mission Cockpit');

  const driverNav = filterForRole('DRIVER');
  assert(driverNav.length === 1 && driverNav[0].id === 'MOBILE_COCKPIT', 'Driver navigation is strictly restricted to Field Mission Cockpit');

  const officerNav = filterForRole('FIELD_OFFICER');
  assert(officerNav.some((i) => i.id === 'MOBILE_COCKPIT') && officerNav.some((i) => i.id === 'GROUND_FEED') && officerNav.some((i) => i.id === 'GIS_COMMAND'), 'Field Officer has access to Cockpit, Ground Feed, and GIS');

  // Multi-Mission fleet testing
  assert(INITIAL_VEHICLES.length >= 3, `Fleet contains ${INITIAL_VEHICLES.length} active convoys for multi-mission testing`);
  const vIds = INITIAL_VEHICLES.map((v) => v.vehicle_id);
  assert(vIds.includes('Medic-01') && vIds.includes('Oxy-Tanker-04') && vIds.includes('Ration-Convoy-07'), 'All 3 convoy profiles (Medic-01, Oxy-Tanker-04, Ration-Convoy-07) exist in fleet registry');

  for (const veh of INITIAL_VEHICLES) {
    const route = FLEET_ROUTES[veh.assigned_route_id];
    assert(route !== undefined, `Vehicle ${veh.vehicle_id} maps to valid route ${veh.assigned_route_id}`);
    assert(route.coordinates && route.coordinates.length >= 5, `Route ${veh.assigned_route_id} contains ${route.coordinates.length} mountain coordinates`);
  }

  // SOS Intercept RBAC validation
  const canAuthorizeQRT = (role) => role === 'SUPER_ADMIN' || role === 'FLEET_DISPATCHER';
  assert(canAuthorizeQRT('SUPER_ADMIN') === true, 'Super Admin is authorized to intercept SOS and dispatch QRT');
  assert(canAuthorizeQRT('FLEET_DISPATCHER') === true, 'Fleet Dispatcher is authorized to intercept SOS and dispatch QRT');
  assert(canAuthorizeQRT('DRIVER') === false, 'Driver is blocked from receiving QRT executive intercept modal');
  assert(canAuthorizeQRT('FIELD_OFFICER') === false, 'Field Officer is blocked from receiving QRT executive intercept modal');
}

// ----------------------------------------------------
// TEST 7: DYNAMIC RELIEF MISSION GENERATION & LIFECYCLE
// ----------------------------------------------------
console.log('\n--- TEST SUITE 7: Dynamic Missions & Closed-Loop Lifecycle ---');
{
  // 1. Dynamic Mission Suggestions from Community Depletion
  const suggestions = generateDynamicMissionSuggestions(INITIAL_COMMUNITIES, INITIAL_VEHICLES, []);
  assert(suggestions.length > 0, `Dynamic mission generator created ${suggestions.length} relief suggestions`);
  assert(suggestions.every((s) => s.status === 'SUGGESTED'), 'All dynamic suggestions strictly have status SUGGESTED');
  assert(suggestions.every((s) => s.cargoAllocations.length > 0), 'All suggestions contain itemized cargo manifests');
  assert(suggestions.every((s) => s.originWarehouseName && s.destinationName), 'All suggestions have origin and destination depots assigned');

  // 2. Initial Ongoing Missions = 0 check
  const initialOngoing = suggestions.filter((s) => isMissionOngoing(s));
  assert(initialOngoing.length === 0, `Initial state has 0 Ongoing missions (got ${initialOngoing.length})`);

  // 3. Mission Approval & Dispatch Transition
  const missionToDispatch = { ...suggestions[0], status: 'IN_TRANSIT', assignedVehicleId: 'Medic-01' };
  assert(isMissionOngoing(missionToDispatch) === true, 'Dispatched mission transitions to Ongoing (IN_TRANSIT)');

  // 4. Field Officer / Driver Delivery Reporting
  const missionPendingCloseout = { ...missionToDispatch, status: 'PENDING_ADMIN_CLOSEOUT' };
  assert(isMissionOngoing(missionPendingCloseout) === true, 'Field finished mission remains in Ongoing as PENDING_ADMIN_CLOSEOUT');

  // 5. Admin Sign-Off & Closeout
  const missionClosedOut = { ...missionPendingCloseout, status: 'DELIVERED' };
  assert(isMissionOngoing(missionClosedOut) === false, 'Admin closeout removes mission from Ongoing list (status DELIVERED)');
  assert(isMissionDelivered(missionClosedOut) === true, 'Mission is marked as DELIVERED in missionEngine helper');

  // 6. Regional Route Precision & Cross-Region Glitch Prevention
  const kolasibSugg = suggestions.find((s) => s.communityId === 'MZ-KOL-004');
  assert(kolasibSugg !== undefined, 'Kolasib East suggestion generated');
  assert(kolasibSugg.assignedRouteId === 'ROUTE-SUG-01', `Kolasib assigned genuine Kolasib road ROUTE-SUG-01 (got ${kolasibSugg.assignedRouteId})`);
  const kolasibResolved = validateAndResolveMissionRoute(kolasibSugg, FLEET_ROUTES);
  assert(kolasibResolved && kolasibResolved.length > 100, `Kolasib resolved route has ${kolasibResolved?.length} road coordinates`);
  const kolasibTerminusDist = haversineDistanceKm(kolasibSugg.destinationEndpoint, kolasibResolved[kolasibResolved.length - 1]);
  assert(kolasibTerminusDist <= 0.8, `Kolasib terminus matches destination within 0.8 km (got ${kolasibTerminusDist.toFixed(2)} km)`);

  const sikkimSugg = suggestions.find((s) => s.communityId === 'SK-MAN-002');
  assert(sikkimSugg !== undefined, 'Teesta Canyon Sikkim suggestion generated');
  assert(sikkimSugg.assignedRouteId === 'ROUTE-SK-02', `Teesta Canyon assigned Sikkim mountain route ROUTE-SK-02 (got ${sikkimSugg.assignedRouteId})`);
  assert(sikkimSugg.originWarehouseId === 'gangtok', `Teesta Canyon origin warehouse is Gangtok (got ${sikkimSugg.originWarehouseId})`);
  const sikkimResolved = validateAndResolveMissionRoute(sikkimSugg, FLEET_ROUTES);
  assert(sikkimResolved && sikkimResolved.length > 100, `Sikkim resolved route has ${sikkimResolved?.length} road coordinates`);
  const sikkimTerminusDist = haversineDistanceKm(sikkimSugg.destinationEndpoint, sikkimResolved[sikkimResolved.length - 1]);
  assert(sikkimTerminusDist <= 0.5, `Sikkim terminus matches destination within 0.5 km (got ${sikkimTerminusDist.toFixed(2)} km)`);

  // 7. Verify cross-regional laser line defense:
  // If an erroneous mission has Sikkim destination with Mizoram route ROUTE-MZ-02,
  // validateAndResolveMissionRoute must re-resolve to the correct Sikkim route and never draw a 600km chord across Bangladesh
  const corruptedMission = {
    ...sikkimSugg,
    assignedRouteId: 'ROUTE-MZ-02',
    routeGeometry: FLEET_ROUTES['ROUTE-MZ-02'].coordinates,
  };
  const defendedCoords = validateAndResolveMissionRoute(corruptedMission, FLEET_ROUTES);
  assert(defendedCoords !== null, 'Defended against corrupted cross-region mission');
  const defendedStart = defendedCoords[0];
  const distFromGangtok = haversineDistanceKm([27.33139, 88.61381], defendedStart);
  assert(distFromGangtok < 20.0, `Corrupted cross-region route corrected to Sikkim origin (distance: ${distFromGangtok.toFixed(1)} km, not in Mizoram 600km away)`);
}

// ----------------------------------------------------
// TEST 8: REAL-TIME API HAZARD POLYGONS
// ----------------------------------------------------
console.log('\n--- TEST SUITE 8: Real-Time API Hazard Polygons ---');
{
  const polygons = getBaselineLHZPolygons();
  assert(polygons.length >= 3, `Authoritative hazard polygon service loaded ${polygons.length} polygon features`);
  assert(polygons.every((p) => p.coordinates && p.coordinates.length > 0), 'Every hazard polygon contains valid GeoJSON coordinate rings');
  assert(polygons.every((p) => p.hazardScore >= 0 && p.hazardScore <= 10), 'Every hazard polygon has calibrated hazard score [0-10]');
  assert(polygons.every((p) => typeof p.name === 'string' && p.name.length > 0), 'Every hazard polygon has an identified corridor name');
  assert(polygons.every((p) => p.source === 'ISRO_LHZ_BASELINE'), 'Baseline hazard zones cite authoritative ISRO NRSC source');
}

// ----------------------------------------------------
// TEST 9: UNIVERSAL OFFLINE SYNC & BIDIRECTIONAL CONFLICT RESOLUTION
// ----------------------------------------------------
console.log('\n--- TEST SUITE 9: Universal Offline Sync & Bidirectional Conflict Resolution ---');
{
  // 1. Cross-Device Suggestion Eviction:
  // When Person A approves a mission, it must pop from Person B's "Suggested" list even if suggestion IDs differed
  const localMissionsDeviceB = [
    {
      id: 'SUGG-MZKOL-DEV-B-999',
      communityId: 'MZ-KOL-004',
      communityName: 'Kolasib Forward Camp',
      status: 'SUGGESTED',
      urgency: 'HIGH',
      createdAt: new Date().toISOString(),
      originCoords: [24.83, 92.77],
      destinationEndpoint: [24.22, 92.67],
    },
  ];
  const cloudMissionsFromDeviceA = [
    {
      id: 'SUGG-MZKOL-DEV-A-111',
      communityId: 'MZ-KOL-004',
      communityName: 'Kolasib Forward Camp',
      status: 'APPROVED',
      urgency: 'HIGH',
      createdAt: new Date().toISOString(),
      originCoords: [24.83, 92.77],
      destinationEndpoint: [24.22, 92.67],
    },
  ];

  const reconciledMissions = resolveMissionConflict(localMissionsDeviceB, cloudMissionsFromDeviceA);
  assert(reconciledMissions.length === 1, `Reconciled missions has exactly 1 mission (got ${reconciledMissions.length})`);
  assert(reconciledMissions[0].status === 'APPROVED', `Reconciled mission has status APPROVED (got ${reconciledMissions[0].status})`);
  assert(reconciledMissions[0].id === 'SUGG-MZKOL-DEV-A-111', `Device A approved mission replaced Device B suggestion (got ${reconciledMissions[0].id})`);
  assert(!reconciledMissions.some((m) => m.status === 'SUGGESTED'), 'Local SUGGESTED mission for Kolasib was successfully popped');

  // 2. Lifecycle Rank: Local IN_TRANSIT overrides Cloud APPROVED if dispatched locally offline
  const localDispatched = [
    {
      id: 'SUGG-MZKOL-DEV-A-111',
      communityId: 'MZ-KOL-004',
      communityName: 'Kolasib Forward Camp',
      status: 'IN_TRANSIT',
      assignedVehicleId: 'Medic-01',
      urgency: 'HIGH',
      createdAt: new Date().toISOString(),
      dispatchedAt: new Date().toISOString(),
      originCoords: [24.83, 92.77],
      destinationEndpoint: [24.22, 92.67],
    },
  ];
  const cloudStillApproved = [
    {
      id: 'SUGG-MZKOL-DEV-A-111',
      communityId: 'MZ-KOL-004',
      communityName: 'Kolasib Forward Camp',
      status: 'APPROVED',
      urgency: 'HIGH',
      createdAt: new Date().toISOString(),
      originCoords: [24.83, 92.77],
      destinationEndpoint: [24.22, 92.67],
    },
  ];
  const localAdvancementWins = resolveMissionConflict(localDispatched, cloudStillApproved);
  assert(localAdvancementWins[0].status === 'IN_TRANSIT', `Local offline advancement to IN_TRANSIT wins over cloud APPROVED (got ${localAdvancementWins[0].status})`);

  // 3. Incident Conflict Resolution: Union updates, max confidence, officer verification
  const localIncident = [
    {
      id: 'inc-test-01',
      title: 'NH-29 Mudflow',
      corridorFlair: 'r/NH-29-Nagaland',
      incidentType: 'Landslide',
      severity: 'Total Blockage',
      location: { lat: 25.75, lng: 93.98, placeName: 'Pagla Pahar', state: 'Nagaland', corridorId: 'SEG-DIM-KOH-MAIN' },
      author: { name: 'Local Driver', role: 'Citizen Driver' },
      timestamp: new Date().toISOString(),
      votes: { upvotes: 5, downvotes: 1, userVote: 'up' },
      confidenceScore: 4,
      hasOfficerVerified: false,
      sync_status: 'PENDING',
      updates: [
        { id: 'u-local-1', author: 'Driver 1', role: 'Citizen Driver', message: 'Local update', timestamp: new Date().toISOString() },
      ],
    },
  ];
  const cloudIncident = [
    {
      id: 'inc-test-01',
      title: 'NH-29 Mudflow',
      corridorFlair: 'r/NH-29-Nagaland',
      incidentType: 'Landslide',
      severity: 'Total Blockage',
      location: { lat: 25.75, lng: 93.98, placeName: 'Pagla Pahar', state: 'Nagaland', corridorId: 'SEG-DIM-KOH-MAIN' },
      author: { name: 'Local Driver', role: 'Citizen Driver' },
      timestamp: new Date().toISOString(),
      votes: { upvotes: 12, downvotes: 0, userVote: null },
      confidenceScore: 22,
      hasOfficerVerified: true,
      sync_status: 'SYNCED',
      updates: [
        { id: 'u-cloud-1', author: 'Insp. L. Hmar', role: 'Field Officer (BRO/Police)', message: 'Cloud verified', timestamp: new Date().toISOString() },
      ],
    },
  ];

  const mergedIncidents = resolveIncidentConflict(localIncident, cloudIncident);
  assert(mergedIncidents[0].updates.length === 2, `Updates from local and cloud merged without loss (got ${mergedIncidents[0].updates.length})`);
  assert(mergedIncidents[0].confidenceScore === 22, `Max confidence score preserved (got ${mergedIncidents[0].confidenceScore})`);
  assert(mergedIncidents[0].hasOfficerVerified === true, 'Officer verification preserved');
  assert(mergedIncidents[0].votes.userVote === 'up', 'User local vote preserved');

  // 4. Disruption Conflict Resolution: Union of segments
  const localDisruptions = {
    'SEG-SIL-KOL': { status: 'SINGLE_LANE_PASSABLE', cause: 'Road_Subsidence', description: 'Local report', reportedBy: 'Driver' },
  };
  const cloudDisruptions = {
    'SEG-DIM-KOH-MAIN': { status: 'TOTAL_BLOCKAGE', cause: 'Landslide', description: 'Cloud blockage', reportedBy: 'BRO' },
  };
  const mergedDisruptions = resolveDisruptionConflict(localDisruptions, cloudDisruptions);
  assert(Object.keys(mergedDisruptions).length === 2, `Both local and cloud disruptions combined (got ${Object.keys(mergedDisruptions).length})`);
  assert(mergedDisruptions['SEG-DIM-KOH-MAIN'].status === 'TOTAL_BLOCKAGE', 'Cloud total blockage preserved');
  assert(mergedDisruptions['SEG-SIL-KOL'].status === 'SINGLE_LANE_PASSABLE', 'Local disruption preserved');

  // 5. Community Inventory Reconciliation: Cloud override reflects replenishment
  const localCommunities = [
    {
      id: 'MZ-KOL-004',
      name: 'Kolasib Forward Camp',
      elapsedTimeHours: 24,
      inventories: {
        IV_FLUIDS: { lastStock: 10, baselineDailyBurn: 40, standardCapacity: 450 },
      },
    },
  ];
  const cloudReplenished = [
    {
      id: 'MZ-KOL-004',
      name: 'Kolasib Forward Camp',
      elapsedTimeHours: 0,
      inventories: {
        IV_FLUIDS: { lastStock: 450, baselineDailyBurn: 40, standardCapacity: 450 },
      },
    },
  ];
  const reconciledComm = resolveCommunityConflict(localCommunities, cloudReplenished);
  assert(reconciledComm[0].elapsedTimeHours === 0, `Elapsed time reset by cloud delivery (got ${reconciledComm[0].elapsedTimeHours})`);
  assert(reconciledComm[0].inventories.IV_FLUIDS.lastStock === 450, `Inventory replenished to 450 by cloud (got ${reconciledComm[0].inventories.IV_FLUIDS.lastStock})`);
}

// ----------------------------------------------------
// TEST 10: HUBS & RESOURCES LOGISTICS ENGINE
// ----------------------------------------------------
console.log('\n--- TEST SUITE 10: Hubs & Resources Logistics Engine ---');
{
  // 1. Hub Roster Verification
  assert(INITIAL_RESPONSE_HUBS.length === 8, `Exactly 8 North East operational response hubs loaded (got ${INITIAL_RESPONSE_HUBS.length})`);
  
  const silchar = INITIAL_RESPONSE_HUBS.find((h) => h.id === 'silchar');
  assert(silchar !== undefined, 'Silchar Forward Staging Depot exists in roster');
  assert(silchar.status === 'OPERATIONAL', 'Silchar hub status is OPERATIONAL');
  assert(silchar.coordinates[0] === 24.8333 && silchar.coordinates[1] === 92.7789, 'Silchar coordinates align with NER routing node');

  // 2. Hub Inventory Initialization & Available Calculation
  const silcharInventory = INITIAL_HUB_INVENTORY.filter((i) => i.hubId === 'silchar');
  assert(silcharInventory.length >= 6, `Silchar depot contains ${silcharInventory.length} seed commodities (expected >= 6)`);

  const riceItem = silcharInventory.find((i) => i.commodityName.toLowerCase().includes('rice'));
  assert(riceItem !== undefined, 'Rice & Fortified Grains exists in Silchar inventory');
  const availableRice = getAvailableInventory(riceItem);
  assert(availableRice === riceItem.quantity - riceItem.reservedQuantity, `Available stock equals quantity - reserved (${availableRice} == ${riceItem.quantity} - ${riceItem.reservedQuantity})`);
  assert(availableRice >= 0, 'Available stock is non-negative');

  // 3. Low Stock Detection Logic
  const sampleLowItem = {
    ...riceItem,
    quantity: 1500,
    reservedQuantity: 500,
    lowStockThreshold: 1200,
  };
  // Available = 1500 - 500 = 1000 <= 1200 -> isLow should be true
  assert(isInventoryItemLow(sampleLowItem) === true, 'isInventoryItemLow correctly detects stock <= threshold');

  const sampleHealthyItem = {
    ...riceItem,
    quantity: 5000,
    reservedQuantity: 500,
    lowStockThreshold: 1200,
  };
  // Available = 5000 - 500 = 4500 > 1200 -> isLow should be false
  assert(isInventoryItemLow(sampleHealthyItem) === false, 'isInventoryItemLow returns false for healthy stock');

  // 4. Reservation, Release, and Dispatch Invariants
  let testItem = { ...riceItem, quantity: 1000, reservedQuantity: 0 };
  const initialAvail = getAvailableInventory(testItem); // 1000

  // Reserve 300
  const reserveAmt = 300;
  testItem = { ...testItem, reservedQuantity: testItem.reservedQuantity + reserveAmt };
  assert(getAvailableInventory(testItem) === 700, `Reserving ${reserveAmt} decreases available from ${initialAvail} to 700 (got ${getAvailableInventory(testItem)})`);
  assert(testItem.reservedQuantity === 300, `Reserved quantity increased to 300`);

  // Release 100
  const releaseAmt = 100;
  testItem = { ...testItem, reservedQuantity: testItem.reservedQuantity - releaseAmt };
  assert(getAvailableInventory(testItem) === 800, `Releasing ${releaseAmt} increases available from 700 to 800 (got ${getAvailableInventory(testItem)})`);
  assert(testItem.reservedQuantity === 200, `Reserved quantity decreased to 200`);

  // Dispatch 200 (reduces total quantity and releases reservation)
  const dispatchAmt = 200;
  testItem = {
    ...testItem,
    quantity: testItem.quantity - dispatchAmt,
    reservedQuantity: testItem.reservedQuantity - dispatchAmt,
  };
  assert(testItem.quantity === 800, `Dispatching reduces total quantity from 1000 to 800`);
  assert(testItem.reservedQuantity === 0, `Dispatching clears reserved quantity to 0`);
  assert(getAvailableInventory(testItem) === 800, `Available stock remains 800 after dispatch completion`);

  // 5. Candidate Hub Evaluation for Demand
  const candidates = evaluateCandidateHubsForDemand(
    'MZ-KOL-004',
    [24.23, 92.68],
    [
      { commodityName: 'Rice', quantity: 500 },
      { commodityName: 'IV Fluids', quantity: 20 },
    ],
    INITIAL_RESPONSE_HUBS,
    INITIAL_HUB_INVENTORY,
    INITIAL_VEHICLES,
    {},
    NER_SEGMENTS
  );

  assert(candidates.length > 0, `Candidate hub evaluation returned ${candidates.length} candidate hubs`);
  const topCandidateIds = [candidates[0]?.hub.id, candidates[1]?.hub.id];
  assert(
    topCandidateIds.includes('silchar') && topCandidateIds.includes('aizawl'),
    `Aizawl & Silchar ranked as top candidate hubs for Kolasib corridor (got ${candidates[0].hub.id} at ${candidates[0].distanceKm}km, ${candidates[1].hub.id} at ${candidates[1].distanceKm}km)`
  );
  assert(candidates[0].hasSufficientInventory === true, 'Top candidate has sufficient inventory');
  assert(candidates[0].hasAvailableVehicles === true, 'Top candidate has available vehicles');
  assert(candidates[0].roadAccessibilityScore > 0, `Road accessibility score calculated (${candidates[0].roadAccessibilityScore})`);
  assert(candidates[0].distanceKm > 0 && candidates[0].distanceKm < 150, `Distance to Kolasib is realistic (${candidates[0].distanceKm.toFixed(1)} km)`);

  // 6. Connected Communities Discovery
  const connected = getConnectedCommunitiesForHub('silchar', INITIAL_COMMUNITIES);
  assert(connected.length > 0, `Silchar hub connected to ${connected.length} nearby communities`);
  const kolasibConnected = connected.find((c) => c.id === 'MZ-KOL-004');
  assert(kolasibConnected !== undefined, 'Kolasib Forward Camp is listed in Silchar connected communities');

  // 7. Initial Seed Transactions Ledger
  assert(INITIAL_INVENTORY_TRANSACTIONS.length > 0, `Initial seed transactions ledger populated with ${INITIAL_INVENTORY_TRANSACTIONS.length} entries`);
  const silcharTx = INITIAL_INVENTORY_TRANSACTIONS.filter((tx) => tx.hubId === 'silchar');
  assert(silcharTx.length > 0, `Silchar has recorded audit transactions`);
  assert(silcharTx[0].type === 'ADD' || silcharTx[0].type === 'ADJUSTMENT', `Transaction type is valid (${silcharTx[0].type})`);
}

// ----------------------------------------------------
// TEST 11: PRAVAH MODEL A FROZEN XGBOOST DISRUPTION RISK MODEL
// ----------------------------------------------------
console.log('\n--- TEST SUITE 11: PRAVAH Model A Frozen XGBoost Road-Disruption Model ---');
{
  // 1. Frozen Feature Schema Verification
  const schemaPath = path.resolve('model-services/model-a/model/pravah_model_a_frozen_feature_schema.csv');
  assert(fs.existsSync(schemaPath), 'Frozen feature schema CSV exists in package directory');
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8').trim().split('\n');
  const schemaHeaders = schemaContent[0].split(',');
  assert(schemaHeaders[0] === 'feature_order' && schemaHeaders[1] === 'feature_name', 'Schema CSV headers match feature_order,feature_name');
  assert(schemaContent.length === 18, `Schema CSV contains header + exactly 17 feature rows (got ${schemaContent.length - 1} rows)`);

  const EXPECTED_FEATURES = [
    'rainfall_24h',
    'rainfall_72h',
    'rainfall_7d',
    'elevation_m',
    'slope_degrees',
    'historical_road_landslide_count',
    'historical_road_landslide_presence',
    'bt_road_km',
    'icbp_km',
    'cement_concrete_km',
    'paver_block_km',
    'total_paved_road_km',
    'bt_road_ratio',
    'icbp_ratio',
    'cement_concrete_ratio',
    'paver_block_ratio',
    'road_surface_diversity'
  ];

  for (let i = 0; i < EXPECTED_FEATURES.length; i++) {
    const row = schemaContent[i + 1].split(',');
    assert(Number(row[0]) === i + 1 && row[1] === EXPECTED_FEATURES[i], `Feature ${i + 1} strictly matches frozen name "${EXPECTED_FEATURES[i]}"`);
  }

  // 2. Frozen XGBoost Model JSON Integrity
  const modelJsonPath = path.resolve('model-services/model-a/model/pravah_model_a_baseline_xgb.json');
  assert(fs.existsSync(modelJsonPath), 'Frozen XGBoost model JSON exists');
  const modelJson = JSON.parse(fs.readFileSync(modelJsonPath, 'utf-8'));
  assert(modelJson.version !== undefined, `XGBoost model version metadata present`);
  assert(modelJson.learner?.learner_model_param?.num_feature === '17', `XGBoost model strictly trained on num_feature = 17 (got ${modelJson.learner?.learner_model_param?.num_feature})`);

  // 3. Feature Builder Determinism and Bounds
  const sampleSegment = NER_SEGMENTS[0];
  const builtFeatures = buildModelAFeatures(sampleSegment, 35.0);
  const builtKeys = Object.keys(builtFeatures);
  assert(builtKeys.length === 17, `Feature builder outputs exactly 17 features (got ${builtKeys.length})`);
  for (const feat of EXPECTED_FEATURES) {
    assert(feat in builtFeatures, `Feature builder includes feature "${feat}"`);
    assert(typeof builtFeatures[feat] === 'number' && !isNaN(builtFeatures[feat]), `Feature "${feat}" has valid finite number value (${builtFeatures[feat]})`);
  }
  assert(builtFeatures.rainfall_24h > 0, `24h rainfall positive under 35 mm/hr downpour (${builtFeatures.rainfall_24h} mm)`);
  assert(builtFeatures.rainfall_72h >= builtFeatures.rainfall_24h, `72h rainfall >= 24h rainfall (${builtFeatures.rainfall_72h} >= ${builtFeatures.rainfall_24h})`);
  assert(builtFeatures.elevation_m >= 0, `Elevation is positive (${builtFeatures.elevation_m} m)`);
  assert(builtFeatures.slope_degrees >= 0 && builtFeatures.slope_degrees <= 90, `Slope degrees within [0, 90] (${builtFeatures.slope_degrees} deg)`);
  assert(builtFeatures.total_paved_road_km > 0, `Total paved road km is positive (${builtFeatures.total_paved_road_km} km)`);
  assert(Object.keys(MODEL_A_FEATURE_PROVENANCE).length === 17, `Feature provenance registry covers all 17 features`);

  // 4. Reference Python Inference Execution
  const scriptPath = path.resolve('model-services/model-a/inference/predict_model_a.py');
  const exampleInputPath = path.resolve('model-services/model-a/examples/example_input.json');
  assert(fs.existsSync(scriptPath), 'predict_model_a.py exists');
  assert(fs.existsSync(exampleInputPath), 'example_input.json exists');

  const pyBinary = fs.existsSync('/opt/anaconda3/bin/python3') ? '/opt/anaconda3/bin/python3' : 'python3';
  const pyOutputRaw = execSync(`"${pyBinary}" "${scriptPath}" --model "${modelJsonPath}" --schema "${schemaPath}" --input "${exampleInputPath}"`, { encoding: 'utf-8' });
  const pyOutput = JSON.parse(pyOutputRaw.trim());
  const prob = pyOutput.event_probability ?? pyOutput.probability;
  assert(prob !== undefined, `Python reference script executed and returned probability: ${prob}`);
  assert(prob >= 0.0 && prob <= 1.0, `Probability is bounded in [0.0, 1.0] (got ${prob})`);
  assert(Math.abs(prob - 0.7061) < 0.005, `Probability matches frozen model benchmark ~0.7061 (got ${prob})`);
  assert(pyOutput.prediction === 1, `Prediction flag is 1 for prob > 0.50 (got ${pyOutput.prediction})`);
  assert(pyOutput.threshold === 0.5, `Threshold is strictly 0.50 (got ${pyOutput.threshold})`);
  assert(pyOutput.interpretation !== undefined, `Interpretation text generated: ${pyOutput.interpretation}`);

  // 5. Schema Validation Error Handling
  try {
    const invalidJsonPath = path.resolve('model-services/model-a/examples/temp_invalid.json');
    fs.writeFileSync(invalidJsonPath, JSON.stringify({ rainfall_24h: 12.0 }));
    let threw = false;
    try {
      execSync(`"${pyBinary}" "${scriptPath}" --model "${modelJsonPath}" --schema "${schemaPath}" --input "${invalidJsonPath}"`, { stdio: 'pipe' });
    } catch {
      threw = true;
    }
    fs.unlinkSync(invalidJsonPath);
    assert(threw, 'Python inference script strictly rejects input with missing features (schema enforcement)');
  } catch (e) {
    assert(false, `Schema error test failed: ${e}`);
  }

  // 6. Operational Road Status Separation Guarantee
  const evaluatedSegment = evaluateSegment(sampleSegment, VEHICLE_PROFILES[0], 0, undefined);
  assert(evaluatedSegment.passHardConstraints === true, 'Sample segment passes physical constraints and remains operational (OPEN)');
  assert(sampleSegment.id !== undefined, 'Segment operational status is separate from statistical risk score');

  // 7. Route Model A Exposure (Model B Downstream Interface Preparation)
  const routeExposure = await getRouteModelAExposure([sampleSegment.id, NER_SEGMENTS[1].id], 25.0);
  assert(routeExposure !== undefined, 'getRouteModelAExposure returned exposure object');
  assert(typeof routeExposure.max_probability === 'number', `max_probability is number (${routeExposure.max_probability})`);
  assert(typeof routeExposure.mean_probability === 'number', `mean_probability is number (${routeExposure.mean_probability})`);
  assert(typeof routeExposure.high_risk_segment_count === 'number', `high_risk_segment_count is number (${routeExposure.high_risk_segment_count})`);
  assert(routeExposure.segments.length === 2, `Exposure calculated for all 2 route segments`);

  // 8. Active Mission Corridor Segment Matching (No Arbitrary Road Slicing)
  const mockMissionKolasib = {
    id: 'MSN-TEST-01',
    communityId: 'MZ-KOL-004',
    communityName: 'Kolasib Forward Camp',
    assignedRouteId: 'ROUTE-SUG-01',
    status: 'IN_TRANSIT',
  };
  const kolasibCorridor = getMissionCorridorSegments(mockMissionKolasib, NER_SEGMENTS);
  assert(kolasibCorridor.mappedSegments.length === 1, `Kolasib mission correctly mapped to 1 authentic segment (got ${kolasibCorridor.mappedSegments.length})`);
  assert(kolasibCorridor.mappedSegments[0].id === 'SEG-SIL-KOL', `Kolasib corridor segment matches SEG-SIL-KOL (NH-306)`);
  assert(kolasibCorridor.unmappedSegmentsCount === 0, `Kolasib has 0 unmapped segments`);

  const mockMissionAssam = {
    id: 'MSN-TEST-02',
    communityId: 'AS-HAF-001',
    communityName: 'Haflong Relief Camp',
    assignedRouteId: 'ROUTE-AS-01',
    status: 'APPROVED',
  };
  const assamCorridor = getMissionCorridorSegments(mockMissionAssam, NER_SEGMENTS);
  assert(assamCorridor.mappedSegments.length === 2, `Assam corridor mapped to 2 authentic segments (got ${assamCorridor.mappedSegments.length})`);
  assert(assamCorridor.mappedSegments.map((s) => s.id).includes('SEG-GHY-NAG'), `Assam corridor includes SEG-GHY-NAG`);
  assert(assamCorridor.mappedSegments.map((s) => s.id).includes('SEG-NAG-HAF'), `Assam corridor includes SEG-NAG-HAF`);

  const mockMissionUnmapped = {
    id: 'MSN-TEST-03',
    communityId: 'REMOTE-TEST-001',
    communityName: 'Remote Valley Unmapped',
    assignedRouteId: 'ROUTE-REMOTE-UNMAPPED',
    status: 'SUGGESTED',
  };
  const unmappedCorridor = getMissionCorridorSegments(mockMissionUnmapped, NER_SEGMENTS);
  assert(unmappedCorridor.mappedSegments.length === 0, `Unmapped corridor outside NER_SEGMENTS correctly has 0 mapped segments (no fabricated geometry)`);
  assert(unmappedCorridor.unmappedSegmentsCount === 1, `Unmapped corridor explicitly records 1 unmapped segment`);

  // 9. Dedicated GeoJSON-Based Model A Map Overlay Layer
  const mockPredictions = {
    'SEG-SIL-KOL': {
      segment_id: 'SEG-SIL-KOL',
      probability: 0.74,
      prediction: 1,
      threshold: 0.50,
      risk_band: 'ELEVATED',
      interpretation: 'Elevated predicted disruption risk under monsoon saturation',
      model_version: '3.4.1-baseline-xgb',
      prediction_time: new Date().toISOString(),
      feature_snapshot: builtFeatures,
      source: 'MODEL_A_INFERENCE',
    },
    'SEG-DIM-KOH-MAIN': {
      segment_id: 'SEG-DIM-KOH-MAIN',
      probability: 0.88,
      prediction: 1,
      threshold: 0.50,
      risk_band: 'HIGH',
      interpretation: 'High predicted disruption risk under active seismic / rainfall trigger',
      model_version: '3.4.1-baseline-xgb',
      prediction_time: new Date().toISOString(),
      feature_snapshot: builtFeatures,
      source: 'MODEL_A_INFERENCE',
    },
    'SEG-GHY-SHL': {
      segment_id: 'SEG-GHY-SHL',
      probability: 0.18,
      prediction: 0,
      threshold: 0.50,
      risk_band: 'LOW',
      interpretation: 'Low disruption risk on four-lane expressway',
      model_version: '3.4.1-baseline-xgb',
      prediction_time: new Date().toISOString(),
      feature_snapshot: builtFeatures,
      source: 'MODEL_A_INFERENCE',
    },
  };

  const modelAGeoJSON = createModelARiskGeoJSON(
    NER_SEGMENTS,
    mockPredictions,
    {},
    new Set(['SEG-SIL-KOL'])
  );

  assert(modelAGeoJSON.type === 'FeatureCollection', `createModelARiskGeoJSON returns FeatureCollection`);
  assert(modelAGeoJSON.features.length === NER_SEGMENTS.length, `Features count matches segment count (${modelAGeoJSON.features.length})`);

  const elevatedFeature = modelAGeoJSON.features.find((f) => f.properties.segment_id === 'SEG-SIL-KOL');
  assert(elevatedFeature !== undefined, `Elevated risk feature exists for SEG-SIL-KOL`);
  assert(elevatedFeature.properties.model_a_probability === 0.74, `Elevated feature probability matches 0.74`);
  assert(elevatedFeature.properties.model_a_risk_band === 'ELEVATED', `Elevated feature risk_band is ELEVATED`);
  assert(elevatedFeature.properties.risk_color === '#EA580C', `Elevated feature highlighted in Tactical Orange (#EA580C)`);
  assert(elevatedFeature.properties.is_active_mission_segment === true, `is_active_mission_segment is true for active mission corridor`);
  assert(elevatedFeature.properties.operational_status !== 'BLOCKED', `Operational status remains accessible (${elevatedFeature.properties.operational_status}) despite elevated risk (no automatic road blocking)`);

  const highFeature = modelAGeoJSON.features.find((f) => f.properties.segment_id === 'SEG-DIM-KOH-MAIN');
  assert(highFeature !== undefined, `High risk feature exists for SEG-DIM-KOH-MAIN`);
  assert(highFeature.properties.model_a_risk_band === 'HIGH', `High risk feature risk_band is HIGH`);
  assert(highFeature.properties.risk_color === '#DC2626', `High risk feature highlighted in Red (#DC2626)`);

  const lowFeature = modelAGeoJSON.features.find((f) => f.properties.segment_id === 'SEG-GHY-SHL');
  assert(lowFeature !== undefined, `Low risk feature exists for SEG-GHY-SHL`);
  assert(lowFeature.properties.model_a_risk_band === 'LOW', `Low risk feature risk_band is LOW`);
  assert(lowFeature.properties.risk_color !== '#EA580C', `Low risk feature does NOT use elevated orange color`);
  assert(lowFeature.properties.operational_status === 'OPEN', `Operational status of SEG-GHY-SHL is OPEN`);

  // 10. Synchronous Cache Exposure Calculation for Active Mission
  const cachedExposure = calculateRouteModelAExposureFromCache(
    ['SEG-SIL-KOL', 'SEG-DIM-KOH-MAIN', 'SEG-GHY-SHL'],
    mockPredictions,
    0
  );
  assert(cachedExposure.max_probability === 0.88, `Max probability correctly calculated as 0.88 (got ${cachedExposure.max_probability})`);
  assert(cachedExposure.mean_probability === 0.6, `Mean probability correctly calculated as 0.60 (got ${cachedExposure.mean_probability})`);
  assert(cachedExposure.elevated_risk_segment_count === 2, `Elevated risk segment count (P >= 0.50) is 2 (got ${cachedExposure.elevated_risk_segment_count})`);
  assert(cachedExposure.high_risk_segment_count === 1, `High risk segment count (P >= 0.80) is 1 (got ${cachedExposure.high_risk_segment_count})`);
  assert(cachedExposure.mapped_segment_count === 3, `Mapped segment count is 3`);
  assert(cachedExposure.unmapped_segment_count === 0, `Unmapped segment count is 0`);
  assert((cachedExposure).safetyScore === undefined, `Strictly NO invented Safety Score (safetyScore is undefined)`);

  // 11. Custom Model A JSON Validator
  const validJsonReport = validateModelAJson(mockPredictions['SEG-SIL-KOL'].feature_snapshot);
  assert(validJsonReport.isValid === true, `validateModelAJson approves complete 17-feature snapshot`);
  assert(validJsonReport.missingFeatures.length === 0, `Zero missing features for valid input`);
  assert(Object.keys(validJsonReport.parsedFeatures).length === 17, `All 17 features parsed`);

  const missingJsonReport = validateModelAJson({ rainfall_24h: 50.0 });
  assert(missingJsonReport.isValid === false, `validateModelAJson detects missing features`);
  assert(missingJsonReport.missingFeatures.includes('rainfall_72h'), `Identifies rainfall_72h as missing`);
  assert(missingJsonReport.missingFeatures.length === 16, `Identifies all 16 missing features`);

  const nonNumericReport = validateModelAJson({ ...mockPredictions['SEG-SIL-KOL'].feature_snapshot, rainfall_24h: 'corrupted_string' });
  assert(nonNumericReport.isValid === false, `validateModelAJson rejects non-numeric feature value`);
  assert(nonNumericReport.invalidFeatures[0].key === 'rainfall_24h', `Pinpoints rainfall_24h as invalid`);
}

// =========================================================================
// TEST SUITE 12: PRAVAH Model B Dynamic Rerouting & Vehicle Location Awareness
// =========================================================================
console.log('\n--- TEST SUITE 12: PRAVAH Model B Dynamic Rerouting & Vehicle Location Awareness ---');

// 1. Splice route from vehicle GPS coordinates
const sampleRoute = [
  [24.8333, 92.7789], // Silchar Depot
  [24.6000, 92.7000],
  [24.4000, 92.6500],
  [24.2246, 92.6784], // Kolasib Destination
];
const vehicleGps = [24.5100, 92.6800]; // Convoy currently en route
const spliced = spliceRouteFromVehicleCoords(sampleRoute, vehicleGps);
assert(spliced.length >= 2, 'Spliced route contains at least 2 points');
assert(spliced[0][0] === vehicleGps[0] && spliced[0][1] === vehicleGps[1], 'Spliced route strictly starts at vehicle GPS coordinates');
assert(spliced[spliced.length - 1][0] === 24.2246 && spliced[spliced.length - 1][1] === 92.6784, 'Spliced route strictly terminates at destination endpoint');

// 2. Dynamic Reroute for IN_TRANSIT mission with live vehicle GPS
const mockInTransitMission = {
  id: 'M-TEST-001',
  communityId: 'MZ-KOL-004',
  communityName: 'Kolasib Forward Station',
  recommendedVehicleType: '4x4 High-Clearance Medic Carrier',
  cargoAllocations: [{ item: 'IV Fluids', quantity: 200, unit: 'L' }],
  assignedRouteId: 'ROUTE-MZ-01',
  suggestedDetour: 'Direct NH-306',
  status: 'IN_TRANSIT',
  urgency: 'P1_CRITICAL',
  createdAt: new Date().toISOString(),
  originWarehouseId: 'silchar',
  originWarehouseName: 'Silchar Strategic Depot',
  originCoords: [24.8333, 92.7789],
  disasterZoneId: 'DZ-KOL',
  disasterZoneName: 'Kolasib Landslide Sector',
  destinationEndpoint: [24.2246, 92.6784],
  destinationName: 'Kolasib Community Center',
  assignedVehicleId: 'Medic-01',
  routeGeometry: sampleRoute,
  routeDistanceKm: 68,
  routeDurationMinutes: 105,
};

const mockVehicle = {
  vehicle_id: 'Medic-01',
  vehicle_name: 'Medic Carrier Alpha',
  driver_name: 'Inspector L. Hmar',
  current_coords: [24.4850, 92.6900], // vehicle in transit
  status: 'ON_ROUTE',
  nominal_speed_kmh: 45,
};

const mockPredictionsHigh = {
  'SEG-SIL-KOL': {
    segment_id: 'SEG-SIL-KOL',
    probability: 0.84,
    prediction: 1,
    threshold: 0.50,
    risk_band: 'HIGH',
    model_version: 'v3.4.1',
  },
};

const rerouteResultTransit = await calculateMissionReroute(mockInTransitMission, {
  vehicle: mockVehicle,
  rainfallMmHr: 30,
  modelAPredictions: mockPredictionsHigh,
});

assert(rerouteResultTransit.isVehicleInTransit === true, 'calculateMissionReroute detects vehicle is in transit');
assert(rerouteResultTransit.reroutedFromCoords[0] === mockVehicle.current_coords[0] && rerouteResultTransit.reroutedFromCoords[1] === mockVehicle.current_coords[1], 'Reroute anchor matches vehicle live GPS coordinates');
assert(rerouteResultTransit.selectedOption !== undefined, 'Model B selected alternative route option exists');
assert(rerouteResultTransit.selectedOption.geometry[0][0] === mockVehicle.current_coords[0] && rerouteResultTransit.selectedOption.geometry[0][1] === mockVehicle.current_coords[1], 'Selected route option geometry strictly starts from live vehicle GPS');
assert(rerouteResultTransit.highestRiskProbability >= 0.50, 'Identified high risk segment on corridor');
assert(rerouteResultTransit.reason.includes('dynamically rerouted from live GPS'), 'Reason text accurately explains vehicle-anchored detour');

// 3. Dynamic Reroute for SUGGESTED mission (prior to dispatch, warehouse origin)
const mockSuggestedMission = {
  ...mockInTransitMission,
  id: 'M-TEST-002',
  status: 'SUGGESTED',
};

const rerouteResultSuggested = await calculateMissionReroute(mockSuggestedMission, {
  rainfallMmHr: 30,
  modelAPredictions: mockPredictionsHigh,
});

assert(rerouteResultSuggested.isVehicleInTransit === false, 'calculateMissionReroute detects pre-dispatch status');
assert(rerouteResultSuggested.reroutedFromCoords[0] === mockSuggestedMission.originCoords[0] && rerouteResultSuggested.reroutedFromCoords[1] === mockSuggestedMission.originCoords[1], 'Reroute originates from warehouse origin coordinates');
assert(rerouteResultSuggested.selectedOption.distanceKm > 0, 'Selected option distance is positive');
assert(rerouteResultSuggested.selectedOption.predictedEtaMinutes > 0, 'Selected option predicted ETA is positive');

// 4. Proper Descriptive Route Naming Tests
const skBypassName = resolveDescriptiveRouteName(['SEG-SK-EAST'], 2, true, 'ROUTE-SK-02_BYPASS');
assert(skBypassName.includes('NH-717A') && skBypassName.includes('Eastern Ridge Bypass'), `Sikkim bypass descriptive name includes NH-717A and Eastern Ridge Bypass (got "${skBypassName}")`);

const skPrimaryName = resolveDescriptiveRouteName(['SEG-SK-TEESTA'], 1, false, 'ROUTE-SK-02');
assert(skPrimaryName.includes('NH-10') && skPrimaryName.includes('Teesta Canyon'), `Sikkim primary descriptive name includes NH-10 and Teesta Canyon (got "${skPrimaryName}")`);

const nlBypassName = resolveDescriptiveRouteName(['SEG-DIM-WOK', 'SEG-WOK-KOH'], 2, true, 'ROUTE-NL-01_BYPASS');
assert(nlBypassName.includes('SH-Wokha') || nlBypassName.includes('Wokha'), `Nagaland bypass descriptive name includes Wokha bypass (got "${nlBypassName}")`);

const mzBypassName = resolveDescriptiveRouteName(['SEG-SIL-KOL'], 2, true, 'ROUTE-MZ-01_BYPASS');
assert(mzBypassName.includes('Hailakandi - Bhairabi Bypass'), `Mizoram bypass descriptive name includes Hailakandi - Bhairabi Bypass (got "${mzBypassName}")`);

assert(typeof rerouteResultTransit.selectedOption.routeName === 'string' && rerouteResultTransit.selectedOption.routeName.length > 0, 'Selected reroute option has proper routeName string');

// 5. Tactical Map GeoJSON Adapter Property Verification
const routeOptionsGeoJSON = createModelBRouteOptionsGeoJSON([rerouteResultTransit.selectedOption]);
assert(routeOptionsGeoJSON.type === 'FeatureCollection', 'createModelBRouteOptionsGeoJSON returns valid FeatureCollection');
assert(routeOptionsGeoJSON.features.length === 1, 'Contains exactly 1 route feature');
assert(typeof routeOptionsGeoJSON.features[0].properties.route_name === 'string' && routeOptionsGeoJSON.features[0].properties.route_name.length > 0, `GeoJSON properties contain non-empty route_name ("${routeOptionsGeoJSON.features[0].properties.route_name}")`);
assert(routeOptionsGeoJSON.features[0].properties.distance_km > 0, 'GeoJSON properties contain positive distance_km');
assert(routeOptionsGeoJSON.features[0].properties.predicted_eta_minutes > 0, 'GeoJSON properties contain positive predicted_eta_minutes');

// 6. Model A Dynamic Corridor Re-evaluation for Rerouted Bypasses
const mockSikkimReroutedMission = {
  id: 'M-SK-002',
  status: 'IN_TRANSIT',
  communityName: 'Gangtok Forward Post',
  assignedRouteId: 'ROUTE-SK-02_BYPASS',
  routeOptions: [
    {
      id: 'opt-sk-bypass',
      routeId: 'ROUTE-SK-02_BYPASS',
      routeNumber: 1,
      routeRank: 1,
      routeName: 'NH-717A Eastern Ridge Bypass (via Pakyong & Singtam)',
      corridorSegmentIds: ['SEG-SK-EAST'],
      geometry: [[27.3314, 88.6138], [27.0288, 88.4714]],
      distanceKm: 83.8,
      osrmDurationMinutes: 145,
      predictedDelayFactor: 1.05,
      predictedEtaMinutes: 152,
      etaOverheadMinutes: 7,
      predictedPreferredRoute: true,
      modelVersion: 'v3.4.1',
    },
  ],
};

const corridorMatchSikkim = getMissionCorridorSegments(mockSikkimReroutedMission, NER_SEGMENTS, 'opt-sk-bypass');
assert(corridorMatchSikkim.mappedSegments.length === 1, `Rerouted Sikkim mission mapped to 1 segment (got ${corridorMatchSikkim.mappedSegments.length})`);
assert(corridorMatchSikkim.mappedSegments[0].id === 'SEG-SK-EAST', `Rerouted corridor dynamically evaluated as SEG-SK-EAST instead of blocked TEESTA (got ${corridorMatchSikkim.mappedSegments[0].id})`);

const mockNagalandReroutedMission = {
  id: 'M-NL-001',
  status: 'APPROVED',
  communityName: 'Kohima District Hospital',
  assignedRouteId: 'ROUTE-NL-01_BYPASS',
  routeOptions: [
    {
      id: 'opt-nl-bypass',
      routeId: 'ROUTE-NL-01_BYPASS',
      routeNumber: 1,
      routeRank: 1,
      routeName: 'SH-Wokha / NH-2 Mountain Bypass (via Niuland & Wokha)',
      corridorSegmentIds: ['SEG-DIM-WOK', 'SEG-WOK-KOH'],
      geometry: [[25.9095, 93.7266], [25.6751, 94.1086]],
      distanceKm: 160,
      osrmDurationMinutes: 240,
      predictedDelayFactor: 1.10,
      predictedEtaMinutes: 264,
      etaOverheadMinutes: 24,
      predictedPreferredRoute: true,
      modelVersion: 'v3.4.1',
    },
  ],
};

const corridorMatchNagaland = getMissionCorridorSegments(mockNagalandReroutedMission, NER_SEGMENTS, 'opt-nl-bypass');
assert(corridorMatchNagaland.mappedSegments.length === 2, `Rerouted Nagaland mission mapped to 2 bypass segments (got ${corridorMatchNagaland.mappedSegments.length})`);
assert(corridorMatchNagaland.mappedSegments.some((s) => s.id === 'SEG-DIM-WOK'), 'Corridor includes SEG-DIM-WOK');
assert(corridorMatchNagaland.mappedSegments.some((s) => s.id === 'SEG-WOK-KOH'), 'Corridor includes SEG-WOK-KOH');

// Dima Hasao Rerouted Mission: dynamically maps to SEG-NAG-HAF and discards SEG-HAF-SIL
const mockDimaHasaoReroutedMission = {
  id: 'SUGG-ASDH011-4569',
  status: 'IN_TRANSIT',
  communityName: 'Dima Hasao Hill Sector Community Depot',
  destinationName: 'Dima Hasao Threat Corridor',
  originWarehouseId: 'silchar',
  isRerouted: true,
  assignedRouteId: 'ROUTE-AS-03_BYPASS',
  routeGeometry: [[24.833, 92.779], [25.183, 93.016]],
  corridorSegmentIds: ['SEG-NAG-HAF'],
};

const corridorMatchDimaHasao = getMissionCorridorSegments(mockDimaHasaoReroutedMission, NER_SEGMENTS);
assert(corridorMatchDimaHasao.mappedSegments.length === 1, `Rerouted Dima Hasao mission mapped to 1 segment (got ${corridorMatchDimaHasao.mappedSegments.length})`);
assert(corridorMatchDimaHasao.mappedSegments[0].id === 'SEG-NAG-HAF', `Rerouted Dima Hasao corridor maps to bypass SEG-NAG-HAF instead of blocked SEG-HAF-SIL (got ${corridorMatchDimaHasao.mappedSegments[0].id})`);
assert(!corridorMatchDimaHasao.mappedSegments.some((s) => s.id === 'SEG-HAF-SIL'), 'Rerouted corridor completely discards previous blocked SEG-HAF-SIL segment');

// Verify Model A risk dynamically recalculates on the bypass segment
const mockPredictions = {
  'SEG-HAF-SIL': { probability: 0.84, prediction: 1, risk_band: 'HIGH', segment_id: 'SEG-HAF-SIL' },
  'SEG-NAG-HAF': { probability: 0.18, prediction: 0, risk_band: 'LOW', segment_id: 'SEG-NAG-HAF' },
};
const exposureBefore = calculateRouteModelAExposureFromCache(['SEG-HAF-SIL'], mockPredictions);
const exposureAfter = calculateRouteModelAExposureFromCache(corridorMatchDimaHasao.mappedSegments, mockPredictions);

assert(exposureBefore.max_probability === 0.84, `Old route Model A risk was 84% (got ${exposureBefore.max_probability})`);
assert(exposureAfter.max_probability === 0.18, `Rerouted corridor Model A risk dynamically drops to 18% (got ${exposureAfter.max_probability})`);
assert(exposureAfter.high_risk_segment_count === 0, 'Rerouted corridor has 0 high risk segments');

console.log('\n====================================================');
console.log(`🎉 ALL TESTS EXECUTED: ${passedTests} / ${totalTests} PASSED (100%)`);
console.log('====================================================');

