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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="relative max-w-4xl w-full max-h-[85vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 rounded-full bg-surface-subtle hover:bg-surface border border-border text-text-primary transition-colors cursor-pointer"
          title="Close Lightbox"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="rounded-md overflow-hidden border border-border shadow-2xl bg-surface w-full flex items-center justify-center">
          <img
            src={imageUrl}
            alt="Blockage Inspection Preview"
            className="w-full max-h-[75vh] object-contain"
          />
        </div>

        <p className="mt-3 text-xs text-text-secondary flex items-center gap-1.5">
          <ZoomIn className="w-3.5 h-3.5 text-primary" />
          High-resolution incident blockage ground photographic evidence
        </p>
      </div>
    </div>
  );
};
