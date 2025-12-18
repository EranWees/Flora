import React, { useState } from 'react';
import { Camera, X, Play, Info, Sparkles } from 'lucide-react';

interface AngleToolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (count: number) => void;
}

const AngleToolModal: React.FC<AngleToolModalProps> = ({ isOpen, onClose, onGenerate }) => {
  const [count, setCount] = useState(3);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden shadow-lime-500/5">
        
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-lime-500/10 rounded-xl border border-lime-500/20">
              <Camera className="text-lime-400" size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight uppercase leading-tight">Angles Pro</h2>
              <p className="text-[10px] text-zinc-500 font-mono font-bold tracking-widest uppercase opacity-70">Cinematic System</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-zinc-500 hover:text-white rounded-full hover:bg-zinc-800 transition-all active:scale-90"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8">
          <div className="mb-8">
            <div className="flex justify-between items-end mb-4 px-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Variation Count
                </label>
                <span className="text-xs font-mono text-lime-400 font-bold bg-lime-500/10 px-2 py-0.5 rounded border border-lime-500/20">
                    {count} SHOTS
                </span>
            </div>
            <div className="flex justify-between items-center gap-3">
              {[2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  onClick={() => setCount(num)}
                  className={`flex-1 py-5 rounded-2xl border-2 font-mono text-2xl transition-all duration-300 transform active:scale-95 ${
                    count === num
                      ? 'bg-lime-500/10 border-lime-500 text-lime-400 shadow-[0_0_25px_rgba(132,204,22,0.15)]'
                      : 'bg-zinc-800/30 border-zinc-800/50 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 bg-zinc-950/40 rounded-2xl border border-zinc-800/50 flex gap-4 mb-8">
            <div className="shrink-0 w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
                <Sparkles size={14} className="text-lime-500/50" />
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Our AI engine will calculate <span className="text-zinc-200">diverse focal lengths</span> and <span className="text-zinc-200">dynamic perspectives</span> while maintaining subject consistency across the sequence.
            </p>
          </div>

          <button
            onClick={() => {
              onGenerate(count);
              onClose();
            }}
            className="w-full py-5 bg-lime-500 hover:bg-lime-400 text-black font-black uppercase tracking-tight rounded-2xl shadow-xl shadow-lime-900/20 transition-all active:scale-[0.97] flex items-center justify-center gap-3 group"
          >
            <Play size={20} fill="currentColor" className="group-hover:translate-x-0.5 transition-transform" />
            Launch Multi-Angle Flow
          </button>
        </div>
      </div>
    </div>
  );
};

export default AngleToolModal;