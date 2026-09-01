'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import GasFlame from './GasFlame';
import Image from 'next/image';

export type CandleState = 'idle' | 'ignition' | 'active' | 'unstable' | 'extinguished';

interface Props {
  state?: CandleState;
  onClick?: () => void;
  className?: string;
  hideBase?: boolean;
}

const Particle = ({ delay, state }: { delay: number; state: CandleState }) => {
  const randoms = useMemo(() => ({
    y: -90 - Math.random() * 50,
    x1: (Math.random() - 0.5) * 35,
    x2: (Math.random() - 0.5) * 50,
    scale: Math.random() * 1.6 + 0.6,
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
        duration: state === 'unstable' ? 0.9 + randoms.durMod * 0.4 : 1.9 + randoms.durMod * 1.6,
        repeat: Infinity,
        delay: delay,
        ease: 'easeOut'
      }}
      className="absolute w-[5px] h-[5px] rounded-full blur-[0.5px]"
      style={{
        left: 'calc(50% - 2.5px)',
        bottom: '60px',
        backgroundColor: state === 'unstable' ? '#ff3b30' : '#00f0ff',
        boxShadow: state === 'unstable'
          ? '0 0 8px rgba(255, 59, 48, 0.7)'
          : '0 0 8px rgba(0, 240, 255, 0.7)',
        transition: 'background-color 1s ease'
      }}
    />
  );
};



export default function AnimeCandle({ state: externalState, onClick, className = '', hideBase = false }: Props) {
  const [internalState, setInternalState] = useState<CandleState>('idle');
  const state = externalState || internalState;

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

  const auraVariants: Variants = {
    idle: { opacity: 0.15, scale: 1.0, backgroundColor: '#4FC3FF', transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' } },
    ignition: { opacity: 0.3, scale: 1.2, backgroundColor: '#4FC3FF', transition: { duration: 0.3, ease: 'easeOut' } },
    active: {
      opacity: [0.15, 0.25, 0.15],
      scale: [1.0, 1.1, 1.0],
      backgroundColor: '#4FC3FF',
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    },
    unstable: {
      opacity: [0.2, 0.3, 0.2],
      scale: [1.05, 1.15, 1.05],
      backgroundColor: '#ff1e1e',
      transition: {
        backgroundColor: { duration: 1.0 },
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    },
    extinguished: { opacity: 0.15, scale: 1.0, backgroundColor: '#4FC3FF', transition: { duration: 0.8, ease: 'easeIn' } }
  };

  const reflectionVariants: Variants = {
    idle: { opacity: 0.4, scale: 1, backgroundColor: '#4FC3FF' },
    ignition: { opacity: 0.15, scale: 1, backgroundColor: '#4FC3FF' },
    active: { opacity: 0.4, scale: 1, backgroundColor: '#4FC3FF', transition: { duration: 1 } },
    unstable: { opacity: 0.4, scale: 1.2, backgroundColor: '#ff1e1e', transition: { duration: 1 } },
    extinguished: { opacity: 0.4, scale: 1, backgroundColor: '#4FC3FF', transition: { duration: 1 } }
  };

  return (
    <div className={`relative flex flex-col items-center justify-end w-64 h-[440px] scale-75 sm:scale-90 md:scale-100 origin-bottom ${className}`}>

      <div
        className="relative flex flex-col items-center justify-end h-full w-full cursor-pointer"
        onClick={handleClick}
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        {/* === FLAME CONTAINER === */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 z-10 pointer-events-none flex justify-center items-end w-full h-48"
          style={{ bottom: '235px' }}
        >

          {/* AURA (Large blurred backdrop casting light onto UI) */}
          <motion.div
            variants={auraVariants}
            initial="idle"
            animate={state}
            className="absolute bottom-6 w-36 h-44 rounded-full blur-[42px] pointer-events-none"
            style={{ originY: 1 }}
          />

          {/* PARTICLES */}
          <>
            {[...Array(8)].map((_, i) => (
              <Particle key={i} delay={i * 0.3} state={state} />
            ))}
          </>

          {/* FLAME GRAPHICS */}
          <div
            className="absolute inset-0 flex justify-center items-end"
            style={{ bottom: '0px' }}
          >
            <GasFlame state={state} />
          </div>

        </div>

        {/* === BASE (Ritual Torch) === */}
        {!hideBase && (
          <div className="relative w-36 h-[340px] z-20 pointer-events-none flex-shrink-0">
            <Image
              src="/ritual-torch.png"
              alt="Ritual Torch"
              fill
              priority
              className="object-contain select-none pointer-events-none"
              style={{
                // In unstable state, the metal glows crimson-red
                filter: state === 'unstable'
                  ? 'sepia(80%) hue-rotate(320deg) saturate(300%) brightness(0.85) drop-shadow(0 0 12px rgba(255, 30, 30, 0.5))'
                  : 'none',
                transition: 'filter 1s ease'
              }}
            />
          </div>
        )}

        {/* Subtle ground reflection */}
        {!hideBase && (
          <motion.div
            variants={reflectionVariants}
            initial="idle"
            animate={state}
            className="absolute -bottom-6 w-32 h-6 rounded-[100%] blur-[12px] opacity-30 z-0 pointer-events-none"
            style={{
              transform: 'rotateX(70deg)',
              originY: 0.5,
            }}
          />
        )}
      </div>
    </div>
  );
}
