'use client';
import { useEffect, useRef } from 'react';

export default function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    type Particle = {
      x: number; y: number;
      vx: number; vy: number;
      alpha: number; size: number;
      life: number; maxLife: number;
    };

    const particles: Particle[] = [];
    const MAX = 60;

    function spawn(): Particle {
      return {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -Math.random() * 0.3 - 0.05,
        alpha: 0,
        size: Math.random() * 1.5 + 0.3,
        life: 0,
        maxLife: 200 + Math.random() * 300,
      };
    }

    for (let i = 0; i < MAX; i++) {
      const p = spawn();
      p.life = Math.random() * p.maxLife; // stagger
      particles.push(p);
    }

    function draw() {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      for (const p of particles) {
        p.life++;
        if (p.life > p.maxLife) {
          Object.assign(p, spawn());
          continue;
        }

        const progress = p.life / p.maxLife;
        p.alpha = progress < 0.2
          ? progress / 0.2 * 0.25
          : progress > 0.8
          ? (1 - progress) / 0.2 * 0.25
          : 0.25;

        p.x += p.vx;
        p.y += p.vy;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59, 130, 246, ${p.alpha * 0.6})`;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="nx-particles"
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
