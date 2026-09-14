/**
 * Global Configuration for NER GIS Disaster & Weather Heatmap
 */
const CONFIG = {
  // Map Defaults (Milestone 1)
  map: {
    initialCenter: [26.2006, 92.9376], // North East India center
    initialZoom: 7,
    minZoom: 5,
    maxZoom: 18,
    maxBounds: [
      [20.5, 87.0], // South-West (Bay of Bengal / West Bengal border)
      [30.5, 98.5]  // North-East (Tibet / Myanmar border)
    ]
  },

  // Base Map Tile Layers (Milestone 1)
  baseLayers: {
    cartoVoyager: {
      name: "CartoDB Voyager (Street / Topo)",
      url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    },
    satellite: {
      name: "Esri World Imagery (Satellite)",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      maxZoom: 19
    }
  },

  // Geological Hazard & Landslide Settings (Milestone 2)
  landslide: {
    bhuvanWmsUrl: "https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms",
    bhuvanAltUrl: "https://bhuvan-app1.nrsc.gov.in/disaster/disaster.php",
    wmsLayers: "landslide_hazard_ner",
    wmsParams: {
      format: "image/png",
      transparent: true,
      version: "1.1.1"
    },
    severityColors: {
      "Very High": {
        fill: "#ef4444",
        stroke: "#b91c1c",
        text: "Very High Risk",
        badgeBg: "bg-red-500/20 text-red-400 border-red-500/30"
      },
      "High": {
        fill: "#f97316",
        stroke: "#c2410c",
        text: "High Risk",
        badgeBg: "bg-orange-500/20 text-orange-400 border-orange-500/30"
      },
      "Moderate": {
        fill: "#eab308",
        stroke: "#a16207",
        text: "Moderate Risk",
        badgeBg: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      }
    }
  },

  // IMD Disaster Alerts Settings (Milestone 3)
  imd: {
    apiEndpoint: "https://mausam.imd.gov.in/api/district_bulletin",
    alertLevels: {
      "Red": {
        name: "Severe Warning (Flash Flood / Severe Landslide Risk)",
        shortName: "Red Alert",
        color: "#dc2626",
        borderColor: "#991b1b",
        textColor: "text-red-400",
        bgBadge: "bg-red-500/20 text-red-300 border-red-500/40"
      },
      "Orange": {
        name: "Heavy Rainfall Warning (Be Prepared)",
        shortName: "Orange Alert",
        color: "#f97316",
        borderColor: "#c2410c",
        textColor: "text-orange-400",
        bgBadge: "bg-orange-500/20 text-orange-300 border-orange-500/40"
      },
      "Yellow": {
        name: "Moderate Weather Watch (Be Aware)",
        shortName: "Yellow Alert",
        color: "#eab308",
        borderColor: "#ca8a04",
        textColor: "text-yellow-400",
        bgBadge: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40"
      },
      "Green": {
        name: "Normal / No Warning",
        shortName: "Green / Normal",
        color: "#16a34a",
        borderColor: "#15803d",
        textColor: "text-emerald-400",
        bgBadge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
      }
    }
  },

  // Open-Meteo Rainfall Settings (Milestone 4)
  openMeteo: {
    apiUrl: "https://api.open-meteo.com/v1/forecast",
    defaultRadius: 35,
    defaultBlur: 22,
    defaultMaxZoom: 15,
    gradientScale: {
      0.0: "#22c55e",  // 0 - 1 mm (light green)
      0.2: "#84cc16",  // 1 - 5 mm (lime green)
      0.45: "#eab308", // 5 - 10 mm (yellow)
      0.7: "#f97316",  // 10 - 15 mm (orange)
      1.0: "#ef4444"   // > 15 mm (intense red heat cloud)
    }
  },

  // Regional Zoom Coordinates for Quick Nav
  regions: {
    "all": { name: "All North East (NER)", center: [26.2006, 92.9376], zoom: 7 },
    "assam": { name: "Assam", center: [26.2006, 92.9376], zoom: 7 },
    "meghalaya": { name: "Meghalaya", center: [25.5788, 91.8933], zoom: 8 },
    "arunachal": { name: "Arunachal Pradesh", center: [27.5000, 94.5000], zoom: 7 },
    "nagaland": { name: "Nagaland", center: [26.1584, 94.5624], zoom: 8 },
    "manipur": { name: "Manipur", center: [24.6637, 93.9063], zoom: 8 },
    "mizoram": { name: "Mizoram", center: [23.1645, 92.9376], zoom: 8 },
    "tripura": { name: "Tripura", center: [23.9408, 91.9882], zoom: 8 },
    "sikkim": { name: "Sikkim", center: [27.5330, 88.5122], zoom: 9 }
  }
};

// Export to window
window.CONFIG = CONFIG;
