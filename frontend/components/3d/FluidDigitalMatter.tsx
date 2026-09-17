"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function FluidDigitalMatter({ scrollYProgress }: { scrollYProgress: any }) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const [count, setCount] = useState(20000); 

  useEffect(() => {
    const updateCount = () => {
      if (window.innerWidth < 768) {
        setCount(6000);
      } else if (window.innerWidth < 1024) {
        setCount(12000);
      } else {
        setCount(20000);
      }
    };
    updateCount();
    window.addEventListener("resize", updateCount);
    return () => window.removeEventListener("resize", updateCount);
  }, []);

  const [positions, randomness] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const rand = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      // Base fluid distribution (spherical/volumetric)
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = Math.cbrt(Math.random()) * 25; // 25 radius
      
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      rand[i * 3] = Math.random();
      rand[i * 3 + 1] = Math.random();
      rand[i * 3 + 2] = Math.random();
    }
    return [pos, rand];
  }, [count]);

  const vertexShader = `
    uniform float uTime;
    uniform vec2 uMouse;
    uniform float uScroll;
    attribute vec3 aRandomness;
    varying vec3 vColor;
    varying float vAlpha;
    
    // Perlin noise helper
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) { 
      const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
      const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy) );
      vec3 x0 = v - i + dot(i, C.xxx) ;
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min( g.xyz, l.zxy );
      vec3 i2 = max( g.xyz, l.zxy );
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i); 
      vec4 p = permute( permute( permute( 
                 i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
               + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
               + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
      float n_ = 0.142857142857;
      vec3  ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_ );
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4( x.xy, y.xy );
      vec4 b1 = vec4( x.zw, y.zw );
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
      vec3 p0 = vec3(a0.xy,h.x);
      vec3 p1 = vec3(a0.zw,h.y);
      vec3 p2 = vec3(a1.xy,h.z);
      vec3 p3 = vec3(a1.zw,h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
    }
    
    void main() {
      vec3 pos = position;
      
      // 1. SCROLL TRANSFORMATION: Flowing Field (uScroll=0) -> Wave/Curve (uScroll=1)
      
      // State A: Fluid dark world 
      float noiseValA = snoise(vec3(pos.x * 0.05, pos.y * 0.05, uTime * 0.1));
      vec3 posA = pos + vec3(noiseValA * 5.0, snoise(vec3(pos.z*0.05, uTime*0.1, pos.x*0.05))*5.0, 0.0);
      posA.y += sin(uTime * 0.2 + pos.x * 0.1) * 3.0;
      
      // State B: Soft organized wave for light world
      float noiseValB = snoise(vec3(pos.x * 0.02, pos.z * 0.02, uTime * 0.05));
      vec3 posB = pos;
      posB.y = sin(pos.x * 0.1 + uTime * 0.3) * 5.0 + cos(pos.z * 0.1 + uTime * 0.2) * 5.0; // Wavy plane
      posB.y += noiseValB * 2.0;
      
      // Interpolate position based on scroll
      // uScroll goes 0 -> 1 as user scrolls
      vec3 currentPos = mix(posA, posB, smoothstep(0.0, 0.5, uScroll));
      
      // 2. CURSOR INTERACTION (Fluid Response)
      vec2 mappedMouse = uMouse * 30.0; 
      float distToMouse = distance(currentPos.xy, mappedMouse);
      
      float influence = smoothstep(12.0, 0.0, distToMouse);
      if (influence > 0.0) {
          vec2 dir = normalize(currentPos.xy - mappedMouse);
          // Gentle fluid push
          currentPos.xy += dir * influence * 4.0;
          currentPos.z += influence * 2.0; 
      }

      vec4 mvPosition = modelViewMatrix * vec4(currentPos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      // 3. SIZE
      float baseSize = 3.0 * aRandomness.x + 1.5;
      baseSize += influence * 3.0; 
      // Size decreases as we scroll to light mode to make it feel softer
      baseSize *= mix(1.0, 0.5, uScroll);
      gl_PointSize = baseSize * (30.0 / -mvPosition.z);
      
      // 4. COLOR
      // Dark World Colors
      vec3 colorDark1 = vec3(0.0, 0.8, 1.0); // Cyan
      vec3 colorDark2 = vec3(0.8, 0.0, 1.0); // Magenta/Violet
      vec3 colorDark3 = vec3(0.0, 0.2, 1.0); // Deep Blue
      
      // Light World Colors
      vec3 colorLight1 = vec3(1.0, 0.6, 0.8); // Pink
      vec3 colorLight2 = vec3(0.6, 0.8, 1.0); // Soft Blue
      vec3 colorLight3 = vec3(0.7, 0.9, 0.8); // Mint
      
      float colorMix = snoise(vec3(currentPos.x * 0.1, currentPos.y * 0.1, uTime * 0.2)) * 0.5 + 0.5;
      
      vec3 finalDark = mix(colorDark1, colorDark2, colorMix);
      finalDark = mix(finalDark, colorDark3, aRandomness.y);
      
      vec3 finalLight = mix(colorLight1, colorLight2, colorMix);
      finalLight = mix(finalLight, colorLight3, aRandomness.z);
      
      // Cursor adds energy (shift to bright cyan/pink)
      if (influence > 0.0) {
          vec3 cursorGlowDark = mix(vec3(0.0, 1.0, 0.5), vec3(1.0, 0.0, 0.5), uMouse.x * 0.5 + 0.5); // Green to Pink
          finalDark = mix(finalDark, cursorGlowDark, influence);
          
          vec3 cursorGlowLight = vec3(0.4, 0.6, 1.0); // Deeper blue for cursor in light mode
          finalLight = mix(finalLight, cursorGlowLight, influence);
      }
      
      // Interpolate colors based on scroll
      vColor = mix(finalDark, finalLight, smoothstep(0.1, 0.6, uScroll));
      
      // 5. ALPHA
      // In light mode, particles should be slightly less opaque (pastel/soft)
      float baseAlpha = 0.4 + aRandomness.x * 0.6;
      vAlpha = mix(baseAlpha, baseAlpha * 0.6, uScroll);
      if (influence > 0.0) {
          vAlpha = min(1.0, vAlpha + influence * 0.5);
      }
    }
  `;

  const fragmentShader = `
    varying vec3 vColor;
    varying float vAlpha;
    
    void main() {
      float dist = length(gl_PointCoord - vec2(0.5));
      if (dist > 0.5) discard;
      float alpha = smoothstep(0.5, 0.1, dist) * vAlpha;
      gl_FragColor = vec4(vColor, alpha);
    }
  `;

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uScroll: { value: 0 }
    }),
    []
  );

  const targetCameraPos = useRef(new THREE.Vector3(0, 0, 30));

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = time;
      
      // Read framer-motion scroll value dynamically
      // scrollYProgress is passed as a prop from useScroll()
      if (scrollYProgress && typeof scrollYProgress.get === 'function') {
         materialRef.current.uniforms.uScroll.value = scrollYProgress.get();
      }
      
      const targetMouseX = state.pointer.x;
      const targetMouseY = state.pointer.y;
      
      materialRef.current.uniforms.uMouse.value.x = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uMouse.value.x, 
        targetMouseX, 
        0.05
      );
      materialRef.current.uniforms.uMouse.value.y = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uMouse.value.y, 
        targetMouseY, 
        0.05
      );
    }
    
    if (pointsRef.current) {
      pointsRef.current.rotation.y = time * 0.03;
      pointsRef.current.rotation.z = time * 0.01;
    }
    
    // Smooth camera parallax
    const mouseX = state.pointer.x;
    const mouseY = state.pointer.y;
    
    // In light mode (scroll > 0.5), camera pulls back slightly to view the wave
    let scrollVal = 0;
    if (scrollYProgress && typeof scrollYProgress.get === 'function') {
        scrollVal = scrollYProgress.get();
    }
    
    const baseZ = 30 + (scrollVal * 10);
    targetCameraPos.current.set(mouseX * 5, mouseY * 5, baseZ);
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
