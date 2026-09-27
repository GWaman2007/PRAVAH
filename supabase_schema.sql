-- =========================================================================
-- PRAVAH NER Emergency Logistics - Supabase Cloud Database Schema
-- Run this in your Supabase Project Dashboard -> SQL Editor -> Run
-- IDEMPOTENT: Safe to run multiple times without 42710 policy errors
-- =========================================================================

-- 1. Incidents Table (Ground Intelligence Feed & Roadblocks)
CREATE TABLE IF NOT EXISTS public.incidents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  corridor_flair TEXT NOT NULL,
  incident_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  location JSONB NOT NULL,
  author JSONB NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  media_url TEXT DEFAULT '',
  votes JSONB NOT NULL DEFAULT '{"upvotes": 1, "downvotes": 0}'::jsonb,
  confidence_score NUMERIC NOT NULL DEFAULT 1,
  has_officer_verified BOOLEAN DEFAULT FALSE,
  updates JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Disruptions Table (Corridor Blockages & Penalties)
CREATE TABLE IF NOT EXISTS public.disruptions (
  corridor_id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  cause TEXT NOT NULL,
  description TEXT,
  reported_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS) & Public Policies for Emergency Collaboration
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disruptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to incidents" ON public.incidents;
CREATE POLICY "Allow public read access to incidents" ON public.incidents
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert to incidents" ON public.incidents;
CREATE POLICY "Allow public insert to incidents" ON public.incidents
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update to incidents" ON public.incidents;
CREATE POLICY "Allow public update to incidents" ON public.incidents
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public read access to disruptions" ON public.disruptions;
CREATE POLICY "Allow public read access to disruptions" ON public.disruptions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert/update to disruptions" ON public.disruptions;
CREATE POLICY "Allow public insert/update to disruptions" ON public.disruptions
  FOR ALL USING (true);

-- 4. Seed Initial Baseline Incident Data
INSERT INTO public.incidents (id, title, corridor_flair, incident_type, severity, location, author, timestamp, media_url, votes, confidence_score, has_officer_verified, updates)
VALUES
(
  'inc-01',
  'Massive Mudflow Severing NH-29 Pagla Pahar Sector',
  'r/NH-29-Nagaland',
  'Landslide',
  'Total Blockage',
  '{"lat": 25.75, "lng": 93.98, "placeName": "Pagla Pahar (Km 144), Kohima District", "state": "Nagaland", "corridorId": "SEG-DIM-KOH-MAIN"}'::jsonb,
  '{"name": "Subedar K. Sema", "role": "Field Officer (BRO/Police)"}'::jsonb,
  NOW() - INTERVAL '45 minutes',
  'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
  '{"upvotes": 38, "downvotes": 2}'::jsonb,
  46,
  true,
  '[{"id": "u-1", "author": "BRO Project Sewak Lead", "role": "Field Officer (BRO/Police)", "message": "Heavy bulldozer units deployed at southern shoulder. Est clearance: 6 hours.", "timestamp": "2026-09-16T12:00:00.000Z"}]'::jsonb
),
(
  'inc-02',
  'Bilkhawthlir Silt Subsidence on NH-306',
  'r/Mizoram-NH-306',
  'Road Subsidence',
  'Single Lane Passable',
  '{"lat": 24.285, "lng": 92.735, "placeName": "Bilkhawthlir Escarpment, Kolasib District", "state": "Mizoram", "corridorId": "SEG-SIL-KOL"}'::jsonb,
  '{"name": "Inspector L. Hmar", "role": "Field Officer (BRO/Police)"}'::jsonb,
  NOW() - INTERVAL '90 minutes',
  'https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?auto=format&fit=crop&w=800&q=80',
  '{"upvotes": 24, "downvotes": 1}'::jsonb,
  33,
  true,
  '[{"id": "u-2", "author": "Insp. L. Hmar", "role": "Field Officer (BRO/Police)", "message": "Single alternate lane opened. Axle limit strictly 18T. Medic-01 escorted through.", "timestamp": "2026-09-16T11:30:00.000Z"}]'::jsonb
),
(
  'inc-03',
  'Flash Flood Submerging NH-27 Haflong Ghat Section',
  'r/Assam-DimaHasao',
  'Flash Flood',
  'Total Blockage',
  '{"lat": 25.18, "lng": 93.01, "placeName": "Haflong Ghat (Km 87), Dima Hasao District", "state": "Assam", "corridorId": "SEG-NOW-HAF-SIL"}'::jsonb,
  '{"name": "Maj. S. Saikia", "role": "Field Officer (BRO/Police)"}'::jsonb,
  NOW() - INTERVAL '2 hours',
  'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80',
  '{"upvotes": 31, "downvotes": 1}'::jsonb,
  40,
  true,
  '[{"id": "u-3", "author": "BRO Project Pushpak Ops", "role": "Field Officer (BRO/Police)", "message": "Water level rising 0.3m/hr. All heavy vehicle transit suspended. Pumping operations commenced.", "timestamp": "2026-09-16T10:30:00.000Z"}]'::jsonb
),
(
  'inc-04',
  'Bailey Bridge Structural Failure at Sevoke Approach NH-10',
  'r/NH-10-Sikkim',
  'Bridge Washout',
  'Total Blockage',
  '{"lat": 26.95, "lng": 88.45, "placeName": "Sevoke Bridge Approach (Km 12), Darjeeling District", "state": "West Bengal", "corridorId": "SEG-SIL-GANG"}'::jsonb,
  '{"name": "Capt. P. Bhutia", "role": "Field Officer (BRO/Police)"}'::jsonb,
  NOW() - INTERVAL '3 hours',
  'https://images.unsplash.com/photo-1545830790-68e2b043e5d1?auto=format&fit=crop&w=800&q=80',
  '{"upvotes": 27, "downvotes": 0}'::jsonb,
  37,
  true,
  '[{"id": "u-4", "author": "Capt. P. Bhutia", "role": "Field Officer (BRO/Police)", "message": "Bailey bridge southern abutment scoured. Emergency pontoon being assembled. ETA 8 hours.", "timestamp": "2026-09-16T09:45:00.000Z"}]'::jsonb
),
(
  'inc-05',
  'Massive Tree Fall Blocking NH-37 Noney Tunnel Approach',
  'r/Manipur-NH-37',
  'Tree Fall',
  'Single Lane Passable',
  '{"lat": 24.78, "lng": 93.58, "placeName": "Noney Tunnel Approach (Km 62), Noney District", "state": "Manipur", "corridorId": "SEG-SIL-IMP"}'::jsonb,
  '{"name": "Dr. L. Meitei", "role": "Field Officer (BRO/Police)"}'::jsonb,
  NOW() - INTERVAL '1 hour',
  'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=800&q=80',
  '{"upvotes": 18, "downvotes": 2}'::jsonb,
  26,
  true,
  '[{"id": "u-5", "author": "Dr. L. Meitei", "role": "Field Officer (BRO/Police)", "message": "Two large sal trees across roadway. Chainsaw crew deployed. Single lane cleared for light vehicles under escort.", "timestamp": "2026-09-16T12:15:00.000Z"}]'::jsonb
),
(
  'inc-06',
  'Active Landslip Zone Destabilising NH-6 Sonapur Tunnel Sector',
  'r/East-Khasi-Hills',
  'Landslide',
  'Single Lane Passable',
  '{"lat": 25.10, "lng": 92.42, "placeName": "Sonapur Tunnel South Portal, Jaintia Hills", "state": "Meghalaya", "corridorId": "SEG-SHL-SIL-MAIN"}'::jsonb,
  '{"name": "Lt. Col. D. Sangma", "role": "Field Officer (BRO/Police)"}'::jsonb,
  NOW() - INTERVAL '4 hours',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
  '{"upvotes": 22, "downvotes": 1}'::jsonb,
  31,
  true,
  '[{"id": "u-6", "author": "BRO Project Setuk Lead", "role": "Field Officer (BRO/Police)", "message": "Continuous debris creep from eastern hillside. Gabion wire mesh deployment underway. Restricted to 12T axle load.", "timestamp": "2026-09-16T08:30:00.000Z"}]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- 5. Communities Table (Authoritative Communities & Real Polygon Geometry)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.communities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  district TEXT NOT NULL,
  coordinates JSONB NOT NULL,
  boundary JSONB,
  population INTEGER NOT NULL,
  healthcare_facilities INTEGER NOT NULL DEFAULT 2,
  ingress_route_count INTEGER NOT NULL DEFAULT 1,
  primary_corridor TEXT NOT NULL,
  nearest_depot_name TEXT NOT NULL,
  transit_time_hours NUMERIC NOT NULL,
  cutoff_time_hours NUMERIC NOT NULL,
  disruption_prob_max NUMERIC NOT NULL,
  elapsed_time_hours NUMERIC NOT NULL DEFAULT 0,
  is_monsoon_alert_active BOOLEAN NOT NULL DEFAULT TRUE,
  has_active_indent BOOLEAN NOT NULL DEFAULT TRUE,
  inventories JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to communities" ON public.communities;
CREATE POLICY "Allow public read access to communities" ON public.communities
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert/update to communities" ON public.communities;
CREATE POLICY "Allow public insert/update to communities" ON public.communities
  FOR ALL USING (true);

-- Seed Initial Baseline Communities with GeoJSON Polygon Boundaries
INSERT INTO public.communities (id, name, state, district, coordinates, boundary, population, healthcare_facilities, ingress_route_count, primary_corridor, nearest_depot_name, transit_time_hours, cutoff_time_hours, disruption_prob_max, elapsed_time_hours, is_monsoon_alert_active, has_active_indent, inventories)
VALUES
(
  'MZ-KOL-004',
  'Kolasib East (Mission MZ-04 Target)',
  'Mizoram',
  'Kolasib',
  '[24.2246, 92.6784]'::jsonb,
  '{"type": "Polygon", "coordinates": [[[92.665, 24.238], [92.692, 24.235], [92.698, 24.218], [92.682, 24.210], [92.660, 24.219], [92.665, 24.238]]]}'::jsonb,
  6400,
  2,
  1,
  'NH-306 Bilkhawthlir Corridor',
  'Silchar Regional Logistics Base (Assam)',
  2.5,
  4.0,
  0.88,
  19.5,
  true,
  true,
  '{"IV_FLUIDS": {"lastStock": 85, "baselineDailyBurn": 72, "standardCapacity": 250}, "ANTIVENOM": {"lastStock": 36, "baselineDailyBurn": 24, "standardCapacity": 120}, "GRAIN_RICE": {"lastStock": 850, "baselineDailyBurn": 280, "standardCapacity": 1500}, "DIESEL": {"lastStock": 380, "baselineDailyBurn": 110, "standardCapacity": 800}}'::jsonb
),
(
  'NL-KOH-009',
  'Kohima South Sector (Phesama)',
  'Nagaland',
  'Kohima',
  '[25.6400, 94.1200]'::jsonb,
  '{"type": "Polygon", "coordinates": [[[94.105, 25.655], [94.135, 25.652], [94.140, 25.632], [94.125, 25.625], [94.102, 25.636], [94.105, 25.655]]]}'::jsonb,
  11200,
  4,
  1,
  'NH-29 Dimapur-Kohima Corridor',
  'Dimapur Rail Freight Staging Area',
  2.2,
  2.5,
  0.95,
  22.0,
  true,
  true,
  '{"IV_FLUIDS": {"lastStock": 120, "baselineDailyBurn": 110, "standardCapacity": 300}, "ANTIVENOM": {"lastStock": 48, "baselineDailyBurn": 38, "standardCapacity": 150}, "GRAIN_RICE": {"lastStock": 1100, "baselineDailyBurn": 520, "standardCapacity": 2000}, "DIESEL": {"lastStock": 310, "baselineDailyBurn": 240, "standardCapacity": 1000}}'::jsonb
),
(
  'SK-MAN-002',
  'Teesta Canyon 29th Mile Hub',
  'Sikkim',
  'Pakyong',
  '[27.0288, 88.4714]'::jsonb,
  '{"type": "Polygon", "coordinates": [[[88.455, 27.042], [88.485, 27.039], [88.490, 27.018], [88.475, 27.012], [88.452, 27.022], [88.455, 27.042]]]}'::jsonb,
  4800,
  3,
  2,
  'NH-10 Teesta Canyon - Dikchu Bailey Bridge',
  'Gangtok Central Strategic Depot',
  2.0,
  6.0,
  0.75,
  12.0,
  true,
  true,
  '{"IV_FLUIDS": {"lastStock": 140, "baselineDailyBurn": 60, "standardCapacity": 250}, "ANTIVENOM": {"lastStock": 55, "baselineDailyBurn": 30, "standardCapacity": 120}, "GRAIN_RICE": {"lastStock": 800, "baselineDailyBurn": 240, "standardCapacity": 1500}, "DIESEL": {"lastStock": 350, "baselineDailyBurn": 160, "standardCapacity": 800}}'::jsonb
),
(
  'AS-DH-011',
  'Dima Hasao Hill Sector',
  'Assam',
  'Dima Hasao',
  '[25.1685, 93.0182]'::jsonb,
  '{"type": "Polygon", "coordinates": [[[93.002, 25.182], [93.035, 25.180], [93.040, 25.158], [93.022, 25.152], [93.000, 25.162], [93.002, 25.182]]]}'::jsonb,
  8200,
  2,
  2,
  'NH-27 Lumding-Haflong Barail Section',
  'Guwahati Dispur Disaster Hub',
  3.5,
  7.5,
  0.68,
  14.0,
  true,
  true,
  '{"IV_FLUIDS": {"lastStock": 160, "baselineDailyBurn": 80, "standardCapacity": 250}, "ANTIVENOM": {"lastStock": 65, "baselineDailyBurn": 32, "standardCapacity": 120}, "GRAIN_RICE": {"lastStock": 1200, "baselineDailyBurn": 340, "standardCapacity": 1500}, "DIESEL": {"lastStock": 520, "baselineDailyBurn": 140, "standardCapacity": 800}}'::jsonb
),
(
  'AR-TAW-001',
  'Tawang Forward Valley',
  'Arunachal Pradesh',
  'Tawang',
  '[27.5861, 91.8594]'::jsonb,
  '{"type": "Polygon", "coordinates": [[[91.842, 27.600], [91.875, 27.598], [91.880, 27.575], [91.862, 27.570], [91.838, 27.582], [91.842, 27.600]]]}'::jsonb,
  5200,
  2,
  2,
  'NH-13 Sela Pass Axis (13,700 ft)',
  'Tezpur Military Base Staging Terminal',
  4.5,
  20.0,
  0.50,
  5.0,
  true,
  true,
  '{"IV_FLUIDS": {"lastStock": 200, "baselineDailyBurn": 40, "standardCapacity": 250}, "ANTIVENOM": {"lastStock": 80, "baselineDailyBurn": 15, "standardCapacity": 120}, "GRAIN_RICE": {"lastStock": 1200, "baselineDailyBurn": 180, "standardCapacity": 1500}, "DIESEL": {"lastStock": 550, "baselineDailyBurn": 100, "standardCapacity": 800}}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  coordinates = EXCLUDED.coordinates,
  boundary = EXCLUDED.boundary,
  population = EXCLUDED.population,
  healthcare_facilities = EXCLUDED.healthcare_facilities,
  ingress_route_count = EXCLUDED.ingress_route_count,
  transit_time_hours = EXCLUDED.transit_time_hours,
  cutoff_time_hours = EXCLUDED.cutoff_time_hours,
  disruption_prob_max = EXCLUDED.disruption_prob_max,
  inventories = EXCLUDED.inventories,
  updated_at = NOW();

-- =========================================================================
-- 6. Missions Table (Preemptive Relief Missions, Approvals & Dispatches)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.missions (
  id TEXT PRIMARY KEY,
  community_id TEXT NOT NULL,
  community_name TEXT NOT NULL,
  recommended_vehicle_type TEXT,
  cargo_allocations JSONB NOT NULL DEFAULT '[]'::jsonb,
  assigned_route_id TEXT NOT NULL,
  suggested_detour TEXT,
  status TEXT NOT NULL DEFAULT 'SUGGESTED',
  urgency TEXT NOT NULL DEFAULT 'P1_CRITICAL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dispatched_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  assigned_driver TEXT,
  assigned_officer TEXT,
  origin_warehouse_id TEXT,
  origin_warehouse_name TEXT,
  origin_coords JSONB,
  disaster_zone_id TEXT,
  disaster_zone_name TEXT,
  destination_endpoint JSONB,
  destination_name TEXT,
  assigned_vehicle_id TEXT,
  route_distance_km NUMERIC,
  route_duration_minutes NUMERIC,
  route_status TEXT,
  route_geometry JSONB,
  selected_route_option_id TEXT,
  is_rerouted BOOLEAN DEFAULT false,
  reroute_reason TEXT,
  rerouted_at TIMESTAMPTZ,
  rerouted_from_coords JSONB,
  corridor_segment_ids JSONB DEFAULT '[]'::jsonb,
  previous_route_geometry JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Idempotent migrations for missions reroute and field requisition support
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS is_rerouted BOOLEAN DEFAULT false;
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS reroute_reason TEXT;
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS rerouted_at TIMESTAMPTZ;
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS rerouted_from_coords JSONB;
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS corridor_segment_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS previous_route_geometry JSONB;
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'ENGINE_GENERATED';
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS is_field_requisition BOOLEAN DEFAULT false;
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS requested_by_officer TEXT;
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS resource_request_id TEXT;
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to missions" ON public.missions;
CREATE POLICY "Allow public read access to missions" ON public.missions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert to missions" ON public.missions;
CREATE POLICY "Allow public insert to missions" ON public.missions
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update to missions" ON public.missions;
CREATE POLICY "Allow public update to missions" ON public.missions
  FOR UPDATE USING (true);

-- =========================================================================
-- 6B. Mission Route Options Table (Model B Multi-Route Predictions & Ranking)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.mission_route_options (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  route_number INTEGER NOT NULL,
  route_rank INTEGER NOT NULL,
  route_id TEXT NOT NULL,
  route_name TEXT,
  corridor_segment_ids JSONB DEFAULT '[]'::jsonb,
  geometry JSONB NOT NULL,
  distance_km NUMERIC NOT NULL,
  osrm_duration_minutes NUMERIC NOT NULL,
  predicted_delay_factor NUMERIC NOT NULL,
  predicted_eta_minutes NUMERIC NOT NULL,
  eta_overhead_minutes NUMERIC NOT NULL,
  predicted_preferred_route BOOLEAN NOT NULL DEFAULT false,
  model_version TEXT NOT NULL DEFAULT 'prototype_v2_delay_factor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotent migrations for mission_route_options
ALTER TABLE public.mission_route_options ADD COLUMN IF NOT EXISTS route_name TEXT;
ALTER TABLE public.mission_route_options ADD COLUMN IF NOT EXISTS corridor_segment_ids JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.mission_route_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to mission_route_options" ON public.mission_route_options;
CREATE POLICY "Allow public read access to mission_route_options" ON public.mission_route_options
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert to mission_route_options" ON public.mission_route_options;
CREATE POLICY "Allow public insert to mission_route_options" ON public.mission_route_options
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update to mission_route_options" ON public.mission_route_options;
CREATE POLICY "Allow public update to mission_route_options" ON public.mission_route_options
  FOR UPDATE USING (true);

-- =========================================================================
-- 7. Hazard Zones Table (Real-Time API Polygons & ISRO NRSC Zones)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.hazard_zones (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source TEXT DEFAULT 'SUPABASE_CLOUD',
  hazard_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  hazard_score NUMERIC NOT NULL DEFAULT 8.0,
  advisory TEXT,
  state TEXT,
  district TEXT,
  coordinates JSONB NOT NULL DEFAULT '[]'::jsonb,
  url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.hazard_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to hazard_zones" ON public.hazard_zones;
CREATE POLICY "Allow public read access to hazard_zones" ON public.hazard_zones
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert/update to hazard_zones" ON public.hazard_zones;
CREATE POLICY "Allow public insert/update to hazard_zones" ON public.hazard_zones
  FOR ALL USING (true);

-- =========================================================================
-- 8. Draft Reports Table (Citizen Ground Reports Pending AI Review)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.draft_reports (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  corridor TEXT NOT NULL,
  coordinates JSONB NOT NULL,
  hazard_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  estimated_cutoff_hours NUMERIC DEFAULT 6,
  summary TEXT NOT NULL,
  citations_count INTEGER DEFAULT 1,
  source_report JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_validation JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.draft_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to draft_reports" ON public.draft_reports;
CREATE POLICY "Allow public read access to draft_reports" ON public.draft_reports
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert/update to draft_reports" ON public.draft_reports;
CREATE POLICY "Allow public insert/update to draft_reports" ON public.draft_reports
  FOR ALL USING (true);

-- =========================================================================
-- 9. Response Hubs Table (Emergency Logistics Hubs & Response Bases)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.response_hubs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL,
  district TEXT NOT NULL,
  city TEXT,
  address TEXT,
  coordinates JSONB NOT NULL,
  type TEXT NOT NULL DEFAULT 'REGIONAL',
  status TEXT NOT NULL DEFAULT 'OPERATIONAL',
  storage_capacity_kg NUMERIC NOT NULL DEFAULT 50000,
  cold_storage_capacity_kg NUMERIC NOT NULL DEFAULT 10000,
  fuel_storage_capacity_litres NUMERIC NOT NULL DEFAULT 25000,
  source_type TEXT NOT NULL DEFAULT 'OFFICIAL_REFERENCE',
  source_note TEXT,
  routing_node_id TEXT,
  routing_segment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.response_hubs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to response_hubs" ON public.response_hubs;
CREATE POLICY "Allow public read access to response_hubs" ON public.response_hubs
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert to response_hubs" ON public.response_hubs;
CREATE POLICY "Allow public insert to response_hubs" ON public.response_hubs
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update to response_hubs" ON public.response_hubs;
CREATE POLICY "Allow public update to response_hubs" ON public.response_hubs
  FOR UPDATE USING (true);

-- Seed Initial Authoritative Response Hubs
INSERT INTO public.response_hubs (id, name, code, state, district, city, address, coordinates, type, status, storage_capacity_kg, cold_storage_capacity_kg, fuel_storage_capacity_litres, source_type, routing_node_id)
VALUES
(
  'guwahati',
  'Guwahati Regional Hub',
  'HUB-AS-GAU',
  'Assam',
  'Kamrup Metropolitan',
  'Guwahati',
  'Khanapara Central Supply Depot, NH-27 Bypass',
  '[26.1445, 91.7362]'::jsonb,
  'REGIONAL',
  'OPERATIONAL',
  100000,
  25000,
  50000,
  'OFFICIAL_REFERENCE',
  'guwahati'
),
(
  'silchar',
  'Silchar Strategic Depot',
  'HUB-AS-SIL',
  'Assam',
  'Cachar',
  'Silchar',
  'Tarapur Staging Base, NH-306 Terminal',
  '[24.8333, 92.7789]'::jsonb,
  'REGIONAL',
  'OPERATIONAL',
  80000,
  15000,
  40000,
  'OFFICIAL_REFERENCE',
  'silchar'
),
(
  'dimapur',
  'Dimapur Railhead Depot',
  'HUB-NL-DMU',
  'Nagaland',
  'Dimapur',
  'Dimapur',
  'Railway Goods Yard Logistics Terminal, NH-29 Junction',
  '[25.9095, 93.7266]'::jsonb,
  'REGIONAL',
  'OPERATIONAL',
  75000,
  12000,
  35000,
  'OFFICIAL_REFERENCE',
  'dimapur'
),
(
  'gangtok',
  'Gangtok STNM Hub',
  'HUB-SK-GTK',
  'Sikkim',
  'East Sikkim',
  'Gangtok',
  'Sir Thutob Namgyal Memorial Hospital Complex Staging',
  '[27.3314, 88.6138]'::jsonb,
  'FORWARD',
  'OPERATIONAL',
  40000,
  15000,
  20000,
  'OFFICIAL_REFERENCE',
  'gangtok'
),
(
  'shillong',
  'Shillong Forward Base',
  'HUB-ML-SHL',
  'Meghalaya',
  'East Khasi Hills',
  'Shillong',
  'Mawlai Emergency Transit Staging Base, NH-6',
  '[25.5788, 91.8933]'::jsonb,
  'DISTRICT',
  'OPERATIONAL',
  50000,
  10000,
  25000,
  'OFFICIAL_REFERENCE',
  'shillong'
),
(
  'kohima',
  'Kohima Capital Command',
  'HUB-NL-KOH',
  'Nagaland',
  'Kohima',
  'Kohima',
  'Highland Capital Disaster Staging Depot, NH-29',
  '[25.6751, 94.1086]'::jsonb,
  'DISTRICT',
  'OPERATIONAL',
  45000,
  8000,
  20000,
  'OFFICIAL_REFERENCE',
  'kohima'
),
(
  'imphal',
  'Imphal Supply Base',
  'HUB-MN-IMP',
  'Manipur',
  'Imphal West',
  'Imphal',
  'Lamphelpat Relief Distribution Center, NH-37 Axis',
  '[24.8170, 93.9368]'::jsonb,
  'REGIONAL',
  'OPERATIONAL',
  60000,
  12000,
  30000,
  'OFFICIAL_REFERENCE',
  'imphal'
),
(
  'aizawl',
  'Aizawl Forward Depot',
  'HUB-MZ-AZL',
  'Mizoram',
  'Aizawl',
  'Aizawl',
  'Durtlang Forward Supply Terminal, NH-306 Southern End',
  '[23.7271, 92.7176]'::jsonb,
  'FORWARD',
  'OPERATIONAL',
  40000,
  9000,
  20000,
  'OFFICIAL_REFERENCE',
  'aizawl'
)
ON CONFLICT (id) DO UPDATE SET
  coordinates = EXCLUDED.coordinates,
  storage_capacity_kg = EXCLUDED.storage_capacity_kg,
  cold_storage_capacity_kg = EXCLUDED.cold_storage_capacity_kg,
  fuel_storage_capacity_litres = EXCLUDED.fuel_storage_capacity_litres,
  updated_at = NOW();

-- =========================================================================
-- 11. Hub Inventory Table (Live Resource Stock & Reserved Tracking)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.hub_inventory (
  id TEXT PRIMARY KEY,
  hub_id TEXT NOT NULL REFERENCES public.response_hubs(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  resource_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL CHECK (quantity >= 0),
  unit TEXT NOT NULL,
  minimum_stock NUMERIC NOT NULL DEFAULT 0,
  maximum_capacity NUMERIC,
  reserved_quantity NUMERIC NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0 AND reserved_quantity <= quantity),
  priority TEXT NOT NULL DEFAULT 'MEDIUM',
  expiry_date TIMESTAMPTZ,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hub_inventory_hub_id ON public.hub_inventory(hub_id);

ALTER TABLE public.hub_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to hub_inventory" ON public.hub_inventory;
CREATE POLICY "Allow public read access to hub_inventory" ON public.hub_inventory
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert/update to hub_inventory" ON public.hub_inventory;
CREATE POLICY "Allow public insert/update to hub_inventory" ON public.hub_inventory
  FOR ALL USING (true);

-- Seed Initial Deterministic Demo Inventory for Key Strategic Hubs
INSERT INTO public.hub_inventory (id, hub_id, resource_type, resource_name, quantity, unit, minimum_stock, maximum_capacity, reserved_quantity, priority)
VALUES
  -- Silchar Strategic Depot
  ('inv-sil-rice', 'silchar', 'FOOD', 'Subsistence Rice / Rations', 5000, 'kg', 1000, 10000, 0, 'HIGH'),
  ('inv-sil-meals', 'silchar', 'FOOD', 'Ready-to-Eat Emergency Meals', 3000, 'packs', 500, 6000, 0, 'MEDIUM'),
  ('inv-sil-water', 'silchar', 'WATER', 'Potable Drinking Water (Cans)', 8000, 'L', 2000, 15000, 0, 'HIGH'),
  ('inv-sil-iv', 'silchar', 'MEDICAL', 'IV Fluids (Ringer Lactate)', 650, 'bottles', 150, 1200, 0, 'CRITICAL'),
  ('inv-sil-antivenom', 'silchar', 'MEDICAL', 'Polyvalent Snake Antivenom', 220, 'vials', 50, 400, 0, 'CRITICAL'),
  ('inv-sil-diesel', 'silchar', 'FUEL', 'High-Flashpoint Diesel Fuel', 4500, 'L', 1000, 10000, 0, 'HIGH'),
  ('inv-sil-rescue', 'silchar', 'RESCUE', 'Ghat Collapse Rescue Kits', 45, 'kits', 10, 100, 0, 'MEDIUM'),

  -- Dimapur Railhead Depot
  ('inv-dmu-rice', 'dimapur', 'FOOD', 'Subsistence Rice / Rations', 6000, 'kg', 1200, 12000, 0, 'HIGH'),
  ('inv-dmu-meals', 'dimapur', 'FOOD', 'Ready-to-Eat Emergency Meals', 2500, 'packs', 400, 5000, 0, 'MEDIUM'),
  ('inv-dmu-water', 'dimapur', 'WATER', 'Potable Drinking Water (Cans)', 6000, 'L', 1500, 12000, 0, 'HIGH'),
  ('inv-dmu-iv', 'dimapur', 'MEDICAL', 'IV Fluids (Ringer Lactate)', 500, 'bottles', 120, 1000, 0, 'CRITICAL'),
  ('inv-dmu-antivenom', 'dimapur', 'MEDICAL', 'Polyvalent Snake Antivenom', 180, 'vials', 40, 350, 0, 'CRITICAL'),
  ('inv-dmu-diesel', 'dimapur', 'FUEL', 'High-Flashpoint Diesel Fuel', 5500, 'L', 1200, 12000, 0, 'HIGH'),

  -- Guwahati Regional Hub
  ('inv-gau-rice', 'guwahati', 'FOOD', 'Subsistence Rice / Rations', 15000, 'kg', 3000, 30000, 0, 'HIGH'),
  ('inv-gau-water', 'guwahati', 'WATER', 'Potable Drinking Water (Cans)', 20000, 'L', 5000, 40000, 0, 'HIGH'),
  ('inv-gau-iv', 'guwahati', 'MEDICAL', 'IV Fluids (Ringer Lactate)', 1500, 'bottles', 300, 3000, 0, 'CRITICAL'),
  ('inv-gau-antivenom', 'guwahati', 'MEDICAL', 'Polyvalent Snake Antivenom', 400, 'vials', 80, 800, 0, 'CRITICAL'),
  ('inv-gau-diesel', 'guwahati', 'FUEL', 'High-Flashpoint Diesel Fuel', 12000, 'L', 2500, 25000, 0, 'HIGH'),

  -- Gangtok STNM Hub
  ('inv-gtk-rice', 'gangtok', 'FOOD', 'Subsistence Rice / Rations', 3500, 'kg', 800, 8000, 0, 'HIGH'),
  ('inv-gtk-water', 'gangtok', 'WATER', 'Potable Drinking Water (Cans)', 4000, 'L', 1000, 8000, 0, 'HIGH'),
  ('inv-gtk-iv', 'gangtok', 'MEDICAL', 'IV Fluids (Ringer Lactate)', 450, 'bottles', 100, 900, 0, 'CRITICAL'),
  ('inv-gtk-antivenom', 'gangtok', 'MEDICAL', 'Polyvalent Snake Antivenom', 150, 'vials', 30, 300, 0, 'CRITICAL'),
  ('inv-gtk-diesel', 'gangtok', 'FUEL', 'High-Flashpoint Diesel Fuel', 3000, 'L', 600, 6000, 0, 'HIGH')
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- 12. Inventory Transactions Table (Traceable Logistics Audit Ledger)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id TEXT PRIMARY KEY,
  hub_id TEXT NOT NULL,
  inventory_id TEXT NOT NULL,
  mission_id TEXT,
  type TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  previous_quantity NUMERIC NOT NULL,
  new_quantity NUMERIC NOT NULL,
  previous_reserved NUMERIC NOT NULL,
  new_reserved NUMERIC NOT NULL,
  performed_by TEXT,
  note TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_tx_hub_id ON public.inventory_transactions(hub_id);
CREATE INDEX IF NOT EXISTS idx_inventory_tx_timestamp ON public.inventory_transactions(timestamp DESC);

ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to inventory_transactions" ON public.inventory_transactions;
CREATE POLICY "Allow public read access to inventory_transactions" ON public.inventory_transactions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert to inventory_transactions" ON public.inventory_transactions;
CREATE POLICY "Allow public insert to inventory_transactions" ON public.inventory_transactions
  FOR INSERT WITH CHECK (true);

-- =========================================================================
-- 13. Model A Predictions Table (Frozen XGBoost Road-Disruption Risk Signals)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.model_a_predictions (
  id TEXT PRIMARY KEY,
  segment_id TEXT NOT NULL,
  prediction_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  horizon_time TIMESTAMPTZ,
  probability NUMERIC NOT NULL,
  prediction INTEGER NOT NULL,
  threshold NUMERIC NOT NULL DEFAULT 0.50,
  risk_band TEXT NOT NULL DEFAULT 'LOW',
  feature_snapshot JSONB NOT NULL,
  model_version TEXT NOT NULL DEFAULT '3.4.1-baseline-xgb',
  source TEXT NOT NULL DEFAULT 'MODEL_A_INFERENCE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_model_a_predictions_segment ON public.model_a_predictions (segment_id);
CREATE INDEX IF NOT EXISTS idx_model_a_predictions_time ON public.model_a_predictions (prediction_time DESC);

ALTER TABLE public.model_a_predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to model_a_predictions" ON public.model_a_predictions;
CREATE POLICY "Allow public read access to model_a_predictions" ON public.model_a_predictions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert to model_a_predictions" ON public.model_a_predictions;
CREATE POLICY "Allow public insert to model_a_predictions" ON public.model_a_predictions
  FOR INSERT WITH CHECK (true);

-- =========================================================================
-- 13B. Resource Requests Table (Ground Official Requisitions & Indents)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.resource_requests (
  id TEXT PRIMARY KEY,
  community_id TEXT NOT NULL,
  community_name TEXT NOT NULL,
  officer_id TEXT NOT NULL,
  officer_name TEXT NOT NULL,
  officer_role TEXT,
  resource_type TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'units',
  urgency TEXT NOT NULL DEFAULT 'CRITICAL',
  reason TEXT,
  notes TEXT,
  evidence_photo TEXT,
  status TEXT NOT NULL DEFAULT 'PROCESSING',
  suggested_mission_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resource_requests_community ON public.resource_requests (community_id);
CREATE INDEX IF NOT EXISTS idx_resource_requests_officer ON public.resource_requests (officer_id);
CREATE INDEX IF NOT EXISTS idx_resource_requests_created ON public.resource_requests (created_at DESC);

ALTER TABLE public.resource_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to resource_requests" ON public.resource_requests;
CREATE POLICY "Allow public read access to resource_requests" ON public.resource_requests
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert/update to resource_requests" ON public.resource_requests;
CREATE POLICY "Allow public insert/update to resource_requests" ON public.resource_requests
  FOR ALL USING (true);

-- Seed Baseline Ground Requisitions
INSERT INTO public.resource_requests (id, community_id, community_name, officer_id, officer_name, officer_role, resource_type, quantity, unit, urgency, reason, notes, status, suggested_mission_id, created_at)
VALUES
(
  'REQ-BRO-011',
  'AS-HAF-008',
  'Haflong Mountain Township',
  'fo-saikia',
  'Maj. S. Saikia',
  'Field Officer (BRO Setuk)',
  'Heavy Shoring Rig & Diesel',
  1200,
  'litres & kit',
  'CRITICAL',
  'Bridge subsidence on NH-27 Barail Range isolating water pump station',
  'Ground Requisition: Emergency River Shoring Rig & Diesel needed at Haflong Mountain Township following bridge subsidence on NH-27.',
  'RECOMMENDED',
  'DEMO-MSN-AS-HAF-SUGG',
  NOW() - INTERVAL '2 hours'
)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- =========================================================================
-- 14. Realtime Publication Setup (Idempotent & Safe against execution order)
-- =========================================================================
DO $$
BEGIN
  -- Ensure publication supabase_realtime exists
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  -- incidents
  IF to_regclass('public.incidents') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'incidents'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;
  END IF;

  -- disruptions
  IF to_regclass('public.disruptions') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'disruptions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.disruptions;
  END IF;

  -- communities
  IF to_regclass('public.communities') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'communities'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.communities;
  END IF;

  -- missions
  IF to_regclass('public.missions') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'missions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.missions;
  END IF;

  -- hazard_zones
  IF to_regclass('public.hazard_zones') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'hazard_zones'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.hazard_zones;
  END IF;

  -- draft_reports
  IF to_regclass('public.draft_reports') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'draft_reports'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.draft_reports;
  END IF;

  -- response_hubs
  IF to_regclass('public.response_hubs') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'response_hubs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.response_hubs;
  END IF;

  -- hub_inventory
  IF to_regclass('public.hub_inventory') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'hub_inventory'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.hub_inventory;
  END IF;

  -- inventory_transactions
  IF to_regclass('public.inventory_transactions') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'inventory_transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_transactions;
  END IF;

  -- model_a_predictions
  IF to_regclass('public.model_a_predictions') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'model_a_predictions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.model_a_predictions;
  END IF;

  -- resource_requests
  IF to_regclass('public.resource_requests') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'resource_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.resource_requests;
  END IF;
END $$;




