import React, { useState, useEffect } from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import type { ResponseHub, HubStatus } from '../../types';
import { X, Building2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface HubEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  hub: ResponseHub | null;
}

export const HubEditModal: React.FC<HubEditModalProps> = ({ isOpen, onClose, hub }) => {
  const { updateHubDetails, updateHubStatus } = usePravahStore();

  const [status, setStatus] = useState<HubStatus>('OPERATIONAL');
  const [contactPerson, setContactPerson] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [operatingHours, setOperatingHours] = useState<string>('');
  const [totalCapacityKg, setTotalCapacityKg] = useState<string>('50000');
  const [totalStorageM3, setTotalStorageM3] = useState<string>('1200');
  const [fuelReserveLitres, setFuelReserveLitres] = useState<string>('15000');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && hub) {
      setStatus(hub.status);
      setContactPerson(hub.contactPerson || '');
      setContactPhone(hub.contactPhone || '');
      setContactEmail(hub.contactEmail || '');
      setOperatingHours(hub.operatingHours || '24/7 Priority Emergency Staging');
      setTotalCapacityKg(String(hub.totalCapacityKg || hub.storageCapacityKg || 50000));
      setTotalStorageM3(String(hub.totalStorageM3 || 1200));
      setFuelReserveLitres(String(hub.fuelReserveLitres || hub.fuelStorageCapacityLitres || 15000));
      setNotes(hub.notes || '');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, hub]);

  if (!isOpen || !hub) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setIsSubmitting(true);

      // 1. Update status
      if (status !== hub.status) {
        await updateHubStatus(hub.id, status);
      }

      // 2. Update details
      await updateHubDetails({
        id: hub.id,
        status,
        contactPerson: contactPerson.trim(),
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail.trim(),
        operatingHours: operatingHours.trim(),
        totalCapacityKg: parseFloat(totalCapacityKg) || hub.totalCapacityKg || hub.storageCapacityKg,
        storageCapacityKg: parseFloat(totalCapacityKg) || hub.totalCapacityKg || hub.storageCapacityKg,
        totalStorageM3: parseFloat(totalStorageM3) || hub.totalStorageM3 || 1200,
        fuelReserveLitres: parseFloat(fuelReserveLitres) || hub.fuelReserveLitres || hub.fuelStorageCapacityLitres,
        fuelStorageCapacityLitres: parseFloat(fuelReserveLitres) || hub.fuelReserveLitres || hub.fuelStorageCapacityLitres,
        notes: notes.trim(),
      });

      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update hub parameters.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-surface border border-border rounded-lg shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface-subtle shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-wide">
                Configure Logistics Hub — {hub.name}
              </h2>
              <p className="text-[11px] text-text-secondary">
                Code: <span className="font-mono font-bold text-text-primary">{hub.code}</span> • {hub.state}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary p-1 rounded hover:bg-surface transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Status Selection */}
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1.5">
              Hub Operational Readiness Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  id: 'OPERATIONAL',
                  label: 'OPERATIONAL',
                  desc: 'All bays active & dispatch ready',
                  color: 'border-emerald-500/60 bg-emerald-500/10 text-emerald-400',
                },
                {
                  id: 'LIMITED',
                  label: 'LIMITED',
                  desc: 'Partial power / road access issues',
                  color: 'border-amber-500/60 bg-amber-500/10 text-amber-400',
                },
                {
                  id: 'CLOSED',
                  label: 'CLOSED',
                  desc: 'Inaccessible / emergency lockdown',
                  color: 'border-red-500/60 bg-red-500/10 text-red-400',
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setStatus(opt.id as HubStatus)}
                  className={`p-2.5 rounded-md border text-left transition-all cursor-pointer ${
                    status === opt.id
                      ? `${opt.color} shadow-xs font-semibold`
                      : 'bg-surface-subtle text-text-secondary border-border hover:text-text-primary'
                  }`}
                >
                  <div className="text-xs font-bold">{opt.label}</div>
                  <div className="text-[10px] opacity-75 mt-0.5 leading-tight">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                Logistics Base Officer
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Major R. K. Baruah"
                className="w-full bg-surface-subtle border border-border rounded-md px-3 py-2 text-xs text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                Emergency Dispatch Phone
              </label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91-361-2234001"
                className="w-full bg-surface-subtle border border-border rounded-md px-3 py-2 text-xs text-text-primary font-mono placeholder:text-text-secondary focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                Base Official Email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="hub-ops@pravah.gov.in"
                className="w-full bg-surface-subtle border border-border rounded-md px-3 py-2 text-xs text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                Operating Window
              </label>
              <input
                type="text"
                value={operatingHours}
                onChange={(e) => setOperatingHours(e.target.value)}
                placeholder="24/7 Priority Emergency Staging"
                className="w-full bg-surface-subtle border border-border rounded-md px-3 py-2 text-xs text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Capacities */}
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                Capacity (kg)
              </label>
              <input
                type="number"
                value={totalCapacityKg}
                onChange={(e) => setTotalCapacityKg(e.target.value)}
                className="w-full bg-surface-subtle border border-border rounded-md px-3 py-2 text-xs text-text-primary font-mono focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                Storage (m³)
              </label>
              <input
                type="number"
                value={totalStorageM3}
                onChange={(e) => setTotalStorageM3(e.target.value)}
                className="w-full bg-surface-subtle border border-border rounded-md px-3 py-2 text-xs text-text-primary font-mono focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                Fuel Reserve (L)
              </label>
              <input
                type="number"
                value={fuelReserveLitres}
                onChange={(e) => setFuelReserveLitres(e.target.value)}
                className="w-full bg-surface-subtle border border-border rounded-md px-3 py-2 text-xs text-text-primary font-mono focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">
              Operational Briefing & Chokepoint Advisory
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Primary corridor via NH-6 under bridge inspection; alternate staging lane active."
              className="w-full bg-surface-subtle border border-border rounded-md px-3 py-2 text-xs text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-2.5 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 rounded-md text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-subtle transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-md bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Saving Hub Data...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Update Hub Settings</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
