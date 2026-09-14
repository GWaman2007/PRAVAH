import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import type { Incident } from '../types/incident';
import { calculateIncidentConfidence } from '../utils/offlineEngine';
import { 
  Maximize2, 
  Layers, 
  Crosshair
} from 'lucide-react';

interface IncidentMapProps {
  incidents: Incident[];
  selectedIncidentId: string | null;
  onSelectIncident: (id: string) => void;
  onVote: (id: string, voteType: 'up' | 'down') => void;
  isPickingLocation: boolean;
  onCoordinatesPicked?: (coords: { lat: number; lng: number }) => void;
  pickedCoordinates?: { lat: number; lng: number } | null;
}

// NER Center coordinates
const NER_CENTER: [number, number] = [26.2006, 92.9376];
const NER_DEFAULT_ZOOM = 7;

// Tile layer presets
const TILE_LAYERS = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> & OpenStreetMap'
  },
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors'
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
  }
};

export const IncidentMap: React.FC<IncidentMapProps> = ({
  incidents,
  selectedIncidentId,
  onSelectIncident,
  onVote,
  isPickingLocation,
  onCoordinatesPicked,
  pickedCoordinates,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const pickMarkerRef = useRef<L.Marker | null>(null);
  const currentTileLayerRef = useRef<L.TileLayer | null>(null);
  const [activeTileType, setActiveTileType] = useState<'dark' | 'osm' | 'satellite'>('dark');
  const [isLegendOpen, setIsLegendOpen] = useState(true);

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: NER_CENTER,
      zoom: NER_DEFAULT_ZOOM,
      zoomControl: false,
      attributionControl: false,
      minZoom: 6,
      maxZoom: 18,
    });

    // Add zoom control at top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Default to dark matter tiles
    const tileLayer = L.tileLayer(TILE_LAYERS.dark.url, {
      attribution: TILE_LAYERS.dark.attribution,
      maxZoom: 19,
    }).addTo(map);

    currentTileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle basemap switching
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (currentTileLayerRef.current) {
      map.removeLayer(currentTileLayerRef.current);
    }

    const config = TILE_LAYERS[activeTileType];
    const newLayer = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: 19,
    }).addTo(map);

    currentTileLayerRef.current = newLayer;
  }, [activeTileType]);

  // Handle location picking clicks on map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (isPickingLocation && onCoordinatesPicked) {
        onCoordinatesPicked({
          lat: parseFloat(e.latlng.lat.toFixed(5)),
          lng: parseFloat(e.latlng.lng.toFixed(5)),
        });
      }
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [isPickingLocation, onCoordinatesPicked]);

  // Handle preview marker for picked coordinate
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (pickedCoordinates) {
      if (pickMarkerRef.current) {
        pickMarkerRef.current.setLatLng([pickedCoordinates.lat, pickedCoordinates.lng]);
      } else {
        const pickIcon = L.divIcon({
          className: 'custom-pick-marker',
          html: `
            <div class="relative flex items-center justify-center">
              <div class="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg border-2 border-white animate-bounce">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M12 2v20M2 12h20"/>
                </svg>
              </div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });

        pickMarkerRef.current = L.marker([pickedCoordinates.lat, pickedCoordinates.lng], {
          icon: pickIcon,
        }).addTo(map);
      }
    } else {
      if (pickMarkerRef.current) {
        map.removeLayer(pickMarkerRef.current);
        pickMarkerRef.current = null;
      }
    }
  }, [pickedCoordinates]);

  // Render incident markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers that no longer exist
    const currentIncidentIds = new Set(incidents.map((i) => i.id));
    Object.keys(markersRef.current).forEach((id) => {
      if (!currentIncidentIds.has(id)) {
        map.removeLayer(markersRef.current[id]);
        delete markersRef.current[id];
      }
    });

    // Add / Update markers
    incidents.forEach((incident) => {
      const { score, badge, badgeColor } = calculateIncidentConfidence(incident);
      const isClearedOrDisputed = score <= 0;
      const isCritical = incident.severity === 'Total Blockage';
      const isWarning = incident.severity === 'Single Lane Passable';

      let pinColor = '#f59e0b'; // Amber default
      if (isClearedOrDisputed) {
        pinColor = '#64748b'; // Slate faded
      } else if (incident.severity === 'Total Blockage') {
        pinColor = '#ef4444'; // Red
      } else if (incident.severity === 'Single Lane Passable') {
        pinColor = '#f59e0b'; // Amber
      } else {
        pinColor = '#eab308'; // Yellow
      }

      const isSelected = selectedIncidentId === incident.id;

      // Custom HTML Pin
      const iconHtml = `
        <div class="relative flex items-center justify-center cursor-pointer ${isSelected ? 'marker-highlighted z-50' : ''}" style="width: 42px; height: 42px;">
          ${isCritical && !isClearedOrDisputed ? '<div class="marker-pulse-critical"></div>' : ''}
          ${isWarning && !isClearedOrDisputed ? '<div class="marker-pulse-warning"></div>' : ''}
          
          <div class="relative flex items-center justify-center w-8 h-8 rounded-full shadow-2xl transition-transform hover:scale-125" style="background-color: ${pinColor}; border: 2.5px solid #ffffff; ${isClearedOrDisputed ? 'opacity: 0.65;' : ''}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              ${
                incident.incidentType === 'Landslide'
                  ? '<path d="m14 12-8.5 8.5a2.12 2.12 0 1 1-3-3L11 9"/><path d="M12 22h10"/><path d="M18 10h4"/><path d="m17 14 3-3-3-3"/>'
                  : incident.incidentType === 'Flash Flood'
                  ? '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>'
                  : incident.incidentType === 'Tree Fall'
                  ? '<path d="M12 19V5M5 12l7-7 7 7"/>'
                  : '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
              }
            </svg>
          </div>
          <div class="absolute -bottom-1 w-2 h-2 rounded-full bg-black/60 filter blur-[1px]"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'incident-leaflet-marker',
        html: iconHtml,
        iconSize: [42, 42],
        iconAnchor: [21, 21],
        popupAnchor: [0, -22],
      });

      // Custom Popup HTML
      const popupHtml = `
        <div class="p-3 w-64 text-slate-100 font-sans space-y-2">
          <div class="flex items-center justify-between text-[11px] pb-1 border-b border-slate-800">
            <span class="font-bold text-orange-400 font-mono">${incident.corridorFlair}</span>
            <span class="text-slate-400 font-medium">${incident.incidentType}</span>
          </div>

          <h4 class="font-bold text-xs leading-snug text-white line-clamp-2">
            ${incident.title}
          </h4>

          <div class="flex items-center gap-1.5 text-[11px]">
            <span class="inline-block w-2 h-2 rounded-full" style="background-color: ${pinColor}"></span>
            <span class="font-semibold text-slate-200">${incident.severity}</span>
          </div>

          <div class="p-1.5 rounded bg-slate-950/80 border border-slate-800 text-[10px] flex items-center justify-between">
            <span class="text-slate-400">Verification:</span>
            <span class="font-bold ${
              badgeColor === 'emerald' ? 'text-emerald-400' : badgeColor === 'amber' ? 'text-amber-400' : 'text-slate-400'
            }">${badge}</span>
          </div>

          ${
            incident.mediaUrl
              ? `<div class="h-20 w-full rounded overflow-hidden border border-slate-800 bg-slate-950">
                  <img src="${incident.mediaUrl}" class="w-full h-full object-cover" />
                 </div>`
              : ''
          }

          <div class="pt-1 flex items-center justify-between gap-1.5 text-[11px]">
            <button 
              id="popup-upvote-${incident.id}"
              class="flex-1 py-1 rounded bg-orange-600 hover:bg-orange-500 text-white font-semibold text-center transition-colors flex items-center justify-center gap-1"
            >
              ▲ Upvote (${incident.votes.upvotes})
            </button>
            <button 
              id="popup-view-${incident.id}"
              class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium border border-slate-700 text-center"
            >
              View Card
            </button>
          </div>
        </div>
      `;

      if (markersRef.current[incident.id]) {
        // Update existing marker
        const marker = markersRef.current[incident.id];
        marker.setLatLng([incident.location.lat, incident.location.lng]);
        marker.setIcon(customIcon);
        marker.setPopupContent(popupHtml);
      } else {
        // Create new marker
        const marker = L.marker([incident.location.lat, incident.location.lng], {
          icon: customIcon,
        }).addTo(map);

        marker.bindPopup(popupHtml, {
          maxWidth: 280,
          className: 'pravah-map-popup',
        });

        marker.on('click', () => {
          onSelectIncident(incident.id);
        });

        marker.on('popupopen', () => {
          setTimeout(() => {
            const upvoteBtn = document.getElementById(`popup-upvote-${incident.id}`);
            const viewBtn = document.getElementById(`popup-view-${incident.id}`);

            if (upvoteBtn) {
              upvoteBtn.onclick = (e) => {
                e.stopPropagation();
                onVote(incident.id, 'up');
              };
            }

            if (viewBtn) {
              viewBtn.onclick = (e) => {
                e.stopPropagation();
                onSelectIncident(incident.id);
                // Scroll card into view on feed
                const cardEl = document.getElementById(`incident-card-${incident.id}`);
                if (cardEl) {
                  cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              };
            }
          }, 50);
        });

        markersRef.current[incident.id] = marker;
      }
    });
  }, [incidents, selectedIncidentId, onSelectIncident, onVote]);

  // Pan and open popup when selectedIncidentId changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedIncidentId) return;

    const targetIncident = incidents.find((i) => i.id === selectedIncidentId);
    if (!targetIncident) return;

    map.flyTo([targetIncident.location.lat, targetIncident.location.lng], 11, {
      duration: 1.2,
      easeLinearity: 0.25,
    });

    const marker = markersRef.current[selectedIncidentId];
    if (marker) {
      setTimeout(() => {
        marker.openPopup();
      }, 700);
    }
  }, [selectedIncidentId, incidents]);

  // Recenter map to NER
  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo(NER_CENTER, NER_DEFAULT_ZOOM, { duration: 1 });
  };

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden">
      {/* Map DOM Element */}
      <div 
        ref={mapContainerRef} 
        className={`w-full h-full z-0 ${isPickingLocation ? 'cursor-crosshair' : ''}`}
      />

      {/* Crosshair indicator banner when in picking mode */}
      {isPickingLocation && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-orange-600/90 backdrop-blur-md text-white px-4 py-2 rounded-full font-semibold text-xs shadow-xl flex items-center gap-2 border border-orange-400 animate-pulse">
          <Crosshair className="w-4 h-4" />
          <span>Click anywhere on the map to set incident coordinates</span>
        </div>
      )}

      {/* Top Left: Basemap Switcher & Recenter */}
      <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-800 shadow-xl text-xs">
        <button
          onClick={handleRecenter}
          title="Recenter Map to North East Region"
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 font-medium transition-colors"
        >
          <Maximize2 className="w-3.5 h-3.5 text-orange-400" />
          <span className="hidden sm:inline">NER View</span>
        </button>

        <div className="h-4 w-px bg-slate-800 mx-0.5" />

        <button
          onClick={() => setActiveTileType('dark')}
          className={`px-2 py-1 rounded-lg font-medium transition-colors ${
            activeTileType === 'dark'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Dark
        </button>

        <button
          onClick={() => setActiveTileType('osm')}
          className={`px-2 py-1 rounded-lg font-medium transition-colors ${
            activeTileType === 'osm'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Street
        </button>

        <button
          onClick={() => setActiveTileType('satellite')}
          className={`px-2 py-1 rounded-lg font-medium transition-colors ${
            activeTileType === 'satellite'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Satellite
        </button>
      </div>

      {/* Bottom Right: Hazard Legend Pill */}
      <div className="absolute bottom-4 right-4 z-30">
        {isLegendOpen ? (
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl p-3 text-xs shadow-2xl text-slate-200 space-y-2 min-w-[200px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-bold text-[11px] uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-orange-400" />
                Hazard Pins
              </span>
              <button
                onClick={() => setIsLegendOpen(false)}
                className="text-slate-500 hover:text-slate-300 px-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 ring-2 ring-red-500/30 shrink-0"></span>
                <span className="font-semibold text-red-300">Total Blockage (Critical)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0"></span>
                <span className="text-amber-300">Single Lane Passable</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-yellow-500 shrink-0"></span>
                <span className="text-yellow-300">Caution / Hazard</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-slate-500 opacity-60 shrink-0"></span>
                <span className="text-slate-400">Disputed / Likely Cleared</span>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsLegendOpen(true)}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white shadow-xl flex items-center gap-1.5 text-xs font-semibold"
          >
            <Layers className="w-4 h-4 text-orange-400" />
            <span>Legend</span>
          </button>
        )}
      </div>
    </div>
  );
};
