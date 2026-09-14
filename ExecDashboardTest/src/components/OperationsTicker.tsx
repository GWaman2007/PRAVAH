import React from 'react';
import { 
  Radio, 
  CheckCircle2, 
  AlertTriangle, 
  CloudRain, 
  Plane, 
  Wrench
} from 'lucide-react';
import { useLogistics } from '../context/LogisticsContext';

export const OperationsTicker: React.FC = () => {
  const { operationsLogs } = useLogistics();

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'CLEARANCE':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case 'ALERT':
        return <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 animate-pulse" />;
      case 'WEATHER':
        return <CloudRain className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
      case 'AIRDROP':
        return <Plane className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
      default:
        return <Wrench className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
    }
  };

  return (
    <div className="tactical-panel rounded-xl p-3 border border-slate-800 shadow-md">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-300 shrink-0 uppercase tracking-wider">
          <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span>Ops Activity Log</span>
        </div>

        <div className="flex-1 overflow-x-auto whitespace-nowrap scrollbar-none py-0.5">
          <div className="inline-flex items-center gap-4 text-xs">
            {operationsLogs.slice(0, 6).map((log) => (
              <div 
                key={log.id} 
                className="inline-flex items-center gap-1.5 bg-slate-900/60 px-2.5 py-1 rounded border border-slate-800/80 text-[11px]"
              >
                {getLogIcon(log.type)}
                <span className="font-mono text-[10px] text-slate-400">{log.timestamp}</span>
                <span className="text-slate-200">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
