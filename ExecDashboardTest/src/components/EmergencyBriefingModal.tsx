import React from 'react';
import { 
  X, 
  Printer, 
  ShieldCheck, 
  AlertTriangle, 
  FileText, 
  HardHat 
} from 'lucide-react';
import { useLogistics } from '../context/LogisticsContext';

interface EmergencyBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmergencyBriefingModal: React.FC<EmergencyBriefingModalProps> = ({ isOpen, onClose }) => {
  const { metrics, districts, bottlenecks } = useLogistics();

  if (!isOpen) return null;

  const criticalDistricts = districts.filter((d) => d.connectivityCategory === 'critical');
  const activeBottlenecks = bottlenecks.filter((b) => b.status !== 'REPAIRED_CLEAR');
  const todayDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="tactical-panel w-full max-w-4xl max-h-[92vh] rounded-xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden bg-[#0c1220]">
        
        {/* Briefing Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-950/70 border border-emerald-800 text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider font-bold bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-800">
                  TOP SECRET // MDoNER COMMAND
                </span>
                <span className="text-xs font-mono text-slate-400">DOC-REF: NER-LOG-2026-B9</span>
              </div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Executive Logistics Bottleneck & District Accessibility Briefing
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Briefing</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Briefing Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-200 text-xs leading-relaxed print:text-black">
          
          {/* Executive Summary Card */}
          <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Date: {todayDate}</span>
              <span>Prepared for: Hon. Minister & Secretary (MDoNER), Chief Secretaries of NER</span>
            </div>
            <p className="text-slate-300">
              This situational executive brief assesses arterial logistics connectivity across the 8 North Eastern States. Currently, <strong className="text-emerald-400 font-mono">{metrics.activeKmPercent}%</strong> of the arterial network ({metrics.activeKm.toLocaleString()} km of {metrics.totalKm.toLocaleString()} km) is operational, while <strong className="text-red-400 font-mono">{metrics.isolatedDistrictsCount} districts</strong> remain under critical connectivity isolation with active supply depletion risks.
            </p>
          </div>

          {/* Key Operational KPI Deck */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-center">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Network Health</div>
              <div className="text-lg font-bold text-emerald-400 mt-1">{metrics.activeKmPercent}%</div>
              <div className="text-[10px] text-slate-500">{metrics.activeKm} km Active</div>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Isolated Districts</div>
              <div className="text-lg font-bold text-red-400 mt-1">{metrics.isolatedDistrictsCount}</div>
              <div className="text-[10px] text-slate-500">Critical Status</div>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Active Chokepoints</div>
              <div className="text-lg font-bold text-amber-400 mt-1">{activeBottlenecks.length}</div>
              <div className="text-[10px] text-slate-500">BRO Engaged</div>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Avg Delay Delta</div>
              <div className="text-lg font-bold text-amber-300 mt-1">+{metrics.avgDelayHours} hrs</div>
              <div className="text-[10px] text-slate-500">Over Schedule</div>
            </div>
          </div>

          {/* Section 1: Isolated Districts on Critical Watch */}
          <div className="space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-red-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              1. Isolated Districts Under Critical Watch (&lt;50% Accessibility Score)
            </h3>

            <div className="space-y-2">
              {criticalDistricts.length > 0 ? (
                criticalDistricts.map((d) => (
                  <div key={d.id} className="p-3 bg-red-950/30 border border-red-800/80 rounded-lg flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="font-bold text-white text-xs">{d.name} ({d.state})</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{d.statusNote}</div>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-xs">
                      <div>
                        <span className="text-slate-400">Score: </span>
                        <span className="text-red-400 font-bold">{d.accessibilityScore}%</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Min Runway: </span>
                        <span className={`font-bold ${d.minSupplyDays < 3 ? 'text-red-400 animate-pulse' : 'text-amber-400'}`}>
                          {d.minSupplyDays} Days
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 bg-emerald-950/30 border border-emerald-800 rounded-lg text-emerald-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>All districts currently maintain accessibility scores &gt;50%. Zero severed regions.</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: BRO & PWD Engineering Priority Queue */}
          <div className="space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <HardHat className="w-4 h-4" />
              2. Strategic Chokepoints & BRO Deployment Matrix
            </h3>

            <div className="space-y-2">
              {bottlenecks.map((b) => (
                <div key={b.id} className="p-2.5 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center justify-between text-xs font-mono flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-400">#{b.rank}</span>
                    <span className="text-white font-sans font-semibold">{b.chokePointName}</span>
                    <span className="text-[10px] text-slate-400">({b.highway})</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-amber-400">{b.strandedVehicleCount} Stranded</span>
                    <span className="text-slate-400">Lifeline: {b.economicLifelineScore}/100</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      b.status === 'REPAIRED_CLEAR'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-red-950 text-red-300 border border-red-800'
                    }`}>
                      {b.status === 'REPAIRED_CLEAR' ? 'CLEARED' : 'DISPATCH ACTIVE'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Recommended Executive Directives */}
          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-400">
              3. Recommended Executive Directives for Immediate Execution:
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-slate-300 text-xs">
              <li>Deploy heavy earthmovers under BRO Project Vartak to Sela Pass KM-74 to restore critical high-altitude corridor.</li>
              <li>Coordinate with Indian Air Force Eastern Command for tactical Mi-17 heavy-lift drops if ground clearance exceeds 36 hours.</li>
              <li>Implement emergency state fuel rationing in Dima Hasao and Upper Subansiri until arterial link through Lumding is reopened.</li>
              <li>Authorize Indian Railways rapid ballast replenishment for the Jatinga-Harangajao hill section.</li>
            </ul>
          </div>

        </div>

        {/* Briefing Footer */}
        <div className="px-6 py-3 border-t border-slate-800 flex justify-between items-center bg-slate-900/80">
          <span className="text-[10px] font-mono text-slate-500">
            CONFIDENTIAL • FOR OFFICIAL GOVERNMENT USE ONLY
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
          >
            Dismiss Briefing
          </button>
        </div>

      </div>
    </div>
  );
};
