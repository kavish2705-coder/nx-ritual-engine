'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import AnimeCandle from '../components/AnimeCandle';
import ParticleField from '../components/ParticleField';
import { NXMemory } from '../lib/memory';

export default function FlamePage() {
  const router = useRouter();
  const [candleLit, setCandleLit] = useState(false);
  const [memory, setMemory] = useState<NXMemory | null>(null);
  const [igniting, setIgniting] = useState(false);

  useEffect(() => {
    const userId = typeof window !== 'undefined' ? localStorage.getItem('nx_userId') : null;
    if (userId) {
      fetch(`/api/memory?userId=${encodeURIComponent(userId)}`)
        .then(res => res.json())
        .then(data => {
          if (data.exists) setMemory(data.data);
        })
        .catch(err => console.error('Failed to load user memory', err));
    }
  }, []);

  const handleCandleClick = () => {
    if (candleLit || igniting) return;

    if (memory && memory.sessionCount >= 8) {
      router.push('/dashboard');
      return;
    }

    setIgniting(true);
    setTimeout(() => {
      setCandleLit(true);
      setTimeout(() => {
        if (!memory) {
          router.push('/onboarding');
        } else {
          router.push('/ritual');
        }
      }, 1800);
    }, 600);
  };

  return (
    <main style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <ParticleField />
      <div className="fog-overlay" />

      {/* Ambient radial vignette */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, rgba(3,5,7,0.85) 100%)',
      }} />

      <div style={{
        position: 'relative', zIndex: 2,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', padding: '40px 20px',
      }}>
        {/* Top Header */}
        <div style={{
          position: 'absolute', top: 32, left: 0, right: 0,
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', padding: '0 40px',
        }}>
          <button
            onClick={() => router.push('/landing')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'Space Mono, monospace', fontSize: '11px',
              letterSpacing: '0.3em', color: 'rgba(96,165,250,0.7)',
            }}
          >
            ← N X OBSERVATORY
          </button>
          <span style={{
            fontSize: '10px', letterSpacing: '0.15em',
            color: 'var(--nx-text-muted)', textTransform: 'uppercase',
            fontFamily: 'Space Mono, monospace',
          }}>
            {memory ? `Subject Active · Session ${memory.sessionCount + 1}/8` : 'Calibration Required'}
          </span>
        </div>

        {/* Candle */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          style={{ position: 'relative', cursor: 'pointer' }}
          whileHover={{ scale: 1.03 }}
        >
          <AnimeCandle
            onClick={handleCandleClick}
            state={
              memory && memory.sessionCount >= 8
                ? 'extinguished'
                : candleLit
                ? 'active'
                : igniting
                ? 'ignition'
                : 'idle'
            }
          />
        </motion.div>

        {/* Instruction */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: igniting ? 0 : 0.6 }}
          transition={{ delay: 0.5, duration: 1 }}
          style={{
            marginTop: '40px',
            fontFamily: 'Space Mono, monospace',
            fontSize: '11px',
            letterSpacing: '0.2em',
            color: 'var(--nx-text-dim)',
            textTransform: 'uppercase',
          }}
        >
          {memory && memory.sessionCount >= 8
            ? 'The ritual is over. View records.'
            : memory
            ? 'Light the flame to resume calibration'
            : 'Light the flame to begin'}
        </motion.p>

        {/* Ignition message */}
        <AnimatePresence>
          {candleLit && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginTop: '30px',
                fontFamily: 'Space Mono, monospace',
                fontSize: '13px',
                letterSpacing: '0.15em',
                color: 'rgba(96,165,250,0.9)',
              }}
            >
              System calibrating. Entering facility channel...
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
