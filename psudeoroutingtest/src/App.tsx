import React, { useState, useEffect } from 'react';
import { SimulationProvider } from './context/SimulationContext';
import { Header } from './components/Header';
import { SidebarControls } from './components/SidebarControls';
import { MapView } from './components/MapView';
import { RouteComparisonCards } from './components/RouteComparisonCards';
import { SegmentModal } from './components/SegmentModal';
import { Map, Sliders, ListOrdered, GripVertical } from 'lucide-react';

export const AppContent: React.FC = () => {
  const [showLeftPanel, setShowLeftPanel] = useState<boolean>(true);
  const [showRightPanel, setShowRightPanel] = useState<boolean>(true);
  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(360);
  const [rightPanelWidth, setRightPanelWidth] = useState<number>(380);
  const [isDraggingLeft, setIsDraggingLeft] = useState<boolean>(false);
  const [isDraggingRight, setIsDraggingRight] = useState<boolean>(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'map' | 'controls' | 'routes'>('map');

  // Handle Drag Resizing of Sidebars to shrink/expand map freely
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingLeft) {
        const clamped = Math.max(260, Math.min(620, e.clientX));
        setLeftPanelWidth(clamped);
      }
      if (isDraggingRight) {
        const clamped = Math.max(280, Math.min(650, window.innerWidth - e.clientX));
        setRightPanelWidth(clamped);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingLeft(false);
      setIsDraggingRight(false);
    };

    if (isDraggingLeft || isDraggingRight) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    } else {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDraggingLeft, isDraggingRight]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 select-none">
      {/* Top Header Command Bar */}
      <Header />

      {/* Mobile / Tablet Tab Switcher (Visible on small screens only) */}
      <div className="lg:hidden flex bg-slate-900 border-b border-slate-800 text-xs shrink-0 z-30">
        <button
          onClick={() => setActiveMobileTab('controls')}
          className={`flex-1 py-2 text-center font-medium flex items-center justify-center gap-1.5 transition ${
            activeMobileTab === 'controls'
              ? 'bg-slate-800 text-emerald-400 border-b-2 border-emerald-500 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Controls</span>
        </button>
        <button
          onClick={() => setActiveMobileTab('map')}
          className={`flex-1 py-2 text-center font-medium flex items-center justify-center gap-1.5 transition ${
            activeMobileTab === 'map'
              ? 'bg-slate-800 text-emerald-400 border-b-2 border-emerald-500 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Map className="w-3.5 h-3.5" />
          <span>GIS Map</span>
        </button>
        <button
          onClick={() => setActiveMobileTab('routes')}
          className={`flex-1 py-2 text-center font-medium flex items-center justify-center gap-1.5 transition ${
            activeMobileTab === 'routes'
              ? 'bg-slate-800 text-emerald-400 border-b-2 border-emerald-500 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ListOrdered className="w-3.5 h-3.5" />
          <span>Candidate Routes</span>
        </button>
      </div>

      {/* Main Simulation Workspace */}
      <main className="flex-1 flex flex-col lg:flex-row min-h-0 min-w-0 overflow-hidden relative">
        {/* Left Column: Simulation Controls (Resizable & Collapsible) */}
        <aside
          style={{ width: showLeftPanel ? `${leftPanelWidth}px` : 0 }}
          className={`shrink-0 transition-[width] duration-150 min-h-0 ${
            activeMobileTab === 'controls' ? 'flex flex-1 h-full w-full' : 'hidden lg:flex'
          } ${!showLeftPanel ? 'lg:overflow-hidden lg:border-none' : 'overflow-hidden'}`}
        >
          <div className="w-full h-full overflow-hidden" style={{ minWidth: `${leftPanelWidth}px` }}>
            <SidebarControls />
          </div>
        </aside>

        {/* Left Draggable Resizer Bar */}
        {showLeftPanel && (
          <div
            onMouseDown={() => setIsDraggingLeft(true)}
            className="hidden lg:flex items-center justify-center w-2 hover:w-2.5 bg-slate-900/90 hover:bg-emerald-500/40 cursor-col-resize z-30 transition-all border-x border-slate-800 hover:border-emerald-500/60 group select-none shrink-0"
            title="Drag left/right to resize panel or shrink/expand map"
          >
            <GripVertical className="w-3 h-3 text-slate-600 group-hover:text-emerald-300 transition" />
          </div>
        )}

        {/* Center Stage: Interactive GIS Leaflet Map (Fluid width, strictly North East India) */}
        <section
          className={`flex-1 min-w-0 min-h-0 flex flex-col h-full overflow-hidden ${
            activeMobileTab !== 'map' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <MapView
            showLeftPanel={showLeftPanel}
            onToggleLeftPanel={() => setShowLeftPanel(prev => !prev)}
            showRightPanel={showRightPanel}
            onToggleRightPanel={() => setShowRightPanel(prev => !prev)}
          />
        </section>

        {/* Right Draggable Resizer Bar */}
        {showRightPanel && (
          <div
            onMouseDown={() => setIsDraggingRight(true)}
            className="hidden lg:flex items-center justify-center w-2 hover:w-2.5 bg-slate-900/90 hover:bg-emerald-500/40 cursor-col-resize z-30 transition-all border-x border-slate-800 hover:border-emerald-500/60 group select-none shrink-0"
            title="Drag left/right to resize panel or shrink/expand map"
          >
            <GripVertical className="w-3 h-3 text-slate-600 group-hover:text-emerald-300 transition" />
          </div>
        )}

        {/* Right Column: 5 Candidate Route Cards (Resizable & Collapsible) */}
        <aside
          style={{ width: showRightPanel ? `${rightPanelWidth}px` : 0 }}
          className={`shrink-0 transition-[width] duration-150 min-h-0 ${
            activeMobileTab === 'routes' ? 'flex flex-1 h-full w-full' : 'hidden lg:flex'
          } ${!showRightPanel ? 'lg:overflow-hidden lg:border-none' : 'overflow-hidden'}`}
        >
          <div className="w-full h-full overflow-hidden" style={{ minWidth: `${rightPanelWidth}px` }}>
            <RouteComparisonCards />
          </div>
        </aside>
      </main>

      {/* Modal for Road Segment Inspection & Ground Officer Reports */}
      <SegmentModal />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <SimulationProvider>
      <AppContent />
    </SimulationProvider>
  );
};

export default App;
