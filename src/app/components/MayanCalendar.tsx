'use client';
import { useRef, Suspense, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useTexture, Float } from '@react-three/drei';
import * as THREE from 'three';
import { useRouter } from 'next/navigation';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

function Calendar() {
  const groupRef = useRef<THREE.Group>(null);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const router = useRouter();
  
  const [colorMap] = useTexture(['/mayan_calendar_perfect.png']);

  const R_MAX = 3.2;
  const rings = useMemo(() => {
    // Define the distinct rings of the calendar
    // Radii calculated with exact pixel precision:
    // 0.63: Inner face (Center of deep groove)
    // 1.46: Inner glyphs
    // 1.77: Thin boundary ring
    // 2.55: Large outward triangles
    // 3.06: Outer rim
    const ringsData = [
      { inner: 0, outer: 0.63, speed: 0.2 },
      { inner: 0.63, outer: 1.46, speed: -0.15 },
      { inner: 1.46, outer: 1.77, speed: 0.25 }, // Fast rotating thin ring of dots
      { inner: 1.77, outer: 2.55, speed: -0.1 },
      { inner: 2.55, outer: 3.06, speed: 0.05 },
    ];
    
    return ringsData.map(data => {
      // Create either a circle for the center or a ring for the outer sections
      const geo = data.inner === 0 
        ? new THREE.CircleGeometry(data.outer, 512)
        : new THREE.RingGeometry(data.inner, data.outer, 512, 1);
        
      // Recalculate UVs so the texture maps perfectly across the entire combined radius
      // instead of stretching to fit each individual ring.
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
  }, [R_MAX]);

  useFrame((state, delta) => {
    // Rotate each ring individually at constant speed
    refs.current.forEach((mesh, index) => {
      if (mesh) {
        mesh.rotation.z += delta * rings[index].speed;
      }
    });
  });

  return (
    // Float only moves it up and down slightly, NO rotation so it stays a perfect circle
    <Float speed={1.5} rotationIntensity={0} floatIntensity={0.5}>
      <group 
        ref={groupRef}
        onClick={() => router.push('/ritual')}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        {rings.map((ring, index) => (
          <mesh
            key={index}
            geometry={ring.geo}
            ref={(el) => { refs.current[index] = el; }}
            position={[0, 0, 0]} // No Z-offset, they touch perfectly at the circumference
          >
            <meshStandardMaterial
              map={colorMap}
              color="#1133aa" // Deep, eerie blue-silver
              roughness={0.2}
              metalness={0.9}
              emissive="#0066ff" // Vibrant bluish glow
              emissiveMap={colorMap}
              emissiveIntensity={0.5} // Steady, dim-lit glow without flickering
              transparent={true}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </group>
    </Float>
  );
}

export default function MayanCalendar() {
  // Memoize the chromatic aberration offset so it's stable
  const aberrationOffset = useMemo(() => new THREE.Vector2(0.0015, 0.0015), []);

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 5, pointerEvents: 'none' }}>
      <div style={{ width: '100%', height: '100%', pointerEvents: 'auto' }}>
        <Canvas camera={{ position: [0, 0, 7] }}>
          <ambientLight intensity={0.2} />
          {/* Unsettling bluish lighting setup */}
          <directionalLight position={[0, -5, 5]} intensity={3.0} color="#0055ff" />
          <directionalLight position={[0, 5, 2]} intensity={1.0} color="#00ffff" />
          
          <Suspense fallback={null}>
            <Calendar />
          </Suspense>

          <EffectComposer>
            <Bloom 
              intensity={2.5} 
              luminanceThreshold={0.1} 
              luminanceSmoothing={0.8} 
              mipmapBlur 
            />
            {/* Subtle chromatic aberration for a dream-like, unsettling feel */}
            <ChromaticAberration
              blendFunction={BlendFunction.NORMAL}
              offset={aberrationOffset}
            />
          </EffectComposer>
        </Canvas>
      </div>
    </div>
  );
}
