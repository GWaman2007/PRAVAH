import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import {
  generateDeterministicDemoMissions,
  SHILLONG_MODEL_B_ROUTE_OPTIONS,
  HAFLONG_MODEL_B_ROUTE_OPTIONS,
} from '../src/engine/missionEngine';

// Parse .env file for Supabase credentials
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = (
  envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY=(.*)/) ||
  envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)
)?.[1]?.trim();

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials missing in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('🚀 Starting Supabase Missions & Route Options Seeding...');

  // 1. Delete stale/legacy test missions and route options
  const staleMissionIds = [
    'SUGG-MZKOL004',
    'SUGG-NLKOH009-5265',
    'SUGG-SKMAN002',
    'SUGG-MZKOL004-4568',
    'SUGG-ASDH011-4569',
    'SUGG-ARTAW001',
    'TEST-COL',
  ];

  console.log('🧹 Purging stale missions and route options...');
  const { error: delOptErr } = await supabase
    .from('mission_route_options')
    .delete()
    .in('mission_id', [...staleMissionIds, 'SUGG-MLSHL003', 'SUGG-ASDH011']);
  if (delOptErr) console.warn('Warning deleting route options:', delOptErr.message);

  const { error: delMsnErr } = await supabase
    .from('missions')
    .delete()
    .in('id', staleMissionIds);
  if (delMsnErr) console.warn('Warning deleting stale missions:', delMsnErr.message);

  // 2. Prepare authoritative demo missions
  const missions = generateDeterministicDemoMissions();
  console.log(`📦 Upserting ${missions.length} authoritative missions...`);

  for (const m of missions) {
    const row = {
      id: m.id,
      community_id: m.communityId,
      community_name: m.communityName,
      recommended_vehicle_type: m.recommendedVehicleType,
      cargo_allocations: m.cargoAllocations,
      assigned_route_id: m.assignedRouteId,
      suggested_detour: m.suggestedDetour,
      status: m.status,
      urgency: m.urgency,
      created_at: m.createdAt,
      dispatched_at: m.dispatchedAt || null,
      delivered_at: m.deliveredAt || null,
      assigned_driver: m.assignedDriver || null,
      assigned_officer: m.assignedOfficer || null,
      origin_warehouse_id: m.originWarehouseId,
      origin_warehouse_name: m.originWarehouseName,
      origin_coords: m.originCoords,
      disaster_zone_id: m.disasterZoneId,
      disaster_zone_name: m.disasterZoneName,
      destination_endpoint: m.destinationEndpoint,
      destination_name: m.destinationName,
      assigned_vehicle_id: m.assignedVehicleId || null,
      route_distance_km: m.routeDistanceKm || null,
      route_duration_minutes: m.routeDurationMinutes || null,
      route_status: m.routeStatus || null,
      route_geometry: m.routeGeometry && m.routeGeometry.length > 0 ? m.routeGeometry : null,
      is_rerouted: Boolean(m.isRerouted),
      reroute_reason: m.rerouteReason || null,
      rerouted_at: m.reroutedAt || null,
      rerouted_from_coords: m.reroutedFromCoords || null,
      corridor_segment_ids: m.corridorSegmentIds && m.corridorSegmentIds.length > 0 ? m.corridorSegmentIds : null,
      previous_route_geometry: m.previousRouteGeometry || null,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await supabase.from('missions').upsert(row, { onConflict: 'id' });
    if (upsertErr) {
      console.error(`❌ Failed to upsert mission ${m.id}:`, upsertErr.message);
    } else {
      console.log(`✅ Upserted mission: ${m.id} (${m.status}) -> ${m.communityName}`);
    }
  }

  // 3. Upsert Model B Route Options for the 2 suggested missions
  const allRouteOptions = [
    ...SHILLONG_MODEL_B_ROUTE_OPTIONS,
    ...HAFLONG_MODEL_B_ROUTE_OPTIONS,
  ];

  console.log(`🛣️ Upserting ${allRouteOptions.length} route options into mission_route_options...`);
  const optionRows = allRouteOptions.map((opt) => ({
    id: opt.id,
    mission_id: opt.missionId,
    route_number: opt.routeNumber,
    route_rank: opt.routeRank,
    route_id: opt.routeId,
    route_name: opt.routeName || null,
    corridor_segment_ids: opt.corridorSegmentIds || [],
    geometry: opt.geometry,
    distance_km: opt.distanceKm,
    osrm_duration_minutes: opt.osrmDurationMinutes,
    predicted_delay_factor: opt.predictedDelayFactor,
    predicted_eta_minutes: opt.predictedEtaMinutes,
    eta_overhead_minutes: opt.etaOverheadMinutes,
    predicted_preferred_route: opt.predictedPreferredRoute,
    model_version: opt.modelVersion,
  }));

  const { error: optErr } = await supabase
    .from('mission_route_options')
    .upsert(optionRows, { onConflict: 'id' });

  if (optErr) {
    console.error('❌ Failed to upsert mission_route_options:', optErr.message);
  } else {
    console.log('✅ Successfully seeded all mission route options!');
  }

  // 4. Verification query
  const { data: finalMissions } = await supabase.from('missions').select('id, status, community_name');
  const { data: finalOptions } = await supabase.from('mission_route_options').select('id, mission_id, route_rank, route_name');

  console.log('\n📊 Seeding Complete! Verification:');
  console.log('Final Missions in Supabase:', finalMissions);
  console.log('Final Route Options in Supabase:', finalOptions);
}

seed().catch(console.error);
