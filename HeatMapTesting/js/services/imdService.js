/**
 * Service for Milestone 3: IMD District-Level Weather Alert Overlay
 * Renders dynamic choropleth map across all 8 NER states with editable API pipeline
 */

// Editable API URL Endpoint constant for live IMD integration
const IMD_API_ENDPOINT = CONFIG.imd.apiEndpoint;

class ImdService {
  constructor(map, logger) {
    this.map = map;
    this.logger = logger;
    this.layerGroup = L.layerGroup();
    this.geoJsonLayer = null;
    this.activeFilter = "ALL"; // ALL | Red | Orange | Yellow | Green
    this.opacity = 0.55;
    this.isVisible = true;

    // Cache of current district alert data
    this.districtAlertsMap = new Map();

    this.init();
  }

  async init() {
    this.logger.info(`[IMD Alerts]: Initializing IMD District Disaster Warning Engine...`);
    // Seed default mock state
    this.seedInternalMockState();
    // Render boundaries
    this.renderChoropleth();
  }

  /**
   * Pluggable fetchIMDAlerts function with editable endpoint constant
   * Can be configured to hit live IMD API when credentials or proxy are supplied
   */
  async fetchIMDAlerts(customEndpoint = IMD_API_ENDPOINT) {
    this.logger.info(`[IMD Alerts]: Requesting live alerts from endpoint: ${customEndpoint}...`);
    try {
      const response = await fetch(customEndpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.logger.success(`[IMD Alerts]: Successfully fetched ${data.length || Object.keys(data).length} district bulletins.`);
      this.applyLiveAlertData(data);
      return data;
    } catch (err) {
      this.logger.warn(`[IMD Alerts]: Live endpoint unreachable (${err.message}). Maintaining robust internal mock bulletin database.`);
      // Re-seed mock state safely
      this.seedInternalMockState();
      return null;
    }
  }

  seedInternalMockState() {
    window.NER_DISTRICTS_GEOJSON.features.forEach(feat => {
      const p = feat.properties;
      this.districtAlertsMap.set(p.district_id, {
        alert: p.default_alert,
        warning_title: p.warning_title,
        rainfall_forecast_24h: p.rainfall_forecast_24h,
        weather_summary: p.weather_summary,
        emergency_contact: p.emergency_contact,
        issued_at: p.issued_at,
        valid_until: p.valid_until
      });
    });

    // Count alerts
    const stats = { Red: 0, Orange: 0, Yellow: 0, Green: 0 };
    this.districtAlertsMap.forEach(v => {
      if (stats[v.alert] !== undefined) stats[v.alert]++;
    });

    this.logger.success(`[IMD Alerts]: Loaded 28 NER districts (🔴 Red: ${stats.Red}, 🟠 Orange: ${stats.Orange}, 🟡 Yellow: ${stats.Yellow}, 🟢 Green: ${stats.Green})`);
  }

  renderChoropleth() {
    if (this.geoJsonLayer && this.layerGroup.hasLayer(this.geoJsonLayer)) {
      this.layerGroup.removeLayer(this.geoJsonLayer);
    }

    this.geoJsonLayer = L.geoJSON(window.NER_DISTRICTS_GEOJSON, {
      filter: (feature) => {
        if (this.activeFilter === "ALL") return true;
        const alertData = this.districtAlertsMap.get(feature.properties.district_id);
        const currentAlert = alertData ? alertData.alert : feature.properties.default_alert;
        return currentAlert === this.activeFilter;
      },
      style: (feature) => this.getFeatureStyle(feature),
      onEachFeature: (feature, layer) => this.bindFeatureInteractions(feature, layer)
    });

    this.layerGroup.addLayer(this.geoJsonLayer);
  }

  getFeatureStyle(feature) {
    const p = feature.properties;
    const alertData = this.districtAlertsMap.get(p.district_id);
    const alertLevel = alertData ? alertData.alert : p.default_alert;
    const config = CONFIG.imd.alertLevels[alertLevel] || CONFIG.imd.alertLevels["Green"];

    return {
      fillColor: config.color,
      weight: 1.5,
      opacity: 0.85,
      color: config.borderColor,
      fillOpacity: this.opacity,
      dashArray: alertLevel === "Red" ? "5, 3" : null
    };
  }

  bindFeatureInteractions(feature, layer) {
    const p = feature.properties;
    const alertData = this.districtAlertsMap.get(p.district_id) || {};
    const alertLevel = alertData.alert || p.default_alert;
    const config = CONFIG.imd.alertLevels[alertLevel] || CONFIG.imd.alertLevels["Green"];

    // Mouse interactions
    layer.on({
      mouseover: (e) => {
        const l = e.target;
        l.setStyle({
          weight: 3,
          color: '#ffffff',
          fillOpacity: Math.min(this.opacity + 0.3, 0.95)
        });
        l.bringToFront();
      },
      mouseout: (e) => {
        this.geoJsonLayer.resetStyle(e.target);
      }
    });

    // Rich IMD Bulletin Popup
    const popupContent = `
      <div class="p-1 max-w-sm">
        <div class="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-700">
          <div>
            <span class="text-[10px] uppercase font-mono tracking-wider text-slate-400">IMD Bulletin</span>
            <h4 class="font-bold text-sm text-white">${p.district_name}</h4>
          </div>
          <span class="text-[11px] font-bold px-2 py-0.5 rounded-full border ${config.bgBadge}">
            ${config.shortName}
          </span>
        </div>

        <p class="text-xs text-slate-300 mb-1 flex items-center gap-1">
          <span class="text-slate-400">State:</span>
          <strong class="text-cyan-400">${p.state_name}</strong> &bull; HQ: ${p.headquarters}
        </p>

        <div class="p-2 bg-slate-800/80 rounded-lg border border-slate-700/60 mb-2">
          <div class="text-xs font-semibold text-rose-300 mb-0.5">${alertData.warning_title || p.warning_title}</div>
          <div class="text-[11px] text-slate-300 mt-1">${alertData.weather_summary || p.weather_summary}</div>
        </div>

        <div class="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/60 p-2 rounded-md mb-2">
          <div>
            <span class="text-slate-400 block">24h Rainfall Est:</span>
            <span class="font-semibold text-cyan-300">${alertData.rainfall_forecast_24h || p.rainfall_forecast_24h}</span>
          </div>
          <div>
            <span class="text-slate-400 block">Valid Until:</span>
            <span class="font-semibold text-slate-300">${alertData.valid_until || p.valid_until}</span>
          </div>
        </div>

        <div class="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
          <span>📞 ${alertData.emergency_contact || p.emergency_contact}</span>
          <span class="text-emerald-400 font-mono">Issued: ${alertData.issued_at || p.issued_at}</span>
        </div>
      </div>
    `;

    layer.bindPopup(popupContent, {
      maxWidth: 320,
      className: 'imd-popup'
    });

    // Tooltip
    layer.bindTooltip(`${p.district_name} (${p.state_name}): ${alertLevel} Alert`, {
      sticky: true,
      direction: 'top'
    });
  }

  addToMap() {
    this.isVisible = true;
    this.layerGroup.addTo(this.map);
  }

  removeFromMap() {
    this.isVisible = false;
    this.map.removeLayer(this.layerGroup);
  }

  setFilter(filter) {
    this.activeFilter = filter;
    this.renderChoropleth();
    this.logger.info(`[IMD Alerts]: Filtered districts by alert level: ${filter}`);
  }

  setOpacity(val) {
    this.opacity = parseFloat(val);
    if (this.geoJsonLayer) {
      this.geoJsonLayer.setStyle({
        fillOpacity: this.opacity
      });
    }
  }

  // Helper to switch alerts for testing/simulation
  simulateScenario(scenarioName) {
    if (scenarioName === "monsoon_surge") {
      this.districtAlertsMap.forEach((v, k) => {
        if (v.alert === "Yellow") v.alert = "Orange";
        else if (v.alert === "Orange") v.alert = "Red";
      });
      this.logger.warn(`[IMD Alerts]: Simulated Scenario: Severe Monsoon Surge (Upgraded alert tiers across NER)`);
    } else if (scenarioName === "calm") {
      this.districtAlertsMap.forEach((v, k) => {
        v.alert = "Green";
      });
      this.logger.info(`[IMD Alerts]: Simulated Scenario: Post-monsoon All-Clear`);
    } else {
      this.seedInternalMockState();
    }
    this.renderChoropleth();
  }
}

// Export to window
window.ImdService = ImdService;
window.IMD_API_ENDPOINT = IMD_API_ENDPOINT;
