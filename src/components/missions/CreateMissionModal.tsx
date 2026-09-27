import React, { useState } from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import {
  X,
  Truck,
  Plus,
  Trash2,
  Send,
  Warehouse,
  Users,
  AlertTriangle,
  Clock,
  FileText,
} from 'lucide-react';

export interface CreateMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateMissionModal: React.FC<CreateMissionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    hubs,
    communities,
    vehicles,
    createManualMission,
  } = usePravahStore();

  const [missionName, setMissionName] = useState('');
  const [originHubId, setOriginHubId] = useState(hubs[0]?.id || 'HUB-GUW-CENTRAL');
  const [destinationCommunityId, setDestinationCommunityId] = useState(
    communities[0]?.id || 'COMMUNITY_KOLASIB'
  );
  const [urgency, setUrgency] = useState<'P1_CRITICAL' | 'P2_ELEVATED'>('P1_CRITICAL');
  const [assignedVehicleId, setAssignedVehicleId] = useState(vehicles[0]?.vehicle_id || 'Medic-01');
  const [assignedDriver, setAssignedDriver] = useState('Rajesh Mech');
  const [deadline, setDeadline] = useState('4 hours');
  const [notes, setNotes] = useState('Urgent manual emergency dispatch authorization by HQ.');

  const [cargoItems, setCargoItems] = useState<
    { item: string; quantity: number; unit: string }[]
  >([
    { item: 'Medical Kits', quantity: 20, unit: 'trauma kits' },
    { item: 'Food Kits', quantity: 100, unit: 'kits' },
    { item: 'Water Units', quantity: 50, unit: 'cans (20L)' },
  ]);

  if (!isOpen) return null;

  const handleAddCargo = () => {
    setCargoItems((prev) => [
      ...prev,
      { item: 'Tarpaulins / Shelter', quantity: 25, unit: 'sets' },
    ]);
  };

  const handleRemoveCargo = (index: number) => {
    setCargoItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateCargo = (
    index: number,
    field: 'item' | 'quantity' | 'unit',
    val: any
  ) => {
    setCargoItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const destComm = communities.find((c) => c.id === destinationCommunityId);
    const origHub = hubs.find((h) => h.id === originHubId);

    const name =
      missionName.trim() ||
      `Manual Convoy: ${origHub?.name.split(' ')[0] || 'Hub'} → ${destComm?.name || 'Community'}`;

    createManualMission({
      missionName: name,
      originWarehouseId: originHubId,
      destinationCommunityId,
      cargoAllocations: cargoItems,
      urgency,
      assignedVehicleId,
      assignedDriver,
      notes,
      deadline,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-surface border border-border rounded-lg max-w-lg w-full p-4 sm:p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-auto text-xs text-text-primary space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-sm sm:text-base font-bold text-text-primary">
                Create Relief Mission (Manual Dispatch)
              </h2>
              <span className="text-[10px] text-text-tertiary">
                Creates an authoritative operational mission with source: MANUAL
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-surface-subtle transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block font-medium text-text-secondary mb-1">Mission Identifier / Name</label>
            <input
              type="text"
              value={missionName}
              onChange={(e) => setMissionName(e.target.value)}
              placeholder="e.g. Sortie-Kolasib Emergency Resupply"
              className="w-full bg-surface border border-border rounded p-2 text-xs text-text-primary focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-medium text-text-secondary mb-1">Origin Logistic Hub</label>
              <select
                value={originHubId}
                onChange={(e) => setOriginHubId(e.target.value)}
                className="w-full bg-surface border border-border rounded p-2 text-xs text-text-primary focus:border-primary"
              >
                {hubs.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.state})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-text-secondary mb-1">Destination Community</label>
              <select
                value={destinationCommunityId}
                onChange={(e) => setDestinationCommunityId(e.target.value)}
                className="w-full bg-surface border border-border rounded p-2 text-xs text-text-primary focus:border-primary"
              >
                {communities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.state}) — {c.metrics.priorityTier}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-medium text-text-secondary mb-1">Vehicle Unit</label>
              <select
                value={assignedVehicleId}
                onChange={(e) => setAssignedVehicleId(e.target.value)}
                className="w-full bg-surface border border-border rounded p-2 text-xs font-mono text-text-primary focus:border-primary"
              >
                {vehicles.map((v) => (
                  <option key={v.vehicle_id} value={v.vehicle_id}>
                    {v.vehicle_id} ({v.type || '4x4 Convoy'})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-text-secondary mb-1">Assigned Driver</label>
              <input
                type="text"
                value={assignedDriver}
                onChange={(e) => setAssignedDriver(e.target.value)}
                placeholder="Driver Name"
                className="w-full bg-surface border border-border rounded p-2 text-xs text-text-primary focus:border-primary"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-medium text-text-secondary mb-1">Urgency Priority</label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as any)}
                className="w-full bg-surface border border-border rounded p-2 text-xs font-semibold text-text-primary focus:border-primary"
              >
                <option value="P1_CRITICAL">P1 CRITICAL (Immediate)</option>
                <option value="P2_ELEVATED">P2 ELEVATED (Scheduled)</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-text-secondary mb-1">Target Window / Deadline</label>
              <input
                type="text"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                placeholder="e.g. 4 hours"
                className="w-full bg-surface border border-border rounded p-2 text-xs text-text-primary focus:border-primary"
              />
            </div>
          </div>

          {/* Cargo Allocations */}
          <div className="border border-border rounded-md p-3 bg-surface-subtle space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-text-secondary">
                Cargo Manifest Allocations ({cargoItems.length})
              </label>
              <button
                type="button"
                onClick={handleAddCargo}
                className="px-2 py-0.5 rounded bg-surface border border-border text-primary font-semibold text-[10px] flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {cargoItems.map((c, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={c.item}
                    onChange={(e) => handleUpdateCargo(idx, 'item', e.target.value)}
                    placeholder="Item name"
                    className="flex-1 bg-surface border border-border rounded p-1.5 text-xs text-text-primary"
                  />
                  <input
                    type="number"
                    min="1"
                    value={c.quantity}
                    onChange={(e) =>
                      handleUpdateCargo(idx, 'quantity', parseInt(e.target.value) || 1)
                    }
                    className="w-16 bg-surface border border-border rounded p-1.5 text-xs font-mono font-bold text-text-primary"
                  />
                  <input
                    type="text"
                    value={c.unit}
                    onChange={(e) => handleUpdateCargo(idx, 'unit', e.target.value)}
                    placeholder="Unit"
                    className="w-20 bg-surface border border-border rounded p-1.5 text-xs text-text-primary"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveCargo(idx)}
                    className="p-1 text-red-500 hover:text-red-700 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-medium text-text-secondary mb-1">Operational Dispatch Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Convoy handling instructions, hazardous pass warnings, or special escort notes..."
              className="w-full bg-surface border border-border rounded p-2 text-xs text-text-primary focus:border-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded border border-border bg-surface hover:bg-surface-subtle text-text-secondary font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-primary hover:bg-primary/90 text-white font-bold flex items-center gap-1.5 btn-press cursor-pointer shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>CREATE MISSION</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
