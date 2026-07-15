'use client';

import { useEffect, useRef, useState } from 'react';

export default function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 0.5; // Set a reasonable default volume

    const tryPlay = () => {
      if (!audio.paused) return; // Prevent multiple play calls if already playing
      
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        console.warn("Autoplay prevented by browser. Waiting for user interaction.", e);
      });
    };

    // Try playing immediately
    tryPlay();

    // Add event listeners to play on first user interaction
    const handleInteraction = () => {
      if (audio.paused) {
        tryPlay();
      } else {
        document.removeEventListener('click', handleInteraction);
        document.removeEventListener('keydown', handleInteraction);
        document.removeEventListener('scroll', handleInteraction);
      }
    };

    document.addEventListener('click', handleInteraction);
    document.addEventListener('keydown', handleInteraction);
    document.addEventListener('scroll', handleInteraction);

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
      document.removeEventListener('scroll', handleInteraction);
    };
  }, []); // Run only once

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999, display: 'none' }}>
      <audio ref={audioRef} loop src="/into-the-void.mp3" preload="auto" />
    </div>
  );
}
