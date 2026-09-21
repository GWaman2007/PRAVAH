# PRAVAH Platform Audit & Technical Reality Check
**Analysis of Hardcoded Artifacts vs. Real-World Implementations & Production Roadmap**

---

## 1. Executive Summary

| Category | Implementation Status | Technical Details |
| :--- | :--- | :--- |
| **Mathematical & Algorithmic Engines** | **100% Real & Custom** | Multi-factor routing with Yen’s K-shortest paths, depletion run-rate countdowns, geospatial calculations (Ray-casting, Haversine, Cross-track), and Bayesian-style trust scoring. |
| **Live External APIs** | **Real with Graceful Simulation Fallbacks** | Open-Meteo Live Precipitation API, GDACS Global Disaster Alert GeoJSON, OpenFreeMap Vector Basemaps, Web Speech Synthesis & AudioContext siren synthesizers. |
| **Cloud Persistence & WebSockets** | **Real (Hybrid Fallback)** | Full Supabase PostgreSQL schema with Row-Level Security (RLS) and Realtime Channels, alongside an offline-first browser `localStorage` engine and an Express/Socket.io fallback server. |
| **Highway Network & Road Geometry** | **Curated Real-World Data** | Real North East India National Highways (NH-29, NH-10, NH-27, NH-306, NH-6, NH-37) with 3.4 MB of genuine OSRM GPS polylines, ISRO Bhuvan LHZ parameters, and realistic physical limits. |
| **Convoy Tracking & Operations** | **Semi-Simulated Physics Loop** | Interpolation along polylines, dead-zone extrapolation, and watchdog triggers are calculated dynamically. Coordinates are driven by a client-side clock loop rather than hardware GPS OBD-II dongles. |
| **Executive Governance & BRO Assets** | **Simulated / Pre-Seeded State** | Static district health metrics and BRO quick reaction teams for demonstration scenarios (e.g., Pagla Pahar, Teesta River). |

---

## 2. Platform Architecture Overview

```
PRAVAH Platform Architecture:
┌─────────────────────────────────────────────────────────────┐
│                       UI / PRESENTATION                     │
│  TacticalMapDeck  |  MissionsDeck  |  CommunitiesDeck  ...  │
└──────────────┬───────────────────────────────┬──────────────┘
               ▼                               ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      REAL ALGORITHMS         │ │     EXTERNAL & CLOUD       │
│ • Routing & Pruning Engine   │ │ • Open-Meteo REST API      │
│ • Depletion / Cutoff Math    │ │ • GDACS GeoJSON API        │
│ • Geospatial Polyline Math   │ │ • Supabase Cloud / RLS     │
│ • Web Speech & Audio Synth   │ │ • OpenFreeMap Vector Tiles │
└──────────────┬───────────────┘ └─────────────┬──────────────┘
               ▼                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     HARDCODED / SEEDED                      │
│ • Static Communities & Inventories • OSRM Precomputed Polylines │
│ • Choke Points & LHZ Zones        • Simulated Convoy Positions │
│ • BRO Asset Deployment Queues     • Preset Translations     │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Exhaustive Layer-by-Layer Breakdown

### Layer 1: Core Mathematical & Algorithmic Engines

#### A. Multi-Factor Routing & Hard-Constraint Pruning
* **File:** `src/engine/routingEngine.ts`
* **What is Real & Implemented:**
  * **Yen’s K-Shortest Paths Algorithm:** Complete graph search algorithm identifying primary, secondary, and tertiary mountain alternatives.
  * **Two-Stage Pruning Filter:**
    * **Stage 1 (Hard Constraints):** Checks vehicle Gross Vehicle Weight (GVW) against bridge ratings, vehicle height against tunnel portals, width against gorge cuts, and active road blockages.
    * **Stage 2 (Cost Function ML/Scoring):** Calculates risk and travel delay penalty using:
      $$\text{Risk} = 0.40 \cdot \text{RainfallFactor} + 0.30 \cdot \text{LHZFactor} + 0.30 \cdot \text{IncidentPenalty}$$
      Adjusted dynamically for gradient slope ($>3\%$) and road surface conditions (unpaved, under construction).
* **What is Hardcoded:**
  * Network topology: 8 nodes and 12 highway segments in `src/data/routingNetwork.ts`. Real-world highway paths beyond these predefined corridors are not evaluated dynamically.

#### B. Preemptive Community Depletion & Priority Engine
* **File:** `src/engine/priorityEngine.ts`
* **What is Real & Implemented:**
  * Calculates commodity run-rates:
    $$\text{HourlyBurn} = \left(\frac{\text{BaselineDailyBurn}}{24.0}\right) \times \phi_{\text{surge}}$$
    where $\phi_{\text{surge}} = 1.4$ for medical supplies during active monsoon alerts.
  * Dynamic stock depletion and countdown timer to zero stock ($T_{\text{exhaust}}$).
  * Calculates Isolation Risk ($R_{\text{iso}}$) factoring single-point-of-failure ingress route counts and Vulnerability Index ($I_{\text{vuln}}$).
  * Composite ranking algorithm generating Priority Tiers ($P_1, P_2, P_3, P_4$) with full audit trail breakdowns.
* **What is Hardcoded:**
  * Initial stock values, standard capacities, and daily consumption burn rates in `src/data/communitiesData.ts` (e.g., Kolasib East, Kohima South). There is no automated integration with state hospital inventory ERPs or NFSA food supply chains.

#### C. Geospatial Math & Dead-Reckoning
* **File:** `src/engine/gisMath.ts`
* **What is Real & Implemented:**
  * **Haversine Distance:** Exact Great-Circle distance in kilometers.
  * **Point-in-Polygon (Ray-Casting):** Determines whether a convoy is inside cellular blackouts or landslide hazard polygons.
  * **Cross-Track Error:** Measures perpendicular distance to route polylines to trigger $500\text{ m}$ off-route deviation alerts.
  * **Bearing & Heading Calculation:** Computes true forward navigation bearings along path segments.
* **What is Hardcoded:**
  * Blackout zone and landslide boundary coordinates defined as static polygons in `src/data/fleetData.ts` and `src/data/nerGeoJSON.ts`.

---

### Layer 2: Real External APIs & Cloud Services

#### A. Weather Intelligence (Open-Meteo & Radar)
* **File:** `src/engine/openMeteoService.ts`
* **What is Real & Implemented:**
  * Direct HTTP batch calls to Open-Meteo Forecast API:
    `https://api.open-meteo.com/v1/forecast?latitude=...&longitude=...&current=precipitation,rain,temperature_2m,weather_code`
  * Parses WMO weather interpretation codes into localized mountain conditions (e.g., violent orographic downpours, hill drizzle, mountain fog).
* **What is Hardcoded / Fallback:**
  * When offline or on network failure, falls back to `generateSimulatedMonsoonTelemetry()` which simulates historical monsoon rain rates for Cherrapunji, Dima Hasao, and North Sikkim.

#### B. Global Disaster Alerts (GDACS)
* **File:** `src/engine/realtimePolygonService.ts`
* **What is Real & Implemented:**
  * Fetches real-time GeoJSON disaster events directly from the UN/EC GDACS API:
    `https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventtypes=FL,EQ,TC,LS&format=geojson`
  * Geodesically bounds features within the Northeast India and contiguous Himalayan bounding box ($21.5^\circ\text{N} - 29.5^\circ\text{N},\, 88.0^\circ\text{E} - 97.5^\circ\text{E}$).
* **What is Hardcoded / Fallback:**
  * Baseline Landslide Hazard Zones (ISRO Bhuvan LHZ) are imported from static GeoJSON in `src/data/nerGeoJSON.ts`.

#### C. Database & Realtime Collaboration (Supabase)
* **Files:** `src/engine/supabaseClient.ts`, `supabase_schema.sql`
* **What is Real & Implemented:**
  * Real Postgres client with Row Level Security (RLS) policies.
  * Real-time WebSocket broadcasting over `supabase_realtime` pub/sub:
    * Synchronizes incident reports, upvotes, and verification status across clients.
    * Real-time driver SOS triggers and dispatcher acknowledgments.
    * Mission status lifecycle updates (`SUGGESTED` $\to$ `APPROVED` $\to$ `IN_TRANSIT` $\to$ `DELIVERED`).
* **What is Hardcoded / Fallback:**
  * When `VITE_SUPABASE_URL` is omitted, automatically falls back to an offline sync engine using browser `localStorage` and initial baseline seed incidents in `src/engine/offlineSync.ts`.

#### D. OSRM Road Geometry & Live Routing
* **Files:** `src/engine/osrmRoutingService.ts`, `src/data/osrmPrecomputedRoutes.ts`
* **What is Real & Implemented:**
  * Queries live OSRM public routing servers for road polylines (`https://router.project-osrm.org/route/v1/driving/...`).
  * In-memory route caching to minimize network usage and avoid rate limits.
* **What is Hardcoded:**
  * Pre-seeds 13 complete road-following polylines across Northeast India (totaling 3.4 MB of coordinates) in `osrmPrecomputedRoutes.ts` to guarantee zero latency and offline capability.

#### E. Speech Synthesis & Emergency Sirens
* **Files:** `src/utils/audioAlert.ts`, `src/components/broadcast/MultilingualBroadcastCenter.tsx`
* **What is Real & Implemented:**
  * **Web Audio API:** Real-time synthesis of emergency siren warbles and data packet chirps using procedural dual-oscillator modulations.
  * **Web Speech API:** Browser text-to-speech engine with dynamic regional voice selection and phonetic fallback pronunciation.
* **What is Hardcoded:**
  * Pre-translated emergency phrases across 5 languages (English, Hindi, Assamese, Bengali, Manipuri Meitei Mayek) in `src/data/translationsData.ts`.

---

### Layer 3: Vehicle Telemetry & Convoy Tracking

* **Files:** `src/engine/telemetryEngine.ts`, `src/data/fleetData.ts`
* **Status:** **Simulation Model running on real road polylines.**
* **What is Real & Implemented:**
  * Step simulation engine interpolates vehicle location along real road curves at configured speeds.
  * Calculates speed jitter, route progress percentage, and cross-track deviations.
  * Dynamic detection of entry/exit from cellular blackout dead zones. When in a dead zone, the system switches to dead-reckoning extrapolation and triggers watchdog timers.
* **What is Hardcoded:**
  * The 4 vehicles (`Medic-01`, `Oxy-Tanker-04`, `Ration-Convoy-07`, `Heavy-Fuel-12`) and their cargo capacities, speeds, and routes are pre-seeded constants. There is no physical GPS hardware (AIS 140 / OBD-II) feeding coordinates over MQTT or cellular UDP.

---

### Layer 4: Executive Deck & Infrastructure Management

* **Files:** `src/components/executive/ExecutiveInfrastructureDeck.tsx`, `src/data/executiveData.ts`
* **Status:** **Demonstration-focused with interactive state.**
* **What is Implemented:**
  * Interactive deployment workflow for Border Roads Organisation (BRO) engineering assets (e.g., Bailey bridge kits, heavy rock breakers).
  * Automated generation of formal emergency situation memos summarizing road severances, cutoff hours, and required sorties.
* **What is Hardcoded:**
  * The 5 districts (Tawang, North Sikkim, Kolasib, Dima Hasao, Kohima), their populations, isolation ratings, and historical 5-day consumption depletion curves are hardcoded seed arrays.

---

## 4. Detailed Comparison Matrix

| Subsystem | Feature | Status | Location in Code |
| :--- | :--- | :--- | :--- |
| **Routing** | Yen’s K-Shortest Paths | **Real** | `src/engine/routingEngine.ts` |
| **Routing** | Multi-Factor Cost Scoring | **Real** | `src/engine/routingEngine.ts` |
| **Routing** | Bridge & Tunnel Constraints | **Real** | `src/engine/routingEngine.ts` |
| **Routing** | NER Network Topology | **Hardcoded** | `src/data/routingNetwork.ts` |
| **Depletion** | Hourly Run-Rate & $T_{\text{exhaust}}$ | **Real** | `src/engine/priorityEngine.ts` |
| **Depletion** | Medical Surge ($\phi_{\text{surge}} = 1.4$) | **Real** | `src/engine/priorityEngine.ts` |
| **Depletion** | Hospital & Commodity Stock | **Hardcoded** | `src/data/communitiesData.ts` |
| **Weather** | Open-Meteo REST API | **Real** | `src/engine/openMeteoService.ts` |
| **Weather** | Simulated Monsoon Downpour | **Fallback** | `src/engine/openMeteoService.ts` |
| **Hazard GIS** | GDACS Global Disaster Feed | **Real** | `src/engine/realtimePolygonService.ts` |
| **Hazard GIS** | ISRO Bhuvan LHZ Polygons | **Hardcoded** | `src/data/nerGeoJSON.ts` |
| **Road Curves** | OSRM Driving Road API | **Real** | `src/engine/osrmRoutingService.ts` |
| **Road Curves** | Precomputed High-Res Polylines | **Hardcoded Cache** | `src/data/osrmPrecomputedRoutes.ts` |
| **Telematics** | GIS Interpolation & Heading | **Real** | `src/engine/telemetryEngine.ts` |
| **Telematics** | Cellular Dead-Zone Detection | **Real** | `src/engine/telemetryEngine.ts` |
| **Telematics** | Live Vehicle GPS Coordinates | **Simulated** | `src/engine/telemetryEngine.ts` |
| **Database** | Supabase Postgres & Realtime Bus | **Real** | `src/engine/supabaseClient.ts`, `supabase_schema.sql` |
| **Database** | Offline-First `localStorage` Sync | **Real** | `src/engine/offlineSync.ts` |
| **Audio / Alert** | Web Audio API Dual Oscillator | **Real** | `src/utils/audioAlert.ts` |
| **Audio / Alert** | Multilingual TTS Synthesis | **Real** | `src/utils/audioAlert.ts` |
| **Audio / Alert** | Incident Warning Translations | **Hardcoded** | `src/data/translationsData.ts` |
| **Executive** | BRO Asset Dispatch Workflow | **Real** | `src/components/executive/ExecutiveInfrastructureDeck.tsx` |
| **Executive** | District Days-of-Supply Baseline | **Hardcoded** | `src/data/executiveData.ts` |

---

## 5. Architectural Roadmap for Production Implementation

To transition PRAVAH from a demonstration prototype to a live state-wide operational platform for MDoNER / NDMA:

### 1. Live Telematics via AIS-140 GPS & MQTT
* **Current:** Convoy positions advance via an in-memory timer interpolation loop.
* **Production Implementation:**
  * Deploy an **MQTT / Webhook Broker** (e.g., EMQX or AWS IoT Core).
  * Ingest real-time NMEA / AIS-140 GPS packets sent from government and commercial fleet telematics tracking units (standard on commercial vehicles in India).
  * Use the existing dead-reckoning algorithm in `telemetryEngine.ts` as a real-time fallback when vehicles lose cellular connectivity in mountain gorges.

### 2. Live Supply Chain & Healthcare ERP Integration
* **Current:** Inventories and daily burn rates are static records in `communitiesData.ts`.
* **Production Implementation:**
  * Connect to the **Ministry of Health (HMIS / e-Sanjeevani / DVDMS)** inventory database for district civil hospitals to read real stock counts of IV fluids, antivenom, and oxygen cylinders.
  * Connect to the **NFSA (National Food Security Act) / FCI Godown Portal** to ingest buffer stocks of food grains and diesel reserve levels.

### 3. OpenStreetMap Overpass API for Dynamic Mountain Corridors
* **Current:** Highway segments are confined to 12 pre-mapped segments.
* **Production Implementation:**
  * Integrate an OpenStreetMap Overpass query or self-hosted GraphHopper / OSRM engine loaded with Northeast India PBF road networks.
  * Dynamically extract road properties (gradient, surface type, lane width, bridge tonnage limits) directly from OSM tags (`maxweight`, `maxheight`, `surface`, `incline`).

### 4. Official Meteorological & Earth Observation Feeds
* **Current:** Uses Open-Meteo public endpoints and pre-seeded ISRO Bhuvan LHZ polygons.
* **Production Implementation:**
  * Ingest live **IMD (India Meteorological Department)** Nowcast radar data feeds and Red/Orange/Yellow district warnings.
  * Connect to **ISRO Bhuvan Landslide Early Warning System (LEWS)** WMS/WFS geospatial services to stream live slope instability alerts directly into MapLibre.

### 5. Automated AI Translation & Telco Emergency Broadcasts
* **Current:** Uses preset static translations for sample incidents.
* **Production Implementation:**
  * Integrate **Bhashini API** (Government of India’s National Language Translation Mission) for real-time speech and text translation across all Northeast languages (Assamese, Bodo, Manipuri Meitei Mayek, Mizo, Nagamese, Khasi, Garo).
  * Wire the broadcast dispatch button to the **National Disaster Management Authority (NDMA) Cell Broadcast Emergency Alert System (CAP - Common Alerting Protocol)** to transmit cell-tower broadcast SMS to all mobile devices in affected mountain sectors.
