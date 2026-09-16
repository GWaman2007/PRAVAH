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
)
ON CONFLICT (id) DO NOTHING;
