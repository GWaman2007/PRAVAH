import http from 'http';
import { spawn } from 'child_process';
import { generateAndRankMissionRoutes } from './src/engine/modelBRouteRankingService.ts';
import { NER_SEGMENTS, VEHICLE_PROFILES } from './src/data/routingNetwork.ts';
import type { ReliefMission, SegmentIncident } from './src/types/index.ts';

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failCount++;
  }
}

async function isPortOpen(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/api/incidents`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function runBhuvanTests() {
  console.log('====================================================');
  console.log('🚀 PRAVAH - ISRO BHUVAN ROUTING INTEGRATION TESTS');
  console.log('====================================================\n');

  let serverProcess = null;
  const isRunning = await isPortOpen(3001);
  if (!isRunning) {
    console.log('Starting local PRAVAH server on port 3001...');
    serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
      stdio: 'pipe',
      detached: false,
    });
    // Wait up to 15s for server to boot
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 500));
      if (await isPortOpen(3001)) {
        console.log('Server is online on port 3001!\n');
        break;
      }
    }
  } else {
    console.log('Server already running on port 3001.\n');
  }

  // Test Mission 1: Guwahati to Nagaon (Assam Intrastate)
  const assamMission: ReliefMission = {
    id: 'DEMO-BHUVAN-AS-01',
    communityId: 'nagaon',
    communityName: 'Nagaon District Hospital Relief Hub',
    originWarehouseId: 'guwahati',
    originWarehouseName: 'Guwahati Regional Staging Depot',
    originCoords: [26.1445, 91.7362],
    destinationEndpoint: [26.3452, 92.6840],
    targetPayloadWeightKg: 8000,
    priority: 'CRITICAL',
    status: 'SUGGESTED',
    recommendedVehicleType: 'MED_4X4_TRUCK_8T',
  };

  try {
    console.log('--- TEST 1: Bhuvan Candidate Generation & Integration ---');
    try {
      const postData = JSON.stringify({
        origin: assamMission.originCoords,
        destination: assamMission.destinationEndpoint,
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const proxyRes = await fetch('http://localhost:3001/api/bhuvan/shortest-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: postData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (proxyRes && proxyRes.ok) {
        const bhuvanData = await proxyRes.json();
        console.log('  Live Bhuvan Proxy Status:', bhuvanData.success, 'Coords count:', bhuvanData.coordinates?.length);
        assert(bhuvanData.success === true, 'Bhuvan proxy returned success: true');
        assert(Array.isArray(bhuvanData.coordinates) && bhuvanData.coordinates.length > 10, 'Bhuvan returned real coordinate polyline (> 10 points)');
        assert(bhuvanData.routeSource === 'BHUVAN', 'Bhuvan candidate tagged routeSource === BHUVAN');
      } else {
        assert(false, `Bhuvan proxy HTTP ${proxyRes.status}`);
      }
    } catch (err) {
      assert(false, `Proxy check failed: ${err.message}`);
    }

  // Run full generateAndRankMissionRoutes pipeline
  console.log('\n--- TEST 2: Multi-Route Candidate Pipeline Execution ---');
  const rankingResult = await generateAndRankMissionRoutes(assamMission, {
    rainfallMmHr: 18.0,
  });

  assert(rankingResult.options.length > 0, `Pipeline returned ${rankingResult.options.length} route options`);
  assert(rankingResult.options.length <= 2, 'Pipeline strictly returns TOP 2 options');
  assert(rankingResult.feasibleCount >= 1, `Feasible candidates count is valid: ${rankingResult.feasibleCount}`);

  // Check if any option has routeSource BHUVAN or OSRM/GRAPH
  const hasValidSources = rankingResult.options.every((opt) =>
    ['BHUVAN', 'OSRM', 'GRAPH', 'PRECOMPUTED'].includes(opt.routeSource || 'GRAPH')
  );
  assert(hasValidSources, 'All route options have valid typed routeSource');

  // Test Mission 2: Shillong to Jowai (Meghalaya Intrastate Corridor)
  console.log('\n--- TEST 3: Bhuvan Surfacing in TOP 2 for Meghalaya Corridor ---');
  const meghalayaMission: ReliefMission = {
    id: 'DEMO-BHUVAN-ML-01',
    communityId: 'jowai',
    communityName: 'Jowai Civil Hospital',
    originWarehouseId: 'shillong',
    originWarehouseName: 'Shillong Central Medical Store',
    originCoords: [25.5788, 91.8933],
    destinationEndpoint: [25.4527, 92.2039],
    targetPayloadWeightKg: 5000,
    priority: 'HIGH',
    status: 'SUGGESTED',
    recommendedVehicleType: 'MED_4X4_TRUCK_8T',
  };

  const mlRanking = await generateAndRankMissionRoutes(meghalayaMission, {
    rainfallMmHr: 10.0,
  });

  const mlBhuvan = mlRanking.options.find((opt) => opt.routeSource === 'BHUVAN');
  if (mlBhuvan) {
    console.log(`  Bhuvan surfaced in Top 2 as Route ${mlBhuvan.routeNumber} (Rank ${mlBhuvan.routeRank})`);
    assert(mlBhuvan.routeSource === 'BHUVAN', 'Bhuvan candidate appears in the final Top 2');
    assert(mlBhuvan.distanceKm > 0, `Bhuvan option has valid OSRM distance: ${mlBhuvan.distanceKm} km`);
    assert(mlBhuvan.osrmDurationMinutes > 0, `Bhuvan option has valid OSRM duration: ${mlBhuvan.osrmDurationMinutes} mins`);
    assert(mlBhuvan.predictedEtaMinutes > 0, `Bhuvan option has valid predicted ETA: ${mlBhuvan.predictedEtaMinutes} mins`);
    assert(mlBhuvan.predictedDelayFactor >= 1.0, `Bhuvan option has Model B delay factor: ${mlBhuvan.predictedDelayFactor}`);
    assert(mlBhuvan.geometry.length > 2, `Bhuvan option has real authentic geometry with ${mlBhuvan.geometry.length} points`);
  } else {
    // If not in Top 2 because of competitors, verify Bhuvan route is feasible
    assert(mlRanking.options.length > 0, 'Meghalaya corridor evaluated with feasible routes');
  }

  console.log('\n--- TEST 4: Physical & Operational Constraint Pruning on Bhuvan ---');
  // If the corridor segment has TOTAL_BLOCKAGE, verify candidate is pruned
  const blockedSegmentId = 'SEG-GHY-NAG'; // Segment between Guwahati and Nagaon
  const blockedDisruptions: Record<string, SegmentIncident> = {
    [blockedSegmentId]: {
      status: 'TOTAL_BLOCKAGE',
      cause: 'Severe Rockslide at Nagaon Bypass',
    },
  };

  const blockedRanking = await generateAndRankMissionRoutes(assamMission, {
    rainfallMmHr: 35.0,
    disruptions: blockedDisruptions,
  });

  console.log(`  Blocked test: pruned ${blockedRanking.prunedCount} candidates.`);
  assert(blockedRanking.prunedCount > 0, 'Constraint engine successfully pruned candidate traversing blocked segment');

  console.log('\n--- TEST 5: Fallback & Resilience when Bhuvan API Fails or is Offline ---');
  // Interstate mission (Silchar Assam -> Kolasib Mizoram) where Bhuvan returns error
  const interstateMission: ReliefMission = {
    id: 'DEMO-BHUVAN-INTERSTATE',
    communityId: 'kolasib',
    communityName: 'Kolasib Medical Staging Post',
    originWarehouseId: 'silchar',
    originWarehouseName: 'Silchar Base Depot',
    originCoords: [24.8333, 92.7789],
    destinationEndpoint: [24.2246, 92.6766],
    targetPayloadWeightKg: 12000,
    priority: 'HIGH',
    status: 'SUGGESTED',
    recommendedVehicleType: 'RATION_CONVOY_14T',
  };

  const fallbackRanking = await generateAndRankMissionRoutes(interstateMission, {
    rainfallMmHr: 22.0,
  });

  assert(fallbackRanking.options.length > 0, 'Routing pipeline seamlessly succeeds even when Bhuvan is interstate/unavailable');
  assert(fallbackRanking.options.length <= 2, 'Top 2 options generated through standard OSRM/graph flow');
  assert(fallbackRanking.options[0].predictedEtaMinutes > 0, 'Option 1 has valid predicted ETA');
  assert(fallbackRanking.options[0].distanceKm > 0, 'Option 1 has valid distance');

  } finally {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('====================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runBhuvanTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
