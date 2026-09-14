import React from 'react';
import { X, ZoomIn } from 'lucide-react';

interface LightboxModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({ imageUrl, onClose }) => {
  if (!imageUrl) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md"
      onClick={onClose}
    >
      <div 
        className="relative max-w-4xl w-full max-h-[85vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          title="Close Lightbox"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="rounded-xl overflow-hidden border border-slate-700 shadow-2xl bg-slate-900 w-full flex items-center justify-center">
          <img
            src={imageUrl}
            alt="Blockage Inspection Preview"
            className="w-full max-h-[75vh] object-contain"
          />
        </div>

        <p className="mt-3 text-xs text-slate-400 flex items-center gap-1.5">
          <ZoomIn className="w-3.5 h-3.5 text-orange-400" />
          High-resolution incident blockage ground photographic evidence
        </p>
      </div>
    </div>
  );
};
