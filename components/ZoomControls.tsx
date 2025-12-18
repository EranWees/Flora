import React from 'react';
import { Plus, Minus, Scan } from 'lucide-react';

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

const ZoomControls: React.FC<ZoomControlsProps> = ({ onZoomIn, onZoomOut, onReset }) => {
  return (
    <div className="absolute bottom-24 right-6 flex flex-col gap-2 z-50">
      <button
        onClick={onZoomIn}
        className="p-3 bg-zinc-900/90 backdrop-blur border border-zinc-800 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 shadow-xl transition-all"
      >
        <Plus size={20} />
      </button>
      <button
        onClick={onReset}
        className="p-3 bg-zinc-900/90 backdrop-blur border border-zinc-800 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 shadow-xl transition-all"
        title="Reset View"
      >
        <Scan size={20} />
      </button>
      <button
        onClick={onZoomOut}
        className="p-3 bg-zinc-900/90 backdrop-blur border border-zinc-800 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 shadow-xl transition-all"
      >
        <Minus size={20} />
      </button>
    </div>
  );
};

export default ZoomControls;