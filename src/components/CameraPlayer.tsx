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
      className="relative w-full h-full bg-black group overflow-hidden border border-white/10"
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
        className="w-full h-full object-cover pointer-events-none"
        muted
        autoPlay
        playsInline
      />

      {/* Signal Lost Overlay */}
      {hasError && (
        <div className="absolute inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center z-10 border-2 border-red-900/20">
          <div className="w-16 h-1 w-1/2 bg-red-600/20 mb-4 overflow-hidden relative">
            <motion.div 
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 bg-red-600 shadow-[0_0_10px_#dc2626]"
            />
          </div>
          <span className="text-red-600 font-mono text-[10px] tracking-[0.3em] uppercase animate-pulse">
            Terminal Signal Lost
          </span>
          <p className="text-gray-600 text-[8px] uppercase mt-2 font-mono">
            Node ID: {camera.id} / ERR_STREAM_UNAVAILABLE
          </p>
          <button 
            onClick={() => { setHasError(false); onSwitchCamera(camera); }}
            className="mt-4 px-3 py-1 border border-white/10 text-[9px] text-gray-500 hover:text-white transition-colors"
          >
            RETRY SYNC
          </button>
        </div>
      )}

      {/* AI Overlay Rendering - Respect Global Toggle */}
      {showOverlay && globalAiEnabled && (
        <AiOverlay 
          analysis={analysis} 
          isAnalyzing={isAnalyzing}
          videoWidth={videoRef.current?.videoWidth || 0}
          videoHeight={videoRef.current?.videoHeight || 0}
        />
      )}

      {/* Header Info Overlay */}

      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-30 pointer-events-none">
        <div className="flex gap-2">
          <span className="bg-black/80 px-2 py-1 text-[10px] font-bold border border-white/20 text-white uppercase tracking-wider">
            {camera.name.split(' ')[0]} {camera.name.split(' ')[1]}
          </span>
          <span className="bg-red-900/80 px-2 py-1 text-[10px] font-bold border border-red-500/50 text-white flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            LIVE AI
          </span>
        </div>

        <div className="flex flex-col items-end text-[9px] font-mono text-gray-400 bg-black/40 p-1 backdrop-blur-sm border border-white/5">
          <div>COORD: {camera.lat.toFixed(4)}° N, {Math.abs(camera.lng).toFixed(4)}° W</div>
          <div className="text-cyan-400">FLOW: {analysis ? analysis.flow : (isAnalyzing ? 'SYNCING...' : 'WAITING')}</div>
        </div>
      </div>

      {/* Bottom Summary Bar */}
      {globalAiEnabled && analysis && showOverlay && (
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end z-30 pointer-events-none">
          <div className="max-w-[70%]">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-cyan-400 bg-cyan-900/30 px-1.5 py-0.5 rounded text-[8px] font-bold border border-cyan-500/30 animate-pulse uppercase">
                Flow Analysis
              </span>
              <span className="text-white bg-black/60 px-1.5 py-0.5 rounded text-[8px] border border-white/10 uppercase">
                {analysis.flow}
              </span>
            </div>
            <div className="text-white text-[11px] font-medium leading-tight drop-shadow-lg uppercase tracking-wide">
              {analysis.summary}
            </div>
          </div>
          
          <div className="h-10 w-24 bg-black/40 backdrop-blur-sm border border-white/10 p-1 flex flex-col justify-between">
            <div className="text-[7px] uppercase text-gray-500 leading-none">Sync Window</div>
            <div className="text-[10px] text-cyan-400 font-mono text-right">
              {lastAnalysisTime > 0 && getCooldownRemaining() > 0 
                ? `${Math.floor(getCooldownRemaining() / 60000)}m ${Math.floor((getCooldownRemaining() % 60000) / 1000)}s` 
                : 'READY'}
            </div>
            <div className="w-full bg-white/5 h-1">
              <motion.div 
                initial={false}
                animate={{ width: `${(1 - getCooldownRemaining() / refreshInterval) * 100}%` }}
                className="h-full bg-cyan-500"
              />
            </div>
          </div>
        </div>
      )}

      {!globalAiEnabled && (
        <div className="absolute bottom-4 left-4 z-30 pointer-events-none">
          <span className="text-red-500/50 bg-red-950/20 px-2 py-1 border border-red-500/20 text-[9px] font-bold uppercase tracking-widest">
            Network AI Offline
          </span>
        </div>
      )}

      {/* UI Controls */}
      <div className={`absolute right-4 top-16 flex flex-col gap-2 transition-opacity duration-300 z-40 ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button 
          onClick={() => setShowOverlay(!showOverlay)}
          className={`p-2 bg-black/80 border border-white/10 text-gray-400 hover:text-white hover:border-cyan-400 transition-all rounded backdrop-blur-md ${!showOverlay ? 'text-red-500' : ''}`}
          title="Toggle AI HUD"
        >
          {showOverlay ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>

        <button 
          onClick={toggleFullscreen}
          className="p-2 bg-black/80 border border-white/10 text-gray-400 hover:text-white hover:border-cyan-400 transition-all rounded backdrop-blur-md"
          title="Toggle Fullscreen"
        >
          <Maximize2 size={14} />
        </button>

        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 bg-black/80 border border-white/10 text-gray-400 hover:text-white hover:border-cyan-400 transition-all rounded backdrop-blur-md"
            title="Switch Camera"
          >
            <MoreVertical size={14} />
          </button>


          {/* Floating Context Menu */}
          <AnimatePresence>
            {showMenu && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed bg-[#121212] border border-white/20 shadow-2xl z-[9999] min-w-[240px] overflow-hidden backdrop-blur-md"
                style={{ 
                  top: Math.min(menuPos.y, window.innerHeight - 300),
                  left: Math.min(menuPos.x, window.innerWidth - 240)
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-[#1a1a1a] px-3 py-2 border-b border-white/10 flex items-center justify-between">
                  <span className="text-[10px] text-cyan-400 font-bold tracking-widest uppercase">Select Node</span>
                  <button 
                    onClick={() => setShowMenu(false)}
                    className="text-[9px] text-gray-500 hover:text-white"
                  >
                    ESC
                  </button>
                </div>
                
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                  {availableCameras.map(cam => (
                    <button
                      key={cam.id}
                      onClick={() => handleSwitch(cam)}
                      className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between transition-colors border-b border-white/5 last:border-0 ${
                        cam.id === camera.id 
                        ? 'bg-cyan-500/10 text-white' 
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className={`font-medium ${cam.id === camera.id ? 'text-cyan-400' : ''}`}>{cam.name}</span>
                        <span className="text-[9px] opacity-40 uppercase truncate max-w-[160px]">{cam.description}</span>
                      </div>
                      {cam.id === camera.id && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />}
                    </button>
                  ))}
                </div>
                
                <div className="bg-black/40 px-3 py-2 flex flex-col gap-1 border-t border-white/10">
                  <button 
                    onClick={() => { setShowOverlay(!showOverlay); setShowMenu(false); }}
                    className="w-full text-left text-[9px] text-gray-500 hover:text-white uppercase flex items-center gap-2"
                  >
                    {showOverlay ? <Eye size={10} /> : <EyeOff size={10} />}
                    {showOverlay ? 'Hide HUD' : 'Show HUD'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Decorative Brackets */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-neon-green/30 pointer-events-none" />
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-neon-green/30 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-neon-green/30 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-neon-green/30 pointer-events-none" />
    </div>
  );
};
