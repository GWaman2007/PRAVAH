# PRAVAH — Comprehensive Codebase & Architecture Audit Report

**Target**: SIH 2026 Problem Statement ID: 26002 (MDoNER)  
**Platform**: AI-Based Smart Logistics and Accessibility Intelligence Platform for North Eastern Region (NER)  
**Evaluator**: Senior Systems Architect, Geospatial AI Engineer & Lead UI/UX Accessibility Specialist  
**Evaluated Repository**: `pravah-ner-logistics@1.0.0`  
**Production Build Status**: Verified Clean (`tsc -b && vite build` — 0 errors; `test_all_engines.mjs` — 54/54 Integration Tests Passing, 100%).

---

## 1. PS & Architecture Alignment Matrix

| PS Requirement (MDoNER PS 26002)                                 | PRAVAH Architectural Specification                                                                                              | Current Prototype Implementation Status | File / Component Reference                                                                                     | Gap Severity |
| :--------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------ | :-------------------------------------- | :------------------------------------------------------------------------------------------------------------- | :----------- |
| **Real-time Road, Bridge & Transport Accessibility Monitoring**  | Live GIS topological graph with dynamic edge attributes (clearance, gradient, surface, ISRO Bhuvan LHZ)                         | **Implemented**                         | `src/engine/routingEngine.ts`<br/>`src/components/gis/TacticalMapDeck.tsx`<br/>`src/data/routingNetwork.ts`    | **Low**      |
| **AI/ML Predictive Disruption Engine**                           | Real-time weather ingestion (precipitation 0–65 mm/h) + ISRO LHZ matrix + incident severity speed degradation model             | **Implemented**                         | `src/engine/openMeteoService.ts`<br/>`src/engine/routingEngine.ts`                                             | **Low**      |
| **Risk-Aware Alternate Routing & Delay Estimation**              | Yen's K-Shortest Path (K=5) with physical vehicle constraint pruning & multi-criteria safety scoring                            | **Implemented**                         | `src/engine/routingEngine.ts:findKShortestPaths`<br/>`src/engine/routingEngine.ts:evaluateAndRankPaths`        | **Low**      |
| **GPS Telemetry Integration & Dead-Reckoning in Valleys**        | GPS tracking + IMU dead-reckoning polyline extrapolation in cellular blackout shadow zones + Watchdog SLA (>0m Amber, >30m Red) | **Implemented**                         | `src/engine/telemetryEngine.ts`<br/>`src/data/fleetData.ts`                                                    | **Low**      |
| **Automated P0–P3 Multi-Tier Alert Engine**                      | Geo-fenced breach, blackout transition, stationary in hazard zone, route deviation (>500m), and stockout alerts                 | **Implemented**                         | `src/engine/telemetryEngine.ts`<br/>`src/App.tsx`                                                              | **Low**      |
| **Field Reporting Module with Geo-Tagging & Verification**       | Citizen crowdsourcing with Reddit-style upvoting + Officer Multiplier (I_officer \* 10) auto-cascading to road network state    | **Partially Implemented**               | `src/components/feed/GroundIntelligenceFeed.tsx`<br/>`src/engine/offlineSync.ts`                               | **Med**      |
| **Central Command Dashboards: District Index & Green Corridors** | 28-District Accessibility Health Index, Days-of-Supply runway, and BRO deployment queues                                        | **Implemented**                         | `src/components/executive/ExecutiveInfrastructureDeck.tsx`<br/>`src/components/executive/SupplyForecaster.tsx` | **Low**      |
| **Multilingual Accessibility & Zero-Network Sync**               | 5 NER languages (EN, HI, AS, BN, MN), procedural Web Audio synthesizers, and true offline PWA persistence                       | **Partially Implemented**               | `src/components/broadcast/MultilingualBroadcastCenter.tsx`<br/>`src/engine/offlineSync.ts`                     | **High**     |
| **Local SLM (Gemma) Structuring Vernacular Voice/Text**          | In-browser / on-device local SLM parser for vernacular audio/voice transcripts into structured incident JSON                    | **Missing**                             | Scaffolded as mock 3s timer in `src/components/feed/GroundIntelligenceFeed.tsx`                                | **High**     |

### Explicit Verification Findings

#### 1. Is the Graph Model Dynamic?

**YES (with a specific architectural nuance)**.

- In `src/store/usePravahStore.tsx`, `candidateRoutes` is reactive: whenever `activeDisruptions`, `rainfallMmHr`, or `selectedVehicle` mutate, `evaluateAndRankPaths` re-runs immediately.
- In `evaluateSegment` (`src/engine/routingEngine.ts`), a total road blockage dynamically triggers `hardConstraintFailures`, sets `isPassable = false`, and marks the corridor as dashed red (`rank: 99`). A single-lane restriction injects a 1.95x speed penalty.
- _Architectural Nuance_: In `src/engine/routingEngine.ts:dijkstra`, Dijkstra's initial search uses `segment.distance_km` as its base weight before pruning. Yen's spur paths explore alternate topology, but calculating base edge cost as dynamic impedance during Dijkstra itself would find more resilient bypasses when multiple primary segments are impaired.

#### 2. Is the Community Priority Score Functional or Mock Data?

**GENUINELY FUNCTIONAL & MATHEMATICALLY RIGOROUS**.

- `calculateCompositePriority` (`src/engine/priorityEngine.ts`) implements the exact formula:
  $$\text{Base Score} = 0.45 \cdot R_{\text{iso}} + 0.35 \cdot S_{\text{def}} + 0.20 \cdot I_{\text{vuln}}$$
  $$\text{Urgency Boost} = +0.20 \quad \text{if } S_{\text{def}} \ge 0.75 \text{ and } T_{\text{window}} \le 3.0\text{h}$$
- Continuous inventory depletion runs dynamically against elapsed hours ($\Delta t$):
  $$S_t = \max(0, S_{\text{last}} - \text{Hourly Burn} \cdot \Delta t)$$
  with a 1.4x monsoon medical surge multiplier applied to IV fluids and antivenom.
- **Closed-Loop Ground Truth**: Executing `markMissionDelivered('MZ-KOL-004')` resets $\Delta t = 0$, restocks commodities to 100%, drops $S_{\text{def}} \to 0.0$, and immediately flips Kolasib East from **P1 Critical (0.941) to P4 Nominal (0.280)**.

#### 3. Does Vehicle Suitability Actively Prune Incompatible Vehicles?

**YES**.

- In `evaluateSegment` (`src/engine/routingEngine.ts`), physical hard constraints are strictly enforced:
  - If `vehicle.weight_tonnes > segment.max_weight_limit` -> Route fails with load limit violation.
  - If `vehicle.height_m > segment.max_height_limit` -> Route fails with tunnel clearance violation.
  - If `vehicle.width_m > segment.max_width_limit` -> Route fails with narrow pass violation.
- When selecting the **Heavy Oxygen Cryo-Tanker (32T)**, routes crossing rural Bailey bridges rated for 18T are marked `isPassable: false`, with failure details attached to `failureBottleneck`.

---

## 2. Missing Features & Critical Implementation Gaps

### What is Completely Missing

1. **Local SLM (Gemma) Structuring Vernacular Voice/Text**:
   - The architecture specifies using Gemma to structure unformatted, dialectal field speech into standardized incident schema. In `GroundIntelligenceFeed.tsx`, selecting "Voice Audio" sets a 3-second `setTimeout` that fills a pre-written English string. There is no Web Speech API transcription or local ONNX/WASM SLM execution.
2. **Service Worker (`sw.js`) & Web App Manifest**:
   - Despite being designed as an offline PWA for remote valleys, the repository lacks a `public/manifest.json` and a registered Service Worker. If an officer loses network connection without loading all assets into browser cache first, a page refresh yields the browser offline screen.
3. **Hardware Geolocation API Integration**:
   - Telemetry relies on simulated mathematical tick loops (`telemetryEngine.ts`). The field cockpit lacks a toggle for `navigator.geolocation.watchPosition` to bind a live phone's actual GPS coordinates to the mission breadcrumbs.
4. **Opportunistic Store-and-Forward / BLE Mesh Simulation**:
   - While peer-to-peer sync is highlighted in the master architecture, no Web Bluetooth API or simulated peer-to-peer convoy gossip protocol is implemented between mobile cockpits.

### What Needs Immediate Refactoring

1. **Disconnected Field Reporting in Mobile Cockpit**:
   - `MobileMissionCockpit.tsx` contains a standalone `handleOfficerClearanceReport` that opens a bare textarea. It does not reuse the photo upload, voice memo, or corridor selection tools present in `GroundIntelligenceFeed.tsx`, creating fragmented reporting paths for field operators.
2. **Offline Storage Illusion: LocalStorage vs. IndexedDB**:
   - `offlineSync.ts` claims `IndexedDB` in comments and drawer titles, but executes synchronous `localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, ...)`. `localStorage` has a hard 5MB ceiling and blocks the main thread. If a field officer attaches two compressed photo proofs (Base64), `localStorage` will throw a `QuotaExceededError`.
3. **Static Leaflet Dark Mode Filter**:
   - In `index.css`, dark mode inverts OpenStreetMap raster tiles via CSS filter (`filter: brightness(0.85) invert(0.92)...`). This causes washed-out tile labels, artifacts on mountain contour lines, and distorts the polyline route colors. It should switch to dedicated dark tile endpoints (e.g., CartoDB Dark Matter) when `theme === 'dark'`.

### Edge & Sync Reality Check

- **Data Staleness Indicators**: `design.md` Sections 2 & 11 state: _"PRAVAH must never hide data staleness... every screen shows when that data is from"_. Currently, neither `Header.tsx` nor `TacticalMapDeck.tsx` displays an active staleness counter (_"Updated 12s ago"_ / _"Telemetry cached 4m ago"_).
- **Offline Queue Visual Confirmation**: While `OfflineQueueDrawer.tsx` displays pending items, submitting a report in `MobileMissionCockpit.tsx` while offline does not trigger an immediate reassuring banner (_"Report saved locally to flash storage — 1 pending sync"_).

---

## 3. UI/UX Polish & Modern Accessibility (WCAG 2.1 AA / Field-Grade)

### High-Stress Operations & Rugged Field UX

- **Touch Target Compliance (WCAG 2.5.5 / GIGW 3.0)**:
  - The bottom fixed HUD in `MobileMissionCockpit.tsx` correctly implements `.touch-target` (48x48px) for Emergency SOS and Mark Delivered.
  - _Deficiency_: The top mission convoy switcher strip and simulation controls use tiny 9px text and cramped buttons (28px height), which are difficult to operate with wet fingers or gloves in heavy rain.
- **Contrast Ratios (WCAG 1.4.3)**:
  - Brand Primary (`#1B4B73`) on `#FFFFFF` delivers 8.2:1 (exceeds AAA).
  - Status pairings in `tokens.css` are verified above 4.5:1.
  - _Deficiency_: In dark mode, `--color-text-tertiary` (`#6E7681`) on `--color-surface` (`#1B1F23`) yields 3.8:1, failing the 4.5:1 threshold for small body text.

### Central GIS Command Dashboard

- **Visual Clutter & Progressive Disclosure**:
  - The map deck loads the entire 8-state region at once. While visually impressive, opening the Vehicle Inspector, the Segment Modal, and the 1-Click Walkthrough Toolbar simultaneously creates overlapping floating cards that obscure the underlying map canvas on 1366x768 laptops.
  - It lacks a standard breadcrumb hierarchy: `NER Macro Overview -> State Filter (e.g. Mizoram) -> Corridor / Choke Point Focus`.
- **Map Readability & Color-Blind Safety**:
  - Closed routes use a dashed stroke (`dashArray: '8, 8'`), ensuring passability is not conveyed by red/green color alone (compliant with WCAG 1.4.1).
  - _Deficiency_: Candidate alternative routes (Sky Blue, Indigo, Violet) share similar luminance values. Adding line pattern variants or numerical rank badges on the route polylines is needed for clear differentiation under daylight glare.

### Multilingual & Localization Readiness

- **Font Rendering & Web Safe Fallbacks**:
  - `index.html` preconnects Google Fonts for _Noto Sans_, _Noto Sans Bengali_, and _Noto Sans Devanagari_.
  - _Critical Bug_: **Meitei Mayek (Manipuri)** script (`ꯈꯨꯗꯣꯡꯊꯤꯕ`) is used extensively in `translationsData.ts`, but _Noto Sans Meetei Mayek_ is **NOT** included in the Google Fonts link in `index.html`. On Windows systems without local Meitei fonts installed, the text renders as hollow rectangle glyphs ("tofu").
- **App-Wide Localization Coverage**:
  - Translation is currently restricted to broadcast SMS/TTS cards in `MultilingualBroadcastCenter.tsx`. The core UI chrome (navigation bar, table column headers, mission cockpit buttons) is 100% hardcoded English.

---

## 4. The SIH Winning Formula: Demo Flow & Live Pitch Readiness

### Evaluation of the Golden Demonstration Flow

$$
\begin{aligned}
\text{Step 0 (P4 Nominal)} &\longrightarrow \text{Step 1 (Monsoon Surge: 65 mm/h + Landslide Blockage)} \\
&\longrightarrow \text{Step 2 (P1 Critical + Preemptive Dispatch via Detour)} \\
&\longrightarrow \text{Step 3 (Cellular Blackout + IMU Dead-Reckoning + Watchdog SLA)} \\
&\longrightarrow \text{Step 4 (Delivery Verification + Tier Reset to P4 + District Health +35\%)}
\end{aligned}
$$

The interactive toolbar in `InteractiveWalkthroughToolbar.tsx` successfully executes this closed-loop cycle. Clicking through Steps 1, 2, and 3 triggers real state updates across the priority engine, the routing engine, and the district health matrix.

### High-Risk Break-Points & Demo Crash Hazards

1. **Leaflet Tile Invalidation on View Navigation**:
   - Switching from `GIS_COMMAND` to `MOBILE_COCKPIT` and back unmounts and remounts Leaflet DOM nodes. If a judge resizes the window or switches tabs quickly, Leaflet does not automatically calculate tile dimensions, resulting in blank grey tiles until the user pans.
2. **External TTS Proxy Reliance**:
   - `audioAlert.ts:playTextToSpeech` attempts to stream audio from an external Google TTS endpoint. Hackathon presentation halls frequently have strict captive portal Wi-Fi or high latency that blocks third-party audio streaming. While procedural sirens work, the voice speech component can freeze if the network times out.
3. **Role Switching State Mismatch**:
   - Switching roles to Driver automatically switches the view to `MOBILE_COCKPIT`. However, if the user switches roles using the toolbar pills inside the walkthrough drawer, the underlying view can become desynchronized if not explicitly pinned.

---

## 5. Prioritized Action Checklist (Sprint Plan)

### P0 (Must Fix in 24 Hours — Showstoppers for SIH)

- [ ] **Add Noto Sans Meetei Mayek Font to `index.html`**:
  - Add `&family=Noto+Sans+Meetei+Mayek:wght@400;600;700` to the Google Fonts link to resolve font rendering issues during regional broadcast demos.
- [ ] **Fix Leaflet Map Resize in `TacticalMapDeck.tsx` & `MobileMissionCockpit.tsx`**:
  - Add an explicit `map.invalidateSize()` inside a short `setTimeout` (150ms) on component mount and window resize observer to eliminate grey tile loading issues.
- [ ] **Unify Field Reporting in `MobileMissionCockpit.tsx`**:
  - Replace the isolated `handleOfficerClearanceReport` with the full incident submission modal, enabling photo evidence and voice reporting directly from the driver HUD.
- [ ] **Prevent Audio Failure on Offline/Restricted Wi-Fi**:
  - Update `audioAlert.ts` to check `window.speechSynthesis` first before attempting external HTTP audio streams, ensuring reliable speech synthesis without active internet.

### P1 (High Impact — UI/UX Polish & Field-Grade Robustness)

- [ ] **Add Live Data Staleness Indicators**:
  - In `Header.tsx`, add a live relative timer (_"Telemetry: Live (Updated 4s ago)"_ / _"Offline Cache: 6m ago"_).
- [ ] **Implement Client-Side Image Compression in `GroundIntelligenceFeed.tsx`**:
  - Scale photos to a maximum of 800x600 at 0.7 JPEG quality on an off-screen `<canvas>` prior to storing in the offline queue, preventing `localStorage` quota exceptions.
- [ ] **Add PWA Service Worker & Web Manifest**:
  - Create `public/manifest.json` and a lightweight Service Worker caching core CSS, JS, and tile assets so the application functions with zero network connectivity.
- [ ] **Dark Mode CartoDB Tile Layer**:
  - Replace the CSS invert filter with `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png` when `theme === 'dark'`, delivering clean, high-contrast night navigation.

### P2 (Differentiators — XAI, Speech AI & Pitch Polish)

- [ ] **Interactive Route Explainability Comparison**:
  - In `SegmentModal.tsx` and `CustomizeMissionModal.tsx`, render an explicit side-by-side comparison card: _Why Route B was selected over Route A_.
- [ ] **Browser Speech Recognition (Web Speech API) for Field Input**:
  - Connect `webkitSpeechRecognition` to the "Voice Audio" button in the incident modal to transcribe spoken incident reports in real time.
- [ ] **Progressive Disclosure State Filter in `TacticalMapDeck.tsx`**:
  - Add quick-jump filter chips for the key demonstration states (**Mizoram NH-306**, **Nagaland NH-29**, **Sikkim NH-10**) to focus the map and filter candidate routes in a single click.
