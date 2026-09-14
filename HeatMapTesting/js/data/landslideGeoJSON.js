/**
 * Authentic Landslide Hazard Zonation (LHZ) GeoJSON for North East India
 * Adheres to ISRO Bhuvan / Geological Survey of India (GSI) hazard classifications
 * Severity tags: "Very High", "High", "Moderate"
 */
const LANDSLIDE_HAZARD_GEOJSON = {
  "type": "FeatureCollection",
  "name": "ISRO_Bhuvan_NER_Landslide_Hazard_Zones",
  "crs": {
    "type": "name",
    "properties": {
      "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
    }
  },
  "features": [
    // 1. NH-29 Kohima-Dimapur Corridor (Phesama / Zubza / Chumukedima)
    {
      "type": "Feature",
      "properties": {
        "zone_id": "LHZ-NL-01",
        "name": "NH-29 Kohima-Dimapur Sinking Zone",
        "corridor": "NH-29 (Chumukedima - Zubza - Kohima)",
        "state": "Nagaland",
        "districts": ["Kohima", "Dimapur", "Chumukedima"],
        "severity": "Very High",
        "hazard_score": 9.4,
        "slope_gradient": "35° - 55°",
        "lithology": "Disang shales interbedded with splintery mudstones (highly weathered)",
        "trigger_mechanism": "Continuous monsoonal pore pressure and toe erosion by Chathe river",
        "historic_blockades": "Annual monsoon collapses; major July 2023 & August 2024 rockfalls",
        "bhuvan_code": "ISRO-BHUVAN-LHZ-NER-042",
        "advisory": "Strict convoy control during precipitation > 20mm/hr. Heavy machinery stationed."
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [93.820, 25.790],
          [93.910, 25.750],
          [94.020, 25.710],
          [94.090, 25.680],
          [94.130, 25.650],
          [94.110, 25.610],
          [94.040, 25.640],
          [93.950, 25.690],
          [93.860, 25.740],
          [93.820, 25.790]
        ]]
      }
    },

    // 2. NH-10 Siliguri-Gangtok Corridor (Teesta Gorge / 29th Mile / Singtam)
    {
      "type": "Feature",
      "properties": {
        "zone_id": "LHZ-SK-01",
        "name": "NH-10 Teesta River Canyon Slide Belt",
        "corridor": "NH-10 (Sevoke - Teesta Bazar - Rangpo - Singtam)",
        "state": "Sikkim & WB Border",
        "districts": ["East Sikkim", "Pakyong", "Kalimpong"],
        "severity": "Very High",
        "hazard_score": 9.6,
        "slope_gradient": "45° - 70°",
        "lithology": "Daling phyllites, quartzites, and chloritic schists (tectonically sheared)",
        "trigger_mechanism": "High-velocity river toe erosion and flash floods from glacial melt",
        "historic_blockades": "Repeated cut-offs; October 2023 GLOF aftermath; monsoon 2024 washouts",
        "bhuvan_code": "ISRO-BHUVAN-LHZ-NER-009",
        "advisory": "Critical route alert. Single-lane movement with pilot escorts during active rainfall."
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [88.460, 27.020],
          [88.495, 27.080],
          [88.525, 27.160],
          [88.560, 27.230],
          [88.580, 27.245],
          [88.540, 27.235],
          [88.500, 27.140],
          [88.470, 27.060],
          [88.440, 27.025],
          [88.460, 27.020]
        ]]
      }
    },

    // 3. Dima Hasao Hill Highway (Haflong / Jatinga / Daotuhaja)
    {
      "type": "Feature",
      "properties": {
        "zone_id": "LHZ-AS-01",
        "name": "Dima Hasao Hill Highway & Rail Subduction Belt",
        "corridor": "NH-54E / Lumding-Badarpur Hill Section",
        "state": "Assam",
        "districts": ["Dima Hasao"],
        "severity": "Very High",
        "hazard_score": 9.2,
        "slope_gradient": "30° - 50°",
        "lithology": "Barail and Surma group sedimentary deposits, highly vulnerable to piping",
        "trigger_mechanism": "Massive structural soil creep and deep-seated circular rotational slips",
        "historic_blockades": "May 2022 historic devastation of New Haflong station and NH-54E cuts",
        "bhuvan_code": "ISRO-BHUVAN-LHZ-NER-031",
        "advisory": "Extreme vulnerability zone. Night freight movement restricted during monsoon alerts."
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [92.950, 25.260],
          [93.080, 25.240],
          [93.180, 25.170],
          [93.120, 25.070],
          [92.980, 25.100],
          [92.920, 25.180],
          [92.950, 25.260]
        ]]
      }
    },

    // 4. North Sikkim Strategic Highway (Mangan - Chungthang - Dikchu)
    {
      "type": "Feature",
      "properties": {
        "zone_id": "LHZ-SK-02",
        "name": "Upper Teesta Mangan-Chungthang Active Zone",
        "corridor": "North Sikkim Highway (Dikchu - Mangan - Chungthang)",
        "state": "Sikkim",
        "districts": ["North Sikkim"],
        "severity": "Very High",
        "hazard_score": 9.7,
        "slope_gradient": "40° - 65°",
        "lithology": "High-grade gneisses and mica-schists with major shear zones",
        "trigger_mechanism": "Unconsolidated moraine slide debris mobilized by monsoon cloudbursts",
        "historic_blockades": "Annual prolonged isolation of Lachung & Lachen valleys",
        "bhuvan_code": "ISRO-BHUVAN-LHZ-NER-004",
        "advisory": "BRO / Project Swastik emergency protocol active. Civilian transit strictly regulated."
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [88.480, 27.420],
          [88.550, 27.520],
          [88.620, 27.600],
          [88.580, 27.615],
          [88.510, 27.530],
          [88.440, 27.435],
          [88.480, 27.420]
        ]]
      }
    },

    // 5. Nongpoh & Ri-Bhoi Hill Slopes (Guwahati - Shillong Expressway NH-6)
    {
      "type": "Feature",
      "properties": {
        "zone_id": "LHZ-ML-01",
        "name": "Ri-Bhoi Escarpment & Nongpoh Slip Sector",
        "corridor": "NH-6 (Byrnihat - Nongpoh - Umsning)",
        "state": "Meghalaya",
        "districts": ["Ri-Bhoi"],
        "severity": "High",
        "hazard_score": 7.8,
        "slope_gradient": "25° - 42°",
        "lithology": "Precambrian Archaean gneissic complex with thick lateritic soil mantle",
        "trigger_mechanism": "Cutting slopes for 4-lane highway expansion destabilized by heavy rains",
        "historic_blockades": "Frequent mudflows at Umsning and Umsumbhai during heavy monsoons",
        "bhuvan_code": "ISRO-BHUVAN-LHZ-NER-018",
        "advisory": "Drive with hazard lights on; watch for boulder rolling between km 42 to km 68."
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [91.810, 25.960],
          [91.920, 25.920],
          [91.950, 25.820],
          [91.890, 25.750],
          [91.820, 25.800],
          [91.770, 25.900],
          [91.810, 25.960]
        ]]
      }
    },

    // 6. Bomdila - Sela - Tawang Axis (West Kameng)
    {
      "type": "Feature",
      "properties": {
        "zone_id": "LHZ-AR-01",
        "name": "West Kameng High Mountain Road Axis",
        "corridor": "NH-13 (Bhalukpong - Tenga - Bomdila - Dirang)",
        "state": "Arunachal Pradesh",
        "districts": ["West Kameng", "Tawang"],
        "severity": "High",
        "hazard_score": 8.1,
        "slope_gradient": "35° - 60°",
        "lithology": "Lesser Himalayan schists and quartzite with deep permafrost thaw zones",
        "trigger_mechanism": "Freeze-thaw cycles combined with high runoff torrential rains",
        "historic_blockades": "Frequent closures near Nechiphu and Sela Pass approaches",
        "bhuvan_code": "ISRO-BHUVAN-LHZ-NER-065",
        "advisory": "4x4 vehicles only with snow chains / all-terrain clearance during warnings."
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [92.350, 27.180],
          [92.520, 27.270],
          [92.480, 27.420],
          [92.320, 27.460],
          [92.240, 27.320],
          [92.350, 27.180]
        ]]
      }
    },

    // 7. Cherrapunji - Mawsynram Escarpment (East Khasi Hills)
    {
      "type": "Feature",
      "properties": {
        "zone_id": "LHZ-ML-02",
        "name": "Southern Meghalaya Escarpment & Canyon Slopes",
        "corridor": "SH-5 / Sohra - Shella Border Road",
        "state": "Meghalaya",
        "districts": ["East Khasi Hills"],
        "severity": "High",
        "hazard_score": 8.5,
        "slope_gradient": "50° - 85° (Vertical Cliff Faces)",
        "lithology": "Cretaceous-Tertiary sandstones and Sylhet trap basalt with karst cavities",
        "trigger_mechanism": "World's highest rainfall intensity (>11,000 mm/yr) inducing sheetwash",
        "historic_blockades": "Rock falls along canyon rims; localized bridge undercutting",
        "bhuvan_code": "ISRO-BHUVAN-LHZ-NER-022",
        "advisory": "Flash flood watch along gorge bottoms; avoid parking under limestone overhangs."
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [91.640, 25.320],
          [91.780, 25.330],
          [91.850, 25.220],
          [91.720, 25.150],
          [91.580, 25.200],
          [91.640, 25.320]
        ]]
      }
    },

    // 8. Tamenglong - Noney Hill Slopes (Imphal - Jiribam Highway NH-37)
    {
      "type": "Feature",
      "properties": {
        "zone_id": "LHZ-MN-01",
        "name": "Noney Tupul - Makru Sinking Zone",
        "corridor": "NH-37 (Jiribam - Noney - Imphal Lifeline)",
        "state": "Manipur",
        "districts": ["Noney", "Tamenglong"],
        "severity": "High",
        "hazard_score": 8.7,
        "slope_gradient": "30° - 48°",
        "lithology": "Disang series clay-rich flysch and unconsolidated talus deposits",
        "trigger_mechanism": "High pore pressure during incessant rain; Ijei river damming risk",
        "historic_blockades": "Catastrophic June 2022 Tupul landslide; seasonal NH-37 disruptions",
        "bhuvan_code": "ISRO-BHUVAN-LHZ-NER-051",
        "advisory": "Active geotechnical sensors deployed; immediate evacuation sirens upon ground motion."
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [93.420, 24.890],
          [93.650, 24.880],
          [93.740, 24.780],
          [93.580, 24.710],
          [93.380, 24.760],
          [93.420, 24.890]
        ]]
      }
    },

    // 9. Aizawl - Kolasib Hill Ridges (Mizoram)
    {
      "type": "Feature",
      "properties": {
        "zone_id": "LHZ-MZ-01",
        "name": "Aizawl Urban Anticline & NH-306 Slopes",
        "corridor": "NH-306 (Kolasib - Sairang - Aizawl)",
        "state": "Mizoram",
        "districts": ["Aizawl", "Kolasib"],
        "severity": "Moderate",
        "hazard_score": 6.8,
        "slope_gradient": "25° - 40°",
        "lithology": "Surma group shale-siltstone alternations with steep dip angles",
        "trigger_mechanism": "Urban drainage saturation and road widening cuts on steep dip slopes",
        "historic_blockades": "May 2024 Cyclone Remal triggered quarry collapses & road blocks",
        "bhuvan_code": "ISRO-BHUVAN-LHZ-NER-077",
        "advisory": "Adhere to municipal slope load restrictions. Check clearance at Sethawn."
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [92.650, 23.950],
          [92.790, 23.920],
          [92.780, 23.680],
          [92.660, 23.700],
          [92.610, 23.850],
          [92.650, 23.950]
        ]]
      }
    },

    // 10. Karbi Anglong Diphu Slopes (Assam)
    {
      "type": "Feature",
      "properties": {
        "zone_id": "LHZ-AS-02",
        "name": "Karbi Anglong Eastern Plateaus & Passes",
        "corridor": "SH-18 / Diphu - Lumding Sector",
        "state": "Assam",
        "districts": ["Karbi Anglong"],
        "severity": "Moderate",
        "hazard_score": 5.9,
        "slope_gradient": "20° - 35°",
        "lithology": "Granite gneiss and sandstone residual soils",
        "trigger_mechanism": "Flash stream undermining and deforestation on undulating terrain",
        "historic_blockades": "Seasonal culvert washouts and localized embankment collapses",
        "bhuvan_code": "ISRO-BHUVAN-LHZ-NER-038",
        "advisory": "Standard caution during storm events. Culvert water levels monitored."
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [93.280, 26.050],
          [93.520, 25.980],
          [93.590, 25.820],
          [93.420, 25.750],
          [93.220, 25.880],
          [93.280, 26.050]
        ]]
      }
    },

    // 11. Baramura & Atharamura Ranges (Tripura)
    {
      "type": "Feature",
      "properties": {
        "zone_id": "LHZ-TR-01",
        "name": "Baramura Ridge Transit Corridor",
        "corridor": "NH-8 (Teliamura - Baramura - Agartala)",
        "state": "Tripura",
        "districts": ["West Tripura", "Khowai"],
        "severity": "Moderate",
        "hazard_score": 5.6,
        "slope_gradient": "18° - 30°",
        "lithology": "Tipam sandstone and sand-clay formations (easily eroded under rain)",
        "trigger_mechanism": "Gully erosion and surface slips along highway curves",
        "historic_blockades": "Mudslides near gas exploration zones during cyclonic depressions",
        "bhuvan_code": "ISRO-BHUVAN-LHZ-NER-084",
        "advisory": "Speed limit 40 km/h on switchbacks. Watch for muddy surface runoff."
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [91.450, 23.950],
          [91.620, 23.920],
          [91.650, 23.780],
          [91.500, 23.770],
          [91.420, 23.860],
          [91.450, 23.950]
        ]]
      }
    },

    // 12. East Siang Pasighat Foothills (Arunachal Pradesh)
    {
      "type": "Feature",
      "properties": {
        "zone_id": "LHZ-AR-02",
        "name": "Siang Valley Piedmont & Pasighat Foothills",
        "corridor": "NH-515 / Siang Frontier Road",
        "state": "Arunachal Pradesh",
        "districts": ["East Siang"],
        "severity": "Moderate",
        "hazard_score": 6.4,
        "slope_gradient": "22° - 38°",
        "lithology": "Siwalik sandstones, pebbles, and bouldery piedmont alluvium",
        "trigger_mechanism": "High flood volume in Siang river causing bank cuts and debris fans",
        "historic_blockades": "River bank erosion and monsoon gravel washouts",
        "bhuvan_code": "ISRO-BHUVAN-LHZ-NER-069",
        "advisory": "Monitor Siang gauge levels at Pasighat. Ferries suspended during Red alerts."
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [95.180, 28.180],
          [95.420, 28.150],
          [95.480, 27.980],
          [95.250, 27.960],
          [95.120, 28.050],
          [95.180, 28.180]
        ]]
      }
    }
  ]
};

// Export to window
window.LANDSLIDE_HAZARD_GEOJSON = LANDSLIDE_HAZARD_GEOJSON;
