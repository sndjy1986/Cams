import React, { useState } from 'react';
import { Camera } from '../types';
import { ALL_CAMERAS } from '../constants';
import { CameraPlayer } from './CameraPlayer';
import { LayoutGrid, Columns3, RefreshCw, Activity, ShieldAlert } from 'lucide-react';
import { Ambience } from './Ambience';

export const CameraGrid: React.FC = () => {
  const [gridSize, setGridSize] = useState<4 | 6>(4);
  const [activeCameras, setActiveCameras] = useState<Camera[]>(ALL_CAMERAS.slice(0, 6));
  const [globalAiEnabled, setGlobalAiEnabled] = useState(false);
  const [ambienceMode, setAmbienceMode] = useState<'slate-glow' | 'emergency'>('slate-glow');
  const REFRESH_RATE = 900000; // Hardcoded 15 min (900,000ms)

  const handleSwitchCamera = (index: number, newCam: Camera) => {
    setActiveCameras(prev => {
      const next = [...prev];
      next[index] = newCam;
      return next;
    });
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-900 relative text-slate-100 font-sans overflow-hidden">
      <Ambience mode={ambienceMode} />
      
      {/* Top Navigation / Controls */}
      <header className="h-20 flex items-center justify-between px-8 z-50 bg-[#0f172a]/40 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-5">
          <div className={`w-3 h-3 rounded-full animate-pulse shadow-[0_0_15px] ${ambienceMode === 'emergency' ? 'bg-red-500 shadow-red-500' : 'bg-indigo-500 shadow-indigo-500'}`}></div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black tracking-tighter uppercase leading-none text-white">
              SENTINEL <span className="text-indigo-500">V.4</span>
            </h1>
            <span className="text-[10px] uppercase tracking-[0.3em] font-black text-slate-500">Network Intelligence Grid</span>
          </div>
        </div>

        <div className="flex items-center gap-10">
          {/* Global AI Toggle */}
          <div className="flex flex-col gap-1.5 items-center">
            <span className="text-[9px] uppercase tracking-[0.2em] font-black text-slate-500">Analysis Engine</span>
            <button 
              onClick={() => setGlobalAiEnabled(!globalAiEnabled)}
              className={`px-5 py-1.5 border-2 transition-all rounded-full font-black text-[10px] tracking-widest ${globalAiEnabled ? 'bg-indigo-500/10 border-indigo-500 text-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)]' : 'bg-slate-800/40 border-slate-700 text-slate-500 grayscale'}`}
            >
              {globalAiEnabled ? 'ACTIVE' : 'STANDBY'}
            </button>
          </div>

          {/* Sync Display */}
          <div className="flex flex-col gap-1.5 items-center">
            <span className="text-[9px] uppercase tracking-[0.2em] font-black text-slate-500">Sync Interval</span>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 text-emerald-400 text-[10px] font-black px-4 py-1.5 rounded-full flex items-center gap-2 tracking-widest">
              <RefreshCw size={12} className="animate-spin" />
              15:00 FIXED
            </div>
          </div>

          {/* Ambience Toggle */}
          <div className="flex flex-col gap-1.5 items-center">
            <span className="text-[9px] uppercase tracking-[0.2em] font-black text-slate-500">Ambience</span>
            <div className="flex bg-black/30 p-0.5 rounded-full border border-white/5">
              <button 
                onClick={() => setAmbienceMode('slate-glow')}
                className={`p-2 rounded-full transition-all ${ambienceMode === 'slate-glow' ? 'bg-indigo-500 text-white' : 'text-slate-600 hover:text-slate-300'}`}
                title="Slate Glow"
              >
                <Activity size={12} />
              </button>
              <button 
                onClick={() => setAmbienceMode('emergency')}
                className={`p-2 rounded-full transition-all ${ambienceMode === 'emergency' ? 'bg-red-500 text-white' : 'text-slate-600 hover:text-slate-300'}`}
                title="Emergency Mode"
              >
                <ShieldAlert size={12} />
              </button>
            </div>
          </div>
          
          <div className="flex flex-col gap-1.5 items-center">
            <span className="text-[9px] uppercase tracking-[0.2em] font-black text-slate-500">Grid Scale</span>
            <div className="flex items-center gap-3 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
              <button 
                onClick={() => setGridSize(4)}
                className={`transition-all font-black text-[10px] tracking-widest ${gridSize === 4 ? 'text-indigo-400' : 'text-slate-600 hover:text-white'}`}
              >
                QUAD
              </button>
              <div className="w-[1px] h-3 bg-white/10" />
              <button 
                onClick={() => setGridSize(6)}
                className={`transition-all font-black text-[10px] tracking-widest ${gridSize === 6 ? 'text-indigo-400' : 'text-slate-600 hover:text-white'}`}
              >
                HEXA
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Grid Container */}
      <main className={`flex-1 grid gap-4 p-4 z-10 overflow-hidden ${gridSize === 4 ? 'grid-cols-2 grid-rows-2' : 'grid-cols-3 grid-rows-2'}`}>
        {activeCameras.slice(0, gridSize).map((camera, idx) => (
          <div key={`${idx}-${camera.id}`} className="relative glass-panel overflow-hidden border-2 border-white/5 hover:border-indigo-500/20 transition-all duration-500">
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
      <footer className="h-12 bg-slate-900/60 backdrop-blur-xl border-t border-white/5 px-8 flex items-center justify-between z-50">
        <div className="flex items-center gap-8">
          <div className="flex flex-col">
            <span className="text-[8px] uppercase tracking-[0.2em] font-black text-slate-500">Deployment Status</span>
            <span className="text-[10px] font-black text-indigo-400 tracking-widest">STABLE_GRID_024</span>
          </div>
          <div className="w-[1px] h-6 bg-white/5" />
          <div className="flex items-center gap-4 text-[10px] font-black tracking-widest text-slate-500">
            <span>OPS: {activeCameras.length} SENSORS</span>
            <Activity size={12} className="text-emerald-500 animate-pulse" />
          </div>
        </div>
        <div className="flex gap-6 items-center">
          <button className="text-[9px] uppercase tracking-[0.2em] font-black text-slate-500 hover:text-white transition-colors">Audit Logs</button>
          <button className="text-[9px] uppercase tracking-[0.2em] font-black text-slate-500 hover:text-white transition-colors underline underline-offset-4">Relay Config</button>
          <button 
            onClick={() => setAmbienceMode(ambienceMode === 'emergency' ? 'slate-glow' : 'emergency')}
            className={`px-4 py-1 rounded-full text-[9px] uppercase tracking-[0.2em] font-black transition-all ${ambienceMode === 'emergency' ? 'bg-red-500 text-white' : 'border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white'}`}
          >
            Terminal Override
          </button>
        </div>
      </footer>

      {/* Global Hud Detail Overlay */}
      <div className="scanlines" />
    </div>
  );
};

