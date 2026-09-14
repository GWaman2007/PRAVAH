# NER Smart Logistics &mdash; Disaster & Accessibility GIS Heatmap

A standalone, high-performance interactive GIS dashboard built for North East India (NER &mdash; Assam, Meghalaya, Arunachal Pradesh, Nagaland, Manipur, Mizoram, Tripura, and Sikkim). Visualizes real-time disaster hazards, weather alerts, and rainfall heatmaps across 4 milestones using Leaflet.js, Leaflet.heat, and TailwindCSS.

---

## 🌟 Architectural Highlights

### Milestone 1: Base Map Setup
- **Centering & Zoom:** Center coordinate `[26.2006, 92.9376]` with default zoom level `7` and strict regional bounds preventing drift out of North East India.
- **Base Tile Layers:**
  - **CartoDB Voyager / OSM Base:** High-contrast street & topography cartography (`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png`).
  - **Esri World Imagery (Satellite):** High-resolution satellite reconnaissance (`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`).
- **Navigation & Controls:**
  - Standard Leaflet zoom controls & scale bar.
  - Dedicated **Reset View** button to quickly snap back to NER overview (`[26.2006, 92.9376]`, zoom `7`).
  - State Quick-Jump dropdown (Assam, Meghalaya, Arunachal, Nagaland, Manipur, Mizoram, Tripura, Sikkim).

### Milestone 2: Geological Hazard & Landslide Layer (ISRO Bhuvan Integration)
- **Primary Pipeline (WMS):** Configured with `L.tileLayer.wms` pointing to NRSC Bhuvan OGC WMS endpoints (`https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms` with layer `landslide_hazard_ner`, `format: 'image/png'`, `transparent: true`, `version: '1.1.1'`).
- **Graceful Fallback & Offline Engine:**
  - Automatic fallback handler upon tile failure / CORS restriction + manual toggle button in the sidebar.
  - Authentic GeoJSON high-risk zones across critical NER logistical corridors:
    - **NH-29 Kohima–Dimapur Corridor** (Phesama / Zubza / Chumukedima sinking zones) &mdash; `Very High`
    - **NH-10 Siliguri–Gangtok Corridor** (Sevoke, Teesta Bazar, 29th Mile, Singtam) &mdash; `Very High`
    - **Dima Hasao Hill Highway** (Haflong, Jatinga, Daotuhaja subsidence belt) &mdash; `Very High`
    - **North Sikkim Strategic Highway** (Mangan, Chungthang upper Teesta slide zone) &mdash; `Very High`
    - **Nongpoh & Ri-Bhoi Hill Slopes** (Meghalaya Plateau escarpment on NH-6) &mdash; `High`
    - **Bomdila–Sela–Tawang Axis** (West Kameng mountain road) &mdash; `High`
    - **Cherrapunji–Mawsynram Canyon Slopes** (World's highest precipitation cliffs) &mdash; `High`
    - **Tamenglong & Noney Hill Slopes** (Imphal–Jiribam NH-37) &mdash; `High`
    - **Aizawl–Kolasib Ridge Slopes** (Mizoram shale and clay slippage) &mdash; `Moderate`
    - **Karbi Anglong Foothills** (Assam) &mdash; `Moderate`
    - **Baramura Ridge** (Tripura NH-8) &mdash; `Moderate`
    - **Siang Valley Piedmont & Pasighat** (Arunachal Pradesh) &mdash; `Moderate`
  - Interactive tooltips & popups with slope gradients, lithology, hazard scores, and corridor advisories.

### Milestone 3: IMD District-Level Weather Alert Overlay
- **District Choropleth:** Vector boundaries covering all 8 North Eastern states dynamically rendered into 4 color tiers:
  - 🔴 **Red:** Severe Flood / Landslide Warning (Flash Flood Risk)
  - 🟠 **Orange:** Heavy Rainfall Warning (Be Prepared)
  - 🟡 **Yellow:** Moderate Weather Watch (Be Aware)
  - 🟢 **Green:** Normal / No Warning
- **Pluggable Architecture:**
  - Includes a pluggable `fetchIMDAlerts(endpoint)` with an editable constant:
    ```javascript
    const IMD_API_ENDPOINT = "https://mausam.imd.gov.in/api/district_bulletin";
    ```
  - Internal mock state renders active alerts immediately (e.g., East Khasi Hills: Red, Papum Pare: Orange, Dima Hasao: Red, Kamrup Metro: Yellow, Dimapur: Green).
  - Built-in simulation triggers (`Simulate Surge`, `Reset Alerts`, and Alert Level filters).

### Milestone 4: Live Rainfall Heatmap (Open-Meteo Integration)
- **Real-Time Data Ingestion:**
  - Client-side batch query hitting the **Open-Meteo Free Forecast API** (no API key required) across **29 major transport choke points and highway transit nodes** in NER.
  - Extracts current `precipitation` (in mm), temperature, and rain metrics.
- **Heatmap Rendering:**
  - Powered by `leaflet-heat`.
  - Normalized intensity mapping: `0 mm` = clear, `1-5 mm` = light green, `5-15 mm` = yellow/orange, `>15 mm` = intense red heat cloud.
- **Interactive Station Pins:**
  - Toggleable station badges with live `mm/hr` readings, elevation, and logistics criticality notes.
- **Controls & Simulation:**
  - "Refresh Live Rainfall" button with loading spinner and "Last updated: HH:MM:SS" badge.
  - "Simulate Monsoon" toggle to preview heavy cloudburst patterns even during dry spells.
  - Heat radius and blur smoothing sliders.

### ⚡ Live Keyless Smart Disaster Routing (Powered by OSM / OSRM)
- **Zero API Keys Required:** Uses the public Open Source Routing Machine (OSRM) engine on OpenStreetMap network data.
- **Shortest Road Geometry:** Calculates the exact shortest road route across high mountain highways in North East India.
- **Live Metrics:** Distance in kilometers (km), estimated driving duration (hours & minutes), and waypoint counts.
- **Automated Hazard Collision Audit:** Inspects whether the calculated path intersects any of the 12 ISRO Landslide Hazard zones or active IMD Red/Orange alert districts, displaying active warnings.
- **Interactive Controls:**
  - Origin and Destination dropdowns for all 29 choke points.
  - Quick strategic corridor presets (e.g. *Guwahati ➔ Shillong*, *Guwahati ➔ Kohima*, *Guwahati ➔ Silchar*, *Silchar ➔ Agartala*, *Guwahati ➔ Gangtok*, *Guwahati ➔ Tawang*).
  - **"Pick on Map"** mode: Click any two points anywhere in NER on the map to immediately calculate and display the shortest road route.
  - Glowing neon cyan polyline with directional framing and flyToBounds animation.

### UI / UX & Diagnostics
- **Header Panel:** Dashboard title, subtitle, and live counters for choke points, hazard zones, and active Red alerts.
- **Sidebar:** Glassmorphic control card with switches, sliders, filters, and scenario buttons.
- **Visual Legend:** Clear color swatches for rainfall scales, hazard zonation, and IMD warnings.
- **Diagnostic Log Bar:** Terminal-style stream at the bottom tracking HTTP calls, status codes, fallback switches, and layer events in real time.

---

## 🚀 Quick Start Guide

### Option 1: Direct File Launch (Zero Dependencies)
Double-click `index.html` or open it in Google Chrome, Microsoft Edge, Firefox, or Safari. Everything is self-contained with CDN imports.

### Option 2: Local HTTP Server (Recommended)
You can run any static web server in the directory:

```bash
# Using npx serve
npx serve . -p 3000

# Using Python
python -m http.server 3000
```
Open `http://localhost:3000` in your web browser.

---

## 📁 File Structure

```
d:/PRAVAH/HeatMapTesting/
├── index.html                       # Main HTML5 application shell & UI layout
├── css/
│   └── styles.css                   # Custom glassmorphic styling, animations, and popups
├── js/
│   ├── config.js                    # Global configurations, endpoints, map coordinates & color scales
│   ├── data/
│   │   ├── nerChokePoints.js        # 29 highway choke points & coordinates across all 8 states
│   │   ├── landslideGeoJSON.js       # 12 authentic high-risk Landslide Hazard Zonation (LHZ) polygons
│   │   └── nerDistrictsGeoJSON.js    # District boundaries & alert attributes across 8 NER states
│   ├── services/
│   │   ├── bhuvanService.js         # ISRO Bhuvan WMS connector + offline GeoJSON fallback manager
│   │   ├── imdService.js            # IMD District Alerts choropleth, pluggable fetch, & filter engine
│   │   └── openMeteoService.js      # Open-Meteo batch API fetcher, heat layer, & station pins
│   └── app.js                       # Map orchestrator, event bindings, and diagnostic logger
├── package.json                     # Development scripts
└── README.md                        # Documentation and architecture guide
```
