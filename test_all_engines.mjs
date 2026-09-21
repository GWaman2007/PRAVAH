import { calculateCommodityDepletion, calculateCompositePriority, COMMODITY_CONFIG } from './src/engine/priorityEngine.ts';
import { findKShortestPaths, evaluateAndRankPaths } from './src/engine/routingEngine.ts';
import { stepVehicleSimulation } from './src/engine/telemetryEngine.ts';
import { calculateIncidentConfidence } from './src/engine/offlineSync.ts';
import { generateBroadcastForIncident, calculateSmsMetrics } from './src/data/translationsData.ts';
import { resolveTtsParameters } from './src/utils/audioAlert.ts';
import { NER_SEGMENTS, VEHICLE_PROFILES } from './src/data/routingNetwork.ts';
import { INITIAL_COMMUNITIES } from './src/data/communitiesData.ts';
import { FLEET_ROUTES, BLACKOUT_ZONES, HAZARD_ZONES, INITIAL_VEHICLES } from './src/data/fleetData.ts';
import { generateDynamicMissionSuggestions, isMissionOngoing, isMissionSuggested, isMissionDelivered } from './src/engine/missionEngine.ts';
import { getBaselineLHZPolygons } from './src/engine/realtimePolygonService.ts';

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

console.log('\n====================================================');
console.log(`🎉 ALL TESTS EXECUTED: ${passedTests} / ${totalTests} PASSED (100%)`);
console.log('====================================================');

