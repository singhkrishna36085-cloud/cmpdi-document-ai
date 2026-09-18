"use client";

import React, { useRef, useState, useMemo } from "react";
import Image from "next/image";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { Sparkles, Layers, Cpu, Database, Activity, Zap, Compass } from "lucide-react";

// ── 3D THREE.JS VORTEX & FLOATING DOCUMENT PAGES ──
function DocumentVortex({ count = 22, speed = 1.0 }: { count?: number; speed?: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      progress: (i / count),
      speed: 0.28 + Math.random() * 0.22,
      radiusOffset: 0.8 + Math.random() * 0.4,
      rotSpeed: 1.2 + Math.random() * 0.8,
      wobble: Math.random() * Math.PI * 2,
      scale: 0.12 + Math.random() * 0.08,
      aspect: 1.414,
    }));
  }, [count]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const time = state.clock.elapsedTime * speed;

    particles.forEach((p, i) => {
      p.progress = (p.progress + delta * p.speed * 0.35) % 1.0;
      
      const y = -1.3 + p.progress * 3.4;
      const coneRadius = (0.25 + Math.pow(p.progress, 1.2) * 1.35) * p.radiusOffset;
      const angle = time * p.rotSpeed + p.progress * Math.PI * 6.0 + p.wobble;

      const x = Math.cos(angle) * coneRadius;
      const z = Math.sin(angle) * coneRadius * 0.7;

      dummy.position.set(x, y, z);
      
      dummy.rotation.set(
        Math.sin(time * 2.0 + i) * 0.6 + p.progress * 2.0,
        angle + Math.PI / 2 + Math.cos(time + i) * 0.4,
        Math.sin(time * 1.5 + i * 2) * 0.5
      );
      
      const s = p.scale * (0.8 + Math.sin(p.progress * Math.PI) * 0.4);
      dummy.scale.set(s, s * p.aspect, s * 0.1);
      dummy.updateMatrix();

      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
    >
      <boxGeometry args={[1, 1, 0.05]} />
      <meshStandardMaterial
        color="#e0e7ff"
        emissive="#818cf8"
        emissiveIntensity={0.65}
        roughness={0.2}
        metalness={0.1}
        transparent
        opacity={0.88}
      />
    </instancedMesh>
  );
}

// ── VORTEX ENERGY SPIRAL PARTICLES ──
function VortexEnergyRays({ count = 90 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const [positions, phases, speeds] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const phs = new Float32Array(count);
    const spd = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      phs[i] = Math.random();
      spd[i] = 0.4 + Math.random() * 0.6;
      pos[i * 3] = 0;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = 0;
    }
    return [pos, phs, spd];
  }, [count]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const time = state.clock.elapsedTime;
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const posArray = posAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      phases[i] = (phases[i] + delta * speeds[i] * 0.45) % 1.0;
      const prog = phases[i];
      const y = -1.4 + prog * 3.5;
      const coneR = 0.2 + Math.pow(prog, 1.1) * 1.25;
      const angle = time * (1.8 + speeds[i]) + prog * Math.PI * 8.0 + (i * 0.3);

      posArray[i * 3] = Math.cos(angle) * coneR;
      posArray[i * 3 + 1] = y;
      posArray[i * 3 + 2] = Math.sin(angle) * coneR * 0.75;
    }

    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.065}
        color="#c084fc"
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ── FLOATING NEURAL CONSTELLATION NODES ──
function NeuralConstellationNodes() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(t * 0.8) * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh position={[-2.4, 0.4, 0]}>
        <octahedronGeometry args={[0.12]} />
        <meshBasicMaterial color="#38bdf8" wireframe />
      </mesh>
      <mesh position={[-2.1, 0.8, -0.2]}>
        <octahedronGeometry args={[0.09]} />
        <meshBasicMaterial color="#818cf8" wireframe />
      </mesh>
      <mesh position={[2.3, 0.6, 0]}>
        <octahedronGeometry args={[0.13]} />
        <meshBasicMaterial color="#38bdf8" wireframe />
      </mesh>
      <mesh position={[2.5, 0.2, -0.3]}>
        <octahedronGeometry args={[0.08]} />
        <meshBasicMaterial color="#c084fc" wireframe />
      </mesh>
    </group>
  );
}

// ── EXTRACTOR PULSE RINGS ──
function ExtractorPulseRings() {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ringRef.current) {
      const s = 1.0 + (t % 1.5) * 0.6;
      ringRef.current.scale.set(s, s, s);
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 0.7 - (t % 1.5) * 0.45);
    }
  });

  return (
    <mesh ref={ringRef} position={[0, 1.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.8, 0.95, 32]} />
      <meshBasicMaterial color="#a855f7" transparent opacity={0.6} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ── INTERACTIVE HOTSPOTS DATA ──
const HOTSPOTS = [
  {
    id: "extractor",
    label: "Neural Extraction Funnel",
    sub: "High-throughput OCR and parsing machine",
    metric: "12,400 pgs/min",
    icon: Cpu,
    x: "50%",
    y: "14%",
    color: "from-purple-500 to-indigo-500"
  },
  {
    id: "vortex",
    label: "Grounded Document Stream",
    sub: "Multi-page borehole logs and maps",
    metric: "FAISS Vectorized",
    icon: Layers,
    x: "50%",
    y: "36%",
    color: "from-violet-500 to-pink-500"
  },
  {
    id: "strata",
    label: "Stratified Geological Core",
    sub: "Coal seams and overburden thickness",
    metric: "14.8 MT Proved",
    icon: Database,
    x: "50%",
    y: "68%",
    color: "from-blue-500 to-cyan-400"
  },
  {
    id: "telemetry",
    label: "Autonomous Cavern Drones",
    sub: "Continuous subsurface safety scans",
    metric: "Zero Incidents",
    icon: Activity,
    x: "78%",
    y: "56%",
    color: "from-emerald-500 to-teal-400"
  }
];

export function Geological3DKnowledgeCore() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);
  const [streamActive, setStreamActive] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<"1x" | "2x">("1x");

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 20, stiffness: 180 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [10, -10]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-12, 12]), springConfig);
  const glareX = useSpring(useTransform(mouseX, [-0.5, 0.5], [0, 100]), springConfig);
  const glareY = useSpring(useTransform(mouseY, [-0.5, 0.5], [0, 100]), springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setActiveHotspot(null);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-[520px] sm:h-[620px] rounded-3xl overflow-hidden select-none cursor-crosshair perspective-[1200px]"
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className="relative w-full h-full rounded-3xl overflow-hidden border border-purple-500/30 bg-[#060814] shadow-[0_25px_80px_rgba(0,0,0,0.6)] transition-shadow duration-300 hover:shadow-[0_30px_90px_rgba(168,85,247,0.25)]"
      >
        <div className="absolute inset-0 z-0 transform-gpu scale-105 transition-transform duration-500">
          <Image
            src="/images/geological_knowledge_core_v2.jpg"
            alt="Geological Document Intelligence Core"
            fill
            priority
            quality={100}
            className="object-cover object-center filter brightness-[1.02] contrast-[1.05]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40 pointer-events-none" />
          <div className="absolute inset-0 bg-radial from-transparent via-transparent to-black/60 pointer-events-none" />
        </div>

        <div className="absolute inset-0 z-10 pointer-events-none">
          <Canvas
            camera={{ position: [0, 0, 5.2], fov: 48 }}
            gl={{ antialias: true, alpha: true }}
            dpr={[1, 2]}
          >
            <ambientLight intensity={1.2} />
            <directionalLight position={[0, 5, 3]} intensity={2.5} color="#ffffff" />
            <pointLight position={[0, 2, 1]} intensity={3.5} color="#c084fc" />
            <pointLight position={[0, -1, 1]} intensity={2.0} color="#38bdf8" />

            <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.4}>
              {streamActive && (
                <>
                  <DocumentVortex count={26} speed={speedMultiplier === "2x" ? 1.8 : 1.0} />
                  <VortexEnergyRays count={100} />
                  <ExtractorPulseRings />
                </>
              )}
              <NeuralConstellationNodes />
            </Float>
          </Canvas>
        </div>

        <div className="absolute inset-0 z-20 pointer-events-none">
          {HOTSPOTS.map((h) => {
            const isSelected = activeHotspot === h.id;
            return (
              <div
                key={h.id}
                style={{ left: h.x, top: h.y }}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
              >
                <button
                  onMouseEnter={() => setActiveHotspot(h.id)}
                  onClick={() => setActiveHotspot(isSelected ? null : h.id)}
                  className="relative group p-1.5 focus:outline-none cursor-pointer"
                >
                  <span className="absolute inset-0 rounded-full bg-purple-500/40 animate-ping" />
                  <span className="relative flex items-center justify-center w-6 h-6 rounded-full bg-slate-950/90 border border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.6)] text-cyan-300 group-hover:scale-125 transition-transform">
                    <Zap className="w-3 h-3" />
                  </span>
                </button>

                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 5, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 w-56 p-3 rounded-2xl bg-slate-950/90 backdrop-blur-xl border border-white/20 shadow-2xl text-left z-30 pointer-events-auto"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`p-1.5 rounded-lg bg-gradient-to-r ${h.color} text-white`}>
                          <h.icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="text-xs font-bold text-white leading-tight">
                          {h.label}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-snug mb-2">
                        {h.sub}
                      </p>
                      <div className="flex items-center justify-between text-[10px] font-mono font-semibold pt-1.5 border-t border-white/10 text-cyan-300">
                        <span>Telemetry:</span>
                        <span className="px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
                          {h.metric}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <div className="absolute top-4 inset-x-4 z-30 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-xl border border-purple-500/30 text-xs text-slate-200 font-mono shadow-[0_0_25px_rgba(168,85,247,0.25)] pointer-events-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
            <span className="font-semibold text-white">Geological AI Knowledge Core</span>
            <span className="text-slate-500">|</span>
            <span className="text-cyan-300">3D Neural Flow</span>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={() => setSpeedMultiplier(speedMultiplier === "1x" ? "2x" : "1x")}
              className="px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 active:scale-95 border border-white/20 text-xs font-mono font-medium text-slate-200 transition-all shadow-md cursor-pointer flex items-center gap-1.5 backdrop-blur-md"
            >
              <Activity className="w-3 h-3 text-purple-400" />
              <span>Vortex: <strong className="text-cyan-400">{speedMultiplier}</strong></span>
            </button>
            <button
              onClick={() => setStreamActive(!streamActive)}
              className="px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 active:scale-95 border border-white/20 text-xs font-mono font-medium text-slate-200 transition-all shadow-md cursor-pointer flex items-center gap-1.5 backdrop-blur-md"
            >
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Stream: <strong className={streamActive ? "text-emerald-400" : "text-rose-400"}>{streamActive ? "ON" : "OFF"}</strong></span>
            </button>
          </div>
        </div>

        <motion.div
          style={{
            background: useTransform(
              [glareX, glareY],
              ([x, y]) =>
                `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.12) 0%, transparent 60%)`
            ),
          }}
          className="absolute inset-0 pointer-events-none z-25"
        />

        <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-2 text-[11px] font-mono text-slate-300 bg-slate-950/70 py-1.5 px-4 rounded-full max-w-fit mx-auto border border-white/10 backdrop-blur-md z-30 pointer-events-none shadow-lg">
          <Compass className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
          <span>Move cursor to tilt 3D depth • Hover glowing nodes to inspect geological layers</span>
        </div>
      </motion.div>
    </div>
  );
}

export default Geological3DKnowledgeCore;