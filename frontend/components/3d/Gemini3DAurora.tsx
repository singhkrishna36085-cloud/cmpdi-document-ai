"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export function Gemini3DAurora() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check WebGL availability
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) return;
    } catch {
      return;
    }

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 650;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 0, 14);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // Multi-Light Setup in Gemini Palette: Violet, Cyan, Magenta, Amber
    const ambientLight = new THREE.AmbientLight(0x0f172a, 1.5);
    scene.add(ambientLight);

    const cyanLight = new THREE.PointLight(0x06b6d4, 4.0, 45);
    cyanLight.position.set(8, 6, 8);
    scene.add(cyanLight);

    const violetLight = new THREE.PointLight(0x8b5cf6, 4.5, 45);
    violetLight.position.set(-8, -5, 6);
    scene.add(violetLight);

    const magentaLight = new THREE.PointLight(0xec4899, 3.5, 40);
    magentaLight.position.set(0, -7, 4);
    scene.add(magentaLight);

    const amberLight = new THREE.PointLight(0xf59e0b, 2.5, 35);
    amberLight.position.set(-4, 7, -2);
    scene.add(amberLight);

    // ── 1. GEMINI FLUID 3D QUANTUM WAVE MESH ──
    const cols = 90;
    const rows = 55;
    const waveGeo = new THREE.PlaneGeometry(28, 18, cols, rows);
    const posAttr = waveGeo.attributes.position;
    const originalPositions = new Float32Array(posAttr.array);

    // Iridescent metallic/glass material
    const waveMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e1b4b,
      metalness: 0.85,
      roughness: 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      transmission: 0.25,
      opacity: 0.95,
      transparent: true,
      side: THREE.DoubleSide,
      wireframe: false,
    });

    const waveMesh = new THREE.Mesh(waveGeo, waveMat);
    waveMesh.rotation.x = -Math.PI * 0.22;
    waveMesh.rotation.z = Math.PI * 0.05;
    waveMesh.position.y = -1.2;
    scene.add(waveMesh);

    // ── 2. OVERLAY TECH GRID WIREFRAME (Gemini Neural Architecture) ──
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.2,
    });
    const wireMesh = new THREE.Mesh(waveGeo, wireMat);
    wireMesh.position.copy(waveMesh.position);
    wireMesh.rotation.copy(waveMesh.rotation);
    scene.add(wireMesh);

    // ── 3. FLOATING GEMINI NEURAL STARFIELD ──
    const starCount = 350;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starScales = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const idx = i * 3;
      starPos[idx] = (Math.random() - 0.5) * 36;
      starPos[idx + 1] = (Math.random() - 0.5) * 24;
      starPos[idx + 2] = (Math.random() - 0.5) * 20;
      starScales[i] = Math.random() * 0.8 + 0.2;
    }

    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute("scale", new THREE.BufferAttribute(starScales, 1));

    const starMat = new THREE.PointsMaterial({
      color: 0xe0e7ff,
      size: 0.09,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });

    const starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);

    // Mouse Interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      targetX = x * 2.2;
      targetY = -y * 2.2;
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Animation Loop
    let animationId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Smooth camera damping
      mouseX += (targetX - mouseX) * 0.05;
      mouseY += (targetY - mouseY) * 0.05;
      camera.position.x = mouseX * 2.0;
      camera.position.y = mouseY * 1.5;
      camera.lookAt(0, 0, 0);

      // Light oscillation for iridescent chromatic shift
      cyanLight.position.x = 8 * Math.cos(time * 0.4);
      cyanLight.position.y = 6 * Math.sin(time * 0.3);
      violetLight.position.x = -8 * Math.sin(time * 0.35);
      violetLight.position.y = -5 * Math.cos(time * 0.45);
      magentaLight.position.z = 4 + 2 * Math.sin(time * 0.5);

      // Procedural Multi-Harmonic Wave Deformation (Gemini Ribbon)
      const positions = waveGeo.attributes.position.array as Float32Array;
      const totalVertices = positions.length / 3;

      for (let i = 0; i < totalVertices; i++) {
        const u = originalPositions[i * 3];
        const v = originalPositions[i * 3 + 1];

        // Harmonic Perlin-like oscillation
        const wave1 = Math.sin(u * 0.35 + time * 1.4) * Math.cos(v * 0.3 + time * 1.1) * 1.6;
        const wave2 = Math.sin(u * 0.7 - time * 0.9 + v * 0.5) * 0.8;
        const wave3 = Math.cos((u + v) * 0.45 + time * 1.7) * 0.6;
        
        // Mouse ripple pulse
        const distToMouse = Math.hypot(u - mouseX * 7.0, v - mouseY * 5.0);
        const mousePulse = Math.sin(Math.max(0, 6.0 - distToMouse) * 1.2 - time * 3.0) * 0.4;

        positions[i * 3 + 2] = originalPositions[i * 3 + 2] + wave1 + wave2 + wave3 + mousePulse;
      }

      waveGeo.attributes.position.needsUpdate = true;
      waveGeo.computeVertexNormals();

      // Gentle Starfield drift
      starPoints.rotation.y = time * 0.02;
      starPoints.rotation.x = time * 0.01;

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      waveGeo.dispose();
      waveMat.dispose();
      wireMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={mountRef} 
      className="absolute inset-0 z-0 h-full w-full pointer-events-auto overflow-hidden" 
    />
  );
}
