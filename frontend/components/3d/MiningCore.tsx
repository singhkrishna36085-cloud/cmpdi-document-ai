"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshTransmissionMaterial, Sparkles } from "@react-three/drei";
import * as THREE from "three";

function CoreObject() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    // Slow baseline rotation
    meshRef.current.rotation.y += 0.002;
    meshRef.current.rotation.x += 0.001;

    // Interactive tilt based on mouse pointer
    meshRef.current.rotation.x = THREE.MathUtils.lerp(
      meshRef.current.rotation.x,
      (state.pointer.y * Math.PI) / 8,
      0.05
    );
    meshRef.current.rotation.y = THREE.MathUtils.lerp(
      meshRef.current.rotation.y,
      (state.pointer.x * Math.PI) / 8,
      0.05
    );
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={meshRef}>
        {/* Futuristic Polyhedron shape */}
        <icosahedronGeometry args={[2.5, 1]} />
        <MeshTransmissionMaterial
          backside
          backsideThickness={1}
          thickness={0.8}
          roughness={0.1}
          transmission={1}
          ior={1.5}
          chromaticAberration={0.5}
          anisotropy={1}
          distortion={0.3}
          distortionScale={0.5}
          temporalDistortion={0.1}
          color="#0ea5e9" // Light Blue/Cyan
          emissive="#10b981" // Emerald
          emissiveIntensity={0.2}
        />
      </mesh>
      
      {/* Inner glowing core */}
      <mesh>
        <icosahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#06b6d4" wireframe />
      </mesh>
    </Float>
  );
}

export function MiningCore() {
  return (
    <div className="absolute inset-0 z-0 h-full w-full pointer-events-auto">
      <Canvas 
        camera={{ position: [0, 0, 10], fov: 45 }} 
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={1} color="#06b6d4" />
        <pointLight position={[-10, -10, -10]} intensity={1.5} color="#10b981" />
        
        <CoreObject />
        
        {/* Floating Data Dust / Particles */}
        <Sparkles 
          count={300} 
          scale={15} 
          size={1.5} 
          speed={0.4} 
          opacity={0.4} 
          color="#06b6d4" 
        />
        <Sparkles 
          count={100} 
          scale={12} 
          size={2} 
          speed={0.2} 
          opacity={0.2} 
          color="#10b981" 
        />
      </Canvas>
    </div>
  );
}
