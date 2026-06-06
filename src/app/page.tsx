'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AnimeCandle from './components/AnimeCandle';
import ParticleField from './components/ParticleField';
import RitualView from './views/RitualView';
import DashboardView from './views/DashboardView';
import OnboardingView from './views/OnboardingView';
import { loadMemory, NXMemory } from './lib/memory';

type View = 'landing' | 'onboarding' | 'ritual' | 'dashboard';

export default function Home() {
  const [view, setView] = useState<View>('landing');
  const [candleLit, setCandleLit] = useState(false);
  const [memory, setMemory] = useState<NXMemory | null>(null);
  const [igniting, setIgniting] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const [taglineIndex, setTaglineIndex] = useState(0);

  const taglines = [
    'Begin when ready.',
    'It has been waiting.',
    'The system observes.',
    'Light the flame.',
  ];

  useEffect(() => {
    const mem = loadMemory();
    setMemory(mem);

    const timer = setTimeout(() => setShowSkip(true), 3000);
    const taglineTimer = setInterval(() => {
      setTaglineIndex(i => (i + 1) % taglines.length);
    }, 4000);

    return () => {
      clearTimeout(timer);
      clearInterval(taglineTimer);
    };
  }, []);

  const handleCandleClick = () => {
    if (candleLit || igniting) return;

    if (memory && memory.sessionCount >= 8) {
      setView('dashboard');
      return;
    }

    setIgniting(true);
    setTimeout(() => {
      setCandleLit(true);
      setTimeout(() => {
        if (!memory) {
          setView('onboarding');
        } else {
          setView('ritual');
        }
      }, 1800);
    }, 600);
  };

  const handleOnboardingComplete = useCallback((newMemory: NXMemory) => {
    setMemory(newMemory);
    setView('ritual');
  }, []);

  const handleRitualEnd = useCallback((updatedMemory: NXMemory) => {
    setMemory(updatedMemory);
    setView('dashboard');
    setCandleLit(false);
  }, []);

  const handleReturnToRitual = useCallback(() => {
    setView('ritual');
    setCandleLit(true);
  }, []);

  const handleReturnToLanding = useCallback(() => {
    setView('landing');
    setCandleLit(false);
    setIgniting(false);
  }, []);

  return (
    <main style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <ParticleField />
      <div className="fog-overlay" />

      {/* Ambient radial vignette */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, rgba(3,5,7,0.85) 100%)',
      }} />

      <AnimatePresence mode="wait">
        {view === 'landing' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 1.2 }}
            style={{
              position: 'relative', zIndex: 2,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              minHeight: '100vh',
              padding: '40px 20px',
            }}
          >
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 1 }}
              style={{
                position: 'absolute', top: 32, left: 0, right: 0,
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', padding: '0 40px',
              }}
            >
              <span style={{
                fontFamily: 'Space Mono, monospace',
                fontSize: '11px',
                letterSpacing: '0.3em',
                color: 'rgba(59,130,246,0.4)',
              }}>N X</span>
              <span style={{
                fontSize: '10px',
                letterSpacing: '0.15em',
                color: 'var(--nx-text-muted)',
                textTransform: 'uppercase',
              }}>
                {memory ? `System active · ${memory.sessionCount} session${memory.sessionCount !== 1 ? 's' : ''}` : 'System dormant'}
              </span>
            </motion.div>

            {/* Main content */}
            <div style={{ textAlign: 'center', marginBottom: '60px' }}>
              <motion.p
                key={taglineIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.8 }}
                style={{
                  fontFamily: 'Space Mono, monospace',
                  fontSize: '11px',
                  letterSpacing: '0.25em',
                  color: 'var(--nx-text-muted)',
                  textTransform: 'uppercase',
                  marginBottom: '32px',
                }}
              >
                {taglines[taglineIndex]}
              </motion.p>
            </div>

            {/* Candle */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 1.5, ease: 'easeOut' }}
              style={{ position: 'relative', cursor: 'pointer' }}
              whileHover={{ scale: 1.03 }}
            >
              {/* Glow ring beneath candle */}
              {candleLit && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    position: 'absolute',
                    bottom: -20, left: '50%',
                    transform: 'translateX(-50%)',
                    width: 200, height: 60,
                    borderRadius: '50%',
                    background: 'radial-gradient(ellipse, rgba(59,130,246,0.12) 0%, transparent 70%)',
                    filter: 'blur(10px)',
                  }}
                />
              )}

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
              animate={{ opacity: igniting ? 0 : 0.3 }}
              transition={{ delay: 2, duration: 1 }}
              style={{
                marginTop: '40px',
                fontSize: '11px',
                letterSpacing: '0.2em',
                color: 'var(--nx-text-dim)',
                textTransform: 'uppercase',
              }}
            >
              {memory && memory.sessionCount >= 8
                ? 'the ritual is over. view records.'
                : memory
                ? 'Light the flame to continue'
                : 'Light the flame to begin'}
            </motion.p>

            {/* Ignition message */}
            <AnimatePresence>
              {candleLit && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    marginTop: '40px',
                    fontFamily: 'Space Mono, monospace',
                    fontSize: '13px',
                    letterSpacing: '0.1em',
                    color: 'rgba(96,165,250,0.8)',
                  }}
                >
                  You initiated this.
                </motion.p>
              )}
            </AnimatePresence>

            {/* Dashboard shortcut (returning users) */}
            <AnimatePresence>
              {showSkip && memory && !candleLit && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setView('dashboard')}
                  style={{
                    position: 'absolute', bottom: 40,
                    background: 'none', border: 'none',
                    cursor: 'pointer',
                    fontSize: '11px',
                    letterSpacing: '0.15em',
                    color: 'var(--nx-text-muted)',
                    textTransform: 'uppercase',
                    textDecoration: 'underline',
                    textDecorationColor: 'rgba(59,130,246,0.2)',
                  }}
                >
                  View records
                </motion.button>
              )}
            </AnimatePresence>

            {/* Bottom status */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 3 }}
              style={{
                position: 'absolute', bottom: 24, left: 0, right: 0,
                display: 'flex', justifyContent: 'center', gap: 32,
                alignItems: 'center',
              }}
            >
              {['Private', 'Encrypted', 'Local'].map(label => (
                <span key={label} style={{
                  fontSize: '10px',
                  letterSpacing: '0.12em',
                  color: 'var(--nx-text-muted)',
                  textTransform: 'uppercase',
                }}>
                  · {label}
                </span>
              ))}
              {memory && (
                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to purge all telemetry? This action is irreversible.")) {
                      localStorage.removeItem('nx_memory');
                      window.location.reload();
                    }
                  }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '10px', letterSpacing: '0.12em',
                    color: 'rgba(239, 68, 68, 0.45)', textTransform: 'uppercase',
                    textDecoration: 'underline',
                    textDecorationColor: 'rgba(239, 68, 68, 0.2)',
                    transition: 'color 0.2s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'rgba(239, 68, 68, 0.8)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(239, 68, 68, 0.45)'}
                >
                  · Purge system
                </button>
              )}
            </motion.div>
          </motion.div>
        )}

        {view === 'onboarding' && (
          <motion.div
            key="onboarding"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            style={{ position: 'relative', zIndex: 2 }}
          >
            <OnboardingView onComplete={handleOnboardingComplete} />
          </motion.div>
        )}

        {view === 'ritual' && memory && (
          <motion.div
            key="ritual"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            style={{ position: 'relative', zIndex: 2 }}
          >
            <RitualView
              memory={memory}
              onEnd={handleRitualEnd}
            />
          </motion.div>
        )}

        {view === 'dashboard' && memory && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            style={{ position: 'relative', zIndex: 2 }}
          >
            <DashboardView
              memory={memory}
              onBeginRitual={handleReturnToRitual}
              onDisconnect={handleReturnToLanding}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
