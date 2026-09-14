import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  Maximize2, 
  MapPin, 
  Layers, 
  AlertOctagon, 
  Compass, 
  Info
} from 'lucide-react';
import { useLogistics } from '../context/LogisticsContext';

export const NerMap: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const corridorsLayerRef = useRef<L.LayerGroup | null>(null);

  const { 
    districts, 
    corridors, 
    selectedState, 
    selectedDistrictId, 
    setSelectedDistrictId,
    searchQuery
  } = useLogistics();

  const [showCorridors, setShowCorridors] = useState<boolean>(true);
  const [filterCriticalOnly, setFilterCriticalOnly] = useState<boolean>(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center of North-East India (approx Assam / Meghalaya border)
    const map = L.map(mapContainerRef.current, {
      center: [26.1, 92.8],
      zoom: 6.8,
      minZoom: 6,
      maxZoom: 12,
      zoomControl: false,
    });

    // Dark Matter Tactical Map Tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> | MDoNER GIS Command',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // Reposition zoom control to top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    corridorsLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Highway Corridors Polylines
  useEffect(() => {
    if (!corridorsLayerRef.current || !mapInstanceRef.current) return;
    corridorsLayerRef.current.clearLayers();

    if (!showCorridors) return;

    corridors.forEach((c) => {
      let color = '#10b981'; // Open (Emerald Green)
      let dashArray: string | undefined = undefined;
      let weight = 3.5;
      let opacity = 0.85;

      if (c.status === 'BLOCKED') {
        color = '#ef4444'; // Blocked (Crimson Red)
        dashArray = '5, 8';
        weight = 4.5;
        opacity = 0.95;
      } else if (c.status === 'RESTRICTED') {
        color = '#f59e0b'; // Restricted (Amber)
        dashArray = '6, 6';
        weight = 3.5;
      }

      const polyline = L.polyline(c.coordinates, {
        color,
        weight,
        opacity,
        dashArray,
        lineCap: 'round',
        lineJoin: 'round',
      });

      // Corridor Hover Tooltip
      const statusBadge = c.status === 'OPEN'
        ? '<span style="color: #10b981; font-weight: bold;">● OPEN</span>'
        : c.status === 'RESTRICTED'
        ? '<span style="color: #f59e0b; font-weight: bold;">▲ RESTRICTED</span>'
        : '<span style="color: #ef4444; font-weight: bold;">✕ BLOCKED (CHOKEPOINT)</span>';

      polyline.bindTooltip(
        `
        <div style="font-family: inherit; font-size: 11px; padding: 2px;">
          <div style="font-weight: 700; color: #f8fafc;">${c.name}</div>
          <div style="color: #94a3b8; font-size: 10px;">${c.section}</div>
          <div style="margin-top: 4px; display: flex; justify-content: space-between; gap: 8px;">
            <span>Status: ${statusBadge}</span>
            <span style="color: #cbd5e1; font-family: monospace;">${c.lengthKm} km</span>
          </div>
        </div>
        `,
        { sticky: true, className: 'tactical-tooltip' }
      );

      polyline.addTo(corridorsLayerRef.current!);
    });
  }, [corridors, showCorridors]);

  // Update District Centroid Markers & Pulsing Radar Nodes
  useEffect(() => {
    if (!markersLayerRef.current || !mapInstanceRef.current) return;
    markersLayerRef.current.clearLayers();

    // Filter districts based on state filter, search query, or critical filter
    const visibleDistricts = districts.filter((d) => {
      if (selectedState !== 'ALL' && d.state !== selectedState) return false;
      if (filterCriticalOnly && d.connectivityCategory !== 'critical') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = d.name.toLowerCase().includes(q);
        const matchesState = d.state.toLowerCase().includes(q);
        const matchesCorridors = d.corridorIds.some((cid) => cid.toLowerCase().includes(q));
        if (!matchesName && !matchesState && !matchesCorridors) return false;
      }
      return true;
    });

    visibleDistricts.forEach((d) => {
      // Choose color based on Accessibility Health Score (0-100%)
      // 80-100%: Emerald Green (#10b981)
      // 50-79%: Amber / Yellow (#f59e0b)
      // <50%: Crimson Red (#ef4444)
      const isCritical = d.connectivityCategory === 'critical';
      const isModerate = d.connectivityCategory === 'moderate';
      const isSelected = selectedDistrictId === d.id;

      const primaryColor = isCritical ? '#ef4444' : isModerate ? '#f59e0b' : '#10b981';
      const glowColor = isCritical ? 'rgba(239, 68, 68, 0.4)' : isModerate ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.25)';

      // Custom HTML Marker with radar ping ring for critical districts
      const iconHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group" style="width: 48px; height: 48px;">
          ${
            isCritical
              ? `<div class="absolute inset-0 rounded-full animate-radar" style="background: rgba(239, 68, 68, 0.4); border: 1.5px solid #ef4444;"></div>
                 <div class="absolute -inset-1 rounded-full animate-ping opacity-75" style="background: rgba(239, 68, 68, 0.2);"></div>`
              : ''
          }
          
          <div 
            class="relative z-10 flex flex-col items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300 shadow-lg ${
              isSelected ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'hover:scale-110'
            }"
            style="
              background: #0b0f19;
              border-color: ${primaryColor};
              box-shadow: 0 0 16px ${glowColor};
            "
          >
            <span class="text-[10px] font-mono font-black" style="color: ${primaryColor};">
              ${d.accessibilityScore}%
            </span>
          </div>

          <div class="absolute -bottom-5 px-1.5 py-0.5 rounded bg-slate-950/90 border border-slate-800 text-[9px] font-medium text-slate-200 whitespace-nowrap shadow-md pointer-events-none group-hover:scale-105 transition">
            ${d.name.split(' (')[0]}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-district-marker',
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      });

      const marker = L.marker([d.lat, d.lng], { icon: customIcon });

      // Interactive Click opens deep-dive drawer
      marker.on('click', () => {
        setSelectedDistrictId(d.id);
      });

      // Tooltip preview
      marker.bindTooltip(
        `
        <div style="font-family: inherit; font-size: 11px; padding: 4px; min-width: 170px;">
          <div style="font-weight: bold; font-size: 12px; color: #ffffff;">${d.name}</div>
          <div style="color: #94a3b8; font-size: 10px; margin-bottom: 6px;">${d.state} • Elev: ${d.elevationMeters}m</div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #cbd5e1;">Accessibility Score:</span>
            <span style="font-weight: bold; color: ${primaryColor}; font-family: monospace;">${d.accessibilityScore}%</span>
          </div>

          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #cbd5e1;">Open Corridors:</span>
            <span style="color: #f8fafc; font-family: monospace;">${d.openCorridorsCount}/${d.totalCorridorsCount}</span>
          </div>

          <div style="display: flex; justify-content: space-between;">
            <span style="color: #cbd5e1;">Min Supply Runway:</span>
            <span style="color: ${d.minSupplyDays < 3 ? '#ef4444' : '#10b981'}; font-weight: bold; font-family: monospace;">${d.minSupplyDays} Days</span>
          </div>

          ${
            d.isStockoutRisk
              ? `<div style="margin-top: 6px; padding: 2px 4px; background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; border-radius: 4px; font-size: 9px; color: #fca5a5; font-weight: bold; text-align: center;">
                  CRITICAL STOCKOUT RISK
                 </div>`
              : ''
          }
          <div style="margin-top: 6px; text-align: center; color: #38bdf8; font-size: 9px;">Click for District Drill-Down</div>
        </div>
        `,
        { direction: 'top', offset: [0, -18], className: 'tactical-tooltip' }
      );

      marker.addTo(markersLayerRef.current!);
    });

    // If a district is selected, smoothly pan and center to it
    if (selectedDistrictId && mapInstanceRef.current) {
      const selected = districts.find((d) => d.id === selectedDistrictId);
      if (selected) {
        mapInstanceRef.current.setView([selected.lat, selected.lng], 8.5, { animate: true });
      }
    }
  }, [districts, selectedState, filterCriticalOnly, searchQuery, selectedDistrictId, setSelectedDistrictId]);

  // Reset to Pan-NER View
  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([26.1, 92.8], 6.8, { animate: true });
    }
  };

  return (
    <div className="tactical-panel rounded-xl overflow-hidden relative flex flex-col h-[520px] lg:h-[600px] border border-slate-800 shadow-xl">
      
      {/* Top Map Control Bar */}
      <div className="bg-[#0f172a]/90 backdrop-blur-md px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between z-10 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            GIS Tactical Choropleth & Corridors Map
          </span>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
            EPSG:3857 • Live Dynamic Feed
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Corridors */}
          <button
            onClick={() => setShowCorridors(!showCorridors)}
            className={`text-[11px] font-medium px-2.5 py-1 rounded-md border flex items-center gap-1.5 transition ${
              showCorridors 
                ? 'bg-slate-800 text-emerald-300 border-slate-700' 
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Highways ({corridors.length})</span>
          </button>

          {/* Toggle Critical Only */}
          <button
            onClick={() => setFilterCriticalOnly(!filterCriticalOnly)}
            className={`text-[11px] font-medium px-2.5 py-1 rounded-md border flex items-center gap-1.5 transition ${
              filterCriticalOnly 
                ? 'bg-red-950 text-red-300 border-red-800' 
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-300'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
            <span>Cut-Off Only (&lt;50%)</span>
          </button>

          {/* Reset Zoom */}
          <button
            onClick={handleResetView}
            title="Reset to Pan-NER view"
            className="text-[11px] font-medium px-2 py-1 rounded-md bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800 transition"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Map Leaflet Container */}
      <div ref={mapContainerRef} className="flex-1 w-full h-full relative z-0" />

      {/* Floating Tactical Legend */}
      <div className="absolute bottom-3 left-3 z-10 bg-slate-950/90 backdrop-blur-md p-2.5 rounded-lg border border-slate-800/90 shadow-xl text-[10px] space-y-1.5 max-w-[260px] pointer-events-auto">
        <div className="font-semibold text-slate-300 uppercase tracking-wider text-[9px] flex items-center gap-1">
          <Compass className="w-3 h-3 text-emerald-400" />
          Accessibility Health Legend
        </div>
        
        <div className="grid grid-cols-1 gap-1 font-mono text-[10px]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            <span className="text-slate-300">80–100%: Normal / High Connectivity</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
            <span className="text-slate-300">50–79%: Moderate Disruption</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50 animate-ping" />
            <span className="text-red-400 font-semibold">&lt;50%: Severely Cut-Off (Radar Ring)</span>
          </div>
        </div>

        <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[9px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-emerald-500 inline-block" /> Open Road
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-amber-500 border-b border-dashed inline-block" /> Restricted
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-red-500 border-b border-dashed inline-block" /> Blocked
          </span>
        </div>
      </div>

      {/* Interactive Helper Hint */}
      <div className="absolute top-14 right-3 z-10 hidden sm:flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-md border border-slate-800 text-[10px] text-slate-400 pointer-events-none">
        <Info className="w-3 h-3 text-cyan-400" />
        <span>Click any node to open District Deep-Dive Drawer</span>
      </div>

    </div>
  );
};
