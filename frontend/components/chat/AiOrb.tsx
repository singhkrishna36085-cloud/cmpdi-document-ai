"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { Float } from "@react-three/drei";
import { motion } from "framer-motion";

interface AiOrbProps {
  isThinking: boolean;
}

function MiniFacetedCore({ isThinking }: { isThinking: boolean }) {
  const meshRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Rotate faster when thinking
    const rotationSpeed = isThinking ? 3 : 0.5;
    meshRef.current.rotation.y += delta * rotationSpeed;
    meshRef.current.rotation.x += delta * (rotationSpeed * 0.5);

    if (innerRef.current) {
      innerRef.current.scale.setScalar(
        isThinking 
          ? 1 + Math.sin(state.clock.elapsedTime * 8) * 0.15
          : 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05
      );
    }
  });

  return (
    <Float speed={isThinking ? 4 : 2} rotationIntensity={1} floatIntensity={1}>
      <group ref={meshRef}>
        {/* Outer Dark Faceted Shell */}
        <mesh>
          <icosahedronGeometry args={[1.5, 0]} />
          <meshPhysicalMaterial
            color="#090A0F"
            roughness={0.1}
            transmission={0.8}
            thickness={1}
            ior={2.0}
            emissive="#06b6d4"
            emissiveIntensity={0.2}
            transparent
            opacity={0.9}
          />
        </mesh>
        
        {/* Inner Glowing Core */}
        <mesh ref={innerRef}>
          <octahedronGeometry args={[0.8, 0]} />
          <meshBasicMaterial color={isThinking ? "#22d3ee" : "#10b981"} wireframe />
        </mesh>
      </group>
    </Float>
  );
}

export function AiOrb({ isThinking }: AiOrbProps) {
  return (
    <div className="relative flex items-center justify-center w-12 h-12 shrink-0">
      {/* Background ambient glow */}
      <motion.div
        className="absolute inset-0 rounded-full blur-xl z-0"
        animate={{
          backgroundColor: isThinking ? "rgba(34, 211, 238, 0.4)" : "rgba(16, 185, 129, 0.2)",
          scale: isThinking ? [1, 1.5, 1] : 1,
          opacity: isThinking ? [0.6, 1, 0.6] : 0.4,
        }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      />
      
      {/* Mini 3D Canvas */}
      <div className="absolute inset-[-10px] z-10 pointer-events-none">
        <Canvas camera={{ position: [0, 0, 4], fov: 45 }} gl={{ alpha: true }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} color="#06b6d4" />
          <pointLight position={[-10, -10, -10]} intensity={0.5} color="#10b981" />
          <MiniFacetedCore isThinking={isThinking} />
        </Canvas>
      </div>
    </div>
  );
}
