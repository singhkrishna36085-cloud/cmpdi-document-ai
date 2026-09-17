"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshTransmissionMaterial, Sparkles } from "@react-three/drei";
import * as THREE from "three";

function CoreObject() {
  const meshRef = useRef<THREE.Group>(null);
  const outerRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Slow baseline rotation
    meshRef.current.rotation.y += delta * 0.15;
    meshRef.current.rotation.x += delta * 0.1;

    // Interactive tilt based on mouse pointer
    meshRef.current.rotation.x = THREE.MathUtils.lerp(
      meshRef.current.rotation.x,
      (state.pointer.y * Math.PI) / 6,
      0.05
    );
    meshRef.current.rotation.y = THREE.MathUtils.lerp(
      meshRef.current.rotation.y,
      (state.pointer.x * Math.PI) / 6,
      0.05
    );

    // Subtle pulsing of inner core
    if (innerRef.current) {
      innerRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2) * 0.05);
    }
  });

  return (
    <Float speed={2.5} rotationIntensity={0.8} floatIntensity={1.5}>
      <group ref={meshRef}>
        {/* Outer Faceted Shell (Obsidian/Coal) */}
        <mesh ref={outerRef}>
          <dodecahedronGeometry args={[2.8, 0]} />
          <MeshTransmissionMaterial
            backside
            backsideThickness={2}
            thickness={1.5}
            roughness={0.2}
            transmission={0.9}
            ior={1.8}
            chromaticAberration={0.8}
            anisotropy={0.5}
            distortion={0.4}
            distortionScale={0.5}
            temporalDistortion={0.1}
            color="#12141D" // Dark Obsidian
            emissive="#06b6d4" // Cyan bleed
            emissiveIntensity={0.15}
          />
        </mesh>
        
        {/* Inner intensely glowing core (Refined Intelligence) */}
        <mesh ref={innerRef}>
          <icosahedronGeometry args={[1.6, 1]} />
          <meshPhysicalMaterial 
            color="#10b981" 
            emissive="#10b981" 
            emissiveIntensity={4} 
            wireframe={true}
            transparent
            opacity={0.9}
          />
        </mesh>

        {/* Core solid energy center */}
        <mesh>
          <octahedronGeometry args={[1.2, 0]} />
          <meshBasicMaterial color="#06b6d4" />
        </mesh>
      </group>
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
        
        <Sparkles 
          count={400} 
          scale={18} 
          size={1.2} 
          speed={0.3} 
          opacity={0.6} 
          color="#06b6d4" 
          noise={0.1}
        />
        <Sparkles 
          count={150} 
          scale={15} 
          size={2.5} 
          speed={0.2} 
          opacity={0.4} 
          color="#10b981" 
          noise={0.2}
        />
        <Sparkles 
          count={50} 
          scale={10} 
          size={4} 
          speed={0.1} 
          opacity={0.8} 
          color="#a855f7" 
          noise={0.3}
        />
      </Canvas>
    </div>
  );
}
