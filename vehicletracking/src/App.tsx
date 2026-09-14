import React, { useEffect, useState } from 'react';
import { SimulationProvider, useSimulation } from './context/SimulationContext';
import { Header } from './components/Header';
import { MapView } from './components/MapView';
import { VehicleInspector } from './components/VehicleInspector';
import { AlertFeed } from './components/AlertFeed';
import { SOSModal } from './components/SOSModal';
import { RouteLegend } from './components/RouteLegend';
import { Gauge, Bell, ChevronRight, ChevronLeft } from 'lucide-react';

const DashboardContent: React.FC = () => {
  const { togglePlay, alerts, activeTab, setActiveTab } = useSimulation();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  // Keyboard shortcut for spacebar play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay]);

  const unacknowledgedAlertsCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans select-none">
      {/* Top Command Bar */}
      <Header />

      {/* Main Command Canvas Layout */}
      <div className="relative flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left / Center Canvas: Leaflet Map */}
        <div className="relative flex-1 h-full overflow-hidden">
          <MapView />
          <RouteLegend />

          {/* Toggle Sidebar Button for compact views */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="absolute top-4 right-4 z-20 p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 shadow-xl backdrop-blur transition cursor-pointer lg:hidden"
          >
            {sidebarOpen ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {/* Right Collapsible Panel: Telemetry Inspector & Live Alerts */}
        <div
          className={`w-full lg:w-[420px] xl:w-[460px] h-[45vh] lg:h-full flex flex-col bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 z-10 transition-all duration-300 shadow-2xl ${
            sidebarOpen ? 'translate-x-0' : 'translate-x-full hidden lg:flex'
          }`}
        >
          {/* Panel Tab Switcher */}
          <div className="flex items-center border-b border-slate-800 bg-slate-950 text-xs font-mono">
            <button
              onClick={() => setActiveTab('TELEMETRY')}
              className={`flex-1 py-2.5 flex items-center justify-center gap-2 border-b-2 transition cursor-pointer ${
                activeTab === 'TELEMETRY'
                  ? 'border-emerald-500 text-emerald-400 font-bold bg-slate-900/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Gauge className="w-4 h-4" />
              <span>TELEMETRY INSPECTOR</span>
            </button>

            <button
              onClick={() => setActiveTab('ALERTS')}
              className={`flex-1 py-2.5 flex items-center justify-center gap-2 border-b-2 transition cursor-pointer relative ${
                activeTab === 'ALERTS'
                  ? 'border-rose-500 text-rose-400 font-bold bg-slate-900/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>ALERT STREAM</span>
              {unacknowledgedAlertsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-600 text-white font-mono font-bold animate-pulse">
                  {unacknowledgedAlertsCount}
                </span>
              )}
            </button>
          </div>

          {/* Panel Body */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'TELEMETRY' ? <VehicleInspector /> : <AlertFeed />}
          </div>
        </div>
      </div>

      {/* Cabin SOS Emergency Modal */}
      <SOSModal />
    </div>
  );
};

export function App() {
  return (
    <SimulationProvider>
      <DashboardContent />
    </SimulationProvider>
  );
}

export default App;
