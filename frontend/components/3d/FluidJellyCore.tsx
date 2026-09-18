"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sphere, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

function JellyMesh() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<any>(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    if (meshRef.current) {
      // Gentle continuous rotation
      meshRef.current.rotation.x = Math.sin(time * 0.3) * 0.4;
      meshRef.current.rotation.y = time * 0.25;
      meshRef.current.rotation.z = Math.cos(time * 0.2) * 0.3;

      // Mouse influence
      const mouseX = state.pointer.x * 0.5;
      const mouseY = state.pointer.y * 0.5;
      meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, mouseX, 0.05);
      meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, mouseY, 0.05);
    }
    
    if (materialRef.current) {
      // Dynamic distort pulsing
      materialRef.current.distort = 0.45 + Math.sin(time * 0.8) * 0.15;
      materialRef.current.speed = 2.5 + Math.cos(time * 0.5) * 0.8;
    }
  });

  return (
    <Float speed={2.5} rotationIntensity={1.2} floatIntensity={1.8}>
      {/* Central Iridescent Jelly Core */}
      <Sphere ref={meshRef} args={[1.7, 128, 128]} scale={1.2}>
        <MeshDistortMaterial
          ref={materialRef}
          color="#a855f7"
          roughness={0.12}
          metalness={0.1}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
          distort={0.5}
          speed={3.0}
        />
      </Sphere>

      {/* Orbiting Translucent Fluid Ribbons */}
      <FluidRings />
    </Float>
  );
}

function FluidRings() {
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = time * 0.4;
      ring1Ref.current.rotation.y = time * 0.6;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x = -time * 0.5;
      ring2Ref.current.rotation.z = time * 0.3;
    }
  });

  return (
    <>
      <mesh ref={ring1Ref} scale={2.6}>
        <torusGeometry args={[1, 0.06, 32, 100]} />
        <meshStandardMaterial
          color="#38bdf8"
          roughness={0.2}
          metalness={0.8}
          transparent
          opacity={0.7}
        />
      </mesh>
      <mesh ref={ring2Ref} scale={2.9}>
        <torusGeometry args={[1, 0.04, 32, 100]} />
        <meshStandardMaterial
          color="#ec4899"
          roughness={0.2}
          metalness={0.8}
          transparent
          opacity={0.6}
        />
      </mesh>
    </>
  );
}

export function FluidJellyCore() {
  return (
    <div className="relative w-full h-[450px] sm:h-[550px] flex items-center justify-center pointer-events-auto">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={1.2} />
        <directionalLight position={[10, 10, 5]} intensity={2.5} color="#ffffff" />
        <pointLight position={[-10, -10, -5]} intensity={2.0} color="#38bdf8" />
        <pointLight position={[10, -5, 5]} intensity={2.0} color="#ec4899" />
        <pointLight position={[0, 10, -2]} intensity={1.8} color="#a855f7" />

        <JellyMesh />
      </Canvas>
    </div>
  );
}
