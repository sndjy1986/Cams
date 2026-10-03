import React, { useState } from 'react';
import { Camera } from '../types';
import { ALL_CAMERAS } from '../constants';
import { CameraPlayer } from './CameraPlayer';
import { RefreshCw, Activity } from 'lucide-react';

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
    <div className="flex flex-col h-screen w-screen bg-slate-950 relative text-slate-100 font-sans overflow-hidden">
      {/* Top Navigation / Controls */}
      <header className="h-16 flex items-center justify-between px-8 z-50 bg-slate-900/80 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_12px_#10b981] animate-pulse"></div>
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-wider uppercase leading-none text-white">
              SCDOT <span className="text-indigo-400">TRAFFIC MONITOR</span>
            </h1>
            <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-slate-400">I-85 Live Cameras</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Global AI Toggle */}
          <div className="flex flex-col gap-1 items-center">
            <span className="text-[9px] uppercase tracking-[0.2em] font-black text-slate-400">AI Analysis</span>
            <button 
              onClick={() => setGlobalAiEnabled(!globalAiEnabled)}
              className={`px-4 py-1 border transition-all rounded-full font-black text-[10px] tracking-widest ${globalAiEnabled ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'}`}
            >
              {globalAiEnabled ? 'ACTIVE' : 'STANDBY'}
            </button>
          </div>

          {/* Sync Display */}
          <div className="flex flex-col gap-1 items-center">
            <span className="text-[9px] uppercase tracking-[0.2em] font-black text-slate-400">Refresh Rate</span>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 text-emerald-400 text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1.5 tracking-wider">
              <RefreshCw size={11} className="animate-spin" />
              15:00
            </div>
          </div>
          
          {/* Grid Scale */}
          <div className="flex flex-col gap-1 items-center">
            <span className="text-[9px] uppercase tracking-[0.2em] font-black text-slate-400">Layout</span>
            <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1 rounded-full border border-white/10">
              <button 
                onClick={() => setGridSize(4)}
                className={`transition-all font-black text-[10px] tracking-wider px-2 py-0.5 rounded ${gridSize === 4 ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                2x2 (4)
              </button>
              <button 
                onClick={() => setGridSize(6)}
                className={`transition-all font-black text-[10px] tracking-wider px-2 py-0.5 rounded ${gridSize === 6 ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                3x2 (6)
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Grid Container */}
      <main className={`flex-1 grid gap-3 p-3 z-10 overflow-hidden ${gridSize === 4 ? 'grid-cols-2 grid-rows-2' : 'grid-cols-3 grid-rows-2'}`}>
        {activeCameras.slice(0, gridSize).map((camera, idx) => (
          <div key={`${idx}-${camera.id}`} className="relative glass-panel overflow-hidden border border-white/10 hover:border-indigo-500/40 transition-all duration-300">
            <CameraPlayer 
              camera={camera}
              availableCameras={ALL_CAMERAS}
              onSwitchCamera={(newCam) => handleSwitchCamera(idx, newCam)}
              globalAiEnabled={globalAiEnabled}
              refreshInterval={REFRESH_RATE}
            />
          </div>
        ))}
      </main>

      {/* Footer Bar */}
      <footer className="h-9 bg-slate-950/80 backdrop-blur-xl border-t border-white/10 px-6 flex items-center justify-between z-30 text-[10px] text-slate-400">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-slate-300">Tip: <span className="text-indigo-400 font-bold">Right-click</span> or click <span className="text-indigo-400 font-bold">⋮</span> on any feed to switch cameras</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-mono text-emerald-400">
            <Activity size={12} className="animate-pulse" /> {activeCameras.length} Live Cameras Online
          </span>
        </div>
      </footer>
    </div>
  );
};

