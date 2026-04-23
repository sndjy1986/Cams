import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AiAnalysisResult } from '../types';

interface AiOverlayProps {
  analysis: AiAnalysisResult | null;
  isAnalyzing: boolean;
  videoWidth: number;
  videoHeight: number;
}

export const AiOverlay: React.FC<AiOverlayProps> = ({ 
  analysis, 
  isAnalyzing 
}) => {
  const getDetColor = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('truck') || l.includes('bus')) return 'orange';
    if (l.includes('pedestrian') || l.includes('person')) return 'emerald';
    return 'cyan';
  };

  const colorMap = {
    cyan: 'border-cyan-400/70 shadow-[0_0_10px_rgba(34,211,238,0.5)] bg-cyan-400/10 text-cyan-400',
    orange: 'border-orange-500/70 shadow-[0_0_10px_rgba(249,115,22,0.5)] bg-orange-500/10 text-orange-500',
    emerald: 'border-emerald-400/70 shadow-[0_0_10px_rgba(52,211,153,0.5)] bg-emerald-400/10 text-emerald-400'
  };

  const bgMap = {
    cyan: 'bg-cyan-400',
    orange: 'bg-orange-500',
    emerald: 'bg-emerald-400'
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden font-sans">
      {/* Subtle Loading Indicator */}
      <AnimatePresence>
        {isAnalyzing && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-16 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md border border-cyan-500/30 px-2 py-1 rounded shadow-[0_0_15px_rgba(6,182,212,0.2)]"
          >
            <div className="w-2 h-2 border border-cyan-400 border-t-transparent animate-spin rounded-full" />
            <span className="text-[9px] text-cyan-400 font-mono tracking-widest animate-pulse uppercase">Syncing AI...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detections - only show if not currently analyzing to avoid flickering */}
      {!isAnalyzing && analysis?.detections.map((det, idx) => {
        const [ymin, xmin, ymax, xmax] = det.box_2d;
        const colorKey = getDetColor(det.label) as keyof typeof colorMap;
        
        const top = ymin / 10;
        const left = xmin / 10;
        const height = (ymax - ymin) / 10;
        const width = (xmax - xmin) / 10;

        return (
          <motion.div
            key={`${idx}-${det.label}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`absolute border-2 ${colorMap[colorKey].split(' text-')[0]}`}
            style={{
              top: `${top}%`,
              left: `${left}%`,
              width: `${width}%`,
              height: `${height}%`,
            }}
          >
            <div className={`absolute -top-6 left-0 ${bgMap[colorKey]} text-black text-[10px] px-1 font-bold uppercase leading-tight whitespace-nowrap`}>
              {det.label}: {Math.round(det.confidence * 100)}%
            </div>
            <div className={`absolute -bottom-5 right-0 ${colorMap[colorKey].split('text-')[1]} text-[9px] font-mono whitespace-nowrap`}>
              v_id: {idx + 1000}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
