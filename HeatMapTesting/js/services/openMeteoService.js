/**
 * Service for Milestone 4: Live Rainfall Heatmap (Open-Meteo Integration)
 * Fetches real-time precipitation metrics via Open-Meteo Free API and renders
 * dynamic gradient heat clouds using leaflet-heat and interactive station pins.
 */
class OpenMeteoService {
  constructor(map, logger) {
    this.map = map;
    this.logger = logger;
    this.chokePoints = window.NER_CHOKE_POINTS || [];
    this.heatLayer = null;
    this.stationMarkersLayer = L.layerGroup();
    this.isHeatmapVisible = true;
    this.isStationsVisible = true;
    this.isSimulated = false;
    this.lastUpdated = null;
    this.isFetching = false;

    // Heatmap visual parameters
    this.radius = CONFIG.openMeteo.defaultRadius;
    this.blur = CONFIG.openMeteo.defaultBlur;

    // Cache of latest station readings
    this.telemetryData = [];

    this.init();
  }

  init() {
    this.logger.info(`[Open-Meteo]: Initializing Live Rainfall Pipeline with ${this.chokePoints.length} NER highway choke points...`);
    // Initial fetch
    this.fetchLiveRainfall();
  }

  /**
   * Batch fetch from Open-Meteo Free API for all 29 coordinates
   */
  async fetchLiveRainfall() {
    if (this.isFetching) return;
    this.isFetching = true;
    this.updateSpinnerUI(true);

    const lats = this.chokePoints.map(p => p.lat.toFixed(4)).join(',');
    const lngs = this.chokePoints.map(p => p.lng.toFixed(4)).join(',');

    const url = `${CONFIG.openMeteo.apiUrl}?latitude=${lats}&longitude=${lngs}&current=precipitation,rain,temperature_2m,weather_code&timezone=Asia%2FKolkata`;

    this.logger.info(`[Open-Meteo]: Dispatching batch HTTP request for ${this.chokePoints.length} points across 8 states...`);

    try {
      const startTime = performance.now();
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const fetchTimeMs = Math.round(performance.now() - startTime);

      // Open-Meteo returns an array of objects when multiple coordinates are passed
      const results = Array.isArray(data) ? data : [data];

      this.logger.success(`[Open-Meteo]: HTTP 200 OK (${fetchTimeMs}ms) - Retrieved precipitation telemetry for ${results.length} stations`);

      // Merge results with choke point metadata
      this.telemetryData = this.chokePoints.map((point, index) => {
        const item = results[index] || {};
        const current = item.current || {};
        const precip = current.precipitation !== undefined ? current.precipitation : 0.0;
        const temp = current.temperature_2m !== undefined ? current.temperature_2m : null;
        const rain = current.rain !== undefined ? current.rain : 0.0;

        return {
          ...point,
          precipitation_mm: precip,
          rain_mm: rain,
          temperature_c: temp,
          weather_code: current.weather_code,
          timestamp: current.time || new Date().toISOString()
        };
      });

      this.isSimulated = false;
      this.lastUpdated = new Date();
      this.renderHeatmap();
      this.renderStationPins();
      this.updateStatusBadge();

      // Check if all are zero mm (dry weather) and notify
      const maxPrecip = Math.max(...this.telemetryData.map(d => d.precipitation_mm));
      if (maxPrecip === 0) {
        this.logger.info(`[Open-Meteo]: Real-time conditions are currently clear/dry (0.0 mm across stations). Tip: Click 'Simulate Monsoon Downpour' to preview intense heat clouds!`);
      } else {
        this.logger.info(`[Open-Meteo]: Active precipitation detected! Max intensity: ${maxPrecip.toFixed(1)} mm.`);
      }

    } catch (err) {
      this.logger.warn(`[Open-Meteo]: Live fetch encountered issue: ${err.message}. Generating realistic monsoon fallback telemetry.`);
      this.simulateMonsoonDownpour(true);
    } finally {
      this.isFetching = false;
      this.updateSpinnerUI(false);
    }
  }

  /**
   * Generates authentic high-intensity monsoon rainfall patterns for demonstration
   */
  simulateMonsoonDownpour(isFallback = false) {
    this.isSimulated = true;
    this.lastUpdated = new Date();

    // Generate realistic orographic precipitation for North East India
    this.telemetryData = this.chokePoints.map(point => {
      let simulatedPrecip = 0.0;

      // Cherrapunji / Mawsynram / Sohra Ridge: Extremely high
      if (point.id.includes("ML-03") || point.id.includes("ML-02")) {
        simulatedPrecip = 28.4 + Math.random() * 8.0; // 28 - 36 mm
      } 
      // Dima Hasao / Haflong / Jatinga: Very High
      else if (point.id.includes("AS-06")) {
        simulatedPrecip = 22.0 + Math.random() * 6.0; // 22 - 28 mm
      }
      // North Sikkim / Mangan / Chungthang: Very High
      else if (point.id.includes("SK-02")) {
        simulatedPrecip = 19.5 + Math.random() * 5.0; // 19 - 24 mm
      }
      // Kohima / Zubza Sinking corridor: High
      else if (point.id.includes("NL-02")) {
        simulatedPrecip = 16.2 + Math.random() * 4.0; // 16 - 20 mm
      }
      // Arunachal / Sela / Bomdila / Itanagar: Moderate to High
      else if (point.state === "Arunachal Pradesh") {
        simulatedPrecip = 11.0 + Math.random() * 6.0; // 11 - 17 mm
      }
      // Barak Valley / Silchar: High
      else if (point.id.includes("AS-02")) {
        simulatedPrecip = 14.5 + Math.random() * 4.0; // 14 - 18 mm
      }
      // Guwahati / Plains: Moderate
      else if (point.id.includes("AS-01") || point.id.includes("AS-05")) {
        simulatedPrecip = 6.5 + Math.random() * 4.0; // 6 - 10 mm
      }
      // Mizoram / Tripura / Nagaland others:
      else {
        simulatedPrecip = 3.0 + Math.random() * 8.0; // 3 - 11 mm
      }

      return {
        ...point,
        precipitation_mm: parseFloat(simulatedPrecip.toFixed(1)),
        rain_mm: parseFloat(simulatedPrecip.toFixed(1)),
        temperature_c: Math.round(22 + Math.random() * 6),
        weather_code: simulatedPrecip > 15 ? 65 : 61,
        timestamp: new Date().toISOString()
      };
    });

    this.renderHeatmap();
    this.renderStationPins();
    this.updateStatusBadge();

    if (isFallback) {
      this.logger.info(`[Open-Meteo]: Fallback monsoon telemetry active.`);
    } else {
      this.logger.warn(`[Open-Meteo]: Simulated Heavy Monsoon Cloudburst scenario activated across NER!`);
    }
  }

  /**
   * Render leaflet-heat gradient heat overlay
   */
  renderHeatmap() {
    if (!window.L || !L.heatLayer) {
      this.logger.error(`[Open-Meteo]: leaflet-heat library not loaded!`);
      return;
    }

    // Prepare [lat, lng, intensity] data points
    const heatPoints = this.telemetryData.map(d => {
      // Scale intensity: 0mm = 0, 1-5mm = 0.2, 5-15mm = 0.6, >15mm = 1.0
      // Leaflet.heat normalizes against 'max'
      return [d.lat, d.lng, d.precipitation_mm];
    });

    if (this.heatLayer) {
      if (this.map.hasLayer(this.heatLayer)) {
        this.map.removeLayer(this.heatLayer);
      }
    }

    this.heatLayer = L.heatLayer(heatPoints, {
      radius: this.radius,
      blur: this.blur,
      maxZoom: CONFIG.openMeteo.defaultMaxZoom,
      max: 20.0, // 20mm corresponds to maximum intensity (red cloud)
      minOpacity: 0.25,
      gradient: CONFIG.openMeteo.gradientScale
    });

    if (this.isHeatmapVisible) {
      this.heatLayer.addTo(this.map);
    }
  }

  /**
   * Render individual station pins with live telemetry badges
   */
  renderStationPins() {
    this.stationMarkersLayer.clearLayers();

    this.telemetryData.forEach(d => {
      const mm = d.precipitation_mm;
      let colorClass = "bg-emerald-500";
      let borderClass = "border-emerald-300";
      let pulseClass = "";

      if (mm > 15.0) {
        colorClass = "bg-red-600";
        borderClass = "border-red-400";
        pulseClass = "pulse-red";
      } else if (mm >= 5.0) {
        colorClass = "bg-amber-500";
        borderClass = "border-amber-300";
      } else if (mm > 0.0) {
        colorClass = "bg-lime-500";
        borderClass = "border-lime-300";
      } else {
        colorClass = "bg-slate-600";
        borderClass = "border-slate-400";
      }

      // Custom div icon
      const icon = L.divIcon({
        className: 'custom-station-marker',
        html: `
          <div class="station-pin ${colorClass} ${borderClass} ${pulseClass}" style="width: 28px; height: 28px;">
            ${mm > 0 ? mm.toFixed(0) : '0'}
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([d.lat, d.lng], { icon: icon });

      // Rich Telemetry Popup
      const popupContent = `
        <div class="p-1 max-w-xs">
          <div class="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-700">
            <span class="text-[10px] font-mono text-cyan-400">${d.id}</span>
            <span class="text-[11px] font-bold px-1.5 py-0.5 rounded ${colorClass} text-white">
              ${mm.toFixed(1)} mm/hr
            </span>
          </div>
          <h4 class="font-bold text-sm text-white leading-tight mb-1">${d.name}</h4>
          <p class="text-[11px] text-slate-300 mb-2"><strong>Corridor:</strong> ${d.corridor}</p>
          
          <div class="grid grid-cols-2 gap-1.5 text-[11px] bg-slate-800/80 p-2 rounded border border-slate-700/60 mb-2">
            <div>
              <span class="text-slate-400 block">Elevation:</span>
              <span class="font-semibold text-slate-200">${d.elevation_m}m</span>
            </div>
            <div>
              <span class="text-slate-400 block">Temperature:</span>
              <span class="font-semibold text-cyan-300">${d.temperature_c !== null ? d.temperature_c + '°C' : 'N/A'}</span>
            </div>
          </div>

          <div class="text-[10px] text-slate-400 leading-snug mb-1">
            <strong>Strategic Logistics Note:</strong> ${d.strategicImportance}
          </div>

          <div class="text-[10px] text-slate-400 pt-1 border-t border-slate-800 flex justify-between">
            <span>Source: Open-Meteo</span>
            <span class="font-mono text-slate-300">${new Date(d.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        maxWidth: 280,
        className: 'station-popup'
      });

      marker.bindTooltip(`${d.name}: ${mm.toFixed(1)} mm`, {
        direction: 'top',
        offset: [0, -10]
      });

      this.stationMarkersLayer.addLayer(marker);
    });

    if (this.isStationsVisible && !this.map.hasLayer(this.stationMarkersLayer)) {
      this.stationMarkersLayer.addTo(this.map);
    }
  }

  toggleHeatmap(show) {
    this.isHeatmapVisible = show;
    if (this.heatLayer) {
      if (show && !this.map.hasLayer(this.heatLayer)) {
        this.heatLayer.addTo(this.map);
      } else if (!show && this.map.hasLayer(this.heatLayer)) {
        this.map.removeLayer(this.heatLayer);
      }
    }
  }

  toggleStationPins(show) {
    this.isStationsVisible = show;
    if (show && !this.map.hasLayer(this.stationMarkersLayer)) {
      this.stationMarkersLayer.addTo(this.map);
    } else if (!show && this.map.hasLayer(this.stationMarkersLayer)) {
      this.map.removeLayer(this.stationMarkersLayer);
    }
  }

  setRadius(val) {
    this.radius = parseInt(val, 10);
    this.renderHeatmap();
  }

  setBlur(val) {
    this.blur = parseInt(val, 10);
    this.renderHeatmap();
  }

  updateSpinnerUI(loading) {
    const btn = document.getElementById('btn-refresh-rainfall');
    const spinner = document.getElementById('rainfall-spinner');
    if (btn && spinner) {
      if (loading) {
        spinner.classList.remove('hidden');
        btn.setAttribute('disabled', 'true');
      } else {
        spinner.classList.add('hidden');
        btn.removeAttribute('disabled');
      }
    }
  }

  updateStatusBadge() {
    const timestampEl = document.getElementById('rainfall-last-updated');
    const modeBadge = document.getElementById('rainfall-mode-badge');
    if (timestampEl && this.lastUpdated) {
      timestampEl.textContent = this.lastUpdated.toLocaleTimeString();
    }
    if (modeBadge) {
      if (this.isSimulated) {
        modeBadge.textContent = "SIMULATED MONSOON";
        modeBadge.className = "text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold";
      } else {
        modeBadge.textContent = "LIVE API FEED";
        modeBadge.className = "text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold";
      }
    }
  }
}

// Export to window
window.OpenMeteoService = OpenMeteoService;
