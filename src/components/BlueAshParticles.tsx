'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
  uniform float u_time;
  attribute float a_random;
  attribute float a_size;
  attribute float a_speed;
  
  varying float v_alpha;
  
  void main() {
    vec3 pos = position;
    
    // Generate pseudo-random direction based on a_random
    float angle1 = a_random * 6.28318; // 2 * PI
    float angle2 = fract(a_random * 12.34) * 6.28318;
    
    vec3 dir = vec3(
      sin(angle1) * cos(angle2),
      sin(angle2),
      cos(angle1) * cos(angle2)
    );
    
    // Slow drift in random direction
    pos += dir * u_time * a_speed * 0.8;
    
    // Organic sway added to the slow drift
    pos.x += sin(u_time * 0.2 + a_random * 100.0) * 0.1 * a_speed;
    pos.y += cos(u_time * 0.15 + a_random * 50.0) * 0.1 * a_speed;
    
    // Wrap around 3D bounds (-10 to 10 for all axes)
    pos = mod(pos + 10.0, 20.0) - 10.0;
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // Point size depends on depth and is much smaller
    gl_PointSize = a_size * (12.0 / -mvPosition.z);
    
    // Fade in and out near edges so they don't pop when wrapping
    float fadeX = smoothstep(10.0, 6.0, abs(pos.x));
    float fadeY = smoothstep(10.0, 6.0, abs(pos.y));
    float fadeZ = smoothstep(10.0, 6.0, abs(pos.z));
    v_alpha = fadeX * fadeY * fadeZ * (0.2 + a_random * 0.8);
  }
`;

const fragmentShader = `
  uniform vec3 u_color_bright;
  uniform vec3 u_color_dark;
  
  varying float v_alpha;
  
  void main() {
    // Convert gl_PointCoord (0 to 1) to centered coordinates (-0.5 to 0.5)
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    
    // Circular bounds
    if(dist > 0.5) discard;
    
    // Soft radial glow
    float glow = 1.0 - (dist * 2.0);
    glow = pow(glow, 1.2); 
    
    // Color mapping: bright cyan core, deep electric blue outer
    vec3 finalColor = mix(u_color_dark, u_color_bright, glow);
    
    gl_FragColor = vec4(finalColor, glow * v_alpha);
  }
`;

const Particles = ({ count = 150 }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Generate random attributes once
  const [positions, randoms, sizes, speeds] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const rnd = new Float32Array(count);
    const sz = new Float32Array(count);
    const spd = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Scatter particles in a wide 3D box
      pos[i * 3 + 0] = (Math.random() - 0.5) * 15; // X
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10; // Y
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2; // Z (pushed back a bit)

      rnd[i] = Math.random();
      // Sizes vary from tiny specks to slightly larger embers, overall much smaller
      sz[i] = Math.random() * 2.0 + 0.5; 
      // Speed varies, much slower drift
      spd[i] = Math.random() * 0.15 + 0.05;
    }
    return [pos, rnd, sz, spd];
  }, [count]);

  const uniforms = useMemo(() => ({
    u_time: { value: 0 },
    // Bright cyan core (flame hot center)
    u_color_bright: { value: new THREE.Color(0x38bdf8) }, 
    // Deep electric blue glow
    u_color_dark: { value: new THREE.Color(0x1d4ed8) }, 
  }), []);

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.u_time.value += delta;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-a_random"
          count={count}
          args={[randoms, 1]}
        />
        <bufferAttribute
          attach="attributes-a_size"
          count={count}
          args={[sizes, 1]}
        />
        <bufferAttribute
          attach="attributes-a_speed"
          count={count}
          args={[speeds, 1]}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default function BlueAshParticles() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: '#020202' }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        gl={{ alpha: true, antialias: false }}
        style={{ width: '100%', height: '100%' }}
      >
        <Particles count={150} />
      </Canvas>
    </div>
  );
}
