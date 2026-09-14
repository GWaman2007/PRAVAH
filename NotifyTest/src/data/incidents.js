export const PRESET_INCIDENTS = [
  {
    id: 'inc-nh29-kohima',
    title: 'Incident 1: Total Blockage on NH-29 near Kohima (Nagaland)',
    shortTitle: 'NH-29 Kohima Landslide',
    highway: 'NH-29',
    corridor: 'Dimapur - Kohima - Imphal Lifeline',
    state: 'Nagaland',
    district: 'Kohima District (Pagla Pahar / Phesama sector)',
    disruptionType: 'Major Landslide & Rockfall',
    severity: 'CRITICAL',
    severityColor: 'red',
    stretch: 'Km 142 to 148 near Kohima Bypass',
    detourRoute: 'Route B via Wokha / NH-02 & Niuland bypass',
    estimatedDelay: '4 to 6 Hours',
    delayHours: 4,
    geofenceRadiusKm: 50,
    helpline: '112 / 1077 (Kohima Disaster Cell)',
    coordinates: { lat: 25.6751, lng: 94.1086 },
    weather: 'Heavy Monsoonal Downpour (18mm/hr)',
    broUnit: 'BRO Project SEWAK / 15 BRTF',
    targetAudience: {
      commercialDrivers: 142,
      districtAdmins: 8,
      qrtBroUnits: 14,
      fuelTankers: 32,
    },
    suggestedSpeedLimit: 'Diversion restricted to 25 km/h'
  },
  {
    id: 'inc-nh10-teesta',
    title: 'Incident 2: Bridge Submerged on NH-10 Teesta Valley (Sikkim)',
    shortTitle: 'NH-10 Teesta Submerged Bridge',
    highway: 'NH-10',
    corridor: 'Siliguri - Sevoke - Rangpo Corridor',
    state: 'Sikkim / West Bengal Border',
    district: 'Kalimpong & Pakyong Border',
    disruptionType: 'Bridge Submerged / Flash Flood Waterflow',
    severity: 'CRITICAL',
    severityColor: 'red',
    stretch: 'Teesta Bazar (Km 48) - 29th Mile',
    detourRoute: 'Lava - Algarah - Reshi - Rhenock Route',
    estimatedDelay: '6 to 8 Hours',
    delayHours: 6,
    geofenceRadiusKm: 65,
    helpline: '112 / 1070 (Sikkim SDMA Control)',
    coordinates: { lat: 27.0604, lng: 88.4283 },
    weather: 'River Teesta Inundation Level High',
    broUnit: 'BRO Project SWASTIK',
    targetAudience: {
      commercialDrivers: 188,
      districtAdmins: 6,
      qrtBroUnits: 18,
      fuelTankers: 45,
    },
    suggestedSpeedLimit: 'Heavy Convoy Halt at Sevoke Checkpost'
  },
  {
    id: 'inc-nh27-assam',
    title: 'Incident 3: Severe Flood Warning & Diversion for NH-27 Guwahati-Nagaon (Assam)',
    shortTitle: 'NH-27 Guwahati-Nagaon Flood',
    highway: 'NH-27',
    corridor: 'East-West Corridor (Guwahati - Upper Assam)',
    state: 'Assam',
    district: 'Morigaon / Nagaon border (Jagiroad to Roha)',
    disruptionType: 'Severe Road Waterlogging & Kopili Overflow',
    severity: 'HIGH',
    severityColor: 'amber',
    stretch: 'Jagiroad to Roha stretch (Km 210-235)',
    detourRoute: 'Morigaon State Highway bypass or North Bank NH-15',
    estimatedDelay: '3 to 4 Hours',
    delayHours: 3,
    geofenceRadiusKm: 40,
    helpline: '112 / 1079 (ASDMA Central Control)',
    coordinates: { lat: 26.1445, lng: 92.3421 },
    weather: 'Brahmaputra/Kopili tributary alert',
    broUnit: 'National Highways & Infrastructure Dev Corp (NHIDCL)',
    targetAudience: {
      commercialDrivers: 265,
      districtAdmins: 12,
      qrtBroUnits: 22,
      fuelTankers: 64,
    },
    suggestedSpeedLimit: 'Single lane convoy flow max 30 km/h'
  }
];

export const DISRUPTION_TYPES = [
  'Major Landslide & Rockfall',
  'Bridge Submerged / Flash Flood',
  'Severe Road Waterlogging & Flood',
  'Road Collapse / Mudslide',
  'Heavy Convoy Breakdown / Accident',
  'Protest / Highway Blockade',
  'Dense Fog & Zero Visibility Warning'
];

export const SEVERITY_LEVELS = [
  { id: 'CRITICAL', label: 'Critical / Total Blockage', color: 'red', badgeBg: 'bg-red-500/20 text-red-400 border-red-500/40' },
  { id: 'HIGH', label: 'High / Severe Diversion', color: 'amber', badgeBg: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
  { id: 'MODERATE', label: 'Moderate / Heavy Delays', color: 'yellow', badgeBg: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' },
  { id: 'ADVISORY', label: 'Advisory / Cautionary', color: 'sky', badgeBg: 'bg-sky-500/20 text-sky-400 border-sky-500/40' },
];

export const NER_HIGHWAYS = [
  { code: 'NH-29', name: 'NH-29 (Dimapur - Kohima - Mao - Maram)', state: 'Nagaland / Manipur' },
  { code: 'NH-10', name: 'NH-10 (Siliguri - Sevoke - Teesta - Gangtok)', state: 'West Bengal / Sikkim' },
  { code: 'NH-27', name: 'NH-27 (Siliguri - Guwahati - Nagaon - Lumding)', state: 'Assam / East-West' },
  { code: 'NH-02', name: 'NH-02 (Dibrugarh - Mokokchung - Wokha - Imphal)', state: 'Assam / Nagaland / Manipur' },
  { code: 'NH-06', name: 'NH-06 (Shillong - Jowai - Badarpur - Silchar)', state: 'Meghalaya / Assam' },
  { code: 'NH-08', name: 'NH-08 (Karimganj - Dharmanagar - Agartala)', state: 'Assam / Tripura' },
  { code: 'NH-13', name: 'NH-13 (Trans-Arunachal Highway)', state: 'Arunachal Pradesh' },
  { code: 'NH-37', name: 'NH-37 (Goalpara - Guwahati - Jorhat - Saikhoa)', state: 'Assam' },
];
