import type { CommunityBase } from '../types';

export const INITIAL_COMMUNITIES: CommunityBase[] = [
  // 1. Kolasib East - P1 Critical (Mizoram) - Targeted by MISSION-MZ-04
  {
    id: 'MZ-KOL-004',
    name: 'Kolasib East (Mission MZ-04 Target)',
    district: 'Kolasib',
    state: 'Mizoram',
    coordinates: [24.2246, 92.6784],
    boundary: {
      type: 'Polygon',
      coordinates: [[
        [92.665, 24.238],
        [92.692, 24.235],
        [92.698, 24.218],
        [92.682, 24.210],
        [92.660, 24.219],
        [92.665, 24.238],
      ]],
    },
    population: 6400,
    healthcareFacilities: 2,
    ingressRouteCount: 1, // Single point of failure via NH-306
    primaryCorridor: 'NH-306 Bilkhawthlir Corridor',
    nearestDepotName: 'Silchar Regional Logistics Base (Assam)',
    transitTimeHours: 2.5,
    cutoffTimeHours: 4.0, // Expected cutoff due to Bilkhawthlir subsidence
    disruptionProbMax: 0.88,
    elapsedTimeHours: 19.5,
    isMonsoonAlertActive: true,
    hasActiveIndent: true,
    inventories: {
      IV_FLUIDS: {
        lastStock: 85,
        baselineDailyBurn: 72,
        standardCapacity: 250,
      },
      ANTIVENOM: {
        lastStock: 36,
        baselineDailyBurn: 24,
        standardCapacity: 120,
      },
      GRAIN_RICE: {
        lastStock: 850,
        baselineDailyBurn: 280,
        standardCapacity: 1500,
      },
      DIESEL: {
        lastStock: 380,
        baselineDailyBurn: 110,
        standardCapacity: 800,
      },
    },
  },

  // 2. Kohima South Sector - P1 Critical (Nagaland) - Targeted by MISSION-NL-01
  {
    id: 'NL-KOH-009',
    name: 'Kohima South Sector (Phesama)',
    district: 'Kohima',
    state: 'Nagaland',
    coordinates: [25.6400, 94.1200],
    boundary: {
      type: 'Polygon',
      coordinates: [[
        [94.105, 25.655],
        [94.135, 25.652],
        [94.140, 25.632],
        [94.125, 25.625],
        [94.102, 25.636],
        [94.105, 25.655],
      ]],
    },
    population: 11200,
    healthcareFacilities: 4,
    ingressRouteCount: 1, // Severed by NH-29 Pagla Pahar collapse
    primaryCorridor: 'NH-29 Dimapur-Kohima Corridor',
    nearestDepotName: 'Dimapur Rail Freight Staging Area',
    transitTimeHours: 2.2,
    cutoffTimeHours: 2.5, // Imminent cutoff
    disruptionProbMax: 0.95,
    elapsedTimeHours: 22.0,
    isMonsoonAlertActive: true,
    hasActiveIndent: true,
    inventories: {
      IV_FLUIDS: {
        lastStock: 120,
        baselineDailyBurn: 110,
        standardCapacity: 300,
      },
      ANTIVENOM: {
        lastStock: 48,
        baselineDailyBurn: 38,
        standardCapacity: 150,
      },
      GRAIN_RICE: {
        lastStock: 1100,
        baselineDailyBurn: 520,
        standardCapacity: 2000,
      },
      DIESEL: {
        lastStock: 310,
        baselineDailyBurn: 240,
        standardCapacity: 1000,
      },
    },
  },

  // 3. Teesta Canyon 29th Mile Hub - P2 Elevated (Sikkim) - Targeted by MISSION-SK-02
  {
    id: 'SK-MAN-002',
    name: 'Teesta Canyon 29th Mile Hub',
    district: 'Pakyong',
    state: 'Sikkim',
    coordinates: [27.0288, 88.4714],
    boundary: {
      type: 'Polygon',
      coordinates: [[
        [88.455, 27.042],
        [88.485, 27.039],
        [88.490, 27.018],
        [88.475, 27.012],
        [88.452, 27.022],
        [88.455, 27.042],
      ]],
    },
    population: 4800,
    healthcareFacilities: 3,
    ingressRouteCount: 2,
    primaryCorridor: 'NH-10 Teesta Canyon - Dikchu Bailey Bridge',
    nearestDepotName: 'Gangtok Central Strategic Depot',
    transitTimeHours: 2.0,
    cutoffTimeHours: 6.0,
    disruptionProbMax: 0.75,
    elapsedTimeHours: 12.0,
    isMonsoonAlertActive: true,
    hasActiveIndent: true,
    inventories: {
      IV_FLUIDS: {
        lastStock: 140,
        baselineDailyBurn: 60,
        standardCapacity: 250,
      },
      ANTIVENOM: {
        lastStock: 55,
        baselineDailyBurn: 30,
        standardCapacity: 120,
      },
      GRAIN_RICE: {
        lastStock: 800,
        baselineDailyBurn: 240,
        standardCapacity: 1500,
      },
      DIESEL: {
        lastStock: 350,
        baselineDailyBurn: 160,
        standardCapacity: 800,
      },
    },
  },

  // 4. Dima Hasao Hill Sector - P2 Elevated (Assam)
  {
    id: 'AS-DH-011',
    name: 'Dima Hasao Hill Sector',
    district: 'Dima Hasao',
    state: 'Assam',
    coordinates: [25.1685, 93.0182],
    boundary: {
      type: 'Polygon',
      coordinates: [[
        [93.002, 25.182],
        [93.035, 25.180],
        [93.040, 25.158],
        [93.022, 25.152],
        [93.000, 25.162],
        [93.002, 25.182],
      ]],
    },
    population: 8200,
    healthcareFacilities: 2,
    ingressRouteCount: 2,
    primaryCorridor: 'NH-27 Lumding-Haflong Barail Section',
    nearestDepotName: 'Guwahati Dispur Disaster Hub',
    transitTimeHours: 3.5,
    cutoffTimeHours: 7.5,
    disruptionProbMax: 0.68,
    elapsedTimeHours: 14.0,
    isMonsoonAlertActive: true,
    hasActiveIndent: true,
    inventories: {
      IV_FLUIDS: {
        lastStock: 160,
        baselineDailyBurn: 80,
        standardCapacity: 250,
      },
      ANTIVENOM: {
        lastStock: 65,
        baselineDailyBurn: 32,
        standardCapacity: 120,
      },
      GRAIN_RICE: {
        lastStock: 1200,
        baselineDailyBurn: 340,
        standardCapacity: 1500,
      },
      DIESEL: {
        lastStock: 520,
        baselineDailyBurn: 140,
        standardCapacity: 800,
      },
    },
  },

  // 5. Tawang Forward Valley - P3 Moderate (Arunachal Pradesh)
  {
    id: 'AR-TAW-001',
    name: 'Tawang Forward Valley',
    district: 'Tawang',
    state: 'Arunachal Pradesh',
    coordinates: [27.5861, 91.8594],
    boundary: {
      type: 'Polygon',
      coordinates: [[
        [91.842, 27.600],
        [91.875, 27.598],
        [91.880, 27.575],
        [91.862, 27.570],
        [91.838, 27.582],
        [91.842, 27.600],
      ]],
    },
    population: 5200,
    healthcareFacilities: 2,
    ingressRouteCount: 2,
    primaryCorridor: 'NH-13 Sela Pass Axis (13,700 ft)',
    nearestDepotName: 'Tezpur Military Base Staging Terminal',
    transitTimeHours: 4.5,
    cutoffTimeHours: 20.0,
    disruptionProbMax: 0.50,
    elapsedTimeHours: 5.0,
    isMonsoonAlertActive: true,
    hasActiveIndent: true,
    inventories: {
      IV_FLUIDS: {
        lastStock: 200,
        baselineDailyBurn: 40,
        standardCapacity: 250,
      },
      ANTIVENOM: {
        lastStock: 80,
        baselineDailyBurn: 15,
        standardCapacity: 120,
      },
      GRAIN_RICE: {
        lastStock: 1200,
        baselineDailyBurn: 180,
        standardCapacity: 1500,
      },
      DIESEL: {
        lastStock: 550,
        baselineDailyBurn: 100,
        standardCapacity: 800,
      },
    },
  },
];
