"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function ParticleVortex() {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const [count, setCount] = useState(25000); // Higher default for desktop

  useEffect(() => {
    const updateCount = () => {
      if (window.innerWidth < 768) {
        setCount(8000);
      } else if (window.innerWidth < 1024) {
        setCount(15000);
      } else {
        setCount(25000);
      }
    };
    updateCount();
    window.addEventListener("resize", updateCount);
    return () => window.removeEventListener("resize", updateCount);
  }, []);

  // Generate initial particle positions
  const [positions, randomness] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const rand = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      // V-shaped / valley-shaped conical vortex
      const y = (Math.random() - 0.5) * 40; // Depth/height
      
      // Radius increases as y goes up, creating a V-shape
      // clamp y so the bottom is tight and top is wide
      const normalizedY = (y + 20) / 40; // 0 to 1
      const baseRadius = 2 + (normalizedY * 15);
      
      const radius = Math.random() * baseRadius;
      const theta = Math.random() * Math.PI * 2;
      
      pos[i * 3] = radius * Math.cos(theta);
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = radius * Math.sin(theta);

      rand[i * 3] = Math.random();
      rand[i * 3 + 1] = Math.random();
      rand[i * 3 + 2] = Math.random();
    }
    return [pos, rand];
  }, [count]);

  const vertexShader = `
    uniform float uTime;
    uniform vec2 uMouse;
    attribute vec3 aRandomness;
    varying vec3 vColor;
    varying float vAlpha;
    
    // Perlin noise helper
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy) );
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m*m; m = m*m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }
    
    void main() {
      vec3 pos = position;
      
      // Basic polar coordinates
      float radius = length(pos.xz);
      float angle = atan(pos.z, pos.x);
      
      // 1. TURBULENCE / FLOW (Vortex rotation)
      // Faster rotation at the bottom, slower at the top
      float speed = 0.5 + (20.0 - pos.y) * 0.02; 
      angle -= uTime * speed * 0.2;
      
      // 2. NOISE DISPLACEMENT (Organic flow)
      float noiseVal = snoise(vec2(pos.y * 0.1, uTime * 0.2));
      radius += noiseVal * 1.5;
      pos.y += snoise(vec2(pos.x * 0.1, uTime * 0.3)) * 1.0;
      
      pos.x = radius * cos(angle);
      pos.z = radius * sin(angle);
      
      // 3. CURSOR INTERACTION (Repulsion / Attraction)
      // We map the 2D mouse (-1 to 1) to the 3D space roughly
      vec2 mappedMouse = uMouse * 15.0; // scale to roughly match world coordinates
      float distToMouse = distance(pos.xy, mappedMouse);
      
      // Subtly repel/attract particles near the cursor
      float influence = smoothstep(8.0, 0.0, distToMouse);
      
      // Push particles outward slightly when mouse is near
      if (influence > 0.0) {
          vec2 dir = normalize(pos.xy - mappedMouse);
          pos.xy += dir * influence * 2.0;
          pos.z += influence * 3.0; // push them slightly forward/backward
      }

      // Model view projection
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      // 4. DYNAMIC SIZE ATTENUATION
      // Closer particles are larger, cursor proximity makes them glow/larger
      float baseSize = 4.0 * aRandomness.x + 2.0;
      baseSize += influence * 6.0; // grow when mouse is near
      gl_PointSize = baseSize * (25.0 / -mvPosition.z);
      
      // 5. COLOR DYNAMICS
      // Electric Blue: #3B82F6 (0.23, 0.51, 0.96)
      // Cyan: #06B6D4 (0.02, 0.71, 0.83)
      // Teal: #14B8A6 (0.08, 0.72, 0.65)
      // Violet: #8B5CF6 (0.55, 0.36, 0.96)
      
      vec3 colorBlue = vec3(0.23, 0.51, 0.96);
      vec3 colorCyan = vec3(0.02, 0.71, 0.83);
      vec3 colorTeal = vec3(0.08, 0.72, 0.65);
      vec3 colorViolet = vec3(0.55, 0.36, 0.96);
      
      // Base mix based on height and rotation
      float mixVal = sin(angle + pos.y * 0.1 + uTime * 0.5) * 0.5 + 0.5;
      vec3 finalColor = mix(colorBlue, colorCyan, mixVal);
      
      // Add teal towards the outer edges
      float edgeMix = smoothstep(5.0, 15.0, radius);
      finalColor = mix(finalColor, colorTeal, edgeMix);
      
      // Cursor influence color shift (Shift to Violet/Cyan when mouse is near)
      if (influence > 0.0) {
          vec3 cursorColor = mix(colorCyan, colorViolet, sin(uTime * 2.0) * 0.5 + 0.5);
          finalColor = mix(finalColor, cursorColor, influence);
      }
      
      vColor = finalColor;
      
      // Fade out particles that are too far or too close to avoid clipping
      vAlpha = smoothstep(-10.0, 5.0, pos.y) * smoothstep(30.0, 10.0, pos.y);
      vAlpha *= (0.3 + aRandomness.y * 0.7); // random opacity
      if (influence > 0.0) {
          vAlpha = min(1.0, vAlpha + influence);
      }
    }
  `;

  const fragmentShader = `
    varying vec3 vColor;
    varying float vAlpha;
    
    void main() {
      // Make particles circular with soft glowing edges
      float dist = length(gl_PointCoord - vec2(0.5));
      if (dist > 0.5) discard;
      
      // Soft radial gradient for glow effect
      float alpha = smoothstep(0.5, 0.1, dist) * vAlpha;
      
      gl_FragColor = vec4(vColor, alpha);
    }
  `;

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) }
    }),
    []
  );

  // Use a target for smooth camera interpolation
  const targetCameraPos = useRef(new THREE.Vector3(0, 5, 25));

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = time;
      
      // Smoothly update mouse uniform
      const targetMouseX = state.pointer.x;
      const targetMouseY = state.pointer.y;
      
      materialRef.current.uniforms.uMouse.value.x = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uMouse.value.x, 
        targetMouseX, 
        0.1
      );
      materialRef.current.uniforms.uMouse.value.y = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uMouse.value.y, 
        targetMouseY, 
        0.1
      );
    }
    
    if (pointsRef.current) {
      // Very slow global rotation to make the whole vortex feel alive
      pointsRef.current.rotation.y = time * 0.05;
    }
    
    // Smooth camera parallax
    const mouseX = state.pointer.x;
    const mouseY = state.pointer.y;
    
    targetCameraPos.current.set(mouseX * 4, 5 + mouseY * 2, 25);
    state.camera.position.lerp(targetCameraPos.current, 0.05);
    state.camera.lookAt(0, 0, 0);
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-aRandomness"
          args={[randomness, 3]}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
