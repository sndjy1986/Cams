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
}

export const CameraPlayer: React.FC<CameraPlayerProps> = ({ 
  camera, 
  onSwitchCamera,
  availableCameras
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AiAnalysisResult | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(camera.url);
        hls.attachMedia(videoRef.current);
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          videoRef.current?.play().catch(e => console.error("Autoplay failed", e));
        });
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = camera.url;
      }
    }

    // Reset analysis when camera changes
    setAnalysis(null);

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [camera.url]);

  const handleAnalyze = useCallback(async () => {
    if (!videoRef.current || isAnalyzing) return;
    
    setIsAnalyzing(true);
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const result = await analyzeFrame(dataUrl);
        setAnalysis(result);
      }
    } catch (error) {
      console.error("AI Analysis failed", error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing]);

  const [autoAnalyze, setAutoAnalyze] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoAnalyze && !isAnalyzing) {
      interval = setInterval(() => {
        handleAnalyze();
      }, 30000); // 30 seconds
    }
    return () => clearInterval(interval);
  }, [autoAnalyze, isAnalyzing, handleAnalyze]);

  const toggleFullscreen = () => {

    const wrapper = videoRef.current?.parentElement;
    if (!wrapper) return;

    if (!document.fullscreenElement) {
      wrapper.requestFullscreen();
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
        setShowMenu(false);
      }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        muted
        autoPlay
        playsInline
      />

      {/* AI Overlay Rendering */}
      {showOverlay && (
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
          <div className="text-cyan-400">FLOW: {analysis ? (analysis.detections.length > 5 ? 'HIGH DENSITY' : 'NORMAL') : 'CALCULATING...'}</div>
        </div>
      </div>

      {/* Bottom Summary Bar */}
      {analysis && showOverlay && (
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end z-30 pointer-events-none">
          <div className="max-w-[70%]">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-cyan-400 bg-cyan-900/30 px-1.5 py-0.5 rounded text-[8px] font-bold border border-cyan-500/30 animate-pulse uppercase">
                Detection Mode
              </span>
            </div>
            <div className="text-white text-[11px] font-medium leading-tight drop-shadow-lg uppercase tracking-wide">
              {analysis.summary}
            </div>
          </div>
          
          <div className="h-10 w-20 bg-black/40 backdrop-blur-sm border border-white/10 p-1 flex flex-col justify-between">
            <div className="text-[7px] uppercase text-gray-500 leading-none">Activity</div>
            <div className="flex items-end gap-0.5 h-6">
              {[0.4, 0.6, 0.9, 0.3, 0.7, 0.5, 0.8].map((h, i) => (
                <div key={i} className="flex-1 bg-cyan-500/80" style={{ height: `${h * 100}%` }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* UI Controls */}
      <div className={`absolute right-4 top-16 flex flex-col gap-2 transition-opacity duration-300 z-40 ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button 
          onClick={() => setAutoAnalyze(!autoAnalyze)}
          className={`p-2 bg-black/80 border border-white/10 text-gray-400 hover:text-white hover:border-cyan-400 transition-all rounded backdrop-blur-md ${autoAnalyze ? 'border-cyan-400 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.3)]' : ''}`}
          title="Toggle Auto-Analysis"
        >
          <RefreshCw className={autoAnalyze ? 'animate-spin' : ''} size={14} />
        </button>

        <button 
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="p-2 bg-black/80 border border-white/10 text-gray-400 hover:text-white hover:border-cyan-400 transition-all rounded backdrop-blur-md"
          title="Run AI Analysis"
        >
          <Cpu className={isAnalyzing ? 'animate-spin' : ''} size={14} />
        </button>
        
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


          {/* Context Menu */}
          <AnimatePresence>
            {showMenu && (
              <motion.div 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="absolute right-full mr-2 top-0 bg-[#1a1a1a] border border-white/20 p-1 min-w-[180px] shadow-2xl z-50"
              >
                <div className="text-[10px] text-neon-green px-2 py-1 border-b border-white/10 opacity-50 mb-1">SELECT STREAM</div>
                {availableCameras.map(cam => (
                  <button
                    key={cam.id}
                    onClick={() => {
                      onSwitchCamera(cam);
                      setShowMenu(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 text-xs hover:bg-neon-green hover:text-black transition-colors flex items-center justify-between ${cam.id === camera.id ? 'text-neon-green bg-white/5' : 'text-white/80'}`}
                  >
                    {cam.name}
                    {cam.id === camera.id && <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />}
                  </button>
                ))}
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
