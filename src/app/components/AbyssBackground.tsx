'use client';

export default function AbyssBackground() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
        background: '#030507',
      }}
    />
  );
}

