"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { Float, Sphere, MeshDistortMaterial } from "@react-three/drei";

function GovernmentBuilding() {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Base/Pedestal */}
      <mesh position={[0, -1, 0]}>
        <cylinderGeometry args={[2, 2.2, 0.4, 32]} />
        <meshStandardMaterial color="#ffffff" roughness={0.1} metalness={0.1} />
      </mesh>
      <mesh position={[0, -0.7, 0]}>
        <cylinderGeometry args={[1.8, 2, 0.2, 32]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.2} />
      </mesh>
      
      {/* Pillars */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 1.4;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        return (
          <mesh key={i} position={[x, 0, z]}>
            <cylinderGeometry args={[0.15, 0.15, 1.6, 16]} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.1} metalness={0.2} />
          </mesh>
        );
      })}

      {/* Main Dome Body */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[1.2, 1.2, 1.6, 32]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Dome Top */}
      <mesh position={[0, 0.8, 0]}>
        <sphereGeometry args={[1.6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.2} metalness={0.4} />
      </mesh>

      {/* Spire/Finial */}
      <mesh position={[0, 1.8, 0]}>
        <cylinderGeometry args={[0.05, 0.1, 0.8, 16]} />
        <meshStandardMaterial color="#fbbf24" roughness={0.1} metalness={0.8} />
      </mesh>
      
      {/* Small Flag representation (Tricolor) */}
      <group position={[0.2, 1.8, 0]} rotation={[0, 0, -0.1]}>
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[0.6, 0.1, 0.02]} />
          <meshBasicMaterial color="#FF9933" />
        </mesh>
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[0.6, 0.1, 0.02]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[0.6, 0.1, 0.02]} />
          <meshBasicMaterial color="#138808" />
        </mesh>
      </group>
    </group>
  );
}

function FloatingElements() {
  return (
    <>
      {/* Soft gradient spheres */}
      <Float speed={2} rotationIntensity={1} floatIntensity={2}>
        <Sphere args={[0.4, 32, 32]} position={[-2, 1.5, -1]}>
          <MeshDistortMaterial color="#8b5cf6" distort={0.3} speed={2} roughness={0.2} transparent opacity={0.6} />
        </Sphere>
      </Float>
      
      <Float speed={1.5} rotationIntensity={1.5} floatIntensity={1.5}>
        <Sphere args={[0.6, 32, 32]} position={[2.5, -0.5, 0]}>
          <MeshDistortMaterial color="#38bdf8" distort={0.2} speed={1} roughness={0.1} transparent opacity={0.7} />
        </Sphere>
      </Float>

      <Float speed={2.5} rotationIntensity={0.5} floatIntensity={1}>
        <Sphere args={[0.3, 32, 32]} position={[1.5, 2, 1]}>
          <MeshDistortMaterial color="#f472b6" distort={0.4} speed={3} roughness={0.2} transparent opacity={0.5} />
        </Sphere>
      </Float>

      {/* Floating rings */}
      <Float speed={1} rotationIntensity={2} floatIntensity={0.5}>
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 3, Math.PI / 4, 0]}>
          <torusGeometry args={[3, 0.02, 16, 100]} />
          <meshBasicMaterial color="#8b5cf6" transparent opacity={0.2} />
        </mesh>
      </Float>
      <Float speed={1.2} rotationIntensity={2.5} floatIntensity={0.5}>
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 4, -Math.PI / 3, 0]}>
          <torusGeometry args={[3.5, 0.015, 16, 100]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.3} />
        </mesh>
      </Float>
    </>
  );
}

export function GovHero3D() {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
      <Canvas camera={{ position: [0, 1, 6], fov: 45 }} gl={{ alpha: true, antialias: true }}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[5, 10, 5]} intensity={2} color="#ffffff" />
        <pointLight position={[-5, 2, 5]} intensity={1.5} color="#8b5cf6" />
        <pointLight position={[5, 2, -5]} intensity={1.5} color="#38bdf8" />
        <pointLight position={[0, -5, 0]} intensity={1} color="#f472b6" />
        
        <GovernmentBuilding />
        <FloatingElements />
      </Canvas>
    </div>
  );
}
