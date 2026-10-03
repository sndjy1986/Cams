import React, { useState } from 'react';
import { Camera } from '../types';
import { ALL_CAMERAS } from '../constants';
import { CameraPlayer } from './CameraPlayer';
import { RefreshCw, Activity, Navigation, X } from 'lucide-react';

export const CameraGrid: React.FC = () => {
  const [gridSize, setGridSize] = useState<4 | 6>(4);
  const [activeCameras, setActiveCameras] = useState<Camera[]>(ALL_CAMERAS.slice(0, 6));
  const [globalAiEnabled, setGlobalAiEnabled] = useState(false);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const REFRESH_RATE = 900000; // Hardcoded 15 min (900,000ms)

  const handleOpenMenu = (slotIndex: number, x: number, y: number) => {
    setActiveSlot(slotIndex);
    setMenuPos({ x, y });
  };

  const handleSelectCamera = (newCam: Camera) => {
    if (activeSlot !== null) {
      setActiveCameras(prev => {
        const next = [...prev];
        next[activeSlot] = newCam;
        return next;
      });
    }
    setActiveSlot(null);
    setMenuPos(null);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 relative text-slate-100 font-sans overflow-hidden">
      {/* Top Navigation / Controls */}
      <header className="h-16 flex items-center justify-between px-6 z-30 bg-slate-900/90 backdrop-blur-md border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_12px_#10b981] animate-pulse"></div>
          <div className="flex flex-col">
            <h1 className="text-lg font-black tracking-wider uppercase leading-none text-white">
              SCDOT <span className="text-indigo-400">TRAFFIC MONITOR</span>
            </h1>
            <span className="text-[9px] uppercase tracking-[0.25em] font-bold text-slate-400 mt-0.5">I-85 Live Feeds</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Global AI Toggle */}
          <div className="flex flex-col gap-1 items-center">
            <span className="text-[9px] uppercase tracking-[0.2em] font-black text-slate-400">AI Analysis</span>
            <button 
              type="button"
              onClick={() => setGlobalAiEnabled(!globalAiEnabled)}
              className={`px-3.5 py-1 border transition-all rounded-full font-black text-[10px] tracking-widest ${globalAiEnabled ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'}`}
            >
              {globalAiEnabled ? 'ACTIVE' : 'STANDBY'}
            </button>
          </div>

          {/* Sync Display */}
          <div className="flex flex-col gap-1 items-center">
            <span className="text-[9px] uppercase tracking-[0.2em] font-black text-slate-400">Refresh Rate</span>
            <div className="bg-white/5 border border-white/10 text-emerald-400 text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1.5 tracking-wider">
              <RefreshCw size={11} className="animate-spin" />
              15:00
            </div>
          </div>
          
          {/* Grid Scale */}
          <div className="flex flex-col gap-1 items-center">
            <span className="text-[9px] uppercase tracking-[0.2em] font-black text-slate-400">Layout</span>
            <div className="flex items-center gap-1.5 bg-slate-800/80 p-0.5 rounded-full border border-white/10">
              <button 
                type="button"
                onClick={() => setGridSize(4)}
                className={`transition-all font-black text-[10px] tracking-wider px-2.5 py-1 rounded-full ${gridSize === 4 ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                2x2 (4)
              </button>
              <button 
                type="button"
                onClick={() => setGridSize(6)}
                className={`transition-all font-black text-[10px] tracking-wider px-2.5 py-1 rounded-full ${gridSize === 6 ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                3x2 (6)
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Grid Container */}
      <main className={`flex-1 grid gap-2.5 p-2.5 z-10 overflow-hidden ${gridSize === 4 ? 'grid-cols-2 grid-rows-2' : 'grid-cols-3 grid-rows-2'}`}>
        {activeCameras.slice(0, gridSize).map((camera, idx) => (
          <div 
            key={idx} 
            className="relative rounded-xl overflow-hidden border border-white/10 hover:border-indigo-500/50 bg-slate-900 transition-colors shadow-lg"
          >
            <CameraPlayer 
              camera={camera}
              onOpenSwitchMenu={(x, y) => handleOpenMenu(idx, x, y)}
              globalAiEnabled={globalAiEnabled}
              refreshInterval={REFRESH_RATE}
            />
          </div>
        ))}
      </main>

      {/* Footer Bar */}
      <footer className="h-8 bg-slate-950/90 border-t border-white/10 px-6 flex items-center justify-between z-30 text-[10px] text-slate-400 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-slate-300">Tip: <span className="text-indigo-400 font-bold">Right-click</span> or click <span className="text-indigo-400 font-bold">⋮</span> on any camera to switch feeds</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-mono text-emerald-400">
            <Activity size={12} className="animate-pulse" /> {activeCameras.length} Live Cameras
          </span>
        </div>
      </footer>

      {/* Root-Level Camera Switcher Modal / Context Menu */}
      {activeSlot !== null && (
        <div 
          className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-0 sm:block cursor-default select-none"
          onClick={() => {
            setActiveSlot(null);
            setMenuPos(null);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setActiveSlot(null);
            setMenuPos(null);
          }}
        >
          <div 
            className="sm:fixed bg-slate-900 border border-slate-700/80 shadow-[0_25px_60px_rgba(0,0,0,0.95)] w-[320px] max-w-[92vw] overflow-hidden rounded-2xl"
            style={{ 
              top: menuPos && typeof window !== 'undefined' && window.innerWidth >= 640 
                ? Math.max(16, Math.min(menuPos.y, window.innerHeight - 440)) 
                : undefined,
              left: menuPos && typeof window !== 'undefined' && window.innerWidth >= 640 
                ? Math.max(16, Math.min(menuPos.x, window.innerWidth - 340)) 
                : undefined
            }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            <div className="bg-slate-800/90 px-4 py-3 border-b border-slate-700 flex items-center justify-between">
              <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider flex items-center gap-2">
                <Navigation size={13} /> Select Camera (Slot {activeSlot + 1})
              </span>
              <button 
                type="button"
                onClick={() => {
                  setActiveSlot(null);
                  setMenuPos(null);
                }}
                className="text-[10px] text-slate-400 hover:text-white font-bold bg-white/5 hover:bg-white/10 p-1 rounded-md transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            
            <div className="max-h-[380px] overflow-y-auto p-2 divide-y divide-slate-800/60 custom-scrollbar">
              {ALL_CAMERAS.map(cam => {
                const currentCam = activeCameras[activeSlot];
                const isCurrent = currentCam && cam.id === currentCam.id;
                return (
                  <button
                    key={cam.id}
                    type="button"
                    onClick={() => handleSelectCamera(cam)}
                    className={`w-full text-left px-3 py-2.5 text-xs flex items-center justify-between transition-colors rounded-xl my-0.5 ${
                      isCurrent 
                      ? 'bg-indigo-600 text-white font-semibold' 
                      : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="font-bold text-[13px] truncate">
                        {cam.name}
                      </span>
                      <span className="text-[10px] opacity-75 truncate mt-0.5">
                        {cam.description}
                      </span>
                    </div>
                    {isCurrent && (
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_#34d399]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
