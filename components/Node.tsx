import React, { memo, useState } from 'react';
import { NodeData } from '../types.ts';
import { Plus, MoreHorizontal, Camera, Layers, Zap, Loader2, AlertTriangle, RefreshCw, Maximize2, User, Activity, MoveDown, Play, Shuffle, Shirt, Palette, Sprout, Scan, Clapperboard } from 'lucide-react';

interface NodeProps {
  data: NodeData;
  selected: boolean;
  onNodeDown: (e: React.MouseEvent | React.TouchEvent, id: string) => void;
  onBranch: (id: string, intent: string) => void;
  onRegenerate?: (id: string) => void;
  onView?: (id: string) => void;
  onPromoteToSeed?: (id: string) => void;
}

const Node: React.FC<NodeProps> = memo(({ data, selected, onNodeDown, onBranch, onRegenerate, onView, onPromoteToSeed }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    // Pass event to parent for drag handling
    onNodeDown(e, data.id);
  };

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(!menuOpen);
  };

  const handleMenuAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    setMenuOpen(false);
    action();
  };

  const isError = data.label === 'ERROR';

  return (
    <div
      className={`absolute flex flex-col w-64 rounded-xl border transition-colors duration-200 shadow-2xl group will-change-transform ${
        selected 
          ? isError ? 'border-red-500/50 shadow-red-900/20 z-50' : data.type === 'seed' ? 'border-lime-400/80 shadow-lime-900/30 z-50' : 'border-lime-400/50 shadow-lime-900/20 z-50'
          : data.type === 'seed' ? 'border-lime-800 bg-zinc-900/60 z-10' : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 z-10'
      }`}
      style={{
        transform: `translate(${data.position.x}px, ${data.position.y}px)`,
        backdropFilter: 'blur(12px)',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
    >
      {/* Header */}
      <div className={`flex items-center justify-between p-3 border-b rounded-t-xl cursor-grab active:cursor-grabbing ${isError ? 'bg-red-900/20 border-red-900/50' : data.type === 'seed' ? 'bg-lime-900/10 border-lime-800/30' : 'bg-zinc-900/80 border-zinc-800/50'}`}>
        <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${data.loading ? 'bg-lime-500 animate-pulse' : isError ? 'bg-red-500' : data.type === 'seed' ? 'bg-lime-400' : 'bg-zinc-500'}`} />
            <span className={`text-xs font-mono uppercase tracking-wider truncate max-w-[120px] ${isError ? 'text-red-300' : data.type === 'seed' ? 'text-lime-400' : 'text-zinc-400'}`}>
                {data.label}
            </span>
        </div>
        
        <div className="relative">
            <button 
                onClick={toggleMenu}
                className={`p-1 rounded-md transition-colors ${menuOpen ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
            >
                <MoreHorizontal size={16} />
            </button>

            {menuOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                        {!isError && !data.loading && (
                            <>
                                <div className="px-3 py-2 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Pro Tools</div>
                                <button onClick={(e) => handleMenuAction(e, () => onBranch(data.id, 'camera-view'))} className="w-full text-left px-3 py-2 text-xs text-lime-400 hover:bg-zinc-800 flex items-center gap-2 border-b border-zinc-800 mb-1">
                                    <Scan size={14} className="text-lime-500" /> Camera Crop
                                </button>
                                
                                <div className="px-3 py-2 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Reference Actions</div>
                                <button onClick={(e) => handleMenuAction(e, () => onBranch(data.id, 'swap-clothing'))} className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 flex items-center gap-2">
                                    <Shirt size={14} className="text-zinc-500" /> Swap Clothing
                                </button>
                                <button onClick={(e) => handleMenuAction(e, () => onBranch(data.id, 'style-transfer'))} className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 flex items-center gap-2">
                                    <Palette size={14} className="text-zinc-500" /> Style Transfer
                                </button>

                                <div className="h-px bg-zinc-800 my-1" />
                                <div className="px-3 py-2 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Evolution</div>
                                <button onClick={(e) => handleMenuAction(e, () => onBranch(data.id, 'angle'))} className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 flex items-center gap-2">
                                    <Camera size={14} className="text-zinc-500" /> Angle
                                </button>
                                <button onClick={(e) => handleMenuAction(e, () => onBranch(data.id, 'fabric'))} className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 flex items-center gap-2">
                                    <Layers size={14} className="text-zinc-500" /> Material
                                </button>

                                <div className="h-px bg-zinc-800 my-1" />
                                <div className="px-3 py-2 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Poses</div>
                                
                                <button onClick={(e) => handleMenuAction(e, () => onBranch(data.id, 'random pose'))} className="w-full text-left px-3 py-2 text-xs text-lime-400 hover:bg-zinc-800 flex items-center gap-2">
                                    <Shuffle size={14} className="text-lime-500" /> Random
                                </button>
                                <button onClick={(e) => handleMenuAction(e, () => onBranch(data.id, 'sitting pose'))} className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 flex items-center gap-2">
                                    <User size={14} className="text-zinc-500" /> Sitting
                                </button>
                                <button onClick={(e) => handleMenuAction(e, () => onBranch(data.id, 'dynamic action pose'))} className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 flex items-center gap-2">
                                    <Play size={14} className="text-zinc-500" /> Action
                                </button>

                                <div className="h-px bg-zinc-800 my-1" />
                                <button onClick={(e) => handleMenuAction(e, () => onBranch(data.id, 'custom'))} className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 flex items-center gap-2">
                                    <Plus size={14} className="text-zinc-500" /> Custom
                                </button>
                                <div className="h-px bg-zinc-800 my-1" />
                            </>
                        )}
                        
                        {!data.loading && (
                            <>
                                {data.type !== 'seed' && onPromoteToSeed && (
                                    <button onClick={(e) => handleMenuAction(e, () => onPromoteToSeed(data.id))} className="w-full text-left px-3 py-2 text-xs text-lime-400 hover:bg-zinc-800 flex items-center gap-2 border-b border-zinc-800">
                                        <Sprout size={14} className="text-lime-500" /> Assign as Seed
                                    </button>
                                )}
                                <button onClick={(e) => handleMenuAction(e, () => onView && onView(data.id))} className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 flex items-center gap-2">
                                    <Maximize2 size={14} className="text-zinc-500" /> View Image
                                </button>
                            </>
                        )}
                        
                        {isError && (
                            <button onClick={(e) => handleMenuAction(e, () => onRegenerate && onRegenerate(data.id))} className="w-full text-left px-3 py-2 text-xs text-red-300 hover:bg-red-900/20 flex items-center gap-2">
                                <RefreshCw size={14} className="text-red-400" /> Retry Generation
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
      </div>

      {/* Image Container */}
      <div 
        className={`relative w-full bg-zinc-950 overflow-hidden group-hover:brightness-105 transition-all ${!data.loading && !isError ? 'cursor-zoom-in' : ''} ${data.loading || isError ? 'aspect-square' : ''}`}
        style={{ minHeight: '150px' }}
        onClick={(e) => {
             if(!data.loading && !isError && onView) {
                 e.stopPropagation();
                 onView(data.id);
             }
        }}
      >
        {data.loading ? (
           <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/50">
               <Loader2 className="w-8 h-8 text-lime-400 animate-spin" />
               <span className="absolute mt-12 text-xs text-lime-400/80 font-mono animate-pulse">GROWING</span>
           </div>
        ) : isError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/80 text-zinc-500 p-6 text-center">
                <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
                <span className="text-[10px] uppercase tracking-wide">Generation Failed</span>
            </div>
        ) : (
            <img 
                src={data.imageUrl} 
                alt={data.label} 
                className="w-full h-auto object-cover select-none pointer-events-none block" 
            />
        )}
      </div>

      {/* Footer Meta */}
      <div className="p-3 bg-zinc-900/80 rounded-b-xl border-t border-zinc-800/50">
        <div className="text-[10px] text-zinc-500 font-mono leading-tight line-clamp-2">
            {data.prompt}
        </div>
      </div>
    </div>
  );
});

export default Node;