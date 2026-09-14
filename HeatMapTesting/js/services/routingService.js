/**
 * Service for API-Key-Less Shortest Distance & Smart Disaster Routing
 * Powered by OpenStreetMap (OSM) & OSRM (Open Source Routing Machine)
 * Features real-time road pathfinding, distance/duration calculation,
 * and automated hazard collision analysis with ISRO Landslide & IMD Alert zones.
 */

class RoutingService {
  constructor(map, logger) {
    this.map = map;
    this.logger = logger;
    this.chokePoints = window.NER_CHOKE_POINTS || [];
    this.osrmApiUrl = "https://router.project-osrm.org/route/v1/driving";

    // Map layer group for route polyline and waypoint markers
    this.routeLayerGroup = L.layerGroup().addTo(this.map);
    this.currentRouteGeoJSON = null;
    this.isClickMode = false;
    this.clickedWaypoints = [];

    this.originPoint = null;
    this.destPoint = null;
  }

  /**
   * Calculate shortest road path between two coordinates [lat, lng]
   */
  async calculateRoute(origin, dest, originLabel = "Origin", destLabel = "Destination") {
    this.originPoint = origin;
    this.destPoint = dest;

    // OSRM expects coordinates in "lng,lat" order
    const coordStr = `${origin.lng.toFixed(6)},${origin.lat.toFixed(6)};${dest.lng.toFixed(6)},${dest.lat.toFixed(6)}`;
    const url = `${this.osrmApiUrl}/${coordStr}?overview=full&geometries=geojson&steps=true`;

    this.logger.info(`[OSM Routing]: Calculating shortest road distance between ${originLabel} and ${destLabel}...`);
    this.updateRouteUIState("loading");

    try {
      const startTime = performance.now();
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const fetchTimeMs = Math.round(performance.now() - startTime);

      if (!data.routes || data.routes.length === 0) {
        throw new Error("No navigable road route found between selected points.");
      }

      const route = data.routes[0];
      const distanceKm = (route.distance / 1000).toFixed(1);
      const durationMin = Math.round(route.duration / 60);
      const hours = Math.floor(durationMin / 60);
      const mins = durationMin % 60;
      const durationFormatted = hours > 0 ? `${hours}h ${mins}m` : `${mins} mins`;

      this.logger.success(`[OSM Routing]: Route resolved in ${fetchTimeMs}ms &bull; Distance: ${distanceKm} km &bull; ETA: ${durationFormatted} (${route.geometry.coordinates.length} waypoints)`);

      // Render route onto Leaflet map
      this.renderRouteOnMap(route, origin, dest, originLabel, destLabel);

      // Perform Hazard & Disaster Collision Analysis
      const hazardAnalysis = this.analyzeRouteHazards(route.geometry.coordinates);

      // Update UI with calculated metrics and hazard warnings
      this.updateRouteUIData({
        distanceKm,
        durationFormatted,
        originLabel,
        destLabel,
        waypointCount: route.geometry.coordinates.length,
        hazardAnalysis
      });

    } catch (err) {
      this.logger.error(`[OSM Routing]: Routing failed: ${err.message}`);
      this.updateRouteUIState("error", err.message);
    }
  }

  /**
   * Render glowing route polyline and waypoint markers on Leaflet
   */
  renderRouteOnMap(route, origin, dest, originLabel, destLabel) {
    this.routeLayerGroup.clearLayers();

    // Invert [lng, lat] from GeoJSON to [lat, lng] for Leaflet
    const latLngs = route.geometry.coordinates.map(c => [c[1], c[0]]);

    // 1. Glowing outer shadow polyline
    const glowLine = L.polyline(latLngs, {
      color: '#06b6d4',
      weight: 8,
      opacity: 0.35,
      lineCap: 'round',
      lineJoin: 'round'
    });

    // 2. Core bright cyan route line
    const coreLine = L.polyline(latLngs, {
      color: '#38bdf8',
      weight: 4.5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round',
      dashArray: null
    });

    // Tooltip on route hover
    coreLine.bindTooltip(`Shortest Route: ${(route.distance / 1000).toFixed(1)} km (~${Math.round(route.duration / 60)} mins)`, {
      sticky: true,
      direction: 'top'
    });

    this.routeLayerGroup.addLayer(glowLine);
    this.routeLayerGroup.addLayer(coreLine);

    // 3. Custom Start Marker (Origin - Green)
    const originIcon = L.divIcon({
      className: 'route-marker-origin',
      html: `
        <div class="w-8 h-8 rounded-full bg-emerald-500 text-white font-bold text-xs flex items-center justify-center border-2 border-white shadow-lg pulse-green">
          A
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const originMarker = L.marker([origin.lat, origin.lng], { icon: originIcon });
    originMarker.bindPopup(`<strong>Origin:</strong> ${originLabel}<br><span class="text-xs text-slate-400">Lat: ${origin.lat.toFixed(4)}, Lng: ${origin.lng.toFixed(4)}</span>`);
    this.routeLayerGroup.addLayer(originMarker);

    // 4. Custom Destination Marker (Terminus - Rose/Purple)
    const destIcon = L.divIcon({
      className: 'route-marker-dest',
      html: `
        <div class="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center border-2 border-white shadow-lg">
          B
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const destMarker = L.marker([dest.lat, dest.lng], { icon: destIcon });
    destMarker.bindPopup(`<strong>Destination:</strong> ${destLabel}<br><span class="text-xs text-slate-400">Lat: ${dest.lat.toFixed(4)}, Lng: ${dest.lng.toFixed(4)}</span>`);
    this.routeLayerGroup.addLayer(destMarker);

    // Smoothly pan & zoom to contain the full route
    this.map.flyToBounds(coreLine.getBounds(), {
      padding: [60, 60],
      duration: 1.2
    });
  }

  /**
   * Spatial hazard intersection: checks if route coordinates traverse
   * any ISRO Landslide Hazard Zones or IMD Red/Orange alert districts.
   */
  analyzeRouteHazards(coordinates) {
    const intersectedHazards = new Set();
    const intersectedAlerts = new Set();

    // Sample coordinates every 8 points for high performance
    const samplePoints = coordinates.filter((_, idx) => idx % 8 === 0 || idx === coordinates.length - 1);

    const lhzFeatures = window.LANDSLIDE_HAZARD_GEOJSON ? window.LANDSLIDE_HAZARD_GEOJSON.features : [];
    const districtFeatures = window.NER_DISTRICTS_GEOJSON ? window.NER_DISTRICTS_GEOJSON.features : [];

    samplePoints.forEach(pt => {
      const [lng, lat] = pt;

      // Check LHZ Polygons
      lhzFeatures.forEach(hazard => {
        const coords = hazard.geometry.coordinates[0];
        if (this.pointInPolygon([lng, lat], coords)) {
          intersectedHazards.add(hazard.properties);
        }
      });

      // Check IMD District Boundaries with Red or Orange warnings
      districtFeatures.forEach(dist => {
        const alertLevel = dist.properties.default_alert;
        if (alertLevel === 'Red' || alertLevel === 'Orange') {
          const coords = dist.geometry.coordinates[0];
          if (this.pointInPolygon([lng, lat], coords)) {
            intersectedAlerts.add(dist.properties);
          }
        }
      });
    });

    const hazardList = Array.from(intersectedHazards);
    const alertList = Array.from(intersectedAlerts);

    if (hazardList.length > 0 || alertList.length > 0) {
      this.logger.warn(`[OSM Hazard Audit]: Route intersects ${hazardList.length} Landslide Corridors and ${alertList.length} High IMD Alert Districts!`);
    } else {
      this.logger.success(`[OSM Hazard Audit]: Route verified clear of active high-risk disaster corridors.`);
    }

    return {
      hazards: hazardList,
      alerts: alertList
    };
  }

  /**
   * Ray-casting algorithm for point-in-polygon test
   */
  pointInPolygon(point, vs) {
    const x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const xi = vs[i][0], yi = vs[i][1];
      const xj = vs[j][0], yj = vs[j][1];

      const intersect = ((yi > y) !== (yj > y))
          && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  clearRoute() {
    this.routeLayerGroup.clearLayers();
    this.clickedWaypoints = [];
    const resultsCard = document.getElementById('routing-results-panel');
    if (resultsCard) resultsCard.classList.add('hidden');
    this.logger.info("[OSM Routing]: Active route cleared.");
  }

  updateRouteUIState(state, message = "") {
    const resultsCard = document.getElementById('routing-results-panel');
    const loadingEl = document.getElementById('routing-loading');
    const contentEl = document.getElementById('routing-content');

    if (!resultsCard) return;
    resultsCard.classList.remove('hidden');

    if (state === "loading") {
      if (loadingEl) loadingEl.classList.remove('hidden');
      if (contentEl) contentEl.classList.add('hidden');
    } else if (state === "error") {
      if (loadingEl) loadingEl.classList.add('hidden');
      if (contentEl) {
        contentEl.classList.remove('hidden');
        contentEl.innerHTML = `<div class="p-2 text-rose-400 bg-rose-950/40 rounded border border-rose-800 text-xs">${message}</div>`;
      }
    }
  }

  updateRouteUIData(data) {
    const loadingEl = document.getElementById('routing-loading');
    const contentEl = document.getElementById('routing-content');
    if (loadingEl) loadingEl.classList.add('hidden');
    if (!contentEl) return;

    contentEl.classList.remove('hidden');

    let hazardsHtml = "";
    if (data.hazardAnalysis.hazards.length > 0) {
      hazardsHtml += `
        <div class="mt-2 p-2 rounded bg-red-950/50 border border-red-800/60 text-[11px] space-y-1">
          <div class="font-bold text-red-300 flex items-center gap-1">
            <span>⚠️</span> Landslide Hazard Corridor Intersected:
          </div>
          ${data.hazardAnalysis.hazards.map(h => `
            <div class="text-slate-200 flex justify-between">
              <span>&bull; ${h.name}</span>
              <span class="font-bold text-red-400">${h.severity}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (data.hazardAnalysis.alerts.length > 0) {
      hazardsHtml += `
        <div class="mt-1.5 p-2 rounded bg-amber-950/50 border border-amber-800/60 text-[11px] space-y-1">
          <div class="font-bold text-amber-300 flex items-center gap-1">
            <span>⛈️</span> High IMD Weather Warning Districts:
          </div>
          ${data.hazardAnalysis.alerts.map(a => `
            <div class="text-slate-200 flex justify-between">
              <span>&bull; ${a.district_name} (${a.state_name})</span>
              <span class="font-bold ${a.default_alert === 'Red' ? 'text-red-400' : 'text-orange-400'}">${a.default_alert} Alert</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (data.hazardAnalysis.hazards.length === 0 && data.hazardAnalysis.alerts.length === 0) {
      hazardsHtml = `
        <div class="mt-2 p-2 rounded bg-emerald-950/50 border border-emerald-800/60 text-[11px] text-emerald-300 flex items-center gap-1.5">
          <span>✅</span> Route verified safe &mdash; no active Red Alert or high landslide collisions detected.
        </div>
      `;
    }

    contentEl.innerHTML = `
      <div class="space-y-2">
        <!-- Key Metrics -->
        <div class="grid grid-cols-2 gap-2 bg-slate-800/90 p-2.5 rounded-lg border border-slate-700/80">
          <div>
            <span class="text-[10px] text-slate-400 block uppercase font-semibold">Road Distance</span>
            <span class="text-base font-bold text-cyan-400 font-mono">${data.distanceKm} <span class="text-xs font-normal">km</span></span>
          </div>
          <div>
            <span class="text-[10px] text-slate-400 block uppercase font-semibold">Estimated Time</span>
            <span class="text-base font-bold text-emerald-400 font-mono">${data.durationFormatted}</span>
          </div>
        </div>

        <div class="text-[11px] text-slate-300 flex items-center justify-between px-1">
          <span class="text-slate-400">Corridor Path:</span>
          <span class="font-semibold text-white truncate max-w-[190px]" title="${data.originLabel} ➔ ${data.destLabel}">
            ${data.originLabel.split(' ')[0]} ➔ ${data.destLabel.split(' ')[0]}
          </span>
        </div>

        ${hazardsHtml}
      </div>
    `;
  }
}

// Export to window
window.RoutingService = RoutingService;
