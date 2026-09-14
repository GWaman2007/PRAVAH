import type { ChokePoint } from '../types';

export const LANDSLIDE_HAZARD_GEOJSON: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        zone_id: "LHZ-NL-01",
        name: "NH-29 Kohima-Dimapur Sinking Zone",
        corridor: "NH-29 (Chumukedima - Zubza - Kohima)",
        state: "Nagaland",
        districts: ["Kohima", "Dimapur", "Chumukedima"],
        severity: "Very High",
        hazard_score: 9.4,
        slope_gradient: "35° - 55°",
        lithology: "Disang shales interbedded with splintery mudstones",
        trigger_mechanism: "Continuous monsoonal pore pressure and toe erosion by Chathe river",
        bhuvan_code: "ISRO-BHUVAN-LHZ-NER-042",
        advisory: "Strict convoy control during precipitation > 20mm/hr. Heavy machinery stationed."
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
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
    {
      type: "Feature",
      properties: {
        zone_id: "LHZ-SK-01",
        name: "NH-10 Teesta River Canyon Slide Belt",
        corridor: "NH-10 (Sevoke - Teesta Bazar - Rangpo - Singtam)",
        state: "Sikkim & WB Border",
        districts: ["East Sikkim", "Pakyong", "Kalimpong"],
        severity: "Very High",
        hazard_score: 9.6,
        slope_gradient: "45° - 70°",
        lithology: "Daling group phyllites and quartzites sheared along Main Central Thrust",
        trigger_mechanism: "Runoff scour from Lhonak Lake GLOF aftermath combined with monsoon river swelling",
        bhuvan_code: "ISRO-BHUVAN-LHZ-NER-018",
        advisory: "Critical lifeline route. All heavy traffic diverted via Lava-Algarah corridor during red alerts."
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [88.430, 26.900],
          [88.480, 26.930],
          [88.460, 27.020],
          [88.500, 27.060],
          [88.530, 27.180],
          [88.500, 27.240],
          [88.460, 27.150],
          [88.420, 27.040],
          [88.410, 26.950],
          [88.430, 26.900]
        ]]
      }
    },
    {
      type: "Feature",
      properties: {
        zone_id: "LHZ-AS-01",
        name: "NH-27 Lumding-Haflong Barail Hill Cut",
        corridor: "NH-27 (Lumding - Haflong - Silchar)",
        state: "Assam",
        districts: ["Dima Hasao", "Cachar"],
        severity: "Very High",
        hazard_score: 9.1,
        slope_gradient: "30° - 50°",
        lithology: "Tertiary sedimentary rocks, highly jointed sandstone and friable clay beds",
        trigger_mechanism: "Massive rotational slips and road subsidence at Jatinga and Harangajao",
        bhuvan_code: "ISRO-BHUVAN-LHZ-NER-031",
        advisory: "Sole multi-lane freight lifeline for Barak Valley, Tripura & Mizoram. Preemptive Bailey bridge kits staged."
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [92.950, 25.350],
          [93.100, 25.280],
          [93.200, 25.180],
          [93.150, 25.050],
          [93.000, 25.100],
          [92.880, 25.220],
          [92.950, 25.350]
        ]]
      }
    },
    {
      type: "Feature",
      properties: {
        zone_id: "LHZ-ML-01",
        name: "NH-6 Sonapur Tunnel - Ratacherra Slide Zone",
        corridor: "NH-6 (Jowai - Sonapur - Badarpur)",
        state: "Meghalaya",
        districts: ["East Jaintia Hills"],
        severity: "High",
        hazard_score: 8.7,
        slope_gradient: "40° - 60°",
        lithology: "Carbonaceous shales and limestone karsts prone to rapid subsurface saturation",
        trigger_mechanism: "Sonapur river torrential overflow blocking tunnel portal mouths with mud debris",
        bhuvan_code: "ISRO-BHUVAN-LHZ-NER-055",
        advisory: "Escorted convoys through Sonapur tunnel. BRO Project Setuk earthmovers on standby 24/7."
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [92.350, 25.200],
          [92.450, 25.150],
          [92.550, 25.080],
          [92.480, 25.020],
          [92.380, 25.070],
          [92.300, 25.140],
          [92.350, 25.200]
        ]]
      }
    },
    {
      type: "Feature",
      properties: {
        zone_id: "LHZ-MZ-01",
        name: "NH-306 Bilkhawthlir Hill Escarpment",
        corridor: "NH-306 (Silchar - Vairengte - Kolasib)",
        state: "Mizoram",
        districts: ["Kolasib"],
        severity: "High",
        hazard_score: 8.4,
        slope_gradient: "35° - 48°",
        lithology: "Soft Surma group sandstones alternating with silt-laminated mudstones",
        trigger_mechanism: "Gully erosion and slope creep triggered by rainfall > 25mm/hr",
        bhuvan_code: "ISRO-BHUVAN-LHZ-NER-077",
        advisory: "Single-lane bottleneck. Maximum axle load strictly limited to 16.2 Tonnes during monsoon."
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [92.700, 24.320],
          [92.780, 24.280],
          [92.750, 24.180],
          [92.680, 24.220],
          [92.700, 24.320]
        ]]
      }
    },
    {
      type: "Feature",
      properties: {
        zone_id: "LHZ-MN-01",
        name: "NH-37 Imphal-Jiribam Mudflow Belt (Noney & Makru)",
        corridor: "NH-37 (Jiribam - Noney - Imphal)",
        state: "Manipur",
        districts: ["Noney", "Tamenglong"],
        severity: "High",
        hazard_score: 8.6,
        slope_gradient: "30° - 55°",
        lithology: "Heavily fractured Disang shales and weathered talus deposits",
        trigger_mechanism: "Heavy flash showers destabilising deep cut slopes over Makru and Barak bridges",
        bhuvan_code: "ISRO-BHUVAN-LHZ-NER-063",
        advisory: "Armed escort convoys move in scheduled morning/evening batches. Emergency recovery cranes deployed."
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [93.420, 24.850],
          [93.650, 24.820],
          [93.750, 24.780],
          [93.680, 24.700],
          [93.500, 24.740],
          [93.420, 24.850]
        ]]
      }
    }
  ]
};

export const NER_DISTRICTS_GEOJSON: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        district_id: "DIST-ML-01",
        district_name: "East Khasi Hills",
        state_name: "Meghalaya",
        headquarters: "Shillong",
        default_alert: "Red",
        warning_title: "FLASH FLOOD & CLOUDBURST WARNING",
        rainfall_forecast_24h: "165.4 mm (Extremely Heavy)",
        weather_summary: "Intense torrential downpours triggering widespread flash floods and mudslides across Shillong bypass.",
        emergency_contact: "SEOC Meghalaya: 1070 / 0364-2502188",
        issued_at: "2026-09-13 08:30 IST",
        valid_until: "2026-09-14 08:30 IST"
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
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
      type: "Feature",
      properties: {
        district_id: "DIST-ML-02",
        district_name: "Ri Bhoi",
        state_name: "Meghalaya",
        headquarters: "Nongpoh",
        default_alert: "Orange",
        warning_title: "LANDSLIDE WARNING ON NH-6 / NH-106",
        rainfall_forecast_24h: "98.2 mm (Very Heavy)",
        weather_summary: "Heavy squalls across Umsning and Nongpoh ghats. Slope toe instability observed along Umiam Lake spur.",
        emergency_contact: "Ri Bhoi DDMA: 03638-232223",
        issued_at: "2026-09-13 08:30 IST",
        valid_until: "2026-09-14 08:30 IST"
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [91.75, 26.05],
          [91.98, 26.08],
          [92.15, 25.85],
          [91.95, 25.69],
          [91.68, 25.68],
          [91.75, 26.05]
        ]]
      }
    },
    {
      type: "Feature",
      properties: {
        district_id: "DIST-NL-01",
        district_name: "Kohima",
        state_name: "Nagaland",
        headquarters: "Kohima",
        default_alert: "Red",
        warning_title: "CRITICAL HIGHWAY COLLAPSE HAZARD",
        rainfall_forecast_24h: "142.0 mm (Extremely Heavy)",
        weather_summary: "Severe sinking and boulder rolls on NH-29 Pagla Pahar and Phesama. Transport convoys completely halted.",
        emergency_contact: "Nagaland NSDMA: 1070 / 0370-2270050",
        issued_at: "2026-09-13 06:00 IST",
        valid_until: "2026-09-14 06:00 IST"
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [93.95, 25.85],
          [94.25, 25.88],
          [94.38, 25.65],
          [94.18, 25.48],
          [93.92, 25.55],
          [93.95, 25.85]
        ]]
      }
    },
    {
      type: "Feature",
      properties: {
        district_id: "DIST-NL-02",
        district_name: "Dimapur",
        state_name: "Nagaland",
        headquarters: "Dimapur",
        default_alert: "Orange",
        warning_title: "DHANSIRI RIVER OVERFLOW WARNING",
        rainfall_forecast_24h: "85.0 mm (Heavy)",
        weather_summary: "Dhansiri river swollen near Khatkhati border. Inundation of low-lying rail yard and freight terminal.",
        emergency_contact: "Dimapur District Control: 03862-248555",
        issued_at: "2026-09-13 08:30 IST",
        valid_until: "2026-09-14 08:30 IST"
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [93.65, 25.98],
          [93.88, 26.02],
          [93.95, 25.85],
          [93.75, 25.75],
          [93.65, 25.98]
        ]]
      }
    },
    {
      type: "Feature",
      properties: {
        district_id: "DIST-SK-01",
        district_name: "North Sikkim",
        state_name: "Sikkim",
        headquarters: "Mangan",
        default_alert: "Red",
        warning_title: "GLACIAL OUTFLOW & CLOUDBURST ALERT",
        rainfall_forecast_24h: "185.0 mm (Extremely Heavy)",
        weather_summary: "Teesta basin breaching at Chungthang. High risk of debris flow on Mangan-Lachen axis.",
        emergency_contact: "Sikkim SSDMA: 1070 / 03592-202461",
        issued_at: "2026-09-13 05:00 IST",
        valid_until: "2026-09-14 05:00 IST"
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [88.35, 27.95],
          [88.85, 27.98],
          [88.75, 27.50],
          [88.45, 27.42],
          [88.25, 27.65],
          [88.35, 27.95]
        ]]
      }
    },
    {
      type: "Feature",
      properties: {
        district_id: "DIST-SK-02",
        district_name: "East Sikkim",
        state_name: "Sikkim",
        headquarters: "Gangtok",
        default_alert: "Orange",
        warning_title: "GANGTOK-SEVOKE HIGHWAY RESTRICTIONS",
        rainfall_forecast_24h: "92.0 mm (Heavy)",
        weather_summary: "Intermittent rockfalls along 29th Mile Teesta Canyon. Night transport banned.",
        emergency_contact: "East Sikkim Control: 03592-284444",
        issued_at: "2026-09-13 08:30 IST",
        valid_until: "2026-09-14 08:30 IST"
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [88.45, 27.42],
          [88.75, 27.50],
          [88.82, 27.22],
          [88.52, 27.18],
          [88.45, 27.42]
        ]]
      }
    },
    {
      type: "Feature",
      properties: {
        district_id: "DIST-AS-01",
        district_name: "Kamrup Metropolitan",
        state_name: "Assam",
        headquarters: "Guwahati",
        default_alert: "Yellow",
        warning_title: "URBAN WATERLOGGING & SQUALLS",
        rainfall_forecast_24h: "54.5 mm (Moderate)",
        weather_summary: "Localized waterlogging in Jalukbari and Anil Nagar. Brahmaputra flowing at warning mark.",
        emergency_contact: "ASDMA State Emergency Ops: 1079 / 1070",
        issued_at: "2026-09-13 08:30 IST",
        valid_until: "2026-09-14 08:30 IST"
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [91.55, 26.25],
          [91.95, 26.28],
          [91.98, 26.08],
          [91.65, 26.05],
          [91.55, 26.25]
        ]]
      }
    },
    {
      type: "Feature",
      properties: {
        district_id: "DIST-AS-02",
        district_name: "Dima Hasao",
        state_name: "Assam",
        headquarters: "Haflong",
        default_alert: "Red",
        warning_title: "CATASTROPHIC HILL SLOPE SUBSIDENCE",
        rainfall_forecast_24h: "155.0 mm (Extremely Heavy)",
        weather_summary: "Major subsidence on NH-27 between Jatinga and Harangajao. Trans-Barak freight corridor blocked.",
        emergency_contact: "Dima Hasao DDMA: 03673-236324",
        issued_at: "2026-09-13 07:00 IST",
        valid_until: "2026-09-14 07:00 IST"
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [92.75, 25.55],
          [93.25, 25.62],
          [93.35, 25.15],
          [92.85, 25.08],
          [92.75, 25.55]
        ]]
      }
    },
    {
      type: "Feature",
      properties: {
        district_id: "DIST-AS-03",
        district_name: "Cachar",
        state_name: "Assam",
        headquarters: "Silchar",
        default_alert: "Orange",
        warning_title: "BARAK RIVER FLASH INUNDATION",
        rainfall_forecast_24h: "88.0 mm (Very Heavy)",
        weather_summary: "Barak river water levels crossing danger level at Annapurna Ghat. Low-lying warehousing submerged.",
        emergency_contact: "Cachar DDMA Control: 03842-245866",
        issued_at: "2026-09-13 08:30 IST",
        valid_until: "2026-09-14 08:30 IST"
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [92.65, 25.10],
          [93.15, 25.12],
          [93.18, 24.65],
          [92.68, 24.60],
          [92.65, 25.10]
        ]]
      }
    },
    {
      type: "Feature",
      properties: {
        district_id: "DIST-MZ-01",
        district_name: "Kolasib",
        state_name: "Mizoram",
        headquarters: "Kolasib",
        default_alert: "Red",
        warning_title: "HIGHWAY CORRIDOR SEVERED",
        rainfall_forecast_24h: "148.0 mm (Extremely Heavy)",
        weather_summary: "NH-306 severed near Bilkhawthlir. Single road connection to Assam cut; medical oxygen buffer critical.",
        emergency_contact: "Mizoram SDMA: 0389-2335842",
        issued_at: "2026-09-13 06:30 IST",
        valid_until: "2026-09-14 06:30 IST"
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [92.55, 24.35],
          [92.85, 24.38],
          [92.88, 24.05],
          [92.58, 24.00],
          [92.55, 24.35]
        ]]
      }
    },
    {
      type: "Feature",
      properties: {
        district_id: "DIST-MZ-02",
        district_name: "Aizawl",
        state_name: "Mizoram",
        headquarters: "Aizawl",
        default_alert: "Orange",
        warning_title: "RIDGE SLIP HAZARD & SUPPLY ALERT",
        rainfall_forecast_24h: "78.5 mm (Heavy)",
        weather_summary: "High humidity and continuous precipitation causing small rock slips on Bawngkawn and Lengpui roads.",
        emergency_contact: "Aizawl DC Control: 0389-2325778",
        issued_at: "2026-09-13 08:30 IST",
        valid_until: "2026-09-14 08:30 IST"
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [92.58, 24.00],
          [92.88, 24.05],
          [92.95, 23.65],
          [92.62, 23.60],
          [92.58, 24.00]
        ]]
      }
    },
    {
      type: "Feature",
      properties: {
        district_id: "DIST-MN-01",
        district_name: "Imphal West",
        state_name: "Manipur",
        headquarters: "Imphal",
        default_alert: "Yellow",
        warning_title: "IMPHAL RIVER EMBANKMENT WATCH",
        rainfall_forecast_24h: "42.0 mm (Moderate)",
        weather_summary: "River Nambul and Imphal water flow normal. Supply trucks arriving via alternate southern spur.",
        emergency_contact: "Manipur SDMA: 0385-2443441",
        issued_at: "2026-09-13 08:30 IST",
        valid_until: "2026-09-14 08:30 IST"
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [93.85, 24.95],
          [94.05, 24.98],
          [94.02, 24.70],
          [93.82, 24.72],
          [93.85, 24.95]
        ]]
      }
    },
    {
      type: "Feature",
      properties: {
        district_id: "DIST-AR-01",
        district_name: "Tawang",
        state_name: "Arunachal Pradesh",
        headquarters: "Tawang",
        default_alert: "Red",
        warning_title: "SELA PASS BLIZZARD & ROCKFALL",
        rainfall_forecast_24h: "135.0 mm (Precipitation / Snow)",
        weather_summary: "Sela Pass approach at 13,700 ft impassable. Sub-zero temperatures and structural mudflow.",
        emergency_contact: "Tawang DDMA: 03794-222221",
        issued_at: "2026-09-13 05:30 IST",
        valid_until: "2026-09-14 05:30 IST"
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [91.65, 27.75],
          [92.15, 27.78],
          [92.12, 27.45],
          [91.68, 27.42],
          [91.65, 27.75]
        ]]
      }
    },
    {
      type: "Feature",
      properties: {
        district_id: "DIST-TR-01",
        district_name: "West Tripura",
        state_name: "Tripura",
        headquarters: "Agartala",
        default_alert: "Green",
        warning_title: "NOMINAL CONDITIONS",
        rainfall_forecast_24h: "12.0 mm (Light)",
        weather_summary: "Clear to partly cloudy. Freight corridor NH-8 operating normally.",
        emergency_contact: "Tripura SEOC: 1070 / 0381-2416045",
        issued_at: "2026-09-13 08:30 IST",
        valid_until: "2026-09-14 08:30 IST"
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [91.15, 24.05],
          [91.45, 24.08],
          [91.48, 23.75],
          [91.18, 23.72],
          [91.15, 24.05]
        ]]
      }
    }
  ]
};

export const NER_CHOKE_POINTS: ChokePoint[] = [
  {
    id: "CP-AS-01",
    name: "Guwahati (Jalukbari Choke Point / Saraighat)",
    highway: "NH-27 / NH-17",
    state: "Assam",
    lat: 26.1445,
    lng: 91.6853,
    elevation_m: 55,
    vulnerability: "Moderate",
    nearest_bro_base: "BRO HQ Guwahati"
  },
  {
    id: "CP-AS-02",
    name: "Silchar / Badarpur Bypass",
    highway: "NH-37 / NH-6",
    state: "Assam",
    lat: 24.8333,
    lng: 92.7789,
    elevation_m: 25,
    vulnerability: "Very High",
    nearest_bro_base: "BRO Project Pushpak / Silchar"
  },
  {
    id: "CP-NL-01",
    name: "Kohima (Pagla Pahar / Phesama)",
    highway: "NH-29",
    state: "Nagaland",
    lat: 25.6751,
    lng: 94.1086,
    elevation_m: 1444,
    vulnerability: "Very High",
    nearest_bro_base: "BRO Project Sewak / Kohima"
  },
  {
    id: "CP-SK-01",
    name: "Teesta Bazar / 29th Mile",
    highway: "NH-10",
    state: "Sikkim",
    lat: 27.0604,
    lng: 88.4283,
    elevation_m: 280,
    vulnerability: "Very High",
    nearest_bro_base: "BRO Project Swastik / Gangtok"
  },
  {
    id: "CP-ML-01",
    name: "Sonapur Tunnel Portal",
    highway: "NH-6",
    state: "Meghalaya",
    lat: 25.1050,
    lng: 92.3680,
    elevation_m: 460,
    vulnerability: "High",
    nearest_bro_base: "BRO Project Setuk / Jowai"
  },
  {
    id: "CP-MZ-01",
    name: "Bilkhawthlir Hill Escarpment",
    highway: "NH-306",
    state: "Mizoram",
    lat: 24.2850,
    lng: 92.7350,
    elevation_m: 320,
    vulnerability: "Very High",
    nearest_bro_base: "BRO Project Pushpak / Kolasib"
  },
  {
    id: "CP-AR-01",
    name: "Sela Pass Summit KM-74",
    highway: "NH-13",
    state: "Arunachal Pradesh",
    lat: 27.5020,
    lng: 92.1050,
    elevation_m: 4170,
    vulnerability: "Very High",
    nearest_bro_base: "BRO Project Vartak / Tawang"
  },
  {
    id: "CP-MN-01",
    name: "Makru River Bridge Approach",
    highway: "NH-37",
    state: "Manipur",
    lat: 24.8170,
    lng: 93.4500,
    elevation_m: 510,
    vulnerability: "High",
    nearest_bro_base: "BRO Project Sewak / Noney"
  }
];
