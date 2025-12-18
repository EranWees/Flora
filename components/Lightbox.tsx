import React from 'react';
import { X } from 'lucide-react';
import { NodeData } from '../types.ts';

interface LightboxProps {
  node: NodeData | null;
  onClose: () => void;
}

const Lightbox: React.FC<LightboxProps> = ({ node, onClose }) => {
  if (!node) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <button
        className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white bg-zinc-800/50 rounded-full"
        onClick={onClose}
      >
        <X size={24} />
      </button>
      <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <img
          src={node.imageUrl}
          alt={node.label}
          className="object-contain max-w-full max-h-[85vh] rounded shadow-2xl"
        />
        <div className="mt-4 text-center">
          <h2 className="text-xl font-bold text-white uppercase tracking-wider">{node.label}</h2>
          <p className="text-sm text-zinc-500 font-mono mt-1 max-w-2xl mx-auto">{node.prompt}</p>
        </div>
      </div>
    </div>
  );
};

export default Lightbox;