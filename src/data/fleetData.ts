import type { RouteDefinition, BlackoutZone, HazardZone, VehicleTelemetry } from '../types';

export const FLEET_ROUTES: Record<string, RouteDefinition> = {
  // ROUTE FOR MISSION MZ-04: Silchar to Kolasib (NH-306)
  'ROUTE-MZ-04': {
    id: 'ROUTE-MZ-04',
    name: 'Silchar -> Vairengte -> Kolasib Corridor (NH-306)',
    startHub: 'Silchar Regional Depot',
    endHub: 'Kolasib Forward Station',
    distanceKm: 78,
    expectedDurationMinutes: 135,
    coordinates: [
      [24.8333, 92.7789], // Silchar Depot
      [24.7200, 92.7650], // Cachar Outskirts
      [24.6050, 92.7520], // Kabuganj
      [24.5120, 92.7480], // Dholai Toll Plaza
      [24.4200, 92.7350], // Lailapur Assam-Mizoram Border
      [24.3800, 92.7200], // Vairengte Checkpost
      [24.3400, 92.7280], // Vairengte Ascending Ghat
      [24.2850, 92.7350], // Bilkhawthlir Hazard & Blackout Zone
      [24.2500, 92.7100], // Bairabi Junction Spur
      [24.2246, 92.6784], // Kolasib East Civil Hospital Hub
    ],
    deviationPath: [
      [24.3800, 92.7200],
      [24.3950, 92.6850], // Diverged >950m West onto unstable timber logging cut
      [24.3500, 92.6500],
      [24.2900, 92.6300],
      [24.2246, 92.6784],
    ],
  },

  // ROUTE FOR GANGTOK: Siliguri to Gangtok (NH-10)
  'ROUTE-SK-01': {
    id: 'ROUTE-SK-01',
    name: 'Siliguri -> Sevoke -> Teesta -> Gangtok (NH-10)',
    startHub: 'Siliguri Junction Base',
    endHub: 'Gangtok STNM Hospital',
    distanceKm: 114,
    expectedDurationMinutes: 190,
    coordinates: [
      [26.7271, 88.3953], // Siliguri
      [26.8150, 88.4350], // Salugara Military Camp
      [26.8830, 88.4720], // Sevoke Railway Crossing
      [26.9050, 88.4850], // Coronation Bridge
      [26.9380, 88.4750], // Kalijhora (Teesta Gorge Start)
      [26.9920, 88.4620],
      [27.0200, 88.4600], // 29th Mile Blackout Zone
      [27.0580, 88.4980], // Teesta Bazaar
      [27.0920, 88.4550], // Melli Checkpost
      [27.1760, 88.5300], // Rangpo Border Entry
      [27.2350, 88.5000], // Singtam Bridge
      [27.2950, 88.5900], // Ranipool
      [27.3314, 88.6138], // Gangtok STNM
    ],
    deviationPath: [
      [26.9380, 88.4750],
      [26.9600, 88.4300], // Off-route into Kalimpong hills >1.1km
      [27.0100, 88.4100],
      [27.1200, 88.4500],
      [27.1760, 88.5300],
    ],
  },

  // ROUTE FOR KOHIMA: Dimapur to Kohima (NH-29)
  'ROUTE-NL-01': {
    id: 'ROUTE-NL-01',
    name: 'Dimapur -> Chumukedima -> Zubza -> Kohima (NH-29)',
    startHub: 'Dimapur Rail Terminal',
    endHub: 'Kohima Capital Command',
    distanceKm: 74,
    expectedDurationMinutes: 130,
    coordinates: [
      [25.9095, 93.7266], // Dimapur
      [25.8650, 93.7750],
      [25.8200, 93.8500], // Chumukedima Gate
      [25.7750, 93.9200], // Pagla Pahar Rockfall Zone
      [25.7500, 93.9800], // Dzüdza River Gorge (Cellular Blackout)
      [25.7100, 94.0400], // Zubza Transit Depot
      [25.6880, 94.0750], // Kohima Bypass Ascending Ridge
      [25.6751, 94.1086], // Kohima Capital
    ],
    deviationPath: [
      [25.8200, 93.8500],
      [25.8450, 93.9100], // Detour through Niuland dirt tracks >800m
      [25.7900, 94.0100],
      [25.6751, 94.1086],
    ],
  },
};

export const BLACKOUT_ZONES: BlackoutZone[] = [
  {
    id: 'ZONE-BO-01',
    name: 'Bilkhawthlir Mountain Cut Dead Zone',
    corridor: 'NH-306 (Km 42 to Km 54)',
    expectedTransitMinutes: 28,
    bufferMultiplier: 0.25, // 25% buffer -> 35 min expected exit
    polygon: [
      [24.3200, 92.7100],
      [24.3200, 92.7600],
      [24.2600, 92.7600],
      [24.2600, 92.7100],
      [24.3200, 92.7100],
    ],
  },
  {
    id: 'ZONE-BO-02',
    name: '29th Mile Teesta Gorge Blackout Corridor',
    corridor: 'NH-10 (Sevoke to Teesta Bazar)',
    expectedTransitMinutes: 32,
    bufferMultiplier: 0.30,
    polygon: [
      [27.0500, 88.4300],
      [27.0500, 88.4800],
      [26.9800, 88.4800],
      [26.9800, 88.4300],
      [27.0500, 88.4300],
    ],
  },
  {
    id: 'ZONE-BO-03',
    name: 'Dzüdza River Gorge Cellular Blackout',
    corridor: 'NH-29 (Km 28 to Km 39)',
    expectedTransitMinutes: 25,
    bufferMultiplier: 0.20,
    polygon: [
      [25.7900, 93.9400],
      [25.7900, 94.0200],
      [25.7200, 94.0200],
      [25.7200, 93.9400],
      [25.7900, 93.9400],
    ],
  },
];

export const HAZARD_ZONES: HazardZone[] = [
  {
    id: 'HAZARD-01',
    name: 'Bilkhawthlir Silt Subsidence Zone',
    hazardType: 'Active Slope Creep & Rockfall',
    polygon: [
      [24.3000, 92.7200],
      [24.3000, 92.7500],
      [24.2700, 92.7500],
      [24.2700, 92.7200],
      [24.3000, 92.7200],
    ],
  },
  {
    id: 'HAZARD-02',
    name: 'Dzüdza River Bridge Failure Sector',
    hazardType: 'Flash Mudflow & Bridge Load Stress',
    polygon: [
      [25.7600, 93.9600],
      [25.7600, 94.0000],
      [25.7300, 94.0000],
      [25.7300, 93.9600],
      [25.7600, 93.9600],
    ],
  },
];

export const INITIAL_VEHICLES: VehicleTelemetry[] = [
  // 1. VEHICLE FOR MISSION MZ-04 (Driver & Field Officer unit)
  {
    vehicle_id: 'Medic-01',
    vehicle_name: 'Medic-01 (4x4 Emergency Van)',
    driver_name: 'Rajesh Mech',
    driver_phone: '+91 94350-18492',
    convoy_lead_officer: 'Inspector L. Hmar (Mizoram Police)',
    mission_id: 'MZ-04',
    cargo_type: 'Emergency IV Fluids & Snake Antivenom',
    cargo_manifest: [
      { item: 'IV Fluids (Ringer Lactate)', quantity: 180, unit: 'bottles' },
      { item: 'Polyvalent Snake Antivenom', quantity: 90, unit: 'vials' },
      { item: 'Emergency Suture & Burn Kits', quantity: 45, unit: 'kits' },
    ],
    destination_community_id: 'MZ-KOL-004',
    destination_name: 'Kolasib East Civil Hospital Hub',
    assigned_route_id: 'ROUTE-MZ-04',
    current_coords: [24.3800, 92.7200], // At Vairengte checkpost approaching Bilkhawthlir
    nominal_speed_kmh: 38,
    speed_kmh: 38,
    heading_deg: 172,
    status: 'ON_ROUTE',
    battery_pct: 92.5,
    last_ping_time: new Date().toISOString(),
    route_progress_pct: 48,
    signal_strength_dbm: -68,
    satellite_count: 14,
    stationary_timer_sec: 0,
    traveled_distance_km: 37.4,
    deviation_distance_m: 18,
    dead_reckoning_distance_m: 0,
    breadcrumbs: [
      { coords: [24.8333, 92.7789], status: 'ON_ROUTE', timestamp: new Date(Date.now() - 3600000).toISOString(), speed_kmh: 42 },
      { coords: [24.6050, 92.7520], status: 'ON_ROUTE', timestamp: new Date(Date.now() - 2400000).toISOString(), speed_kmh: 40 },
      { coords: [24.3800, 92.7200], status: 'ON_ROUTE', timestamp: new Date().toISOString(), speed_kmh: 38 },
    ],
  },

  // 2. OXYGEN CRYOTANKER
  {
    vehicle_id: 'Oxy-Tanker-04',
    vehicle_name: 'Oxy-Tanker-04 (Cryogenic 32T)',
    driver_name: 'Bikram Thapa',
    driver_phone: '+91 98180-44219',
    convoy_lead_officer: 'Capt. P. Bhutia (Sikkim SDMA)',
    mission_id: 'SK-02',
    cargo_type: 'Liquid Medical Oxygen (9,000 Litres)',
    cargo_manifest: [
      { item: 'Cryogenic Liquid Medical Oxygen', quantity: 9000, unit: 'litres' },
      { item: 'High-Pressure Manifold Regulators', quantity: 12, unit: 'units' },
    ],
    destination_community_id: 'SK-MAN-002',
    destination_name: 'Gangtok STNM / Mangan Hub',
    assigned_route_id: 'ROUTE-SK-01',
    current_coords: [27.0200, 88.4600], // Inside 29th Mile Blackout
    nominal_speed_kmh: 32,
    speed_kmh: 28,
    heading_deg: 34,
    status: 'DEAD_ZONE_EXTRAPOLATING',
    battery_pct: 88.0,
    last_ping_time: new Date(Date.now() - 14 * 60000).toISOString(), // Ping severed 14 mins ago
    route_progress_pct: 54,
    signal_strength_dbm: -120, // Zero cellular reception
    satellite_count: 0,
    stationary_timer_sec: 0,
    traveled_distance_km: 61.5,
    deviation_distance_m: 42,
    dead_reckoning_distance_m: 6800,
    entry_blackout_time: new Date(Date.now() - 14 * 60000).toISOString(),
    expected_blackout_exit_time: new Date(Date.now() + 18 * 60000).toISOString(),
    breadcrumbs: [
      { coords: [26.7271, 88.3953], status: 'ON_ROUTE', timestamp: new Date(Date.now() - 5400000).toISOString(), speed_kmh: 48 },
      { coords: [26.9050, 88.4850], status: 'ON_ROUTE', timestamp: new Date(Date.now() - 2800000).toISOString(), speed_kmh: 35 },
      { coords: [27.0200, 88.4600], status: 'DEAD_ZONE_EXTRAPOLATING', timestamp: new Date().toISOString(), speed_kmh: 28 },
    ],
  },

  // 3. RATION CONVOY
  {
    vehicle_id: 'Ration-Convoy-07',
    vehicle_name: 'Ration-Convoy-07 (14T Shaktiman)',
    driver_name: 'Temsu Ao',
    driver_phone: '+91 97740-92811',
    convoy_lead_officer: 'Subedar K. Sema (Nagaland Police)',
    mission_id: 'NL-01',
    cargo_type: 'Rice, Lentils & High-Calorie Rations',
    cargo_manifest: [
      { item: 'Fortified Subsistence Rice', quantity: 8500, unit: 'kg' },
      { item: 'Pulses / Dal', quantity: 2200, unit: 'kg' },
      { item: 'Refined Edible Oil', quantity: 1200, unit: 'litres' },
    ],
    destination_community_id: 'NL-KOH-009',
    destination_name: 'Kohima South Sector (Phesama)',
    assigned_route_id: 'ROUTE-NL-01',
    current_coords: [25.7500, 93.9800], // Entering Dzüdza River Gorge
    nominal_speed_kmh: 30,
    speed_kmh: 30,
    heading_deg: 128,
    status: 'ON_ROUTE',
    battery_pct: 95.0,
    last_ping_time: new Date().toISOString(),
    route_progress_pct: 58,
    signal_strength_dbm: -74,
    satellite_count: 12,
    stationary_timer_sec: 0,
    traveled_distance_km: 43.0,
    deviation_distance_m: 25,
    dead_reckoning_distance_m: 0,
    breadcrumbs: [
      { coords: [25.9095, 93.7266], status: 'ON_ROUTE', timestamp: new Date(Date.now() - 3200000).toISOString(), speed_kmh: 45 },
      { coords: [25.8200, 93.8500], status: 'ON_ROUTE', timestamp: new Date(Date.now() - 1600000).toISOString(), speed_kmh: 36 },
      { coords: [25.7500, 93.9800], status: 'ON_ROUTE', timestamp: new Date().toISOString(), speed_kmh: 30 },
    ],
  },
];
