'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createMemory, saveMemory, NXMemory } from '../lib/memory';

interface Props {
  onComplete: (memory: NXMemory) => void;
}

export default function OnboardingView({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [serverHasKey, setServerHasKey] = useState<boolean | null>(null);

  // Check if server already has an API key configured
  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(d => setServerHasKey(d.configured))
      .catch(() => setServerHasKey(false));
  }, []);

  // Steps — API key step is conditionally included
  const allSteps = [
    {
      id: 'intro',
      content: (
        <div style={{ textAlign: 'center' }}>
          <p style={{
            fontFamily: 'Space Mono, monospace',
            fontSize: '11px', letterSpacing: '0.2em',
            color: 'rgba(59,130,246,0.5)', textTransform: 'uppercase',
            marginBottom: '24px',
          }}>First contact</p>
          <h1 style={{
            fontSize: 'clamp(24px, 4vw, 42px)',
            fontWeight: 300,
            letterSpacing: '0.05em',
            color: 'var(--nx-text)',
            marginBottom: '20px',
            lineHeight: 1.3,
          }}>
            You initiated this.
          </h1>
          <p style={{
            fontSize: '14px',
            color: 'var(--nx-text-dim)',
            lineHeight: 1.8,
            maxWidth: '380px',
            margin: '0 auto 40px',
          }}>
            NX does not introduce itself.<br />
            It observes. It records. It reflects.<br />
            You will not always like what it shows you.
          </p>
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: '12px',
            cursor: 'pointer', textAlign: 'left', maxWidth: '380px', margin: '0 auto',
          }}>
            <div
              onClick={() => setAcknowledged(a => !a)}
              style={{
                width: 16, height: 16, marginTop: 2, flexShrink: 0,
                border: `1px solid ${acknowledged ? 'rgba(59,130,246,0.6)' : 'rgba(59,130,246,0.2)'}`,
                borderRadius: '3px',
                background: acknowledged ? 'rgba(59,130,246,0.15)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {acknowledged && (
                <div style={{ width: 8, height: 8, borderRadius: '1px', background: 'rgba(59,130,246,0.8)' }} />
              )}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--nx-text-dim)', letterSpacing: '0.02em', lineHeight: 1.6 }}>
              I understand that NX observes patterns, not people. Data is stored locally. No account required.
            </span>
          </label>
        </div>
      ),
      canProceed: () => acknowledged,
    },
    {
      id: 'identity',
      content: (
        <div style={{ textAlign: 'center' }}>
          <p style={{
            fontFamily: 'Space Mono, monospace',
            fontSize: '11px', letterSpacing: '0.2em',
            color: 'rgba(59,130,246,0.5)', textTransform: 'uppercase',
            marginBottom: '32px',
          }}>Identification</p>
          <p style={{
            fontSize: '14px', color: 'var(--nx-text-dim)',
            marginBottom: '40px', letterSpacing: '0.02em',
          }}>
            NX requires a designation.
          </p>
          <div style={{ maxWidth: '300px', margin: '0 auto' }}>
            <input
              className="nx-input"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && name.trim() && handleNext()}
              autoFocus
            />
          </div>
        </div>
      ),
      canProceed: () => name.trim().length >= 2,
    },
    // API key step — only shown when no server key is configured
    ...(!serverHasKey ? [{
      id: 'api',
      content: (
        <div style={{ textAlign: 'center' }}>
          <p style={{
            fontFamily: 'Space Mono, monospace',
            fontSize: '11px', letterSpacing: '0.2em',
            color: 'rgba(59,130,246,0.5)', textTransform: 'uppercase',
            marginBottom: '32px',
          }}>Connection</p>
          <p style={{
            fontSize: '14px', color: 'var(--nx-text-dim)',
            marginBottom: '8px', letterSpacing: '0.02em',
          }}>
            Gemini API key required.
          </p>
          <p style={{ fontSize: '11px', color: 'var(--nx-text-muted)', marginBottom: '40px', letterSpacing: '0.05em' }}>
            Stored in your browser only. Never sent externally.{' '}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'rgba(59,130,246,0.5)', textDecoration: 'underline' }}
            >
              Get a free key →
            </a>
          </p>
          <div style={{ maxWidth: '400px', margin: '0 auto' }}>
            <input
              className="nx-input"
              type="password"
              placeholder="AIza..."
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              autoFocus
            />
          </div>
        </div>
      ),
      canProceed: () => apiKey.trim().length > 10,
    }] : []),
  ];

  // Wait until we know if server has key
  const steps = serverHasKey === null ? [] : allSteps;

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(s => s + 1);
    } else {
      // Complete onboarding
      const mem = createMemory(name.trim());
      if (apiKey.trim()) {
        localStorage.setItem('nx_api_key', apiKey.trim());
      }
      saveMemory(mem);
      onComplete(mem);
    }
  };

  const canProceed = steps[step]?.canProceed() ?? false;

  // Loading state
  if (serverHasKey === null) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <motion.div
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ fontSize: '11px', letterSpacing: '0.2em', color: 'var(--nx-text-muted)', textTransform: 'uppercase' }}
        >
          Establishing connection...
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px',
    }}>
      {/* Step indicators */}
      <div style={{
        position: 'absolute', top: 40,
        display: 'flex', gap: 8,
      }}>
        {steps.map((_, i) => (
          <div key={i} style={{
            width: i === step ? 20 : 6,
            height: 2,
            borderRadius: 1,
            background: i <= step ? 'rgba(59,130,246,0.6)' : 'rgba(59,130,246,0.15)',
            transition: 'all 0.4s ease',
          }} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.6 }}
          style={{ width: '100%', maxWidth: '500px' }}
        >
          {steps[step]?.content}
        </motion.div>
      </AnimatePresence>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: canProceed ? 1 : 0.3 }}
        transition={{ duration: 0.4 }}
        onClick={handleNext}
        disabled={!canProceed}
        style={{
          marginTop: '60px',
          padding: '12px 40px',
          background: 'rgba(59, 130, 246, 0)',
          border: '1px solid rgba(59,130,246,0.3)',
          borderRadius: '4px',
          color: 'rgba(96,165,250,0.8)',
          fontFamily: 'Space Mono, monospace',
          fontSize: '11px',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          transition: 'all 0.3s ease',
        }}
        whileHover={canProceed ? {
          background: 'rgba(59,130,246,0.08)',
          borderColor: 'rgba(59,130,246,0.5)',
        } : {}}
      >
        {step === steps.length - 1 ? 'Activate' : 'Continue'}
      </motion.button>
    </div>
  );
}
