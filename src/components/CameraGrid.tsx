import React, { useState } from 'react';
import { Camera } from '../types';
import { ALL_CAMERAS } from '../constants';
import { CameraPlayer } from './CameraPlayer';
import { LayoutGrid, Columns3, RefreshCw } from 'lucide-react';

export const CameraGrid: React.FC = () => {
  const [gridSize, setGridSize] = useState<4 | 6>(4);
  const [activeCameras, setActiveCameras] = useState<Camera[]>(ALL_CAMERAS.slice(0, 6));
  const [globalAiEnabled, setGlobalAiEnabled] = useState(false);
  const REFRESH_RATE = 900000; // Hardcoded 15 min (900,000ms)

  const handleSwitchCamera = (index: number, newCam: Camera) => {
    setActiveCameras(prev => {
      const next = [...prev];
      next[index] = newCam;
      return next;
    });
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0a0a0a] relative text-gray-200">
      {/* Top Navigation / Controls */}
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-[#0f0f0f] z-50">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
          <div className="flex flex-col">
            <h1 className="text-xl font-light tracking-widest uppercase leading-none">
              AI Intelligence <span className="font-bold text-white">Sentinel V.4</span>
            </h1>
            <span className="text-[9px] text-cyan-400 font-mono tracking-tighter uppercase opacity-60">Global Network Monitor</span>
          </div>
        </div>

        <div className="flex items-center gap-6 text-[11px] font-medium uppercase tracking-widest text-gray-500">
          {/* Global AI Toggle */}
          <div className="flex flex-col gap-1 items-center">
            <span className="text-[9px] opacity-60">Global AI</span>
            <button 
              onClick={() => setGlobalAiEnabled(!globalAiEnabled)}
              className={`px-3 py-1 border transition-all rounded font-bold ${globalAiEnabled ? 'bg-cyan-900/20 border-cyan-500 text-cyan-400' : 'bg-red-900/20 border-red-500 text-red-500'}`}
            >
              {globalAiEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Status Display */}
          <div className="flex flex-col gap-1 items-center">
            <span className="text-[9px] opacity-60">Sync Cycle</span>
            <div className="bg-black/40 border border-white/20 text-cyan-400 text-[10px] px-2 py-1 flex items-center gap-2">
              <RefreshCw size={10} className="animate-spin" />
              15M FIXED
            </div>
          </div>

          <div className="flex flex-col">
            <span>Nodes</span>
            <span className="text-white">0{gridSize} / 06</span>
          </div>
          
          <div className="flex flex-col gap-1 items-center">
            <span className="text-[9px] opacity-60">Grid</span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setGridSize(4)}
                className={`transition-colors font-bold ${gridSize === 4 ? 'text-cyan-400' : 'hover:text-white'}`}
              >
                4X
              </button>
              <button 
                onClick={() => setGridSize(6)}
                className={`transition-colors font-bold ${gridSize === 6 ? 'text-cyan-400' : 'hover:text-white'}`}
              >
                6X
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Grid Container */}
      <main className={`flex-1 grid gap-1 p-1 bg-black overflow-hidden ${gridSize === 4 ? 'grid-cols-2 grid-rows-2' : 'grid-cols-3 grid-rows-2'}`}>
        {activeCameras.slice(0, gridSize).map((camera, idx) => (
          <CameraPlayer 
            key={`${idx}-${camera.id}`}
            camera={camera}
            availableCameras={ALL_CAMERAS}
            onSwitchCamera={(newCam) => handleSwitchCamera(idx, newCam)}
            globalAiEnabled={globalAiEnabled}
            refreshInterval={REFRESH_RATE}
          />
        ))}
      </main>


      {/* Footer Bar */}
      <footer className="h-10 bg-[#0f0f0f] border-t border-white/10 px-6 flex items-center justify-between text-[10px] uppercase tracking-tighter text-gray-500">
        <div className="flex gap-4">
          <span>Session: 00:42:12</span>
          <span className="text-gray-700">|</span>
          <span>User: Operator_{activeCameras.length}</span>
          <span className="text-gray-700">|</span>
          <span className="text-cyan-400">System Stable</span>
        </div>
        <div className="flex gap-4">
          <button className="hover:text-white transition-colors">Toggle AI Masks</button>
          <button className="hover:text-white transition-colors">Export Logs</button>
          <button className="text-red-500 hover:text-red-400 transition-colors">Emergency Override</button>
        </div>
      </footer>

      {/* Global Hud Detail Overlay (Scanlines etc) */}
      <div className="scanlines" />
    </div>
  );
};

