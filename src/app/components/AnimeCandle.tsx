'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';

export type CandleState = 'idle' | 'ignition' | 'active' | 'unstable' | 'extinguished';

interface Props {
  state?: CandleState;
  onClick?: () => void;
  className?: string;
  hideBase?: boolean;
}

const Particle = ({ delay, state }: { delay: number; state: CandleState }) => {
  const randoms = useMemo(() => ({
    y: -80 - Math.random() * 40,
    x1: (Math.random() - 0.5) * 30,
    x2: (Math.random() - 0.5) * 40,
    scale: Math.random() * 1.5 + 0.5,
    durMod: Math.random()
  }), []);

  if (state !== 'active' && state !== 'unstable' && state !== 'ignition') return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 0, x: 0, scale: 0 }}
      animate={{ 
        opacity: [0, 0.8, 0], 
        y: randoms.y, 
        x: [0, randoms.x1, randoms.x2],
        scale: [0, randoms.scale, 0]
      }}
      transition={{ 
        duration: state === 'unstable' ? 1 + randoms.durMod : 2 + randoms.durMod * 2, 
        repeat: Infinity, 
        delay: delay,
        ease: 'easeOut'
      }}
      className="absolute w-1 h-1 bg-[#4FC3FF] rounded-full blur-[1px]"
      style={{ left: 'calc(50% - 2px)', bottom: '20px' }}
    />
  );
};

export default function AnimeCandle({ state: externalState, onClick, className = '', hideBase = false }: Props) {
  const [internalState, setInternalState] = useState<CandleState>('idle');
  const state = externalState || internalState;

  // Handle internal state progression for demonstration
  const handleClick = () => {
    if (onClick) return onClick();

    if (state === 'idle' || state === 'extinguished') {
      setInternalState('ignition');
      setTimeout(() => setInternalState('active'), 500);
    } else if (state === 'active') {
      setInternalState('unstable');
    } else if (state === 'unstable') {
      setInternalState('extinguished');
    }
  };

  // --- Animation Variants ---

  // The base of the candle
  const baseVariants: Variants = {
    idle: { boxShadow: 'inset 0px 10px 20px rgba(0,0,0,0.8)' },
    ignition: { boxShadow: '0px 0px 15px rgba(79, 195, 255, 0.3), inset 0px 10px 20px rgba(0,0,0,0.8)', transition: { duration: 0.2 } },
    active: { boxShadow: '0px 0px 10px rgba(79, 195, 255, 0.15), inset 0px 10px 20px rgba(0,0,0,0.8)', transition: { duration: 2, repeat: Infinity, repeatType: 'reverse' as const } },
    unstable: { boxShadow: '0px 0px 15px rgba(79, 195, 255, 0.2), inset 0px 10px 20px rgba(0,0,0,0.8)', transition: { duration: 1, repeat: Infinity, repeatType: 'reverse' as const } },
    extinguished: { boxShadow: 'inset 0px 10px 20px rgba(0,0,0,0.8)', transition: { duration: 1 } }
  };

  // The large, soft ambient aura behind the flame
  const auraVariants: Variants = {
    idle: { opacity: 0, scale: 0.5 },
    ignition: { opacity: 0.3, scale: 1.2, transition: { duration: 0.3, ease: 'easeOut' } },
    active: { opacity: [0.15, 0.25, 0.15], scale: [1.0, 1.1, 1.0], transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' } },
    unstable: { opacity: [0.2, 0.3, 0.2], scale: [1.05, 1.15, 1.05], transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } },
    extinguished: { opacity: 0, scale: 0.5, transition: { duration: 0.8, ease: 'easeIn' } }
  };

  // The mid-layer cyan glow
  const midGlowVariants: Variants = {
    idle: { opacity: 0, scaleY: 0, scaleX: 0 },
    ignition: { opacity: 1, scaleY: [0, 1.4, 1], scaleX: [0.1, 0.4, 1], transition: { duration: 0.4, ease: 'easeOut' } },
    active: { opacity: [0.7, 0.9, 0.7], scaleY: [1, 1.05, 0.98, 1], scaleX: [1, 0.95, 1.02, 1], transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' } },
    unstable: { opacity: [0.8, 1, 0.8], scaleY: [1, 1.08, 0.95, 1], scaleX: [1, 0.92, 1.05, 1], transition: { duration: 1, repeat: Infinity, ease: 'easeInOut' } },
    extinguished: { opacity: 0, scaleY: 0, scaleX: 0, transition: { duration: 0.4, ease: 'easeIn' } }
  };

  // The very bright inner core (electric blue -> white)
  const coreVariants: Variants = {
    idle: { opacity: 0, scaleY: 0, scaleX: 0 },
    ignition: { opacity: 1, scaleY: [0, 1.8, 1], scaleX: [0.05, 0.2, 1], transition: { duration: 0.3, ease: 'easeOut' } },
    active: { opacity: 1, scaleY: [1, 1.03, 0.97, 1], scaleX: [1, 0.97, 1.03, 1], transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } },
    unstable: { opacity: 1, scaleY: [1, 1.05, 0.95, 1], scaleX: [1, 0.95, 1.05, 1], transition: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' } },
    extinguished: { opacity: 0, scaleY: 0, scaleX: 0, transition: { duration: 0.3, ease: 'easeIn' } }
  };



  // Determine if we show noise overlay (more visible during unstable)
  const isUnstable = state === 'unstable';

  return (
    <div className={`relative flex flex-col items-center justify-end w-64 h-96 ${className}`}>
      
      {/* The background was removed to make the candle transparent and blend with the main app */}

      {/* Interactive Container */}
      <div 
        className="relative flex flex-col items-center justify-end h-full w-full cursor-pointer pb-12"
        onClick={handleClick}
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        {/* === FLAME CONTAINER === */}
        <div className="relative flex justify-center items-end w-full h-48 mb-2 z-10 pointer-events-none">
          
          {/* AURA (Large blurred backdrop) */}
          <motion.div
            variants={auraVariants}
            initial="idle"
            animate={state}
            className="absolute bottom-0 w-32 h-40 bg-[#4FC3FF] rounded-full blur-[40px] pointer-events-none"
            style={{ originY: 1 }}
          />

          {/* PARTICLES */}
          <AnimatePresence>
            {(state === 'active' || state === 'unstable' || state === 'ignition') && (
              <>
                {[...Array(6)].map((_, i) => (
                  <Particle key={i} delay={i * 0.4} state={state} />
                ))}
              </>
            )}
          </AnimatePresence>

          {/* MID GLOW (Cyan body) */}
          <motion.div
            variants={midGlowVariants}
            initial="idle"
            animate={state}
            className="absolute bottom-0 w-10 h-28 blur-[6px]"
            style={{ 
              background: 'linear-gradient(to top, rgba(0, 240, 255, 0), rgba(0, 240, 255, 0.8) 40%, rgba(79, 195, 255, 1))',
              borderRadius: '50% 50% 20% 20% / 60% 60% 40% 40%',
              originY: 1
            }}
          />

          {/* INNER CORE (Electric Blue / White) */}
          <motion.div
            variants={coreVariants}
            initial="idle"
            animate={state}
            className="absolute bottom-0 w-4 h-20 blur-[1px]"
            style={{ 
              background: 'linear-gradient(to top, #ffffff, #e0f7fa 20%, #4FC3FF 60%, rgba(79, 195, 255, 0))',
              borderRadius: '50% 50% 20% 20% / 60% 60% 40% 40%',
              originY: 1
            }}
          />

          {/* PHYSICAL WICK */}
          {!hideBase && (
            <motion.div
              animate={{ opacity: state === 'idle' || state === 'extinguished' ? 1 : 0 }}
              className="absolute -bottom-2 w-[3px] h-4 bg-gradient-to-t from-[#090e14] to-[#1e2329] rounded-t-sm z-10"
            />
          )}

        </div>

        {/* === BASE (Wax Candle) === */}
        {!hideBase && (
          <motion.div
            variants={baseVariants}
            initial="idle"
            animate={state}
            className="relative w-12 h-24 rounded-t-[6px] rounded-b-sm z-20 overflow-hidden shadow-xl"
            style={{
              background: 'linear-gradient(to right, #11151c, #2a3441 20%, #1a222c 50%, #2a3441 80%, #0a0e14)',
            }}
          >
            {/* Subtle wax highlights on the base */}
            <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
            
            {/* The "Wick" area - stylized glow emitter */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-[#4FC3FF]/40 blur-[1px] rounded-full shadow-[0_0_10px_#4FC3FF]" />
            
            {/* Internal gradient core visible on base */}
            <motion.div 
              animate={{ opacity: state !== 'idle' && state !== 'extinguished' ? 0.3 : 0.05 }}
              className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-10 bg-gradient-to-b from-[#4FC3FF] to-transparent blur-[6px]" 
            />
          </motion.div>
        )}
        
        {/* Subtle ground reflection */}
        {!hideBase && (
          <motion.div 
            animate={{ 
              opacity: state === 'active' || state === 'unstable' ? 0.5 : 0.2,
              scale: state === 'unstable' ? 1.2 : 1 
            }}
            transition={{ duration: 1 }}
            className="absolute -bottom-6 w-32 h-6 bg-[#4FC3FF] rounded-[100%] blur-[12px] opacity-30 z-0 pointer-events-none"
            style={{ transform: 'rotateX(70deg)' }}
          />
        )}
      </div>
    </div>
  );
}
