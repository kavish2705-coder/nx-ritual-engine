'use client';

import { useEffect, useRef, useState } from 'react';

export default function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 0.5;

    const tryPlay = async () => {
      if (!audio.paused) return;
      try {
        await audio.play();
        setIsPlaying(true);
        setIsError(false);
      } catch (e) {
        console.warn("Autoplay prevented or failed.", e);
        setIsError(true);
      }
    };

    // Try playing immediately
    tryPlay();

    // Add event listeners to play on first user interaction
    const handleInteraction = () => {
      if (audio.paused) {
        tryPlay();
      } else {
        cleanup();
      }
    };

    const cleanup = () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
      document.removeEventListener('scroll', handleInteraction);
    };

    document.addEventListener('click', handleInteraction);
    document.addEventListener('keydown', handleInteraction);
    document.addEventListener('scroll', handleInteraction);

    return cleanup;
  }, []); // Run only once

  const toggleMusic = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio.play().then(() => {
        setIsPlaying(true);
        setIsError(false);
      }).catch(e => {
        console.error("Failed to play audio on click", e);
        setIsError(true);
      });
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  return (
    <>
      <audio 
        ref={audioRef} 
        loop 
        src="/into-the-void.mp3" 
        preload="auto"
        autoPlay
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      <button 
        onClick={toggleMusic}
        className="fixed bottom-4 right-4 z-[9999] flex items-center justify-center p-3 rounded-full bg-black/50 hover:bg-black/80 border border-white/20 text-white/70 hover:text-white transition-all backdrop-blur-sm"
        title={isPlaying ? "Pause Music" : "Play Music"}
      >
        {isPlaying ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
            {isError && <circle cx="19" cy="5" r="3" fill="red" stroke="none" />}
          </svg>
        )}
      </button>
    </>
  );
}
