import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, AiAnalysisResult } from '../types';
import { AiOverlay } from './AiOverlay';
import { analyzeFrame } from '../geminiService';
import { 
  Maximize2, 
  MoreVertical, 
  Cpu, 
  MapPin, 
  Navigation, 
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';

interface CameraPlayerProps {
  camera: Camera;
  onSwitchCamera: (cam: Camera) => void;
  availableCameras: Camera[];
  globalAiEnabled: boolean;
  refreshInterval: number;
}

export const CameraPlayer: React.FC<CameraPlayerProps> = ({ 
  camera, 
  onSwitchCamera,
  availableCameras,
  globalAiEnabled,
  refreshInterval
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AiAnalysisResult | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [lastAnalysisTime, setLastAnalysisTime] = useState<number>(0);
  const errorCountRef = useRef(0);

  const getCooldownRemaining = useCallback(() => {
    const elapsed = Date.now() - lastAnalysisTime;
    return Math.max(0, refreshInterval - elapsed);
  }, [lastAnalysisTime, refreshInterval]);

  useEffect(() => {
    setHasError(false);
    errorCountRef.current = 0;
    
    if (videoRef.current) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 60,
          manifestLoadingMaxRetry: 3,
          levelLoadingMaxRetry: 3,
        });

        hls.loadSource(camera.url);
        hls.attachMedia(videoRef.current);
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setHasError(false);
          errorCountRef.current = 0;
          videoRef.current?.play().catch(e => console.error("Autoplay failed", e));
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            errorCountRef.current++;
            if (errorCountRef.current > 5) {
              console.error("Too many fatal errors, stopping node sync", camera.id);
              setHasError(true);
              hls.destroy();
              return;
            }

            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log("Network sync issue, attempting re-link...");
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log("Media sync issue, attempting recovery...");
                hls.recoverMediaError();
                break;
              default:
                setHasError(true);
                hls.destroy();
                break;
            }
          }
        });
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = camera.url;
        videoRef.current.addEventListener('error', () => setHasError(true));
      }
    }

    // Reset analysis when camera changes
    setAnalysis(null);
    setLastAnalysisTime(0);

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [camera.url]);

  const handleAnalyze = useCallback(async () => {
    const video = videoRef.current;
    if (!video || isAnalyzing || !globalAiEnabled || hasError) return;
    
    // Check cooldown
    if (lastAnalysisTime > 0 && getCooldownRemaining() > 0) {
      console.log(`Node locked. ${Math.round(getCooldownRemaining() / 1000)}s until next sync.`);
      return;
    }

    // Ensure video has data and is ready for capture
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }
    
    setIsAnalyzing(true);
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const result = await analyzeFrame(dataUrl);
        setAnalysis(result);
        setLastAnalysisTime(Date.now());
      }
    } catch (error) {
      console.error("Node AI Logic Failed", error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, globalAiEnabled, hasError, lastAnalysisTime, getCooldownRemaining]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const checkAndSchedule = () => {
      if (globalAiEnabled && !isAnalyzing) {
        const remainingTime = getCooldownRemaining();
        if (document.hidden) return;
        
        const delay = remainingTime > 0 ? remainingTime : 1000;
        timeout = setTimeout(() => {
          handleAnalyze();
        }, delay);
      }
    };

    checkAndSchedule();
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkAndSchedule();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [globalAiEnabled, isAnalyzing, handleAnalyze, getCooldownRemaining, refreshInterval]);

  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setShowMenu(true);
  };

  const handleSwitch = (cam: Camera) => {
    onSwitchCamera(cam);
    setShowMenu(false);
  };

  const toggleFullscreen = () => {
    const wrapper = videoRef.current?.parentElement;
    if (!wrapper) return;

    if (!document.fullscreenElement) {
      wrapper.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div 
      className="relative w-full h-full bg-slate-950 group overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
      onContextMenu={handleContextMenu}
    >
      {/* Interaction Layer */}
      <div 
        className="absolute inset-0 cursor-pointer z-0" 
        onClick={() => setShowMenu(false)} 
      />
      
      <video
        ref={videoRef}
        className="w-full h-full object-cover pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity duration-700"
        muted
        autoPlay
        playsInline
      />

      {/* Signal Lost Overlay */}
      {hasError && (
        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center z-10 border-2 border-red-500/20">
          <div className="w-1/2 h-1 bg-red-950/40 mb-6 overflow-hidden relative rounded-full">
            <motion.div 
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 bg-red-500 shadow-[0_0_15px_#ef4444]"
            />
          </div>
          <span className="text-red-500 font-black text-[12px] tracking-[0.4em] uppercase animate-pulse">
            Terminal Signal Lost
          </span>
          <p className="themed-label mt-3 opacity-50">
            Node ID: {camera.id} / ERR_OFFLINE
          </p>
          <button 
            onClick={() => { setHasError(false); onSwitchCamera(camera); }}
            className="mt-6 px-6 py-2 bg-red-500/10 border border-red-500/30 text-[10px] font-black text-red-500 hover:bg-red-500 hover:text-white transition-all rounded-full tracking-widest"
          >
            RESTORE SYNC
          </button>
        </div>
      )}

      {/* AI Overlay Rendering */}
      {showOverlay && globalAiEnabled && (
        <AiOverlay 
          analysis={analysis} 
          isAnalyzing={isAnalyzing}
          videoWidth={videoRef.current?.videoWidth || 0}
          videoHeight={videoRef.current?.videoHeight || 0}
        />
      )}

      {/* Header Info Overlay */}
      <div className="absolute top-0 left-0 right-0 p-5 flex justify-between items-start z-30 pointer-events-none">
        <div className="flex gap-2">
          <span className="bg-slate-900/60 backdrop-blur-md px-3 py-1 text-[10px] font-black border border-white/10 text-white uppercase tracking-widest rounded-lg">
            {camera.name.split(' ')[0]} {camera.name.split(' ')[1]}
          </span>
          <span className="bg-indigo-500/20 backdrop-blur-md px-3 py-1 text-[10px] font-black border border-indigo-500/30 text-indigo-400 flex items-center gap-2 rounded-lg">
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_#6366f1]" />
            AI_FEED
          </span>
        </div>

        <div className="flex flex-col items-end text-[9px] font-mono text-slate-400 bg-slate-900/60 px-3 py-1.5 backdrop-blur-md border border-white/5 rounded-lg">
          <div className="tracking-tighter">COORD: {camera.lat.toFixed(4)}N {Math.abs(camera.lng).toFixed(4)}W</div>
          <div className="text-emerald-400 font-bold tracking-widest mt-0.5">FLOW: {analysis ? analysis.flow : (isAnalyzing ? 'SYNCING...' : 'WAITING')}</div>
        </div>
      </div>

      {/* Bottom Summary Bar */}
      {globalAiEnabled && analysis && showOverlay && (
        <div className="absolute bottom-5 left-5 right-5 flex justify-between items-end z-30 pointer-events-none">
          <div className="max-w-[70%]">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded text-[9px] font-black border border-emerald-500/20 uppercase tracking-[0.2em]">
                FLOW_METRIC
              </span>
              <span className="text-white bg-indigo-600/60 px-2 py-0.5 rounded text-[9px] font-black border border-white/10 uppercase tracking-[0.2em] shadow-lg">
                {analysis.flow}
              </span>
            </div>
            <div className="text-white text-[12px] font-black leading-tight drop-shadow-2xl uppercase tracking-widest bg-slate-900/40 backdrop-blur-sm p-3 border border-white/5 rounded-2xl">
              {analysis.summary}
            </div>
          </div>
          
          <div className="h-12 w-32 bg-slate-900/60 backdrop-blur-md border border-white/10 p-2 flex flex-col justify-between rounded-xl">
            <div className="themed-label leading-none mb-1 opacity-50">Sync Window</div>
            <div className="text-[11px] text-emerald-400 font-mono text-right font-bold">
              {lastAnalysisTime > 0 && getCooldownRemaining() > 0 
                ? `${Math.floor(getCooldownRemaining() / 60000)}m ${Math.floor((getCooldownRemaining() % 60000) / 1000)}s` 
                : 'READY'}
            </div>
            <div className="w-full bg-white/5 h-1.5 rounded-full mt-1 overflow-hidden">
              <motion.div 
                initial={false}
                animate={{ width: `${(1 - getCooldownRemaining() / refreshInterval) * 100}%` }}
                className="h-full bg-emerald-500 shadow-[0_0_10px_#10b981]"
              />
            </div>
          </div>
        </div>
      )}

      {!globalAiEnabled && (
        <div className="absolute bottom-5 left-5 z-30 pointer-events-none">
          <span className="text-slate-500 bg-slate-950/40 px-3 py-1.5 border border-white/5 text-[9px] font-black uppercase tracking-[0.3em] rounded-full backdrop-blur-sm">
            AI_ENGINE_OFFLINE
          </span>
        </div>
      )}

      {/* UI Controls */}
      <div className={`absolute right-4 top-4 flex flex-col gap-2 transition-opacity duration-200 z-40 ${isHovered || showMenu ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button 
          onClick={(e) => { e.stopPropagation(); setShowOverlay(!showOverlay); }}
          className={`p-2.5 bg-slate-900/80 border border-white/10 text-slate-400 hover:text-white hover:border-indigo-500/50 transition-all rounded-xl backdrop-blur-xl shadow-xl ${!showOverlay ? 'text-red-400 border-red-500/30' : ''}`}
          title="Toggle HUD"
        >
          {showOverlay ? <Eye size={15} /> : <EyeOff size={15} />}
        </button>

        <button 
          onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
          className="p-2.5 bg-slate-900/80 border border-white/10 text-slate-400 hover:text-white hover:border-indigo-500/50 transition-all rounded-xl backdrop-blur-xl shadow-xl"
          title="Toggle Fullscreen"
        >
          <Maximize2 size={15} />
        </button>

        <button 
          onClick={(e) => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            setMenuPos({ x: rect.left - 260, y: rect.bottom + 8 });
            setShowMenu(!showMenu);
          }}
          className={`p-2.5 bg-slate-900/80 border border-white/10 text-slate-400 hover:text-white hover:border-indigo-500/50 transition-all rounded-xl backdrop-blur-xl shadow-xl ${showMenu ? 'bg-indigo-600 text-white border-indigo-400' : ''}`}
          title="Select Camera (or Right-Click feed)"
        >
          <MoreVertical size={15} />
        </button>
      </div>

      {/* Floating Camera Selection Context Menu (Triggered by Right-Click or Menu Button) */}
      <AnimatePresence>
        {showMenu && (
          <div 
            className="fixed inset-0 z-[9998] cursor-default"
            onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setShowMenu(false); }}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -5 }}
              transition={{ duration: 0.15 }}
              className="fixed bg-slate-900/95 border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[9999] min-w-[280px] max-w-[320px] overflow-hidden backdrop-blur-2xl rounded-2xl cursor-default"
              style={{ 
                top: Math.max(10, Math.min(menuPos.y, window.innerHeight - 440)),
                left: Math.max(10, Math.min(menuPos.x, window.innerWidth - 300))
              }}
              onClick={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.stopPropagation()}
            >
              <div className="bg-slate-800/80 px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <span className="text-[11px] text-indigo-400 font-black tracking-wider uppercase flex items-center gap-2">
                  <Navigation size={13} /> Select Camera
                </span>
                <button 
                  onClick={() => setShowMenu(false)}
                  className="text-[10px] text-slate-400 hover:text-white font-bold bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded transition-colors"
                >
                  ESC
                </button>
              </div>
              
              <div className="max-h-[340px] overflow-y-auto custom-scrollbar p-2">
                {availableCameras.map(cam => {
                  const isCurrent = cam.id === camera.id;
                  return (
                    <button
                      key={cam.id}
                      onClick={() => handleSwitch(cam)}
                      className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between transition-all rounded-xl mb-1 ${
                        isCurrent 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className={`font-bold tracking-tight text-[12px] truncate ${isCurrent ? 'text-white' : 'text-slate-200'}`}>
                          {cam.name}
                        </span>
                        <span className="text-[9px] opacity-70 uppercase tracking-wider truncate mt-0.5">
                          {cam.description || cam.direction}
                        </span>
                      </div>
                      {isCurrent && (
                        <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_#34d399]" />
                      )}
                    </button>
                  );
                })}
              </div>
              
              <div className="bg-slate-950/60 px-4 py-2 flex items-center justify-between border-t border-white/10 text-[10px] text-slate-400">
                <button 
                  onClick={() => { setShowOverlay(!showOverlay); setShowMenu(false); }}
                  className="hover:text-white uppercase flex items-center gap-1.5 font-bold transition-colors"
                >
                  {showOverlay ? <EyeOff size={12} /> : <Eye size={12} />}
                  {showOverlay ? 'Hide HUD' : 'Show HUD'}
                </button>
                <button 
                  onClick={() => { toggleFullscreen(); setShowMenu(false); }}
                  className="hover:text-white uppercase flex items-center gap-1.5 font-bold transition-colors"
                >
                  <Maximize2 size={12} /> Fullscreen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Decorative Accents */}
      <div className="absolute top-4 left-4 w-12 h-12 border-t border-l border-indigo-500/20 pointer-events-none rounded-tl-2xl" />
      <div className="absolute top-4 right-4 w-12 h-12 border-t border-r border-indigo-500/20 pointer-events-none rounded-tr-2xl" />
      <div className="absolute bottom-4 left-4 w-12 h-12 border-b border-l border-indigo-500/20 pointer-events-none rounded-bl-2xl" />
      <div className="absolute bottom-4 right-4 w-12 h-12 border-b border-r border-indigo-500/20 pointer-events-none rounded-br-2xl" />
    </div>
  );
};
