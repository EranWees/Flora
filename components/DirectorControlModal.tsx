import React, { useState, useMemo } from 'react';
import { Camera, User, Zap, X, Clapperboard, Check } from 'lucide-react';

interface DirectorControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prompt: string, summary: string) => void;
}

type Tab = 'camera' | 'character' | 'lighting';

const OPTIONS = {
  camera: [
    {
      category: "Shot Size",
      items: ["Macro Shot", "Extreme Close-Up", "Close-Up", "Medium Shot", "Cowboy Shot", "Full Body", "Wide Shot", "Extreme Wide Shot"]
    },
    {
      category: "Camera Angle",
      items: ["Eye Level", "Low Angle (Heroic)", "High Angle", "Bird's Eye View", "Worm's Eye View", "Dutch Angle", "Over-the-Shoulder"]
    },
    {
      category: "Lens & Optics",
      items: ["16mm Ultra-Wide", "35mm Cinematic", "50mm Standard", "85mm Portrait", "200mm Telephoto", "Macro Lens", "Micro Lens", "Fisheye", "Heavy Bokeh", "Deep Focus"]
    }
  ],
  character: [
    {
      category: "Pose",
      items: ["Standing Confident", "Walking Towards Camera", "Sitting Relaxed", "Dynamic Action", "Reclining", "Back to Camera", "Profile View", "Arms Crossed", "Hands in Pockets"]
    },
    {
      category: "Expression",
      items: ["Neutral / Serene", "Smiling / Joyful", "Intense / Fierce", "Melancholic", "Surprised", "Seductive / Alluring", "Bored / Aloof", "Focused"]
    },
    {
      category: "Gaze",
      items: ["Looking at Camera", "Looking Away", "Looking Up", "Looking Down", "Eyes Closed"]
    }
  ],
  lighting: [
    {
      category: "Atmosphere & Time",
      items: ["Golden Hour", "Blue Hour", "Noon Sun", "Overcast / Diffused", "Moonlight", "Pitch Black", "Foggy / Hazy"]
    },
    {
      category: "Artificial Setup",
      items: ["Studio Softbox", "Rembrandt Lighting", "Ring Light", "Neon Cyberpunk", "Harsh Flash", "Spotlight", "Candlelight", "Firelight"]
    },
    {
      category: "Style",
      items: ["High Key (Bright)", "Low Key (Dark)", "Silhouette", "Rim Light / Backlight", "Volumetric Rays", "Cinematic Teal & Orange"]
    }
  ]
};

const DirectorControlModal: React.FC<DirectorControlModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [activeTab, setActiveTab] = useState<Tab>('camera');
  const [selections, setSelections] = useState<Record<string, string>>({});

  const toggleSelection = (category: string, item: string) => {
    setSelections(prev => {
      const current = prev[category];
      if (current === item) {
        const next = { ...prev };
        delete next[category];
        return next;
      }
      return { ...prev, [category]: item };
    });
  };

  const generatedPrompt = useMemo(() => {
    const parts: string[] = [];
    
    // Camera
    const cameraParts = [];
    if (selections["Shot Size"]) cameraParts.push(selections["Shot Size"]);
    if (selections["Camera Angle"]) cameraParts.push(selections["Camera Angle"]);
    if (selections["Lens & Optics"]) cameraParts.push(selections["Lens & Optics"]);
    if (cameraParts.length) parts.push(`CAMERA: ${cameraParts.join(', ')}`);

    // Character
    const charParts = [];
    if (selections["Pose"]) charParts.push(selections["Pose"]);
    if (selections["Expression"]) charParts.push(selections["Expression"]);
    if (selections["Gaze"]) charParts.push(selections["Gaze"]);
    if (charParts.length) parts.push(`CHARACTER: ${charParts.join(', ')}`);

    // Lighting
    const lightParts = [];
    if (selections["Atmosphere & Time"]) lightParts.push(selections["Atmosphere & Time"]);
    if (selections["Artificial Setup"]) lightParts.push(selections["Artificial Setup"]);
    if (selections["Style"]) lightParts.push(selections["Style"]);
    if (lightParts.length) parts.push(`LIGHTING: ${lightParts.join(', ')}`);

    return parts.join('. ');
  }, [selections]);

  const handleSubmit = () => {
    if (!generatedPrompt) return;
    onSubmit(generatedPrompt, "Director Mode");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 flex-shrink-0">
            <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Clapperboard className="text-lime-400" />
                    DIRECTOR MODE
                </h2>
                <p className="text-xs text-zinc-500 mt-1">Configure specific scene parameters.</p>
            </div>
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white rounded-full hover:bg-zinc-800">
                <X size={24} />
            </button>
        </div>

        {/* Content Layout */}
        <div className="flex flex-1 overflow-hidden">
            
            {/* Sidebar Tabs */}
            <div className="w-48 border-r border-zinc-800 bg-black/20 flex flex-col overflow-y-auto">
                <button 
                    onClick={() => setActiveTab('camera')}
                    className={`p-4 text-left text-sm font-bold flex items-center gap-3 transition-colors ${activeTab === 'camera' ? 'bg-zinc-800 text-lime-400 border-l-2 border-lime-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}
                >
                    <Camera size={18} /> CAMERA
                </button>
                <button 
                    onClick={() => setActiveTab('character')}
                    className={`p-4 text-left text-sm font-bold flex items-center gap-3 transition-colors ${activeTab === 'character' ? 'bg-zinc-800 text-lime-400 border-l-2 border-lime-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}
                >
                    <User size={18} /> CHARACTER
                </button>
                <button 
                    onClick={() => setActiveTab('lighting')}
                    className={`p-4 text-left text-sm font-bold flex items-center gap-3 transition-colors ${activeTab === 'lighting' ? 'bg-zinc-800 text-lime-400 border-l-2 border-lime-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}
                >
                    <Zap size={18} /> LIGHTING
                </button>
            </div>

            {/* Options Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-zinc-900 overscroll-contain">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {OPTIONS[activeTab].map((section) => (
                        <div key={section.category}>
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">{section.category}</h3>
                            <div className="flex flex-col gap-2">
                                {section.items.map((item) => {
                                    const isSelected = selections[section.category] === item;
                                    return (
                                        <button
                                            key={item}
                                            onClick={() => toggleSelection(section.category, item)}
                                            className={`
                                                relative px-4 py-3 rounded-lg text-left text-sm transition-all border
                                                ${isSelected 
                                                    ? 'bg-lime-900/20 border-lime-500 text-lime-400 shadow-[0_0_15px_rgba(132,204,22,0.1)]' 
                                                    : 'bg-zinc-800/50 border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800'}
                                            `}
                                        >
                                            <span className="relative z-10">{item}</span>
                                            {isSelected && <Check size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-lime-500" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Footer Prompt Preview */}
        <div className="p-6 border-t border-zinc-800 bg-zinc-950 flex flex-col md:flex-row gap-4 items-center justify-between flex-shrink-0">
            <div className="flex-1 w-full">
                <div className="text-[10px] uppercase font-bold text-zinc-600 mb-1">Generated Directive</div>
                <div className="text-sm font-mono text-zinc-300 bg-zinc-900 p-3 rounded border border-zinc-800 min-h-[50px] flex items-center">
                    {generatedPrompt || <span className="text-zinc-600 italic">Select options to build your scene...</span>}
                </div>
            </div>
            <button
                disabled={!generatedPrompt}
                onClick={handleSubmit}
                className="px-8 py-4 bg-lime-500 hover:bg-lime-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-lg shadow-lg shadow-lime-900/20 transition-transform active:scale-95 flex items-center gap-2 whitespace-nowrap"
            >
                <Clapperboard size={20} />
                ACTION
            </button>
        </div>

      </div>
    </div>
  );
};

export default DirectorControlModal;