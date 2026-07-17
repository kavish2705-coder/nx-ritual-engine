'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import SplashCursor from '../components/SplashCursor';
import MayanCalendar from './components/MayanCalendar';

export default function LandingPage() {
  const router = useRouter();

  return (
    <main style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <SplashCursor RAINBOW_MODE={false} COLOR="#b2beb5" />
      
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
      }}>
        <MayanCalendar />
      </div>
    </main>
  );
}
