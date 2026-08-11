'use client';

import { useEffect, useRef } from 'react';
import { CandleState } from './AnimeCandle';

interface GasFlameProps {
  state: CandleState;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  decay: number;
  type: 'flame' | 'smoke' | 'ember';
  color?: string;
  wobbleSpeed?: number;
  wobbleAmount?: number;
}

export default function GasFlame({ state }: GasFlameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;
    const particles: Particle[] = [];

    // Set canvas dimensions (matches w-36 h-48 container, roughly 144x192)
    const width = 200;
    const height = 300;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const cx = width / 2;
    const cy = height - 50; // Spawn exactly at the bottom of the canvas

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      const currentState = stateRef.current;
      const isLit = currentState === 'active' || currentState === 'unstable' || currentState === 'ignition';

      if (isLit) {
        const isUnstable = currentState === 'unstable';

        // Spawn flame gas particles - increased count for smoother continuous flow
        const spawnCount = isUnstable ? 6 : 3;
        for (let i = 0; i < spawnCount; i++) {
          const angleOffset = (Math.random() - 0.5) * 0.25; // Tighter angle
          // Higher initial velocity for faster flames
          const speed = isUnstable ? 4.5 + Math.random() * 2.5 : 2.5 + Math.random() * 1.5;
          const wind = Math.sin(time * 0.1) * 0.15; // Faster wind fluctuation

          particles.push({
            x: cx + (Math.random() - 0.5) * 18, // Tighter base spawn for more cohesion
            y: cy + (Math.random() - 0.5) * 6,
            vx: Math.sin(angleOffset) * speed + wind,
            vy: -Math.cos(angleOffset) * speed - 1.0, // Stronger initial upward push
            size: isUnstable ? 14 + Math.random() * 10 : 10 + Math.random() * 8,
            life: 1.0,
            // Faster decay to balance the higher speed (keeps height in check)
            decay: isUnstable ? 0.03 + Math.random() * 0.02 : 0.022 + Math.random() * 0.015,
            type: 'flame',
            wobbleSpeed: 0.15 + Math.random() * 0.1, // Faster flicker/wobble
            wobbleAmount: 0.8 + Math.random() * 1.2
          });
        }

        // Spawn embers (sparks) occasionally
        const emberChance = isUnstable ? 0.45 : 0.2;
        if (Math.random() < emberChance) {
          particles.push({
            x: cx + (Math.random() - 0.5) * 20,
            y: cy - 15,
            vx: (Math.random() - 0.5) * 3.5,
            vy: -5.0 - Math.random() * 4,
            size: 1.2 + Math.random() * 1.8,
            life: 1.0,
            decay: 0.02 + Math.random() * 0.015,
            type: 'ember'
          });
        }
      }

      // Update and draw particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        // Apply physics
        if (p.type === 'flame' || p.type === 'smoke') {
          p.vy -= 0.12; // Higher rising acceleration (hot gas shoots up fast)
          p.vx += (Math.random() - 0.5) * 0.15; // Gas diffusion

          // Sinuous swirling motion mimicking realistic hot gas currents - faster time factor
          p.vx += Math.sin(time * 0.12 + p.y * 0.025) * 0.08;

          if (p.wobbleSpeed && p.wobbleAmount) {
            p.x += Math.sin(time * p.wobbleSpeed) * p.wobbleAmount * 0.15;
          }
        } else if (p.type === 'ember') {
          p.vy -= 0.05; // Embers shoot up fast
          p.vx += Math.sin(time * 0.15) * 0.3; // Float wobble faster
        }

        // Decay
        p.life -= p.decay;

        // Transition flame gas to smoke when life is low
        if (p.type === 'flame' && p.life < 0.45) {
          p.type = 'smoke';
        }

        // Particle dynamics based on type
        if (p.type === 'smoke') {
          p.size += 1.0; // Smoke expands rapidly as it disperses
          p.vx *= 0.92;   // Slow down horizontally
          p.vy *= 0.94;   // Slow down vertically as gas cools down
        } else if (p.type === 'flame') {
          p.size += 0.15; // Flame expands slightly less to look sharper
        }

        ctx.save();

        // Blend mode: blur is implicitly handled by the soft gradients now, keeping performance high
        if (p.type === 'flame') {
          ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'smoke') {
          ctx.globalCompositeOperation = 'source-over';
        } else {
          ctx.globalCompositeOperation = 'screen';
        }

        const opacity = Math.max(0, p.life);
        const isUnstable = currentState === 'unstable';

        if (p.type === 'flame') {
          let grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          if (isUnstable) {
            // Unstable: Intense Red-Orange core fading to Crimson
            grad.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
            grad.addColorStop(0.2, `rgba(255, 170, 50, ${opacity * 0.9})`);
            grad.addColorStop(0.55, `rgba(239, 68, 68, ${opacity * 0.6})`);
            grad.addColorStop(1, 'rgba(150, 0, 0, 0)');
          } else {
            // Active: Intense Cyan core fading to Deep Blue
            grad.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
            grad.addColorStop(0.25, `rgba(0, 240, 255, ${opacity * 0.95})`);
            grad.addColorStop(0.6, `rgba(59, 130, 246, ${opacity * 0.5})`);
            grad.addColorStop(1, 'rgba(0, 0, 180, 0)');
          }
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'smoke') {
          // Smoke: Soft expanding dark soot clouds
          let grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          // Dark atmospheric soot particles
          const smokeBaseOpacity = opacity * 0.18; // More visible smoke
          const r = isUnstable ? 48 : 20;
          const g = isUnstable ? 24 : 22;
          const b = isUnstable ? 28 : 32;

          grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${smokeBaseOpacity})`);
          grad.addColorStop(0.5, `rgba(12, 14, 18, ${smokeBaseOpacity * 0.5})`);
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'ember') {
          // Ember: Small sparkling point
          ctx.shadowBlur = isUnstable ? 6 : 4;
          ctx.shadowColor = isUnstable ? '#ff3b30' : '#00f0ff';
          ctx.fillStyle = isUnstable
            ? `rgba(255, 140, 100, ${opacity * 0.95})`
            : `rgba(160, 245, 255, ${opacity * 0.95})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      // Remove dead particles
      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].life <= 0) {
          particles.splice(i, 1);
        }
      }

      time++;
      animId = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        pointerEvents: 'none',
        filter: 'blur(3px)', // GPU-accelerated blur makes the particles meld together like a fluid flame!
      }}
    />
  );
}
