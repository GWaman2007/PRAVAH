/**
 * Major Highway Coordinates & Transport Choke Points across the 8 NER States
 * Used for Milestone 4 (Open-Meteo live rainfall sampling and station telemetry)
 */
const NER_CHOKE_POINTS = [
  // --- ASSAM ---
  {
    id: "CP-AS-01",
    name: "Guwahati (Jalukbari Choke Point / Saraighat)",
    corridor: "NH-27 / NH-17 (Gateway to North East)",
    state: "Assam",
    district: "Kamrup Metropolitan",
    lat: 26.1445,
    lng: 91.6853,
    elevation_m: 55,
    strategicImportance: "Primary road bridge connecting Northern Bank & Gateway to all 7 sister states"
  },
  {
    id: "CP-AS-02",
    name: "Silchar / Badarpur Bypass",
    corridor: "NH-37 / NH-6 (Barak Valley Gateway)",
    state: "Assam",
    district: "Cachar",
    lat: 24.8333,
    lng: 92.7789,
    elevation_m: 25,
    strategicImportance: "Critical transit bottleneck for Mizoram, Tripura & Manipur logistics"
  },
  {
    id: "CP-AS-03",
    name: "Jorhat Transport Hub",
    corridor: "NH-715 (Upper Assam Arterial Route)",
    state: "Assam",
    district: "Jorhat",
    lat: 26.7509,
    lng: 94.2037,
    elevation_m: 116,
    strategicImportance: "Key central node connecting Kaziranga, Majuli, and Nagaland border"
  },
  {
    id: "CP-AS-04",
    name: "Dibrugarh Bogibeel Bridge Approach",
    corridor: "NH-15 (Trans-Brahmaputra Rail-Road Corridor)",
    state: "Assam",
    district: "Dibrugarh",
    lat: 27.4728,
    lng: 94.9120,
    elevation_m: 108,
    strategicImportance: "Strategic rail-cum-road bridge connection into Eastern Arunachal Pradesh"
  },
  {
    id: "CP-AS-05",
    name: "Tezpur (Kolia Bhomora Bridge)",
    corridor: "NH-715A (Brahmaputra Crossing)",
    state: "Assam",
    district: "Sonitpur",
    lat: 26.6138,
    lng: 92.8315,
    elevation_m: 73,
    strategicImportance: "Key military and commercial gateway into Western Arunachal Pradesh"
  },
  {
    id: "CP-AS-06",
    name: "Haflong / Jatinga Junction",
    corridor: "NH-54E (Dima Hasao Hill Highway)",
    state: "Assam",
    district: "Dima Hasao",
    lat: 25.1834,
    lng: 93.0182,
    elevation_m: 680,
    strategicImportance: "Prone to severe hill slips; lifeline between Brahmaputra and Barak valleys"
  },

  // --- MEGHALAYA ---
  {
    id: "CP-ML-01",
    name: "Nongpoh Choke Point",
    corridor: "NH-6 (Guwahati - Shillong Expressway)",
    state: "Meghalaya",
    district: "Ri-Bhoi",
    lat: 25.9011,
    lng: 91.8803,
    elevation_m: 485,
    strategicImportance: "High-density cargo corridor through rain-soaked Khasi foothills"
  },
  {
    id: "CP-ML-02",
    name: "Shillong Bypass / Umiam Lake Pass",
    corridor: "NH-6 Bypass",
    state: "Meghalaya",
    district: "East Khasi Hills",
    lat: 25.6601,
    lng: 91.9056,
    elevation_m: 1496,
    strategicImportance: "Trans-state freight bypass directing cargo towards Jaintia Hills and Silchar"
  },
  {
    id: "CP-ML-03",
    name: "Cherrapunji (Sohra Ridge)",
    corridor: "SH-5 (High Precipitation Zone)",
    state: "Meghalaya",
    district: "East Khasi Hills",
    lat: 25.2702,
    lng: 91.7323,
    elevation_m: 1430,
    strategicImportance: "Extreme rainfall hotspot; flash flood source area for Bangladesh plains"
  },
  {
    id: "CP-ML-04",
    name: "Jowai Transport Node",
    corridor: "NH-6 (Jaintia Coal & Cement Axis)",
    state: "Meghalaya",
    district: "West Jaintia Hills",
    lat: 25.4522,
    lng: 92.2038,
    elevation_m: 1380,
    strategicImportance: "Heavy vehicle route to southern Assam, Tripura, and Mizoram"
  },
  {
    id: "CP-ML-05",
    name: "Tura Ghat / Rongram",
    corridor: "NH-217 (Garo Hills Arterial Corridor)",
    state: "Meghalaya",
    district: "West Garo Hills",
    lat: 25.5138,
    lng: 90.2201,
    elevation_m: 349,
    strategicImportance: "Western Meghalaya logistical connection to Lower Assam"
  },

  // --- ARUNACHAL PRADESH ---
  {
    id: "CP-AR-01",
    name: "Itanagar / Naharlagun Gateway",
    corridor: "NH-415 (Capital Region Highway)",
    state: "Arunachal Pradesh",
    district: "Papum Pare",
    lat: 27.0844,
    lng: 93.6053,
    elevation_m: 320,
    strategicImportance: "Primary administrative & medical supply corridor for central Arunachal"
  },
  {
    id: "CP-AR-02",
    name: "Bomdila / Sela Pass Corridor",
    corridor: "NH-13 (Trans-Arunachal Strategic Road)",
    state: "Arunachal Pradesh",
    district: "West Kameng",
    lat: 27.2645,
    lng: 92.4239,
    elevation_m: 2415,
    strategicImportance: "High altitude defence logistics corridor subject to severe landslips and blizzards"
  },
  {
    id: "CP-AR-03",
    name: "Tawang High-Altitude Node",
    corridor: "Bhalukpong-Tawang Axis",
    state: "Arunachal Pradesh",
    district: "Tawang",
    lat: 27.5861,
    lng: 91.8667,
    elevation_m: 3048,
    strategicImportance: "Critical border territory logistics terminus"
  },
  {
    id: "CP-AR-04",
    name: "Pasighat Siang River Crossing",
    corridor: "NH-515 (Eastern Foothill Highway)",
    state: "Arunachal Pradesh",
    district: "East Siang",
    lat: 28.0667,
    lng: 95.3333,
    elevation_m: 153,
    strategicImportance: "Main transit route along the Siang / Brahmaputra upper valley"
  },

  // --- NAGALAND ---
  {
    id: "CP-NL-01",
    name: "Dimapur Railway & Logistics Junction",
    corridor: "NH-29 (Nagaland Commercial Railhead)",
    state: "Nagaland",
    district: "Dimapur",
    lat: 25.9090,
    lng: 93.7266,
    elevation_m: 145,
    strategicImportance: "Chief commercial rail and road transshipment terminal for Nagaland & Manipur"
  },
  {
    id: "CP-NL-02",
    name: "Kohima / Zubza Landslide Bypass",
    corridor: "NH-29 (Kohima-Dimapur Lifeline)",
    state: "Nagaland",
    district: "Kohima",
    lat: 25.6751,
    lng: 94.1086,
    elevation_m: 1444,
    strategicImportance: "Highest landslide hazard frequency corridor in the North Eastern hills"
  },
  {
    id: "CP-NL-03",
    name: "Mokokchung Central Junction",
    corridor: "NH-702 (Central Nagaland Highway)",
    state: "Nagaland",
    district: "Mokokchung",
    lat: 26.3243,
    lng: 94.5204,
    elevation_m: 1325,
    strategicImportance: "Inter-district hub connecting Mokokchung, Tuensang, and Wokha"
  },

  // --- MANIPUR ---
  {
    id: "CP-MN-01",
    name: "Imphal Valley Transit Hub",
    corridor: "NH-2 / NH-37 Junction",
    state: "Manipur",
    district: "Imphal West",
    lat: 24.8170,
    lng: 93.9368,
    elevation_m: 786,
    strategicImportance: "Heart of Manipur logistics; convergence point for Jiribam and Dimapur corridors"
  },
  {
    id: "CP-MN-02",
    name: "Senapati / Maram Mountain Pass",
    corridor: "NH-2 (Imphal - Kohima Lifeline)",
    state: "Manipur",
    district: "Senapati",
    lat: 25.2676,
    lng: 94.0191,
    elevation_m: 1260,
    strategicImportance: "Key mountain lifeline prone to blockades, mudslides, and cloudbursts"
  },
  {
    id: "CP-MN-03",
    name: "Churachandpur Southern Foothill Pass",
    corridor: "NH-102B (Southern Frontier Highway)",
    state: "Manipur",
    district: "Churachandpur",
    lat: 24.3333,
    lng: 93.6667,
    elevation_m: 914,
    strategicImportance: "Southern regional supply corridor to Indo-Myanmar border"
  },

  // --- MIZORAM ---
  {
    id: "CP-MZ-01",
    name: "Aizawl Mountain Crest",
    corridor: "NH-306 / NH-54 (Capital Arterial Hub)",
    state: "Mizoram",
    district: "Aizawl",
    lat: 23.7271,
    lng: 92.7176,
    elevation_m: 1132,
    strategicImportance: "Central distribution ridge for the entire state of Mizoram"
  },
  {
    id: "CP-MZ-02",
    name: "Kolasib Border Transit",
    corridor: "NH-306 (Silchar - Aizawl Border Corridor)",
    state: "Mizoram",
    district: "Kolasib",
    lat: 24.2255,
    lng: 92.6781,
    elevation_m: 590,
    strategicImportance: "Single primary freight lifeline into Mizoram from Assam"
  },
  {
    id: "CP-MZ-03",
    name: "Lunglei Southern Hub",
    corridor: "NH-54 (Southern Mizoram Arterial)",
    state: "Mizoram",
    district: "Lunglei",
    lat: 22.8872,
    lng: 92.7397,
    elevation_m: 1022,
    strategicImportance: "Crucial link for Kaladan Multimodal Transit Transport Project"
  },

  // --- TRIPURA ---
  {
    id: "CP-TR-01",
    name: "Agartala Integrated Check Post & Gateway",
    corridor: "NH-8 (National Arterial Road & Rail Terminus)",
    state: "Tripura",
    district: "West Tripura",
    lat: 23.8315,
    lng: 91.2868,
    elevation_m: 18,
    strategicImportance: "Primary multimodal trade gateway and state capital freight center"
  },
  {
    id: "CP-TR-02",
    name: "Dharmanagar Choke Point",
    corridor: "NH-8 (Assam - Tripura Border Crossing)",
    state: "Tripura",
    district: "North Tripura",
    lat: 24.3750,
    lng: 92.1640,
    elevation_m: 29,
    strategicImportance: "Sole heavy cargo entry gateway into Tripura from Assam via Churaibari"
  },
  {
    id: "CP-TR-03",
    name: "Udaipur / Gomati River Transit",
    corridor: "NH-8 (South Tripura Corridor)",
    state: "Tripura",
    district: "Gomati",
    lat: 23.5333,
    lng: 91.4833,
    elevation_m: 23,
    strategicImportance: "Key link to Sabroom border port and southern agricultural hubs"
  },

  // --- SIKKIM ---
  {
    id: "CP-SK-01",
    name: "Gangtok / Ranipool Junction",
    corridor: "NH-10 (Siliguri - Gangtok Lifeline)",
    state: "Sikkim",
    district: "East Sikkim",
    lat: 27.3389,
    lng: 88.6065,
    elevation_m: 1650,
    strategicImportance: "Principal access corridor for state capital and Nathu La pass logistics"
  },
  {
    id: "CP-SK-02",
    name: "Mangan Landslide Corridor",
    corridor: "North Sikkim Strategic Highway",
    state: "Sikkim",
    district: "North Sikkim",
    lat: 27.5054,
    lng: 88.5287,
    elevation_m: 1310,
    strategicImportance: "Severe chronic landslide corridor along the upper Teesta basin"
  }
];

// Export to window
window.NER_CHOKE_POINTS = NER_CHOKE_POINTS;
