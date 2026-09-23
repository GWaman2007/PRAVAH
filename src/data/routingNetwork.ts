import type { Segment, VehicleProfile } from '../types';

export interface NetworkNode {
  id: string;
  name: string;
  state: string;
  coordinates: [number, number];
  isHub: boolean;
  elevationMeters: number;
}

export const NER_NODES: Record<string, NetworkNode> = {
  guwahati: {
    id: 'guwahati',
    name: 'Guwahati Regional Hub',
    state: 'Assam',
    coordinates: [26.1445, 91.7362],
    isHub: true,
    elevationMeters: 55,
  },
  shillong: {
    id: 'shillong',
    name: 'Shillong (Meghalaya)',
    state: 'Meghalaya',
    coordinates: [25.5788, 91.8933],
    isHub: true,
    elevationMeters: 1496,
  },
  silchar: {
    id: 'silchar',
    name: 'Silchar Strategic Depot',
    state: 'Assam',
    coordinates: [24.8333, 92.7789],
    isHub: true,
    elevationMeters: 22,
  },
  dimapur: {
    id: 'dimapur',
    name: 'Dimapur Railhead',
    state: 'Nagaland',
    coordinates: [25.9095, 93.7266],
    isHub: true,
    elevationMeters: 145,
  },
  kohima: {
    id: 'kohima',
    name: 'Kohima Capital Command',
    state: 'Nagaland',
    coordinates: [25.6751, 94.1086],
    isHub: true,
    elevationMeters: 1444,
  },
  imphal: {
    id: 'imphal',
    name: 'Imphal Supply Base',
    state: 'Manipur',
    coordinates: [24.8170, 93.9368],
    isHub: true,
    elevationMeters: 786,
  },
  aizawl: {
    id: 'aizawl',
    name: 'Aizawl Forward Depot',
    state: 'Mizoram',
    coordinates: [23.7271, 92.7176],
    isHub: true,
    elevationMeters: 1132,
  },
  gangtok: {
    id: 'gangtok',
    name: 'Gangtok STNM Hub',
    state: 'Sikkim',
    coordinates: [27.3314, 88.6138],
    isHub: true,
    elevationMeters: 1650,
  },
  nagaon: {
    id: 'nagaon',
    name: 'Nagaon Junction',
    state: 'Assam',
    coordinates: [26.3465, 92.6841],
    isHub: false,
    elevationMeters: 62,
  },
  jowai: {
    id: 'jowai',
    name: 'Jowai Transit Depot',
    state: 'Meghalaya',
    coordinates: [25.4526, 92.2039],
    isHub: false,
    elevationMeters: 1380,
  },
  haflong: {
    id: 'haflong',
    name: 'Haflong Barail Pass',
    state: 'Assam',
    coordinates: [25.1685, 93.0182],
    isHub: false,
    elevationMeters: 680,
  },
  wokha: {
    id: 'wokha',
    name: 'Wokha Hill Bypass',
    state: 'Nagaland',
    coordinates: [26.1025, 94.2638],
    isHub: false,
    elevationMeters: 1313,
  },
  kolasib: {
    id: 'kolasib',
    name: 'Kolasib Forward Station',
    state: 'Mizoram',
    coordinates: [24.2246, 92.6784],
    isHub: false,
    elevationMeters: 610,
  },
};

export const VEHICLE_PROFILES: VehicleProfile[] = [
  {
    id: 'OXY_CRYOTANKER_32T',
    name: 'Heavy Liquid Oxygen Cryo-Tanker (32T)',
    type: 'Heavy Hazardous Liquid Cargo',
    height_m: 4.2,
    width_m: 2.9,
    weight_tonnes: 32.0,
    turn_radius_m: 14.5,
    fuel_efficiency_km_l: 2.8,
    max_speed_kmh: 55,
    icon: 'truck',
  },
  {
    id: 'MED_4X4_TRUCK_8T',
    name: 'Medium 4x4 Medical & Vaccine Van (8.5T)',
    type: 'Emergency Medical Cold Chain',
    height_m: 3.2,
    width_m: 2.4,
    weight_tonnes: 8.5,
    turn_radius_m: 8.0,
    fuel_efficiency_km_l: 6.2,
    max_speed_kmh: 75,
    icon: 'ambulance',
  },
  {
    id: 'RATION_CONVOY_14T',
    name: 'Standard Relief Grain & Fuel Truck (14T)',
    type: 'Essential Subsistence Logistics',
    height_m: 3.6,
    width_m: 2.5,
    weight_tonnes: 14.0,
    turn_radius_m: 10.5,
    fuel_efficiency_km_l: 4.5,
    max_speed_kmh: 65,
    icon: 'package',
  },
  {
    id: 'HEAVY_RELIEF_TRAILER_40T',
    name: 'Heavy Machinery & Bailey Kit Carrier (40T)',
    type: 'BRO Engineering & Heavy Plant',
    height_m: 4.5,
    width_m: 3.2,
    weight_tonnes: 40.0,
    turn_radius_m: 18.0,
    fuel_efficiency_km_l: 2.1,
    max_speed_kmh: 45,
    icon: 'tool',
  },
];

export const NER_SEGMENTS: Segment[] = [
  // --- GUWAHATI TO SHILLONG (NH-106) ---
  {
    id: 'SEG-GHY-SHL',
    name: 'Guwahati - Nongpoh - Shillong Express Corridor',
    highway: 'NH-106',
    fromNode: 'guwahati',
    toNode: 'shillong',
    distance_km: 98,
    base_speed_kmh: 52,
    max_weight_limit: 45.0,
    max_height_limit: 5.0,
    max_width_limit: 4.0,
    bhuvan_lhz_level: 2,
    gradient_pct: 6.5,
    surface_type: 'paved',
    bridgeName: 'Umiam Viaduct',
    coordinates: [
      [26.1445, 91.7362],
      [26.0420, 91.8480],
      [25.9010, 91.8780],
      [25.7520, 91.8950],
      [25.6650, 91.9120],
      [25.5788, 91.8933],
    ],
  },
  // --- SHILLONG TO JOWAI (NH-6) ---
  {
    id: 'SEG-SHL-JOW',
    name: 'Shillong - Mawryngkneng - Jowai',
    highway: 'NH-6',
    fromNode: 'shillong',
    toNode: 'jowai',
    distance_km: 64,
    base_speed_kmh: 48,
    max_weight_limit: 38.0,
    max_height_limit: 4.8,
    max_width_limit: 3.8,
    bhuvan_lhz_level: 2,
    gradient_pct: 5.2,
    surface_type: 'paved',
    coordinates: [
      [25.5788, 91.8933],
      [25.5450, 92.0500],
      [25.4950, 92.1400],
      [25.4526, 92.2039],
    ],
  },
  // --- JOWAI TO SILCHAR (NH-6 via Sonapur Tunnel) ---
  {
    id: 'SEG-JOW-SIL',
    name: 'Jowai - Sonapur Tunnel - Badarpur - Silchar',
    highway: 'NH-6',
    fromNode: 'jowai',
    toNode: 'silchar',
    distance_km: 135,
    base_speed_kmh: 38,
    max_weight_limit: 28.0, // Restricted bridge at Lubha
    max_height_limit: 4.3,
    max_width_limit: 3.2,
    bhuvan_lhz_level: 4,
    gradient_pct: 8.5,
    surface_type: 'under_construction',
    bridgeName: 'Lubha Suspension Bridge (28T Limit)',
    tunnelName: 'Sonapur Tunnel Portal',
    coordinates: [
      [25.4526, 92.2039],
      [25.3200, 92.3100],
      [25.1050, 92.3680],
      [24.9500, 92.5200],
      [24.8333, 92.7789],
    ],
  },
  // --- GUWAHATI TO NAGAON (NH-27 4-Lane) ---
  {
    id: 'SEG-GHY-NAG',
    name: 'Guwahati - Jagiroad - Roha - Nagaon',
    highway: 'NH-27',
    fromNode: 'guwahati',
    toNode: 'nagaon',
    distance_km: 118,
    base_speed_kmh: 68,
    max_weight_limit: 50.0,
    max_height_limit: 5.5,
    max_width_limit: 4.5,
    bhuvan_lhz_level: 1,
    gradient_pct: 1.5,
    surface_type: 'paved',
    coordinates: [
      [26.1445, 91.7362],
      [26.1800, 92.0500],
      [26.2200, 92.3500],
      [26.3465, 92.6841],
    ],
  },
  // --- NAGAON TO DIMAPUR (NH-29 / NH-27) ---
  {
    id: 'SEG-NAG-DIM',
    name: 'Nagaon - Dabaka - Diphu Spur - Dimapur',
    highway: 'NH-29',
    fromNode: 'nagaon',
    toNode: 'dimapur',
    distance_km: 162,
    base_speed_kmh: 58,
    max_weight_limit: 45.0,
    max_height_limit: 4.8,
    max_width_limit: 4.0,
    bhuvan_lhz_level: 2,
    gradient_pct: 3.5,
    surface_type: 'paved',
    coordinates: [
      [26.3465, 92.6841],
      [26.1200, 92.9000],
      [25.9800, 93.4200],
      [25.9095, 93.7266],
    ],
  },
  // --- DIMAPUR TO KOHIMA (NH-29 Sinking Zone - PRIMARY HAZARD) ---
  {
    id: 'SEG-DIM-KOH-MAIN',
    name: 'Dimapur - Chumukedima - Zubza - Kohima (NH-29 Main)',
    highway: 'NH-29',
    fromNode: 'dimapur',
    toNode: 'kohima',
    distance_km: 74,
    base_speed_kmh: 32,
    max_weight_limit: 30.0,
    max_height_limit: 4.4,
    max_width_limit: 3.4,
    bhuvan_lhz_level: 5, // Extreme Hazard
    gradient_pct: 9.8,
    surface_type: 'under_construction',
    bridgeName: 'Dzüdza River Bridge KM-42',
    coordinates: [
      [25.9095, 93.7266],
      [25.8200, 93.8500],
      [25.7500, 93.9800],
      [25.7100, 94.0400],
      [25.6751, 94.1086],
    ],
  },
  // --- DIMAPUR TO KOHIMA VIA WOKHA (BYPASS / ALTERNATE ROUTE) ---
  {
    id: 'SEG-DIM-WOK',
    name: 'Dimapur - Niuland - Wokha Spur Bypass',
    highway: 'SH-Nagaland-Wokha',
    fromNode: 'dimapur',
    toNode: 'wokha',
    distance_km: 92,
    base_speed_kmh: 36,
    max_weight_limit: 22.0, // Narrow mountain bypass
    max_height_limit: 3.8,
    max_width_limit: 2.8,
    bhuvan_lhz_level: 3,
    gradient_pct: 11.2,
    surface_type: 'paved',
    bridgeName: 'Doyang River Bailey Bridge (22T Limit)',
    coordinates: [
      [25.9095, 93.7266],
      [26.0100, 93.9200],
      [26.0800, 94.1500],
      [26.1025, 94.2638],
    ],
  },
  {
    id: 'SEG-WOK-KOH',
    name: 'Wokha - Tseminyu - Kohima North',
    highway: 'NH-2',
    fromNode: 'wokha',
    toNode: 'kohima',
    distance_km: 68,
    base_speed_kmh: 40,
    max_weight_limit: 25.0,
    max_height_limit: 4.0,
    max_width_limit: 3.0,
    bhuvan_lhz_level: 3,
    gradient_pct: 7.5,
    surface_type: 'paved',
    coordinates: [
      [26.1025, 94.2638],
      [25.9500, 94.2100],
      [25.8200, 94.1500],
      [25.6751, 94.1086],
    ],
  },
  // --- KOHIMA TO IMPHAL (NH-2) ---
  {
    id: 'SEG-KOH-IMP',
    name: 'Kohima - Mao Gate - Senapati - Imphal',
    highway: 'NH-2',
    fromNode: 'kohima',
    toNode: 'imphal',
    distance_km: 138,
    base_speed_kmh: 46,
    max_weight_limit: 35.0,
    max_height_limit: 4.5,
    max_width_limit: 3.6,
    bhuvan_lhz_level: 3,
    gradient_pct: 6.2,
    surface_type: 'paved',
    bridgeName: 'Mao Border Viaduct',
    coordinates: [
      [25.6751, 94.1086],
      [25.5000, 94.1200],
      [25.3200, 94.0500],
      [25.0500, 93.9800],
      [24.8170, 93.9368],
    ],
  },
  // --- SILCHAR TO KOLASIB (NH-306 - MISSION MZ-04 CORRIDOR) ---
  {
    id: 'SEG-SIL-KOL',
    name: 'Silchar - Vairengte - Bilkhawthlir - Kolasib',
    highway: 'NH-306',
    fromNode: 'silchar',
    toNode: 'kolasib',
    distance_km: 78,
    base_speed_kmh: 34,
    max_weight_limit: 18.0, // Critical limitation for Mizoram arterial
    max_height_limit: 3.6,
    max_width_limit: 2.7,
    bhuvan_lhz_level: 4,
    gradient_pct: 8.8,
    surface_type: 'under_construction',
    bridgeName: 'Vairengte Stream Crossing (18T Limit)',
    coordinates: [
      [24.8333, 92.7789],
      [24.5500, 92.7500],
      [24.3800, 92.7200],
      [24.2850, 92.7350],
      [24.2246, 92.6784],
    ],
  },
  // --- KOLASIB TO AIZAWL (NH-306 / NH-6) ---
  {
    id: 'SEG-KOL-AIZ',
    name: 'Kolasib - Kawnpui - Ratu Junction - Aizawl',
    highway: 'NH-306',
    fromNode: 'kolasib',
    toNode: 'aizawl',
    distance_km: 84,
    base_speed_kmh: 36,
    max_weight_limit: 20.0,
    max_height_limit: 3.8,
    max_width_limit: 2.8,
    bhuvan_lhz_level: 3,
    gradient_pct: 9.5,
    surface_type: 'paved',
    coordinates: [
      [24.2246, 92.6784],
      [24.0500, 92.6900],
      [23.8800, 92.7100],
      [23.7271, 92.7176],
    ],
  },
  // --- NAGAON TO HAFLONG (NH-27 LUMDING SECTION) ---
  {
    id: 'SEG-NAG-HAF',
    name: 'Nagaon - Lumding - Maibang - Haflong',
    highway: 'NH-27',
    fromNode: 'nagaon',
    toNode: 'haflong',
    distance_km: 145,
    base_speed_kmh: 42,
    max_weight_limit: 40.0,
    max_height_limit: 4.8,
    max_width_limit: 3.8,
    bhuvan_lhz_level: 4,
    gradient_pct: 8.0,
    surface_type: 'paved',
    bridgeName: 'Diyung River Bridge',
    coordinates: [
      [26.3465, 92.6841],
      [25.8800, 93.1200],
      [25.4500, 93.1800],
      [25.1685, 93.0182],
    ],
  },
  // --- HAFLONG TO SILCHAR (NH-27 JATINGA SINKING ZONE) ---
  {
    id: 'SEG-HAF-SIL',
    name: 'Haflong - Jatinga Sinking Zone - Harangajao - Silchar',
    highway: 'NH-27',
    fromNode: 'haflong',
    toNode: 'silchar',
    distance_km: 88,
    base_speed_kmh: 30,
    max_weight_limit: 25.0,
    max_height_limit: 4.2,
    max_width_limit: 3.2,
    bhuvan_lhz_level: 5,
    gradient_pct: 10.5,
    surface_type: 'under_construction',
    bridgeName: 'Jatinga Sinking Bridge Kit',
    coordinates: [
      [25.1685, 93.0182],
      [25.0800, 92.9500],
      [24.9500, 92.8800],
      [24.8333, 92.7789],
    ],
  },
];

/**
 * Resolves the authoritative segment ID from NER_SEGMENTS for a given corridor text or geographic coordinate.
 * Guarantees mapping to an active segment ID used by the routing and disruption engines.
 */
export function resolveCorridorSegmentId(corridorText?: string, coords?: [number, number]): string {
  const text = (corridorText || '').toLowerCase();

  // 1. Direct Highway / Corridor Keyword Resolution
  if (
    text.includes('nh-29') ||
    text.includes('dimapur') ||
    text.includes('kohima') ||
    text.includes('pagla') ||
    text.includes('zubza') ||
    text.includes('chumukedima')
  ) {
    return 'SEG-DIM-KOH-MAIN';
  }
  if (
    text.includes('nh-306') ||
    text.includes('nh-54') ||
    text.includes('silchar') ||
    text.includes('kolasib') ||
    text.includes('vairengte') ||
    text.includes('bilkhawthlir')
  ) {
    return 'SEG-SIL-KOL';
  }
  if (text.includes('nh-106') || text.includes('nongpoh') || (text.includes('guwahati') && text.includes('shillong'))) {
    return 'SEG-GHY-SHL';
  }
  if (text.includes('nh-6') && (text.includes('shillong') || text.includes('jowai'))) {
    return 'SEG-SHL-JOW';
  }
  if (text.includes('sonapur') || (text.includes('nh-6') && text.includes('silchar')) || text.includes('badarpur')) {
    return 'SEG-JOW-SIL';
  }
  if (text.includes('nh-27') && text.includes('nagaon') && text.includes('dimapur')) {
    return 'SEG-NAG-DIM';
  }
  if (text.includes('haflong') || text.includes('lumding')) {
    return 'SEG-NAG-HAF';
  }
  if (text.includes('jatinga')) {
    return 'SEG-HAF-SIL';
  }
  if (text.includes('imphal') || text.includes('senapati') || text.includes('mao')) {
    return 'SEG-KOH-IMP';
  }
  if (text.includes('aizawl') || text.includes('kawnpui')) {
    return 'SEG-KOL-AIZ';
  }
  if (text.includes('wokha') || text.includes('niuland')) {
    return 'SEG-DIM-WOK';
  }

  // 2. Geographic Proximity Fallback against all NER_SEGMENTS polyline points
  if (coords && Array.isArray(coords) && Number.isFinite(coords[0]) && Number.isFinite(coords[1])) {
    const lat = coords[0] < 45 ? coords[0] : coords[1];
    const lng = coords[1] > 60 ? coords[1] : coords[0];
    let closestId = 'SEG-DIM-KOH-MAIN';
    let minD = Infinity;

    for (const seg of NER_SEGMENTS) {
      if (!seg.coordinates) continue;
      for (const pt of seg.coordinates) {
        const d = (pt[0] - lat) ** 2 + (pt[1] - lng) ** 2;
        if (d < minD) {
          minD = d;
          closestId = seg.id;
        }
      }
    }
    return closestId;
  }

  return 'SEG-DIM-KOH-MAIN';
}
