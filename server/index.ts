import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'pravah_store.json');

// Ensure .env variables are loaded into process.env if running without --env-file
const envPath = path.join(__dirname, '../.env');
function reloadEnvFile() {
  if (fs.existsSync(envPath)) {
    try {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      envContent.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
            process.env[key] = val;
          }
        }
      });
    } catch {}
  }
}
reloadEnvFile();

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


const PYTHON_CMD = fs.existsSync('/opt/anaconda3/bin/python3')
  ? '/opt/anaconda3/bin/python3'
  : 'python3';

// ==========================================
// Extensible Configuration Schemas
// ==========================================
const CONFIG = {
  ISRO_BHUVAN_API_KEY: process.env.BHUVAN_API_TOKEN || process.env.ISRO_BHUVAN_API_KEY || '',
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
      id: 'inc-01',
      title: 'Massive Mudflow Severing NH-29 Pagla Pahar Sector',
      corridorFlair: 'r/NH-29-Nagaland',
      incidentType: 'Landslide',
      severity: 'Total Blockage',
      location: {
        lat: 25.7500,
        lng: 93.9800,
        placeName: 'Pagla Pahar (Km 144), Kohima District',
        state: 'Nagaland',
        corridorId: 'SEG-DIM-KOH-MAIN',
      },
      author: {
        name: 'Subedar K. Sema',
        role: 'Field Officer (BRO/Police)',
      },
      timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
      mediaUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
      votes: { upvotes: 38, downvotes: 2, userVote: null },
      confidenceScore: 46,
      hasOfficerVerified: true,
      sync_status: 'SYNCED',
      updates: [
        {
          id: 'u-1',
          author: 'BRO Project Sewak Lead',
          role: 'Field Officer (BRO/Police)',
          message: 'Heavy bulldozer units deployed at southern shoulder. Est clearance: 6 hours.',
          timestamp: new Date(Date.now() - 20 * 60000).toISOString(),
        },
      ],
    },
    {
      id: 'inc-02',
      title: 'Bilkhawthlir Silt Subsidence on NH-306',
      corridorFlair: 'r/Mizoram-NH-306',
      incidentType: 'Road Subsidence',
      severity: 'Single Lane Passable',
      location: {
        lat: 24.2850,
        lng: 92.7350,
        placeName: 'Bilkhawthlir Escarpment, Kolasib District',
        state: 'Mizoram',
        corridorId: 'SEG-SIL-KOL',
      },
      author: {
        name: 'Inspector L. Hmar',
        role: 'Field Officer (BRO/Police)',
      },
      timestamp: new Date(Date.now() - 90 * 60000).toISOString(),
      mediaUrl: 'https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?auto=format&fit=crop&w=800&q=80',
      votes: { upvotes: 24, downvotes: 1, userVote: null },
      confidenceScore: 33,
      hasOfficerVerified: true,
      sync_status: 'SYNCED',
      updates: [
        {
          id: 'u-2',
          author: 'Insp. L. Hmar',
          role: 'Field Officer (BRO/Police)',
          message: 'Single alternate lane opened. Axle limit strictly 18T. Medic-01 escorted through.',
          timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
        },
      ],
    },
  ],
  alerts: [],
  districtHealth: {
    kolasib: { id: 'kolasib', name: 'Kolasib', state: 'Mizoram', accessibilityScore: 78, category: 'STABLE', minDaysSupply: 8.5 },
    kohima: { id: 'kohima', name: 'Kohima', state: 'Nagaland', accessibilityScore: 42, category: 'CRITICAL', minDaysSupply: 2.8 },
  },
};

// ==========================================
// Database Persistence Engine (JSON File Store)
// ==========================================
function saveDb() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('💾 [DB] Failed to persist state to disk:', err);
  }
}

function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed) {
        if (Array.isArray(parsed.groundReports) && parsed.groundReports.length > 0) {
          state.groundReports = parsed.groundReports;
        }
        if (parsed.disruptions && Object.keys(parsed.disruptions).length > 0) {
          state.disruptions = { ...state.disruptions, ...parsed.disruptions };
        }
        if (parsed.communities && Object.keys(parsed.communities).length > 0) {
          state.communities = { ...state.communities, ...parsed.communities };
        }
        if (parsed.activeMissions && Object.keys(parsed.activeMissions).length > 0) {
          state.activeMissions = { ...state.activeMissions, ...parsed.activeMissions };
        }
        if (parsed.fleetTelemetry && Object.keys(parsed.fleetTelemetry).length > 0) {
          state.fleetTelemetry = { ...state.fleetTelemetry, ...parsed.fleetTelemetry };
        }
        if (Array.isArray(parsed.alerts)) {
          state.alerts = parsed.alerts;
        }
        if (parsed.districtHealth) {
          state.districtHealth = { ...state.districtHealth, ...parsed.districtHealth };
        }
        console.log(`💾 [DB] Hydrated state from ${DB_FILE} (${state.groundReports.length} reports, ${Object.keys(state.disruptions).length} disruptions)`);
        return;
      }
    }
  } catch (err) {
    console.warn('💾 [DB] Failed to load pravah_store.json, initializing baseline state:', err);
  }
  saveDb();
}

// Hydrate DB on module evaluation
loadDb();


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

// REST Endpoints for Data Persistence & Direct Inspection
app.get('/api/incidents', (req, res) => {
  res.json(state.groundReports);
});

app.post('/api/incidents', (req, res) => {
  const data = req.body;
  const isOfficer =
    data.author?.role?.includes('Officer') ||
    data.authorRole?.includes('Officer') ||
    data.isOfficer ||
    data.hasOfficerVerified;
  const confidence = isOfficer ? 11 : 1;
  const incidentId = data.id || `inc-${Date.now()}`;
  const corridorId = data.location?.corridorId || data.corridorId || 'SEG-SIL-KOL';
  const placeName = data.location?.placeName || data.placeName || 'NH-306 Sector';
  const severity = data.severity || 'Total Blockage';
  const incidentType = data.incidentType || 'Landslide';

  const newIncident = {
    id: incidentId,
    title: data.title || 'Roadblock Incident',
    corridorFlair: data.corridorFlair || 'r/Mizoram-NH-306',
    incidentType,
    severity,
    location: {
      lat: data.location?.lat ?? 24.2850,
      lng: data.location?.lng ?? 92.7350,
      placeName,
      state: data.location?.state || 'Mizoram',
      corridorId,
    },
    author: {
      name: data.author?.name || data.authorName || 'Field Reporter',
      role: isOfficer ? 'Field Officer (BRO/Police)' : (data.author?.role || 'Citizen Driver'),
    },
    timestamp: data.timestamp || new Date().toISOString(),
    mediaUrl: data.mediaUrl || '',
    votes: data.votes || { upvotes: 1, downvotes: 0, userVote: null },
    confidenceScore: data.confidenceScore ?? confidence,
    hasOfficerVerified: Boolean(isOfficer),
    sync_status: 'SYNCED',
    updates: Array.isArray(data.updates) ? data.updates : [],
  };

  const existingIdx = state.groundReports.findIndex((r) => r.id === incidentId);
  if (existingIdx >= 0) {
    state.groundReports[existingIdx] = newIncident;
  } else {
    state.groundReports.unshift(newIncident);
  }

  if (severity === 'Total Blockage' || isOfficer) {
    state.disruptions[corridorId] = {
      status: severity === 'Total Blockage' ? 'TOTAL_BLOCKAGE' : 'SINGLE_LANE_PASSABLE',
      cause: incidentType,
      description: newIncident.title,
      reportedBy: `${newIncident.author.name} (${newIncident.author.role})`,
    };
  }

  saveDb();
  io.emit('INCIDENT_ADDED', { incident: newIncident, disruptions: state.disruptions });
  io.emit('INCIDENT_VERIFIED', { incident: newIncident, disruptions: state.disruptions });
  io.emit('STATE_UPDATED', state);
  res.json({ success: true, incident: newIncident });
});

app.post('/api/incidents/:id/vote', (req, res) => {
  const { id } = req.params;
  const { type, role } = req.body;
  const report = state.groundReports.find((r) => r.id === id);
  if (!report) {
    return res.status(404).json({ error: 'Incident not found' });
  }

  if (type === 'up') {
    report.votes.upvotes = (report.votes.upvotes || 0) + 1;
  } else if (type === 'down') {
    report.votes.downvotes = (report.votes.downvotes || 0) + 1;
  }

  const isOfficer = role?.includes('Officer') || report.hasOfficerVerified;
  report.confidenceScore = (report.votes.upvotes || 0) - (report.votes.downvotes || 0) + (isOfficer ? 10 : 0);
  report.hasOfficerVerified = isOfficer;

  saveDb();
  io.emit('INCIDENT_VOTED', {
    incidentId: id,
    votes: report.votes,
    confidenceScore: report.confidenceScore,
    hasOfficerVerified: report.hasOfficerVerified,
  });
  io.emit('STATE_UPDATED', state);
  res.json({ success: true, incident: report });
});

app.post('/api/incidents/:id/updates', (req, res) => {
  const { id } = req.params;
  const { message, author, role } = req.body;
  const report = state.groundReports.find((r) => r.id === id);
  if (!report) {
    return res.status(404).json({ error: 'Incident not found' });
  }

  const update = {
    id: `u-${Date.now()}`,
    author: author || 'Ground Observer',
    role: role || 'Registered Driver',
    message: message || '',
    timestamp: new Date().toISOString(),
  };

  if (!Array.isArray(report.updates)) {
    report.updates = [];
  }
  report.updates.push(update);

  saveDb();
  io.emit('INCIDENT_UPDATE_ADDED', { incidentId: id, update, updates: report.updates });
  io.emit('STATE_UPDATED', state);
  res.json({ success: true, update, incident: report });
});

app.get('/api/disruptions', (req, res) => {
  res.json(state.disruptions);
});

app.get('/api/missions', (req, res) => {
  res.json(state.activeMissions);
});

// ==========================================
// ==========================================
// Model A Python Microservice & Frozen XGBoost Integration
// ==========================================
const MODEL_A_SERVICE_URL = process.env.MODEL_A_SERVICE_URL || 'http://127.0.0.1:5005';

const FROZEN_MODEL_A_FEATURE_KEYS = [
  'rainfall_24h',
  'rainfall_72h',
  'rainfall_7d',
  'elevation_m',
  'slope_degrees',
  'historical_road_landslide_count',
  'historical_road_landslide_presence',
  'bt_road_km',
  'icbp_km',
  'cement_concrete_km',
  'paver_block_km',
  'total_paved_road_km',
  'bt_road_ratio',
  'icbp_ratio',
  'cement_concrete_ratio',
  'paver_block_ratio',
  'road_surface_diversity',
] as const;

function validateAndSanitizeFeatures(rawInput: any): {
  isValid: boolean;
  features?: Record<string, number>;
  error?: string;
} {
  if (!rawInput || typeof rawInput !== 'object') {
    return { isValid: false, error: 'Payload must be a valid JSON object' };
  }

  let raw = rawInput.features && typeof rawInput.features === 'object' ? rawInput.features : rawInput;

  // Normalize icbp_road_ratio alias if present
  if (raw.icbp_road_ratio !== undefined && raw.icbp_ratio === undefined) {
    raw = { ...raw, icbp_ratio: raw.icbp_road_ratio };
  }

  const missing: string[] = [];
  const invalid: string[] = [];
  const features: Record<string, number> = {};

  for (const key of FROZEN_MODEL_A_FEATURE_KEYS) {
    if (raw[key] === undefined || raw[key] === null || raw[key] === '') {
      missing.push(key);
    } else {
      const val = Number(raw[key]);
      if (isNaN(val) || !isFinite(val)) {
        invalid.push(key);
      } else {
        features[key] = val;
      }
    }
  }

  if (missing.length > 0) {
    return {
      isValid: false,
      error: `Missing required Model A features: ${missing.join(', ')}`,
    };
  }

  if (invalid.length > 0) {
    return {
      isValid: false,
      error: `Invalid numeric values for Model A features: ${invalid.join(', ')}`,
    };
  }

  return { isValid: true, features };
}

app.get('/api/model-a/health', async (req, res) => {
  try {
    const upstream = await fetch(`${MODEL_A_SERVICE_URL}/health`);
    if (upstream.ok) {
      const data = await upstream.json();
      return res.json(data);
    }
  } catch { }

  const modelDir = path.join(__dirname, '..', 'model-services', 'model-a');
  const modelJsonPath = path.join(modelDir, 'model', 'pravah_model_a_baseline_xgb.json');
  const schemaPath = path.join(modelDir, 'model', 'pravah_model_a_frozen_feature_schema.csv');
  const scriptPath = path.join(modelDir, 'inference', 'predict_model_a.py');
  const modelReady = fs.existsSync(modelJsonPath) && fs.existsSync(schemaPath) && fs.existsSync(scriptPath);

  return res.json({
    status: modelReady ? 'healthy' : 'unavailable',
    service: 'pravah-model-a',
    engine: 'frozen_xgboost_python3_cli',
    model_version: '3.4.1-baseline-xgb',
    features_count: FROZEN_MODEL_A_FEATURE_KEYS.length,
    threshold: 0.50,
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/model-a/predict', async (req, res) => {
  console.log('[Model A] Request');
  console.log(`[Model A] Endpoint: ${req.originalUrl || req.url}`);

  // Validate exact 17 frozen features
  const validation = validateAndSanitizeFeatures(req.body);
  if (!validation.isValid || !validation.features) {
    console.warn(`[Model A] Validation failed: ${validation.error}`);
    return res.status(400).json({
      error: validation.error,
    });
  }

  const features = validation.features;
  console.log(`[Model A] Feature count: ${Object.keys(features).length}`);
  console.log('[Model A] Inference started');

  const segmentId = req.body?.segment_id || 'MODEL_A_PREDICTION';
  const predictionTime = req.body?.prediction_time || new Date().toISOString();
  const horizonTime = req.body?.horizon_time;
  const threshold = typeof req.body?.threshold === 'number' ? req.body.threshold : 0.50;

  // 1. Try FastAPI microservice on 5005 if online
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);
    const upstream = await fetch(`${MODEL_A_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        segment_id: segmentId,
        prediction_time: predictionTime,
        horizon_time: horizonTime,
        features,
        threshold,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (upstream.ok) {
      const data = await upstream.json();
      console.log('[Model A] Inference completed');
      console.log(`[Model A] Probability: ${data.probability}`);
      console.log(`[Model A] Prediction: ${data.prediction}`);
      return res.status(upstream.status).json(data);
    }
  } catch { }

  // 2. Direct Python CLI execution fallback using real frozen XGBoost model package
  try {
    const { execSync } = await import('child_process');
    const modelDir = path.join(__dirname, '..', 'model-services', 'model-a');
    const scriptPath = path.join(modelDir, 'inference', 'predict_model_a.py');
    const modelJsonPath = path.join(modelDir, 'model', 'pravah_model_a_baseline_xgb.json');
    const schemaPath = path.join(modelDir, 'model', 'pravah_model_a_frozen_feature_schema.csv');

    const tempFileName = `temp_eval_${Date.now()}_${Math.random().toString(36).substring(7)}.json`;
    const tempFile = path.join(modelDir, 'examples', tempFileName);

    fs.writeFileSync(tempFile, JSON.stringify(features));

    try {
      const pyOutputRaw = execSync(
        `"${PYTHON_CMD}" "${scriptPath}" --model "${modelJsonPath}" --schema "${schemaPath}" --input "${tempFile}" --threshold ${threshold}`,
        { encoding: 'utf-8', timeout: 10000 }
      );

      const pyOutput = JSON.parse(pyOutputRaw.trim());
      const probability = Number(pyOutput.event_probability ?? pyOutput.probability);
      const prediction = pyOutput.prediction === 1 ? 1 : 0;
      const risk_band =
        probability >= 0.8 ? 'HIGH' : probability >= 0.6 ? 'ELEVATED' : probability >= 0.3 ? 'MODERATE' : 'LOW';

      console.log('[Model A] Inference completed');
      console.log(`[Model A] Probability: ${probability}`);
      console.log(`[Model A] Prediction: ${prediction}`);

      return res.json({
        segment_id: segmentId,
        probability,
        prediction,
        threshold: Number(pyOutput.threshold ?? threshold),
        risk_band,
        interpretation: pyOutput.interpretation || 'Model A predictive risk signal',
        model_version: '3.4.1-baseline-xgb',
        prediction_time: predictionTime,
        horizon_time: horizonTime,
        feature_snapshot: features,
        source: 'MODEL_A_INFERENCE',
      });
    } finally {
      try { fs.unlinkSync(tempFile); } catch { }
    }
  } catch (err: any) {
    console.error('[Model A] Execution error:', err?.message);
    return res.status(500).json({
      error: `Model A inference error: ${err?.message || 'Execution failed'}`,
      details: err?.stderr?.toString() || err?.message,
    });
  }
});

app.post('/api/model-a/batch_predict', async (req, res) => {
  console.log('[Model A] Batch Request');
  console.log(`[Model A] Endpoint: ${req.originalUrl || req.url}`);

  const items = Array.isArray(req.body) ? req.body : req.body?.predictions || req.body?.items;
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Payload must be an array of segment prediction requests' });
  }

  // 1. Try FastAPI microservice on 5005 if online
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const upstream = await fetch(`${MODEL_A_SERVICE_URL}/batch_predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (upstream.ok) {
      const data = await upstream.json();
      return res.status(upstream.status).json(data);
    }
  } catch { }

  // 2. Direct Python CLI execution fallback for batch
  try {
    const { execSync } = await import('child_process');
    const modelDir = path.join(__dirname, '..', 'model-services', 'model-a');
    const scriptPath = path.join(modelDir, 'inference', 'predict_model_a.py');
    const modelJsonPath = path.join(modelDir, 'model', 'pravah_model_a_baseline_xgb.json');
    const schemaPath = path.join(modelDir, 'model', 'pravah_model_a_frozen_feature_schema.csv');

    const results = [];
    for (const item of items) {
      const validation = validateAndSanitizeFeatures(item);
      const segmentId = item.segment_id || 'UNKNOWN_SEGMENT';
      const threshold = typeof item.threshold === 'number' ? item.threshold : 0.50;

      if (!validation.isValid || !validation.features) {
        results.push({
          segment_id: segmentId,
          error: validation.error,
          probability: null,
          prediction: null,
          source: 'MODEL_A_VALIDATION_ERROR',
        });
        continue;
      }

      const tempFileName = `temp_batch_${Date.now()}_${Math.random().toString(36).substring(7)}.json`;
      const tempFile = path.join(modelDir, 'examples', tempFileName);
      fs.writeFileSync(tempFile, JSON.stringify(validation.features));

      try {
        const pyOutputRaw = execSync(
          `python3 "${scriptPath}" --model "${modelJsonPath}" --schema "${schemaPath}" --input "${tempFile}" --threshold ${threshold}`,
          { encoding: 'utf-8', timeout: 5000 }
        );
        try { fs.unlinkSync(tempFile); } catch { }

        const pyOutput = JSON.parse(pyOutputRaw.trim());
        const prob = Number(pyOutput.event_probability ?? pyOutput.probability);
        const risk_band = prob >= 0.8 ? 'HIGH' : prob >= 0.6 ? 'ELEVATED' : prob >= 0.3 ? 'MODERATE' : 'LOW';

        results.push({
          segment_id: segmentId,
          probability: prob,
          prediction: pyOutput.prediction === 1 ? 1 : 0,
          threshold: Number(pyOutput.threshold ?? threshold),
          risk_band,
          interpretation: pyOutput.interpretation || 'Model A predictive risk signal',
          model_version: '3.4.1-baseline-xgb',
          prediction_time: item.prediction_time || new Date().toISOString(),
          horizon_time: item.horizon_time,
          feature_snapshot: validation.features,
          source: 'MODEL_A_INFERENCE',
        });
      } catch (execErr: any) {
        try { fs.unlinkSync(tempFile); } catch { }
        results.push({
          segment_id: segmentId,
          error: execErr?.message,
          probability: null,
          prediction: null,
          source: 'MODEL_A_EXECUTION_ERROR',
        });
      }
    }

    return res.json({ predictions: results });
  } catch (batchErr: any) {
    return res.status(500).json({
      error: `Model A batch inference error: ${batchErr?.message || 'Execution failed'}`,
    });
  }
});

// ==========================================
// PRAVAH MODEL B ROUTE DELAY-FACTOR ENDPOINTS
// ==========================================
const MODEL_B_SERVICE_URL = process.env.MODEL_B_SERVICE_URL || 'http://127.0.0.1:5006';

export const EXACT_MODEL_B_FEATURE_KEYS = [
  'distance_km',
  'osrm_duration_minutes',
  'straight_distance_km',
  'route_speed_kmh',
  'detour_ratio',
  'route_mean_rainfall_24h',
  'route_max_rainfall_24h',
  'route_mean_rainfall_72h',
  'route_max_rainfall_72h',
  'route_mean_rainfall_7d',
  'route_max_rainfall_7d',
  'route_mean_target',
  'route_max_target',
  'origin_rainfall_24h',
  'origin_rainfall_72h',
  'origin_rainfall_7d',
  'origin_target',
  'destination_rainfall_24h',
  'destination_rainfall_72h',
  'destination_rainfall_7d',
  'destination_target',
] as const;

function validateAndSanitizeModelBFeatures(input: any): { isValid: boolean; features?: Record<string, number>; error?: string } {
  if (!input || typeof input !== 'object') {
    return { isValid: false, error: 'Payload must be a valid JSON object' };
  }
  const rawFeatures = input.features || input;
  const missing: string[] = [];
  const invalid: string[] = [];
  const features: Record<string, number> = {};

  for (const key of EXACT_MODEL_B_FEATURE_KEYS) {
    if (!(key in rawFeatures) || rawFeatures[key] === null || rawFeatures[key] === undefined) {
      missing.push(key);
      continue;
    }
    const val = Number(rawFeatures[key]);
    if (isNaN(val) || !isFinite(val)) {
      invalid.push(key);
      continue;
    }
    features[key] = val;
  }

  if (missing.length > 0) {
    return { isValid: false, error: `Missing required Model B features: ${missing.join(', ')}` };
  }
  if (invalid.length > 0) {
    return { isValid: false, error: `Non-numeric values for Model B features: ${invalid.join(', ')}` };
  }

  return { isValid: true, features };
}

const MODEL_B_DIR = path.join(__dirname, '..', 'model-services', 'model-b');
const MODEL_B_SCRIPT_PATH = path.join(MODEL_B_DIR, 'inference', 'predict_model_b.py');
const MODEL_B_JOBLIB_PATH = path.join(MODEL_B_DIR, 'model', 'model_b_delay_factor_regressor.joblib');
const MODEL_B_SCHEMA_PATH = path.join(MODEL_B_DIR, 'model', 'model_b_delay_factor_schema.json');

app.get('/api/model-b/health', async (req, res) => {
  try {
    const upstream = await fetch(`${MODEL_B_SERVICE_URL}/health`);
    if (upstream.ok) {
      const data = await upstream.json();
      return res.json(data);
    }
  } catch { }

  const modelReady = fs.existsSync(MODEL_B_JOBLIB_PATH) && fs.existsSync(MODEL_B_SCHEMA_PATH) && fs.existsSync(MODEL_B_SCRIPT_PATH);

  return res.json({
    status: modelReady ? 'healthy' : 'unavailable',
    service: 'pravah-model-b',
    engine: 'random_forest_regressor_joblib',
    model_version: 'prototype_v2_delay_factor',
    features_count: EXACT_MODEL_B_FEATURE_KEYS.length,
    bounds: {
      minimum: 1.0,
      maximum: 1.75,
    },
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/model-b/predict', async (req, res) => {
  console.log('[Model B] Request');
  console.log(`[Model B] Endpoint: ${req.originalUrl || req.url}`);

  const validation = validateAndSanitizeModelBFeatures(req.body);
  if (!validation.isValid || !validation.features) {
    console.warn(`[Model B] Validation failed: ${validation.error}`);
    return res.status(400).json({ error: validation.error });
  }

  const features = validation.features;
  console.log(`[Model B] Feature count: ${Object.keys(features).length}`);
  console.log('[Model B] Inference started');

  // 1. Try microservice if online
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);
    const upstream = await fetch(`${MODEL_B_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (upstream.ok) {
      const data = await upstream.json();
      console.log('[Model B] Inference completed');
      console.log(`[Model B] Predicted delay factor: ${data.predicted_delay_factor}`);
      return res.status(upstream.status).json(data);
    }
  } catch { }

  // 2. Direct Python CLI execution fallback
  const tempFileName = `temp_b_${Date.now()}_${Math.random().toString(36).substring(7)}.json`;
  const tempFile = path.join(MODEL_B_DIR, tempFileName);

  try {
    const { execSync } = await import('child_process');
    fs.writeFileSync(tempFile, JSON.stringify(features));

    const pyOutputRaw = execSync(
      `"${PYTHON_CMD}" "${MODEL_B_SCRIPT_PATH}" "${tempFile}"`,
      { encoding: 'utf-8', timeout: 15000 }
    );

    const pyOutput = JSON.parse(pyOutputRaw.trim());
    console.log('[Model B] Inference completed');
    console.log(`[Model B] Predicted delay factor: ${pyOutput.predicted_delay_factor}`);

    return res.json(pyOutput);
  } catch (err: any) {
    console.error('[Model B] Execution error:', err?.message);
    return res.status(500).json({
      error: `Model B inference error: ${err?.message || 'Execution failed'}`,
      details: err?.stderr?.toString() || err?.message,
    });
  } finally {
    try { fs.unlinkSync(tempFile); } catch { }
  }
});

app.post('/api/model-b/multi_predict', async (req, res) => {
  console.log('[Model B] Multi Request');
  console.log(`[Model B] Endpoint: ${req.originalUrl || req.url}`);

  const routes = Array.isArray(req.body) ? req.body : req.body?.routes;
  if (!Array.isArray(routes) || routes.length === 0) {
    return res.status(400).json({ error: 'Payload must contain a non-empty array of candidate routes' });
  }

  // 1. Try microservice if online
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const upstream = await fetch(`${MODEL_B_SERVICE_URL}/multi_predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routes }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (upstream.ok) {
      const data = await upstream.json();
      return res.status(upstream.status).json(data);
    }
  } catch { }

  // 2. Direct Python CLI execution fallback
  const multiTempFileName = `temp_b_multi_${Date.now()}_${Math.random().toString(36).substring(7)}.json`;
  const multiTempFile = path.join(MODEL_B_DIR, multiTempFileName);

  try {
    const { execSync } = await import('child_process');
    fs.writeFileSync(multiTempFile, JSON.stringify({ routes }));

    const pyOutputRaw = execSync(
      `"${PYTHON_CMD}" "${MODEL_B_SCRIPT_PATH}" "${multiTempFile}" --multi`,
      { encoding: 'utf-8', timeout: 15000 }
    );

    const pyOutput = JSON.parse(pyOutputRaw.trim());
    return res.json(pyOutput);
  } catch (err: any) {
    console.error('[Model B] Multi Execution error:', err?.message);
    return res.status(500).json({
      error: `Model B multi-inference error: ${err?.message || 'Execution failed'}`,
      details: err?.stderr?.toString() || err?.message,
    });
  } finally {
    try { fs.unlinkSync(multiTempFile); } catch { }
  }
});

app.post('/api/reset-db', (req, res) => {
  try {
    if (fs.existsSync(DB_FILE)) {
      fs.unlinkSync(DB_FILE);
    }
  } catch { }
  loadDb();
  io.emit('INITIAL_STATE_SYNC', state);
  res.json({ success: true, message: 'Database reset to initial baseline' });
});

// ==========================================
// ISRO Bhuvan Shortest Path API Proxy
// Server-only endpoint to securely query Bhuvan without exposing token to frontend
// ==========================================
app.all('/api/bhuvan/shortest-path', async (req, res) => {
  try {
    reloadEnvFile();
    const body = req.body || {};
    const query = req.query || {};

    const origin = body.origin || body.originCoords;
    const destination = body.destination || body.destinationCoords;

    const lat1 = origin ? Number(origin[0]) : Number(body.lat1 ?? query.lat1);
    const lon1 = origin ? Number(origin[1]) : Number(body.lon1 ?? query.lon1);
    const lat2 = destination ? Number(destination[0]) : Number(body.lat2 ?? query.lat2);
    const lon2 = destination ? Number(destination[1]) : Number(body.lon2 ?? query.lon2);

    if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
      return res.status(400).json({
        success: false,
        error: 'Missing coordinates. Please provide origin: [lat, lon] and destination: [lat, lon]',
      });
    }

    const token = process.env.ISRO_BHUVAN_API_KEY || process.env.BHUVAN_API_TOKEN || CONFIG.ISRO_BHUVAN_API_KEY;
    if (!token) {
      console.warn('[Bhuvan Proxy] BHUVAN_API_TOKEN is not configured.');
      return res.status(503).json({
        success: false,
        error: 'Bhuvan API token not configured on server',
      });
    }

    async function queryBhuvanSegment(
      sLat1: number,
      sLon1: number,
      sLat2: number,
      sLon2: number
    ): Promise<{ isSameStateError: boolean; coords: [number, number][] | null }> {
      const bhuvanUrl = `https://bhuvan-app1.nrsc.gov.in/api/routing/curl_routing_state.php?lat1=${sLat1}&lon1=${sLon1}&lat2=${sLat2}&lon2=${sLon2}&token=${token}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      try {
        const upstreamRes = await fetch(bhuvanUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) PRAVAH-NER-Routing/1.0',
          },
        });
        clearTimeout(timeoutId);

        const rawText = await upstreamRes.text();
        if (rawText.includes('Please provide latitudes and longitudes of same state')) {
          return { isSameStateError: true, coords: null };
        }
        if (!upstreamRes.ok || rawText.startsWith('<!DOCTYPE') || rawText.startsWith('<html') || rawText.startsWith('Error:')) {
          return { isSameStateError: false, coords: null };
        }

        // Sanitize trailing commas and empty geometry fields produced by NRSC Bhuvan API
        const sanitized = rawText
          .replace(/"geometry":\s*(?=,|}|\n|\r)/g, '"geometry": null')
          .replace(/,\s*([}\]])/g, '$1');

        const parsed = JSON.parse(sanitized);
        const segmentCoords: [number, number][] = [];
        const features = Array.isArray(parsed?.features) ? parsed.features : [];

        for (const feat of features) {
          const geom = feat?.geometry;
          if (!geom) continue;

          if (geom.type === 'LineString' && Array.isArray(geom.coordinates)) {
            for (const pt of geom.coordinates) {
              if (Array.isArray(pt) && pt.length >= 2) {
                const lat = Number(pt[1]);
                const lng = Number(pt[0]);
                if (!isNaN(lat) && !isNaN(lng)) {
                  if (
                    segmentCoords.length === 0 ||
                    segmentCoords[segmentCoords.length - 1][0] !== lat ||
                    segmentCoords[segmentCoords.length - 1][1] !== lng
                  ) {
                    segmentCoords.push([lat, lng]);
                  }
                }
              }
            }
          } else if (geom.type === 'MultiLineString' && Array.isArray(geom.coordinates)) {
            for (const line of geom.coordinates) {
              if (Array.isArray(line)) {
                for (const pt of line) {
                  if (Array.isArray(pt) && pt.length >= 2) {
                    const lat = Number(pt[1]);
                    const lng = Number(pt[0]);
                    if (!isNaN(lat) && !isNaN(lng)) {
                      if (
                        segmentCoords.length === 0 ||
                        segmentCoords[segmentCoords.length - 1][0] !== lat ||
                        segmentCoords[segmentCoords.length - 1][1] !== lng
                      ) {
                        segmentCoords.push([lat, lng]);
                      }
                    }
                  }
                }
              }
            }
          }
        }

        return { isSameStateError: false, coords: segmentCoords.length >= 2 ? segmentCoords : null };
      } catch {
        clearTimeout(timeoutId);
        return { isSameStateError: false, coords: null };
      }
    }

    // 1. Attempt direct query first
    const directResult = await queryBhuvanSegment(lat1, lon1, lat2, lon2);
    if (directResult.coords && directResult.coords.length >= 2) {
      return res.json({
        success: true,
        routeSource: 'BHUVAN',
        coordinates: directResult.coords,
      });
    }

    // 2. If direct query returned interstate boundary limitation, resolve interstate corridor crossing
    if (directResult.isSameStateError) {
      // Known state border crossing points in NER corridors
      let borderWaypoints: [number, number][] = [];

      // Assam (Guwahati ~26.14, 91.73) <-> Meghalaya (Shillong ~25.57, 91.89)
      if (
        (lat1 > 26.0 && lat2 < 25.8 && lon1 < 92.2 && lon2 < 92.2) ||
        (lat2 > 26.0 && lat1 < 25.8 && lon1 < 92.2 && lon2 < 92.2)
      ) {
        borderWaypoints = [[26.1050, 91.8700], [26.0200, 91.8680]]; // Jorabat (Assam) & Byrnihat (Meghalaya)
      }
      // Assam (Silchar ~24.83) <-> Mizoram (Kolasib ~24.22)
      else if (
        (lat1 > 24.6 && lat2 < 24.4 && lon1 > 92.5 && lon1 < 93.0) ||
        (lat2 > 24.6 && lat1 < 24.4 && lon1 > 92.5 && lon1 < 93.0)
      ) {
        borderWaypoints = [[24.5800, 92.7600], [24.5000, 92.7600]]; // Lailapur (Assam) & Vairengte (Mizoram)
      }

      if (borderWaypoints.length >= 2) {
        const [borderA, borderB] = borderWaypoints;
        const [partA, partB] = await Promise.all([
          queryBhuvanSegment(lat1, lon1, borderA[0], borderA[1]),
          queryBhuvanSegment(borderB[0], borderB[1], lat2, lon2),
        ]);

        // CRITICAL: BOTH interstate segments must resolve.
        // Returning only one half with a straight-line vector jump to destination is rejected.
        if (partA.coords && partA.coords.length >= 2 && partB.coords && partB.coords.length >= 2) {
          const stitchedCoords: [number, number][] = [...partA.coords];

          // Interpolate smooth transition between border points if there is a gap along the highway
          const endA = partA.coords[partA.coords.length - 1];
          const startB = partB.coords[0];
          const gapLat = startB[0] - endA[0];
          const gapLon = startB[1] - endA[1];
          const gapSteps = Math.min(20, Math.max(3, Math.round(Math.hypot(gapLat, gapLon) * 150)));

          for (let s = 1; s < gapSteps; s++) {
            const frac = s / gapSteps;
            stitchedCoords.push([
              Number((endA[0] + gapLat * frac).toFixed(6)),
              Number((endA[1] + gapLon * frac).toFixed(6)),
            ]);
          }

          stitchedCoords.push(...partB.coords);

          return res.json({
            success: true,
            routeSource: 'BHUVAN',
            coordinates: stitchedCoords,
          });
        }
      }

      return res.json({
        success: false,
        error: 'Bhuvan Shortest Path requires coordinates within the same state',
      });
    }

    return res.json({
      success: false,
      error: 'Bhuvan returned no valid road coordinates for this path',
    });
  } catch (err: any) {
    return res.json({
      success: false,
      error: err?.message || 'Bhuvan proxy call failed',
    });
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
    const isOfficer =
      data.author?.role?.includes('Officer') ||
      data.authorRole?.includes('Officer') ||
      data.isOfficer ||
      data.hasOfficerVerified;
    const confidence = isOfficer ? 11 : 1;
    const incidentId = data.id || `inc-${Date.now()}`;
    const corridorId = data.location?.corridorId || data.corridorId || 'SEG-SIL-KOL';
    const placeName = data.location?.placeName || data.placeName || 'NH-306 Sector';
    const severity = data.severity || 'Total Blockage';
    const incidentType = data.incidentType || 'Landslide';

    const incident = {
      id: incidentId,
      title: data.title || 'Road Hazard Incident',
      corridorFlair: data.corridorFlair || 'r/Mizoram-NH-306',
      incidentType,
      severity,
      location: {
        lat: data.location?.lat ?? 24.2850,
        lng: data.location?.lng ?? 92.7350,
        placeName,
        state: data.location?.state || 'Mizoram',
        corridorId,
      },
      author: {
        name: data.author?.name || data.authorName || 'Field Reporter',
        role: isOfficer ? 'Field Officer (BRO/Police)' : (data.author?.role || 'Citizen Driver'),
      },
      timestamp: data.timestamp || new Date().toISOString(),
      mediaUrl: data.mediaUrl || '',
      votes: data.votes || { upvotes: 1, downvotes: 0, userVote: null },
      confidenceScore: data.confidenceScore ?? confidence,
      hasOfficerVerified: Boolean(isOfficer),
      sync_status: 'SYNCED',
      updates: Array.isArray(data.updates) ? data.updates : [],
    };

    const existingIdx = state.groundReports.findIndex((r) => r.id === incidentId);
    if (existingIdx >= 0) {
      state.groundReports[existingIdx] = incident;
    } else {
      state.groundReports.unshift(incident);
    }

    // If verified or Total Blockage, cascade segment blockage
    if (incident.severity === 'Total Blockage' || isOfficer) {
      state.disruptions[corridorId] = {
        status: incident.severity === 'Total Blockage' ? 'TOTAL_BLOCKAGE' : 'SINGLE_LANE_PASSABLE',
        cause: incident.incidentType,
        description: incident.title,
        reportedBy: `${incident.author.name} (${incident.author.role})`,
      };

      // Cascade to Kolasib East community: cut off road & surge to P1
      if (corridorId === 'SEG-SIL-KOL' || placeName.includes('Kolasib')) {
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

    saveDb();

    io.emit('INCIDENT_ADDED', { incident, disruptions: state.disruptions });
    io.emit('INCIDENT_VERIFIED', { incident, disruptions: state.disruptions });
    io.emit('STATE_UPDATED', state);
  });

  // 1b. Incident Voting
  socket.on('VOTE_INCIDENT', (data: any) => {
    const report = state.groundReports.find((r) => r.id === data.incidentId);
    if (report) {
      if (data.votes) {
        report.votes = {
          ...report.votes,
          upvotes: data.votes.upvotes,
          downvotes: data.votes.downvotes,
        };
      }
      if (data.confidenceScore !== undefined) {
        report.confidenceScore = data.confidenceScore;
      }
      if (data.hasOfficerVerified !== undefined) {
        report.hasOfficerVerified = data.hasOfficerVerified;
      }
      saveDb();

      io.emit('INCIDENT_VOTED', {
        incidentId: data.incidentId,
        votes: report.votes,
        confidenceScore: report.confidenceScore,
        hasOfficerVerified: report.hasOfficerVerified,
      });
      io.emit('STATE_UPDATED', state);
    }
  });

  // 1c. Add Incident Ground Clearance Update
  socket.on('ADD_INCIDENT_UPDATE', (data: any) => {
    const report = state.groundReports.find((r) => r.id === data.incidentId);
    if (report) {
      if (!Array.isArray(report.updates)) {
        report.updates = [];
      }
      report.updates.push(data.update);
      saveDb();

      io.emit('INCIDENT_UPDATE_ADDED', {
        incidentId: data.incidentId,
        update: data.update,
        updates: report.updates,
      });
      io.emit('STATE_UPDATED', state);
    }
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

    saveDb();
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

    saveDb();
    io.emit('DRIVER_SOS_SIGNAL', { vehicleId, vehicle: veh, alert });
    io.emit('STATE_UPDATED', state);
  });

  // 4b. Driver SOS Stand Down / Cancel
  socket.on('CANCEL_DRIVER_SOS', (data: any) => {
    const { vehicleId } = data;
    let veh = state.fleetTelemetry[vehicleId];
    if (!veh) {
      for (const k of Object.keys(state.fleetTelemetry)) {
        if (state.fleetTelemetry[k]?.vehicle_id === vehicleId || state.fleetTelemetry[k]?.vehicle_name === vehicleId) {
          veh = state.fleetTelemetry[k];
          break;
        }
      }
    }
    if (veh) {
      veh.status = 'ON_ROUTE';
      veh.is_sos_manual = false;
      veh.is_watchdog_red = false;
      veh.is_watchdog_amber = false;
      veh.expected_blackout_exit_time = undefined;
    }
    state.alerts = state.alerts.filter(
      (a: any) => !((a.vehicle_id === vehicleId || a.vehicle_name === vehicleId) && a.type === 'SOS_TRIGGERED')
    );
    saveDb();
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

    saveDb();
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

    saveDb();
    io.emit('STATE_UPDATED', state);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

httpServer.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`⚠️ Port ${PORT} is already in use by another process.`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});

// Start Server
httpServer.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 PRAVAH Backend WebSocket Server running on port ${PORT}`);
  console.log(`📡 Socket.io connected and ready for multi-client sync`);
  console.log(`🌦️ Open-Meteo live API integration active`);
  console.log(`====================================================`);
});
