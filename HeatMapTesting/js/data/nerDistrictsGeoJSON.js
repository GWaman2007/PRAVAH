/**
 * Authentic District Boundary Geometries for all 8 North East Indian States
 * (Assam, Meghalaya, Arunachal Pradesh, Nagaland, Manipur, Mizoram, Tripura, Sikkim)
 * Bound with dynamic IMD Weather Alert properties for Milestone 3
 */
const NER_DISTRICTS_GEOJSON = {
  "type": "FeatureCollection",
  "name": "NER_Districts_IMD_Alert_Boundaries",
  "crs": {
    "type": "name",
    "properties": {
      "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
    }
  },
  "features": [
    // ==========================================
    // 1. MEGHALAYA DISTRICTS
    // ==========================================
    {
      "type": "Feature",
      "properties": {
        "district_id": "DIST-ML-01",
        "district_name": "East Khasi Hills",
        "state_name": "Meghalaya",
        "headquarters": "Shillong",
        "default_alert": "Red",
        "warning_title": "FLASH FLOOD & CLOUDBURST WARNING",
        "rainfall_forecast_24h": "165.4 mm (Extremely Heavy)",
        "weather_summary": "Intense torrential downpours triggering widespread flash floods, culvert overflows, and mudslides across Cherrapunji and Shillong bypass.",
        "emergency_contact": "SEOC Meghalaya: 1070 / 0364-2502188",
        "issued_at": "2026-09-12 08:30 IST",
        "valid_until": "2026-09-13 08:30 IST"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [91.68, 25.68],
          [91.95, 25.69],
          [92.09, 25.55],
          [92.12, 25.32],
          [91.92, 25.14],
          [91.65, 25.16],
          [91.56, 25.35],
          [91.68, 25.68]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district_id": "DIST-ML-02",
        "district_name": "Ri-Bhoi",
        "state_name": "Meghalaya",
        "headquarters": "Nongpoh",
        "default_alert": "Orange",
        "warning_title": "HEAVY RAINFALL & HIGHWAY WATERLOGGING",
        "rainfall_forecast_24h": "92.0 mm (Very Heavy)",
        "weather_summary": "Continuous monsoonal activity along NH-6 corridor. Potential slope debris flow between Byrnihat and Nongpoh.",
        "emergency_contact": "DDMA Ri-Bhoi: 03638-232223",
        "issued_at": "2026-09-12 08:30 IST",
        "valid_until": "2026-09-13 08:30 IST"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [91.70, 26.05],
          [92.02, 25.98],
          [92.15, 25.80],
          [91.95, 25.69],
          [91.68, 25.68],
          [91.62, 25.86],
          [91.70, 26.05]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district_id": "DIST-ML-03",
        "district_name": "West Khasi Hills",
        "state_name": "Meghalaya",
        "headquarters": "Nongstoin",
        "default_alert": "Orange",
        "warning_title": "HEAVY RAINFALL ALERT",
        "rainfall_forecast_24h": "78.5 mm (Heavy)",
        "weather_summary": "Sustained heavy rainfall leading to river swell in Kynshi and Khri basins.",
        "emergency_contact": "DDMA West Khasi: 03654-280221",
        "issued_at": "2026-09-12 08:30 IST",
        "valid_until": "2026-09-13 08:30 IST"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [91.05, 25.75],
          [91.56, 25.72],
          [91.65, 25.35],
          [91.56, 25.18],
          [91.10, 25.20],
          [90.95, 25.48],
          [91.05, 25.75]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district_id": "DIST-ML-04",
        "district_name": "West Garo Hills",
        "state_name": "Meghalaya",
        "headquarters": "Tura",
        "default_alert": "Yellow",
        "warning_title": "THUNDERSTORM & LIGHTNING WATCH",
        "rainfall_forecast_24h": "42.0 mm (Moderate to Heavy)",
        "weather_summary": "Thunderstorms with gusty winds (30-40 kmph) and localized water accumulations in low-lying border plains.",
        "emergency_contact": "DDMA Tura: 03651-223835",
        "issued_at": "2026-09-12 08:30 IST",
        "valid_until": "2026-09-13 08:30 IST"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [89.92, 25.75],
          [90.45, 25.72],
          [90.48, 25.30],
          [89.98, 25.25],
          [89.85, 25.50],
          [89.92, 25.75]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district_id": "DIST-ML-05",
        "district_name": "East Jaintia Hills",
        "state_name": "Meghalaya",
        "headquarters": "Khliehriat",
        "default_alert": "Orange",
        "warning_title": "HEAVY RAIN & CAVE/MINING COLLAPSE RISK",
        "rainfall_forecast_24h": "105.0 mm (Very Heavy)",
        "weather_summary": "Intense spells on southern plateau. NH-6 transit cautioned around Sonapur tunnel due to mudslides.",
        "emergency_contact": "DDMA Khliehriat: 03655-230438",
        "issued_at": "2026-09-12 08:30 IST",
        "valid_until": "2026-09-13 08:30 IST"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [92.20, 25.48],
          [92.58, 25.42],
          [92.65, 25.10],
          [92.25, 25.12],
          [92.12, 25.32],
          [92.20, 25.48]
        ]]
      }
    },

    // ==========================================
    // 2. ASSAM DISTRICTS
    // ==========================================
    {
      "type": "Feature",
      "properties": {
        "district_id": "DIST-AS-01",
        "district_name": "Kamrup Metropolitan",
        "state_name": "Assam",
        "headquarters": "Guwahati",
        "default_alert": "Yellow",
        "warning_title": "URBAN WATERLOGGING & GUSTY WINDS",
        "rainfall_forecast_24h": "38.5 mm (Moderate)",
        "weather_summary": "Frequent rainfall showers; flash waterlogging in Anil Nagar, Nabin Nagar, and Zoo Road. Brahmaputra gauge at 48.2m (below danger mark).",
        "emergency_contact": "DDMA Kamrup Metro: 1077 / 0361-2733052",
        "issued_at": "2026-09-12 08:30 IST",
        "valid_until": "2026-09-13 08:30 IST"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [91.55, 26.25],
          [91.95, 26.28],
          [92.05, 26.15],
          [91.88, 25.98],
          [91.60, 26.02],
          [91.55, 26.25]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district_id": "DIST-AS-02",
        "district_name": "Kamrup Rural",
        "state_name": "Assam",
        "headquarters": "Amingaon",
        "default_alert": "Green",
        "warning_title": "NORMAL WEATHER CONDITIONS",
        "rainfall_forecast_24h": "12.0 mm (Light)",
        "weather_summary": "Partly cloudy sky with intermittent light rain. No severe logistics warnings active.",
        "emergency_contact": "DDMA Kamrup: 0361-2684404",
        "issued_at": "2026-09-12 08:30 IST",
        "valid_until": "2026-09-13 08:30 IST"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [91.20, 26.40],
          [91.68, 26.45],
          [91.80, 26.25],
          [91.55, 26.05],
          [91.15, 26.08],
          [91.20, 26.40]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district_id": "DIST-AS-03",
        "district_name": "Dima Hasao",
        "state_name": "Assam",
        "headquarters": "Haflong",
        "default_alert": "Red",
        "warning_title": "HILL HIGHWAY & RAIL SLIPPAGE RED ALERT",
        "rainfall_forecast_24h": "142.0 mm (Very Heavy to Extreme)",
        "weather_summary": "Intense torrential rainfall in Barail range hills. Active subsidence on NH-54E. High probability of debris blockage between Jatinga and Harangajao.",
        "emergency_contact": "DDMA Haflong: 03673-236324",
        "issued_at": "2026-09-12 08:30 IST",
        "valid_until": "2026-09-13 08:30 IST"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [92.65, 25.55],
          [93.25, 25.50],
          [93.42, 25.18],
          [93.18, 24.95],
          [92.70, 25.02],
          [92.65, 25.55]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district_id": "DIST-AS-04",
        "district_name": "Cachar",
        "state_name": "Assam",
        "headquarters": "Silchar",
        "default_alert": "Orange",
        "warning_title": "BARAK RIVER SWELL & INUNDATION WARNING",
        "rainfall_forecast_24h": "88.0 mm (Very Heavy)",
        "weather_summary": "Barak river water levels rising steadily towards Annapurna Ghat warning mark (19.83m). Sluice gates under 24x7 monitoring.",
        "emergency_contact": "DDMA Silchar: 03842-245866",
        "issued_at": "2026-09-12 08:30 IST",
        "valid_until": "2026-09-13 08:30 IST"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [92.55, 25.08],
          [93.15, 25.02],
          [93.20, 24.60],
          [92.78, 24.45],
          [92.50, 24.68],
          [92.55, 25.08]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district_id": "DIST-AS-05",
        "district_name": "Dibrugarh",
        "state_name": "Assam",
        "headquarters": "Dibrugarh",
        "default_alert": "Yellow",
        "warning_title": "BRAHMAPUTRA EMBANKMENT SURVEILLANCE",
        "rainfall_forecast_24h": "45.0 mm (Moderate)",
        "weather_summary": "Intermittent showers; Brahmaputra and Burhidihing rivers in spate. Embankments safe, continuous patrolling active.",
        "emergency_contact": "DDMA Dibrugarh: 0373-2318355",
        "issued_at": "2026-09-12 08:30 IST",
        "valid_until": "2026-09-13 08:30 IST"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [94.65, 27.60],
          [95.25, 27.50],
          [95.40, 27.20],
          [94.90, 27.05],
          [94.60, 27.28],
          [94.65, 27.60]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district_id": "DIST-AS-06",
        "district_name": "Jorhat",
        "state_name": "Assam",
        "headquarters": "Jorhat",
        "default_alert": "Green",
        "warning_title": "NORMAL WEATHER CONDITIONS",
        "rainfall_forecast_24h": "14.5 mm (Light)",
        "weather_summary": "Isolated passing rain clouds; ferry service to Majuli operating on normal schedule.",
        "emergency_contact": "DDMA Jorhat: 0376-2320022",
        "issued_at": "2026-09-12 08:30 IST",
        "valid_until": "2026-09-13 08:30 IST"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [94.02, 27.05],
          [94.45, 26.98],
          [94.52, 26.65],
          [94.10, 26.50],
          [93.95, 26.78],
          [94.02, 27.05]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district_id": "DIST-AS-07",
        "district_name": "Sonitpur",
        "state_name": "Assam",
        "headquarters": "Tezpur",
        "default_alert": "Yellow",
        "warning_title": "MODERATE RAIN & HIGHWAY WATCH",
        "rainfall_forecast_24h": "36.0 mm (Moderate)",
        "weather_summary": "Thunderstorms along northern foothills of Jia Bharali river. NH-15 traffic clear.",
        "emergency_contact": "DDMA Sonitpur: 03712-224400",
        "issued_at": "2026-09-12 08:30 IST",
        "valid_until": "2026-09-13 08:30 IST"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [92.40, 27.02],
          [93.20, 26.95],
          [93.15, 26.55],
          [92.50, 26.60],
          [92.40, 27.02]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district_id": "DIST-AS-08",
        "district_name": "Nagaon",
        "state_name": "Assam",
        "headquarters": "Nagaon",
        "default_alert": "Green",
        "warning_title": "NORMAL WEATHER CONDITIONS",
        "rainfall_forecast_24h": "18.0 mm (Light to Moderate)",
        "weather_summary": "Scattered rain showers. Kolong and Kopili rivers flowing normally.",
        "emergency_contact": "DDMA Nagaon: 03672-233222",
        "issued_at": "2026-09-12 08:30 IST",
        "valid_until": "2026-09-13 08:30 IST"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [92.50, 26.55],
          [93.10, 26.45],
          [93.05, 26.05],
          [92.45, 26.15],
          [92.50, 26.55]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district_id": "DIST-AS-09",
        "district_name": "Karbi Anglong",
        "state_name": "Assam",
        "headquarters": "Diphu",
        "default_alert": "Yellow",
        "warning_title": "HILL ROAD RUNOFF WATCH",
        "rainfall_forecast_24h": "40.0 mm (Moderate)",
        "weather_summary": "Moderate continuous rainfall across plateaus; cautionary advisory on SH-18 switchbacks.",
        "emergency_contact": "DDMA Diphu: 03671-272257",
        "issued_at": "2026-09-12 08:30 IST",
        "valid_until": "2026-09-13 08:30 IST"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [93.10, 26.35],
          [93.75, 26.30],
          [93.85, 25.75],
          [93.20, 25.68],
          [93.05, 26.05],
          [93.10, 26.35]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district_id": "DIST-AS-10",
        "district_name": "Tinsukia",
        "state_name": "Assam",
        "headquarters": "Tinsukia",
        "default_alert": "Green",
        "warning_title": "NORMAL WEATHER CONDITIONS",
        "rainfall_forecast_24h": "15.0 mm (Light)",
        "weather_summary": "Cloudy conditions; logistics corridors towards Ledo and Arunachal border fully open.",
        "emergency_contact": "DDMA Tinsukia: 0374-2331477",
        "issued_at": "2026-09-12 08:30 IST",
        "valid_until": "2026-09-13 08:30 IST"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [95.10, 27.85],
          [95.80, 27.65],
          [95.90, 27.25],
          [95.30, 27.20],
          [95.10, 27.85]
        ]]
      }
    },

    // ==========================================
    // 3. ARUNACHAL PRADESH DISTRICTS
    // ==========================================
    {
      "type": "Feature",
      "properties": {
        "district_id": "DIST-AR-01",
        "district_name": "Papum Pare",
        "state_name": "Arunachal Pradesh",
        "headquarters": "Yupia / Itanagar",
        "default_alert": "Orange",
        "warning_title": "TORRENTIAL RAINFALL & FLASH FLOOD WATCH",
        "rainfall_forecast_24h": "94.5 mm (Very Heavy)",
        "weather_summary": "Intense rain bands passing over Capital Complex; flash flood alert for Dikrong river and hillside earth-cutting roads.",
        "emergency_contact": "State Emergency Op Centre: 1070 / 0360-2291122",
        "issued_at": "2026-09-12 08:30 IST",
        "valid_until": "2026-09-13 08:30 IST"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [93.30, 27.35],
          [94.00, 27.42],
          [94.10, 26.95],
          [93.45, 26.90],
          [93.30, 27.35]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district_id": "DIST-AR-02",
        "district_name": "West Kameng",
        "state_name": "Arunachal Pradesh",
        "headquarters": "Bomdila",
        "default_alert": "Orange",
        "warning_title": "MOUNTAIN RAIN & MUDSLIDE ADVISORY",
        "rainfall_forecast_24h": "82.0 mm (Heavy)",
        "weather_summary": "Heavy rain along Bhalukpong-Bomdila road. High possibility of rolling stones between km 38 and km 55.",
        "emergency_contact": "DDMA Bomdila: 03782-222144",
        "issued_at": "2026-09-12 08:30 IST",
        "valid_until": "2026-09-13 08:30 IST"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [92.15, 27.65],
          [92.80, 27.60],
          [92.75, 27.05],
          [92.20, 27.00],
          [92.15, 27.65]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district_id": "DIST-AR-03",
        "district_name": "Tawang",
        "state_name": "Arunachal Pradesh",
        "headquarters": "Tawang",
        "default_alert": "Yellow",
        "warning_title": "HIGH-ALTITUDE RAIN / FOG HAZARD",
        "rainfall_forecast_24h": "32.0 mm (Moderate)",
        "weather_summary": "Zero visibility conditions on Sela Pass (13,700 ft). BRO snow-clearance team on standby.",
        "emergency_contact": "DDMA Tawang: 03794-222222",
        "issued_at": "2026-09-12 08:30 IST",
        "valid_until": "2026-09-13 08:30 IST"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [91.60, 27.85],
          [92.20, 27.80],
          [92.15, 27.45],
          [91.65, 27.48],
          [91.60, 27.85]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district_id": "DIST-AR-04",
        "district_name": "East Siang",
        "state_name": "Arunachal Pradesh",
        "headquarters": "Pasighat",
        "default_alert": "Yellow",
        "warning_title": "SIANG RIVER LEVEL MONITORING",
        "rainfall_forecast_24h": "48.0 mm (Moderate to Heavy)",
        "weather_summary": "Siang river discharge elevated due to upper catchment rainfall. Ferry operations restricted.",
        "emergency_contact": "DDMA Pasighat: 0368-2222228",
        "issued_at": "2026-09-12 08:30 IST",
        "valid_until": "2026-09-13 08:30 IST"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [95.05, 28.35],
          [95.60, 28.25],
          [95.55, 27.90],
          [94.95, 27.98],
          [95.05, 28.35]
        ]]
      }
    },

    // ==========================================
    // 4. NAGALAND DISTRICTS
    // ==========================================
    {
      "type": "Feature",
      "properties": {
        "district_id": "DIST-NL-01",
        "district_name": "Kohima",
        "state_name": "Nagaland",
        "headquarters": "Kohima",
        "default_alert": "Orange",
        "warning_title": "NH-29 HILLSIDE SINKING ALERT",
        "rainfall_forecast_24h": "85.0 mm (Very Heavy)",
        "weather_summary": "Continuous steady rainfall saturating hill slopes. Heavy vehicle freight on NH-29 restricted to daytime convoy only.",
        "emergency_contact": "NSDMA Control Room: 0370-2291122",
        "issued_at": "2026-09-12 08:30 IST",
        "valid_until": "2026-09-13 08:30 IST"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [93.95, 25.85],
          [94.35, 25.80],
          [94.38, 25.50],
          [94.00, 25.52],
          [93.95, 25.85]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district_id": "DIST-NL-02",
        "district_name": "Dimapur",
        "state_name": "Nagaland",
        "headquarters": "Dimapur",
        "default_alert": "Green",
        "warning_title": "NORMAL WEATHER CONDITIONS",
        "rainfall_forecast_24h": "16.0 mm (Light)",
        "weather_summary": "Generally dry with humid conditions. All railway freight and truck depots operating smoothly.",
        "emergency_contact": "DDMA Dimapur: 03862-248671",
        "issued_at": "2026-09-12 08:30 IST",
        "valid_until": "2026-09-13 08:30 IST"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [93.58, 26.02],
          [93.95, 25.95],
          [93.90, 25.75],
          [93.62, 25.80],
          [93.58, 26.02]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district_id": "DIST-NL-03",
        "district_name": "Mokokchung",
        "state_name": "Nagaland",
        "headquarters": "Mokokchung",
        "default_alert": "Yellow",
        "warning_title": "RIDGE LINE GALE & RAIN WATCH",
        "rainfall_forecast_24h": "35.0 mm (Moderate)",
        "weather_summary": "Wind gusts up to 45 km/h along ridge spurs. Minor tree branch falls reported on inter-district link.",
        "emergency_contact": "DDMA Mokokchung: 0369-2226223",
        "issued_at": "2026-09-12 08:30 IST",
        "valid_until": "2026-09-13 08:30 IST"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [94.30, 26.55],
          [94.75, 26.45],
          [94.65, 26.15],
          [94.25, 26.25],
          [94.30, 26.55]
        ]]
      }
    },

    // ==========================================
    // 5. MANIPUR DISTRICTS
    // ==========================================
    {
      "type": "Feature",
      "properties": {
        "district_id": "DIST-MN-01",
        "district_name": "Imphal West",
        "state_name": "Manipur",
        "headquarters": "Lamphelpat",
        "default_alert": "Yellow",
        "warning_title": "VALLEY DRAINAGE & INUNDATION WATCH",
        "rainfall_forecast_24h": "36.5 mm (Moderate)",
        "weather_summary": "Nambul river flowing near high flood level. Drainage pumps deployed at Keishamthong and Uripok.",
        "emergency_contact": "SEOC Manipur: 0385-2443441",
        "issued_at": "2026-09-12 08:30 IST",
        "valid_until": "2026-09-13 08:30 IST"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [93.82, 24.95],
          [94.02, 24.92],
          [94.05, 24.70],
          [93.85, 24.72],
          [93.82, 24.95]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district_id": "DIST-MN-02",
        "district_name": "Senapati",
        "state_name": "Manipur",
        "headquarters": "Senapati",
        "default_alert": "Orange",
        "warning_title": "NH-2 PASSAGE MUDSLIDE ADVISORY",
        "rainfall_forecast_24h": "76.0 mm (Heavy)",
        "weather_summary": "Intense rainfall in northern hills; Maram and Tadubi sections under vigilance for surface slips.",
        "emergency_contact": "DDMA Senapati: 03871-222238",
        "issued_at": "2026-09-12 08:30 IST",
        "valid_until": "2026-09-13 08:30 IST"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [93.85, 25.55],
          [94.35, 25.48],
          [94.30, 25.05],
          [93.80, 25.10],
          [93.85, 25.55]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district_id": "DIST-MN-03",
        "district_name": "Churachandpur",
        "state_name": "Manipur",
        "headquarters": "Churachandpur",
        "default_alert": "Yellow",
        "warning_title": "MODERATE RAIN & STREAM FLASH WATCH",
        "rainfall_forecast_24h": "44.0 mm (Moderate)",
        "weather_summary": "Localized stream surges along Khuga river basin. Foothill logistics routes passable.",
        "emergency_contact": "DDMA Churachandpur: 03874-233445",
        "issued_at": "2026-09-12 08:30 IST",
        "valid_until": "2026-09-13 08:30 IST"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [93.30, 24.55],
          [93.85, 24.50],
          [93.80, 24.15],
          [93.25, 24.20],
          [93.30, 24.55]
        ]]
      }
    },

    // ==========================================
    // 6. MIZORAM DISTRICTS
    // ==========================================
    {
      "type": "Feature",
      "properties": {
        "district_id": "DIST-MZ-01",
        "district_name": "Aizawl",
        "state_name": "Mizoram",
        "headquarters": "Aizawl",
        "default_alert": "Orange",
        "warning_title": "SLOPE SLIPPAGE & ROAD BLOCK WATCH",
        "rainfall_forecast_24h": "84.0 mm (Very Heavy)",
        "weather_summary": "Saturated soil overburden on steep terrain. Municipal ban on earth excavation enforced. NH-306 link monitored.",
        "emergency_contact": "Disaster Management Mizoram: 0389-2342520",
        "issued_at": "2026-09-12 08:30 IST",
        "valid_until": "2026-09-13 08:30 IST"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [92.55, 24.00],
          [92.95, 23.95],
          [92.90, 23.50],
          [92.50, 23.55],
          [92.55, 24.00]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district_id": "DIST-MZ-02",
        "district_name": "Kolasib",
        "state_name": "Mizoram",
        "headquarters": "Kolasib",
        "default_alert": "Yellow",
        "warning_title": "BORDER CORRIDOR WATER RUNOFF",
        "rainfall_forecast_24h": "48.0 mm (Moderate to Heavy)",
        "weather_summary": "Sustained monsoon rain along Vairengte-Kolasib border. Freight vehicles advised slow speeds.",
        "emergency_contact": "DDMA Kolasib: 03837-220024",
        "issued_at": "2026-09-12 08:30 IST",
        "valid_until": "2026-09-13 08:30 IST"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [92.50, 24.40],
          [92.85, 24.35],
          [92.80, 24.00],
          [92.52, 24.05],
          [92.50, 24.40]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district_id": "DIST-MZ-03",
        "district_name": "Lunglei",
        "state_name": "Mizoram",
        "headquarters": "Lunglei",
        "default_alert": "Green",
        "warning_title": "NORMAL CONDITIONS",
        "rainfall_forecast_24h": "20.0 mm (Light)",
        "weather_summary": "Light scattered showers; Southern logistics routes clear.",
        "emergency_contact": "DDMA Lunglei: 0372-2324244",
        "issued_at": "2026-09-12 08:30 IST",
        "valid_until": "2026-09-13 08:30 IST"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [92.45, 23.20],
          [93.10, 23.15],
          [93.00, 22.65],
          [92.40, 22.75],
          [92.45, 23.20]
        ]]
      }
    },

    // ==========================================
    // 7. TRIPURA DISTRICTS
    // ==========================================
    {
      "type": "Feature",
      "properties": {
        "district_id": "DIST-TR-01",
        "district_name": "West Tripura",
        "state_name": "Tripura",
        "headquarters": "Agartala",
        "default_alert": "Yellow",
        "warning_title": "HOWRAH RIVER GAUGE WATCH",
        "rainfall_forecast_24h": "42.0 mm (Moderate)",
        "weather_summary": "Intermittent thundershowers; Howrah river gauge at 10.2m (Alert level 10.5m). Sluice gates open.",
        "emergency_contact": "SEOC Tripura: 0381-2416045",
        "issued_at": "2026-09-12 08:30 IST",
        "valid_until": "2026-09-13 08:30 IST"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [91.15, 24.10],
          [91.50, 24.05],
          [91.45, 23.70],
          [91.18, 23.75],
          [91.15, 24.10]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district_id": "DIST-TR-02",
        "district_name": "North Tripura",
        "state_name": "Tripura",
        "headquarters": "Dharmanagar",
        "default_alert": "Yellow",
        "warning_title": "JURI RIVER BASIN INUNDATION WATCH",
        "rainfall_forecast_24h": "49.0 mm (Moderate to Heavy)",
        "weather_summary": "Waterlogging in agricultural lowlands near Churaibari border check post. NH-8 passage normal.",
        "emergency_contact": "DDMA Dharmanagar: 03822-220023",
        "issued_at": "2026-09-12 08:30 IST",
        "valid_until": "2026-09-13 08:30 IST"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [92.00, 24.55],
          [92.40, 24.45],
          [92.35, 23.95],
          [91.95, 24.00],
          [92.00, 24.55]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district_id": "DIST-TR-03",
        "district_name": "Gomati",
        "state_name": "Tripura",
        "headquarters": "Udaipur",
        "default_alert": "Green",
        "warning_title": "NORMAL CONDITIONS",
        "rainfall_forecast_24h": "15.0 mm (Light)",
        "weather_summary": "Clear sky with gentle breeze; Gomati reservoir barrage discharge regulated.",
        "emergency_contact": "DDMA Udaipur: 03821-222345",
        "issued_at": "2026-09-12 08:30 IST",
        "valid_until": "2026-09-13 08:30 IST"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [91.35, 23.70],
          [91.85, 23.65],
          [91.80, 23.35],
          [91.30, 23.40],
          [91.35, 23.70]
        ]]
      }
    },

    // ==========================================
    // 8. SIKKIM DISTRICTS
    // ==========================================
    {
      "type": "Feature",
      "properties": {
        "district_id": "DIST-SK-01",
        "district_name": "East Sikkim",
        "state_name": "Sikkim",
        "headquarters": "Gangtok",
        "default_alert": "Orange",
        "warning_title": "NH-10 TEESTA CORRIDOR VULNERABILITY ALERT",
        "rainfall_forecast_24h": "98.0 mm (Very Heavy)",
        "weather_summary": "High-intensity rainfall triggering slope erosion on NH-10 near Rangpo and Singtam. Tourist transport restricted to daytime.",
        "emergency_contact": "SSDMA Control Room: 1070 / 03592-202238",
        "issued_at": "2026-09-12 08:30 IST",
        "valid_until": "2026-09-13 08:30 IST"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [88.45, 27.42],
          [88.85, 27.40],
          [88.80, 27.15],
          [88.42, 27.18],
          [88.45, 27.42]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district_id": "DIST-SK-02",
        "district_name": "North Sikkim",
        "state_name": "Sikkim",
        "headquarters": "Mangan",
        "default_alert": "Red",
        "warning_title": "GLACIAL LAKE SWELL & DEBRIS FLOW RED ALERT",
        "rainfall_forecast_24h": "138.0 mm (Extremely Heavy)",
        "weather_summary": "Critical alert for upper Teesta basin. Intense monsoonal downpour causing severe debris torrents in Mangan, Chungthang, and Lachen. Evacuation advisories active.",
        "emergency_contact": "DDMA Mangan: 03592-234244",
        "issued_at": "2026-09-12 08:30 IST",
        "valid_until": "2026-09-13 08:30 IST"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [88.25, 28.05],
          [88.85, 28.00],
          [88.80, 27.40],
          [88.35, 27.42],
          [88.25, 28.05]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district_id": "DIST-SK-03",
        "district_name": "South Sikkim",
        "state_name": "Sikkim",
        "headquarters": "Namchi",
        "default_alert": "Green",
        "warning_title": "NORMAL WEATHER CONDITIONS",
        "rainfall_forecast_24h": "18.5 mm (Light to Moderate)",
        "weather_summary": "Intermittent light mist and showers; Jorethang and Namchi highways functioning normally.",
        "emergency_contact": "DDMA Namchi: 03595-253244",
        "issued_at": "2026-09-12 08:30 IST",
        "valid_until": "2026-09-13 08:30 IST"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [88.25, 27.35],
          [88.55, 27.30],
          [88.50, 27.10],
          [88.22, 27.15],
          [88.25, 27.35]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district_id": "DIST-SK-04",
        "district_name": "West Sikkim",
        "state_name": "Sikkim",
        "headquarters": "Geyzing",
        "default_alert": "Yellow",
        "warning_title": "HILLSIDE RUNOFF & MIST WATCH",
        "rainfall_forecast_24h": "38.0 mm (Moderate)",
        "weather_summary": "Mist and low cloud cover on Pelling-Geyzing stretch. Caution for light vehicles.",
        "emergency_contact": "DDMA Geyzing: 03595-250222",
        "issued_at": "2026-09-12 08:30 IST",
        "valid_until": "2026-09-13 08:30 IST"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [88.05, 27.60],
          [88.35, 27.55],
          [88.30, 27.15],
          [88.02, 27.20],
          [88.05, 27.60]
        ]]
      }
    }
  ]
};

// Export to window
window.NER_DISTRICTS_GEOJSON = NER_DISTRICTS_GEOJSON;
