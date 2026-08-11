'use client';
import React, { useMemo, useRef, Suspense, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture, Float } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

function Calendar({ position, scale, active, opacity = 1, reverse = false }: { position: [number, number, number], scale: number, active: boolean, opacity?: number, reverse?: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const matRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const speedMult = useRef(0.2);

  const [colorMap] = useTexture(['/mayan_calendar_perfect.png']);

  const R_MAX = 3.2;
  const rings = useMemo(() => {
    const ringsData = [
      { inner: 0, outer: 0.70, speed: 0.05 },
      { inner: 0.70, outer: 1.46, speed: -0.02 },
      { inner: 1.46, outer: 1.77, speed: 0.08 }, 
      { inner: 1.77, outer: 2.55, speed: -0.03 },
      { inner: 2.55, outer: 3.06, speed: 0.01 },
    ];

    return ringsData.map(data => {
      const geo = data.inner === 0
        ? new THREE.CircleGeometry(data.outer, 64)
        : new THREE.RingGeometry(data.inner, data.outer, 64, 1);

      const pos = geo.attributes.position;
      const uvs = geo.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        uvs.setXY(i, (x / R_MAX + 1) / 2, (y / R_MAX + 1) / 2);
      }
      geo.attributes.uv.needsUpdate = true;
      return { geo, speed: data.speed };
    });
  }, []);

  useFrame((state, delta) => {
    const targetMult = active ? 2.2 : 0.15;
    speedMult.current = THREE.MathUtils.lerp(speedMult.current, targetMult, delta * 1.2);

    const targetIntensity = (active ? 3.5 : 0.2) * opacity;
    const targetColor = active ? new THREE.Color('#0088ff') : new THREE.Color('#2a2a2a');

    refs.current.forEach((mesh, index) => {
      if (mesh) {
        const direction = reverse ? -1 : 1;
        mesh.rotation.z += delta * rings[index].speed * speedMult.current * direction;
      }
    });

    matRefs.current.forEach(mat => {
      if (mat) {
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, opacity, delta * 4);
        mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, targetIntensity, delta * 2);
        mat.emissive.lerp(targetColor, delta * 1.5);
      }
    });
  });

  return (
    <Float speed={1} rotationIntensity={0} floatIntensity={0.2}>
      <group ref={groupRef} position={position} scale={scale}>
        {rings.map((ring, index) => (
          <mesh key={index} geometry={ring.geo} ref={(el) => { refs.current[index] = el; }}>
            <meshStandardMaterial
              ref={(el) => { matRefs.current[index] = el; }}
              map={colorMap}
              color="#000000" 
              roughness={0.4}
              metalness={0.8}
              emissive="#2a2a2a" 
              emissiveMap={colorMap}
              emissiveIntensity={0.2} 
              transparent={true}
              opacity={opacity}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </group>
    </Float>
  );
}

function DualCalendars({ active, scrollProgress }: { active: boolean, scrollProgress: number }) {
  const { viewport } = useThree();
  
  const cornerX = viewport.width / 2;
  const cornerY = viewport.height / 2;
  
  const baseScale = Math.max(1.2, viewport.width * 0.0875);
  const faceRadius = 0.70;
  const inset = faceRadius * baseScale;
  
  // Top calendar is always 100% visible
  const topOpacity = 1;
  
  // Bottom calendar opacity smoothly fades in from 0 to 1 as user scrolls down past 20%
  const bottomOpacity = Math.min(1, Math.max(0, (scrollProgress - 0.15) / 0.65));
  
  return (
    <>
      {/* Top Left Calendar */}
      <Calendar position={[-cornerX + inset, cornerY - inset, 0]} scale={baseScale} active={active} opacity={topOpacity} />
      
      {/* Bottom Right Calendar - Appears ONLY when scrolling down to bottom */}
      <Calendar position={[cornerX - inset, -cornerY + inset, 0]} scale={baseScale} active={active} opacity={bottomOpacity} reverse={true} />
    </>
  );
}

export default function AbyssBackground() {
  const [magicActive, setMagicActive] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const aberrationOffset = useMemo(() => new THREE.Vector2(0.001, 0.001), []);

  useEffect(() => {
    const handleActivate = () => setMagicActive(true);
    const handleDeactivate = () => setMagicActive(false);

    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        setScrollProgress(window.scrollY / totalScroll);
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('nx-activate-magic', handleActivate);
      window.addEventListener('nx-deactivate-magic', handleDeactivate);
      window.addEventListener('scroll', handleScroll, { passive: true });
      handleScroll();

      return () => {
        window.removeEventListener('nx-activate-magic', handleActivate);
        window.removeEventListener('nx-deactivate-magic', handleDeactivate);
        window.removeEventListener('scroll', handleScroll);
      };
    }
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none', background: '#010203' }}>
      <Canvas 
        camera={{ position: [0, 0, 7], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, powerPreference: "high-performance" }}
      >
        <fog attach="fog" args={['#010203', 5, 30]} />

        <Suspense fallback={null}>
          <DualCalendars active={magicActive} scrollProgress={scrollProgress} />
        </Suspense>

        <EffectComposer multisampling={0}>
          <Bloom
            intensity={3.0}
            luminanceThreshold={0.1}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
          <ChromaticAberration
            blendFunction={BlendFunction.NORMAL}
            offset={aberrationOffset}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
