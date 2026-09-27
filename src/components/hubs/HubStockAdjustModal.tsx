import React, { useState, useEffect } from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import type { HubInventory } from '../../types';
import { X, ArrowUpRight, ArrowDownRight, AlertCircle, CheckCircle2, PackageCheck } from 'lucide-react';

interface HubStockAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  hubId: string;
  item: HubInventory | null;
}

export const HubStockAdjustModal: React.FC<HubStockAdjustModalProps> = ({
  isOpen,
  onClose,
  hubId,
  item,
}) => {
  const { adjustHubInventory } = usePravahStore();
  const [operation, setOperation] = useState<'ADD' | 'DEDUCT'>('ADD');
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setOperation('ADD');
      setAmount('');
      setReason('');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const currentAvailable = Math.max(0, item.quantity - item.reservedQuantity);
  const parsedAmount = Math.max(0, parseFloat(amount) || 0);

  const projectedTotal =
    operation === 'ADD' ? item.quantity + parsedAmount : item.quantity - parsedAmount;
  const projectedAvailable =
    operation === 'ADD' ? currentAvailable + parsedAmount : currentAvailable - parsedAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (parsedAmount <= 0) {
      setError('Please specify a positive quantity.');
      return;
    }

    if (operation === 'DEDUCT' && parsedAmount > currentAvailable) {
      setError(
        `Cannot deduct more than available unreserved stock (${currentAvailable} ${item.unit}).`
      );
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a reason or audit reference note.');
      return;
    }

    try {
      setIsSubmitting(true);
      const delta = operation === 'ADD' ? parsedAmount : -parsedAmount;
      const success = await adjustHubInventory(hubId, item.id, delta, reason.trim());

      if (success) {
        onClose();
      } else {
        setError('Adjustment failed. Please check ledger balance constraints.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to update stock ledger.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-surface border border-border rounded-lg shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface-subtle">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
              <PackageCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-wide">
                Adjust Stock — {item.commodityName}
              </h2>
              <p className="text-[11px] text-text-secondary">
                Category: <span className="font-semibold text-text-primary">{item.category}</span> • Unit: {item.unit}
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

        {/* Current Balances Grid */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-2.5 p-3 rounded-md bg-surface-subtle/80 border border-border">
            <div>
              <span className="text-[10px] text-text-secondary uppercase tracking-wider block font-medium">
                Total Stock
              </span>
              <span className="text-sm font-bold text-text-primary font-mono">
                {item.quantity.toLocaleString()} {item.unit}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-text-secondary uppercase tracking-wider block font-medium">
                Reserved (Missions)
              </span>
              <span className="text-sm font-bold text-amber-400 font-mono">
                {item.reservedQuantity.toLocaleString()} {item.unit}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-text-secondary uppercase tracking-wider block font-medium">
                Available to Dispatch
              </span>
              <span className="text-sm font-bold text-emerald-400 font-mono">
                {currentAvailable.toLocaleString()} {item.unit}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Operation Selector */}
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1.5">
                Adjustment Action
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOperation('ADD')}
                  className={`py-2 px-3 rounded-md border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    operation === 'ADD'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/60 shadow-xs'
                      : 'bg-surface-subtle text-text-secondary border-border hover:text-text-primary'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  <span>Receive Shipment (+ Add)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOperation('DEDUCT')}
                  className={`py-2 px-3 rounded-md border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    operation === 'DEDUCT'
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/60 shadow-xs'
                      : 'bg-surface-subtle text-text-secondary border-border hover:text-text-primary'
                  }`}
                >
                  <ArrowDownRight className="w-4 h-4 text-rose-400" />
                  <span>Audit / Shrinkage (- Deduct)</span>
                </button>
              </div>
            </div>

            {/* Quantity Input */}
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                Quantity to {operation === 'ADD' ? 'Add' : 'Deduct'} ({item.unit})
              </label>
              <input
                type="number"
                step="any"
                min="0.1"
                placeholder={`e.g. 500`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-surface-subtle border border-border rounded-md px-3 py-2 text-sm text-text-primary font-mono placeholder:text-text-secondary focus:outline-none focus:border-primary"
                required
              />
            </div>

            {/* Audit / Reason Input */}
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                Reason / Consignment Reference
              </label>
              <input
                type="text"
                placeholder="e.g. Inward convoy delivery from Guwahati Central Logistics Depot"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-surface-subtle border border-border rounded-md px-3 py-2 text-xs text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary"
                required
              />
            </div>

            {/* Projected Impact Preview */}
            {parsedAmount > 0 && (
              <div className="p-3 rounded-md bg-page-bg border border-border/70 text-xs space-y-1">
                <div className="flex justify-between text-text-secondary">
                  <span>Projected Total Stock:</span>
                  <span className="font-mono font-bold text-text-primary">
                    {projectedTotal.toLocaleString()} {item.unit}
                  </span>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>Projected Available:</span>
                  <span
                    className={`font-mono font-bold ${
                      projectedAvailable < 0 ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {projectedAvailable.toLocaleString()} {item.unit}
                  </span>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="p-2.5 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Footer Buttons */}
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
                  <span>Recording Ledger...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm Ledger Entry</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
