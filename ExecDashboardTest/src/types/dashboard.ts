export type NerState = 
  | 'Assam'
  | 'Arunachal Pradesh'
  | 'Meghalaya'
  | 'Manipur'
  | 'Mizoram'
  | 'Nagaland'
  | 'Sikkim'
  | 'Tripura';

export type ConnectivityCategory = 'normal' | 'moderate' | 'critical';

export interface DistrictSupplies {
  medicalOxygenDays: number; // Target > 7 days
  foodGrainsDays: number;    // Target > 15 days
  fuelDieselDays: number;    // Target > 10 days
  burnRateMultiplier: number; // Burn speed e.g. 1.0, 1.3
}

export interface DepletionDataPoint {
  day: string;
  medical: number;
  food: number;
  fuel: number;
}

export interface District {
  id: string;
  name: string;
  state: NerState;
  lat: number;
  lng: number;
  population: number;
  elevationMeters: number;
  corridorIds: string[];
  weatherFactor: number; // 0.0 to 1.0 (1.0 = clear, 0.4 = heavy rain, 0.1 = cloudburst)
  weatherDescription: string;
  fieldClearanceFactor: number; // 0.0 to 1.0 (1.0 = fully open, 0.0 = debris blockage)
  supplies: DistrictSupplies;
  statusNote: string;
  historicalDepletion: DepletionDataPoint[];
  
  // Dynamically computed
  openCorridorsCount: number;
  totalCorridorsCount: number;
  accessibilityScore: number; // 0 - 100
  connectivityCategory: ConnectivityCategory;
  minSupplyDays: number;
  isStockoutRisk: boolean; // score < 50 && minSupplyDays < 3
}

export type CorridorStatus = 'OPEN' | 'RESTRICTED' | 'BLOCKED';

export interface HighwayCorridor {
  id: string;
  name: string;
  section: string;
  highwayNumber: string;
  fromDistrictId: string;
  toDistrictId: string;
  coordinates: [number, number][];
  status: CorridorStatus;
  lengthKm: number;
  activeBottleneckId?: string;
}

export type DisruptionType = 
  | 'Landslide & Rockfall'
  | 'Bridge Structural Failure / Sinking'
  | 'Flash Flood & Inundation'
  | 'Mudflow / Road Cleave';

export type BottleneckStatus = 'ACTIVE_CRITICAL' | 'DEPLOYING' | 'REPAIRED_CLEAR';

export interface BottleneckChokepoint {
  id: string;
  rank: number;
  chokePointName: string;
  corridorId: string;
  districtId: string;
  state: NerState;
  highway: string;
  disruptionType: DisruptionType;
  strandedVehicleCount: number;
  economicLifelineScore: number; // 0 - 100
  status: BottleneckStatus;
  recommendedAsset: string;
  estimatedClearanceHours: number;
  reportedTime: string;
  lastUpdated: string;
}

export interface Convoy {
  id: string;
  convoyNumber: string;
  cargo: 'Medical Oxygen & Drugs' | 'PDS Food Grains' | 'POL (Fuel & Diesel)' | 'Engineering Equipment';
  origin: string;
  destinationDistrictId: string;
  truckCount: number;
  status: 'IN_TRANSIT' | 'REROUTED' | 'STRANDED_AT_CHOKEPOINT' | 'DELIVERED';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH_RISK';
  delayHours: number;
  currentLocation: string;
}

export interface OperationsLog {
  id: string;
  timestamp: string;
  type: 'ALERT' | 'DISPATCH' | 'CLEARANCE' | 'AIRDROP' | 'WEATHER';
  message: string;
  districtId?: string;
  state?: NerState;
}

export interface DashboardMetrics {
  totalKm: number;
  activeKm: number;
  disruptedKm: number;
  activeKmPercent: number;
  isolatedDistrictsCount: number;
  isolatedDistrictNames: string[];
  activeConvoysCount: number;
  highRiskConvoysCount: number;
  avgDelayHours: number;
}
