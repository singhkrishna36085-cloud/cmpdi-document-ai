"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export function FluidDigitalMatter({ scrollYProgress }: { scrollYProgress: any }) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { camera, raycaster } = useThree();

  const [count, setCount] = useState(25000);

  useEffect(() => {
    const updateCount = () => {
      if (window.innerWidth < 768) {
        setCount(8000);
      } else if (window.innerWidth < 1024) {
        setCount(16000);
      } else {
        setCount(25000);
      }
    };
    updateCount();
    window.addEventListener("resize", updateCount);
    return () => window.removeEventListener("resize", updateCount);
  }, []);

  // Precompute Procedural 3D Formations:
  // 1. DRUM (Cylindrical structure: top cap, bottom cap, cylindrical mantle)
  // 2. COAL (Faceted, stratified irregular geological ore)
  // 3. UNIVERSE (Cosmic galactic spiral with dense core and trailing arms)
  // 4. FLOWING FIELD (Volumetric organic cloud)
  const [posDrum, posCoal, posUniverse, posFlow, randomness] = useMemo(() => {
    const drum = new Float32Array(count * 3);
    const coal = new Float32Array(count * 3);
    const universe = new Float32Array(count * 3);
    const flow = new Float32Array(count * 3);
    const rand = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const iNorm = i / count;

      // ── FORMATION 1: DRUM (Cylinder with top, bottom, and mantle) ──
      const drumPart = Math.random();
      const drumRadius = 11.0;
      const drumHeight = 16.0;
      const thetaD = Math.random() * Math.PI * 2.0;

      if (drumPart < 0.25) {
        // Top circular plate
        const r = Math.sqrt(Math.random()) * drumRadius;
        drum[idx] = r * Math.cos(thetaD);
        drum[idx + 1] = drumHeight * 0.5 + (Math.random() - 0.5) * 0.8;
        drum[idx + 2] = r * Math.sin(thetaD);
      } else if (drumPart < 0.5) {
        // Bottom circular plate
        const r = Math.sqrt(Math.random()) * drumRadius;
        drum[idx] = r * Math.cos(thetaD);
        drum[idx + 1] = -drumHeight * 0.5 + (Math.random() - 0.5) * 0.8;
        drum[idx + 2] = r * Math.sin(thetaD);
      } else {
        // Cylindrical mantle / wall
        const y = (Math.random() - 0.5) * drumHeight;
        const r = drumRadius + (Math.random() - 0.5) * 1.5;
        drum[idx] = r * Math.cos(thetaD);
        drum[idx + 1] = y;
        drum[idx + 2] = r * Math.sin(thetaD);
      }

      // ── FORMATION 2: COAL (Faceted, irregular stratified ore block) ──
      const thetaC = Math.random() * Math.PI * 2.0;
      const phiC = (Math.random() - 0.5) * Math.PI;
      // Faceted angular displacement
      const facetNoise = 
        Math.abs(Math.sin(thetaC * 3.0)) * 2.8 + 
        Math.abs(Math.cos(phiC * 4.0)) * 2.2 +
        (Math.sin(thetaC * 7.0 + phiC * 5.0) * 1.4);
      const coalBaseR = 8.5 + facetNoise + (Math.random() - 0.5) * 2.0;
      coal[idx] = coalBaseR * Math.cos(phiC) * Math.cos(thetaC) * 1.25;
      coal[idx + 1] = coalBaseR * Math.sin(phiC) * 0.95; // slightly flattened
      coal[idx + 2] = coalBaseR * Math.cos(phiC) * Math.sin(thetaC) * 1.1;

      // ── FORMATION 3: UNIVERSE (Cosmic Galaxy with Core & Spiral Arms) ──
      const isCore = Math.random() < 0.25;
      if (isCore) {
        // Dense glowing galactic nucleus
        const r = Math.cbrt(Math.random()) * 5.0;
        const u = Math.random() * 2.0 - 1.0;
        const t = Math.random() * Math.PI * 2.0;
        const s = Math.sqrt(1.0 - u * u);
        universe[idx] = r * s * Math.cos(t);
        universe[idx + 1] = (r * s * Math.sin(t)) * 0.4; // flat disc
        universe[idx + 2] = r * u * 0.7;
      } else {
        // Double logarithmic spiral arms
        const arm = (i % 2 === 0 ? 0.0 : Math.PI);
        const spiralDist = 4.0 + Math.pow(Math.random(), 1.6) * 24.0;
        const spiralAngle = arm + spiralDist * 0.35 + (Math.random() - 0.5) * 0.8;
        const thickness = (1.0 - spiralDist / 28.0) * 3.5;
        universe[idx] = spiralDist * Math.cos(spiralAngle);
        universe[idx + 1] = (Math.random() - 0.5) * thickness;
        universe[idx + 2] = spiralDist * Math.sin(spiralAngle);
      }

      // ── FORMATION 4: FLOWING FIELD (Volumetric base cloud) ──
      const uF = Math.random();
      const vF = Math.random();
      const thetaF = uF * 2.0 * Math.PI;
      const phiF = Math.acos(2.0 * vF - 1.0);
      const rF = Math.cbrt(Math.random()) * 26.0;
      flow[idx] = rF * Math.sin(phiF) * Math.cos(thetaF);
      flow[idx + 1] = rF * Math.sin(phiF) * Math.sin(thetaF);
      flow[idx + 2] = rF * Math.cos(phiF);

      // Random attributes
      rand[idx] = Math.random();
      rand[idx + 1] = Math.random();
      rand[idx + 2] = Math.random();
    }

    return [drum, coal, universe, flow, rand];
  }, [count]);

  const vertexShader = `
    uniform float uTime;
    uniform vec3 uMouse3D;
    uniform vec3 uMouseVel;
    uniform float uScroll;
    
    attribute vec3 aTargetCoal;
    attribute vec3 aTargetUniverse;
    attribute vec3 aTargetFlow;
    attribute vec3 aRandomness;
    
    varying vec3 vWorldPos;
    varying float vCursorInfluence;
    varying float vAlpha;
    
    // Simplex 3D noise
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) { 
      const vec2  C = vec2(1.0/6.0, 1.0/3.0);
      const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
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
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
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

    // ── DIVERGENCE-FREE CURL NOISE ──
    vec3 curlNoise(vec3 p) {
      const float e = 0.1;
      float n1 = snoise(vec3(p.x, p.y + e, p.z));
      float n2 = snoise(vec3(p.x, p.y - e, p.z));
      float n3 = snoise(vec3(p.x, p.y, p.z + e));
      float n4 = snoise(vec3(p.x, p.y, p.z - e));
      float n5 = snoise(vec3(p.x + e, p.y, p.z));
      float n6 = snoise(vec3(p.x - e, p.y, p.z));
      
      float x = (n1 - n2) - (n3 - n4);
      float y = (n3 - n4) - (n5 - n6);
      float z = (n5 - n6) - (n1 - n2);
      return normalize(vec3(x, y, z));
    }
    
    void main() {
      // ── 1. PROCEDURAL MORPH SEQUENCE: DRUM -> COAL -> UNIVERSE -> FLOWING FIELD -> DRUM ──
      // Cycle duration ~24s total (6s per transition)
      float cycle = mod(uTime * 0.16, 4.0);
      
      // Target Formations
      vec3 pDrum = position; // Drum is base position attribute
      vec3 pCoal = aTargetCoal;
      vec3 pUniverse = aTargetUniverse;
      vec3 pFlow = aTargetFlow;
      
      // Morph interpolation
      vec3 morphedPos = pDrum;
      if (cycle < 1.0) {
        // Drum -> Coal
        float t = smoothstep(0.0, 1.0, cycle);
        morphedPos = mix(pDrum, pCoal, t);
      } else if (cycle < 2.0) {
        // Coal -> Universe
        float t = smoothstep(0.0, 1.0, cycle - 1.0);
        morphedPos = mix(pCoal, pUniverse, t);
      } else if (cycle < 3.0) {
        // Universe -> Flowing Field
        float t = smoothstep(0.0, 1.0, cycle - 2.0);
        morphedPos = mix(pUniverse, pFlow, t);
      } else {
        // Flowing Field -> Drum
        float t = smoothstep(0.0, 1.0, cycle - 3.0);
        morphedPos = mix(pFlow, pDrum, t);
      }

      // ── 2. CONTINUOUS 3D CURL NOISE FLUID TURBULENCE ──
      vec3 curlVec = curlNoise(morphedPos * 0.08 + vec3(uTime * 0.12));
      morphedPos += curlVec * (2.2 + aRandomness.x * 1.8);
      
      // Global fluid breathing wave
      morphedPos.y += sin(uTime * 0.4 + morphedPos.x * 0.1) * 1.2;

      // ── 3. RAYCASTER / 3D CURSOR INTERACTION ──
      // Calculate true 3D distance between particle and unprojected cursor
      float distToMouse = distance(morphedPos, uMouse3D);
      float cursorRadius = 14.0;
      float influence = smoothstep(cursorRadius, 0.0, distToMouse);
      
      if (influence > 0.0) {
        vec3 diff = morphedPos - uMouse3D;
        vec3 dir = normalize(diff + vec3(0.001));
        
        // Dynamic flow bend in direction of cursor velocity
        morphedPos += uMouseVel * influence * 8.0;
        
        // Gentle gathering / orbital tangent when cursor pauses
        vec3 tangent = cross(dir, vec3(0.0, 0.0, 1.0));
        morphedPos += tangent * influence * 2.5;
        
        // Soft elastic repulsion preventing collision
        morphedPos += dir * influence * 3.0;
      }

      // ── 4. SCROLL-LINKED TRANSFORMATION ──
      // As user scrolls down: lift upward, expand scale, increase depth separation
      float scrollLift = uScroll * 42.0;
      float scrollScale = 1.0 + (uScroll * 0.35);
      morphedPos.y += scrollLift;
      morphedPos.xz *= scrollScale;
      morphedPos.z -= uScroll * 12.0;

      vec4 mvPosition = modelViewMatrix * vec4(morphedPos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      // ── 5. DEPTH-BASED POINT SIZING ──
      float baseSize = 3.6 * aRandomness.y + 1.8;
      baseSize += influence * 4.5; // Grow softly near cursor
      baseSize *= mix(1.0, 0.6, smoothstep(0.2, 0.8, uScroll)); // Soften in light world
      gl_PointSize = baseSize * (28.0 / -mvPosition.z);
      
      // ── 6. PASS VARYINGS TO FRAGMENT SHADER ──
      vWorldPos = morphedPos;
      vCursorInfluence = influence;
      
      // ── 7. ALPHA & SOFT FADING ──
      float baseAlpha = 0.45 + aRandomness.x * 0.25;
      vAlpha = mix(baseAlpha, baseAlpha * 0.35, smoothstep(0.2, 0.85, uScroll));
      if (influence > 0.0) {
        vAlpha = min(1.0, vAlpha + influence * 0.5);
      }
    }
  `;

  const fragmentShader = `
    uniform float uTime;
    uniform float uScroll;
    
    varying vec3 vWorldPos;
    varying float vCursorInfluence;
    varying float vAlpha;
    
    // HSV to RGB conversion for rich, vibrant saturation
    vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    // Continuous, seamless C1 progression across the requested palette:
    // BLUE (0.62) -> PURPLE (0.78) -> PINK (0.92) -> RED (1.00) -> GREEN (1.38) -> CYAN (1.52) -> BLUE (1.62)
    vec3 getGlobalColor(float phase) {
      float p = fract(phase) * 6.0;
      float f = fract(p);
      float s = smoothstep(0.0, 1.0, f);
      
      float h = 0.62;
      if (p < 1.0) {
        h = mix(0.62, 0.78, s); // Blue -> Purple
      } else if (p < 2.0) {
        h = mix(0.78, 0.92, s); // Purple -> Pink
      } else if (p < 3.0) {
        h = mix(0.92, 1.00, s); // Pink -> Red
      } else if (p < 4.0) {
        h = mix(1.00, 1.38, s); // Red -> Green
      } else if (p < 5.0) {
        h = mix(1.38, 1.52, s); // Green -> Cyan
      } else {
        h = mix(1.52, 1.62, s); // Cyan -> Blue
      }
      
      return hsv2rgb(vec3(fract(h), 0.92, 1.0));
    }

    void main() {
      // Circular luminous particle with smooth soft gaussian edge
      float dist = length(gl_PointCoord - vec2(0.5));
      if (dist > 0.5) discard;
      float pointAlpha = smoothstep(0.5, 0.08, dist) * vAlpha;
      
      // ── 1. SYNCHRONIZED GLOBAL COLOR FLOW ──
      // Cycle duration ~24s for slow, cinematic, synchronized transitions
      float colorSpeed = 1.0 / 24.0;
      float globalPhase = uTime * colorSpeed;
      
      // Subtle spatial gradient across space (NO random per-particle noise)
      // Clamped to ±0.015 so the entire field moves through the same color together
      float spatialGradient = clamp(vWorldPos.y * 0.0006 + vWorldPos.x * 0.0004, -0.015, 0.015);
      float phase = fract(globalPhase + spatialGradient);
      
      vec3 fieldColor = getGlobalColor(phase);
      
      // ── 2. LOCAL CURSOR INFLUENCE ──
      // Cursor adds localized luminous brightness & energetic highlights
      // without breaking the global synchronized color cycle
      if (vCursorInfluence > 0.0) {
        vec3 localHighlight = fieldColor * 1.35 + vec3(0.18, 0.20, 0.28);
        fieldColor = mix(fieldColor, min(vec3(1.0), localHighlight), vCursorInfluence * 0.6);
        pointAlpha = min(1.0, pointAlpha + vCursorInfluence * 0.4);
      }
      
      gl_FragColor = vec4(fieldColor, pointAlpha);
    }
  `;

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse3D: { value: new THREE.Vector3(0, 0, 0) },
      uMouseVel: { value: new THREE.Vector3(0, 0, 0) },
      uScroll: { value: 0 }
    }),
    []
  );

  const prevMouse3D = useRef(new THREE.Vector3(0, 0, 0));
  const targetMouse3D = useRef(new THREE.Vector3(0, 0, 0));
  const planeZ = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const planeIntersect = useMemo(() => new THREE.Vector3(), []);
  const targetCameraPos = useRef(new THREE.Vector3(0, 0, 32));

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = time;
      
      // Live scroll uniform binding from Framer Motion
      if (scrollYProgress && typeof scrollYProgress.get === 'function') {
        materialRef.current.uniforms.uScroll.value = scrollYProgress.get();
      }
      
      // 3D Cursor Unprojection via Raycaster onto z = 0 plane
      raycaster.setFromCamera(state.pointer, camera);
      const hit = raycaster.ray.intersectPlane(planeZ, planeIntersect);
      if (hit) {
        targetMouse3D.current.copy(hit);
      } else {
        // Fallback approximation
        targetMouse3D.current.set(state.pointer.x * 24.0, state.pointer.y * 14.0, 0);
      }
      
      // Calculate cursor velocity for flow bending
      const curMouse = materialRef.current.uniforms.uMouse3D.value;
      const vel = materialRef.current.uniforms.uMouseVel.value;
      
      vel.x = (targetMouse3D.current.x - curMouse.x) * 0.15;
      vel.y = (targetMouse3D.current.y - curMouse.y) * 0.15;
      vel.z = (targetMouse3D.current.z - curMouse.z) * 0.15;
      
      // Smooth lerping of 3D mouse position
      curMouse.lerp(targetMouse3D.current, 0.08);
      prevMouse3D.current.copy(curMouse);
    }
    
    if (pointsRef.current) {
      // Celestial slow orbit
      pointsRef.current.rotation.y = time * 0.02;
    }
    
    // Parallax camera easing
    let scrollVal = 0;
    if (scrollYProgress && typeof scrollYProgress.get === 'function') {
      scrollVal = scrollYProgress.get();
    }
    
    const mouseX = state.pointer.x;
    const mouseY = state.pointer.y;
    const baseZ = 32 + (scrollVal * 8.0);
    targetCameraPos.current.set(mouseX * 3.5, mouseY * 2.5, baseZ);
    state.camera.position.lerp(targetCameraPos.current, 0.04);
    state.camera.lookAt(0, 0, 0);
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[posDrum, 3]}
        />
        <bufferAttribute
          attach="attributes-aTargetCoal"
          args={[posCoal, 3]}
        />
        <bufferAttribute
          attach="attributes-aTargetUniverse"
          args={[posUniverse, 3]}
        />
        <bufferAttribute
          attach="attributes-aTargetFlow"
          args={[posFlow, 3]}
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
