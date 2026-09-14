/**
 * Service for Milestone 2: ISRO Bhuvan Landslide Hazard Zonation (LHZ)
 * Manages OGC WMS integration and graceful offline GeoJSON fallback
 */
class BhuvanService {
  constructor(map, logger) {
    this.map = map;
    this.logger = logger;
    this.isWmsMode = true; // Default attempts primary pipeline
    this.wmsLayer = null;
    this.geoJsonLayer = null;
    this.isVisible = true;
    this.opacity = 0.65;
    this.fallbackTriggered = false;

    this.initLayers();
  }

  initLayers() {
    // 1. Primary WMS Layer (OGC WMS)
    try {
      this.wmsLayer = L.tileLayer.wms(CONFIG.landslide.bhuvanWmsUrl, {
        layers: CONFIG.landslide.wmsLayers,
        format: CONFIG.landslide.wmsParams.format,
        transparent: CONFIG.landslide.wmsParams.transparent,
        version: CONFIG.landslide.wmsParams.version,
        opacity: this.opacity,
        attribution: 'ISRO &copy; NRSC Bhuvan Disaster Management Support',
        zIndex: 400
      });

      // Hook tile error event for automatic fallback
      this.wmsLayer.on('tileerror', (error) => {
        if (!this.fallbackTriggered) {
          this.fallbackTriggered = true;
          this.logger.warn(`[ISRO Bhuvan]: WMS endpoint restricted/CORS blocked. Automatically switching to Offline Hazard GeoJSON engine.`);
          this.switchToGeoJSON(true);
        }
      });
    } catch (err) {
      this.logger.error(`[ISRO Bhuvan]: Failed to construct WMS layer: ${err.message}`);
    }

    // 2. Offline Mock GeoJSON Layer
    this.geoJsonLayer = L.geoJSON(window.LANDSLIDE_HAZARD_GEOJSON, {
      style: (feature) => this.getPolygonStyle(feature),
      onEachFeature: (feature, layer) => this.bindFeatureInteractions(feature, layer)
    });
  }

  getPolygonStyle(feature) {
    const severity = feature.properties.severity || "Moderate";
    const config = CONFIG.landslide.severityColors[severity] || CONFIG.landslide.severityColors["Moderate"];

    return {
      fillColor: config.fill,
      weight: 2,
      opacity: 0.9,
      color: config.stroke,
      fillOpacity: this.opacity,
      dashArray: severity === "Very High" ? "4, 4" : null
    };
  }

  bindFeatureInteractions(feature, layer) {
    const p = feature.properties;
    const config = CONFIG.landslide.severityColors[p.severity] || CONFIG.landslide.severityColors["Moderate"];

    // Hover Highlight
    layer.on({
      mouseover: (e) => {
        const l = e.target;
        l.setStyle({
          weight: 3.5,
          color: '#ffffff',
          fillOpacity: Math.min(this.opacity + 0.25, 0.95)
        });
        l.bringToFront();
      },
      mouseout: (e) => {
        this.geoJsonLayer.resetStyle(e.target);
      }
    });

    // Rich Popup
    const popupContent = `
      <div class="p-1 max-w-sm">
        <div class="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-700">
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full ${p.severity === 'Very High' ? 'bg-red-500 pulse-red' : p.severity === 'High' ? 'bg-orange-500' : 'bg-yellow-500'}"></span>
            <span class="text-xs font-mono text-slate-400 uppercase tracking-wider">${p.bhuvan_code}</span>
          </div>
          <span class="text-[11px] font-bold px-2 py-0.5 rounded-full border ${config.badgeBg}">
            ${p.severity} Risk
          </span>
        </div>

        <h4 class="font-bold text-sm text-white mb-1 leading-snug">${p.name}</h4>
        <p class="text-xs text-cyan-400 font-medium mb-2 flex items-center gap-1">
          <svg class="w-3.5 h-3.5 inline text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
          ${p.corridor} (${p.state})
        </p>

        <div class="grid grid-cols-2 gap-2 text-[11px] bg-slate-800/80 p-2 rounded-lg border border-slate-700/60 mb-2">
          <div>
            <span class="text-slate-400 block">Slope Angle:</span>
            <span class="font-semibold text-slate-200">${p.slope_gradient}</span>
          </div>
          <div>
            <span class="text-slate-400 block">Hazard Score:</span>
            <span class="font-semibold text-rose-400">${p.hazard_score} / 10.0</span>
          </div>
        </div>

        <div class="text-[11px] text-slate-300 mb-2 space-y-1">
          <p><strong class="text-slate-400">Trigger:</strong> ${p.trigger_mechanism}</p>
          <p><strong class="text-slate-400">Lithology:</strong> ${p.lithology}</p>
        </div>

        <div class="text-[11px] bg-red-950/40 text-red-200 border border-red-800/50 p-2 rounded-md">
          <span class="font-semibold text-red-300 block mb-0.5">⚠️ Corridor Advisory:</span>
          ${p.advisory}
        </div>
      </div>
    `;

    layer.bindPopup(popupContent, {
      maxWidth: 320,
      className: 'lhz-popup'
    });

    // Quick Tooltip
    layer.bindTooltip(`${p.name} (${p.severity})`, {
      sticky: true,
      direction: 'top'
    });
  }

  addToMap() {
    this.isVisible = true;
    if (this.isWmsMode) {
      this.logger.info(`[ISRO Bhuvan]: Connecting to OGC WMS layer (${CONFIG.landslide.bhuvanWmsUrl})...`);
      this.wmsLayer.addTo(this.map);
    } else {
      this.geoJsonLayer.addTo(this.map);
    }
  }

  removeFromMap() {
    this.isVisible = false;
    if (this.map.hasLayer(this.wmsLayer)) {
      this.map.removeLayer(this.wmsLayer);
    }
    if (this.map.hasLayer(this.geoJsonLayer)) {
      this.map.removeLayer(this.geoJsonLayer);
    }
  }

  switchToWMS() {
    this.isWmsMode = true;
    if (this.map.hasLayer(this.geoJsonLayer)) {
      this.map.removeLayer(this.geoJsonLayer);
    }
    if (this.isVisible && !this.map.hasLayer(this.wmsLayer)) {
      this.wmsLayer.addTo(this.map);
    }
    this.logger.info(`[ISRO Bhuvan]: Switched to Live OGC WMS Pipeline`);
  }

  switchToGeoJSON(auto = false) {
    this.isWmsMode = false;
    if (this.map.hasLayer(this.wmsLayer)) {
      this.map.removeLayer(this.wmsLayer);
    }
    if (this.isVisible && !this.map.hasLayer(this.geoJsonLayer)) {
      this.geoJsonLayer.addTo(this.map);
    }
    if (!auto) {
      this.logger.info(`[ISRO Bhuvan]: Switched to Offline Hazard GeoJSON dataset (12 high-risk NER corridors)`);
    }
  }

  setOpacity(val) {
    this.opacity = parseFloat(val);
    if (this.wmsLayer) {
      this.wmsLayer.setOpacity(this.opacity);
    }
    if (this.geoJsonLayer) {
      this.geoJsonLayer.setStyle({
        fillOpacity: this.opacity
      });
    }
  }
}

// Export to window
window.BhuvanService = BhuvanService;
