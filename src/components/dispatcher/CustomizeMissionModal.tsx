import React, { useState } from 'react';
import type { ReliefMission, VehicleProfile, CandidateRoute } from '../../types';
import { VEHICLE_PROFILES } from '../../data/routingNetwork';
import {
  X,
  Truck,
  Package,
  Route,
  UserCheck,
  Send,
  Sliders,
  AlertTriangle,
} from 'lucide-react';
import { RouteExplainabilityCard } from '../gis/RouteExplainabilityCard';

interface CustomizeMissionModalProps {
  mission: ReliefMission;
  candidateRoutes?: CandidateRoute[];
  onClose: () => void;
  onDispatch: (customizedMission: ReliefMission) => void;
}

export const CustomizeMissionModal: React.FC<CustomizeMissionModalProps> = ({
  mission,
  candidateRoutes = [],
  onClose,
  onDispatch,
}) => {
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>(
    mission.recommendedVehicleType || '4x4 Emergency Van (Medic-01)'
  );
  const [selectedRouteId, setSelectedRouteId] = useState<string>(
    mission.assignedRouteId || 'ROUTE-MZ-04-BYPASS'
  );
  const [driverName, setDriverName] = useState<string>(mission.assignedDriver || 'Rajesh Mech');
  const [officerName, setOfficerName] = useState<string>(
    mission.assignedOfficer || 'Inspector L. Hmar'
  );

  // Cargo quantities
  const [ivFluidsQty, setIvFluidsQty] = useState<number>(500);
  const [antivenomQty, setAntivenomQty] = useState<number>(90);
  const [rationsQty, setRationsQty] = useState<number>(1200);
  const [dieselQty, setDieselQty] = useState<number>(800);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: ReliefMission = {
      ...mission,
      recommendedVehicleType: selectedVehicleType,
      assignedRouteId: selectedRouteId,
      assignedDriver: driverName,
      assignedOfficer: officerName,
      cargoAllocations: [
        { item: 'IV Fluids (Ringer Lactate)', quantity: ivFluidsQty, unit: 'bottles' },
        { item: 'Polyvalent Snake Antivenom', quantity: antivenomQty, unit: 'vials' },
        { item: 'High-Calorie Rations', quantity: rationsQty, unit: 'kg' },
        { item: 'Emergency Generator Diesel', quantity: dieselQty, unit: 'litres' },
      ],
      status: 'APPROVED',
      dispatchedAt: new Date().toISOString(),
    };
    onDispatch(updated);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-surface border border-border rounded-md w-full max-w-xl shadow-2xl overflow-hidden flex flex-col text-text-primary text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-surface-subtle border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-primary-tint text-primary flex items-center justify-center border border-primary/30">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">
                Customize Relief Mission Manifest &amp; Routing
              </h3>
              <p className="text-[11px] text-text-secondary">
                Destination: <strong className="text-text-primary">{mission.communityName}</strong> ({mission.urgency})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-sm text-text-secondary hover:text-text-primary hover:bg-surface border border-transparent hover:border-border cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[80vh] custom-scrollbar">
          {/* Vehicle Profile Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-text-primary flex items-center gap-1.5 uppercase tracking-wider">
              <Truck className="w-3.5 h-3.5 text-primary" />
              <span>Assigned Convoy Vehicle Rig</span>
            </label>
            <select
              value={selectedVehicleType}
              onChange={(e) => setSelectedVehicleType(e.target.value)}
              className="w-full p-2 bg-surface border border-border rounded-sm text-text-primary text-xs focus:outline-none"
            >
              <option value="4x4 Emergency Van (Medic-01)">4x4 Emergency Van (Medic-01 - 3.5T Gross, All-Terrain)</option>
              <option value="Medium 14T Cargo Shaktiman">Medium 14T Cargo Shaktiman (All-Weather Military Rig)</option>
              <option value="Heavy Cryogenic Tanker (Oxy-Tanker-04)">Heavy Cryogenic Tanker (Oxy-Tanker-04 - 32T Axle)</option>
              <option value="Light Mahindra Bolero Ambulance">Light Mahindra Bolero Ambulance (High Ground Clearance)</option>
            </select>
          </div>

          {/* Route Corridor Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-text-primary flex items-center gap-1.5 uppercase tracking-wider">
              <Route className="w-3.5 h-3.5 text-primary" />
              <span>Transit Corridor (Yen's K-Shortest Detour)</span>
            </label>
            <select
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(e.target.value)}
              className="w-full p-2 bg-surface border border-border rounded-sm text-text-primary text-xs focus:outline-none font-mono"
            >
              {candidateRoutes.length > 0 ? (
                candidateRoutes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.isPassable ? '✓' : '⚠'} {r.rankLabel} ({r.totalDistanceKm} km - {r.isPassable ? `${r.compositeSafetyScore}% Safe` : 'BLOCKED'})
                  </option>
                ))
              ) : (
                <>
                  <option value="ROUTE-MZ-04-BYPASS">✓ Detour via Bilkhawthlir Hill Bypass (78 km - Safe Mountain Detour)</option>
                  <option value="ROUTE-MZ-04-PRIMARY">⚠ Direct NH-306 Main (Impassable: Active Landslide Blockage)</option>
                  <option value="ROUTE-MZ-04-SOUTHERN">Alternative Bairabi Railhead Spur (94 km - Unpaved Single Lane)</option>
                </>
              )}
            </select>

            {/* Embedded XAI Route Decision Comparison Drawer */}
            {candidateRoutes.length > 0 && (
              <RouteExplainabilityCard
                recommendedRoute={candidateRoutes[0]}
                selectedRoute={candidateRoutes.find((r) => r.id === selectedRouteId) || candidateRoutes[0]}
                candidateRoutes={candidateRoutes}
                compact
                className="mt-2"
                onSelectRoute={(idx) => {
                  const target = candidateRoutes[idx];
                  if (target) setSelectedRouteId(target.id);
                }}
              />
            )}
          </div>

          {/* Cargo Allocation Sliders */}
          <div className="p-3.5 rounded-sm bg-surface-subtle border border-border space-y-3">
            <div className="flex items-center justify-between text-[11px] font-semibold text-text-primary uppercase tracking-wider border-b border-border pb-1">
              <span className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-primary" />
                <span>Cargo Allocation Manifest</span>
              </span>
              <span className="text-[10px] text-primary font-mono">Mission-Tailored</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* IV Fluids */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-text-secondary">IV Fluids:</span>
                  <span className="font-bold font-mono text-primary">{ivFluidsQty} bottles</span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={800}
                  step={50}
                  value={ivFluidsQty}
                  onChange={(e) => setIvFluidsQty(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer h-1.5"
                />
              </div>

              {/* Antivenom */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-text-secondary">Snake Antivenom:</span>
                  <span className="font-bold font-mono text-primary">{antivenomQty} vials</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={200}
                  step={10}
                  value={antivenomQty}
                  onChange={(e) => setAntivenomQty(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer h-1.5"
                />
              </div>

              {/* Rations */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-text-secondary">PDS Staple Rations:</span>
                  <span className="font-bold font-mono text-amber-600 dark:text-amber-400">{rationsQty} kg</span>
                </div>
                <input
                  type="range"
                  min={500}
                  max={3000}
                  step={100}
                  value={rationsQty}
                  onChange={(e) => setRationsQty(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer h-1.5"
                />
              </div>

              {/* Generator Diesel */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-text-secondary">Generator POL Diesel:</span>
                  <span className="font-bold font-mono text-sky-600 dark:text-sky-400">{dieselQty} litres</span>
                </div>
                <input
                  type="range"
                  min={200}
                  max={2000}
                  step={100}
                  value={dieselQty}
                  onChange={(e) => setDieselQty(Number(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer h-1.5"
                />
              </div>
            </div>
          </div>

          {/* Personnel Assignment */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-text-primary flex items-center gap-1 uppercase">
                <UserCheck className="w-3 h-3 text-primary" />
                <span>Assigned Convoy Driver</span>
              </label>
              <input
                type="text"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="w-full p-2 bg-surface border border-border rounded-sm text-text-primary text-xs focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-text-primary flex items-center gap-1 uppercase">
                <UserCheck className="w-3 h-3 text-primary" />
                <span>Lead Field Escort Officer</span>
              </label>
              <input
                type="text"
                value={officerName}
                onChange={(e) => setOfficerName(e.target.value)}
                className="w-full p-2 bg-surface border border-border rounded-sm text-text-primary text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-sm border border-border text-text-secondary hover:bg-surface-subtle btn-press cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#1B4B73] hover:bg-[#123A5A] dark:bg-[#2E6B9E] text-white font-semibold rounded-sm flex items-center gap-1.5 btn-press shadow-xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Confirm &amp; Launch Convoy</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
