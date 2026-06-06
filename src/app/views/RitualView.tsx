'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AnimeCandle, { CandleState as AnimeCandleState } from '../components/AnimeCandle';
import MistyParticles from '../components/MistyParticles';
import ParticleField from '../components/ParticleField';
import {
  NXMemory, Session, Message,
  createSession, addMessage, saveMemory,
  buildSystemPrompt, getDaysSinceLast,
} from '../lib/memory';

interface Props {
  memory: NXMemory;
  onEnd: (memory: NXMemory) => void;
}

type CandleState = AnimeCandleState;

const SmokeParticle = ({ index }: { index: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 0, x: 0, scale: 0.5 }}
      animate={{
        opacity: [0, 0.35, 0.15, 0],
        y: -160 - Math.random() * 120,
        x: -40 - Math.random() * 80,
        scale: [0.5, 2.5, 4.5],
      }}
      transition={{
        duration: 3.2 + Math.random() * 1.8,
        delay: index * 0.12,
        ease: 'easeOut',
      }}
      style={{
        position: 'absolute',
        width: '7px',
        height: '7px',
        borderRadius: '50%',
        background: 'rgba(150, 165, 185, 0.22)',
        filter: 'blur(4px)',
        bottom: '100px',
        right: '48px',
      }}
    />
  );
};

export default function RitualView({ memory, onEnd }: Props) {
  const [session] = useState<Session>(() => createSession());
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  
  const [phase, setPhase] = useState<'briefing' | 'active' | 'limit'>('briefing');
  const [step, setStep] = useState<0 | 1>(0); // 0 = typewriter instructions, 1 = narrative entry
  const [narrative, setNarrative] = useState('');

  const [candleState, setCandleState] = useState<CandleState>('ignition');
  const [finalEndingPhase, setFinalEndingPhase] = useState<'none' | 'extinguishing' | 'smoke' | 'over'>('none');
  const [exchangeCount, setExchangeCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const apiKey = typeof window !== 'undefined' ? localStorage.getItem('nx_api_key') || '' : '';

  // --- Dynamic Typewriter Instruction Selection ---
  const getInstructionsText = (count: number) => {
    if (count === 0) {
      return [
        "You are already structuring a narrative to make yourself look reasonable.",
        "Stop.",
        "Think of the exact moment you took the easy way out.",
        "The conversation you sidestepped.",
        "Write down what happened.",
        "Leave out the part where you felt bad about it.",
        "Just the events."
      ];
    } else if (count === 1) {
      return [
        "There is a recent interaction that is still bothering you.",
        "You already know which one it is.",
        "The one you keep replaying in your head to prove you were right.",
        "Write it down.",
        "Include the exact detail you usually leave out to ensure others side with you."
      ];
    } else if (count === 2) {
      return [
        "You judge others for flaws you secretly share.",
        "Think of a rule you expect everyone else to follow.",
        "Now recall the moment you quietly broke it.",
        "You convinced yourself you had a good reason.",
        "You did not.",
        "Describe the exact gap between the person you claim to be, and the person you actually are."
      ];
    } else if (count === 3) {
      return [
        "You use confusion as a hiding place.",
        "There is a choice you are actively delaying.",
        "You pretend you need more information before you act.",
        "You do not. You already know what has to be done.",
        "You are just terrified of the fallout.",
        "Stop hiding behind fake logic.",
        "Name the decision you are too scared to make."
      ];
    } else if (count === 4) {
      return [
        "It is easy to be decent when nothing is at stake.",
        "Think about the last time you were truly cornered.",
        "The exact moment the pressure hit.",
        "You panicked, lashed out, or quietly let someone else take the fall.",
        "Do not write about the problem itself.",
        "Write about the moment your character broke."
      ];
    } else if (count === 5) {
      return [
        "There is a fire you are pretending not to smell.",
        "An unread text.",
        "A hard conversation.",
        "A boundary you are afraid to draw.",
        "You are hoping the problem will just die of old age if you wait long enough.",
        "It will not.",
        "Stop looking away. State exactly what you are ignoring."
      ];
    } else if (count === 6) {
      return [
        "You keep acting surprised by the traps you set for yourself.",
        "The faces change, but your script never does.",
        "You just played the exact same role in a very familiar disaster.",
        "Think of the moment you saw all the warning signs.",
        "And chose to walk right past them anyway.",
        "Write it down."
      ];
    } else {
      return [
        "This is the final pass.",
        "Everything you have shared so far was just the warmup.",
        "There is a specific incident you have deliberately kept out of these logs.",
        "The one you are desperately hoping does not count.",
        "The one making you hold your breath right now.",
        "The act is over.",
        "Write it down."
      ];
    }
  };

  const sentences = useMemo(() => getInstructionsText(memory.sessionCount), [memory.sessionCount]);
  const [typedLines, setTypedLines] = useState<string[]>([]);
  const [currentLineText, setCurrentLineText] = useState("");
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState(0);
  const [isTypingComplete, setIsTypingComplete] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (phase !== 'briefing' || step !== 0) return;

    const sentence = sentences[currentSentenceIdx];
    if (!sentence) {
      setIsTypingComplete(true);
      return;
    }

    let charIdx = 0;
    setCurrentLineText(""); 

    const typeChar = () => {
      if (charIdx < sentence.length) {
        const nextChar = sentence[charIdx];
        if (nextChar !== undefined) {
          setCurrentLineText(prev => prev + nextChar);
          charIdx++;
          timerRef.current = setTimeout(typeChar, 60); 
        }
      } else {
        timerRef.current = setTimeout(() => {
          setTypedLines(prev => [...prev, sentence]);
          setCurrentLineText("");
          setCurrentSentenceIdx(prev => prev + 1);
        }, 1200);
      }
    };

    timerRef.current = setTimeout(typeChar, 400);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentSentenceIdx, phase, step, sentences]);

  // Handle messages scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Candle ignition
  useEffect(() => {
    if (phase === 'active') {
      setCandleState('ignition');
      const t = setTimeout(() => setCandleState('active'), 1500);
      return () => clearTimeout(t);
    }
  }, [phase]);

  // Send the first narrative message
  const sendFirstMessage = async (story: string) => {
    setLoading(true);
    setPhase('active');
    
    const userMsg: Message = { role: 'user', content: story, timestamp: Date.now() };
    setMessages([userMsg]);
    setExchangeCount(1);

    try {
      const systemPrompt = buildSystemPrompt(memory);
      const res = await fetch('/api/nx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [userMsg],
          systemPrompt,
          apiKey,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const nxMsg: Message = {
        role: 'nx',
        content: data.response,
        timestamp: Date.now(),
      };
      setMessages(m => [...m, nxMsg]);
    } catch (err) {
      const errText = err instanceof Error ? err.message : 'Signal lost.';
      const errMsg: Message = {
        role: 'nx',
        content: errText,
        timestamp: Date.now(),
      };
      setMessages(m => [...m, errMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  // Send subsequent messages
  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading || phase === 'limit') return;

    const newUserMsg: Message = { role: 'user', content: trimmed, timestamp: Date.now() };
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setInput('');

    const newCount = exchangeCount + 1;
    setExchangeCount(newCount);

    // Check limit
    if (newCount >= 20) {
      setLoading(true);
      setTimeout(() => {
        const limitMsg: Message = {
          role: 'nx',
          content: 'Session duration exceeds recommended threshold. Disengage.',
          timestamp: Date.now(),
        };
        setMessages(m => [...m, limitMsg]);
        setLoading(false);
        setPhase('limit');
      }, 1500);
      return;
    }

    // Meaningful Silence - 15% random pause
    const isRandomPause = newCount > 1 && Math.random() < 0.15;
    if (isRandomPause) {
      setLoading(true);
      setTimeout(() => {
        const acceptMsg: Message = {
          role: 'nx',
          content: 'Analyzing...\nResponse accepted. Continue.',
          timestamp: Date.now(),
        };
        setMessages(m => [...m, acceptMsg]);
        setLoading(false);
      }, 3500);
      return;
    }

    setLoading(true);
    try {
      const systemPrompt = buildSystemPrompt(memory);

      const res = await fetch('/api/nx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          systemPrompt,
          apiKey,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const nxMsg: Message = {
        role: 'nx',
        content: data.response,
        timestamp: Date.now(),
      };

      setMessages(m => [...m, nxMsg]);
    } catch (err) {
      const errText = err instanceof Error ? err.message : 'Signal lost.';
      const errMsg: Message = {
        role: 'nx',
        content: errText,
        timestamp: Date.now(),
      };
      setMessages(m => [...m, errMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [input, loading, phase, messages, exchangeCount, memory, apiKey]);

  // End session with full AI analysis
  const handleEnd = async () => {
    setAnalyzing(true);

    const finalSession = messages.reduce(
      (s, m) => addMessage(s, m.role, m.content),
      session
    );

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: memory.userId,
          session: finalSession,
          apiKey,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const updatedMemory = data.data;

      const triggerFinalAnimationAndEnd = (mem: NXMemory) => {
        const isFinalSession = mem.sessionCount === 8;
        if (isFinalSession) {
          setCandleState('unstable');
          setTimeout(() => {
            setFinalEndingPhase('extinguishing');
            setCandleState('extinguished');
          }, 2500);
          setTimeout(() => {
            setFinalEndingPhase('smoke');
          }, 4000);
          setTimeout(() => {
            setFinalEndingPhase('over');
          }, 6300);
          setTimeout(() => {
            onEnd(mem);
          }, 10800);
        } else {
          onEnd(mem);
        }
      };

      triggerFinalAnimationAndEnd(updatedMemory);

    } catch (err) {
      console.error("Analysis failed, saving session baseline fallback", err);
      const updatedMemory: NXMemory = {
        ...memory,
        sessions: [...memory.sessions, { ...finalSession, endedAt: Date.now() }],
        totalEntries: memory.totalEntries + messages.filter(m => m.role === 'user').length,
        lastActive: Date.now(),
        sessionCount: memory.sessionCount + 1,
        flameState: candleState,
      };

      // Try to save baseline to server if possible
      fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedMemory)
      }).catch(e => console.error('Failed to save baseline memory on server', e));

      const triggerFinalAnimationAndEnd = (mem: NXMemory) => {
        const isFinalSession = mem.sessionCount === 8;
        if (isFinalSession) {
          setCandleState('unstable');
          setTimeout(() => {
            setFinalEndingPhase('extinguishing');
            setCandleState('extinguished');
          }, 2500);
          setTimeout(() => {
            setFinalEndingPhase('smoke');
          }, 4000);
          setTimeout(() => {
            setFinalEndingPhase('over');
          }, 6300);
          setTimeout(() => {
            onEnd(mem);
          }, 10800);
        } else {
          onEnd(mem);
        }
      };

      triggerFinalAnimationAndEnd(updatedMemory);
    } finally {
      setAnalyzing(false);
    }
  };

  // Rendering the loading overlay when processing analysis
  if (analyzing) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', backgroundColor: '#030507',
        color: 'var(--nx-text)', position: 'relative', overflow: 'hidden'
      }}>
        <ParticleField />
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none',
          background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
          backgroundSize: '100% 4px, 6px 100%',
        }} />
        <motion.div
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ zIndex: 10, textAlign: 'center' }}
        >
          <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '12px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--nx-blue-bright)', marginBottom: '16px' }}>
            NX Behavioral Engine
          </p>
          <p style={{ fontSize: '14px', letterSpacing: '0.1em', color: 'var(--nx-text-dim)' }}>
            Processing session telemetry...
          </p>
        </motion.div>
      </div>
    );
  }

  // Briefing page
  if (phase === 'briefing') {
    return (
      <div style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        color: 'var(--nx-text)',
        backgroundColor: '#030507',
      }}>
        <MistyParticles intensity="observing" />

        <div style={{
          position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none',
          background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
          backgroundSize: '100% 4px, 6px 100%',
        }} />

        <div style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: '600px',
          width: '100%',
          padding: '40px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
        }}>
          {step === 0 ? (
            <div className="glass" style={{ padding: '40px', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.15)' }}>
              <h1 style={{
                fontFamily: 'Space Mono, monospace',
                fontSize: '13px',
                letterSpacing: '0.25em',
                color: 'var(--nx-blue-bright)',
                textTransform: 'uppercase',
                marginBottom: '32px',
                borderBottom: '1px solid rgba(59,130,246,0.15)',
                paddingBottom: '12px'
              }}>
                read carefully
              </h1>

              <div className="font-mono text-left" style={{ lineHeight: '1.8', fontSize: '13px' }}>
                {typedLines.map((line, i) => (
                  <div key={i} style={{ color: 'var(--nx-text)', marginBottom: '16px', letterSpacing: '0.05em' }}>
                    &gt; {line}
                  </div>
                ))}
                {!isTypingComplete && (
                  <div style={{ color: 'var(--nx-blue-bright)', letterSpacing: '0.05em' }} className="nx-cursor">
                    &gt; {currentLineText}
                  </div>
                )}
              </div>

              {isTypingComplete && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setStep(1)}
                  style={{
                    marginTop: '40px',
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(59,130,246,0.08)',
                    border: '1px solid rgba(59,130,246,0.3)',
                    borderRadius: '4px',
                    color: 'rgba(96,165,250,0.8)',
                    fontFamily: 'Space Mono, monospace',
                    fontSize: '11px',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                  whileHover={{
                    background: 'rgba(59,130,246,0.15)',
                    borderColor: 'rgba(59,130,246,0.6)',
                  }}
                >
                  proceed
                </motion.button>
              )}
            </div>
          ) : (
            <div className="glass" style={{ padding: '40px', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.15)' }}>
              <h1 style={{
                fontFamily: 'Space Mono, monospace',
                fontSize: '13px',
                letterSpacing: '0.25em',
                color: 'var(--nx-blue-bright)',
                textTransform: 'uppercase',
                marginBottom: '24px',
                borderBottom: '1px solid rgba(59,130,246,0.15)',
                paddingBottom: '12px'
              }}>
                Telemetry Narrative Ingestion
              </h1>
              
              <p style={{
                fontSize: '13px',
                color: 'var(--nx-text-dim)',
                lineHeight: '1.6',
                marginBottom: '24px',
              }}>
                Formulate your narrative. Detail a specific, recent event, your actions, and what you avoided. The system requires raw telemetry to calibrate.
              </p>

              <textarea
                value={narrative}
                onChange={e => setNarrative(e.target.value)}
                placeholder="Paste or type your narrative incident here... (minimum 45 characters)"
                style={{
                  width: '100%',
                  height: '160px',
                  background: 'rgba(3, 5, 8, 0.6)',
                  border: '1px solid rgba(59,130,246,0.15)',
                  borderRadius: '4px',
                  color: 'var(--nx-text)',
                  padding: '16px',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  fontFamily: 'inherit',
                  outline: 'none',
                  resize: 'none',
                  transition: 'border-color 0.3s ease',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(59,130,246,0.4)'}
                onBlur={e => e.target.style.borderColor = 'rgba(59,130,246,0.15)'}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                <span style={{ fontSize: '10px', color: 'var(--nx-text-muted)', letterSpacing: '0.05em' }}>
                  {narrative.length}/45 characters minimum
                </span>
                <span style={{ fontSize: '10px', color: 'rgba(59,130,246,0.4)', fontFamily: 'Space Mono, monospace' }}>
                  Protocol: Ingest
                </span>
              </div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: narrative.trim().length >= 45 ? 1 : 0.3 }}
                disabled={narrative.trim().length < 45 || loading}
                onClick={() => sendFirstMessage(narrative)}
                style={{
                  marginTop: '32px',
                  width: '100%',
                  padding: '12px',
                  background: narrative.trim().length >= 45 ? 'rgba(59,130,246,0.12)' : 'transparent',
                  border: `1px solid ${narrative.trim().length >= 45 ? 'rgba(59,130,246,0.5)' : 'rgba(59,130,246,0.15)'}`,
                  borderRadius: '4px',
                  color: 'rgba(96,165,250,0.8)',
                  fontFamily: 'Space Mono, monospace',
                  fontSize: '11px',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  cursor: narrative.trim().length >= 45 ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s ease',
                }}
                whileHover={narrative.trim().length >= 45 ? {
                  background: 'rgba(59,130,246,0.2)',
                  borderColor: 'rgba(59,130,246,0.8)',
                } : {}}
              >
                {loading ? 'Establishing Link...' : 'initiate'}
              </motion.button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <ParticleField />
      
      {/* Scanlines Overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
        backgroundSize: '100% 4px, 6px 100%',
      }} />

      {/* Top bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '24px 40px',
        borderBottom: '1px solid rgba(59,130,246,0.06)',
        position: 'relative',
        zIndex: 10,
        backdropFilter: 'blur(5px)'
      }}>
        <span style={{
          fontFamily: 'Space Mono, monospace',
          fontSize: '11px', letterSpacing: '0.3em',
          color: 'rgba(59,130,246,0.4)',
        }}>N X</span>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          {phase === 'limit' && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                fontSize: '10px', letterSpacing: '0.15em',
                color: 'rgba(59,130,246,0.5)', textTransform: 'uppercase',
              }}
            >
              · Threshold reached
            </motion.span>
          )}
          <span style={{
            fontSize: '10px', letterSpacing: '0.12em',
            color: 'var(--nx-text-muted)', textTransform: 'uppercase',
          }}>
            {exchangeCount}/20
          </span>
          <button
            onClick={handleEnd}
            style={{
              background: 'none', border: '1px solid rgba(59,130,246,0.15)',
              borderRadius: '4px', padding: '6px 16px',
              color: 'var(--nx-text-muted)', cursor: 'pointer',
              fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase',
              fontFamily: 'Space Mono, monospace',
              transition: 'all 0.2s ease',
            }}
          >
            End session
          </button>
        </div>
      </div>

      {/* Main area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '680px',
        width: '100%',
        margin: '0 auto',
        padding: '40px 24px',
        position: 'relative',
        zIndex: 2,
      }}>
        {/* Messages */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                {msg.role === 'user' ? (
                  <p style={{
                    fontSize: '15px',
                    color: 'var(--nx-text-dim)',
                    lineHeight: 1.7,
                    maxWidth: '90%',
                    textAlign: 'right',
                    fontStyle: 'italic',
                  }}>
                    {msg.content}
                  </p>
                ) : (
                  <div>
                    <p style={{
                      fontSize: 'clamp(15px, 2vw, 18px)',
                      fontWeight: 300,
                      color: 'var(--nx-text)',
                      lineHeight: 1.7,
                      letterSpacing: '0.01em',
                      maxWidth: '90%',
                      whiteSpace: 'pre-line',
                    }}>
                      {msg.content}
                    </p>
                    <div style={{
                      marginTop: '8px', width: '24px', height: '1px',
                      background: 'rgba(59,130,246,0.2)',
                    }} />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading indicator */}
          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ display: 'flex', gap: '6px', alignItems: 'center' }}
              >
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.2, 0.8, 0.2] }}
                    transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }}
                    style={{
                      width: 4, height: 4, borderRadius: '50%',
                      background: 'rgba(59,130,246,0.4)',
                    }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>

        <AnimatePresence>
          {!loading && phase !== 'limit' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.8 }}
              style={{ marginTop: '48px' }}
            >
              <input
                ref={inputRef}
                className="nx-input"
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Speak your truth"
                disabled={loading}
              />
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginTop: '8px',
              }}>
                <span style={{
                  fontSize: '10px', letterSpacing: '0.15em',
                  color: 'var(--nx-text-muted)', textTransform: 'uppercase',
                }}>
                  Enter to send
                </span>
                <AnimatePresence>
                  {input.trim() && (
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={sendMessage}
                      disabled={loading}
                      style={{
                        background: 'none', border: 'none',
                        cursor: 'pointer',
                        fontSize: '10px', letterSpacing: '0.2em',
                        color: 'rgba(59,130,246,0.6)', textTransform: 'uppercase',
                        fontFamily: 'Space Mono, monospace',
                      }}
                    >
                      Send →
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Session ended */}
        <AnimatePresence>
          {phase === 'limit' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ marginTop: '40px', textAlign: 'center' }}
            >
              <p style={{
                fontSize: '11px', letterSpacing: '0.2em',
                color: 'var(--nx-text-muted)', textTransform: 'uppercase',
                marginBottom: '24px',
              }}>
                Do not engage for extended periods.
              </p>
              <button
                onClick={handleEnd}
                style={{
                  background: 'none',
                  border: '1px solid rgba(59,130,246,0.2)',
                  borderRadius: '4px',
                  padding: '10px 32px',
                  color: 'rgba(96,165,250,0.6)',
                  cursor: 'pointer',
                  fontSize: '11px',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  fontFamily: 'Space Mono, monospace',
                }}
              >
                View records
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Candle (lower right) */}
      <div style={{
        position: 'fixed', bottom: -20, right: 0,
        transform: 'scale(0.75)',
        transformOrigin: 'bottom right',
        zIndex: 10, pointerEvents: 'none',
      }}>
        <AnimeCandle state={candleState} />
      </div>

      {/* Smoke particles overlay */}
      {(finalEndingPhase === 'extinguishing' || finalEndingPhase === 'smoke') && (
        <div style={{ position: 'fixed', bottom: 0, right: 0, width: 200, height: 400, zIndex: 11, pointerEvents: 'none' }}>
          {[...Array(16)].map((_, i) => (
            <SmokeParticle key={i} index={i} />
          ))}
        </div>
      )}

      {/* The Ritual is Over Screen overlay */}
      <AnimatePresence>
        {finalEndingPhase === 'over' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            style={{
              position: 'fixed', inset: 0, backgroundColor: '#030507',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              zIndex: 100,
            }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [1, 1, 0] }}
              transition={{ duration: 4.0, times: [0, 0.8, 1] }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 20px' }}
            >
              <h1
                style={{
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontSize: 'clamp(26px, 7vw, 48px)',
                  fontWeight: 800,
                  letterSpacing: '0.25em',
                  color: '#ff2a2a',
                  textShadow: '0 0 15px rgba(255, 30, 30, 0.8), 0 0 30px rgba(255, 30, 30, 0.4)',
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  display: 'flex',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                }}
              >
                {Array.from("THE RITUAL IS OVER.").map((char, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: i * 0.08,
                      duration: 0.05,
                    }}
                    style={{ display: 'inline-block', whiteSpace: char === ' ' ? 'pre' : 'normal' }}
                  >
                    {char}
                  </motion.span>
                ))}
              </h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={{ delay: 2.0, duration: 0.8 }}
                style={{
                  fontFamily: 'Space Mono, monospace',
                  fontSize: '11px',
                  letterSpacing: '0.35em',
                  color: '#64748b',
                  marginTop: '24px',
                  textTransform: 'uppercase',
                  textAlign: 'center',
                }}
              >
                calibration completed.
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
