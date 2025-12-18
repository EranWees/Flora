import React, { useState } from 'react';
import { Sparkles, AlertCircle, Save } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  hasApiKey: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, hasApiKey, onClose, onSave }) => {
  const [inputKey, setInputKey] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    if(inputKey.trim()) {
      onSave(inputKey.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-600 hover:text-zinc-400"
        >
          ✕
        </button>
        <div className="flex flex-col items-center text-center gap-4">
          <div className={`p-4 rounded-full border ${hasApiKey ? 'bg-lime-900/20 border-lime-800' : 'bg-zinc-950 border-zinc-800'}`}>
            <Sparkles className={`w-8 h-8 ${hasApiKey ? 'text-lime-400' : 'text-zinc-500'}`} />
          </div>
          <h2 className="text-xl font-bold text-white">Gemini Intelligence</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            FLORA uses <strong>Gemini 2.5 Flash Image</strong>.
          </p>

          {!hasApiKey && (
            <div className="w-full mt-2 p-3 bg-amber-900/20 border border-amber-900/50 rounded flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="text-left">
                <p className="text-xs text-amber-200 font-bold">No API Key Detected</p>
                <p className="text-[10px] text-amber-300/80">
                  App is in simulation mode (placeholder images). Enter a key below to enable AI.
                </p>
              </div>
            </div>
          )}

          <div className="w-full mt-4 flex flex-col gap-2">
             <input 
                type="password" 
                placeholder="Paste API Key here..."
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-lime-500 transition-colors"
             />
             <button 
                onClick={handleSave}
                disabled={!inputKey}
                className="w-full bg-zinc-100 text-zinc-900 font-bold text-sm py-2 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
             >
                <Save size={14} /> Save Key
             </button>
          </div>
          
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-zinc-600 hover:text-zinc-400 underline">
             Get a free Gemini API Key
          </a>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;