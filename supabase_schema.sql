-- =========================================================================
-- PRAVAH NER Emergency Logistics - Supabase Cloud Database Schema
-- Run this in your Supabase Project Dashboard -> SQL Editor -> Run
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

CREATE POLICY "Allow public read access to incidents" ON public.incidents
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert to incidents" ON public.incidents
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to incidents" ON public.incidents
  FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to disruptions" ON public.disruptions
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert/update to disruptions" ON public.disruptions
  FOR ALL USING (true);

-- 4. Enable Supabase Realtime for instant broadcast across devices
ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.disruptions;

-- 5. Seed Initial Baseline Data
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
-- 6. Communities Table (Authoritative Communities & Real Polygon Geometry)
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

CREATE POLICY "Allow public read access to communities" ON public.communities
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert/update to communities" ON public.communities
  FOR ALL USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.communities;

-- Seed Initial Baseline Communities with GeoJSON Polygon Boundaries (2xP1, 2xP2, 1xP3)
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
-- 7. Missions Table (Preemptive Relief Missions, Approvals & Dispatches)
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
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to missions" ON public.missions
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert to missions" ON public.missions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to missions" ON public.missions
  FOR UPDATE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.missions;

-- Seed Initial Missions (Active In-Transit & Suggested Queue)
INSERT INTO public.missions (
  id, community_id, community_name, recommended_vehicle_type, cargo_allocations,
  assigned_route_id, suggested_detour, status, urgency, created_at, dispatched_at,
  assigned_driver, assigned_officer, origin_warehouse_id, origin_warehouse_name,
  origin_coords, disaster_zone_id, disaster_zone_name, destination_endpoint,
  destination_name, assigned_vehicle_id
)
VALUES
(
  'MISSION-MZ-04',
  'MZ-KOL-004',
  'Kolasib East (Mission MZ-04 Target)',
  'Medic-01 (4x4 Emergency Van)',
  '[{"item": "IV Fluids (Ringer Lactate)", "quantity": 350, "unit": "Bags"}, {"item": "Polyvalent Snake Antivenom", "quantity": 60, "unit": "Vials"}, {"item": "Emergency Suture & Burn Kits", "quantity": 45, "unit": "Kits"}]'::jsonb,
  'ROUTE-MZ-04',
  'NH-306 Bilkhawthlir Escarpment Spur',
  'IN_TRANSIT',
  'P1_CRITICAL',
  NOW() - INTERVAL '60 minutes',
  NOW() - INTERVAL '35 minutes',
  'Rajesh Mech (+91 94350-18492)',
  'Insp. L. Hmar (Mizoram Police)',
  'silchar',
  'Silchar Strategic Depot',
  '[24.8333, 92.7789]'::jsonb,
  'LHZ-MZ-01',
  'NH-306 Bilkhawthlir Hill Escarpment',
  '[24.25708, 92.72921]'::jsonb,
  'Bilkhawthlir Escarpment Relief Post',
  'Medic-01'
),
(
  'MISSION-MZ-02',
  'MZ-KOL-002',
  'Bilkhawthlir Silt Ground Station',
  'Cargo-01 (Heavy Cargo Truck)',
  '[{"item": "Trauma Dressing & Splints", "quantity": 120, "unit": "Sets"}, {"item": "Oral Rehydration Salts", "quantity": 500, "unit": "Packets"}, {"item": "Portable Oxygen Concentrators", "quantity": 4, "unit": "Units"}]'::jsonb,
  'ROUTE-MZ-02',
  'NH-306 Silt Diversion',
  'IN_TRANSIT',
  'P1_CRITICAL',
  NOW() - INTERVAL '55 minutes',
  NOW() - INTERVAL '25 minutes',
  'Malsawma Lushai (+91 98620-11234)',
  'Sub-Insp. Z. Ralte',
  'silchar',
  'Silchar Strategic Depot',
  '[24.8333, 92.7789]'::jsonb,
  'HAZARD-01',
  'Bilkhawthlir Silt Subsidence Zone',
  '[24.2571, 92.7314]'::jsonb,
  'Bilkhawthlir Silt Ground Station',
  'Cargo-01'
),
(
  'MISSION-AS-03',
  'AS-HAF-003',
  'Barail Range Clearance Sector',
  'Engineer-01 (Engineering Vehicle)',
  '[{"item": "Hydraulic Cutting Tools", "quantity": 6, "unit": "Kits"}, {"item": "High-Tensile Tow Cables", "quantity": 200, "unit": "Meters"}, {"item": "Fuel Drums (Diesel)", "quantity": 20, "unit": "Barrels"}]'::jsonb,
  'ROUTE-AS-03',
  'NH-27 Barail S-Curve',
  'IN_TRANSIT',
  'P2_ELEVATED',
  NOW() - INTERVAL '75 minutes',
  NOW() - INTERVAL '40 minutes',
  'Anand Das (+91 94351-77890)',
  'Maj. S. Saikia (BRO Project Pushpak)',
  'silchar',
  'Silchar Strategic Depot',
  '[24.8333, 92.7789]'::jsonb,
  'LHZ-AS-01',
  'Barail Hill Cut Clearance',
  '[25.1742, 93.0215]'::jsonb,
  'Haflong Ridge Transit Post',
  'Engineer-01'
),
(
  'MISSION-SUG-01',
  'MZ-KOL-004',
  'Kolasib East (Mission MZ-04 Target)',
  'Medic-04 (Light Rescue 4x4)',
  '[{"item": "Water Purification Tablets", "quantity": 5000, "unit": "Tabs"}, {"item": "Emergency Tents & Ground Tarps", "quantity": 30, "unit": "Units"}]'::jsonb,
  'ROUTE-SUG-01',
  'NH-306 Upper Vairengte Spur',
  'SUGGESTED',
  'P1_CRITICAL',
  NOW() - INTERVAL '15 minutes',
  NULL,
  'Duty Dispatch Driver',
  'BRO Liaison Officer',
  'silchar',
  'Silchar Strategic Depot',
  '[24.8333, 92.7789]'::jsonb,
  'DISASTER-01',
  'Kolasib Sector Outskirts',
  '[24.2300, 92.6850]'::jsonb,
  'Kolasib Community Clinic',
  'Medic-04'
),
(
  'MISSION-SUG-02',
  'NL-KOH-009',
  'Kohima South Sector (Phesama)',
  'Rescue-02 (Heavy Tow & Recovery)',
  '[{"item": "High-Lift Air Bags (20T)", "quantity": 4, "unit": "Kits"}, {"item": "Portable Generator Sets (5kW)", "quantity": 2, "unit": "Units"}]'::jsonb,
  'ROUTE-SUG-02',
  'NH-29 Bypass Ascending Ridge',
  'SUGGESTED',
  'P1_CRITICAL',
  NOW() - INTERVAL '20 minutes',
  NULL,
  'Duty Dispatch Driver',
  'Nagaland Police Liaison',
  'dimapur',
  'Dimapur Railhead',
  '[25.9095, 93.7266]'::jsonb,
  'DISASTER-02',
  'Phesama Rockfall Bottleneck',
  '[25.6450, 94.1150]'::jsonb,
  'Phesama Forward Field Post',
  'Rescue-02'
),
(
  'MISSION-SUG-03',
  'ML-SHL-001',
  'Shillong Central Hub',
  'Supply-04 (All-Terrain 10T Consignment)',
  '[{"item": "High-Energy Nutritional Biscuits", "quantity": 2000, "unit": "kg"}, {"item": "Emergency Solar Lanterns", "quantity": 100, "unit": "Units"}]'::jsonb,
  'ROUTE-SUG-03',
  'NH-6 Umkiang Bypass',
  'SUGGESTED',
  'P2_ELEVATED',
  NOW() - INTERVAL '10 minutes',
  NULL,
  'Duty Dispatch Driver',
  'Meghalaya Civil Defence',
  'guwahati',
  'Guwahati Regional Hub',
  '[26.1445, 91.7362]'::jsonb,
  'DISASTER-03',
  'Shillong Relief Reserve',
  '[25.5788, 91.8933]'::jsonb,
  'Shillong Emergency Store',
  'Supply-04'
)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  assigned_vehicle_id = EXCLUDED.assigned_vehicle_id,
  dispatched_at = EXCLUDED.dispatched_at,
  delivered_at = EXCLUDED.delivered_at,
  updated_at = NOW();


