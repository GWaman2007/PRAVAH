import type { Incident } from '../types/incident';

// Realistic inline SVG illustrations as reliable media URLs for offline resilience
export const SAMPLE_INCIDENT_IMAGES = {
  landslide: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 350" width="600" height="350">
    <defs>
      <linearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="%23334155" />
        <stop offset="100%" stop-color="%231e293b" />
      </linearGradient>
      <linearGradient id="mud" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="%2378350f" />
        <stop offset="100%" stop-color="%23451a03" />
      </linearGradient>
    </defs>
    <rect width="600" height="350" fill="url(%23sky)" />
    <!-- Distant mountain -->
    <polygon points="0,220 180,80 340,190 480,100 600,240 600,350 0,350" fill="%230f172a" />
    <!-- Road Surface -->
    <polygon points="120,350 250,210 320,210 460,350" fill="%231e293b" stroke="%23facc15" stroke-dasharray="12,12" stroke-width="3" />
    <!-- Mudslide debris covering road -->
    <path d="M 180,160 Q 260,200 350,190 Q 420,230 480,280 L 500,350 L 150,350 Z" fill="url(%23mud)" />
    <!-- Boulders -->
    <circle cx="280" cy="280" r="32" fill="%2352525b" stroke="%2327272a" stroke-width="3"/>
    <circle cx="340" cy="295" r="24" fill="%233f3f46" stroke="%2318181b" stroke-width="2"/>
    <circle cx="230" cy="310" r="18" fill="%2371717a" stroke="%233f3f46" stroke-width="2"/>
    <circle cx="390" cy="275" r="28" fill="%2352525b" stroke="%2327272a" stroke-width="2"/>
    <!-- Danger sign -->
    <polygon points="100,220 130,270 70,270" fill="%23ef4444" stroke="%23ffffff" stroke-width="3"/>
    <text x="100" y="260" font-size="20" font-family="Arial" font-weight="bold" fill="%23ffffff" text-anchor="middle">!</text>
    <rect x="20" y="20" width="160" height="30" rx="6" fill="rgba(0,0,0,0.6)"/>
    <text x="30" y="41" font-size="14" font-family="sans-serif" font-weight="bold" fill="%23f87171">⚠ LANDSLIDE DEBRIS</text>
  </svg>`,

  flood: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 350" width="600" height="350">
    <defs>
      <linearGradient id="stormySky" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="%231e293b" />
        <stop offset="100%" stop-color="%230f172a" />
      </linearGradient>
      <linearGradient id="floodWater" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="%230284c7" />
        <stop offset="100%" stop-color="%230369a1" />
      </linearGradient>
    </defs>
    <rect width="600" height="350" fill="url(%23stormySky)" />
    <!-- Hills -->
    <path d="M 0,180 Q 150,110 300,160 Q 450,90 600,170 L 600,350 L 0,350 Z" fill="%23090d16" />
    <!-- Submerged bridge piers -->
    <rect x="180" y="160" width="30" height="90" fill="%23475569" />
    <rect x="360" y="160" width="30" height="90" fill="%23475569" />
    <rect x="120" y="155" width="360" height="15" fill="%2364748b" />
    <!-- Roaring Swollen River -->
    <path d="M 0,220 C 150,205 300,240 450,215 C 550,230 600,225 600,225 L 600,350 L 0,350 Z" fill="url(%23floodWater)" opacity="0.95" />
    <path d="M 0,245 C 180,235 340,260 600,240" stroke="%23bae6fd" stroke-width="4" fill="none" opacity="0.7"/>
    <path d="M 0,285 C 220,270 420,295 600,280" stroke="%23e0f2fe" stroke-width="3" fill="none" opacity="0.6"/>
    <rect x="20" y="20" width="180" height="30" rx="6" fill="rgba(0,0,0,0.6)"/>
    <text x="30" y="41" font-size="14" font-family="sans-serif" font-weight="bold" fill="%2338bdf8">🌊 FLASH FLOOD / SURGE</text>
  </svg>`,

  treefall: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 350" width="600" height="350">
    <rect width="600" height="350" fill="%231e293b" />
    <!-- Highway Roadway -->
    <polygon points="100,350 250,150 350,150 500,350" fill="%23334155" />
    <line x1="300" y1="150" x2="300" y2="350" stroke="%23facc15" stroke-width="4" stroke-dasharray="16,12" />
    <!-- Fallen Massive Trunk -->
    <path d="M 80,270 L 460,230 L 480,265 L 100,305 Z" fill="%23451a03" stroke="%23271003" stroke-width="2"/>
    <!-- Foliage / branches -->
    <circle cx="380" cy="220" r="45" fill="%2314532d" opacity="0.9"/>
    <circle cx="440" cy="210" r="50" fill="%2315803d" opacity="0.85"/>
    <circle cx="490" cy="235" r="40" fill="%23166534" opacity="0.9"/>
    <rect x="20" y="20" width="170" height="30" rx="6" fill="rgba(0,0,0,0.6)"/>
    <text x="30" y="41" font-size="14" font-family="sans-serif" font-weight="bold" fill="%23fbbf24">🌲 FALLEN TIMBER BLOCK</text>
  </svg>`,

  subsidence: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 350" width="600" height="350">
    <rect width="600" height="350" fill="%230f172a" />
    <!-- Mountain road -->
    <polygon points="50,350 220,160 380,160 550,350" fill="%23334155" />
    <!-- Broken asphalt chasm -->
    <path d="M 280,230 L 330,225 L 360,260 L 320,290 L 260,280 Z" fill="%2318181b" stroke="%23ef4444" stroke-width="2"/>
    <!-- Cracks extending across lane -->
    <path d="M 240,240 L 280,230 L 260,280 L 210,320" stroke="%2309090b" stroke-width="4" fill="none"/>
    <path d="M 330,225 L 390,210 L 430,240" stroke="%2309090b" stroke-width="3" fill="none"/>
    <!-- Warning cones -->
    <polygon points="210,270 225,310 195,310" fill="%23f97316" stroke="%23ffffff" stroke-width="2"/>
    <polygon points="380,260 395,300 365,300" fill="%23f97316" stroke="%23ffffff" stroke-width="2"/>
    <rect x="20" y="20" width="190" height="30" rx="6" fill="rgba(0,0,0,0.6)"/>
    <text x="30" y="41" font-size="14" font-family="sans-serif" font-weight="bold" fill="%23f59e0b">⚡ ROAD SUBSIDENCE</text>
  </svg>`
};

export const INITIAL_SEED_INCIDENTS: Incident[] = [
  {
    id: 'inc-nh29-01',
    title: 'Major rockfall & mudslide blocking both lanes past Kohima bypass near Zubza',
    corridorFlair: 'r/NH-29-Nagaland',
    incidentType: 'Landslide',
    severity: 'Total Blockage',
    location: {
      lat: 25.6882,
      lng: 94.0412,
      placeName: 'Zubza Bypass, NH-29, Kohima District',
      state: 'Nagaland'
    },
    author: {
      name: 'Havildar T. Ao (Project Sewak)',
      role: 'Field Officer (BRO/Police)'
    },
    timestamp: new Date(Date.now() - 42 * 60 * 1000).toISOString(), // 42 mins ago
    mediaUrl: SAMPLE_INCIDENT_IMAGES.landslide,
    votes: {
      upvotes: 16,
      downvotes: 1,
      userVote: null
    },
    hasOfficerVerified: true,
    confidenceScore: (16 - 1) + 10, // 25 -> High Confidence (Verified)
    sync_status: 'SYNCED',
    updates: [
      {
        id: 'upd-01',
        author: 'Major Sharma (BRO 89 RCC)',
        role: 'Field Officer (BRO/Police)',
        message: 'Two heavy earthmovers and hydraulic rock breaker mobilized on site. Estimated clearance time 3-4 hours if rain subsides.',
        timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString()
      },
      {
        id: 'upd-02',
        author: 'Ranjit Singh',
        role: 'Registered Driver',
        message: 'Over 60 freight container trucks backed up toward Dimapur side. Police diverting light vehicles via Old Peducha route.',
        timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString()
      }
    ]
  },
  {
    id: 'inc-nh10-02',
    title: 'Teesta River swelling submerged low bridge section at 29th Mile',
    corridorFlair: 'r/NH-10-Sikkim',
    incidentType: 'Flash Flood',
    severity: 'Single Lane Passable',
    location: {
      lat: 27.0284,
      lng: 88.4891,
      placeName: '29th Mile, Teesta Valley Corridor, NH-10',
      state: 'Sikkim / West Bengal Border'
    },
    author: {
      name: 'Insp. P. Lepcha (Sikkim Traffic Police)',
      role: 'Field Officer (BRO/Police)'
    },
    timestamp: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    mediaUrl: SAMPLE_INCIDENT_IMAGES.flood,
    votes: {
      upvotes: 24,
      downvotes: 2,
      userVote: null
    },
    hasOfficerVerified: true,
    confidenceScore: (24 - 2) + 10, // 32 -> High Confidence
    sync_status: 'SYNCED',
    updates: [
      {
        id: 'upd-10',
        author: 'Sikkim Highway Cell',
        role: 'Field Officer (BRO/Police)',
        message: 'Water levels receded by 1.2 feet. Heavy goods vehicles restricted to 10km/h single file convoy. Escort vehicle active.',
        timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString()
      },
      {
        id: 'upd-11',
        author: 'Bikash Subba (Freight Transporter)',
        role: 'Registered Driver',
        message: 'Crossed 15 mins ago with 16-wheel trailer. Water is muddy but roadway structure intact. Single lane marshaled by BRO.',
        timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString()
      }
    ]
  },
  {
    id: 'inc-ekh-03',
    title: 'Giant pine tree fell across Guwahati-Shillong expressway near Nongpoh',
    corridorFlair: 'r/East-Khasi-Hills',
    incidentType: 'Tree Fall',
    severity: 'Caution/Hazard',
    location: {
      lat: 25.9015,
      lng: 91.8794,
      placeName: 'Nongpoh Valley Curve, NH-06, Ri-Bhoi / EKH',
      state: 'Meghalaya'
    },
    author: {
      name: 'M. Syiem (Local Commuter)',
      role: 'Local Citizen'
    },
    timestamp: new Date(Date.now() - 85 * 60 * 1000).toISOString(),
    mediaUrl: SAMPLE_INCIDENT_IMAGES.treefall,
    votes: {
      upvotes: 8,
      downvotes: 1,
      userVote: null
    },
    hasOfficerVerified: false,
    confidenceScore: 7, // 7 -> Under Review (Score 1-9)
    sync_status: 'SYNCED',
    updates: [
      {
        id: 'upd-20',
        author: 'Nongpoh Fire & Emergency Unit',
        role: 'Field Officer (BRO/Police)',
        message: 'Chainsaw clearance underway. Uphill lane cleared, clearing debris from downhill lane now.',
        timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString()
      }
    ]
  },
  {
    id: 'inc-dimahasao-04',
    title: 'Severe road shoulder subsidence between Haflong and Jatinga section',
    corridorFlair: 'r/Assam-DimaHasao',
    incidentType: 'Road Subsidence',
    severity: 'Single Lane Passable',
    location: {
      lat: 25.1783,
      lng: 93.0315,
      placeName: 'Jatinga Saddle, Dima Hasao Hill Highway',
      state: 'Assam'
    },
    author: {
      name: 'N. Barman (NHAI Field Monitor)',
      role: 'Field Officer (BRO/Police)'
    },
    timestamp: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    mediaUrl: SAMPLE_INCIDENT_IMAGES.subsidence,
    votes: {
      upvotes: 19,
      downvotes: 1,
      userVote: null
    },
    hasOfficerVerified: true,
    confidenceScore: (19 - 1) + 10, // 28 -> High Confidence
    sync_status: 'SYNCED',
    updates: [
      {
        id: 'upd-30',
        author: 'Dima Hasao Traffic Cell',
        role: 'Field Officer (BRO/Police)',
        message: 'Barricades and reflective drums installed along the subsided shoulder edge. No night movement for multi-axle trailers over 35 tons.',
        timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString()
      }
    ]
  },
  {
    id: 'inc-tawang-05',
    title: 'Slush accumulation & localized road dip near Sela Tunnel West Portal',
    corridorFlair: 'r/Arunachal-Tawang',
    incidentType: 'Landslide',
    severity: 'Caution/Hazard',
    location: {
      lat: 27.5028,
      lng: 92.1037,
      placeName: 'Sela Tunnel Approach Road, West Kameng / Tawang',
      state: 'Arunachal Pradesh'
    },
    author: {
      name: 'Dorjee Norbu',
      role: 'Registered Driver'
    },
    timestamp: new Date(Date.now() - 320 * 60 * 1000).toISOString(),
    mediaUrl: SAMPLE_INCIDENT_IMAGES.landslide,
    votes: {
      upvotes: 11,
      downvotes: 2,
      userVote: null
    },
    hasOfficerVerified: false,
    confidenceScore: 9, // 9 -> Under Review (Score 1-9)
    sync_status: 'SYNCED',
    updates: [
      {
        id: 'upd-40',
        author: 'Project Vartak (BRO)',
        role: 'Field Officer (BRO/Police)',
        message: 'Dozers clearing slush runoff from melting snow. 4x4 vehicles and chained tires moving freely.',
        timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString()
      }
    ]
  }
];

export const CORRIDOR_PRESETS = [
  { flair: 'r/NH-29-Nagaland', name: 'NH-29 (Dimapur - Kohima - Zubza)', lat: 25.6882, lng: 94.0412, state: 'Nagaland' },
  { flair: 'r/NH-10-Sikkim', name: 'NH-10 (Sevoke - Teesta - Gangtok)', lat: 27.0284, lng: 88.4891, state: 'Sikkim' },
  { flair: 'r/East-Khasi-Hills', name: 'NH-06 / GS Road (Guwahati - Nongpoh - Shillong)', lat: 25.9015, lng: 91.8794, state: 'Meghalaya' },
  { flair: 'r/Assam-DimaHasao', name: 'NH-27 / Mahur - Haflong - Silchar', lat: 25.1783, lng: 93.0315, state: 'Assam' },
  { flair: 'r/Arunachal-Tawang', name: 'Balipara - Charduar - Tawang (BCT Road)', lat: 27.5028, lng: 92.1037, state: 'Arunachal Pradesh' },
  { flair: 'r/Manipur-NH-37', name: 'NH-37 (Silchar - Jiribam - Imphal)', lat: 24.8170, lng: 93.4215, state: 'Manipur' },
  { flair: 'r/Mizoram-NH-306', name: 'NH-306 (Silchar - Vairengte - Aizawl)', lat: 24.3120, lng: 92.7610, state: 'Mizoram' },
  { flair: 'r/Tripura-NH-08', name: 'NH-08 (Badarpur - Churaibari - Agartala)', lat: 24.2312, lng: 92.2415, state: 'Tripura' }
];
