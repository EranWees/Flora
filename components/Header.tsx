import React from 'react';

interface HeaderProps {
  hasApiKey: boolean;
}

const Header: React.FC<HeaderProps> = ({ hasApiKey }) => {
  return (
    <div className="absolute top-0 left-0 p-6 z-50 pointer-events-none w-full flex justify-between items-start">
      <div>
        <h1 className="text-2xl font-bold tracking-tighter text-zinc-100 mb-1 drop-shadow-lg">FLORA</h1>
        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase backdrop-blur-sm bg-black/20 p-1 rounded-md inline-flex">
          <span className={`w-2 h-2 rounded-full animate-pulse ${hasApiKey ? 'bg-lime-500' : 'bg-amber-500'}`} />
          <span>{hasApiKey ? 'System Active' : 'Simulation Mode'}</span>
        </div>
      </div>
    </div>
  );
};

export default Header;