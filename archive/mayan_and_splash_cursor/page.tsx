import MayanCalendar from './MayanCalendar';
import SplashCursor from './SplashCursor';


export default function MayanPage() {
  return (
    <main style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <SplashCursor RAINBOW_MODE={false} COLOR="#b2beb5" />

      <div style={{ position: 'relative', zIndex: 10, width: '800px', height: '800px' }}>
        <MayanCalendar />
      </div>
    </main>
  );
}
