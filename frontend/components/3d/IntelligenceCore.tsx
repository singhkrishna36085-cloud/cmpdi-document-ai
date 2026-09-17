"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, MeshTransmissionMaterial } from "@react-three/drei";
import * as THREE from "three";

export function IntelligenceCore() {
  const meshRef = useRef<THREE.Mesh>(null);
  const wireframeRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current && wireframeRef.current) {
      meshRef.current.rotation.y += 0.005;
      meshRef.current.rotation.x += 0.002;
      
      wireframeRef.current.rotation.y -= 0.003;
      wireframeRef.current.rotation.x -= 0.004;
      
      // Pulse scale
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      meshRef.current.scale.setScalar(scale);
      wireframeRef.current.scale.setScalar(scale * 1.2);
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      {/* Outer Crystalline Shell */}
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1.5, 0]} />
        <MeshTransmissionMaterial
          backside
          backsideThickness={1}
          thickness={0.5}
          roughness={0.1}
          transmission={1}
          ior={1.5}
          chromaticAberration={0.5}
          anisotropy={1}
          distortion={0.3}
          distortionScale={0.5}
          temporalDistortion={0.1}
          color="#06b6d4" // Cyan
          emissive="#10b981" // Emerald
          emissiveIntensity={0.2}
        />
      </mesh>
      
      {/* Inner Glowing Wireframe */}
      <mesh ref={wireframeRef}>
        <icosahedronGeometry args={[1.2, 1]} />
        <meshBasicMaterial color="#0ea5e9" wireframe transparent opacity={0.3} />
      </mesh>

      {/* Center Bright Core */}
      <mesh>
        <octahedronGeometry args={[0.5, 0]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      
      <pointLight position={[0, 0, 0]} intensity={2} color="#06b6d4" distance={10} />
    </Float>
  );
}
