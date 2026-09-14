import React, { useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Route, 
  AlertTriangle, 
  Plane, 
  Wrench, 
  CloudRain, 
  Truck, 
  Activity, 
  ShieldCheck, 
  HeartPulse, 
  Wheat, 
  Fuel
} from 'lucide-react';
import { useLogistics } from '../context/LogisticsContext';

export const DistrictDetailModal: React.FC = () => {
  const { 
    selectedDistrict, 
    setSelectedDistrictId, 
    corridors, 
    bottlenecks, 
    convoys, 
    deployBroTaskForce, 
    dispatchEmergencyAirdrop 
  } = useLogistics();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedDistrictId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSelectedDistrictId]);

  if (!selectedDistrict) return null;

  const districtCorridors = corridors.filter((c) => selectedDistrict.corridorIds.includes(c.id));
  const districtBottlenecks = bottlenecks.filter((b) => b.districtId === selectedDistrict.id);
  const districtConvoys = convoys.filter((c) => c.destinationDistrictId === selectedDistrict.id);

  // Formula values breakdown
  const openWeighted = districtCorridors.reduce((acc, c) => {
    if (c.status === 'OPEN') return acc + 1;
    if (c.status === 'RESTRICTED') return acc + 0.5;
    return acc;
  }, 0);
  const totalCorridors = districtCorridors.length || 1;
  const corridorScore = Math.round((openWeighted / totalCorridors) * 50);
  const weatherScore = Math.round(selectedDistrict.weatherFactor * 25);
  const clearanceScore = Math.round(selectedDistrict.fieldClearanceFactor * 25);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="tactical-panel w-full max-w-3xl max-h-[90vh] rounded-xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden bg-[#0c1220]"
        role="dialog"
        aria-modal="true"
      >
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg border ${
              selectedDistrict.connectivityCategory === 'critical'
                ? 'bg-red-950/70 border-red-800 text-red-400 animate-pulse'
                : selectedDistrict.connectivityCategory === 'moderate'
                ? 'bg-amber-950/70 border-amber-800 text-amber-400'
                : 'bg-emerald-950/70 border-emerald-800 text-emerald-400'
            }`}>
              <MapPin className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">{selectedDistrict.name}</h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {selectedDistrict.state}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Lat: {selectedDistrict.lat}° N • Lng: {selectedDistrict.lng}° E • Elev: {selectedDistrict.elevationMeters}m MSL
              </p>
            </div>
          </div>

          <button
            onClick={() => setSelectedDistrictId(null)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-slate-300">
          
          {/* Stockout Risk Emergency Alert */}
          {selectedDistrict.isStockoutRisk && (
            <div className="p-3.5 rounded-lg bg-red-950/70 border-2 border-red-600 flex items-center justify-between gap-3 flex-wrap animate-pulse">
              <div className="flex items-center gap-2 text-xs font-bold text-red-200">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                <div>
                  <div>CRITICAL SUPPLY STOCKOUT RISK - AIRDROP / PRIORITY CONVOY REQUIRED</div>
                  <div className="text-[11px] font-normal text-red-300">
                    Remaining supply runway is under 3.0 days while arterial corridors are severed.
                  </div>
                </div>
              </div>

              <button
                onClick={() => dispatchEmergencyAirdrop(selectedDistrict.id)}
                className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg transition active:scale-95 cursor-pointer"
              >
                <Plane className="w-4 h-4" />
                <span>Execute Emergency Airdrop</span>
              </button>
            </div>
          )}

          {/* Accessibility Health Score Breakdown */}
          <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-400" />
                Accessibility Health Index Formula Breakdown
              </span>
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-slate-400">Total Score:</span>
                <span className={`text-lg font-black px-2 py-0.5 rounded ${
                  selectedDistrict.accessibilityScore >= 80
                    ? 'text-emerald-400 bg-emerald-950/80 border border-emerald-800'
                    : selectedDistrict.accessibilityScore >= 50
                    ? 'text-amber-400 bg-amber-950/80 border border-amber-800'
                    : 'text-red-400 bg-red-950/80 border border-red-800'
                }`}>
                  {selectedDistrict.accessibilityScore}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
              {/* Component 1 */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase">Corridor Factor (50%)</div>
                <div className="text-base font-bold text-emerald-400 mt-1">{corridorScore} / 50 pts</div>
                <div className="text-[10px] text-slate-500 mt-1">
                  ({openWeighted.toFixed(1)} open / {totalCorridors} total) × 50
                </div>
              </div>

              {/* Component 2 */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase">Weather Factor (25%)</div>
                <div className="text-base font-bold text-cyan-400 mt-1">{weatherScore} / 25 pts</div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Factor {selectedDistrict.weatherFactor.toFixed(2)} × 25
                </div>
              </div>

              {/* Component 3 */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase">Field Clearance (25%)</div>
                <div className="text-base font-bold text-amber-400 mt-1">{clearanceScore} / 25 pts</div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Factor {selectedDistrict.fieldClearanceFactor.toFixed(2)} × 25
                </div>
              </div>
            </div>

            <div className="mt-3 text-xs text-slate-400 flex items-center gap-2 bg-slate-950/60 p-2 rounded border border-slate-800/80">
              <CloudRain className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Weather Telemetry: {selectedDistrict.weatherDescription}</span>
            </div>
          </div>

          {/* Arterial Corridors & Road Network */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Route className="w-4 h-4 text-emerald-400" />
              Critical Arterial Highways Connected ({districtCorridors.length})
            </h3>

            <div className="space-y-2">
              {districtCorridors.map((c) => (
                <div 
                  key={c.id} 
                  className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-semibold text-xs text-white">{c.name}</div>
                    <div className="text-[11px] text-slate-400">{c.section}</div>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-slate-400">{c.lengthKm} km</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      c.status === 'OPEN'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : c.status === 'RESTRICTED'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-red-950 text-red-300 border border-red-800 animate-pulse'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Chokepoint & BRO Repair Action */}
          {districtBottlenecks.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                Active Strategic Chokepoint ({districtBottlenecks.length})
              </h3>

              <div className="space-y-2">
                {districtBottlenecks.map((btnk) => (
                  <div 
                    key={btnk.id} 
                    className="p-3 rounded-lg bg-red-950/30 border border-red-800/80 flex items-center justify-between gap-3 flex-wrap"
                  >
                    <div>
                      <div className="font-bold text-xs text-white">{btnk.chokePointName}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {btnk.disruptionType} • {btnk.strandedVehicleCount} Stranded Vehicles • Lifeline: {btnk.economicLifelineScore}/100
                      </div>
                    </div>

                    {btnk.status === 'REPAIRED_CLEAR' ? (
                      <span className="text-xs text-emerald-400 font-bold bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-800 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Cleared by BRO
                      </span>
                    ) : (
                      <button
                        onClick={() => deployBroTaskForce(btnk.id)}
                        className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition cursor-pointer"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Deploy BRO Repair Squad</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Essential Commodities Days of Supply */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-cyan-400" />
              Stockpile & Days of Supply (DoS) Status
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase flex items-center gap-1">
                  <HeartPulse className="w-3 h-3 text-cyan-400" /> Medical & Oxygen
                </div>
                <div className="text-xl font-bold text-white mt-1">
                  {selectedDistrict.supplies.medicalOxygenDays} <span className="text-xs text-slate-400">days</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Target: &gt;7.0 days</div>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase flex items-center gap-1">
                  <Wheat className="w-3 h-3 text-emerald-400" /> Food Grains (PDS)
                </div>
                <div className="text-xl font-bold text-white mt-1">
                  {selectedDistrict.supplies.foodGrainsDays} <span className="text-xs text-slate-400">days</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Target: &gt;15.0 days</div>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase flex items-center gap-1">
                  <Fuel className="w-3 h-3 text-amber-400" /> Petroleum & Diesel
                </div>
                <div className="text-xl font-bold text-white mt-1">
                  {selectedDistrict.supplies.fuelDieselDays} <span className="text-xs text-slate-400">days</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Target: &gt;10.0 days</div>
              </div>
            </div>
          </div>

          {/* En Route Convoys */}
          {districtConvoys.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-blue-400" />
                Active Essential Convoys En Route ({districtConvoys.length})
              </h3>

              <div className="space-y-2">
                {districtConvoys.map((c) => (
                  <div key={c.id} className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white font-mono">{c.convoyNumber} ({c.cargo})</div>
                      <div className="text-[11px] text-slate-400 font-mono">Location: {c.currentLocation}</div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-amber-400 font-bold">+{c.delayHours}h delay</div>
                      <div className="text-[10px] text-slate-400">{c.truckCount} Trucks</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 flex justify-end bg-slate-900/60">
          <button
            onClick={() => setSelectedDistrictId(null)}
            className="px-4 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
          >
            Close Drill-Down
          </button>
        </div>

      </div>
    </div>
  );
};
