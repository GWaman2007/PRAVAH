import React, { useState } from 'react';
import { 
  Package, 
  Fuel, 
  HeartPulse, 
  Wheat, 
  AlertTriangle, 
  TrendingDown, 
  Plane, 
  ChevronRight 
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';
import { useLogistics } from '../context/LogisticsContext';

export const SupplyForecaster: React.FC = () => {
  const { 
    districts, 
    dispatchEmergencyAirdrop, 
    selectedDistrictId, 
    setSelectedDistrictId 
  } = useLogistics();

  // District currently selected for deep trajectory chart (defaults to first critical or selected)
  const criticalDistricts = districts.filter((d) => d.connectivityCategory === 'critical');
  const [activeChartDistrictId, setActiveChartDistrictId] = useState<string>(
    criticalDistricts[0]?.id || 'tawang'
  );

  const chartDistrict = districts.find((d) => d.id === (selectedDistrictId || activeChartDistrictId)) || districts[0];

  // Threshold definitions
  const TARGETS = {
    medical: 7,
    food: 15,
    fuel: 10,
  };

  const getMeterPercent = (days: number, max: number) => {
    return Math.min(100, Math.round((days / max) * 100));
  };

  return (
    <div className="tactical-panel rounded-xl p-4 border border-slate-800 shadow-xl flex flex-col h-full">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/50 text-emerald-400">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-white uppercase flex items-center gap-2">
              Essential Supply Runway & Depletion Forecaster
              <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                Days of Supply (DoS)
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Live buffer monitoring across Medical Oxygen, PDS Grains, and POL Fuel
            </p>
          </div>
        </div>

        {/* Global Stockout Risk Badge */}
        {criticalDistricts.some((d) => d.isStockoutRisk) && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-red-950 border border-red-700 text-red-200 text-xs font-bold animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span>STOCKOUT RISK DETECTED</span>
          </div>
        )}
      </div>

      {/* Critical Commodity Threshold Legend */}
      <div className="grid grid-cols-3 gap-2 mb-4 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 text-[11px]">
        <div className="flex items-center gap-2">
          <HeartPulse className="w-3.5 h-3.5 text-cyan-400" />
          <div>
            <div className="font-semibold text-slate-300">Medical Supplies & O2</div>
            <div className="text-[10px] text-slate-400 font-mono">Target: &gt;7.0 Days</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Wheat className="w-3.5 h-3.5 text-emerald-400" />
          <div>
            <div className="font-semibold text-slate-300">Food Grains & PDS</div>
            <div className="text-[10px] text-slate-400 font-mono">Target: &gt;15.0 Days</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Fuel className="w-3.5 h-3.5 text-amber-400" />
          <div>
            <div className="font-semibold text-slate-300">Petroleum & Diesel (POL)</div>
            <div className="text-[10px] text-slate-400 font-mono">Target: &gt;10.0 Days</div>
          </div>
        </div>
      </div>

      {/* District Buffer Cards (Priority Sorted by Minimum Days of Supply) */}
      <div className="space-y-3 flex-1 overflow-y-auto max-h-[340px] pr-1">
        {districts
          .slice()
          .sort((a, b) => a.minSupplyDays - b.minSupplyDays)
          .map((d) => {
            const isCutoff = d.connectivityCategory === 'critical';
            const hasStockoutWarning = d.isStockoutRisk;

            return (
              <div 
                key={d.id}
                className={`p-3 rounded-lg border transition-all ${
                  hasStockoutWarning 
                    ? 'bg-red-950/30 border-red-700/80 shadow-lg shadow-red-950/40' 
                    : isCutoff
                    ? 'bg-amber-950/20 border-amber-800/60'
                    : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Card Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white">{d.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">({d.state})</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                      d.accessibilityScore >= 80 
                        ? 'text-emerald-400 bg-emerald-950/80' 
                        : d.accessibilityScore >= 50
                        ? 'text-amber-400 bg-amber-950/80'
                        : 'text-red-400 bg-red-950/80'
                    }`}>
                      Access: {d.accessibilityScore}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedDistrictId(d.id);
                        setActiveChartDistrictId(d.id);
                      }}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-0.5 transition"
                    >
                      <span>Trajectory</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Depletion Warning Engine Alert Banner */}
                {hasStockoutWarning && (
                  <div className="mb-2.5 p-2 rounded bg-red-900/40 border border-red-600/80 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-red-200">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 animate-bounce" />
                      <span>CRITICAL SUPPLY STOCKOUT RISK - AIRDROP / PRIORITY CONVOY REQUIRED</span>
                    </div>

                    <button
                      onClick={() => dispatchEmergencyAirdrop(d.id)}
                      className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-[11px] font-semibold flex items-center gap-1.5 shadow transition active:scale-95 cursor-pointer"
                    >
                      <Plane className="w-3.5 h-3.5" />
                      <span>Deploy IAF Mi-17 Airdrop</span>
                    </button>
                  </div>
                )}

                {/* 3 Commodity Days-of-Supply Buffer Meters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  
                  {/* 1. Medical Supplies & Oxygen */}
                  <div>
                    <div className="flex justify-between items-center text-[10px] font-mono mb-1">
                      <span className="text-slate-400 flex items-center gap-1">
                        <HeartPulse className="w-3 h-3 text-cyan-400" /> Medical / O2
                      </span>
                      <span className={`font-bold ${d.supplies.medicalOxygenDays < 3 ? 'text-red-400 animate-pulse' : 'text-slate-200'}`}>
                        {d.supplies.medicalOxygenDays} d
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          d.supplies.medicalOxygenDays < 3 ? 'bg-red-500' : d.supplies.medicalOxygenDays < TARGETS.medical ? 'bg-amber-400' : 'bg-cyan-500'
                        }`} 
                        style={{ width: `${getMeterPercent(d.supplies.medicalOxygenDays, 25)}%` }}
                      />
                    </div>
                  </div>

                  {/* 2. Food Grains (PDS) */}
                  <div>
                    <div className="flex justify-between items-center text-[10px] font-mono mb-1">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Wheat className="w-3 h-3 text-emerald-400" /> Food Grains
                      </span>
                      <span className={`font-bold ${d.supplies.foodGrainsDays < 3 ? 'text-red-400 animate-pulse' : 'text-slate-200'}`}>
                        {d.supplies.foodGrainsDays} d
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          d.supplies.foodGrainsDays < 3 ? 'bg-red-500' : d.supplies.foodGrainsDays < TARGETS.food ? 'bg-amber-400' : 'bg-emerald-500'
                        }`} 
                        style={{ width: `${getMeterPercent(d.supplies.foodGrainsDays, 45)}%` }}
                      />
                    </div>
                  </div>

                  {/* 3. Petroleum & Diesel (POL) */}
                  <div>
                    <div className="flex justify-between items-center text-[10px] font-mono mb-1">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Fuel className="w-3 h-3 text-amber-400" /> Fuel / Diesel
                      </span>
                      <span className={`font-bold ${d.supplies.fuelDieselDays < 3 ? 'text-red-400 animate-pulse' : 'text-slate-200'}`}>
                        {d.supplies.fuelDieselDays} d
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          d.supplies.fuelDieselDays < 3 ? 'bg-red-500' : d.supplies.fuelDieselDays < TARGETS.fuel ? 'bg-amber-400' : 'bg-amber-500'
                        }`} 
                        style={{ width: `${getMeterPercent(d.supplies.fuelDieselDays, 30)}%` }}
                      />
                    </div>
                  </div>

                </div>

              </div>
            );
          })}
      </div>

      {/* Trajectory Depletion Forecast Chart for Selected District */}
      {chartDistrict && (
        <div className="mt-4 pt-3 border-t border-slate-800 bg-slate-950/70 p-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-bold text-slate-200 uppercase font-mono">
                Burn Rate & Stockout Projection: {chartDistrict.name}
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              Min Buffer: {chartDistrict.minSupplyDays} Days Remaining
            </span>
          </div>

          <div className="h-[140px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartDistrict.historicalDepletion} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorFood" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorFuel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" stroke="#64748b" tick={{ fontSize: 9 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 9 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '6px', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="medical" name="Medical (Days)" stroke="#06b6d4" fillOpacity={1} fill="url(#colorMed)" />
                <Area type="monotone" dataKey="food" name="Food (Days)" stroke="#10b981" fillOpacity={1} fill="url(#colorFood)" />
                <Area type="monotone" dataKey="fuel" name="Fuel (Days)" stroke="#f59e0b" fillOpacity={1} fill="url(#colorFuel)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

    </div>
  );
};
