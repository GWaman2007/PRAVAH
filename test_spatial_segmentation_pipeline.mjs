import assert from 'node:assert';
import {
  splitRouteInto5EqualSegments,
  buildSpatialSegmentModelAFeatures,
  evaluateRouteSpatialSegments,
  calculateSpatialRouteExposure,
  buildSynchronousSpatialSegments,
} from './src/engine/spatialSegmentService.ts';
import {
  createModelBRouteOptionsGeoJSON,
  createSpatialSegmentMarkersGeoJSON,
} from './src/engine/mapGeoJSONAdapters.ts';
import {
  generateAndRankMissionRoutes,
  calculateMissionReroute,
} from './src/engine/modelBRouteRankingService.ts';
import { NER_SEGMENTS } from './src/data/routingNetwork.ts';

console.log('====================================================');
console.log('🧪 RUNNING MODEL A -> 5-EQUAL-DISTANCE SPATIAL SEGMENTATION -> MODEL B TESTS');
console.log('====================================================');

// Test Polyline: 100km synthetic mountain route with 50 coordinates
const samplePolyline = [];
for (let i = 0; i <= 50; i++) {
  const t = i / 50;
  // Lat 25.5 to 26.2, Lng 91.8 to 92.5
  samplePolyline.push([25.5 + t * 0.7 + Math.sin(t * 10) * 0.02, 91.8 + t * 0.7]);
}

// 1. EXACT 5 EQUAL-DISTANCE SPATIAL SEGMENTATION
console.log('\n--- 1. Testing 5 Equal-Distance Slicing ---');
const slices = splitRouteInto5EqualSegments(samplePolyline, 'TEST-ROUTE-01');
assert(slices.length === 5, 'Must produce EXACTLY 5 spatial segments');
assert(slices[0].order === 1 && (slices[0].percentageRange.includes('0') && slices[0].percentageRange.includes('20%')), 'S1 is 0–20%');
assert(slices[1].order === 2 && (slices[1].percentageRange.includes('20') && slices[1].percentageRange.includes('40%')), 'S2 is 20–40%');
assert(slices[2].order === 3 && (slices[2].percentageRange.includes('40') && slices[2].percentageRange.includes('60%')), 'S3 is 40–60%');
assert(slices[3].order === 4 && (slices[3].percentageRange.includes('60') && slices[3].percentageRange.includes('80%')), 'S4 is 60–80%');
assert(slices[4].order === 5 && (slices[4].percentageRange.includes('80') && slices[4].percentageRange.includes('100%')), 'S5 is 80–100%');

const totalKm = slices.reduce((acc, s) => acc + s.distanceKm, 0);
console.log(`  Total Route Geodesic Distance: ${totalKm.toFixed(2)} km`);

// Verify equal distance partitioning (each segment is ~20% of total distance)
slices.forEach((s) => {
  const expectedKm = totalKm / 5;
  const diffPct = Math.abs(s.distanceKm - expectedKm) / expectedKm;
  assert(diffPct < 0.05, `Segment S${s.order} distance ${s.distanceKm.toFixed(2)}km is within 5% of target ${expectedKm.toFixed(2)}km`);
  console.log(`  ✅ S${s.order}: ${s.percentageRange} | ${s.distanceKm.toFixed(2)} km (start: ${s.startKm.toFixed(1)}km, end: ${s.endKm.toFixed(1)}km)`);
});

// 2. MODEL A 17-FEATURE SCHEMA VALIDATION
console.log('\n--- 2. Testing Model A 17-Feature Schema Integrity ---');
const features = buildSpatialSegmentModelAFeatures(slices[0].geometry, slices[0].distanceKm, 25.0);
const EXPECTED_17_KEYS = [
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
  'road_surface_diversity',
];

const featureKeys = Object.keys(features);
assert(featureKeys.length === 17, `Features must contain exactly 17 keys, got ${featureKeys.length}`);
EXPECTED_17_KEYS.forEach((k) => {
  assert(k in features, `Missing expected frozen feature: ${k}`);
  assert(typeof features[k] === 'number', `Feature ${k} must be a number`);
});
console.log('  ✅ Model A 17-feature schema perfectly matches frozen specification (ISRO LHZ, elevation, gradient, rainfall)');

// 3. SYNCHRONOUS AND ASYNC MODEL A SEGMENT EVALUATION
console.log('\n--- 3. Testing Model A S1..S5 Inference & Risk Categorization ---');
const syncSegments = buildSynchronousSpatialSegments('ROUTE-TEST-01', samplePolyline, 28.0);
assert(syncSegments.length === 5, 'Synchronous spatial segments returns exactly 5 segments');
syncSegments.forEach((seg) => {
  assert(typeof seg.modelA.probability === 'number', `S${seg.order} has valid numeric probability`);
  assert(seg.modelA.probability >= 0 && seg.modelA.probability <= 1.0, `S${seg.order} probability is between 0 and 1`);
  assert(['LOW', 'MODERATE', 'HIGH', 'VERY_HIGH'].includes(seg.modelA.riskBand), `S${seg.order} riskBand is valid`);
  console.log(`  ✅ S${seg.order} (${seg.percentageRange}): Model A Probability = ${(seg.modelA.probability * 100).toFixed(1)}% [${seg.modelA.riskBand}]`);
});

// 4. OPERATIONAL INCIDENT ISOLATION & FEASIBILITY PRUNING
console.log('\n--- 4. Testing Incident Localization vs Model A Disruption Prediction ---');
// Introduce a localized blockage in S3's geometry (at ~50% of the route)
const s3Midpoint = slices[2].geometry[Math.floor(slices[2].geometry.length / 2)];
const mockDisruptions = {
  'INC-BRIDGE-COLLAPSE': {
    status: 'TOTAL_BLOCKAGE',
    cause: 'Bridge span compromised',
    description: 'Brahmaputra tributary bridge washed out',
    location: { lat: s3Midpoint[0], lng: s3Midpoint[1] },
  },
};

const evaluatedWithIncident = await evaluateRouteSpatialSegments(
  'ROUTE-INCIDENT-TEST',
  samplePolyline,
  25.0,
  mockDisruptions
);

assert(evaluatedWithIncident[2].operationalStatus.isBlocked === true, 'S3 must be marked BLOCKED by the localized incident');
assert(evaluatedWithIncident[0].operationalStatus.isBlocked === false, 'S1 must NOT be marked blocked (stays clean)');
assert(evaluatedWithIncident[1].operationalStatus.isBlocked === false, 'S2 must NOT be marked blocked (stays clean)');
assert(evaluatedWithIncident[3].operationalStatus.isBlocked === false, 'S4 must NOT be marked blocked (stays clean)');
assert(evaluatedWithIncident[4].operationalStatus.isBlocked === false, 'S5 must NOT be marked blocked (stays clean)');

const exposure = calculateSpatialRouteExposure(evaluatedWithIncident);
assert(exposure.blockedSegmentCount === 1, 'Blocked segment count must be 1');
console.log(`  ✅ Confirmed incident localized strictly to S3 (${evaluatedWithIncident[2].percentageRange}) without contaminating S1, S2, S4, S5`);
console.log(`  ✅ Route exposure: blockedCount = ${exposure.blockedSegmentCount}, meanProb = ${(exposure.meanProbability * 100).toFixed(1)}%`);

// 5. GEOJSON ADAPTER COLOR RULES (SECTION 10)
console.log('\n--- 5. Testing GIS GeoJSON Rendering Rules ---');
const mockOption = {
  id: 'OPT-1',
  missionId: 'M-TEST',
  routeNumber: 1,
  routeRank: 1,
  routeId: 'ROUTE-TEST',
  routeName: 'Test Corridor',
  geometry: samplePolyline,
  distanceKm: totalKm,
  osrmDurationMinutes: 120,
  predictedDelayFactor: 1.25,
  predictedEtaMinutes: 150,
  etaOverheadMinutes: 30,
  predictedPreferredRoute: true,
  modelVersion: 'model_b_v2.1_calibrated',
  spatialSegments: evaluatedWithIncident,
  isFeasible: false,
};

const routeGeoJSON = createModelBRouteOptionsGeoJSON([mockOption], 'OPT-1');
assert(routeGeoJSON.features.length === 5, 'createModelBRouteOptionsGeoJSON renders 5 distinct spatial segment line features');

// Check Section 10 color specifications:
// S3 is blocked -> RED (#DC2626)
// S1, S2, S4, S5 are not blocked -> Blue (#2563EB) or Yellow (#F59E0B) if P >= 0.50
assert(routeGeoJSON.features[2].properties.color === '#DC2626', 'S3 blocked segment is rendered RED (#DC2626)');
assert(routeGeoJSON.features[0].properties.color !== '#DC2626', 'S1 nominal segment is NOT rendered red');
console.log(`  ✅ S1 color: ${routeGeoJSON.features[0].properties.color}`);
console.log(`  ✅ S3 (blocked) color: ${routeGeoJSON.features[2].properties.color} (RED)`);

const markersGeoJSON = createSpatialSegmentMarkersGeoJSON([mockOption], 'OPT-1');
const sMarkers = markersGeoJSON.features.filter((f) => f.properties.type === 'SEGMENT_MARKER');
assert(sMarkers.length === 5, 'Produces 5 milestone markers S1..S5');
assert(sMarkers[0].properties.label === 'S1', 'Marker 1 is labeled S1');
assert(sMarkers[4].properties.label === 'S5', 'Marker 5 is labeled S5');
console.log('  ✅ GIS milestone markers S1..S5 verified with exact inspection metadata');

// 6. ACTIVE-MISSION REROUTING FROM LIVE VEHICLE GPS
console.log('\n--- 6. Testing Active-Mission Live GPS Rerouting Pipeline ---');
const activeMission = {
  id: 'M-ACTIVE-001',
  communityId: 'COMM-001',
  communityName: 'Nongpoh Relief Hub',
  originCoords: [26.18, 91.75], // Guwahati
  destinationEndpoint: [25.57, 91.89], // Shillong
  status: 'IN_TRANSIT',
  recommendedVehicleType: '4x4_HEAVY_TRUCK',
  corridorSegmentIds: ['SEG-GHY-SHL'],
  assignedRouteId: 'ROUTE-ML-01',
  routeGeometry: samplePolyline,
  routeDistanceKm: 100,
  routeDurationMinutes: 120,
};

// Convoy is 30km down the road (live telemetry GPS)
const liveVehicleTelemetry = {
  vehicle_id: 'VEH-TRK-01',
  mission_id: 'M-ACTIVE-001',
  current_coords: [25.85, 91.82],
  speed_kmh: 42,
  route_progress_pct: 35,
  traveled_distance_km: 35,
};

const rerouteResult = await calculateMissionReroute(activeMission, {
  vehicle: liveVehicleTelemetry,
  allSegments: NER_SEGMENTS,
  rainfallMmHr: 30.0,
  disruptions: mockDisruptions,
});

assert(rerouteResult.isVehicleInTransit === true, 'Reroute detects vehicle is in transit');
assert(
  Math.abs(rerouteResult.reroutedFromCoords[0] - liveVehicleTelemetry.current_coords[0]) < 0.001 &&
  Math.abs(rerouteResult.reroutedFromCoords[1] - liveVehicleTelemetry.current_coords[1]) < 0.001,
  'Reroute anchor strictly starts from driver current_coords (live GPS)'
);
assert(rerouteResult.selectedOption, 'Selected reroute option exists');
assert(rerouteResult.selectedOption.spatialSegments?.length === 5, 'Rerouted option has evaluated 5 spatial segments');
console.log(`  ✅ Live GPS anchor verified: [${rerouteResult.reroutedFromCoords.join(', ')}]`);
console.log(`  ✅ Rerouted option: "${rerouteResult.selectedOption.routeName}" (${rerouteResult.selectedOption.distanceKm.toFixed(1)} km)`);
console.log(`  ✅ Reroute spatial segments evaluated: ${rerouteResult.selectedOption.spatialSegments.length} segments`);

console.log('\n====================================================');
console.log('🎉 ALL 5-EQUAL-DISTANCE MODEL A -> MODEL B TESTS PASSED (100%)');
console.log('====================================================\n');
