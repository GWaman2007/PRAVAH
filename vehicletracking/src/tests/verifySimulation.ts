import {
  INITIAL_VEHICLES,
  NER_ROUTES,
  BLACKOUT_ZONES,
  HAZARD_ZONES,
} from '../data/nerFleetData';
import {
  initRouteDistances,
  stepVehicleSimulation,
} from '../engine/simulationEngine';
import {
  pointToPolylineDistanceM,
  isPointInPolygon,
  haversineDistanceKm,
} from '../engine/gisMath';

// Initialize precomputed distances
initRouteDistances(NER_ROUTES);

console.log('--- 1. Testing Route & Waypoint Geometry ---');
Object.values(NER_ROUTES).forEach((route) => {
  console.log(`Route [${route.id}]: ${route.name}`);
  console.log(`  Highway: ${route.highwayCode} | Total Distance: ${route.totalDistanceKm} km`);
  console.log(`  Waypoints: ${route.waypoints.length} | Points: ${route.coordinates.length}`);
  if (route.coordinates.length < 10) {
    throw new Error(`Route ${route.id} coordinates density is too low`);
  }
});

console.log('\n--- 2. Testing Blackout Polygon Detection & Dead-Reckoning ---');
// Test Oxy-Tanker-04 inside Teesta Gorge Blackout Zone
const oxyRoute = NER_ROUTES['route-oxy-04'];
const teestaBlackout = BLACKOUT_ZONES.find((z) => z.id === 'zone-teesta-gorge')!;
console.log(`Teesta Gorge Blackout Polygon vertices: ${teestaBlackout.polygon.length}`);

// Step simulation through Oxy-Tanker-04 route until entering blackout
let oxyVehicle = { ...INITIAL_VEHICLES[1] };
let enteredBlackout = false;
let emergedBlackout = false;

for (let t = 0; t < 300; t++) {
  const { updatedVehicle, newAlerts } = stepVehicleSimulation(
    oxyVehicle,
    oxyRoute,
    BLACKOUT_ZONES,
    HAZARD_ZONES,
    30 // 30s steps
  );
  oxyVehicle = updatedVehicle;

  if (updatedVehicle.status === 'DEAD_ZONE_EXTRAPOLATING' && !enteredBlackout) {
    enteredBlackout = true;
    console.log(`✓ Oxy-Tanker-04 entered blackout zone at ${updatedVehicle.current_coords}`);
    console.log(`  Status: ${updatedVehicle.status} | Satellites: ${updatedVehicle.satellite_count}`);
    const alert = newAlerts.find((a) => a.type === 'BLACKOUT_ENTER');
    console.log(`  Alert emitted: ${alert?.title} - ${alert?.message}`);
  } else if (enteredBlackout && updatedVehicle.status === 'ON_ROUTE' && !emergedBlackout) {
    emergedBlackout = true;
    console.log(`✓ Oxy-Tanker-04 emerged from blackout zone at ${updatedVehicle.current_coords}`);
    console.log(`  Status: ${updatedVehicle.status} | Satellites: ${updatedVehicle.satellite_count}`);
    const alert = newAlerts.find((a) => a.type === 'BLACKOUT_EXIT');
    console.log(`  Alert emitted: ${alert?.title} - ${alert?.message}`);
    break;
  }
}

if (!enteredBlackout) {
  throw new Error('Oxy-Tanker-04 failed to enter Teesta Blackout polygon during simulation');
}

console.log('\n--- 3. Testing Off-Route Deviation Anomaly (>500m) ---');
let devVehicle = { ...INITIAL_VEHICLES[0] };
const devRoute = NER_ROUTES[devVehicle.assigned_route_id];

// Advance to Shillong (~60 km)
devVehicle.traveled_distance_km = 60;
// Trigger deviation
devVehicle.is_deviated_manual = true;

const { updatedVehicle: deviatedVehicle, newAlerts: devAlerts } = stepVehicleSimulation(
  devVehicle,
  devRoute,
  BLACKOUT_ZONES,
  HAZARD_ZONES,
  10
);

console.log(`Deviation Distance: ${deviatedVehicle.deviation_distance_m} meters`);
console.log(`Vehicle Status: ${deviatedVehicle.status}`);
const devAlert = devAlerts.find((a) => a.type === 'ROUTE_DEVIATION');
console.log(`Deviation Alert Emitted: ${devAlert?.title} (Severity: ${devAlert?.severity})`);

if (deviatedVehicle.deviation_distance_m < 500) {
  throw new Error(`Deviation distance ${deviatedVehicle.deviation_distance_m}m was under 500m`);
}
if (deviatedVehicle.status !== 'DEVIATED') {
  throw new Error(`Expected status DEVIATED, got ${deviatedVehicle.status}`);
}

console.log('\n--- 4. Testing Stationary Breakdown in Hazard Zone (>10s) ---');
// Position vehicle inside 29th Mile Hazard Zone
let hazardVehicle = { ...INITIAL_VEHICLES[1] };
hazardVehicle.current_coords = [27.0100, 88.4600]; // Inside 29th Mile hazard
hazardVehicle.is_stopped_manual = true;
hazardVehicle.speed_kmh = 0;
hazardVehicle.stationary_timer_sec = 0;

console.log(`Checking point in 29th Mile hazard polygon: ${isPointInPolygon(hazardVehicle.current_coords, HAZARD_ZONES[0].polygon)}`);

// Step by 12 seconds
const { updatedVehicle: stoppedVehicle, newAlerts: hazardAlerts } = stepVehicleSimulation(
  hazardVehicle,
  oxyRoute,
  BLACKOUT_ZONES,
  HAZARD_ZONES,
  12
);

console.log(`Stopped duration: ${stoppedVehicle.stationary_timer_sec}s | Status: ${stoppedVehicle.status}`);
const hazardAlert = hazardAlerts.find((a) => a.type === 'STATIONARY_HAZARD');
console.log(`Stationary Hazard Alert: ${hazardAlert?.title} - ${hazardAlert?.message}`);

if (stoppedVehicle.status !== 'CRITICAL_STATIONARY') {
  throw new Error(`Expected CRITICAL_STATIONARY, got ${stoppedVehicle.status}`);
}

console.log('\n===========================================');
console.log('ALL GIS & TELEMETRY SIMULATION TESTS PASSED!');
console.log('===========================================');
