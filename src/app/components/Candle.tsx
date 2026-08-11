'use client';
import { useEffect, useRef, useState } from 'react';

interface CandleProps {
  lit: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  state?: 'stable' | 'flicker' | 'bright' | 'dim';
}

export default function Candle({ lit, onClick, size = 'md', state = 'stable' }: CandleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  const dimensions = {
    sm: { w: 60, h: 120, candleW: 14, candleH: 40 },
    md: { w: 100, h: 200, candleW: 22, candleH: 65 },
    lg: { w: 160, h: 320, candleW: 36, candleH: 100 },
  }[size];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.w * dpr;
    canvas.height = dimensions.h * dpr;
    canvas.style.width = dimensions.w + 'px';
    canvas.style.height = dimensions.h + 'px';
    ctx.scale(dpr, dpr);

    const cx = dimensions.w / 2;
    const candleTop = dimensions.h - dimensions.candleH - 10;
    const candleBottom = dimensions.h - 10;

    function drawCandle() {
      // Candle body gradient
      const bodyGrad = ctx.createLinearGradient(
        cx - dimensions.candleW / 2, 0,
        cx + dimensions.candleW / 2, 0
      );
      bodyGrad.addColorStop(0, '#0a0f18');
      bodyGrad.addColorStop(0.3, '#111827');
      bodyGrad.addColorStop(0.7, '#0d1420');
      bodyGrad.addColorStop(1, '#070c14');
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.roundRect(
        cx - dimensions.candleW / 2,
        candleTop,
        dimensions.candleW,
        dimensions.candleH,
        [3, 3, 0, 0]
      );
      ctx.fill();

      // Candle top rim (wax pool)
      ctx.fillStyle = '#1a2535';
      ctx.beginPath();
      ctx.ellipse(cx, candleTop + 2, dimensions.candleW / 2, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wax drips (decorative)
      ctx.fillStyle = '#0f1a28';
      for (let i = 0; i < 2; i++) {
        const x = cx + (i === 0 ? -4 : 5);
        ctx.beginPath();
        ctx.ellipse(x, candleTop + 8 + i * 12, 3, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Wick
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, candleTop + 2);
      ctx.lineTo(cx, candleTop - 6);
      ctx.stroke();

      // Blue stripe accent
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.15)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(cx - dimensions.candleW / 2 + 4, candleTop + 20);
      ctx.lineTo(cx + dimensions.candleW / 2 - 4, candleTop + 20);
      ctx.stroke();
    }

    function drawFlame(t: number) {
      const wickTip = { x: cx, y: candleTop - 6 };

      // State-based intensity
      const stateMultiplier = {
        stable: 1,
        flicker: 0.6 + Math.random() * 0.8,
        bright: 1.4,
        dim: 0.5,
      }[state];

      const flicker = Math.sin(t * 0.08) * 0.5 + Math.sin(t * 0.13) * 0.3 + 0.2;
      const xWobble = Math.sin(t * 0.05) * (size === 'lg' ? 3 : 2) + Math.cos(t * 0.07) * (size === 'lg' ? 2 : 1);
      const heightMod = (1 + flicker * 0.2) * stateMultiplier;
      const flameH = (size === 'lg' ? 70 : size === 'md' ? 44 : 28) * heightMod;
      const flameW = (size === 'lg' ? 22 : size === 'md' ? 14 : 9);

      // Outer glow (ambient light on scene)
      const outerGlow = ctx.createRadialGradient(
        wickTip.x + xWobble * 0.3, wickTip.y - flameH * 0.4, 0,
        wickTip.x, wickTip.y - flameH * 0.2, flameH * 2.5 * stateMultiplier
      );
      outerGlow.addColorStop(0, `rgba(59, 130, 246, ${0.06 * stateMultiplier})`);
      outerGlow.addColorStop(0.4, `rgba(37, 99, 235, ${0.03 * stateMultiplier})`);
      outerGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.ellipse(
        wickTip.x, wickTip.y - flameH * 0.3,
        flameH * 1.5, flameH * 1.5,
        0, 0, Math.PI * 2
      );
      ctx.fill();

      // Main flame shape
      ctx.save();
      ctx.translate(wickTip.x + xWobble, wickTip.y);

      const flameGrad = ctx.createLinearGradient(0, 0, 0, -flameH);
      flameGrad.addColorStop(0, 'rgba(96, 165, 250, 0.95)');   // bright blue base
      flameGrad.addColorStop(0.3, 'rgba(59, 130, 246, 0.85)'); // mid blue
      flameGrad.addColorStop(0.65, 'rgba(37, 99, 235, 0.7)');  // deeper blue
      flameGrad.addColorStop(0.85, 'rgba(29, 78, 216, 0.4)');  // dark blue
      flameGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(
        flameW, -flameH * 0.25,
        flameW * 0.8 + xWobble * 0.5, -flameH * 0.6,
        0, -flameH
      );
      ctx.bezierCurveTo(
        -flameW * 0.8 - xWobble * 0.3, -flameH * 0.6,
        -flameW, -flameH * 0.25,
        0, 0
      );
      ctx.fill();

      // Inner bright core
      const coreGrad = ctx.createRadialGradient(
        xWobble * 0.2, -flameH * 0.2, 0,
        0, -flameH * 0.15, flameW * 0.7
      );
      coreGrad.addColorStop(0, `rgba(219, 234, 254, ${0.9 * stateMultiplier})`);
      coreGrad.addColorStop(0.4, `rgba(147, 197, 253, ${0.6 * stateMultiplier})`);
      coreGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.ellipse(xWobble * 0.2, -flameH * 0.15, flameW * 0.45, flameH * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Glow on candle top (light reflection)
      const poolGlow = ctx.createRadialGradient(cx, candleTop, 0, cx, candleTop, dimensions.candleW);
      poolGlow.addColorStop(0, `rgba(59, 130, 246, ${0.2 * stateMultiplier})`);
      poolGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = poolGlow;
      ctx.beginPath();
      ctx.ellipse(cx, candleTop, dimensions.candleW * 0.8, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Particles
      if (Math.random() < 0.3) {
        const px = cx + xWobble + (Math.random() - 0.5) * flameW;
        const py = candleTop - 6 - flameH * (0.5 + Math.random() * 0.5);
        const alpha = Math.random() * 0.4 * stateMultiplier;
        ctx.fillStyle = `rgba(147, 197, 253, ${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, Math.random() * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function render() {
      ctx.clearRect(0, 0, dimensions.w, dimensions.h);
      drawCandle();
      if (lit) {
        drawFlame(timeRef.current);
        timeRef.current++;
      }
      animRef.current = requestAnimationFrame(render);
    }

    render();
    return () => cancelAnimationFrame(animRef.current);
  }, [lit, size, state, dimensions]);

  return (
    <canvas
      ref={canvasRef}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', display: 'block' }}
    />
  );
}
