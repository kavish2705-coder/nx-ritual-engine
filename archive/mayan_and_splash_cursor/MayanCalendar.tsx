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
    const ringsData = [
      { inner: 0, outer: 0.63, speed: 0.2 },
      { inner: 0.63, outer: 1.46, speed: -0.15 },
      { inner: 1.46, outer: 1.77, speed: 0.25 },
      { inner: 1.77, outer: 2.55, speed: -0.1 },
      { inner: 2.55, outer: 3.06, speed: 0.05 },
    ];

    return ringsData.map(data => {
      const geo = data.inner === 0
        ? new THREE.CircleGeometry(data.outer, 512)
        : new THREE.RingGeometry(data.inner, data.outer, 512, 1);

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
    refs.current.forEach((mesh, index) => {
      if (mesh) {
        mesh.rotation.z += delta * rings[index].speed;
      }
    });
  });

  return (
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
            position={[0, 0, 0]}
          >
            <meshStandardMaterial
              map={colorMap}
              color="#1133aa"
              roughness={0.2}
              metalness={0.9}
              emissive="#0066ff"
              emissiveMap={colorMap}
              emissiveIntensity={0.5}
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
  const aberrationOffset = useMemo(() => new THREE.Vector2(0.0015, 0.0015), []);

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 5, pointerEvents: 'none' }}>
      <div style={{ width: '100%', height: '100%', pointerEvents: 'auto' }}>
        <Canvas camera={{ position: [0, 0, 7] }}>
          <ambientLight intensity={0.2} />
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
