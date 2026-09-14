import React from 'react';
import { 
  Wrench, 
  Truck, 
  CheckCircle2, 
  HardHat, 
  Loader2 
} from 'lucide-react';
import { useLogistics } from '../context/LogisticsContext';

export const BottleneckQueue: React.FC = () => {
  const { 
    bottlenecks, 
    deployBroTaskForce, 
    isDeployingMap 
  } = useLogistics();

  // Sort by priority rank
  const sortedBottlenecks = [...bottlenecks].sort((a, b) => {
    // Show active first, then by lifeline score
    if (a.status !== 'REPAIRED_CLEAR' && b.status === 'REPAIRED_CLEAR') return -1;
    if (a.status === 'REPAIRED_CLEAR' && b.status !== 'REPAIRED_CLEAR') return 1;
    return b.economicLifelineScore - a.economicLifelineScore;
  });

  return (
    <div className="tactical-panel rounded-xl p-4 border border-slate-800 shadow-xl flex flex-col">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-950/60 border border-blue-800/50 text-blue-400">
            <HardHat className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-white uppercase flex items-center gap-2">
              Strategic Infrastructure Bottleneck & BRO / PWD Priority Queue
              <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-slate-800 text-blue-300 font-mono">
                Project Vartak • Swastik • Pushpak • Sewak
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Ranked deployment matrix for Bailey bridge assemblies, heavy earthmovers, and rock clearance squads
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-300 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
            Active Blockages: {bottlenecks.filter((b) => b.status !== 'REPAIRED_CLEAR').length}
          </span>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-900/50">
              <th className="py-2.5 px-3">Rank</th>
              <th className="py-2.5 px-3">Choke Point / Bridge Name</th>
              <th className="py-2.5 px-3">State / Highway</th>
              <th className="py-2.5 px-3">Disruption Type</th>
              <th className="py-2.5 px-3">Stranded Vehicles</th>
              <th className="py-2.5 px-3">Lifeline Score</th>
              <th className="py-2.5 px-3 text-right">BRO / PWD Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {sortedBottlenecks.map((item, index) => {
              const isCleared = item.status === 'REPAIRED_CLEAR';
              const isDeploying = isDeployingMap[item.id];

              return (
                <tr 
                  key={item.id}
                  className={`transition-colors ${
                    isCleared 
                      ? 'bg-emerald-950/10 hover:bg-emerald-950/20 text-slate-400' 
                      : 'hover:bg-slate-900/60 text-slate-200'
                  }`}
                >
                  {/* Rank */}
                  <td className="py-3 px-3 font-mono">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-bold text-xs ${
                      isCleared 
                        ? 'bg-slate-800 text-slate-500' 
                        : index === 0 
                        ? 'bg-red-950 text-red-400 border border-red-800' 
                        : 'bg-slate-900 text-slate-300 border border-slate-800'
                    }`}>
                      #{item.rank || index + 1}
                    </span>
                  </td>

                  {/* Choke Point / Bridge Name */}
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                      {item.chokePointName}
                      {item.economicLifelineScore >= 90 && !isCleared && (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                      <span>Asset: {item.recommendedAsset}</span>
                      <span>•</span>
                      <span className="text-slate-500">Est: ~{item.estimatedClearanceHours}h</span>
                    </div>
                  </td>

                  {/* State / Highway */}
                  <td className="py-3 px-3 font-mono">
                    <div className="text-white font-medium">{item.highway}</div>
                    <div className="text-[10px] text-slate-400">{item.state}</div>
                  </td>

                  {/* Disruption Type */}
                  <td className="py-3 px-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                      item.disruptionType.includes('Landslide')
                        ? 'bg-red-950/80 text-red-300 border border-red-800/60'
                        : item.disruptionType.includes('Bridge')
                        ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                        : 'bg-blue-950/80 text-blue-300 border border-blue-800/60'
                    }`}>
                      {item.disruptionType}
                    </span>
                  </td>

                  {/* Stranded Vehicle Count */}
                  <td className="py-3 px-3 font-mono">
                    <div className="flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-amber-400" />
                      <span className={`font-bold ${isCleared ? 'text-slate-400 line-through' : 'text-amber-300'}`}>
                        {item.strandedVehicleCount} Units
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {isCleared ? 'Convoy Released' : 'Held at Staging'}
                    </div>
                  </td>

                  {/* Economic / Lifeline Impact Score */}
                  <td className="py-3 px-3 font-mono">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-black ${
                        item.economicLifelineScore >= 90 ? 'text-red-400' : 'text-amber-400'
                      }`}>
                        {item.economicLifelineScore}
                      </span>
                      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${item.economicLifelineScore >= 90 ? 'bg-red-500' : 'bg-amber-400'}`}
                          style={{ width: `${item.economicLifelineScore}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-[9px] text-slate-500 uppercase">Lifeline Weight</div>
                  </td>

                  {/* Action Button */}
                  <td className="py-3 px-3 text-right">
                    {isCleared ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-1 rounded-md">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Cleared & Open</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => deployBroTaskForce(item.id)}
                        disabled={isDeploying}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-950/50 transition active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        {isDeploying ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Mobilizing...</span>
                          </>
                        ) : (
                          <>
                            <Wrench className="w-3.5 h-3.5" />
                            <span>Deploy BRO Unit</span>
                          </>
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
};
