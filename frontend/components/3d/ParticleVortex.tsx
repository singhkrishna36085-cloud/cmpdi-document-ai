"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function ParticleVortex() {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const [count, setCount] = useState(20000);

  useEffect(() => {
    const updateCount = () => {
      if (window.innerWidth < 768) {
        setCount(5000);
      } else if (window.innerWidth < 1024) {
        setCount(10000);
      } else {
        setCount(20000);
      }
    };
    updateCount();
    window.addEventListener("resize", updateCount);
    return () => window.removeEventListener("resize", updateCount);
  }, []);

  // Generate initial particle positions
  const [positions, randomness] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const rand = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      // Cylinder/Cone distribution
      const radius = Math.random() * 10 + 0.5;
      const theta = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 20; // Spread vertically

      // Add a vortex shape (wider at top, narrower at bottom)
      const r = radius * (1 + y * 0.1);

      pos[i * 3] = r * Math.cos(theta);
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = r * Math.sin(theta);

      rand[i * 3] = Math.random();
      rand[i * 3 + 1] = Math.random();
      rand[i * 3 + 2] = Math.random();
    }
    return [pos, rand];
  }, [count]);

  const vertexShader = `
    uniform float uTime;
    attribute vec3 aRandomness;
    varying vec3 vColor;
    
    void main() {
      vec3 pos = position;
      
      // Calculate radius and angle
      float radius = length(pos.xz);
      float angle = atan(pos.z, pos.x);
      
      // Swirl effect based on time and height
      float swirl = uTime * 0.2 + pos.y * 0.1;
      angle += swirl;
      
      // Add subtle noise/flow
      float noiseY = sin(uTime + pos.x * 0.5) * 0.5;
      pos.y += noiseY * aRandomness.y;
      
      pos.x = radius * cos(angle);
      pos.z = radius * sin(angle);

      // Model view projection
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      // Dynamic Size Attenuation
      gl_PointSize = (6.0 * aRandomness.x + 2.0) * (20.0 / -mvPosition.z);
      
      // Color Interpolation (Blue -> Cyan -> Teal -> Violet)
      // Base color on radius and angle and time
      float colorMix = sin(angle + uTime * 0.5) * 0.5 + 0.5;
      vec3 color1 = vec3(0.02, 0.71, 0.83); // Cyan
      vec3 color2 = vec3(0.06, 0.73, 0.51); // Emerald/Teal
      vec3 color3 = vec3(0.54, 0.17, 0.89); // Violet
      
      vec3 finalColor = mix(color1, color2, colorMix);
      if (radius > 5.0) {
         finalColor = mix(finalColor, color3, clamp((radius - 5.0) * 0.1, 0.0, 1.0));
      }
      
      vColor = finalColor;
    }
  `;

  const fragmentShader = `
    varying vec3 vColor;
    
    void main() {
      // Make particles circular with soft edges
      float dist = length(gl_PointCoord - vec2(0.5));
      if (dist > 0.5) discard;
      
      float alpha = smoothstep(0.5, 0.1, dist);
      
      gl_FragColor = vec4(vColor, alpha * 0.8);
    }
  `;

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
    }),
    []
  );

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
    if (pointsRef.current) {
      // Subtle mouse interaction for parallax and rotation
      const mouseX = state.pointer.x;
      const mouseY = state.pointer.y;
      
      pointsRef.current.rotation.y = THREE.MathUtils.lerp(pointsRef.current.rotation.y, mouseX * 0.2, 0.05);
      pointsRef.current.rotation.x = THREE.MathUtils.lerp(pointsRef.current.rotation.x, mouseY * 0.1, 0.05);
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-aRandomness"
          args={[randomness, 3]}
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
}
