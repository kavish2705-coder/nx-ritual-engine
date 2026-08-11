'use client';
import { useRouter } from 'next/navigation';
import OnboardingView from '../views/OnboardingView';
import { NXMemory } from '../lib/memory';

export default function OnboardingPage() {
  const router = useRouter();

  const handleComplete = (newMemory: NXMemory) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nx_userId', newMemory.userId);
    }
    fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMemory)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          router.push('/ritual');
        }
      })
      .catch(err => console.error('Failed to initialize profile in DB', err));
  };

  return (
    <main style={{ position: 'relative', minHeight: '100vh', padding: '40px 20px' }}>
      <OnboardingView onComplete={handleComplete} />
    </main>
  );
}
