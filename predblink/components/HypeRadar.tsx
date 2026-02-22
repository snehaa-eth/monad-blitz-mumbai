
import React from 'react';
import { Radar } from 'lucide-react';

export const HypeRadar: React.FC = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden border-b-4 lg:border-b-0 lg:border-r-4 border-white/10">
      <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(0,255,0,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.2)_1px,transparent_1px)] bg-[size:30px_30px]"></div>
      
      <div className="relative w-48 h-48 md:w-64 md:h-64 border-2 border-banger-green/30 rounded-full flex items-center justify-center">
        <div className="w-3/4 h-3/4 border border-banger-green/20 rounded-full"></div>
        <div className="absolute inset-0 rounded-full border-t-2 border-banger-yellow animate-[spin_4s_linear_infinite] opacity-50 shadow-[0_-10px_20px_rgba(204,255,0,0.3)]"></div>

        <div className="absolute top-10 right-10 w-2 h-2 bg-banger-yellow rounded-full animate-ping"></div>
        <div className="absolute bottom-12 left-8 w-2 h-2 bg-banger-pink rounded-full animate-pulse delay-700"></div>
        
        <div className="absolute z-10 bg-black border-2 border-banger-yellow p-2 flex flex-col items-center shadow-[4px_4px_0px_0px_rgba(204,255,0,1)]">
            <Radar className="text-banger-yellow animate-pulse" size={20} />
            <div className="font-mono text-[8px] text-banger-yellow font-bold">SCANNING ALPHA</div>
        </div>
      </div>
    </div>
  );
};
