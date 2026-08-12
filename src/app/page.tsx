'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AnimeCandle from './components/AnimeCandle';
import BlueAshParticles from '../components/BlueAshParticles';
import RitualView from './views/RitualView';
import DashboardView from './views/DashboardView';
import OnboardingView from './views/OnboardingView';
import { loadMemory, NXMemory } from './lib/memory';

type View = 'landing' | 'flame' | 'onboarding' | 'ritual' | 'dashboard';

export default function Home() {
  const [view, setView] = useState<View>('landing');
  const [candleLit, setCandleLit] = useState(false);
  const [memory, setMemory] = useState<NXMemory | null>(null);
  const [igniting, setIgniting] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [showConfirmTerminate, setShowConfirmTerminate] = useState(false);

  const handlePurgeProfile = () => {
    if (!memory) return;
    fetch(`/api/memory?userId=${encodeURIComponent(memory.userId)}`, {
      method: 'DELETE'
    })
      .then(() => {
        localStorage.removeItem('nx_userId');
        localStorage.removeItem('nx_api_key');
        localStorage.removeItem('nx_memory');
        window.location.reload();
      })
      .catch(err => {
        console.error('Failed to purge server memory', err);
        localStorage.removeItem('nx_userId');
        localStorage.removeItem('nx_api_key');
        localStorage.removeItem('nx_memory');
        window.location.reload();
      });
  };

  const taglines = [
    'Begin when ready.',
    'It has been waiting.',
    'The system observes.',
  ];

  useEffect(() => {
    const userId = typeof window !== 'undefined' ? localStorage.getItem('nx_userId') : null;
    if (userId) {
      fetch(`/api/memory?userId=${encodeURIComponent(userId)}`)
        .then(res => res.json())
        .then(data => {
          if (data.exists) {
            setMemory(data.data);
          } else {
            // Cleans up stale user IDs if deleted from server
            localStorage.removeItem('nx_userId');
          }
        })
        .catch(err => console.error('Failed to load user memory', err));
    }

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
    if (typeof window !== 'undefined') {
      localStorage.setItem('nx_userId', newMemory.userId);
    }
    // Save new memory to database
    fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMemory)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setMemory(data.data);
          setView('ritual');
        } else {
          console.error('Failed to initialize profile in DB', data.error);
        }
      })
      .catch(err => console.error('Failed to initialize profile in DB', err));
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
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('nx-deactivate-magic'));
  }, []);

  return (
    <main style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      
      {/* Backgrounds */}
      <BlueAshParticles />

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
              minHeight: '100vh',
              padding: '0 24px 120px',
              maxWidth: '900px',
              margin: '0 auto',
            }}
          >
            <div className="scanline-facility" />
            {/* Facility Header */}
            <motion.header
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="glass-panel"
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '16px 24px', 
                marginBottom: '80px',
                position: 'sticky', top: '24px', zIndex: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '13px', letterSpacing: '0.3em', fontWeight: 'bold', color: 'var(--nx-text)' }}>
                  N X
                </span>
                <span className="facility-label">THE RITUAL</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span className="facility-label" style={{ color: 'rgba(6, 182, 212, 0.8)' }}>
                  STATUS: {memory ? `OBSERVATION LOG ${memory.sessionCount}/8` : 'DORMANT · CALIBRATION REQUIRED'}
                </span>
                {memory && (
                  <button
                    onClick={() => setView('dashboard')}
                    className="glass-button"
                    style={{
                      padding: '8px 16px', color: 'var(--nx-text-dim)',
                      fontFamily: 'Space Mono, monospace', fontSize: '10px',
                      letterSpacing: '0.15em', cursor: 'pointer', border: 'none',
                    }}
                  >
                    ACCESS ARCHIVE →
                  </button>
                )}
              </div>
            </motion.header>

            {/* Asymmetric Hero Section */}
            <motion.section 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{
              display: 'flex', flexDirection: 'column',
              minHeight: '65vh', justifyContent: 'center',
              position: 'relative', marginBottom: '100px',
            }}>
              {/* Asymmetric Title Block */}
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}>
                <div>
                  <span className="facility-label" style={{ display: 'block', marginBottom: '12px' }}>
                    FACILITY LOG | TERMINAL 01
                  </span>
                  <h1 className="ritual-glow" style={{
                    fontFamily: 'Space Grotesk, sans-serif',
                    fontSize: 'clamp(70px, 14vw, 140px)',
                    fontWeight: 300,
                    letterSpacing: '0.2em',
                    lineHeight: 0.95,
                    color: '#ffffff',
                    margin: 0,
                  }}>
                    N X
                  </h1>
                  <h2 style={{
                    fontFamily: 'Space Mono, monospace',
                    fontSize: 'clamp(18px, 3.5vw, 32px)',
                    fontWeight: 300,
                    letterSpacing: '0.3em',
                    color: 'rgba(6, 182, 212, 0.7)',
                    marginTop: '8px',
                  }}>
                    THE RITUAL
                  </h2>
                </div>

                {/* Asymmetric Right-Aligned Status */}
                <div style={{ maxWidth: '240px', textAlign: 'right', marginTop: '30px' }}>
                  <p className="facility-label" style={{ color: 'var(--nx-text-muted)', lineHeight: 1.8 }}>
                    No behavioral profile exists.
                  </p>
                  <p className="facility-label" style={{ color: 'rgba(6, 182, 212, 0.5)', marginTop: '8px' }}>
                    Awaiting subject ignition.
                  </p>
                </div>
              </div>

              {/* Asymmetric Action Trigger */}
              <div style={{ marginTop: '80px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setView('flame');
                    if (typeof window !== 'undefined') window.dispatchEvent(new Event('nx-activate-magic'));
                  }}
                  className="glass-button"
                  style={{
                    padding: '20px 48px',
                    color: '#ffffff',
                    fontFamily: 'Space Mono, monospace',
                    fontSize: '11px',
                    letterSpacing: '0.3em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  LIGHT THE FLAME
                </motion.button>
              </div>
            </motion.section>

            {/* Descending Section 01: OBSERVATION */}
            <motion.section 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="glass-panel" style={{ padding: '40px', marginBottom: '40px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '24px' }}>
                <span className="facility-label">01 OBSERVATION</span>
                <span className="facility-label">SYS STATUS: IDLE</span>
              </div>
              <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 300, color: 'var(--nx-text)', letterSpacing: '0.04em', margin: 0 }}>
                Patterns survive. Memories don't.
              </p>
            </motion.section>

            {/* Descending Section 02: CALIBRATION */}
            <motion.section 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="glass-panel" style={{ padding: '40px', marginBottom: '40px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '24px' }}>
                <span className="facility-label">02 CALIBRATION PROTOCOL</span>
                <span className="facility-label">SEQUENCE 0/8</span>
              </div>
              <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 300, color: 'var(--nx-text)', letterSpacing: '0.04em', marginBottom: '40px' }}>
                Eight observations. Nothing more.
              </p>

              {/* Roman Numeral Sequence Track */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '12px', textAlign: 'center' }}>
                {['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ', 'Ⅷ'].map((num, i) => (
                  <div key={num} className="glass-card" style={{
                    padding: '16px 4px',
                    background: i < (memory?.sessionCount || 0) ? 'rgba(8, 145, 178, 0.2)' : 'rgba(6, 10, 15, 0.4)',
                    borderColor: i < (memory?.sessionCount || 0) ? 'rgba(6, 182, 212, 0.5)' : 'rgba(255,255,255,0.05)',
                  }}>
                    <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '16px', color: i < (memory?.sessionCount || 0) ? '#06b6d4' : 'var(--nx-text-muted)' }}>
                      {num}
                    </span>
                    <span style={{ display: 'block', fontFamily: 'Space Mono, monospace', fontSize: '8px', color: 'var(--nx-text-muted)', marginTop: '4px' }}>
                      {i < (memory?.sessionCount || 0) ? 'LOGGED' : 'PENDING'}
                    </span>
                  </div>
                ))}
              </div>
            </motion.section>



            {/* Final Facility Activation CTA */}
            <motion.section 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="glass-panel" style={{ padding: '60px 40px', textAlign: 'center' }}>
              <span className="facility-label" style={{ display: 'block', marginBottom: '16px' }}>
                TERMINAL IDLE | AWAITING SUBJECT ENTRY
              </span>
              <p className="facility-label" style={{ color: 'var(--nx-text-dim)', marginBottom: '40px' }}>
                Calibration required to construct subject memory profile.
              </p>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setView('flame');
                  if (typeof window !== 'undefined') window.dispatchEvent(new Event('nx-activate-magic'));
                }}
                className="glass-button"
                style={{
                  padding: '22px 56px',
                  color: '#ffffff',
                  fontFamily: 'Space Mono, monospace',
                  fontSize: '12px',
                  letterSpacing: '0.3em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                INITIATE CALIBRATION
              </motion.button>
            </motion.section>

            {/* Facility System Footer */}
            <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '40px', marginTop: '60px', borderTop: '1px solid rgba(8, 145, 178, 0.15)' }}>
              <span className="facility-label">OBSERVATORY FACILITY SYSTEM ONLINE</span>
              <div style={{ display: 'flex', gap: '20px' }}>
                <span className="facility-label">ENCRYPTED</span>
                <span className="facility-label">RESTRICTED</span>
              </div>
            </footer>
          </motion.div>
        )}

        {view === 'flame' && (
          <motion.div
            key="flame"
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
            {/* Back Button */}
            <button
              onClick={() => {
                setView('landing');
                if (typeof window !== 'undefined') window.dispatchEvent(new Event('nx-deactivate-magic'));
              }}
              style={{
                position: 'absolute', top: 32, left: 40,
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'Space Mono, monospace', fontSize: '10px',
                letterSpacing: '0.2em', color: 'var(--nx-text-muted)',
                textTransform: 'uppercase', transition: 'color 0.3s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(59,130,246,0.8)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--nx-text-muted)'}
            >
              ← Back
            </button>

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
                  initial={{ opacity: 0, scale: 0.5, x: '-50%' }}
                  animate={{ opacity: 1, scale: 1, x: '-50%' }}
                  style={{
                    position: 'absolute',
                    bottom: -20, left: '50%',
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
              transition={{ delay: 1, duration: 1 }}
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
