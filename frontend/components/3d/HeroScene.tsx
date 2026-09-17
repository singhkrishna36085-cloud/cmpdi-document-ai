"use client";

import { Canvas } from "@react-three/fiber";
import { ParticleVortex } from "./ParticleVortex";
import { IntelligenceCore } from "./IntelligenceCore";
import { EffectComposer, Bloom } from "@react-three/postprocessing";

export function HeroScene() {
  return (
    <div className="absolute inset-0 z-0 h-full w-full pointer-events-auto bg-[#03050A]">
      <Canvas 
        camera={{ position: [0, 5, 25], fov: 45 }} 
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        dpr={[1, 2]} // limit device pixel ratio for performance
      >
        <ambientLight intensity={0.2} />
        <directionalLight position={[10, 10, 10]} intensity={1} color="#06b6d4" />
        
        {/* The flowing digital sand/vortex */}
        <ParticleVortex />
        
        {/* The floating intelligence core */}
        <IntelligenceCore />

        <EffectComposer>
          <Bloom 
            luminanceThreshold={0.2} 
            mipmapBlur 
            intensity={1.5} 
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
