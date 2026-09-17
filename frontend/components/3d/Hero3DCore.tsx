"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Hero2DFallback } from "./Hero2DFallback";

export function Hero3DCore() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hasWebGl, setHasWebGl] = useState<boolean>(true);

  useEffect(() => {
    if (!mountRef.current) return;

    // WebGL support check
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) {
        setHasWebGl(false);
        return;
      }
    } catch (e) {
      setHasWebGl(false);
      return;
    }

    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 7;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x06b6d4, 3, 50); // Cyan light
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x8b5cf6, 3, 50); // Purple light
    pointLight2.position.set(-5, -5, 5);
    scene.add(pointLight2);

    // 3. Central 3D Core Sphere & Glass Rings
    const group = new THREE.Group();
    scene.add(group);

    // Core Icosahedron
    const coreGeo = new THREE.IcosahedronGeometry(1.2, 2);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      metalness: 0.3,
      roughness: 0.2,
      wireframe: true,
      emissive: 0x3b82f6,
      emissiveIntensity: 0.4,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    group.add(coreMesh);

    // Inner Glowing Core
    const innerGeo = new THREE.SphereGeometry(0.8, 32, 32);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      roughness: 0.1,
      metalness: 0.8,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    group.add(innerMesh);

    // Orbital Ring 1
    const ringGeo1 = new THREE.TorusGeometry(2.0, 0.03, 16, 100);
    const ringMat1 = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      metalness: 0.8,
      roughness: 0.1,
    });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 3;
    group.add(ring1);

    // Orbital Ring 2
    const ringGeo2 = new THREE.TorusGeometry(2.4, 0.02, 16, 100);
    const ringMat2 = new THREE.MeshStandardMaterial({
      color: 0xec4899,
      metalness: 0.8,
      roughness: 0.1,
    });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.y = Math.PI / 4;
    group.add(ring2);

    // 4. Floating Particles Field
    const particlesCount = 180;
    const posArray = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 12;
    }
    const particlesGeo = new THREE.BufferGeometry();
    particlesGeo.setAttribute("position", new THREE.BufferAttribute(posArray, 3));
    const particlesMat = new THREE.PointsMaterial({
      size: 0.04,
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.7,
    });
    const particlesMesh = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particlesMesh);

    // 5. Mouse Parallax Motion
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left - width / 2;
      const y = event.clientY - rect.top - height / 2;
      targetX = x * 0.001;
      targetY = y * 0.001;
    };

    window.addEventListener("mousemove", handleMouseMove);

    // 6. Animation Loop
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Smooth camera / group rotation
      mouseX += (targetX - mouseX) * 0.05;
      mouseY += (targetY - mouseY) * 0.05;

      group.rotation.y += 0.006;
      group.rotation.x += 0.003;

      group.position.x = mouseX * 1.5;
      group.position.y = -mouseY * 1.5;

      ring1.rotation.z += 0.008;
      ring2.rotation.z -= 0.006;

      particlesMesh.rotation.y -= 0.001;

      renderer.render(scene, camera);
    };

    animate();

    // 7. Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      scene.clear();
    };
  }, []);

  if (!hasWebGl) {
    return <Hero2DFallback />;
  }

  return (
    <div className="relative w-full h-[480px] rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-800 shadow-2xl overflow-hidden flex items-center justify-center">
      {/* Background Volumetric Glows */}
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[550px] h-[550px] bg-cyan-500/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-[450px] h-[450px] bg-purple-600/15 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-[450px] h-[450px] bg-blue-600/15 rounded-full blur-[110px] pointer-events-none" />

      {/* 3D WebGL Canvas Mounting Point */}
      <div ref={mountRef} className="absolute inset-0 z-10 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Interactive 2D Cards Overlaying 3D Scene */}
      <div className="absolute z-20 top-8 left-6 sm:left-12 p-3.5 rounded-2xl glass-panel-interactive border-cyan-500/30 animate-float-slow flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
          <span className="font-bold text-xs font-mono">PDF</span>
        </div>
        <div>
          <div className="text-xs font-bold text-slate-100">CMPDI Geological Report</div>
          <span className="text-[10px] font-mono text-cyan-400">FAISS 384-Dim Embedded</span>
        </div>
      </div>

      <div className="absolute z-20 bottom-8 left-6 sm:left-12 p-3.5 rounded-2xl glass-panel-interactive border-purple-500/30 animate-float-reverse flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
          <span className="font-bold text-xs font-mono">RAG</span>
        </div>
        <div>
          <div className="text-xs font-bold text-slate-100">Evidence Citation Flow</div>
          <span className="text-[10px] font-mono text-purple-300">Answer ➔ Source ➔ Page</span>
        </div>
      </div>

      <div className="absolute z-20 top-8 right-6 sm:right-12 p-3.5 rounded-2xl glass-panel-interactive border-emerald-500/30 animate-float-reverse flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          <span className="font-bold text-xs font-mono">100%</span>
        </div>
        <div>
          <div className="text-xs font-bold text-slate-100">Data Validation Engine</div>
          <span className="text-[10px] font-mono text-emerald-400">Conflict Detection Active</span>
        </div>
      </div>

      <div className="absolute z-20 bottom-8 right-6 sm:right-12 p-3.5 rounded-2xl glass-panel-interactive border-amber-500/30 animate-float-slow flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
          <span className="font-bold text-xs font-mono">CIL</span>
        </div>
        <div>
          <div className="text-xs font-bold text-slate-100">Coal India Subsidiary</div>
          <span className="text-[10px] font-mono text-amber-300">Enterprise AI Security</span>
        </div>
      </div>
    </div>
  );
}
