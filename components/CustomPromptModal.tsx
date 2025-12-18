import React from 'react';

interface CustomPromptModalProps {
  isOpen: boolean;
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

const CustomPromptModal: React.FC<CustomPromptModalProps> = ({ isOpen, value, onChange, onSubmit, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4">Define Evolution</h3>
        <textarea
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Describe how the visual should evolve (e.g., 'Change environment to neon city', 'Add red lighting')..."
          className="w-full h-32 bg-black/50 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:border-lime-500/50 resize-none mb-4"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white"
          >
            CANCEL
          </button>
          <button
            onClick={onSubmit}
            className="px-4 py-2 text-xs font-bold bg-lime-500 text-black rounded hover:bg-lime-400"
          >
            EVOLVE
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomPromptModal;