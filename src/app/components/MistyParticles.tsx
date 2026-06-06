'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  z: number;
  size: number;
  speed: number;
  type: 'dust' | 'word';
  text?: string;
  rotSpeed: number;
  angle: number;
}

interface GlitchEye {
  x: number;
  y: number;
  z: number;
  baseScale: number;
  blinkScale: number;
  blinkDirection: number; // -1 = closing, 1 = opening, 0 = static
  blinkTimer: number;
  twitchTimer: number;
  rotSpeed: number;
}

const SHADOW_WORDS = [
  "avoidance", "rationalization", "self-deception", "victimhood", "loops", 
  "deflection", "hesitation", "inconsistency", "fallout", 
  "denial", "pretense", "postponed", "delusion", "confrontation",
  "cowardice", "projection", "escapism", "fabrication", "excuses"
];

export default function MistyParticles({ intensity = 'observing' }: { intensity?: 'dormant' | 'observing' | 'intense' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const intensityRef = useRef(intensity);

  useEffect(() => {
    intensityRef.current = intensity;
  }, [intensity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Track mouse coordinates
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = e.clientX;
      mouseRef.current.targetY = e.clientY;
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    // Initial mouse centered
    mouseRef.current.x = width / 2;
    mouseRef.current.y = height / 2;
    mouseRef.current.targetX = width / 2;
    mouseRef.current.targetY = height / 2;

    const particles: Particle[] = [];
    const maxDepth = 1000;
    const perspective = 300;
    const particleCount = 60;

    // Initialize dust
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: (Math.random() - 0.5) * 1100,
        y: (Math.random() - 0.5) * 1100,
        z: Math.random() * maxDepth,
        size: Math.random() * 1.5 + 0.3,
        speed: Math.random() * 0.3 + 0.08,
        type: 'dust',
        rotSpeed: (Math.random() - 0.5) * 0.003,
        angle: Math.random() * Math.PI * 2,
      });
    }

    // Initialize words
    SHADOW_WORDS.forEach((word) => {
      particles.push({
        x: (Math.random() - 0.5) * 1000,
        y: (Math.random() - 0.5) * 1000,
        z: Math.random() * maxDepth,
        size: 9,
        speed: Math.random() * 0.18 + 0.05,
        type: 'word',
        text: word,
        rotSpeed: (Math.random() - 0.5) * 0.0015,
        angle: Math.random() * Math.PI * 2,
      });
    });

    // Initialize random small and large eyes floating in 3D space
    const eyes: GlitchEye[] = [];
    
    // 1. One central dominant eye
    eyes.push({
      x: 0,
      y: 0,
      z: 100,
      baseScale: 1.0,
      blinkScale: 1.0,
      blinkDirection: 0,
      blinkTimer: Math.random() * 200 + 100,
      twitchTimer: 0,
      rotSpeed: (Math.random() - 0.5) * 0.0006,
    });

    // 2. Several small and large eyes floating at various depths
    const totalEyesCount = 7;
    for (let i = 0; i < totalEyesCount; i++) {
      eyes.push({
        x: (Math.random() - 0.5) * 800,
        y: (Math.random() - 0.5) * 700,
        z: Math.random() * 700 + 150, // depth layering
        baseScale: Math.random() < 0.3 ? Math.random() * 0.4 + 0.8 : Math.random() * 0.35 + 0.2, // mixture of large and small
        blinkScale: 1.0,
        blinkDirection: 0,
        blinkTimer: Math.random() * 300 + 100,
        twitchTimer: 0,
        rotSpeed: (Math.random() - 0.5) * 0.0012, // slow independent 3D rotation
      });
    }

    // TV / Glitch states
    let glitchActive = false;
    let glitchTimer = 0;
    let glitchDuration = 0;
    let glitchOffset = 0;
    let glitchBarY = 0;
    let glitchBarHeight = 0;
    let tvRollY = 0; // vertical sync roll

    // Sync Hive Blink states (Forces all eyes to blink in unison occasionally)
    let hiveBlinkTimer = Math.random() * 400 + 300;
    let hiveBlinkScale = 1.0;
    let hiveBlinkDirection = 0; // -1 = closing, 1 = opening, 0 = idle

    // 3D rotation rates
    let driftX = 0.0001;
    let driftY = 0.0002;

    // Mouse speed and tracking helper
    let lastMouseX = width / 2;
    let lastMouseY = height / 2;
    let mouseSpeed = 0;

    const rotateX = (p: { y: number; z: number }, angle: number) => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const y = p.y * cos - p.z * sin;
      const z = p.z * cos + p.y * sin;
      p.y = y;
      p.z = z;
    };

    const rotateY = (p: { x: number; z: number }, angle: number) => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const x = p.x * cos - p.z * sin;
      const z = p.z * cos + p.x * sin;
      p.x = x;
      p.z = z;
    };

    // Helper to corrupt text during glitch or mouse proximity
    const corruptText = (text: string, amount = 0.35) => {
      const glyphs = "☠Ø▲■∂∑★☿✖⚖⚙⚡⚰☠👁⛓❓🔍";
      return text
        .split('')
        .map(char => (Math.random() < amount ? glyphs[Math.floor(Math.random() * glyphs.length)] : char))
        .join('');
    };

    const animate = () => {
      const cx = width / 2;
      const cy = height / 2;
      const currentIntensity = intensityRef.current;

      // Track mouse speed to drive jitter
      const dx = mouseRef.current.targetX - lastMouseX;
      const dy = mouseRef.current.targetY - lastMouseY;
      mouseSpeed = Math.sqrt(dx * dx + dy * dy);
      lastMouseX = mouseRef.current.x;
      lastMouseY = mouseRef.current.y;

      // Smoothly interpolate mouse coordinates for eye tracking
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.06;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.06;

      // 3D Parallax offset based on cursor position relative to screen center
      const mouseParallaxX = (mouseRef.current.x - cx) * 0.3; // horizontal slide
      const mouseParallaxY = (mouseRef.current.y - cy) * 0.15; // vertical slide

      // Dynamic drift driven slightly by mouse velocity
      driftX = 0.0001 + (dy * 0.00001);
      driftY = 0.0002 + (dx * 0.00001);

      // 1. Glitch State Manager (made active and glitchy, disabled in dormant)
      if (currentIntensity !== 'dormant') {
        glitchTimer++;
        const glitchThreshold = currentIntensity === 'intense' ? 0.02 : 0.006;
        const minTimeBetweenGlitches = currentIntensity === 'intense' ? 40 : 100;
        
        if (!glitchActive && Math.random() < glitchThreshold && glitchTimer > minTimeBetweenGlitches) {
          glitchActive = true;
          glitchDuration = Math.floor(Math.random() * (currentIntensity === 'intense' ? 16 : 10)) + 4;
          glitchOffset = (Math.random() - 0.5) * (currentIntensity === 'intense' ? 70 : 45);
          glitchBarY = Math.random() * height;
          glitchBarHeight = Math.random() * 150 + 50;
          glitchTimer = 0;
        }
      } else {
        glitchActive = false;
        glitchOffset = 0;
      }

      if (glitchActive) {
        glitchDuration--;
        if (glitchDuration <= 0) {
          glitchActive = false;
          glitchOffset = 0;
        } else {
          glitchOffset = (Math.random() - 0.5) * (currentIntensity === 'intense' ? 75 : 55);
        }
      }

      // Sync rolling CRT line Y coordinate
      if (currentIntensity !== 'dormant') {
        const rollSpeed = currentIntensity === 'intense' ? 4.0 : 2.0;
        tvRollY = (tvRollY + rollSpeed) % height;
      }

      // 2. Global Synchronized Hive Blink logic (occasional unison blinking)
      if (currentIntensity !== 'dormant') {
        hiveBlinkTimer--;
        if (hiveBlinkTimer <= 0 && hiveBlinkDirection === 0) {
          hiveBlinkDirection = -1; // trigger close
        }
      } else {
        hiveBlinkDirection = 0;
        hiveBlinkScale = 1.0;
      }

      if (hiveBlinkDirection === -1) {
        hiveBlinkScale -= 0.18; // close rapidly in unison
        if (hiveBlinkScale <= 0) {
          hiveBlinkScale = 0;
          hiveBlinkDirection = 1;
        }
      } else if (hiveBlinkDirection === 1) {
        hiveBlinkScale += 0.18; // open back up
        if (hiveBlinkScale >= 1.0) {
          hiveBlinkScale = 1.0;
          hiveBlinkDirection = 0;
          hiveBlinkTimer = Math.random() * 450 + 350; // next hive blink cycle
        }
      }

      // 3. Random full-screen TV static signal drop/flicker (1 frame drop)
      let tvSignalDrop = false;
      if (currentIntensity !== 'dormant' && !glitchActive && Math.random() < 0.003) {
        tvSignalDrop = true;
      }

      // 4. Double Beat Heartbeat Vignette Pulse
      const timeSec = Date.now() * 0.001;
      const heartbeatInterval = currentIntensity === 'intense' ? 0.95 : 1.4; // faster when intense
      const beatCycle = timeSec % heartbeatInterval; 
      let pulseIntensity = 0.0;
      
      if (beatCycle < 0.12) {
        pulseIntensity = Math.sin((beatCycle / 0.12) * Math.PI) * (currentIntensity === 'dormant' ? 0.04 : 0.12);
      } else if (beatCycle >= 0.22 && beatCycle < 0.34) {
        pulseIntensity = Math.sin(((beatCycle - 0.22) / 0.12) * Math.PI) * (currentIntensity === 'dormant' ? 0.06 : 0.16);
      }
      
      // Glitch or high mouse speed amplifies heartbeat tension
      if (glitchActive) {
        pulseIntensity += 0.35;
      } else if (mouseSpeed > 40 && currentIntensity !== 'dormant') {
        pulseIntensity += 0.1;
      }

      // TV hardware glitch screen shake (vibrates canvas coordinates)
      let shakeX = 0;
      let shakeY = 0;
      if (glitchActive) {
        shakeX = (Math.random() - 0.5) * (currentIntensity === 'intense' ? 12 : 6);
        shakeY = (Math.random() - 0.5) * (currentIntensity === 'intense' ? 12 : 6);
      }

      // Clear & Draw base screen
      ctx.clearRect(0, 0, width, height);

      if (glitchActive && Math.random() < 0.45) {
        ctx.fillStyle = '#020508'; // hardware flash
      } else {
        ctx.fillStyle = '#030507';
      }
      ctx.fillRect(0, 0, width, height);

      // Save canvas context to apply screen shake translate
      ctx.save();
      ctx.translate(shakeX, shakeY);

      // Faint central scanner gradient
      const radialGrad = ctx.createRadialGradient(
        cx + glitchOffset, cy, 0,
        cx + glitchOffset, cy, Math.max(width, height) * 0.75
      );
      radialGrad.addColorStop(0, glitchActive ? 'rgba(59, 130, 246, 0.12)' : 'rgba(8, 15, 26, 0.45)');
      radialGrad.addColorStop(0.5, 'rgba(4, 6, 9, 0.95)');
      radialGrad.addColorStop(1, '#030507');
      ctx.fillStyle = radialGrad;
      ctx.fillRect(0, 0, width, height);

      // Draw TV vertical sync roll bar (classic analog rolling bar)
      if (currentIntensity !== 'dormant') {
        ctx.fillStyle = 'rgba(3, 5, 8, 0.22)';
        ctx.fillRect(0, tvRollY, width, 45);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
        ctx.fillRect(0, tvRollY - 2, width, 2);
        ctx.fillRect(0, tvRollY + 45, width, 2);
      }

      // Draw Heartbeat Vignette Border
      if (pulseIntensity > 0) {
        const heartbeatGrad = ctx.createRadialGradient(cx, cy, Math.min(width, height) * 0.35, cx, cy, Math.max(width, height) * 0.95);
        const pulseColor = glitchActive 
          ? `rgba(239, 68, 68, ${pulseIntensity * 0.4})` 
          : `rgba(59, 130, 246, ${pulseIntensity * 0.18})`;
        heartbeatGrad.addColorStop(0, 'transparent');
        heartbeatGrad.addColorStop(1, pulseColor);
        ctx.fillStyle = heartbeatGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // --- 5. RENDER DYNAMIC FLOATING OBSERVER EYES (Random Small & Large) ---
      const drawEyePath = (
        ex: number,
        ey: number,
        r: number, // iris radius
        blinkScale: number,
        pupilX: number,
        pupilY: number,
        strokeColor: string,
        twitchOffset: number,
        hudBrackets = false
      ) => {
        ctx.save();
        ctx.translate(ex + twitchOffset, ey);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.0;

        // Render circular camera-HUD brackets only on large dominant eyes
        if (hudBrackets && currentIntensity !== 'dormant') {
          ctx.strokeStyle = strokeColor.replace(/[\d.]+\)$/, `${parseFloat(strokeColor.split(',')[3]) * 0.35})`);
          ctx.beginPath();
          ctx.arc(0, 0, r * 3.1, -timeSec * 0.15, -timeSec * 0.15 + Math.PI / 4);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, 0, r * 3.1, -timeSec * 0.15 + Math.PI, -timeSec * 0.15 + 5 * Math.PI / 4);
          ctx.stroke();
          ctx.strokeStyle = strokeColor;
        }

        // Draw eyelids path (using combined eye blink and global hive blink)
        const combinedBlink = blinkScale * hiveBlinkScale;
        ctx.beginPath();
        ctx.moveTo(-r * 2.6, 0);
        ctx.quadraticCurveTo(0, -r * 1.5 * combinedBlink, r * 2.6, 0);
        ctx.quadraticCurveTo(0, r * 1.5 * combinedBlink, -r * 2.6, 0);
        ctx.closePath();
        ctx.stroke();

        // Clip the iris/pupil inside the eyelids
        ctx.clip();

        if (combinedBlink > 0.02) {
          // Draw Iris concentric circles
          ctx.beginPath();
          ctx.arc(pupilX * 0.7, pupilY * 0.7, r, 0, Math.PI * 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(pupilX * 0.7, pupilY * 0.7, r * 0.8, 0, Math.PI * 2);
          ctx.strokeStyle = strokeColor.replace(/[\d.]+\)$/, `${parseFloat(strokeColor.split(',')[3]) * 0.5})`);
          ctx.stroke();

          // Draw Pupil
          ctx.beginPath();
          ctx.arc(pupilX, pupilY, r * 0.42, 0, Math.PI * 2);
          ctx.fillStyle = strokeColor.replace('rgba', 'rgba').replace(/[\d.]+\)$/, `${parseFloat(strokeColor.split(',')[3]) * 1.6})`);
          ctx.fill();

          // Draw Pupil radial scanner rays
          ctx.strokeStyle = strokeColor.replace(/[\d.]+\)$/, `${parseFloat(strokeColor.split(',')[3]) * 0.65})`);
          ctx.lineWidth = 0.5;
          for (let a = 0; a < Math.PI * 2; a += Math.PI / 5) {
            ctx.beginPath();
            ctx.moveTo(pupilX + Math.cos(a) * r * 0.42, pupilY + Math.sin(a) * r * 0.42);
            ctx.lineTo(pupilX * 0.7 + Math.cos(a) * r, pupilY * 0.7 + Math.sin(a) * r);
            ctx.stroke();
          }
        }
        ctx.restore();
      };

      // Animate and draw each eye in 3D
      eyes.forEach((eye) => {
        // Rotate eye position in 3D space
        const eyeSpeedMult = currentIntensity === 'dormant' ? 0.2 : currentIntensity === 'intense' ? 1.3 : 1.0;
        rotateX(eye, (driftX + eye.rotSpeed) * eyeSpeedMult);
        rotateY(eye, (driftY + eye.rotSpeed) * eyeSpeedMult);

        eye.z -= 0.08 * eyeSpeedMult;

        // Recycle eye depth if it goes too close
        if (eye.z <= -perspective) {
          eye.z = maxDepth;
          eye.x = (Math.random() - 0.5) * 850;
          eye.y = (Math.random() - 0.5) * 750;
        }

        // Project 3D coordinates onto 2D screen with parallax shift
        // Eyes closer to the viewport (lower z / higher scale) slide more rapidly than distant ones
        const scale = perspective / (perspective + eye.z);
        const parallaxFactor = 1.0 - (eye.z / maxDepth); // 0 (far) to 1 (close)
        
        let ex = cx + (eye.x + mouseParallaxX * parallaxFactor) * scale;
        let ey = cy + (eye.y + mouseParallaxY * parallaxFactor) * scale;

        // Apply horizontal wave displacement inside the active glitch bar
        if (glitchActive && ey >= glitchBarY && ey <= glitchBarY + glitchBarHeight) {
          ex += Math.sin(ey * 0.08) * glitchOffset;
        }

        // 1. Independent blinks for each eye
        let targetScale = 1.0;
        if (currentIntensity === 'dormant') {
          targetScale = 0.03; // closed
        }

        if (eye.blinkDirection === -1) {
          eye.blinkScale -= 0.16;
          if (eye.blinkScale <= 0) {
            eye.blinkScale = 0;
            eye.blinkDirection = 1;
          }
        } else if (eye.blinkDirection === 1) {
          eye.blinkScale += 0.16;
          if (eye.blinkScale >= targetScale) {
            eye.blinkScale = targetScale;
            eye.blinkDirection = 0;
            eye.blinkTimer = Math.random() * 350 + 150;
          }
        } else {
          eye.blinkScale += (targetScale - eye.blinkScale) * 0.04;
          
          if (currentIntensity !== 'dormant') {
            eye.blinkTimer--;
            if (eye.blinkTimer <= 0) {
              eye.blinkDirection = -1; // close eye
            }
          }
        }

        // Twitch state
        let isEyeTwitching = false;
        if (currentIntensity !== 'dormant') {
          eye.twitchTimer--;
          isEyeTwitching = glitchActive || (eye.twitchTimer > 0 && Math.random() < 0.25);
          if (!glitchActive && Math.random() < 0.003 && eye.twitchTimer <= 0) {
            eye.twitchTimer = Math.floor(Math.random() * 25) + 6;
          }
        }

        // Look calculations: eyes track mouse cursor
        const lookDX = (mouseRef.current.x - ex) / width;
        const lookDY = (mouseRef.current.y - ey) / height;

        const maxPupilDrift = 15 * scale * eye.baseScale;
        let pupilX = currentIntensity === 'dormant' ? 0 : lookDX * maxPupilDrift;
        let pupilY = currentIntensity === 'dormant' ? 0 : lookDY * maxPupilDrift;

        let twitchOffset = 0;
        if (isEyeTwitching) {
          pupilX += (Math.random() - 0.5) * 7 * scale * eye.baseScale;
          pupilY += (Math.random() - 0.5) * 7 * scale * eye.baseScale;
          twitchOffset = (Math.random() - 0.5) * 6;
        }

        const eyeBaseOpacity = currentIntensity === 'dormant' 
          ? 0.012 
          : glitchActive ? 0.35 : isEyeTwitching ? 0.16 : 0.07;

        const irisRadius = 45 * scale * eye.baseScale;

        // Render RGB splits (Slight Red, Green, and Wide Blue chromatic aberration)
        if (glitchActive && Math.random() < 0.5) {
          // Slight Red shift (-3px)
          drawEyePath(ex - 3, ey, irisRadius, eye.blinkScale, pupilX, pupilY, `rgba(239, 68, 68, ${eyeBaseOpacity * 1.2})`, twitchOffset);
          // Slight Green shift (+2px)
          drawEyePath(ex + 2, ey, irisRadius, eye.blinkScale, pupilX, pupilY, `rgba(16, 185, 129, ${eyeBaseOpacity * 1.2})`, twitchOffset);
          // Strong Blue shift (+7px) for "more blue glitch"
          drawEyePath(ex + 7, ey, irisRadius, eye.blinkScale, pupilX, pupilY, `rgba(59, 130, 246, ${eyeBaseOpacity * 1.7})`, twitchOffset, eye.baseScale >= 0.8);
        } else {
          // Normal blue-tinted HUD eye
          drawEyePath(ex, ey, irisRadius, eye.blinkScale, pupilX, pupilY, `rgba(96, 165, 250, ${eyeBaseOpacity})`, twitchOffset, eye.baseScale >= 0.8);
        }
      });

      // --- 6. RENDER TRACKING HUD RETICLE OVERLAY (Only faint brackets, NO coordinates text) ---
      if (currentIntensity !== 'dormant') {
        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;
        
        const hudOpacity = glitchActive ? 0.35 : 0.08;
        ctx.strokeStyle = glitchActive ? `rgba(239, 68, 68, ${hudOpacity})` : `rgba(59, 130, 246, ${hudOpacity})`;
        ctx.lineWidth = 0.8;
        
        // Full screen faint target lines crossing at cursor
        ctx.beginPath();
        ctx.moveTo(0, my);
        ctx.lineTo(width, my);
        ctx.moveTo(mx, 0);
        ctx.lineTo(mx, height);
        ctx.stroke();

        // Draw target HUD frame brackets surrounding cursor (NO text follows cursor)
        const frameSize = 7;
        const frameDist = 12;
        ctx.beginPath();
        // Top-left
        ctx.moveTo(mx - frameDist, my - frameDist + frameSize);
        ctx.lineTo(mx - frameDist, my - frameDist);
        ctx.lineTo(mx - frameDist + frameSize, my - frameDist);
        // Top-right
        ctx.moveTo(mx + frameDist, my - frameDist + frameSize);
        ctx.lineTo(mx + frameDist, my - frameDist);
        ctx.lineTo(mx + frameDist - frameSize, my - frameDist);
        // Bottom-left
        ctx.moveTo(mx - frameDist, my + frameDist - frameSize);
        ctx.lineTo(mx - frameDist, my + frameDist);
        ctx.lineTo(mx - frameDist + frameSize, my + frameDist);
        // Bottom-right
        ctx.moveTo(mx + frameDist, my + frameDist - frameSize);
        ctx.lineTo(mx + frameDist, my + frameDist);
        ctx.lineTo(mx + frameDist - frameSize, my + frameDist);
        ctx.stroke();
      }

      // --- 7. RENDER PARTICLES & SHADOW WORDS ---
      particles.forEach((p) => {
        const speedMultiplier = currentIntensity === 'dormant' ? 0.25 : currentIntensity === 'intense' ? 1.4 : 1.0;
        rotateX(p, (driftX + p.rotSpeed) * speedMultiplier);
        rotateY(p, (driftY + p.rotSpeed) * speedMultiplier);

        p.z -= p.speed * speedMultiplier;

        if (p.z <= -perspective) {
          p.z = maxDepth;
          p.x = (Math.random() - 0.5) * 1000;
          p.y = (Math.random() - 0.5) * 1000;
        }

        // Project 3D coordinates onto 2D screen with parallax shift
        const scale = perspective / (perspective + p.z);
        const pParallaxFactor = 1.0 - (p.z / maxDepth); // depth parallax for particles
        
        let px = cx + (p.x + mouseParallaxX * pParallaxFactor) * scale;
        let py = cy + (p.y + mouseParallaxY * pParallaxFactor) * scale;

        // Apply horizontal wave displacement inside the active glitch bar
        if (glitchActive && py >= glitchBarY && py <= glitchBarY + glitchBarHeight) {
          px += Math.sin(py * 0.08) * glitchOffset;
        }

        // Mouse interaction: push away & scramble text when cursor is close
        const pdx = px - mouseRef.current.x;
        const pdy = py - mouseRef.current.y;
        const mouseDist = Math.sqrt(pdx * pdx + pdy * pdy);
        
        const repelRadius = 140;
        const isNearCursor = currentIntensity !== 'dormant' && mouseDist < repelRadius;
        let jitterX = 0;
        let jitterY = 0;

        if (isNearCursor) {
          jitterX = (Math.random() - 0.5) * 8;
          jitterY = (Math.random() - 0.5) * 8;

          const angle = Math.atan2(pdy, pdx);
          const pushForce = (repelRadius - mouseDist) * 0.06;
          
          p.x += Math.cos(angle) * pushForce;
          p.y += Math.sin(angle) * pushForce;
          p.z -= p.speed * 2.5;
        }

        if (px >= 0 && px <= width && py >= 0 && py <= height) {
          let opacity = Math.min(1, Math.max(0, 1 - p.z / maxDepth)) * (glitchActive ? 0.75 : 0.45);
          if (currentIntensity === 'dormant') {
            opacity *= 0.18;
          }
          
          if (p.type === 'word' && p.text) {
            const fontSize = Math.round(p.size * scale * 1.5);
            if (fontSize > 4) {
              ctx.font = `${fontSize}px 'Space Mono', monospace`;
              
              const scrambleAmount = isNearCursor ? 0.55 : glitchActive ? 0.35 : 0.0;
              const textToRender = scrambleAmount > 0 ? corruptText(p.text, scrambleAmount) : p.text;

              const drawWordText = (dxOffset: number, colorStr: string) => {
                ctx.fillStyle = colorStr;
                ctx.shadowColor = glitchActive ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.2)';
                ctx.shadowBlur = glitchActive ? 6 : 1;
                ctx.fillText(textToRender, px + jitterX + dxOffset, py + jitterY);
                ctx.shadowBlur = 0;
              };

              // Slight Red, Green and strong Blue chromatic offsets on text
              if (glitchActive && Math.random() < 0.5) {
                drawWordText(-3, `rgba(239, 68, 68, ${opacity * 0.65})`);
                drawWordText(2, `rgba(16, 185, 129, ${opacity * 0.65})`);
                drawWordText(7, `rgba(96, 165, 250, ${opacity * 0.75})`); // more blue
              } else if (isNearCursor) {
                drawWordText(0, `rgba(239, 68, 68, ${opacity * 0.85})`);
              } else {
                const baseColor = currentIntensity === 'dormant' 
                  ? `rgba(96, 165, 250, ${opacity * 0.15})`
                  : `rgba(96, 165, 250, ${opacity * 0.45})`;
                drawWordText(0, baseColor);
              }
            }
          } else {
            // Draw dust particle
            const currentSize = p.size * scale * 1.5;
            ctx.beginPath();
            ctx.arc(px + jitterX, py + jitterY, currentSize, 0, Math.PI * 2);
            
            if (glitchActive && Math.random() < 0.2) {
              ctx.fillStyle = `rgba(239, 68, 68, ${opacity * 0.85})`;
            } else if (isNearCursor) {
              ctx.fillStyle = `rgba(239, 68, 68, ${opacity * 0.75})`;
            } else {
              ctx.fillStyle = `rgba(59, 130, 246, ${opacity * 0.55})`;
            }
            ctx.fill();
          }
        }
      });

      // --- 8. TV STATIC GLITCH INTERFERENCE BAND (With sine wave tear) ---
      if (glitchActive) {
        ctx.save();
        ctx.fillStyle = 'rgba(10, 16, 26, 0.35)';
        ctx.fillRect(0, glitchBarY, width, glitchBarHeight);

        const dotCount = Math.round(glitchBarHeight * 6);
        for (let i = 0; i < dotCount; i++) {
          const sx = Math.random() * width;
          const sy = glitchBarY + Math.random() * glitchBarHeight;
          const dotSize = Math.random() * 2 + 1;
          const brightness = Math.floor(Math.random() * 160) + 90;
          
          ctx.fillStyle = `rgba(${brightness}, ${brightness + 15}, ${brightness + 30}, ${Math.random() * 0.45 + 0.15})`;
          ctx.fillRect(sx, sy, dotSize, dotSize);
        }

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        const lineY1 = glitchBarY + Math.random() * glitchBarHeight;
        ctx.moveTo(0, lineY1);
        ctx.lineTo(width, lineY1);
        ctx.stroke();

        ctx.restore();
      }

      // --- 9. FULL SCREEN TV STATIC DROP/FLICKER ---
      if (tvSignalDrop) {
        ctx.save();
        ctx.fillStyle = 'rgba(4, 7, 10, 0.65)';
        ctx.fillRect(0, 0, width, height);
        
        for (let y = 0; y < height; y += 5) {
          if (Math.random() < 0.28) {
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.08 + 0.02})`;
            ctx.fillRect(0, y, width, Math.random() * 4 + 1);
          }
        }
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const syncY = Math.random() * height;
        ctx.moveTo(0, syncY);
        ctx.lineTo(width, syncY);
        ctx.stroke();

        ctx.restore();
      }

      // --- 10. DRAW ANALOG GLITCH BARS ---
      if (glitchActive) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.15)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, glitchBarY + glitchBarHeight / 2);
        ctx.lineTo(width, glitchBarY + glitchBarHeight / 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(96, 165, 250, 0.12)';
        ctx.beginPath();
        ctx.moveTo(0, (glitchBarY + 160) % height);
        ctx.lineTo(width, (glitchBarY + 160) % height);
        ctx.stroke();
      }

      // Restore screen shake translation
      ctx.restore();

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        display: 'block',
      }}
    />
  );
}
