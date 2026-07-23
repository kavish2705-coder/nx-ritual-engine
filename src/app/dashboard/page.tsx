'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardView from '../views/DashboardView';
import { NXMemory } from '../lib/memory';

export default function DashboardPage() {
  const router = useRouter();
  const [memory, setMemory] = useState<NXMemory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = typeof window !== 'undefined' ? localStorage.getItem('nx_userId') : null;
    if (userId) {
      fetch(`/api/memory?userId=${encodeURIComponent(userId)}`)
        .then(res => res.json())
        .then(data => {
          if (data.exists) setMemory(data.data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Space Mono, monospace', fontSize: '11px', letterSpacing: '0.2em', color: 'var(--nx-text-muted)' }}>
        ACCESSING MEMORY ARCHIVE...
      </main>
    );
  }

  if (!memory) {
    return (
      <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Space Mono, monospace', textAlign: 'center', padding: '20px' }}>
        <p style={{ fontSize: '12px', letterSpacing: '0.2em', color: 'var(--nx-text-muted)', marginBottom: '24px' }}>
          NO BEHAVIORAL PROFILE RECORDED IN ARCHIVE
        </p>
        <button
          onClick={() => router.push('/flame')}
          style={{
            background: 'none', border: '1px solid rgba(59,130,246,0.3)',
            padding: '12px 24px', color: '#60a5fa', fontSize: '10px', letterSpacing: '0.2em',
            cursor: 'pointer', fontFamily: 'Space Mono, monospace'
          }}
        >
          [ INITIATE CALIBRATION ]
        </button>
      </main>
    );
  }

  return (
    <main style={{ position: 'relative', minHeight: '100vh' }}>
      <DashboardView
        memory={memory}
        onBeginRitual={() => router.push('/ritual')}
        onDisconnect={() => router.push('/landing')}
      />
    </main>
  );
}
