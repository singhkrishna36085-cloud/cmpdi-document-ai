"use client";

import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { FluidDigitalMatter } from "./FluidDigitalMatter";
import { IntelligenceCore } from "./IntelligenceCore";
import { Suspense } from "react";

export function HeroScene({ scrollYProgress }: { scrollYProgress?: any }) {
  return (
    <div className="absolute inset-0 z-0 h-full w-full pointer-events-auto">
      <Canvas 
        camera={{ position: [0, 0, 30], fov: 45 }} 
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#ffffff" />
        
        <Suspense fallback={null}>
          <FluidDigitalMatter scrollYProgress={scrollYProgress} />
          {/* Hide IntelligenceCore for now to focus on the fluid matter, or we can keep it as a subtle element in the center */}
        </Suspense>
        
        <EffectComposer multisampling={0}>
          <Bloom 
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            intensity={1.5}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
