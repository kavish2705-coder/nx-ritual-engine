'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AnimeCandle, { CandleState as AnimeCandleState } from '../components/AnimeCandle';
import ParticleField from '../components/ParticleField';
import {
  NXMemory, getDaysSinceFirst, getDaysSinceLast,
  getLastEntry, Session,
} from '../lib/memory';

interface Props {
  memory: NXMemory;
  onBeginRitual: () => void;
  onDisconnect: () => void;
}

type NavItem = 'overview' | 'sessions' | 'memory-wall' | 'discrepancy' | 'insights';

export default React.memo(function DashboardView({ memory, onBeginRitual, onDisconnect }: Props) {
  const isCalibrated = memory.sessionCount >= 8;
  const [activeNav, setActiveNav] = useState<NavItem>('overview');
  const [candleState, setCandleState] = useState<AnimeCandleState>(isCalibrated ? 'extinguished' : 'ignition');

  useEffect(() => {
    if (isCalibrated) {
      setCandleState('extinguished');
      return;
    }
    const t = setTimeout(() => setCandleState('active'), 1500);
    return () => clearTimeout(t);
  }, [isCalibrated]);

  const days = getDaysSinceFirst(memory);
  const daysSinceLast = getDaysSinceLast(memory);
  const lastEntry = getLastEntry(memory);
  const totalUserMessages = memory.sessions.reduce(
    (sum, s) => sum + s.messages.filter(m => m.role === 'user').length, 0
  );

  // Calibration maths
  const calibrationPercent = Math.min(100, Math.round((memory.sessionCount / 8) * 100));

  const trendIcon = (trend: string | undefined) => {
    if (trend === 'up') return '↑';
    if (trend === 'down') return '↓';
    return '→';
  };

  const trendColor = (trend: string | undefined) => {
    if (trend === 'up') return 'rgba(96, 165, 250, 0.8)'; // bright blue
    if (trend === 'down') return 'rgba(59, 130, 246, 0.4)';  // dim blue
    return 'var(--nx-text-muted)';
  };

  // Safe check for memory properties
  const trends = (memory as any).trends || {};
  const behavioralPatterns = memory.behavioralPatterns || [];
  const discrepancyLog = memory.discrepancyLog || [];
  const knownFacts = memory.knownFacts || [];

  const traitEntries = [
    { key: 'Avoidance', value: memory.traits.avoidance, desc: 'Delays facing undefined outcomes', trend: trends.avoidance },
    { key: 'Overthinking', value: memory.traits.overthinking, desc: 'Circular reasoning patterns', trend: trends.overthinking },
    { key: 'Inconsistency', value: memory.traits.inconsistency, desc: 'Gap between values and actions', trend: trends.inconsistency },
    { key: 'Stress Response', value: memory.traits.stressResponse, desc: 'Reaction under pressure', trend: trends.stressResponse },
  ];

  // Compute a "clarity score" (inverse of avg trait)
  const avgTrait = traitEntries.reduce((s, t) => s + t.value, 0) / 4;
  const clarityScore = Math.max(0, Math.min(100, Math.round(100 - avgTrait)));

  const currentState = (() => {
    if (!isCalibrated) return 'Calibrating';
    if (memory.traits.overthinking > 60) return 'Overthinking';
    if (memory.traits.avoidance > 60) return 'Avoidance';
    if (memory.traits.stressResponse > 60) return 'High Stress';
    if (memory.traits.inconsistency > 60) return 'Inconsistency';
    if (clarityScore > 70) return 'Clarity';
    return 'Processing';
  })();

  const navItems: { id: NavItem; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'sessions', label: 'Sessions' },
    { id: 'memory-wall', label: 'Memory Wall' },
    { id: 'discrepancy', label: 'Discrepancies' },
    { id: 'insights', label: 'Insights' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: '#030507',
    }}>
      <ParticleField />
      
      {/* Scanline Overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
        backgroundSize: '100% 4px, 6px 100%',
      }} />

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -30, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        style={{
          width: '220px', flexShrink: 0,
          borderRight: '1px solid rgba(59,130,246,0.08)',
          display: 'flex', flexDirection: 'column',
          padding: '32px 16px',
          zIndex: 2,
          backdropFilter: 'blur(10px)',
          background: 'rgba(6, 10, 15, 0.4)',
        }}
      >
        {/* Logo */}
        <div style={{ marginBottom: '40px', padding: '0 4px' }}>
          <span style={{
            fontFamily: 'Space Mono, monospace',
            fontSize: '13px', letterSpacing: '0.3em',
            color: 'rgba(59,130,246,0.5)',
          }}>N X</span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className={`nx-nav-item ${activeNav === item.id ? 'active' : ''}`}
              style={{ border: 'none', width: '100%', textAlign: 'left' }}
            >
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Candle state indicator */}
        <div style={{
          padding: '16px 4px',
          borderTop: '1px solid rgba(59,130,246,0.08)',
          marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'rgba(59,130,246,0.6)',
              boxShadow: '0 0 8px rgba(59,130,246,0.4)',
            }} />
            <span style={{ fontSize: '10px', letterSpacing: '0.12em', color: 'var(--nx-text-muted)', textTransform: 'uppercase' }}>
              Flame: {memory.flameState}
            </span>
          </div>
          <div style={{ transform: 'scale(0.35)', transformOrigin: 'top left', height: '120px', marginTop: '-20px' }}>
            <AnimeCandle state={candleState} />
          </div>
        </div>

        {/* Disconnect */}
        <button
          onClick={onDisconnect}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            textAlign: 'left', padding: '8px 4px',
            fontSize: '10px', letterSpacing: '0.12em',
            color: 'var(--nx-text-muted)', textTransform: 'uppercase',
            transition: 'color 0.2s ease',
            marginBottom: '4px',
          }}
        >
          · Disconnect
        </button>

        {/* Purge Telemetry */}
        <button
          onClick={() => {
            if (confirm("Are you sure you want to purge all telemetry? This action is irreversible.")) {
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
            }
          }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            textAlign: 'left', padding: '8px 4px',
            fontSize: '10px', letterSpacing: '0.12em',
            color: 'rgba(239, 68, 68, 0.45)', textTransform: 'uppercase',
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(239, 68, 68, 0.8)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(239, 68, 68, 0.45)'}
        >
          · Purge system
        </button>
      </motion.aside>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', zIndex: 2, overflowY: 'auto' }}>
        {/* Top bar */}
        <motion.header
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '24px 40px',
            borderBottom: '1px solid rgba(59,130,246,0.06)',
            background: 'rgba(6, 10, 15, 0.2)',
          }}
        >
          <div>
            <p style={{ fontSize: '12px', color: 'var(--nx-text-muted)', letterSpacing: '0.05em', marginBottom: '2px' }}>
              {daysSinceLast === 0 ? 'Observed today' : `Last seen ${daysSinceLast} day${daysSinceLast !== 1 ? 's' : ''} ago`}
            </p>
            <h1 style={{
              fontSize: 'clamp(20px, 3vw, 32px)',
              fontWeight: 300,
              color: 'var(--nx-text)',
              letterSpacing: '0.02em',
            }}>
              {memory.userId}.
            </h1>
          </div>
          {!isCalibrated && (
            <motion.button
              onClick={onBeginRitual}
              whileHover={{ scale: 1.02, borderColor: 'rgba(59,130,246,0.5)' }}
              whileTap={{ scale: 0.98 }}
              style={{
                padding: '10px 28px',
                background: 'rgba(59,130,246,0.06)',
                border: '1px solid rgba(59,130,246,0.2)',
                borderRadius: '4px',
                color: 'rgba(96,165,250,0.8)',
                cursor: 'pointer',
                fontFamily: 'Space Mono, monospace',
                fontSize: '11px',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                transition: 'all 0.2s ease',
              }}
            >
              Begin ritual
            </motion.button>
          )}
        </motion.header>

        {/* Content area */}
        <div style={{ flex: 1, padding: '40px' }}>
          <AnimatePresence mode="wait">
            {activeNav === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                {/* Stats row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '1px',
                  border: '1px solid rgba(59,130,246,0.08)',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  marginBottom: '40px',
                }}>
                  {[
                    { label: 'Days observed', value: days.toString() },
                    { label: 'Telemetry Acquired', value: `${calibrationPercent}%` },
                    { label: 'Confidence', value: memory.sessionCount < 3 ? 'Low' : memory.sessionCount < 6 ? 'Moderate' : 'High' },
                    { label: 'Behavioral Model', value: isCalibrated ? 'Calibrated' : 'Incomplete' },
                  ].map((stat, i) => (
                    <div key={i} style={{
                      padding: '28px 24px',
                      background: 'rgba(6,10,15,0.6)',
                      borderRight: i < 3 ? '1px solid rgba(59,130,246,0.08)' : 'none',
                    }}>
                      <p style={{
                        fontSize: '11px', letterSpacing: '0.1em',
                        color: 'var(--nx-text-muted)', textTransform: 'uppercase',
                        marginBottom: '12px',
                      }}>
                        {stat.label}
                      </p>
                      <p style={{
                        fontFamily: 'Space Mono, monospace',
                        fontSize: '24px', color: 'var(--nx-text)',
                        fontWeight: 400,
                      }}>
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Calibration progress bar (if not calibrated) */}
                {!isCalibrated && (
                  <div style={{
                    border: '1px solid rgba(59,130,246,0.08)',
                    borderRadius: '6px', padding: '24px 28px',
                    background: 'rgba(6,10,15,0.6)',
                    marginBottom: '40px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontSize: '11px', letterSpacing: '0.15em', color: 'var(--nx-text-dim)', textTransform: 'uppercase' }}>
                        Calibration Baseline Progress
                      </span>
                      <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '11px', color: 'var(--nx-blue-bright)' }}>
                        {memory.sessionCount} / 8 logs recorded
                      </span>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(59,130,246,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${calibrationPercent}%`,
                        background: 'linear-gradient(90deg, #1d4ed8, #60a5fa)',
                        boxShadow: '0 0 10px rgba(96, 165, 250, 0.4)',
                        transition: 'width 1s ease-out'
                      }} />
                    </div>
                    <p style={{ fontSize: '10px', color: 'var(--nx-text-muted)', marginTop: '8px' }}>
                      NX requires 8 complete telemetry logs to generate your clinical behavioral model.
                    </p>
                  </div>
                )}

                {/* Last entry + Current state */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '40px' }}>
                  <div style={{
                    border: '1px solid rgba(59,130,246,0.08)',
                    borderRadius: '6px', padding: '28px',
                    background: 'rgba(6,10,15,0.6)',
                  }}>
                    <p style={{
                      fontSize: '10px', letterSpacing: '0.15em',
                      color: 'var(--nx-text-muted)', textTransform: 'uppercase',
                      marginBottom: '20px',
                    }}>Last entry summary</p>
                    {memory.sessions.length > 0 && memory.sessions[memory.sessions.length - 1].summary ? (
                      <>
                        <p style={{
                          fontSize: '13px', color: 'var(--nx-text)',
                          lineHeight: 1.6, fontStyle: 'italic',
                          marginBottom: '16px',
                        }}>
                          &ldquo;{memory.sessions[memory.sessions.length - 1].summary}&rdquo;
                        </p>
                        <p style={{ fontSize: '11px', color: 'var(--nx-text-muted)' }}>
                          {new Date(memory.sessions[memory.sessions.length - 1].startedAt).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })}
                        </p>
                      </>
                    ) : lastEntry ? (
                      <>
                        <p style={{
                          fontSize: '13px', color: 'var(--nx-text)',
                          lineHeight: 1.6, fontStyle: 'italic',
                          marginBottom: '16px',
                        }}>
                          &ldquo;{lastEntry.content.slice(0, 150)}...&rdquo;
                        </p>
                        <p style={{ fontSize: '11px', color: 'var(--nx-text-muted)' }}>
                          {new Date(lastEntry.timestamp).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })}
                        </p>
                      </>
                    ) : (
                      <p style={{ fontSize: '13px', color: 'var(--nx-text-muted)', fontStyle: 'italic' }}>
                        No entries yet.
                      </p>
                    )}
                  </div>

                  <div style={{
                    border: '1px solid rgba(59,130,246,0.08)',
                    borderRadius: '6px', padding: '28px',
                    background: 'rgba(6,10,15,0.6)',
                  }}>
                    <p style={{
                      fontSize: '10px', letterSpacing: '0.15em',
                      color: 'var(--nx-text-muted)', textTransform: 'uppercase',
                      marginBottom: '20px',
                    }}>Current state</p>
                    <p style={{
                      fontSize: '24px', fontWeight: 300,
                      color: 'var(--nx-blue-bright)',
                      marginBottom: '12px', letterSpacing: '0.02em',
                    }}>
                      {currentState}
                    </p>

                    {/* Waveform */}
                    <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '30px' }}>
                      {Array.from({ length: 20 }, (_, i) => (
                        <div
                          key={i}
                          className="wave-bar"
                          style={{
                            height: `${20 + Math.sin(i * 0.8) * 10}px`,
                            animationDelay: `${i * 0.08}s`,
                            opacity: 0.4 + (i % 4) * 0.1,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Trait bars */}
                <div style={{
                  border: '1px solid rgba(59,130,246,0.08)',
                  borderRadius: '6px', padding: '28px',
                  background: 'rgba(6,10,15,0.6)',
                }}>
                  <p style={{
                    fontSize: '10px', letterSpacing: '0.15em',
                    color: 'var(--nx-text-muted)', textTransform: 'uppercase',
                    marginBottom: '28px',
                  }}>Behavioral profile</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {traitEntries.map(trait => (
                      <div key={trait.key}>
                        <div style={{
                          display: 'flex', justifyContent: 'space-between',
                          marginBottom: '8px',
                        }}>
                          <span style={{ fontSize: '12px', color: 'var(--nx-text-dim)', letterSpacing: '0.05em' }}>
                            {trait.key}
                          </span>
                          {isCalibrated ? (
                            <span style={{
                              fontFamily: 'Space Mono, monospace',
                              fontSize: '11px', color: 'var(--nx-text-muted)',
                            }}>
                              {trait.value}%
                            </span>
                          ) : (
                            <span style={{
                              fontFamily: 'Space Mono, monospace',
                              fontSize: '13px',
                              fontWeight: 'bold',
                              color: trendColor(trait.trend),
                            }}>
                              Telemetry Incomplete ({trendIcon(trait.trend)})
                            </span>
                          )}
                        </div>
                        {isCalibrated && (
                          <div style={{
                            height: '2px',
                            background: 'rgba(59,130,246,0.08)',
                            borderRadius: '1px',
                            overflow: 'hidden',
                          }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${trait.value}%` }}
                              transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
                              style={{
                                height: '100%',
                                background: 'linear-gradient(90deg, #1d4ed8, #60a5fa)',
                                borderRadius: '1px',
                              }}
                            />
                          </div>
                        )}
                        <p style={{ fontSize: '10px', color: 'var(--nx-text-muted)', marginTop: '4px' }}>
                          {trait.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeNav === 'sessions' && (
              <motion.div
                key="sessions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h2 style={{
                  fontSize: '14px', fontWeight: 400,
                  color: 'var(--nx-text-dim)', letterSpacing: '0.1em',
                  textTransform: 'uppercase', marginBottom: '32px',
                }}>Session history</h2>

                {memory.sessions.length === 0 ? (
                  <p style={{ color: 'var(--nx-text-muted)', fontStyle: 'italic', fontSize: '14px' }}>
                    No sessions recorded.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {[...memory.sessions].reverse().map((session: Session, i) => {
                      const userMessages = session.messages.filter(m => m.role === 'user');
                      const duration = session.endedAt
                        ? Math.round((session.endedAt - session.startedAt) / 60000)
                        : null;
                      return (
                        <motion.div
                          key={session.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          style={{
                            border: '1px solid rgba(59,130,246,0.08)',
                            borderRadius: '6px', padding: '24px',
                            background: 'rgba(6,10,15,0.6)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '11px', color: 'var(--nx-text-dim)' }}>
                              Session {memory.sessions.length - i}
                            </p>
                            <p style={{ fontSize: '11px', color: 'var(--nx-text-muted)' }}>
                              {new Date(session.startedAt).toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric',
                              })}
                              {duration ? ` · ${duration}m` : ''}
                            </p>
                          </div>
                          {session.summary && (
                            <p style={{ fontSize: '13px', color: 'var(--nx-text)', fontWeight: 'bold', marginBottom: '10px' }}>
                              Summary: {session.summary}
                            </p>
                          )}
                          <p style={{ fontSize: '13px', color: 'var(--nx-text-muted)', marginBottom: '12px' }}>
                            {userMessages.length} exchange{userMessages.length !== 1 ? 's' : ''}
                          </p>
                          {userMessages[0] && (
                            <p style={{ fontSize: '13px', color: 'var(--nx-text-dim)', fontStyle: 'italic', lineHeight: 1.6 }}>
                              &ldquo;{userMessages[0].content.slice(0, 120)}{userMessages[0].content.length > 120 ? '…' : ''}&rdquo;
                            </p>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {activeNav === 'memory-wall' && (
              <motion.div
                key="memory-wall"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h2 style={{
                  fontSize: '14px', fontWeight: 400,
                  color: 'var(--nx-text-dim)', letterSpacing: '0.1em',
                  textTransform: 'uppercase', marginBottom: '32px',
                }}>Behavioral Memory Wall</h2>

                {behavioralPatterns.length === 0 ? (
                  <div style={{
                    border: '1px solid rgba(59,130,246,0.08)',
                    borderRadius: '6px', padding: '40px',
                    background: 'rgba(6,10,15,0.6)', textAlign: 'center',
                  }}>
                    <p style={{ color: 'var(--nx-text-muted)', fontSize: '13px', fontStyle: 'italic' }}>
                      Insufficient data.<br />
                      <span style={{ fontSize: '11px', marginTop: '8px', display: 'block' }}>
                        Patterns emerge and activate dynamically after multiple sessions.
                      </span>
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                    {behavioralPatterns.map((pattern, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '20px 24px',
                          border: `1px solid ${pattern.status === 'active' ? 'rgba(59,130,246,0.18)' : 'rgba(59,130,246,0.08)'}`,
                          borderRadius: '6px',
                          background: pattern.status === 'active' ? 'rgba(59,130,246,0.02)' : 'rgba(6,10,15,0.6)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                          <span style={{ color: pattern.status === 'active' ? 'var(--nx-blue-bright)' : 'var(--nx-text-muted)', fontSize: '12px', marginTop: '2px' }}>
                            {pattern.status === 'active' ? '●' : '○'}
                          </span>
                          <div>
                            <p style={{ fontSize: '14px', color: 'var(--nx-text)', lineHeight: 1.6, fontWeight: 400 }}>
                              {pattern.name}
                            </p>
                            <p style={{ fontSize: '10px', color: 'var(--nx-text-muted)', marginTop: '4px' }}>
                              Last observed: {new Date(pattern.lastUpdated).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <span style={{
                          fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '0.1em',
                          padding: '3px 8px', borderRadius: '3px',
                          border: `1px solid ${pattern.status === 'active' ? 'rgba(96,165,250,0.3)' : 'rgba(59,130,246,0.08)'}`,
                          color: pattern.status === 'active' ? 'var(--nx-blue-bright)' : 'var(--nx-text-muted)',
                          textTransform: 'uppercase'
                        }}>
                          {pattern.status}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeNav === 'discrepancy' && (
              <motion.div
                key="discrepancy"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h2 style={{
                  fontSize: '14px', fontWeight: 400,
                  color: 'var(--nx-text-dim)', letterSpacing: '0.1em',
                  textTransform: 'uppercase', marginBottom: '32px',
                }}>Discrepancy Log</h2>

                {discrepancyLog.length === 0 ? (
                  <div style={{
                    border: '1px solid rgba(59,130,246,0.08)',
                    borderRadius: '6px', padding: '40px',
                    background: 'rgba(6,10,15,0.6)', textAlign: 'center',
                  }}>
                    <p style={{ color: 'var(--nx-text-muted)', fontSize: '13px', fontStyle: 'italic' }}>
                      No contradictions logged.<br />
                      <span style={{ fontSize: '11px', marginTop: '8px', display: 'block' }}>
                        NX logs inconsistencies between your claims and your actions.
                      </span>
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {discrepancyLog.map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        style={{
                          border: '1px solid rgba(239, 68, 68, 0.15)',
                          borderRadius: '6px', padding: '24px',
                          background: 'rgba(239, 68, 68, 0.01)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <span style={{
                            fontFamily: 'Space Mono, monospace', fontSize: '9px', letterSpacing: '0.1em',
                            padding: '3px 8px', borderRadius: '3px',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: 'rgba(239, 68, 68, 0.8)',
                            textTransform: 'uppercase'
                          }}>
                            Contradiction Detected
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--nx-text-muted)' }}>
                            Occurrences: {item.occurrences}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                          <div>
                            <p style={{ fontSize: '10px', color: 'var(--nx-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Stated Claim</p>
                            <p style={{ fontSize: '13px', color: 'var(--nx-text-dim)', fontStyle: 'italic' }}>
                              &ldquo;{item.claim}&rdquo;
                            </p>
                          </div>
                          <div style={{ borderLeft: '1px solid rgba(59,130,246,0.08)', paddingLeft: '20px' }}>
                            <p style={{ fontSize: '10px', color: 'var(--nx-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Observed Action</p>
                            <p style={{ fontSize: '13px', color: 'var(--nx-text)', fontWeight: 300 }}>
                              {item.observed}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeNav === 'insights' && (
              <motion.div
                key="insights"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h2 style={{
                  fontSize: '14px', fontWeight: 400,
                  color: 'var(--nx-text-dim)', letterSpacing: '0.1em',
                  textTransform: 'uppercase', marginBottom: '32px',
                }}>System insights</h2>

                <div style={{
                  border: '1px solid rgba(59,130,246,0.08)',
                  borderRadius: '6px', padding: '40px',
                  background: 'rgba(6,10,15,0.6)',
                }}>
                  {!isCalibrated ? (
                    <p style={{ color: 'var(--nx-text-muted)', fontSize: '13px', lineHeight: 1.8, fontStyle: 'italic' }}>
                      NX baseline calibration in progress.<br />
                      Full system analysis unlocks after 8 sessions.<br />
                      <span style={{ color: 'rgba(59,130,246,0.4)', fontFamily: 'Space Mono, monospace', display: 'block', marginTop: '12px' }}>
                        {8 - memory.sessionCount} calibration log{8 - memory.sessionCount !== 1 ? 's' : ''} remaining.
                      </span>
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                      {/* Known Facts File */}
                      {knownFacts.length > 0 && (
                        <div>
                          <p style={{
                            fontFamily: 'Space Mono, monospace', fontSize: '11px',
                            color: 'var(--nx-blue-bright)', textTransform: 'uppercase',
                            letterSpacing: '0.15em', marginBottom: '16px',
                            borderBottom: '1px solid rgba(59,130,246,0.08)', paddingBottom: '8px'
                          }}>
                            Known Facts About You
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {knownFacts.map((fact, index) => (
                              <div key={index} style={{
                                padding: '12px 16px', borderRadius: '4px',
                                border: '1px solid rgba(59,130,246,0.1)',
                                background: 'rgba(6, 10, 15, 0.4)',
                                fontSize: '13px', color: 'var(--nx-text-dim)',
                                lineHeight: '1.6'
                              }}>
                                &gt; {fact}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Primary Diagnostic Summary */}
                      <div>
                        <p style={{
                          fontFamily: 'Space Mono, monospace', fontSize: '11px',
                          color: 'var(--nx-blue-bright)', textTransform: 'uppercase',
                          letterSpacing: '0.15em', marginBottom: '12px'
                        }}>
                          Behavioral Diagnosis
                        </p>
                        <p style={{ fontSize: '15px', fontWeight: 300, color: 'var(--nx-text)', lineHeight: 1.7 }}>
                          Based on 8 complete telemetry logs, your dominant behavioral profile is characterized by high {traitEntries.sort((a, b) => b.value - a.value)[0].key.toLowerCase()} responses.
                          Observations show persistent choices reflecting this pattern across both professional and personal environments.
                        </p>
                      </div>

                      {/* Clinical Reflection */}
                      <div>
                        <p style={{
                          fontFamily: 'Space Mono, monospace', fontSize: '11px',
                          color: 'var(--nx-blue-bright)', textTransform: 'uppercase',
                          letterSpacing: '0.15em', marginBottom: '12px'
                        }}>
                          Observer Reflection
                        </p>
                        <p style={{ fontSize: '14px', fontWeight: 300, color: 'var(--nx-text-dim)', lineHeight: 1.7 }}>
                          You have engaged {memory.sessionCount} times.
                          The contradiction logs indicate gaps in consistency between stated goals and concrete actions.
                          No encouragement is offered. The observed telemetry suggests you continue logs to monitor if these patterns resolve or entrench.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 40px',
          borderTop: '1px solid rgba(59,130,246,0.06)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(6, 10, 15, 0.1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: 5, height: 5, borderRadius: '50%',
              background: 'rgba(59,130,246,0.5)',
            }} />
            <span style={{ fontSize: '10px', color: 'var(--nx-text-muted)', letterSpacing: '0.1em' }}>
              The entity learns from everything you share.
            </span>
          </div>
          <span style={{ fontSize: '10px', color: 'var(--nx-text-muted)', letterSpacing: '0.1em' }}>
            All sessions are private and encrypted locally.
          </span>
        </div>
      </div>
    </div>
  );
});
