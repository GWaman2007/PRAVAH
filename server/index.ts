import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// ==========================================
// Extensible Configuration Schemas
// ==========================================
const CONFIG = {
  ISRO_BHUVAN_API_KEY: process.env.ISRO_BHUVAN_API_KEY || '',
  IMD_ENTERPRISE_KEY: process.env.IMD_ENTERPRISE_KEY || '',
  OPEN_METEO_BASE_URL: 'https://api.open-meteo.com/v1/forecast',
};

// ==========================================
// Seeded NER Highway Nodes & Coordinates
// ==========================================
interface ChokePoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  corridor: string;
  state: string;
  baseRisk: number; // 0 to 1
}

const CHOKE_POINTS: ChokePoint[] = [
  { id: 'CP-01', name: 'Bilkhawthlir Hill Escarpment', lat: 24.2850, lng: 92.7350, corridor: 'NH-306', state: 'Mizoram', baseRisk: 0.85 },
  { id: 'CP-02', name: 'Pagla Pahar (Km 144)', lat: 25.7500, lng: 93.9800, corridor: 'NH-29', state: 'Nagaland', baseRisk: 0.90 },
  { id: 'CP-03', name: 'Coronation Bridge & Sevoke', lat: 26.9050, lng: 88.4850, corridor: 'NH-10', state: 'Sikkim', baseRisk: 0.75 },
  { id: 'CP-04', name: '29th Mile Teesta River Gorge', lat: 27.0200, lng: 88.4600, corridor: 'NH-10', state: 'Sikkim', baseRisk: 0.92 },
  { id: 'CP-05', name: 'Lubha Bridge Hillside Cut', lat: 25.0833, lng: 92.3833, corridor: 'NH-6', state: 'Meghalaya', baseRisk: 0.80 },
  { id: 'CP-06', name: 'Haflong Ghat & Jatinga Pass', lat: 25.1800, lng: 93.0200, corridor: 'NH-27', state: 'Assam', baseRisk: 0.70 },
];

// ==========================================
// In-Memory State Store
// ==========================================
interface StateStore {
  rainfallMultiplier: number;
  weatherTelemetry: Record<string, any>;
  disruptions: Record<string, any>;
  communities: Record<string, any>;
  activeMissions: Record<string, any>;
  fleetTelemetry: Record<string, any>;
  groundReports: any[];
  alerts: any[];
  districtHealth: Record<string, any>;
}

const state: StateStore = {
  rainfallMultiplier: 1.0,
  weatherTelemetry: {},
  disruptions: {
    'SEG-DIM-KOH-MAIN': {
      status: 'TOTAL_BLOCKAGE',
      cause: 'Landslide Debris',
      description: 'Major mudflow at Pagla Pahar KM-144',
      reportedBy: 'Field Officer (BRO Project Sewak)',
    },
  },
  communities: {
    'MZ-KOL-004': {
      id: 'MZ-KOL-004',
      name: 'Kolasib East (Civil Hospital)',
      state: 'Mizoram',
      district: 'Kolasib',
      population: 4850,
      healthcareFacilities: 3,
      ingressRouteCount: 1, // Single corridor dependency
      primaryCorridor: 'NH-306 (Silchar -> Kolasib)',
      transitTimeHours: 2.5,
      cutoffTimeHours: 24.0,
      elapsedTimeHours: 0,
      disruptionProbMax: 0.25,
      isMonsoonAlertActive: false,
      priorityTier: 'P4',
      finalScore: 0.28,
      inventories: {
        IV_FLUIDS: { currentStock: 450, capacity: 500, baselineDailyBurn: 72, unit: 'bottles' },
        ANTIVENOM: { currentStock: 90, capacity: 100, baselineDailyBurn: 8, unit: 'vials' },
        GRAIN_RICE: { currentStock: 4800, capacity: 5000, baselineDailyBurn: 320, unit: 'kg' },
        DIESEL: { currentStock: 3800, capacity: 4000, baselineDailyBurn: 250, unit: 'litres' },
      },
    },
    'NL-KOH-009': {
      id: 'NL-KOH-009',
      name: 'Kohima South (Phesama Hub)',
      state: 'Nagaland',
      district: 'Kohima',
      population: 12400,
      healthcareFacilities: 4,
      ingressRouteCount: 2,
      primaryCorridor: 'NH-29 (Dimapur -> Kohima)',
      transitTimeHours: 3.2,
      cutoffTimeHours: 12.0,
      elapsedTimeHours: 4,
      disruptionProbMax: 0.65,
      isMonsoonAlertActive: true,
      priorityTier: 'P2',
      finalScore: 0.68,
      inventories: {
        IV_FLUIDS: { currentStock: 280, capacity: 600, baselineDailyBurn: 90, unit: 'bottles' },
        ANTIVENOM: { currentStock: 45, capacity: 100, baselineDailyBurn: 10, unit: 'vials' },
        GRAIN_RICE: { currentStock: 2400, capacity: 6000, baselineDailyBurn: 450, unit: 'kg' },
        DIESEL: { currentStock: 2100, capacity: 5000, baselineDailyBurn: 380, unit: 'litres' },
      },
    },
  },
  activeMissions: {},
  fleetTelemetry: {
    'Medic-01': {
      vehicle_id: 'Medic-01',
      vehicle_name: 'Medic-01 (4x4 Emergency Van)',
      driver_name: 'Rajesh Mech',
      driver_phone: '+91 94350-18492',
      convoy_lead_officer: 'Inspector L. Hmar (Mizoram Police)',
      mission_id: 'MZ-04',
      cargo_type: 'Emergency IV Fluids & Snake Antivenom',
      cargo_manifest: [
        { item: 'IV Fluids (Ringer Lactate)', quantity: 500, unit: 'bottles' },
        { item: 'Polyvalent Snake Antivenom', quantity: 90, unit: 'vials' },
      ],
      destination_community_id: 'MZ-KOL-004',
      destination_name: 'Kolasib East (Civil Hospital)',
      assigned_route_id: 'ROUTE-MZ-04',
      current_coords: [24.3800, 92.7200],
      current_speed_kmh: 38,
      heading_deg: 172,
      status: 'ON_ROUTE',
      route_progress_pct: 35,
      dead_reckoning_distance_m: 0,
      is_watchdog_amber: false,
      is_watchdog_red: false,
      is_stopped_manual: false,
      is_deviated_manual: false,
      is_sos_manual: false,
    },
    'Oxy-Tanker-04': {
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
      current_coords: [27.0200, 88.4600],
      current_speed_kmh: 28,
      heading_deg: 34,
      status: 'DEAD_ZONE_EXTRAPOLATING',
      route_progress_pct: 54,
      dead_reckoning_distance_m: 6800,
      is_watchdog_amber: false,
      is_watchdog_red: false,
      is_stopped_manual: false,
      is_deviated_manual: false,
      is_sos_manual: false,
    },
    'Ration-Convoy-07': {
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
      current_coords: [25.7500, 93.9800],
      current_speed_kmh: 30,
      heading_deg: 128,
      status: 'ON_ROUTE',
      route_progress_pct: 58,
      dead_reckoning_distance_m: 0,
      is_watchdog_amber: false,
      is_watchdog_red: false,
      is_stopped_manual: false,
      is_deviated_manual: false,
      is_sos_manual: false,
    },
  },
  groundReports: [
    {
      id: 'rep-01',
      title: 'Active Slope Creep & Rockfall on NH-29 Pagla Pahar',
      corridorFlair: 'r/NH-29-Nagaland',
      incidentType: 'Landslide',
      severity: 'Total Blockage',
      placeName: 'Pagla Pahar (Km 144), Kohima District',
      author: 'Subedar K. Sema',
      role: 'Field Officer (BRO/Police)',
      timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
      votes: { upvotes: 42, downvotes: 1 },
      confidenceScore: 51,
      hasOfficerVerified: true,
      corridorId: 'SEG-DIM-KOH-MAIN',
    },
  ],
  alerts: [],
  districtHealth: {
    kolasib: { id: 'kolasib', name: 'Kolasib', state: 'Mizoram', accessibilityScore: 78, category: 'STABLE', minDaysSupply: 8.5 },
    kohima: { id: 'kohima', name: 'Kohima', state: 'Nagaland', accessibilityScore: 42, category: 'CRITICAL', minDaysSupply: 2.8 },
  },
};

// ==========================================
// Preemptive Depletion & Urgency Formulation
// ==========================================
function recalculateCommunityPriority(community: any, rainfallMultiplier: number) {
  const isSurge = community.isMonsoonAlertActive || rainfallMultiplier > 1.3;
  const phiSurge = isSurge ? 1.4 : 1.0;

  // IV Fluids depletion calculation
  const iv = community.inventories.IV_FLUIDS;
  const hourlyBurn = (iv.baselineDailyBurn / 24) * phiSurge;
  const currentStock = Math.max(0, iv.currentStock - hourlyBurn * community.elapsedTimeHours);
  const timeToExhaustHours = currentStock / hourlyBurn;

  // S_def calculation
  let sDef = 0.0;
  if (timeToExhaustHours <= community.cutoffTimeHours) {
    sDef = 1.0;
  } else if (timeToExhaustHours <= community.cutoffTimeHours + 48) {
    sDef = 0.75;
  } else if (timeToExhaustHours <= 72) {
    sDef = 0.40;
  }

  // R_iso calculation
  const cIso = community.ingressRouteCount <= 1 ? 1.0 : 0.4;
  const rIso = 0.6 * community.disruptionProbMax + 0.4 * cIso;

  // I_vuln calculation
  const iVuln = 0.4 * Math.min(1.0, community.population / 5000) + 0.4 * Math.min(1.0, community.healthcareFacilities / 3) + 0.2;

  // Base Score
  const baseScore = 0.45 * rIso + 0.35 * sDef + 0.20 * iVuln;

  // Actionable Window & Emergency Boost
  const tWindow = Math.max(0, community.cutoffTimeHours - community.transitTimeHours);
  const emergencyBoost = (sDef >= 0.75 && tWindow <= 3.0) ? 0.20 : 0.0;
  const finalScore = Math.min(1.0, baseScore + emergencyBoost);

  let priorityTier = 'P4';
  if (finalScore >= 0.75 || emergencyBoost > 0) priorityTier = 'P1';
  else if (finalScore >= 0.55) priorityTier = 'P2';
  else if (finalScore >= 0.35) priorityTier = 'P3';

  return {
    ...community,
    currentStock,
    timeToExhaustHours,
    actionableDispatchWindow: tWindow,
    supplyDeficitFactor: sDef,
    isolationRisk: rIso,
    vulnerabilityIndex: iVuln,
    emergencyUrgencyBoost: emergencyBoost,
    finalScore,
    priorityTier,
  };
}

// ==========================================
// Open-Meteo Real-Time Weather Fetcher
// ==========================================
async function fetchRealTimeWeather() {
  try {
    const lats = CHOKE_POINTS.map((c) => c.lat).join(',');
    const lngs = CHOKE_POINTS.map((c) => c.lng).join(',');
    const url = `${CONFIG.OPEN_METEO_BASE_URL}?latitude=${lats}&longitude=${lngs}&current=temperature_2m,precipitation,rain,weather_code,wind_speed_10m&timezone=Asia%2FKolkata`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo status: ${res.status}`);
    const data = await res.json();

    const results = Array.isArray(data) ? data : [data];
    results.forEach((item: any, idx: number) => {
      const cp = CHOKE_POINTS[idx];
      if (cp && item.current) {
        state.weatherTelemetry[cp.id] = {
          stationId: cp.id,
          name: cp.name,
          corridor: cp.corridor,
          state: cp.state,
          precipitation_mm: item.current.precipitation ?? 0,
          rain_mm: item.current.rain ?? 0,
          weatherCode: item.current.weather_code ?? 0,
          windSpeedKmh: item.current.wind_speed_10m ?? 8,
          timestamp: new Date().toISOString(),
          isLive: true,
        };
      }
    });
    console.log(`[Open-Meteo] Live weather refreshed for ${CHOKE_POINTS.length} choke points.`);
  } catch (err) {
    console.warn('[Open-Meteo] Live fetch failed, using realistic orographic baseline:', err);
    CHOKE_POINTS.forEach((cp) => {
      state.weatherTelemetry[cp.id] = {
        stationId: cp.id,
        name: cp.name,
        corridor: cp.corridor,
        state: cp.state,
        precipitation_mm: cp.id === 'CP-01' ? 32.5 : 18.2,
        rain_mm: cp.id === 'CP-01' ? 32.5 : 18.2,
        weatherCode: 63,
        windSpeedKmh: 14.5,
        timestamp: new Date().toISOString(),
        isLive: false,
      };
    });
  }
}

// Run weather fetch on boot and every 5 minutes
fetchRealTimeWeather();
setInterval(fetchRealTimeWeather, 5 * 60 * 1000);

// ==========================================
// REST API Endpoints
// ==========================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'PRAVAH Reactive Engine',
    uptimeSec: process.uptime(),
    connectedSockets: io.engine.clientsCount,
    openMeteoConfigured: true,
    hasEnterpriseKeys: Boolean(CONFIG.ISRO_BHUVAN_API_KEY && CONFIG.IMD_ENTERPRISE_KEY),
  });
});

app.get('/api/state', (req, res) => {
  res.json(state);
});

app.get('/api/weather', (req, res) => {
  res.json({
    multiplier: state.rainfallMultiplier,
    telemetry: state.weatherTelemetry,
  });
});

app.post('/api/weather/multiplier', (req, res) => {
  const { multiplier } = req.body;
  if (typeof multiplier === 'number') {
    state.rainfallMultiplier = multiplier;
    io.emit('WEATHER_MULTIPLIER_UPDATED', { multiplier });
    res.json({ success: true, multiplier });
  } else {
    res.status(400).json({ error: 'Multiplier must be a number' });
  }
});

// ==========================================
// WebSockets Real-Time Bus (Socket.io)
// ==========================================
io.on('connection', (socket: Socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  // Send full initial state snapshot
  socket.emit('INITIAL_STATE_SYNC', state);

  // 1. Ground Incident Submission
  socket.on('SUBMIT_INCIDENT', (data: any) => {
    const isOfficer = data.authorRole?.includes('Officer') || data.isOfficer;
    const confidence = isOfficer ? 11 : 1;

    const incident = {
      id: `inc-${Date.now()}`,
      title: data.title,
      corridorFlair: data.corridorFlair || 'r/Mizoram-NH-306',
      incidentType: data.incidentType || 'Landslide',
      severity: data.severity || 'Total Blockage',
      placeName: data.placeName || 'NH-306 Kolasib Sector',
      author: data.authorName || 'Field Reporter',
      role: isOfficer ? 'Field Officer (BRO/Police)' : 'Citizen Driver',
      timestamp: new Date().toISOString(),
      votes: { upvotes: 1, downvotes: 0 },
      confidenceScore: confidence,
      hasOfficerVerified: isOfficer,
      corridorId: data.corridorId || 'SEG-SIL-KOL',
    };

    state.groundReports.unshift(incident);

    // If verified or Total Blockage, cascade segment blockage
    if (incident.severity === 'Total Blockage' || isOfficer) {
      state.disruptions[incident.corridorId] = {
        status: 'TOTAL_BLOCKAGE',
        cause: incident.incidentType,
        description: incident.title,
        reportedBy: `${incident.author} (${incident.role})`,
      };

      // Cascade to Kolasib East community: cut off road & surge to P1
      if (incident.corridorId === 'SEG-SIL-KOL' || incident.placeName.includes('Kolasib')) {
        const kol = state.communities['MZ-KOL-004'];
        if (kol) {
          kol.cutoffTimeHours = 3.5;
          kol.elapsedTimeHours = 6.0; // Accelerates depletion to 2.1h remaining
          kol.disruptionProbMax = 0.95;
          kol.isMonsoonAlertActive = true;

          const updated = recalculateCommunityPriority(kol, state.rainfallMultiplier);
          state.communities['MZ-KOL-004'] = updated;

          // Auto-suggest relief mission
          const suggestedMission = {
            id: 'MISSION-MZ-04',
            communityId: 'MZ-KOL-004',
            communityName: 'Kolasib East (Civil Hospital)',
            recommendedVehicleType: '4x4 Emergency Van (Medic-01)',
            cargoAllocations: [
              { item: 'IV Fluids (Ringer Lactate)', quantity: 500, unit: 'bottles' },
              { item: 'Polyvalent Snake Antivenom', quantity: 90, unit: 'vials' },
            ],
            assignedRouteId: 'ROUTE-MZ-04-BYPASS',
            suggestedDetour: 'Silchar -> Vairengte -> Bairabi -> Kolasib Bypass',
            status: 'SUGGESTED',
            urgency: 'P1_CRITICAL',
            createdAt: new Date().toISOString(),
          };
          state.activeMissions['MISSION-MZ-04'] = suggestedMission;

          // Update District Health
          if (state.districtHealth.kolasib) {
            state.districtHealth.kolasib.accessibilityScore = 22;
            state.districtHealth.kolasib.category = 'CRITICAL';
            state.districtHealth.kolasib.minDaysSupply = 1.8;
          }

          io.emit('COMMUNITY_SURGED_P1', { community: updated });
          io.emit('MISSION_RECOMMENDED', { mission: suggestedMission });
        }
      }
    }

    io.emit('INCIDENT_VERIFIED', { incident, disruptions: state.disruptions });
    io.emit('STATE_UPDATED', state);
  });

  // 2. Mission Dispatch Approval / Customization
  socket.on('DISPATCH_MISSION', (data: any) => {
    const { missionId, vehicleId, routeId, cargoManifest } = data;
    const mission = state.activeMissions[missionId] || state.activeMissions['MISSION-MZ-04'];
    if (mission) {
      mission.status = 'IN_TRANSIT';
      mission.dispatchedAt = new Date().toISOString();
      if (cargoManifest) mission.cargoAllocations = cargoManifest;
    }

    const vehId = vehicleId || 'Medic-01';
    const veh = state.fleetTelemetry[vehId];
    if (veh) {
      veh.status = 'ON_ROUTE';
      veh.speed_kmh = 42;
      veh.current_speed_kmh = 42;
      veh.assigned_route_id = routeId || 'ROUTE-MZ-04-BYPASS';
    }

    io.emit('MISSION_DISPATCHED', { mission, vehicle: veh });
    io.emit('STATE_UPDATED', state);
  });

  // 3. Convoy Telemetry Update
  socket.on('UPDATE_TELEMETRY', (data: any) => {
    const { vehicleId, progressPct, isDeadZone, speedKmh, coords } = data;
    const veh = state.fleetTelemetry[vehicleId];
    if (veh) {
      if (progressPct !== undefined) veh.route_progress_pct = progressPct;
      if (speedKmh !== undefined) {
        veh.speed_kmh = speedKmh;
        veh.current_speed_kmh = speedKmh;
      }
      if (coords) veh.current_coords = coords;
      if (isDeadZone !== undefined) {
        veh.status = isDeadZone ? 'DEAD_ZONE_EXTRAPOLATING' : 'ON_ROUTE';
        veh.dead_reckoning_distance_m = isDeadZone ? 6800 : 0;
      }
      io.emit('CONVOY_TELEMETRY_TICK', { vehicle: veh });
    }
  });

  // 4. Driver SOS Trigger
  socket.on('TRIGGER_DRIVER_SOS', (data: any) => {
    const { vehicleId, alert: clientAlert } = data;
    const veh = state.fleetTelemetry[vehicleId];
    if (veh) {
      veh.status = 'SOS_ALERT';
      veh.is_sos_manual = true;
    }

    const alert = clientAlert || {
      id: `sos-${Date.now()}`,
      vehicle_id: vehicleId,
      vehicle_name: veh?.vehicle_name || vehicleId,
      cargo_type: veh?.cargo_type || 'Emergency Cargo',
      timestamp: new Date().toISOString(),
      severity: 'CRITICAL',
      type: 'SOS_TRIGGERED',
      title: 'CRITICAL SOS: Driver Cabin Emergency Transponder Activated',
      message: `Distress beacon from ${veh?.driver_name || 'Convoy Driver'} on Mission ${veh?.mission_id || 'Active'}. Coordinates: [${(veh?.current_coords || [24.38, 92.72]).join(', ')}]. Immediate QRT dispatched.`,
      coords: veh?.current_coords || [24.3800, 92.7200],
      acknowledged: false,
    };
    state.alerts.unshift(alert);

    io.emit('DRIVER_SOS_SIGNAL', { vehicleId, vehicle: veh, alert });
    io.emit('STATE_UPDATED', state);
  });

  // 4b. Driver SOS Stand Down / Cancel
  socket.on('CANCEL_DRIVER_SOS', (data: any) => {
    const { vehicleId } = data;
    const veh = state.fleetTelemetry[vehicleId];
    if (veh) {
      veh.status = 'ON_ROUTE';
      veh.is_sos_manual = false;
    }
    state.alerts = state.alerts.filter((a: any) => !(a.vehicle_id === vehicleId && a.type === 'SOS_TRIGGERED'));
    io.emit('DRIVER_SOS_CANCELLED', { vehicleId });
    io.emit('STATE_UPDATED', state);
  });

  // 5. Mission Delivery Confirmation (Closed-Loop Handover)
  socket.on('CONFIRM_DELIVERY', (data: any) => {
    const { communityId, vehicleId } = data;
    const cId = communityId || 'MZ-KOL-004';
    const vId = vehicleId || 'Medic-01';

    // 1. Reset community inventory to 100% and Delta_t = 0
    const comm = state.communities[cId];
    if (comm) {
      comm.elapsedTimeHours = 0;
      comm.cutoffTimeHours = 48.0;
      comm.isMonsoonAlertActive = false;
      comm.disruptionProbMax = 0.15;
      comm.inventories.IV_FLUIDS.currentStock = comm.inventories.IV_FLUIDS.capacity;
      comm.inventories.ANTIVENOM.currentStock = comm.inventories.ANTIVENOM.capacity;

      const restored = recalculateCommunityPriority(comm, 1.0);
      restored.priorityTier = 'P4';
      restored.finalScore = 0.22;
      state.communities[cId] = restored;
    }

    // 2. Mark vehicle delivered / completed
    const veh = state.fleetTelemetry[vId];
    if (veh) {
      veh.status = 'DELIVERED_COMPLETED';
      veh.current_speed_kmh = 0;
      veh.speed_kmh = 0;
      veh.route_progress_pct = 100;
      veh.is_sos_manual = false;
    }

    // 3. Close active mission
    const mission = state.activeMissions['MISSION-MZ-04'];
    if (mission) {
      mission.status = 'DELIVERED';
      mission.deliveredAt = new Date().toISOString();
    }

    // 4. Recover District Health
    if (state.districtHealth.kolasib) {
      state.districtHealth.kolasib.accessibilityScore = 92;
      state.districtHealth.kolasib.category = 'STABLE';
      state.districtHealth.kolasib.minDaysSupply = 14.0;
    }

    io.emit('MISSION_DELIVERED_RESTOCK', {
      communityId: cId,
      vehicleId: vId,
      community: state.communities[cId],
      vehicle: veh,
      districtHealth: state.districtHealth,
    });
    io.emit('STATE_UPDATED', state);
  });

  // 6. Interactive 1-Click Walkthrough Demo Step Dispatcher
  socket.on('TRIGGER_DEMO_STEP', (data: { step: number }) => {
    const { step } = data;
    console.log(`[Demo Script] Triggered Step ${step}`);

    if (step === 1) {
      // Step 1: Inject Weather Spike & Landslide on NH-306
      state.disruptions['SEG-SIL-KOL'] = {
        status: 'TOTAL_BLOCKAGE',
        cause: 'Hillside Slope Failure & Monsoon Downpour',
        description: '350m rockfall severing NH-306. Impassable for all standard logistics.',
        reportedBy: 'Field Officer Insp. L. Hmar',
      };
      state.rainfallMultiplier = 2.4;

      const kol = state.communities['MZ-KOL-004'];
      if (kol) {
        kol.cutoffTimeHours = 3.5;
        kol.elapsedTimeHours = 6.0;
        kol.disruptionProbMax = 0.95;
        kol.isMonsoonAlertActive = true;
        state.communities['MZ-KOL-004'] = recalculateCommunityPriority(kol, state.rainfallMultiplier);
      }

      state.activeMissions['MISSION-MZ-04'] = {
        id: 'MISSION-MZ-04',
        communityId: 'MZ-KOL-004',
        communityName: 'Kolasib East (Civil Hospital)',
        recommendedVehicleType: '4x4 Emergency Van (Medic-01)',
        cargoAllocations: [
          { item: 'IV Fluids (Ringer Lactate)', quantity: 500, unit: 'bottles' },
          { item: 'Polyvalent Snake Antivenom', quantity: 90, unit: 'vials' },
        ],
        assignedRouteId: 'ROUTE-MZ-04-BYPASS',
        suggestedDetour: 'Silchar -> Vairengte -> Bairabi -> Kolasib Bypass',
        status: 'SUGGESTED',
        urgency: 'P1_CRITICAL',
        createdAt: new Date().toISOString(),
      };

      if (state.districtHealth.kolasib) {
        state.districtHealth.kolasib.accessibilityScore = 22;
        state.districtHealth.kolasib.category = 'CRITICAL';
        state.districtHealth.kolasib.minDaysSupply = 1.8;
      }
    } else if (step === 2) {
      // Step 2: Approve and Dispatch Medical Convoy on Detour
      const mission = state.activeMissions['MISSION-MZ-04'];
      if (mission) {
        mission.status = 'IN_TRANSIT';
        mission.dispatchedAt = new Date().toISOString();
      }
      const veh = state.fleetTelemetry['Medic-01'];
      if (veh) {
        veh.status = 'ON_ROUTE';
        veh.current_speed_kmh = 42;
        veh.speed_kmh = 42;
        veh.route_progress_pct = 45;
        veh.assigned_route_id = 'ROUTE-MZ-04-BYPASS';
      }
    } else if (step === 3) {
      // Step 3: Advance through Dead-Zone & Confirm Delivery Loop Closure
      const comm = state.communities['MZ-KOL-004'];
      if (comm) {
        comm.elapsedTimeHours = 0;
        comm.cutoffTimeHours = 48.0;
        comm.isMonsoonAlertActive = false;
        comm.disruptionProbMax = 0.15;
        comm.inventories.IV_FLUIDS.currentStock = comm.inventories.IV_FLUIDS.capacity;
        comm.inventories.ANTIVENOM.currentStock = comm.inventories.ANTIVENOM.capacity;
        const restored = recalculateCommunityPriority(comm, 1.0);
        restored.priorityTier = 'P4';
        restored.finalScore = 0.22;
        state.communities['MZ-KOL-004'] = restored;
      }

      const veh = state.fleetTelemetry['Medic-01'];
      if (veh) {
        veh.status = 'DELIVERED_COMPLETED';
        veh.current_speed_kmh = 0;
        veh.speed_kmh = 0;
        veh.route_progress_pct = 100;
        veh.dead_reckoning_distance_m = 0;
      }

      delete state.disruptions['SEG-SIL-KOL'];
      state.rainfallMultiplier = 1.0;

      if (state.districtHealth.kolasib) {
        state.districtHealth.kolasib.accessibilityScore = 92;
        state.districtHealth.kolasib.category = 'STABLE';
        state.districtHealth.kolasib.minDaysSupply = 14.0;
      }
    } else if (step === 0) {
      // Reset Simulation
      delete state.disruptions['SEG-SIL-KOL'];
      state.rainfallMultiplier = 1.0;
      const comm = state.communities['MZ-KOL-004'];
      if (comm) {
        comm.elapsedTimeHours = 0;
        comm.cutoffTimeHours = 24.0;
        comm.isMonsoonAlertActive = false;
        comm.disruptionProbMax = 0.25;
        comm.priorityTier = 'P4';
        comm.finalScore = 0.28;
      }
      const veh = state.fleetTelemetry['Medic-01'];
      if (veh) {
        veh.status = 'ON_ROUTE';
        veh.current_speed_kmh = 38;
        veh.speed_kmh = 38;
        veh.route_progress_pct = 35;
        veh.is_sos_manual = false;
      }
      delete state.activeMissions['MISSION-MZ-04'];
      if (state.districtHealth.kolasib) {
        state.districtHealth.kolasib.accessibilityScore = 78;
        state.districtHealth.kolasib.category = 'STABLE';
        state.districtHealth.kolasib.minDaysSupply = 8.5;
      }
    }

    io.emit('STATE_UPDATED', state);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// Start Server
httpServer.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 PRAVAH Backend WebSocket Server running on port ${PORT}`);
  console.log(`📡 Socket.io connected and ready for multi-client sync`);
  console.log(`🌦️ Open-Meteo live API integration active`);
  console.log(`====================================================`);
});
