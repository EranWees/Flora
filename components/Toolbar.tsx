import React from 'react';
import { Upload, Wand2, Download, Trash2, Command, Sparkles, Clapperboard } from 'lucide-react';
import { NodeData } from '../types.ts';

interface ToolbarProps {
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGenerateSeed: () => void;
  onDirectorMode: () => void;
  onExport: () => void;
  onDelete: () => void;
  onOpenKeyModal: () => void;
  selectedNode: NodeData | undefined;
  hasApiKey: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  fileInputRef,
  onFileUpload,
  onGenerateSeed,
  onDirectorMode,
  onExport,
  onDelete,
  onOpenKeyModal,
  selectedNode,
  hasApiKey
}) => {
  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex gap-2 p-2 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-full shadow-2xl max-w-[90vw] overflow-x-auto no-scrollbar">
      {/* Seed Upload */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="p-3 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors relative group shrink-0"
        title="Upload Seed"
      >
        <Upload size={20} />
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileUpload}
          className="hidden"
          accept="image/*"
        />
      </button>

      {/* Generate Seed Action */}
      {selectedNode?.type === 'seed' && (
        <button
          onClick={onGenerateSeed}
          className="p-3 rounded-full hover:bg-zinc-800 text-lime-400 hover:text-lime-300 transition-colors relative group shrink-0"
          title="Generate Seed from Text"
        >
          <Wand2 size={20} />
        </button>
      )}

      {/* Director Mode Action */}
      {selectedNode && !selectedNode.loading && selectedNode.label !== 'ERROR' && (
        <button
          onClick={onDirectorMode}
          className="p-3 rounded-full hover:bg-zinc-800 text-lime-400 hover:text-lime-300 transition-colors relative group shrink-0"
          title="Director Mode"
        >
          <Clapperboard size={20} />
        </button>
      )}

      <div className="w-px h-6 bg-zinc-800 my-auto mx-1 shrink-0" />

      {/* Context Actions (Delete / Export) */}
      {selectedNode ? (
        <>
          <button
            onClick={onExport}
            className="p-3 rounded-full hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors shrink-0"
            title="Download Image"
          >
            <Download size={20} />
          </button>
          <button
            onClick={onDelete}
            className="p-3 rounded-full hover:bg-red-900/30 text-zinc-400 hover:text-red-400 transition-colors shrink-0"
            title="Delete Node"
          >
            <Trash2 size={20} />
          </button>
        </>
      ) : (
        <button className="p-3 rounded-full hover:bg-zinc-800 text-zinc-500 cursor-not-allowed shrink-0" title="Select a node">
          <Command size={20} />
        </button>
      )}

      <div className="w-px h-6 bg-zinc-800 my-auto mx-1 shrink-0" />

      <button
        className={`p-3 rounded-full transition-colors shrink-0 ${!hasApiKey ? 'text-amber-400 hover:bg-amber-900/20' : 'text-zinc-500 hover:text-zinc-300'}`}
        title="API Status"
        onClick={onOpenKeyModal}
      >
        <Sparkles size={20} />
      </button>
    </div>
  );
};

export default Toolbar;