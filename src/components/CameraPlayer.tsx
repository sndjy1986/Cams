import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { Camera, AiAnalysisResult } from '../types';
import { AiOverlay } from './AiOverlay';
import { analyzeFrame } from '../geminiService';
import { 
  Maximize2, 
  MoreVertical, 
  Navigation, 
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
  const [showOverlay, setShowOverlay] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [lastAnalysisTime, setLastAnalysisTime] = useState<number>(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
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
    
    if (lastAnalysisTime > 0 && getCooldownRemaining() > 0) {
      return;
    }

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

  const toggleFullscreen = () => {
    const wrapper = videoRef.current?.parentElement;
    if (!wrapper) return;

    if (!document.fullscreenElement) {
      wrapper.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const openMenuAt = (x: number, y: number) => {
    setMenuPos({ x, y });
    setMenuOpen(true);
  };

  return (
    <div 
      className="relative w-full h-full bg-slate-950 group overflow-hidden select-none"
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openMenuAt(e.clientX, e.clientY);
      }}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-cover pointer-events-none opacity-85 group-hover:opacity-100 transition-opacity duration-500"
        muted
        autoPlay
        playsInline
      />

      {/* Signal Lost Overlay */}
      {hasError && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center z-20 border border-red-500/20">
          <span className="text-red-400 font-bold text-xs tracking-widest uppercase mb-2">
            Signal Disconnected
          </span>
          <span className="text-[10px] text-slate-400 font-mono mb-4">
            {camera.name}
          </span>
          <button 
            onClick={() => { setHasError(false); onSwitchCamera(camera); }}
            className="px-4 py-1.5 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white border border-red-500/40 text-[10px] font-bold rounded-lg transition-colors tracking-wider uppercase"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* AI Overlay */}
      {showOverlay && globalAiEnabled && (
        <AiOverlay 
          analysis={analysis} 
          isAnalyzing={isAnalyzing}
          videoWidth={videoRef.current?.videoWidth || 0}
          videoHeight={videoRef.current?.videoHeight || 0}
        />
      )}

      {/* Header Info Overlay */}
      <div className="absolute top-2 left-3 right-16 flex justify-between items-start z-10 pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="bg-slate-900/90 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold border border-white/10 text-white tracking-wide rounded-md shadow-md">
            {camera.name}
          </span>
          {camera.direction && (
            <span className="bg-indigo-950/80 backdrop-blur-md px-2 py-0.5 text-[9px] font-black border border-indigo-500/30 text-indigo-300 rounded shadow-md uppercase">
              {camera.direction}
            </span>
          )}
        </div>
      </div>

      {/* Bottom Summary Bar */}
      {globalAiEnabled && analysis && showOverlay && (
        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end z-10 pointer-events-none">
          <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-lg text-[10px] text-slate-300">
            <span className="text-indigo-400 font-bold mr-1.5 uppercase tracking-wider">{analysis.flow}:</span>
            <span>{analysis.summary}</span>
          </div>
        </div>
      )}

      {/* Top-Right Control Buttons (Visible always on mobile, on hover on desktop) */}
      <div className="absolute top-2 right-2 flex items-center gap-1.5 z-20">
        <button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowOverlay(!showOverlay);
          }}
          className="p-1.5 bg-slate-900/80 hover:bg-slate-800 border border-white/15 text-slate-300 hover:text-white rounded-lg backdrop-blur-md shadow-md transition-colors"
          title="Toggle HUD Overlay"
        >
          {showOverlay ? <Eye size={14} /> : <EyeOff size={14} className="text-red-400" />}
        </button>

        <button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFullscreen();
          }}
          className="p-1.5 bg-slate-900/80 hover:bg-slate-800 border border-white/15 text-slate-300 hover:text-white rounded-lg backdrop-blur-md shadow-md transition-colors"
          title="Fullscreen"
        >
          <Maximize2 size={14} />
        </button>

        <button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            openMenuAt(rect.left - 240, rect.bottom + 6);
          }}
          className={`p-1.5 border rounded-lg backdrop-blur-md shadow-md transition-colors ${menuOpen ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-900/80 hover:bg-slate-800 border-white/15 text-slate-300 hover:text-white'}`}
          title="Change Camera Feed"
        >
          <MoreVertical size={14} />
        </button>
      </div>

      {/* Global Camera Switcher Modal / Context Menu */}
      {menuOpen && (
        <div 
          className="fixed inset-0 z-[10000] cursor-default bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 sm:p-0 sm:block"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenuOpen(false);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenuOpen(false);
          }}
        >
          <div 
            className="sm:fixed bg-slate-900 border border-slate-700/80 shadow-[0_25px_60px_rgba(0,0,0,0.9)] w-[320px] max-w-[90vw] overflow-hidden rounded-2xl z-[10001]"
            style={{ 
              top: typeof window !== 'undefined' && window.innerWidth >= 640 
                ? Math.max(16, Math.min(menuPos.y, window.innerHeight - 460)) 
                : undefined,
              left: typeof window !== 'undefined' && window.innerWidth >= 640 
                ? Math.max(16, Math.min(menuPos.x, window.innerWidth - 340)) 
                : undefined
            }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            <div className="bg-slate-800 px-4 py-3 border-b border-slate-700 flex items-center justify-between">
              <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider flex items-center gap-2">
                <Navigation size={13} /> Select Camera
              </span>
              <button 
                type="button"
                onClick={() => setMenuOpen(false)}
                className="text-[10px] text-slate-400 hover:text-white font-bold bg-white/5 hover:bg-white/10 px-2 py-1 rounded transition-colors"
              >
                CLOSE
              </button>
            </div>
            
            <div className="max-h-[360px] overflow-y-auto p-2 divide-y divide-slate-800/60 custom-scrollbar">
              {availableCameras.map(cam => {
                const isCurrent = cam.id === camera.id;
                return (
                  <button
                    key={cam.id}
                    type="button"
                    onClick={() => {
                      onSwitchCamera(cam);
                      setMenuOpen(false);
                    }}
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
