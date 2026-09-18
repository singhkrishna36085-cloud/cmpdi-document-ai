"use client";

import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { FluidDigitalMatter } from "./FluidDigitalMatter";
import { Suspense } from "react";

export function HeroScene({ scrollYProgress }: { scrollYProgress?: any }) {
  return (
    <div className="absolute inset-0 z-0 h-full w-full pointer-events-auto">
      <Canvas 
        camera={{ position: [0, 0, 32], fov: 45 }} 
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.6} />
        <pointLight position={[15, 15, 15]} intensity={1.2} color="#ffffff" />
        <pointLight position={[-15, -15, -15]} intensity={0.8} color="#06B6D4" />
        
        <Suspense fallback={null}>
          <FluidDigitalMatter scrollYProgress={scrollYProgress} />
        </Suspense>
        
        <EffectComposer multisampling={0}>
          <Bloom 
            luminanceThreshold={0.45}
            luminanceSmoothing={0.7}
            intensity={1.2}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
