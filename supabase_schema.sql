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
