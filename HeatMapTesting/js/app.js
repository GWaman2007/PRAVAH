/**
 * Main Application Orchestrator for NER GIS Disaster & Weather Heatmap
 * Coordinates Milestones 1 - 4, UI interactions, and diagnostic logging
 */

class DiagnosticLogger {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.logs = [];
    this.maxLogs = 150;
  }

  log(type, message) {
    const time = new Date().toLocaleTimeString();
    const entry = { type, message, time };
    this.logs.push(entry);

    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    this.renderEntry(entry);
    console.log(`[${entry.type}] ${entry.time} - ${entry.message}`);
  }

  info(msg) { this.log('INFO', msg); }
  success(msg) { this.log('SUCCESS', msg); }
  warn(msg) { this.log('WARN', msg); }
  error(msg) { this.log('ERROR', msg); }

  renderEntry(entry) {
    if (!this.container) return;

    let badgeClass = "text-sky-400 bg-sky-950/50 border-sky-800/60";
    let icon = "ℹ️";

    if (entry.type === 'SUCCESS') {
      badgeClass = "text-emerald-400 bg-emerald-950/50 border-emerald-800/60";
      icon = "✅";
    } else if (entry.type === 'WARN') {
      badgeClass = "text-amber-400 bg-amber-950/50 border-amber-800/60";
      icon = "⚠️";
    } else if (entry.type === 'ERROR') {
      badgeClass = "text-rose-400 bg-rose-950/50 border-rose-800/60";
      icon = "❌";
    }

    const div = document.createElement('div');
    div.className = "log-entry py-1 px-1.5 rounded text-[11px] font-mono hover:bg-white/5 transition-colors border-b border-white/[0.04]";
    div.innerHTML = `
      <span class="text-slate-500 shrink-0 select-none">${entry.time}</span>
      <span class="px-1.5 py-0.2 rounded border ${badgeClass} text-[10px] font-bold shrink-0">${entry.type}</span>
      <span class="text-slate-200 flex-1">${entry.message}</span>
    `;

    this.container.appendChild(div);
    this.container.scrollTop = this.container.scrollHeight;
  }

  clear() {
    this.logs = [];
    if (this.container) {
      this.container.innerHTML = '';
      this.info("Diagnostic log cleared.");
    }
  }
}

class NerGisApp {
  constructor() {
    this.map = null;
    this.baseLayers = {};
    this.currentBaseLayer = null;
    this.logger = null;

    // Services
    this.bhuvanService = null;
    this.imdService = null;
    this.openMeteoService = null;
    this.routingService = null;

    // Interactive Map Click Routing State
    this.mapClickRoutingActive = false;
    this.tempMapClickPoints = [];
  }

  init() {
    // 1. Initialize Logger
    this.logger = new DiagnosticLogger('diagnostic-log-container');
    this.logger.info("Initializing NER GIS Disaster & Logistics Platform (Milestones 1–4)...");

    // 2. Initialize Leaflet Map (Milestone 1)
    this.initMap();

    // 3. Initialize Domain Services (Milestones 2, 3, 4 + OSM Routing)
    this.initServices();

    // 4. Populate Routing Dropdowns
    this.populateRoutingDropdowns();

    // 5. Bind UI Event Listeners
    this.bindUIEvents();

    // 6. Update Header Stat Chips
    this.updateHeaderStats();

    this.logger.success("All GIS layers, services, and event controllers initialized successfully!");
  }

  /**
   * Milestone 1: Base Map Setup
   */
  initMap() {
    this.logger.info(`[Base Map]: Setting up Leaflet canvas centered at [${CONFIG.map.initialCenter.join(', ')}] with zoom ${CONFIG.map.initialZoom}...`);

    // Create Map instance
    this.map = L.map('map', {
      center: CONFIG.map.initialCenter,
      zoom: CONFIG.map.initialZoom,
      minZoom: CONFIG.map.minZoom,
      maxZoom: CONFIG.map.maxZoom,
      maxBounds: CONFIG.map.maxBounds,
      zoomControl: false // Using custom positioned zoom control
    });

    // Custom Zoom Control at top-right
    L.control.zoom({
      position: 'topright'
    }).addTo(this.map);

    // Scale Bar at bottom-left
    L.control.scale({
      position: 'bottomleft',
      imperial: false,
      metric: true
    }).addTo(this.map);

    // Base Tile Layers
    this.baseLayers.cartoVoyager = L.tileLayer(CONFIG.baseLayers.cartoVoyager.url, {
      attribution: CONFIG.baseLayers.cartoVoyager.attribution,
      subdomains: CONFIG.baseLayers.cartoVoyager.subdomains,
      maxZoom: CONFIG.baseLayers.cartoVoyager.maxZoom
    });

    this.baseLayers.satellite = L.tileLayer(CONFIG.baseLayers.satellite.url, {
      attribution: CONFIG.baseLayers.satellite.attribution,
      maxZoom: CONFIG.baseLayers.satellite.maxZoom
    });

    // Default to CartoDB Voyager Base
    this.baseLayers.cartoVoyager.addTo(this.map);
    this.currentBaseLayer = 'cartoVoyager';

    this.logger.success("[Base Map]: Voyager street layer loaded as active base.");
  }

  switchBaseLayer(layerKey) {
    if (layerKey === this.currentBaseLayer) return;

    if (this.currentBaseLayer && this.baseLayers[this.currentBaseLayer]) {
      this.map.removeLayer(this.baseLayers[this.currentBaseLayer]);
    }

    if (this.baseLayers[layerKey]) {
      this.baseLayers[layerKey].addTo(this.map);
      this.currentBaseLayer = layerKey;
      this.logger.info(`[Base Map]: Switched base layer to: ${CONFIG.baseLayers[layerKey].name}`);
    }
  }

  resetView() {
    this.map.flyTo(CONFIG.map.initialCenter, CONFIG.map.initialZoom, {
      duration: 1.2,
      easeLinearity: 0.25
    });
    this.logger.info(`[Navigation]: Map view reset to NER Center [${CONFIG.map.initialCenter.join(', ')}], Zoom ${CONFIG.map.initialZoom}`);
  }

  zoomToRegion(regionKey) {
    const region = CONFIG.regions[regionKey];
    if (!region) return;

    this.map.flyTo(region.center, region.zoom, {
      duration: 1.0
    });
    this.logger.info(`[Navigation]: Quick-jumped to region: ${region.name} [Zoom ${region.zoom}]`);
  }

  /**
   * Initialize Milestones 2, 3, 4 + OSM Routing
   */
  initServices() {
    // Milestone 2: ISRO Bhuvan Landslide Hazard Zonation
    this.bhuvanService = new window.BhuvanService(this.map, this.logger);
    this.bhuvanService.addToMap();

    // Milestone 3: IMD District Weather Alert Overlay
    this.imdService = new window.ImdService(this.map, this.logger);
    this.imdService.addToMap();

    // Milestone 4: Live Rainfall Heatmap (Open-Meteo)
    this.openMeteoService = new window.OpenMeteoService(this.map, this.logger);

    // Live Keyless OSM / OSRM Smart Routing Service
    this.routingService = new window.RoutingService(this.map, this.logger);
  }

  populateRoutingDropdowns() {
    const originSelect = document.getElementById('select-route-origin');
    const destSelect = document.getElementById('select-route-dest');
    if (!originSelect || !destSelect) return;

    originSelect.innerHTML = '';
    destSelect.innerHTML = '';

    window.NER_CHOKE_POINTS.forEach((pt) => {
      const opt1 = document.createElement('option');
      opt1.value = pt.id;
      opt1.textContent = `${pt.name} (${pt.state})`;

      const opt2 = document.createElement('option');
      opt2.value = pt.id;
      opt2.textContent = `${pt.name} (${pt.state})`;

      originSelect.appendChild(opt1);
      destSelect.appendChild(opt2);
    });

    // Default: Guwahati Jalukbari (CP-AS-01) -> Kohima Zubza (CP-NL-02)
    originSelect.value = "CP-AS-01";
    destSelect.value = "CP-NL-02";
  }

  /**
   * Bind all sidebar controls, switches, sliders, and buttons
   */
  bindUIEvents() {
    // 1. Base Layer Radio Buttons
    const baseRadios = document.querySelectorAll('input[name="base-layer"]');
    baseRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.switchBaseLayer(e.target.value);
      });
    });

    // 2. Custom Reset View Button
    const btnResetView = document.getElementById('btn-reset-view');
    if (btnResetView) {
      btnResetView.addEventListener('click', () => this.resetView());
    }

    // 3. Region Quick-Jump Selector
    const regionSelect = document.getElementById('select-region-jump');
    if (regionSelect) {
      regionSelect.addEventListener('change', (e) => {
        this.zoomToRegion(e.target.value);
      });
    }

    // 4. Milestone 2: ISRO Bhuvan Controls
    const toggleBhuvan = document.getElementById('toggle-bhuvan-lhz');
    if (toggleBhuvan) {
      toggleBhuvan.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.bhuvanService.addToMap();
        } else {
          this.bhuvanService.removeFromMap();
        }
      });
    }

    const btnBhuvanWms = document.getElementById('btn-bhuvan-wms');
    const btnBhuvanGeoJSON = document.getElementById('btn-bhuvan-geojson');

    if (btnBhuvanWms && btnBhuvanGeoJSON) {
      btnBhuvanWms.addEventListener('click', () => {
        this.bhuvanService.switchToWMS();
        btnBhuvanWms.className = "px-2.5 py-1 text-xs font-semibold rounded bg-cyan-600 text-white shadow";
        btnBhuvanGeoJSON.className = "px-2.5 py-1 text-xs font-semibold rounded bg-slate-800 text-slate-400 hover:text-white";
      });

      btnBhuvanGeoJSON.addEventListener('click', () => {
        this.bhuvanService.switchToGeoJSON();
        btnBhuvanGeoJSON.className = "px-2.5 py-1 text-xs font-semibold rounded bg-amber-600 text-white shadow";
        btnBhuvanWms.className = "px-2.5 py-1 text-xs font-semibold rounded bg-slate-800 text-slate-400 hover:text-white";
      });
    }

    const sliderBhuvanOpacity = document.getElementById('slider-bhuvan-opacity');
    if (sliderBhuvanOpacity) {
      sliderBhuvanOpacity.addEventListener('input', (e) => {
        this.bhuvanService.setOpacity(e.target.value);
      });
    }

    // 5. Milestone 3: IMD District Alerts Controls
    const toggleImd = document.getElementById('toggle-imd-alerts');
    if (toggleImd) {
      toggleImd.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.imdService.addToMap();
        } else {
          this.imdService.removeFromMap();
        }
      });
    }

    const filterImdSelect = document.getElementById('select-imd-filter');
    if (filterImdSelect) {
      filterImdSelect.addEventListener('change', (e) => {
        this.imdService.setFilter(e.target.value);
      });
    }

    const sliderImdOpacity = document.getElementById('slider-imd-opacity');
    if (sliderImdOpacity) {
      sliderImdOpacity.addEventListener('input', (e) => {
        this.imdService.setOpacity(e.target.value);
      });
    }

    const btnSimulateSurge = document.getElementById('btn-simulate-surge');
    if (btnSimulateSurge) {
      btnSimulateSurge.addEventListener('click', () => {
        this.imdService.simulateScenario('monsoon_surge');
      });
    }

    const btnResetImd = document.getElementById('btn-reset-imd');
    if (btnResetImd) {
      btnResetImd.addEventListener('click', () => {
        this.imdService.seedInternalMockState();
        this.imdService.renderChoropleth();
      });
    }

    // 6. Milestone 4: Live Rainfall Heatmap Controls
    const toggleRainHeatmap = document.getElementById('toggle-rainfall-heat');
    if (toggleRainHeatmap) {
      toggleRainHeatmap.addEventListener('change', (e) => {
        this.openMeteoService.toggleHeatmap(e.target.checked);
      });
    }

    const toggleStations = document.getElementById('toggle-station-pins');
    if (toggleStations) {
      toggleStations.addEventListener('change', (e) => {
        this.openMeteoService.toggleStationPins(e.target.checked);
      });
    }

    const sliderHeatRadius = document.getElementById('slider-heat-radius');
    if (sliderHeatRadius) {
      sliderHeatRadius.addEventListener('input', (e) => {
        this.openMeteoService.setRadius(e.target.value);
      });
    }

    const sliderHeatBlur = document.getElementById('slider-heat-blur');
    if (sliderHeatBlur) {
      sliderHeatBlur.addEventListener('input', (e) => {
        this.openMeteoService.setBlur(e.target.value);
      });
    }

    const btnRefreshRainfall = document.getElementById('btn-refresh-rainfall');
    if (btnRefreshRainfall) {
      btnRefreshRainfall.addEventListener('click', () => {
        this.openMeteoService.fetchLiveRainfall();
      });
    }

    const btnSimulateMonsoon = document.getElementById('btn-simulate-monsoon');
    if (btnSimulateMonsoon) {
      btnSimulateMonsoon.addEventListener('click', () => {
        this.openMeteoService.simulateMonsoonDownpour(false);
      });
    }

    // 7. Live Keyless OSM / OSRM Smart Routing Controls
    const btnCalculateRoute = document.getElementById('btn-calculate-route');
    if (btnCalculateRoute) {
      btnCalculateRoute.addEventListener('click', () => {
        const originId = document.getElementById('select-route-origin').value;
        const destId = document.getElementById('select-route-dest').value;

        const origin = window.NER_CHOKE_POINTS.find(p => p.id === originId);
        const dest = window.NER_CHOKE_POINTS.find(p => p.id === destId);

        if (origin && dest) {
          this.routingService.calculateRoute(origin, dest, origin.name, dest.name);
        }
      });
    }

    const btnSwapRoute = document.getElementById('btn-swap-route');
    if (btnSwapRoute) {
      btnSwapRoute.addEventListener('click', () => {
        const originSelect = document.getElementById('select-route-origin');
        const destSelect = document.getElementById('select-route-dest');
        const temp = originSelect.value;
        originSelect.value = destSelect.value;
        destSelect.value = temp;

        const origin = window.NER_CHOKE_POINTS.find(p => p.id === originSelect.value);
        const dest = window.NER_CHOKE_POINTS.find(p => p.id === destSelect.value);
        if (origin && dest) {
          this.routingService.calculateRoute(origin, dest, origin.name, dest.name);
        }
      });
    }

    const btnClearRoute = document.getElementById('btn-clear-route');
    if (btnClearRoute) {
      btnClearRoute.addEventListener('click', () => {
        this.routingService.clearRoute();
      });
    }

    // Quick Preset buttons
    const presetButtons = document.querySelectorAll('.btn-route-preset');
    presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const oId = btn.getAttribute('data-origin');
        const dId = btn.getAttribute('data-dest');
        document.getElementById('select-route-origin').value = oId;
        document.getElementById('select-route-dest').value = dId;

        const origin = window.NER_CHOKE_POINTS.find(p => p.id === oId);
        const dest = window.NER_CHOKE_POINTS.find(p => p.id === dId);
        if (origin && dest) {
          this.routingService.calculateRoute(origin, dest, origin.name, dest.name);
        }
      });
    });

    // Map Click Mode for interactive routing
    const btnMapClickMode = document.getElementById('btn-map-click-mode');
    const btnFloatingPickMap = document.getElementById('btn-floating-pick-map');
    const labelMapClickMode = document.getElementById('label-map-click-mode');
    const instructionBanner = document.getElementById('picking-instruction-banner');
    const instructionText = document.getElementById('picking-instruction-text');
    const btnCancelPicking = document.getElementById('btn-cancel-picking');
    const mapEl = document.getElementById('map');

    const activatePickingMode = () => {
      this.mapClickRoutingActive = true;
      this.tempMapClickPoints = [];
      if (this.tempMarkerA) {
        this.map.removeLayer(this.tempMarkerA);
        this.tempMarkerA = null;
      }

      if (labelMapClickMode) labelMapClickMode.textContent = "Click Point A...";
      if (btnMapClickMode) btnMapClickMode.className = "px-3 py-1.5 rounded-lg bg-cyan-500 text-white font-bold text-xs shadow-lg border border-cyan-300 animate-pulse";
      if (btnFloatingPickMap) btnFloatingPickMap.classList.add('ring-2', 'ring-cyan-300', 'animate-pulse');
      if (mapEl) mapEl.classList.add('picking-mode');

      if (instructionBanner && instructionText) {
        instructionText.textContent = "📍 Step 1 of 2: Click anywhere on the map to set Origin (Point A)...";
        instructionBanner.classList.remove('hidden');
      }

      this.logger.info("[OSM Routing]: Map Picking Mode ACTIVE. Click anywhere on the map to set Origin (Point A)...");
    };

    const deactivatePickingMode = () => {
      this.mapClickRoutingActive = false;
      this.tempMapClickPoints = [];
      if (this.tempMarkerA) {
        this.map.removeLayer(this.tempMarkerA);
        this.tempMarkerA = null;
      }

      if (labelMapClickMode) labelMapClickMode.textContent = "📍 Pick on Map";
      if (btnMapClickMode) btnMapClickMode.className = "px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md border border-cyan-300/40 flex items-center gap-1.5 transition";
      if (btnFloatingPickMap) btnFloatingPickMap.classList.remove('ring-2', 'ring-cyan-300', 'animate-pulse');
      if (mapEl) mapEl.classList.remove('picking-mode');

      if (instructionBanner) instructionBanner.classList.add('hidden');
    };

    if (btnMapClickMode) {
      btnMapClickMode.addEventListener('click', () => {
        if (this.mapClickRoutingActive) {
          deactivatePickingMode();
        } else {
          activatePickingMode();
        }
      });
    }

    if (btnFloatingPickMap) {
      btnFloatingPickMap.addEventListener('click', () => {
        if (this.mapClickRoutingActive) {
          deactivatePickingMode();
        } else {
          activatePickingMode();
        }
      });
    }

    if (btnCancelPicking) {
      btnCancelPicking.addEventListener('click', () => {
        deactivatePickingMode();
        this.logger.info("[OSM Routing]: Map Picking Mode cancelled.");
      });
    }

    this.map.on('click', (e) => {
      if (!this.mapClickRoutingActive) return;

      const latLng = e.latlng;
      this.tempMapClickPoints.push(latLng);

      if (this.tempMapClickPoints.length === 1) {
        // Point A Selected
        const iconA = L.divIcon({
          className: 'temp-marker-a',
          html: '<div class="w-7 h-7 rounded-full bg-emerald-500 text-white font-bold text-xs flex items-center justify-center border-2 border-white shadow-xl pulse-green">A</div>',
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });
        this.tempMarkerA = L.marker([latLng.lat, latLng.lng], { icon: iconA }).addTo(this.map);

        if (labelMapClickMode) labelMapClickMode.textContent = "Click Point B...";
        if (instructionText) instructionText.textContent = `📍 Point A set! Step 2 of 2: Click anywhere on the map to set Destination (Point B)...`;
        this.logger.info(`[OSM Routing]: Point A placed at [${latLng.lat.toFixed(4)}, ${latLng.lng.toFixed(4)}]. Now click Destination (Point B)...`);
      } else if (this.tempMapClickPoints.length === 2) {
        // Point B Selected
        const ptA = this.tempMapClickPoints[0];
        const ptB = this.tempMapClickPoints[1];

        deactivatePickingMode();

        // Calculate Route
        this.routingService.calculateRoute(
          { lat: ptA.lat, lng: ptA.lng },
          { lat: ptB.lat, lng: ptB.lng },
          `Map Point A (${ptA.lat.toFixed(2)}, ${ptA.lng.toFixed(2)})`,
          `Map Point B (${ptB.lat.toFixed(2)}, ${ptB.lng.toFixed(2)})`
        );

        // Make sure sidebar is visible to see results
        const sidebar = document.getElementById('control-sidebar');
        if (sidebar && sidebar.classList.contains('hidden')) {
          sidebar.classList.remove('hidden');
          this.map.invalidateSize();
        }
      }
    });

    // 8. Diagnostic Log Bar Controls
    const btnClearLogs = document.getElementById('btn-clear-logs');
    if (btnClearLogs) {
      btnClearLogs.addEventListener('click', () => {
        this.logger.clear();
      });
    }

    const btnToggleLogs = document.getElementById('btn-toggle-logs');
    const logDrawer = document.getElementById('diagnostic-drawer');
    if (btnToggleLogs && logDrawer) {
      btnToggleLogs.addEventListener('click', () => {
        logDrawer.classList.toggle('hidden');
      });
    }

    // 9. Sidebar Toggle
    const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
    const sidebar = document.getElementById('control-sidebar');
    if (btnToggleSidebar && sidebar) {
      btnToggleSidebar.addEventListener('click', () => {
        sidebar.classList.toggle('hidden');
        setTimeout(() => {
          this.map.invalidateSize();
        }, 200);
      });
    }
  }

  updateHeaderStats() {
    const elChokeCount = document.getElementById('stat-choke-points');
    const elHazardCount = document.getElementById('stat-hazard-zones');
    const elRedAlertCount = document.getElementById('stat-red-alerts');

    if (elChokeCount) elChokeCount.textContent = window.NER_CHOKE_POINTS.length;
    if (elHazardCount) elHazardCount.textContent = window.LANDSLIDE_HAZARD_GEOJSON.features.length;
    if (elRedAlertCount) {
      let redCount = 0;
      window.NER_DISTRICTS_GEOJSON.features.forEach(f => {
        if (f.properties.default_alert === 'Red') redCount++;
      });
      elRedAlertCount.textContent = redCount;
    }
  }
}

// Bootstrap application on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new NerGisApp();
  window.app.init();
});
