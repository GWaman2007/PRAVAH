import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { 
  District, 
  HighwayCorridor, 
  BottleneckChokepoint, 
  Convoy, 
  OperationsLog, 
  DashboardMetrics, 
  NerState,
  ConnectivityCategory 
} from '../types/dashboard';
import { INITIAL_DISTRICTS_DATA } from '../data/nerDistrictsData';
import { INITIAL_CORRIDORS } from '../data/corridorsData';
import { INITIAL_BOTTLENECKS, INITIAL_CONVOYS, INITIAL_OPERATIONS_LOGS } from '../data/bottlenecksData';

interface LogisticsContextType {
  districts: District[];
  corridors: HighwayCorridor[];
  bottlenecks: BottleneckChokepoint[];
  convoys: Convoy[];
  operationsLogs: OperationsLog[];
  metrics: DashboardMetrics;
  selectedState: 'ALL' | NerState;
  setSelectedState: (state: 'ALL' | NerState) => void;
  selectedDistrictId: string | null;
  setSelectedDistrictId: (id: string | null) => void;
  selectedDistrict: District | null;
  deployBroTaskForce: (bottleneckId: string) => void;
  dispatchEmergencyAirdrop: (districtId: string) => void;
  simulateMonsoonCloudburst: () => void;
  resetSimulation: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isDeployingMap: Record<string, boolean>;
}

const LogisticsContext = createContext<LogisticsContextType | undefined>(undefined);

export const LogisticsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedState, setSelectedState] = useState<'ALL' | NerState>('ALL');
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [rawDistricts, setRawDistricts] = useState(INITIAL_DISTRICTS_DATA);
  const [corridors, setCorridors] = useState<HighwayCorridor[]>(INITIAL_CORRIDORS);
  const [bottlenecks, setBottlenecks] = useState<BottleneckChokepoint[]>(INITIAL_BOTTLENECKS);
  const [convoys, setConvoys] = useState<Convoy[]>(INITIAL_CONVOYS);
  const [operationsLogs, setOperationsLogs] = useState<OperationsLog[]>(INITIAL_OPERATIONS_LOGS);
  const [isDeployingMap, setIsDeployingMap] = useState<Record<string, boolean>>({});

  // Compute live district metrics using the exact formula
  const districts: District[] = useMemo(() => {
    return rawDistricts.map((base) => {
      // Find corridors linked to this district
      const linkedCorridors = corridors.filter((c) => base.corridorIds.includes(c.id));
      const totalCount = linkedCorridors.length || 1;
      
      // Calculate effective open corridor ratio (OPEN = 1, RESTRICTED = 0.5, BLOCKED = 0)
      const openWeighted = linkedCorridors.reduce((acc, c) => {
        if (c.status === 'OPEN') return acc + 1;
        if (c.status === 'RESTRICTED') return acc + 0.5;
        return acc;
      }, 0);

      const openCount = linkedCorridors.filter((c) => c.status === 'OPEN').length;

      // Formula:
      // Accessibility Score = (Open Highway Corridors / Total Corridors * 50) + (Weather Factor * 25) + (Field Clearance Factor * 25)
      const corridorPart = (openWeighted / totalCount) * 50;
      const weatherPart = Math.max(0, Math.min(1, base.weatherFactor)) * 25;
      const clearancePart = Math.max(0, Math.min(1, base.fieldClearanceFactor)) * 25;

      const score = Math.round(Math.min(100, Math.max(0, corridorPart + weatherPart + clearancePart)));

      let connectivityCategory: ConnectivityCategory = 'normal';
      if (score < 50) {
        connectivityCategory = 'critical';
      } else if (score < 80) {
        connectivityCategory = 'moderate';
      }

      const minSupply = Math.min(
        base.supplies.medicalOxygenDays,
        base.supplies.foodGrainsDays,
        base.supplies.fuelDieselDays
      );

      // Warning engine: Score < 50% AND remaining supply runway < 3 days
      const isStockoutRisk = score < 50 && minSupply < 3.0;

      return {
        ...base,
        openCorridorsCount: openCount,
        totalCorridorsCount: totalCount,
        accessibilityScore: score,
        connectivityCategory,
        minSupplyDays: Number(minSupply.toFixed(1)),
        isStockoutRisk,
      };
    });
  }, [rawDistricts, corridors]);

  // Selected district object
  const selectedDistrict = useMemo(() => {
    if (!selectedDistrictId) return null;
    return districts.find((d) => d.id === selectedDistrictId) || null;
  }, [districts, selectedDistrictId]);

  // Overall regional metrics calculation for Top KPI Deck
  const metrics: DashboardMetrics = useMemo(() => {
    let totalKm = 0;
    let activeKm = 0;
    let disruptedKm = 0;

    corridors.forEach((c) => {
      totalKm += c.lengthKm;
      if (c.status === 'OPEN') {
        activeKm += c.lengthKm;
      } else if (c.status === 'RESTRICTED') {
        activeKm += c.lengthKm * 0.5;
        disruptedKm += c.lengthKm * 0.5;
      } else {
        disruptedKm += c.lengthKm;
      }
    });

    const activeKmPercent = totalKm > 0 ? Number(((activeKm / totalKm) * 100).toFixed(1)) : 100;

    const isolated = districts.filter((d) => d.connectivityCategory === 'critical');
    const highRiskConvoys = convoys.filter((c) => c.riskLevel === 'HIGH_RISK');

    const totalDelay = convoys.reduce((sum, c) => sum + c.delayHours, 0);
    const avgDelayHours = convoys.length > 0 ? Number((totalDelay / convoys.length).toFixed(1)) : 0;

    return {
      totalKm: Math.round(totalKm),
      activeKm: Math.round(activeKm),
      disruptedKm: Math.round(disruptedKm),
      activeKmPercent,
      isolatedDistrictsCount: isolated.length,
      isolatedDistrictNames: isolated.map((d) => d.name),
      activeConvoysCount: convoys.length,
      highRiskConvoysCount: highRiskConvoys.length,
      avgDelayHours,
    };
  }, [corridors, districts, convoys]);

  // Deploy BRO Task Force action
  const deployBroTaskForce = useCallback((bottleneckId: string) => {
    const targetBottleneck = bottlenecks.find((b) => b.id === bottleneckId);
    if (!targetBottleneck || targetBottleneck.status === 'REPAIRED_CLEAR') return;

    // Set deploying state for interactive feedback
    setIsDeployingMap((prev) => ({ ...prev, [bottleneckId]: true }));

    // Instant update with visual transition
    setTimeout(() => {
      // 1. Update bottleneck status to REPAIRED_CLEAR
      setBottlenecks((prev) =>
        prev.map((b) =>
          b.id === bottleneckId
            ? { ...b, status: 'REPAIRED_CLEAR', lastUpdated: 'Just now (Cleared by BRO Task Force)' }
            : b
        )
      );

      // 2. Set the affected highway corridor to OPEN
      setCorridors((prev) =>
        prev.map((c) =>
          c.id === targetBottleneck.corridorId ? { ...c, status: 'OPEN' } : c
        )
      );

      // 3. Improve the affected district's field clearance factor & replenish supplies
      setRawDistricts((prev) =>
        prev.map((d) => {
          if (d.id === targetBottleneck.districtId) {
            const updatedFieldClearance = Math.min(1.0, d.fieldClearanceFactor + 0.65);
            const updatedWeather = Math.min(1.0, d.weatherFactor + 0.3);
            return {
              ...d,
              fieldClearanceFactor: updatedFieldClearance,
              weatherFactor: updatedWeather,
              statusNote: `Corridor ${targetBottleneck.highway} restored. Relief convoy movement authorized.`,
              supplies: {
                medicalOxygenDays: Number((d.supplies.medicalOxygenDays + 4.5).toFixed(1)),
                foodGrainsDays: Number((d.supplies.foodGrainsDays + 7.0).toFixed(1)),
                fuelDieselDays: Number((d.supplies.fuelDieselDays + 5.5).toFixed(1)),
                burnRateMultiplier: 1.0,
              },
              historicalDepletion: [
                ...d.historicalDepletion,
                {
                  day: 'Post-Clearance',
                  medical: Number((d.supplies.medicalOxygenDays + 4.5).toFixed(1)),
                  food: Number((d.supplies.foodGrainsDays + 7.0).toFixed(1)),
                  fuel: Number((d.supplies.fuelDieselDays + 5.5).toFixed(1)),
                },
              ],
            };
          }
          return d;
        })
      );

      // 4. Update any stranded convoys on this route
      setConvoys((prev) =>
        prev.map((c) => {
          if (c.destinationDistrictId === targetBottleneck.districtId && c.status === 'STRANDED_AT_CHOKEPOINT') {
            return {
              ...c,
              status: 'IN_TRANSIT',
              riskLevel: 'LOW',
              delayHours: Math.max(0.5, c.delayHours - 4.0),
              currentLocation: 'Passing cleared chokepoint under BRO escort',
            };
          }
          return c;
        })
      );

      // 5. Append Operations Log
      const newLog: OperationsLog = {
        id: `log-${Date.now()}`,
        timestamp: `${new Date().toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit' })} IST`,
        type: 'CLEARANCE',
        message: `BRO Task Force successfully cleared ${targetBottleneck.chokePointName}. Highway ${targetBottleneck.highway} re-opened to traffic.`,
        districtId: targetBottleneck.districtId,
        state: targetBottleneck.state,
      };
      setOperationsLogs((prev) => [newLog, ...prev]);

      setIsDeployingMap((prev) => ({ ...prev, [bottleneckId]: false }));
    }, 600);
  }, [bottlenecks]);

  // Dispatch Emergency IAF Airdrop action
  const dispatchEmergencyAirdrop = useCallback((districtId: string) => {
    const target = rawDistricts.find((d) => d.id === districtId);
    if (!target) return;

    setRawDistricts((prev) =>
      prev.map((d) => {
        if (d.id === districtId) {
          return {
            ...d,
            supplies: {
              medicalOxygenDays: Number((d.supplies.medicalOxygenDays + 6.0).toFixed(1)),
              foodGrainsDays: Number((d.supplies.foodGrainsDays + 9.0).toFixed(1)),
              fuelDieselDays: Number((d.supplies.fuelDieselDays + 4.5).toFixed(1)),
              burnRateMultiplier: 1.1,
            },
            statusNote: `Emergency IAF Mi-17 heavy-lift airdrop completed. Stockout crisis averted.`,
            historicalDepletion: [
              ...d.historicalDepletion,
              {
                day: 'Airdrop Influx',
                medical: Number((d.supplies.medicalOxygenDays + 6.0).toFixed(1)),
                food: Number((d.supplies.foodGrainsDays + 9.0).toFixed(1)),
                fuel: Number((d.supplies.fuelDieselDays + 4.5).toFixed(1)),
              },
            ],
          };
        }
        return d;
      })
    );

    const newLog: OperationsLog = {
      id: `log-${Date.now()}`,
      timestamp: `${new Date().toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit' })} IST`,
      type: 'AIRDROP',
      message: `IAF Eastern Air Command executed tactical airdrop of critical medical and ration canisters over ${target.name}.`,
      districtId,
      state: target.state,
    };
    setOperationsLogs((prev) => [newLog, ...prev]);
  }, [rawDistricts]);

  // Trigger monsoon cloudburst simulation
  const simulateMonsoonCloudburst = useCallback(() => {
    // Add heavy rain penalties and block a route
    setCorridors((prev) =>
      prev.map((c) => {
        if (c.id === 'NH-10-GANGTOK') {
          return { ...c, status: 'BLOCKED' };
        }
        return c;
      })
    );

    setRawDistricts((prev) =>
      prev.map((d) => {
        if (d.id === 'east_sikkim' || d.id === 'west_garo') {
          return {
            ...d,
            weatherFactor: 0.15,
            fieldClearanceFactor: 0.25,
            weatherDescription: 'Severe cloudburst triggered sudden landslides and flash flooding',
            supplies: {
              ...d.supplies,
              medicalOxygenDays: Math.max(1.8, d.supplies.medicalOxygenDays - 3.5),
              fuelDieselDays: Math.max(2.1, d.supplies.fuelDieselDays - 2.8),
            },
          };
        }
        return d;
      })
    );

    const newBottleneck: BottleneckChokepoint = {
      id: `btnk-sim-${Date.now()}`,
      rank: 1,
      chokePointName: 'Likhuveer & 29th Mile Massive Rockslide (NH-10)',
      corridorId: 'NH-10-GANGTOK',
      districtId: 'east_sikkim',
      state: 'Sikkim',
      highway: 'NH-10',
      disruptionType: 'Landslide & Rockfall',
      strandedVehicleCount: 198,
      economicLifelineScore: 97,
      status: 'ACTIVE_CRITICAL',
      recommendedAsset: 'BRO Project Swastik Heavy Blasting Squad',
      estimatedClearanceHours: 36,
      reportedTime: 'Simulated Just Now',
      lastUpdated: '1 min ago',
    };

    setBottlenecks((prev) => [newBottleneck, ...prev]);

    const newLog: OperationsLog = {
      id: `log-${Date.now()}`,
      timestamp: `${new Date().toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit' })} IST`,
      type: 'WEATHER',
      message: 'SIMULATION EVENT: Massive cloudburst triggered across Teesta Basin. NH-10 corridor severed.',
      districtId: 'east_sikkim',
      state: 'Sikkim',
    };
    setOperationsLogs((prev) => [newLog, ...prev]);
  }, []);

  // Reset simulation
  const resetSimulation = useCallback(() => {
    setRawDistricts(INITIAL_DISTRICTS_DATA);
    setCorridors(INITIAL_CORRIDORS);
    setBottlenecks(INITIAL_BOTTLENECKS);
    setConvoys(INITIAL_CONVOYS);
    setOperationsLogs(INITIAL_OPERATIONS_LOGS);
    setIsDeployingMap({});
  }, []);

  return (
    <LogisticsContext.Provider
      value={{
        districts,
        corridors,
        bottlenecks,
        convoys,
        operationsLogs,
        metrics,
        selectedState,
        setSelectedState,
        selectedDistrictId,
        setSelectedDistrictId,
        selectedDistrict,
        deployBroTaskForce,
        dispatchEmergencyAirdrop,
        simulateMonsoonCloudburst,
        resetSimulation,
        searchQuery,
        setSearchQuery,
        isDeployingMap,
      }}
    >
      {children}
    </LogisticsContext.Provider>
  );
};

export const useLogistics = () => {
  const context = useContext(LogisticsContext);
  if (!context) {
    throw new Error('useLogistics must be used within a LogisticsProvider');
  }
  return context;
};
