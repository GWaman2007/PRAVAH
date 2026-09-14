import type { RouteDefinition, BlackoutZone, HazardZone, VehicleTelemetry } from '../types/fleet';
import { getPolylineLengthKm } from '../engine/gisMath';

// --- ROUTE 1: GUWAHATI -> SHILLONG -> JOWAI (NH-106 & NH-6) ---
const ROUTE_1_COORDS: [number, number][] = [
  [26.1445, 91.7362], // Guwahati Dispur Capital Complex
  [26.1320, 91.7750],
  [26.1180, 91.8150], // Khanapara Toll Gate
  [26.0850, 91.8320],
  [26.0420, 91.8480], // Burnihat
  [25.9950, 91.8600],
  [25.9450, 91.8720],
  [25.9010, 91.8780], // Nongpoh Transit Hub
  [25.8620, 91.8850],
  [25.8200, 91.8900], // Umling
  [25.7850, 91.8920],
  [25.7520, 91.8950], // Umsning Bypass
  [25.7100, 91.9050],
  [25.6650, 91.9120], // Umiam / Barapani Lake
  [25.6250, 91.9080],
  [25.5950, 91.8990],
  [25.5788, 91.8933], // Shillong Police Bazar
  [25.5710, 91.9300],
  [25.5600, 91.9750],
  [25.5450, 92.0500], // Mawryngkneng Junction
  [25.5200, 92.0950],
  [25.4950, 92.1400],
  [25.4720, 92.1750],
  [25.4526, 92.2039], // Jowai Civil Depot
];

// Deviation detour for Medic-01: Diverges into a remote muddy logging path >700m away from NH-6
const ROUTE_1_DEVIATION: [number, number][] = [
  [25.5788, 91.8933],
  [25.5890, 91.9200],
  [25.6120, 91.9600], // Diverged >850m North of highway
  [25.6280, 92.0100], // High mountain ridge unapproved dirt trail
  [25.5800, 92.0900],
  [25.5100, 92.1600],
  [25.4526, 92.2039],
];

// --- ROUTE 2: SILIGURI -> GANGTOK (NH-10 TEESTA VALLEY) ---
const ROUTE_2_COORDS: [number, number][] = [
  [26.7271, 88.3953], // Siliguri Junction Base
  [26.7650, 88.4120],
  [26.8150, 88.4350], // Salugara Military Camp
  [26.8520, 88.4550],
  [26.8830, 88.4720], // Sevoke Railway Crossing
  [26.9050, 88.4850], // Coronation Bridge
  [26.9380, 88.4750], // Kalijhora (Start of Teesta Gorge)
  [26.9650, 88.4680],
  [26.9920, 88.4620],
  [27.0200, 88.4600], // 29th Mile Hazard Zone (Blackout)
  [27.0420, 88.4780],
  [27.0580, 88.4980], // Teesta Bazaar Suspension Point
  [27.0750, 88.4800],
  [27.0920, 88.4550], // Melli Checkpost
  [27.1250, 88.4900],
  [27.1550, 88.5150],
  [27.1760, 88.5300], // Rangpo Sikkim Border Entry
  [27.2050, 88.5180],
  [27.2350, 88.5000], // Singtam Bridge
  [27.2650, 88.5400],
  [27.2950, 88.5900], // Ranipool Ascending Ghat
  [27.3150, 88.6050],
  [27.3314, 88.6138], // Gangtok STNM Hospital Hub
];

// Deviation detour for Oxy-Tanker-04: Diverted onto an unverified steep landslide spur >900m off NH-10
const ROUTE_2_DEVIATION: [number, number][] = [
  [26.9380, 88.4750],
  [26.9600, 88.4300], // Diverged far west into Kalimpong hill ridge
  [27.0100, 88.4100], // >1.2 km off-route
  [27.0600, 88.4350],
  [27.1200, 88.4500],
  [27.1760, 88.5300],
];

// --- ROUTE 3: DIMAPUR -> KOHIMA -> IMPHAL (NH-29 & NH-2) ---
const ROUTE_3_COORDS: [number, number][] = [
  [25.9095, 93.7266], // Dimapur Central Rail Supply Yard
  [25.8820, 93.7550],
  [25.8580, 93.7720],
  [25.8420, 93.7850], // Chumukedima Checkpoint
  [25.8150, 93.8250],
  [25.7950, 93.8650], // Medziphema Foothills
  [25.7680, 93.9200],
  [25.7400, 93.9800], // Pagla Pahar Rockfall Zone (Blackout)
  [25.7220, 94.0150],
  [25.7050, 94.0450], // Zubza Railway Bridge Alignment
  [25.6880, 94.0800],
  [25.6751, 94.1086], // Kohima Capital Summit (1444m)
  [25.6420, 94.1100],
  [25.6100, 94.1120], // Kigwema Heritage Village
  [25.5650, 94.1200],
  [25.5030, 94.1280], // Mao Gate Nagaland-Manipur Border
  [25.4200, 94.0850],
  [25.3400, 94.0450], // Senapati District Hub
  [25.2650, 94.0200],
  [25.1480, 93.9750], // Kangpokpi Valley Transit
  [25.0500, 93.9400],
  [24.9650, 93.8950], // Sekmai Brewery & Logistics Point
  [24.8900, 93.9100],
  [24.8170, 93.9368], // Imphal Kangla Fort Supply Depot
];

// Deviation detour for Ration-Convoy-09: Diverted onto an unapproved jungle track >800m off corridor
const ROUTE_3_DEVIATION: [number, number][] = [
  [25.7400, 93.9800],
  [25.7650, 94.0300], // North ridge unpaved timber track (>950m off)
  [25.7400, 94.0700],
  [25.6800, 94.1350],
  [25.6100, 94.1120],
];

// Compile Route Definitions
export const NER_ROUTES: Record<string, RouteDefinition> = {
  'route-medic-01': {
    id: 'route-medic-01',
    name: 'Guwahati - Shillong - Jowai Medical Corridor',
    highwayCode: 'NH-106 / NH-6',
    origin: 'Guwahati (Assam)',
    destination: 'Jowai (Meghalaya)',
    totalDistanceKm: Math.round(getPolylineLengthKm(ROUTE_1_COORDS)),
    waypoints: [
      { name: 'Guwahati Dispur Hub', coords: [26.1445, 91.7362], elevationM: 55 },
      { name: 'Khanapara Gate', coords: [26.1180, 91.8150], elevationM: 70 },
      { name: 'Nongpoh Transit', coords: [25.9010, 91.8780], elevationM: 580 },
      { name: 'Shillong Police Bazar', coords: [25.5788, 91.8933], elevationM: 1496 },
      { name: 'Mawryngkneng Cut', coords: [25.5450, 92.0500], elevationM: 1420 },
      { name: 'Jowai Civil Depot', coords: [25.4526, 92.2039], elevationM: 1380 },
    ],
    coordinates: ROUTE_1_COORDS,
    color: '#06b6d4', // Cyan
    deviationPath: ROUTE_1_DEVIATION,
  },
  'route-oxy-04': {
    id: 'route-oxy-04',
    name: 'Siliguri - Gangtok Teesta Cryogenic Corridor',
    highwayCode: 'NH-10',
    origin: 'Siliguri (West Bengal)',
    destination: 'Gangtok (Sikkim)',
    totalDistanceKm: Math.round(getPolylineLengthKm(ROUTE_2_COORDS)),
    waypoints: [
      { name: 'Siliguri Junction', coords: [26.7271, 88.3953], elevationM: 122 },
      { name: 'Sevoke Bridge', coords: [26.8830, 88.4720], elevationM: 180 },
      { name: '29th Mile Gorge', coords: [27.0200, 88.4600], elevationM: 260 },
      { name: 'Rangpo Sikkim Checkpost', coords: [27.1760, 88.5300], elevationM: 320 },
      { name: 'Singtam River Crossing', coords: [27.2350, 88.5000], elevationM: 410 },
      { name: 'Gangtok STNM Hospital', coords: [27.3314, 88.6138], elevationM: 1650 },
    ],
    coordinates: ROUTE_2_COORDS,
    color: '#3b82f6', // Bright Blue
    deviationPath: ROUTE_2_DEVIATION,
  },
  'route-ration-09': {
    id: 'route-ration-09',
    name: 'Dimapur - Kohima - Imphal Food Lifeline',
    highwayCode: 'NH-29 / NH-2',
    origin: 'Dimapur (Nagaland)',
    destination: 'Imphal (Manipur)',
    totalDistanceKm: Math.round(getPolylineLengthKm(ROUTE_3_COORDS)),
    waypoints: [
      { name: 'Dimapur Rail Yard', coords: [25.9095, 93.7266], elevationM: 145 },
      { name: 'Chumukedima Foothills', coords: [25.8420, 93.7850], elevationM: 220 },
      { name: 'Pagla Pahar Gorge', coords: [25.7400, 93.9800], elevationM: 780 },
      { name: 'Kohima Capital Ridge', coords: [25.6751, 94.1086], elevationM: 1444 },
      { name: 'Mao Gate High Pass', coords: [25.5030, 94.1280], elevationM: 1780 },
      { name: 'Imphal Kangla Depot', coords: [24.8170, 93.9368], elevationM: 786 },
    ],
    coordinates: ROUTE_3_COORDS,
    color: '#10b981', // Emerald
    deviationPath: ROUTE_3_DEVIATION,
  },
};

// --- CELLULAR & GPS BLACKOUT POLYGONS ---
export const BLACKOUT_ZONES: BlackoutZone[] = [
  {
    id: 'zone-teesta-gorge',
    name: 'Teesta Valley Deep Canyon Blackout Zone',
    highway: 'NH-10 (Sevoke to 29th Mile)',
    region: 'Kalimpong / Sikkim Border',
    // Covers the sheer rock gorge of Teesta River
    polygon: [
      [26.9300, 88.4500],
      [27.0450, 88.4350],
      [27.0700, 88.5150],
      [26.9800, 88.5200],
      [26.9200, 88.4800],
    ],
    description: '1,400m vertical rock cliffs shadow GPS satellite constellations and block cellular micro-towers.',
    attenuationLevel: 'TOTAL_GPS_LOSS',
    depthMeters: 1250,
  },
  {
    id: 'zone-lubha-gorge',
    name: 'Lubha River Gorge Blind Sector',
    highway: 'NH-6 (East of Jowai)',
    region: 'East Jaintia Hills, Meghalaya',
    // Covers canyon stretch approaching Jowai ridge
    polygon: [
      [25.4800, 92.0800],
      [25.5300, 92.0700],
      [25.5600, 92.1500],
      [25.5000, 92.1800],
      [25.4400, 92.1200],
    ],
    description: 'Deep rainforest karst limestone canyon causing complete L-band GPS signal attenuation.',
    attenuationLevel: 'TOTAL_GPS_LOSS',
    depthMeters: 850,
  },
  {
    id: 'zone-pagla-pahar',
    name: 'Barail Range / Pagla Pahar Shadow Zone',
    highway: 'NH-29 (Medziphema - Zubza)',
    region: 'Kohima District, Nagaland',
    // Covers the winding gorge between Medziphema and Kohima
    polygon: [
      [25.7200, 93.9000],
      [25.7800, 93.9300],
      [25.7600, 94.0300],
      [25.6900, 94.0200],
      [25.7000, 93.9200],
    ],
    description: 'High Barail ridge shadow creating 18km telematics blackout corridor with heavy multipath reflection.',
    attenuationLevel: 'TOTAL_GPS_LOSS',
    depthMeters: 920,
  },
];

// --- HIGH-RISK LANDSLIDE & HAZARD ZONES ---
export const HAZARD_ZONES: HazardZone[] = [
  {
    id: 'hazard-29th-mile',
    name: '29th Mile Teesta Sinking & Mudflow Zone',
    highway: 'NH-10 (KM 29)',
    hazardType: 'Landslide Sinking Zone',
    riskLevel: 'EXTREME',
    polygon: [
      [26.9850, 88.4450],
      [27.0350, 88.4400],
      [27.0380, 88.4850],
      [26.9900, 88.4800],
    ],
    description: 'High-frequency slope failure with active rockfalls. Vehicles stationary here face catastrophic rockfall risks.',
    bhuvanHazardScale: 5,
  },
  {
    id: 'hazard-pagla-pahar',
    name: 'Pagla Pahar Active Rockslide Zone',
    highway: 'NH-29 (KM 36)',
    hazardType: 'Rockfall / Debris Flow',
    riskLevel: 'EXTREME',
    polygon: [
      [25.7250, 93.9450],
      [25.7650, 93.9500],
      [25.7600, 94.0100],
      [25.7200, 94.0050],
    ],
    description: 'Unstable tectonic fault fracture. Boulders continuously peel off cliffs during seismic or heavy rain triggers.',
    bhuvanHazardScale: 5,
  },
  {
    id: 'hazard-sonapur-tunnel',
    name: 'Sonapur / Lubha Mudslide Hotspot',
    highway: 'NH-6 (Jowai Belt)',
    hazardType: 'Severe Slope Failure',
    riskLevel: 'HIGH',
    polygon: [
      [25.4600, 92.1100],
      [25.5100, 92.1100],
      [25.5100, 92.1600],
      [25.4600, 92.1600],
    ],
    description: 'Subterranean mudflow zone causing highway sinking and sudden mud torrents across the carriageway.',
    bhuvanHazardScale: 4,
  },
];

// --- INITIAL FLEET TELEMETRY STATES ---
export const INITIAL_VEHICLES: VehicleTelemetry[] = [
  {
    vehicle_id: 'medic-01',
    vehicle_name: 'Medic-01 (Vaccine & Critical Care)',
    cargo_type: 'Medical Supplies',
    cargo_details: 'Cryo-Preserved Pediatric Vaccines & Emergency Plasma Units (Cold Chain -20°C)',
    driver_name: 'Captain T. Sangma',
    license_plate: 'AS-01-EC-9412',
    vehicle_model: 'Force Traveller 4x4 Ambulance',
    current_coords: ROUTE_1_COORDS[0],
    speed_kmh: 52,
    nominal_speed_kmh: 52,
    heading_deg: 115,
    status: 'ON_ROUTE',
    battery_pct: 98,
    last_ping_time: new Date().toISOString(),
    assigned_route_id: 'route-medic-01',
    route_progress_pct: 0,
    elevation_m: 55,
    signal_strength_dbm: -68,
    satellite_count: 14,
    stationary_timer_sec: 0,
    traveled_distance_km: 0,
    total_route_distance_km: Math.round(getPolylineLengthKm(ROUTE_1_COORDS)),
    deviation_distance_m: 0,
    breadcrumbs: [
      {
        coords: ROUTE_1_COORDS[0],
        status: 'ON_ROUTE',
        timestamp: new Date().toISOString(),
        speed_kmh: 52,
      },
    ],
    corridor_name: 'Guwahati - Shillong - Jowai (NH-106 / NH-6)',
    origin_name: 'Guwahati (Assam)',
    destination_name: 'Jowai (Meghalaya)',
    color: '#06b6d4', // Cyan
    accent_color: 'cyan',
    is_deviated_manual: false,
    is_stopped_manual: false,
    is_sos_manual: false,
    dead_reckoning_distance_m: 0,
  },
  {
    vehicle_id: 'oxy-tanker-04',
    vehicle_name: 'Oxy-Tanker-04 (Cryogenic LOX)',
    cargo_type: 'Liquid Oxygen (Hazardous)',
    cargo_details: 'Pressurized Liquid Medical Oxygen (LOX) 16,000 Liters (Cryogenic Hazmat Cl-2.2)',
    driver_name: 'Havildar R. Chettri',
    license_plate: 'WB-73-AZ-4091',
    vehicle_model: 'Tata Signa 3523.TK Multi-Axle Cryo',
    current_coords: ROUTE_2_COORDS[0],
    speed_kmh: 38,
    nominal_speed_kmh: 38,
    heading_deg: 42,
    status: 'ON_ROUTE',
    battery_pct: 94,
    last_ping_time: new Date().toISOString(),
    assigned_route_id: 'route-oxy-04',
    route_progress_pct: 0,
    elevation_m: 122,
    signal_strength_dbm: -74,
    satellite_count: 12,
    stationary_timer_sec: 0,
    traveled_distance_km: 0,
    total_route_distance_km: Math.round(getPolylineLengthKm(ROUTE_2_COORDS)),
    deviation_distance_m: 0,
    breadcrumbs: [
      {
        coords: ROUTE_2_COORDS[0],
        status: 'ON_ROUTE',
        timestamp: new Date().toISOString(),
        speed_kmh: 38,
      },
    ],
    corridor_name: 'Siliguri - Gangtok Teesta Corridor (NH-10)',
    origin_name: 'Siliguri (WB)',
    destination_name: 'Gangtok (Sikkim)',
    color: '#3b82f6', // Blue
    accent_color: 'blue',
    is_deviated_manual: false,
    is_stopped_manual: false,
    is_sos_manual: false,
    dead_reckoning_distance_m: 0,
  },
  {
    vehicle_id: 'ration-09',
    vehicle_name: 'Ration-Convoy-09 (Grain Carrier)',
    cargo_type: 'Food Rations',
    cargo_details: '22 Metric Tonnes Fortified Rice & Pulses (FCI Strategic Reserve)',
    driver_name: 'Naik S. Angami',
    license_plate: 'NL-07-B-6180',
    vehicle_model: 'Ashok Leyland 2820 Heavy Cargo',
    current_coords: ROUTE_3_COORDS[0],
    speed_kmh: 44,
    nominal_speed_kmh: 44,
    heading_deg: 135,
    status: 'ON_ROUTE',
    battery_pct: 91,
    last_ping_time: new Date().toISOString(),
    assigned_route_id: 'route-ration-09',
    route_progress_pct: 0,
    elevation_m: 145,
    signal_strength_dbm: -70,
    satellite_count: 13,
    stationary_timer_sec: 0,
    traveled_distance_km: 0,
    total_route_distance_km: Math.round(getPolylineLengthKm(ROUTE_3_COORDS)),
    deviation_distance_m: 0,
    breadcrumbs: [
      {
        coords: ROUTE_3_COORDS[0],
        status: 'ON_ROUTE',
        timestamp: new Date().toISOString(),
        speed_kmh: 44,
      },
    ],
    corridor_name: 'Dimapur - Kohima - Imphal Lifeline (NH-29 / NH-2)',
    origin_name: 'Dimapur (Nagaland)',
    destination_name: 'Imphal (Manipur)',
    color: '#10b981', // Emerald
    accent_color: 'emerald',
    is_deviated_manual: false,
    is_stopped_manual: false,
    is_sos_manual: false,
    dead_reckoning_distance_m: 0,
  },
];
