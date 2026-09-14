import React from 'react';
import { 
  Route, 
  AlertTriangle, 
  Truck, 
  Hourglass, 
  TrendingUp, 
  ShieldCheck 
} from 'lucide-react';
import { useLogistics } from '../context/LogisticsContext';

export const KpiDeck: React.FC = () => {
  const { metrics, setSelectedDistrictId } = useLogistics();

  // Total truck count calculated across all convoys
  const { convoys } = useLogistics();
  const totalTrucksInTransit = convoys.reduce((sum, c) => sum + c.truckCount, 0);
  const highRiskTrucks = convoys
    .filter((c) => c.riskLevel === 'HIGH_RISK')
    .reduce((sum, c) => sum + c.truckCount, 0);

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 my-3.5">
      
      {/* KPI 1: Total Accessible Arterial Network */}
      <div className="tactical-panel rounded-xl p-4 transition-all hover:border-slate-700 relative overflow-hidden group">
        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition" />
        
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Route className="w-4 h-4 text-emerald-400" />
            Total Accessible Arterial Network
          </span>
          <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
            metrics.activeKmPercent >= 80 
              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60' 
              : 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
          }`}>
            {metrics.activeKmPercent}% Active
          </span>
        </div>

        <div className="mt-1 flex items-baseline gap-2">
          <h2 className="text-2xl font-bold tracking-tight text-white font-mono">
            {metrics.activeKm.toLocaleString()} <span className="text-sm font-normal text-slate-400">km</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            / {metrics.totalKm.toLocaleString()} km total
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700" 
              style={{ width: `${metrics.activeKmPercent}%` }}
            />
            <div 
              className="h-full bg-red-500/80 transition-all duration-700" 
              style={{ width: `${100 - metrics.activeKmPercent}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 font-mono">
            <span className="text-emerald-400">{metrics.activeKm} km Open</span>
            <span className="text-red-400">{metrics.disruptedKm} km Disrupted</span>
          </div>
        </div>
      </div>

      {/* KPI 2: Isolated / Cut-Off Districts */}
      <div className={`tactical-panel rounded-xl p-4 transition-all relative overflow-hidden group ${
        metrics.isolatedDistrictsCount > 0 ? 'border-red-900/60 bg-red-950/20' : 'hover:border-slate-700'
      }`}>
        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-red-500/10 rounded-full blur-2xl transition" />
        
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <AlertTriangle className={`w-4 h-4 ${metrics.isolatedDistrictsCount > 0 ? 'text-red-400 animate-pulse' : 'text-slate-400'}`} />
            Isolated / Cut-Off Districts
          </span>
          {metrics.isolatedDistrictsCount > 0 ? (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-900/80 text-red-200 border border-red-700 animate-pulse">
              CRITICAL HAZARD
            </span>
          ) : (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800">
              ZERO ISOLATION
            </span>
          )}
        </div>

        <div className="mt-1 flex items-baseline gap-2">
          <h2 className="text-2xl font-bold tracking-tight text-white font-mono">
            {metrics.isolatedDistrictsCount}
            <span className="text-xs font-normal text-slate-400 ml-1.5 font-sans">
              Districts on Critical Alert
            </span>
          </h2>
        </div>

        {/* Affected District Quick Chips */}
        <div className="mt-3 flex flex-wrap gap-1.5 min-h-[26px]">
          {metrics.isolatedDistrictNames.length > 0 ? (
            metrics.isolatedDistrictNames.map((name, idx) => (
              <button
                key={idx}
                onClick={() => {
                  const idMap: Record<string, string> = {
                    'Tawang': 'tawang',
                    'Dima Hasao (Haflong)': 'dima_hasao',
                    'Upper Subansiri (Daporijo)': 'upper_subansiri',
                    'North Sikkim (Mangan)': 'north_sikkim'
                  };
                  if (idMap[name]) setSelectedDistrictId(idMap[name]);
                }}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-900/40 hover:bg-red-800/70 border border-red-700/60 text-red-200 transition cursor-pointer flex items-center gap-1"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                {name.split(' (')[0]}
              </button>
            ))
          ) : (
            <span className="text-[11px] text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> All corridors nominal
            </span>
          )}
        </div>
      </div>

      {/* KPI 3: Active Essential Convoys in Transit */}
      <div className="tactical-panel rounded-xl p-4 transition-all hover:border-slate-700 relative overflow-hidden group">
        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition" />
        
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-blue-400" />
            Active Essential Convoys
          </span>
          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60">
            {convoys.length} Fleet Columns
          </span>
        </div>

        <div className="mt-1 flex items-baseline gap-2">
          <h2 className="text-2xl font-bold tracking-tight text-white font-mono">
            {totalTrucksInTransit} <span className="text-sm font-normal text-slate-400">Trucks</span>
          </h2>
          <span className="text-xs text-amber-400 font-mono">
            ({highRiskTrucks} in High-Risk Corridors)
          </span>
        </div>

        {/* Cargo Type Mini Tags */}
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-800/70">
          <span className="text-cyan-400">Med/O2: {convoys.filter(c => c.cargo.includes('Medical')).length}</span>
          <span className="text-amber-400">Fuel: {convoys.filter(c => c.cargo.includes('Fuel')).length}</span>
          <span className="text-emerald-400">Food PDS: {convoys.filter(c => c.cargo.includes('Food')).length}</span>
        </div>
      </div>

      {/* KPI 4: Average Regional Delay Delta */}
      <div className="tactical-panel rounded-xl p-4 transition-all hover:border-slate-700 relative overflow-hidden group">
        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition" />
        
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Hourglass className="w-4 h-4 text-amber-400" />
            Regional Delay Delta
          </span>
          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Active Surge
          </span>
        </div>

        <div className="mt-1 flex items-baseline gap-2">
          <h2 className="text-2xl font-bold tracking-tight text-white font-mono text-amber-300">
            +{metrics.avgDelayHours} <span className="text-sm font-normal text-slate-400">hrs</span>
          </h2>
          <span className="text-xs text-slate-400">
            over normal schedule
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-800/70">
          <span>Max bottleneck delay: 14.0 hrs</span>
          <span className="text-emerald-400">Plains velocity: 48 km/h</span>
        </div>
      </div>

    </section>
  );
};
