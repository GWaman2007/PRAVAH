import { useState } from 'react';
import { LogisticsProvider } from './context/LogisticsContext';
import { Header } from './components/Header';
import { KpiDeck } from './components/KpiDeck';
import { NerMap } from './components/NerMap';
import { SupplyForecaster } from './components/SupplyForecaster';
import { BottleneckQueue } from './components/BottleneckQueue';
import { DistrictDetailModal } from './components/DistrictDetailModal';
import { OperationsTicker } from './components/OperationsTicker';
import { EmergencyBriefingModal } from './components/EmergencyBriefingModal';

function DashboardContent() {
  const [isBriefingOpen, setIsBriefingOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col antialiased">
      {/* 1. Header Bar */}
      <Header onOpenBriefing={() => setIsBriefingOpen(true)} />

      {/* Main Dashboard Canvas */}
      <main className="flex-1 max-w-[1920px] w-full mx-auto px-3 sm:px-4 pb-6 flex flex-col gap-3.5">
        
        {/* 2. Executive KPI Deck */}
        <KpiDeck />

        {/* 3. Primary GIS & Supply Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
          
          {/* Left / Center: Leaflet GIS Map & BRO Repair Prioritization Queue */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-3.5">
            <NerMap />
            <BottleneckQueue />
          </div>

          {/* Right: Essential Supply Runway & Depletion Forecaster */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-3.5">
            <SupplyForecaster />
          </div>

        </div>

        {/* 4. Live Operations Log Ticker */}
        <div className="mt-1">
          <OperationsTicker />
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-[#090d16] py-2.5 px-4 text-center text-xs text-slate-500 font-mono flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Ministry of Development of North Eastern Region (MDoNER) Logistics GIS Engine</span>
        </div>
        <div>
          <span>Integrated with Border Roads Organisation (BRO) & State PWD Disaster Divisions</span>
        </div>
      </footer>

      {/* 5. Modals / Drawers */}
      <DistrictDetailModal />
      <EmergencyBriefingModal 
        isOpen={isBriefingOpen} 
        onClose={() => setIsBriefingOpen(false)} 
      />
    </div>
  );
}

export function App() {
  return (
    <LogisticsProvider>
      <DashboardContent />
    </LogisticsProvider>
  );
}

export default App;
