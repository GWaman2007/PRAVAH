/**
 * PRAVAH — Driver Mission Screen
 * 
 * Displays mission details, origin, destination, driver, vehicle, cargo manifest,
 * priority, ETA, and simple mission progression:
 * Assigned -> Cargo Loaded -> En Route -> Arrived -> Delivered
 * 
 * Action Buttons:
 * [ Confirm Cargo ]
 * [ Confirm Arrival ]
 * [ Confirm Delivery ]
 * 
 * Delivery Flow:
 * Driver reaches destination -> Confirm Arrival -> Confirm delivered quantities
 * -> Delivery Completed -> Field Officer receives verification request
 * -> Field Officer confirms receipt -> Mission becomes Completed
 */
import React, { useState, useMemo } from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import {
  Package,
  Truck,
  MapPin,
  Clock,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
  User,
  Check,
  AlertCircle,
  FileCheck,
  Send,
  X,
} from 'lucide-react';
import type { ReliefMission, VehicleTelemetry } from '../../types';

interface DriverMissionScreenProps {
  activeMission: ReliefMission | null;
  activeVehicle: VehicleTelemetry;
  onNavigateToMap: () => void;
}

type MissionStage = 'ASSIGNED' | 'CARGO_LOADED' | 'EN_ROUTE' | 'ARRIVED' | 'DELIVERED';

export const DriverMissionScreen: React.FC<DriverMissionScreenProps> = ({
  activeMission,
  activeVehicle,
  onNavigateToMap,
}) => {
  const {
    reportMissionDeliveryByField,
    activeMissions,
    isOnline,
    isSimulatedOffline,
  } = usePravahStore();

  const effectiveOnline = isOnline && !isSimulatedOffline;

  // Determine current progression stage
  const [localStage, setLocalStage] = useState<MissionStage>(() => {
    if (!activeMission) return 'EN_ROUTE';
    if (activeMission.status === 'DELIVERED') return 'DELIVERED';
    if (activeMission.status === 'PENDING_ADMIN_CLOSEOUT') return 'DELIVERED';
    if (activeMission.status === 'IN_TRANSIT') return 'EN_ROUTE';
    if (activeMission.status === 'APPROVED') return 'ASSIGNED';
    return 'EN_ROUTE';
  });

  const isCloseoutPending = activeMission?.status === 'PENDING_ADMIN_CLOSEOUT';
  const isDelivered = activeMission?.status === 'DELIVERED' || (localStage === 'DELIVERED' && !isCloseoutPending);

  // Delivery confirmation modal state
  const [isConfirmDeliveryModalOpen, setIsConfirmDeliveryModalOpen] = useState(false);
  const [deliveredFoodKits, setDeliveredFoodKits] = useState(300);
  const [deliveredWaterLiters, setDeliveredWaterLiters] = useState(1200);
  const [deliveredMedicalKits, setDeliveredMedicalKits] = useState(45);
  const [deliveryNote, setDeliveryNote] = useState('');

  // Handle stage advances
  const handleConfirmCargo = () => {
    setLocalStage('CARGO_LOADED');
    setTimeout(() => {
      setLocalStage('EN_ROUTE');
    }, 600);
  };

  const handleConfirmArrival = () => {
    setLocalStage('ARRIVED');
  };

  const handleOpenDeliveryConfirm = () => {
    setIsConfirmDeliveryModalOpen(true);
  };

  const handleSubmitDeliveryConfirmation = () => {
    if (activeMission) {
      reportMissionDeliveryByField(activeMission.id);
    }
    setLocalStage('DELIVERED');
    setIsConfirmDeliveryModalOpen(false);
  };

  // Stage steps for progression stepper
  const steps: { stage: MissionStage; label: string; sub: string }[] = [
    { stage: 'ASSIGNED', label: 'Assigned', sub: 'Depot staging' },
    { stage: 'CARGO_LOADED', label: 'Cargo Loaded', sub: 'Manifest verified' },
    { stage: 'EN_ROUTE', label: 'En Route', sub: 'In highway transit' },
    { stage: 'ARRIVED', label: 'Arrived', sub: 'Destination reached' },
    { stage: 'DELIVERED', label: 'Delivered', sub: 'Receipt confirmed' },
  ];

  const currentStageIndex = useMemo(() => {
    if (isDelivered || isCloseoutPending) return 4;
    return steps.findIndex(s => s.stage === localStage);
  }, [localStage, isDelivered, isCloseoutPending]);

  return (
    <div className="p-3 sm:p-4 space-y-3 pb-24 text-slate-100">
      {/* ─── MISSION HEADER CARD ─── */}
      <div className="p-4 rounded-3xl bg-[#111A29] border border-slate-700/80 shadow-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-blue-400 tracking-wider uppercase px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30">
              {activeMission?.id ? activeMission.id.replace('MSN-ONGOING-', 'Mission ') : 'Mission MZ-04'}
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              Priority: <strong className="text-red-400">{activeMission?.urgency || 'P1 CRITICAL'}</strong>
            </span>
          </div>

          <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${
            isDelivered
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              : isCloseoutPending
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
          }`}>
            {isDelivered ? 'COMPLETED' : isCloseoutPending ? 'PENDING FIELD SIGN-OFF' : localStage.replace('_', ' ')}
          </span>
        </div>

        {/* Origin -> Destination Route Strip */}
        <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 border border-blue-500/30">
              <span className="text-[10px] font-bold">A</span>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">
                Origin Depot
              </span>
              <span className="text-xs font-bold text-white block">
                {activeMission?.originWarehouseName || 'Silchar Strategic Depot / Dimapur Railhead'}
              </span>
            </div>
          </div>

          <div className="w-0.5 h-3 bg-slate-700 ml-2.5" />

          <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/30">
              <span className="text-[10px] font-bold">B</span>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">
                Target Destination
              </span>
              <span className="text-xs font-bold text-emerald-300 block">
                {activeMission?.destinationName || 'Kohima South Ridge Relief Depot'}
              </span>
            </div>
          </div>
        </div>

        {/* Driver & Vehicle Metadata */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block flex items-center gap-1">
              <User className="w-3 h-3 text-blue-400" /> Driver
            </span>
            <span className="font-bold text-white text-xs mt-0.5 block">
              {activeVehicle?.driver_name || 'Temsu Ao'}
            </span>
            <span className="text-[10px] text-slate-400">Lead Operator</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block flex items-center gap-1">
              <Truck className="w-3 h-3 text-emerald-400" /> Vehicle
            </span>
            <span className="font-bold text-white text-xs mt-0.5 block">
              {activeVehicle?.vehicle_id || 'Ration-Convoy-07'}
            </span>
            <span className="text-[10px] text-slate-400">4x4 Heavy Tactical</span>
          </div>
        </div>
      </div>

      {/* ─── MISSION PROGRESSION STEPPER ─── */}
      <div className="p-4 rounded-3xl bg-[#111A29] border border-slate-700/80 shadow-2xl space-y-3">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
          Mission Progression
        </span>

        {/* Visual Stepper */}
        <div className="space-y-3 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
          {steps.map((s, idx) => {
            const isDone = currentStageIndex > idx;
            const isCurrent = currentStageIndex === idx;

            return (
              <div key={s.stage} className="flex items-center gap-3 relative z-10">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                    isDone
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                      : isCurrent
                      ? 'bg-blue-600 text-white border-blue-400 ring-4 ring-blue-500/20'
                      : 'bg-slate-900 text-slate-600 border-slate-800'
                  }`}
                >
                  {isDone ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isCurrent ? 'text-blue-400' : isDone ? 'text-white' : 'text-slate-500'}`}>
                      {s.label}
                    </span>
                    {isCurrent && (
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300">
                        Active
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 block leading-tight">{s.sub}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Progression Action Buttons */}
        <div className="pt-2 border-t border-slate-800/80">
          {localStage === 'ASSIGNED' && (
            <button
              onClick={handleConfirmCargo}
              className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-950/60 transition-all cursor-pointer"
            >
              <Package className="w-4 h-4" />
              <span>Confirm Cargo Loaded & Proceed</span>
            </button>
          )}

          {(localStage === 'CARGO_LOADED' || localStage === 'EN_ROUTE') && (
            <div className="space-y-2">
              <button
                onClick={handleConfirmArrival}
                className="w-full py-3 px-4 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-950/60 transition-all cursor-pointer"
              >
                <MapPin className="w-4 h-4" />
                <span>Confirm Arrival at Destination</span>
              </button>
              <button
                onClick={onNavigateToMap}
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Check Navigation Map</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {localStage === 'ARRIVED' && !isCloseoutPending && (
            <button
              onClick={handleOpenDeliveryConfirm}
              className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm Delivery (Verify Quantities)</span>
            </button>
          )}

          {isCloseoutPending && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-1.5">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 shrink-0 animate-spin" />
                <span className="text-xs font-bold text-white">Delivery Completed — Verification Sent</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">
                Verification request transmitted to Field Officer (Inspector L. Hmar) for formal receipt signature.
              </p>
            </div>
          )}

          {isDelivered && !isCloseoutPending && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-white block">Mission Successfully Completed</span>
                <span className="text-[10px] text-slate-300">Relief delivered and confirmed by Field Officer.</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── CARGO MANIFEST BREAKDOWN ─── */}
      <div className="p-4 rounded-3xl bg-[#111A29] border border-slate-700/80 shadow-2xl space-y-2.5">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
          Consignment Details
        </span>

        <div className="space-y-2">
          {/* Food Kits */}
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                🍚
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Food Kits</span>
                <span className="text-[10px] text-slate-400">High-calorie ration packs</span>
              </div>
            </div>
            <span className="text-sm font-extrabold text-amber-400 font-mono">300 Kits</span>
          </div>

          {/* Water */}
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                💧
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Potable Water</span>
                <span className="text-[10px] text-slate-400">Clean pressurized water bladders</span>
              </div>
            </div>
            <span className="text-sm font-extrabold text-blue-400 font-mono">1,200 L</span>
          </div>

          {/* Medical Kits */}
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                🩺
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Medical Kits</span>
                <span className="text-[10px] text-slate-400">Trauma bandages & antivenom</span>
              </div>
            </div>
            <span className="text-sm font-extrabold text-emerald-400 font-mono">45 Units</span>
          </div>
        </div>
      </div>

      {/* ─── CONFIRM DELIVERY QUANTITY MODAL ─── */}
      {isConfirmDeliveryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111A29] border border-slate-700 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-[#0F172A]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <FileCheck className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Confirm Delivered Quantities</h3>
              </div>
              <button
                onClick={() => setIsConfirmDeliveryModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3.5 text-xs">
              <p className="text-[11px] text-slate-300 leading-snug">
                Verify handed-over consignment at {activeMission?.destinationName || 'destination depot'}.
              </p>

              {/* Food Kits Item */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Food Kits</span>
                  <span className="text-[10px] text-slate-400">Manifested: 300</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDeliveredFoodKits(prev => Math.max(0, prev - 10))}
                    className="w-7 h-7 rounded bg-slate-800 text-slate-300 font-bold"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-bold text-amber-400 font-mono text-sm">
                    {deliveredFoodKits}
                  </span>
                  <button
                    onClick={() => setDeliveredFoodKits(prev => prev + 10)}
                    className="w-7 h-7 rounded bg-slate-800 text-slate-300 font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Water Item */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Potable Water (L)</span>
                  <span className="text-[10px] text-slate-400">Manifested: 1,200</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDeliveredWaterLiters(prev => Math.max(0, prev - 50))}
                    className="w-7 h-7 rounded bg-slate-800 text-slate-300 font-bold"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-bold text-blue-400 font-mono text-sm">
                    {deliveredWaterLiters}
                  </span>
                  <button
                    onClick={() => setDeliveredWaterLiters(prev => prev + 50)}
                    className="w-7 h-7 rounded bg-slate-800 text-slate-300 font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Medical Kits Item */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Medical Kits</span>
                  <span className="text-[10px] text-slate-400">Manifested: 45</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDeliveredMedicalKits(prev => Math.max(0, prev - 1))}
                    className="w-7 h-7 rounded bg-slate-800 text-slate-300 font-bold"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-bold text-emerald-400 font-mono text-sm">
                    {deliveredMedicalKits}
                  </span>
                  <button
                    onClick={() => setDeliveredMedicalKits(prev => prev + 1)}
                    className="w-7 h-7 rounded bg-slate-800 text-slate-300 font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Optional Note */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Handover Remarks (Optional)
                </label>
                <textarea
                  value={deliveryNote}
                  onChange={e => setDeliveryNote(e.target.value)}
                  placeholder="e.g. Unloaded at depot ramp, signed by sector warehouse keeper..."
                  rows={2}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Handshake confirmation alert */}
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-[11px] text-blue-300">
                Notice: Submitting will notify the Field Officer (Inspector L. Hmar) for ground truth verification and inventory replenishment.
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmDeliveryModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer text-xs"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmitDeliveryConfirmation}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/50 cursor-pointer text-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Transmit Handover</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
