"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

interface HeroSceneProps {
  scrollYProgress?: any;
}

export function HeroScene({ scrollYProgress }: HeroSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Configuration identical to Google Gemini's 3D Particle Star
    const config = {
      particleCount: 80000,
      colorSaturation: 0.75,
      scatterTop: 1.0,
      scatterBottom: 0.15,
      shrinkSpeed: 15,
      entranceDelayMs: 100,
      entranceGrowSpeed: 1.5,
      entranceLingerSeconds: 1.5,
      sparkCurveN: 0.7,
      roundingFactor: 0.18,
      coreGreenColor: "#00B95C",
      coreYellowColor: "#FFCC00",
      coreRedColor: "#FF4641",
      coreBlueColor: "#3186FF"
    };

    function sign(e: number) {
      return e > 0 ? 1 : e < 0 ? -1 : 0;
    }

    function smoothstep(min: number, max: number, val: number) {
      const x = Math.max(0, Math.min(1, (val - min) / (max - min)));
      return x * x * (3 - 2 * x);
    }

    // ── 1. THREE.JS SCENE, CAMERA, RENDERER ──
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    camera.position.z = 240;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    container.appendChild(renderer.domElement);

    // ── 2. BUFFER GEOMETRY (80,000 PARTICLES) ──
    const count = config.particleCount;
    const radius = 120;
    const geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const customSizes = new Float32Array(count);

    const angles = new Float32Array(count);
    const radPow = new Float32Array(count);
    const zScatter = new Float32Array(count);
    const sizeScales = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      angles[i] = Math.random() * Math.PI * 2;
      radPow[i] = Math.random() ** 5; // Dense core & delicate outer nebula
      zScatter[i] = Math.random() + Math.random() + Math.random() - 1.5; // Gaussian 3D depth
      sizeScales[i] = 0.8 + Math.random() * 1.2;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("customSize", new THREE.BufferAttribute(customSizes, 1));

    // ── 3. GOOGLE SIGNATURE COLOR PALETTES ──
    const formatColor = (c: string) => (c.startsWith("#") || c.startsWith("rgb") ? c : "#" + c);
    const primaryColors = [
      new THREE.Color(formatColor(config.coreGreenColor)),
      new THREE.Color(formatColor(config.coreYellowColor)),
      new THREE.Color(formatColor(config.coreRedColor)),
      new THREE.Color(formatColor(config.coreBlueColor))
    ];
    const secondaryColors = [
      new THREE.Color("#00A5B7"),
      new THREE.Color("#FF6B2B"),
      new THREE.Color("#D8627E"),
      new THREE.Color("#A975AA")
    ];

    const hsl = { h: 0, s: 0, l: 0 };
    for (const c of primaryColors) {
      c.getHSL(hsl);
      c.setHSL(hsl.h, hsl.s * config.colorSaturation, hsl.l);
    }
    for (const c of secondaryColors) {
      c.getHSL(hsl);
      c.setHSL(hsl.h, hsl.s * config.colorSaturation, hsl.l);
    }

    let colorStateIndex = 3; // Blue default
    let nextColorIndex = 3;
    const rippleWaves: Array<{ radius: number; stateIndex: number; width: number; speed: number }> = [];

    // ── 4. DIRECT CURSOR TRACKING & 3D DRAGGABLE CONTROLS ──
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-9999, -9999);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const hitPoint = new THREE.Vector3();
    const localHitPoint = new THREE.Vector3();
    let mouseActive = false;

    // Interactive Dragging State
    let isPointerDown = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let prevDragX = 0;
    let prevDragY = 0;
    let hasDragged = false;

    // Drag rotations
    let userRotX = 0;
    let userRotY = 0;
    let velRotX = 0;
    let velRotY = 0;

    // Cursor Parallax Tilt (dots tilt toward mouse)
    let tiltX = 0;
    let tiltY = 0;

    const handlePointerDown = (e: PointerEvent) => {
      // Don't intercept if clicking an interactive navbar button or link
      const target = e.target as HTMLElement;
      if (target && (target.closest("a") || target.closest("button") || target.closest("input") || target.closest("nav"))) {
        return;
      }

      isPointerDown = true;
      hasDragged = false;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      prevDragX = e.clientX;
      prevDragY = e.clientY;
    };

    const handlePointerMove = (e: PointerEvent) => {
      // Normalized screen coordinates [-1, 1]
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseActive = true;

      // Calculate tilt target from cursor
      tiltY = mouse.x * 0.45;
      tiltX = -mouse.y * 0.35;

      // If holding/dragging, rotate dots directly with the cursor!
      if (isPointerDown) {
        const dx = e.clientX - prevDragX;
        const dy = e.clientY - prevDragY;
        const totalDist = Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY);

        if (totalDist > 4) {
          hasDragged = true;
        }

        prevDragX = e.clientX;
        prevDragY = e.clientY;

        // Rotate particles directly according to cursor swipe direction
        const rotSpeed = 0.007;
        userRotY += dx * rotSpeed;
        userRotX += dy * rotSpeed;

        velRotY = dx * rotSpeed;
        velRotX = dy * rotSpeed;
      }
    };

    const handlePointerUp = () => {
      if (isPointerDown) {
        // If user tapped without dragging, trigger the color shockwave wave!
        if (!hasDragged) {
          nextColorIndex = (nextColorIndex + 1) % primaryColors.length;
          rippleWaves.push({
            radius: 0,
            stateIndex: nextColorIndex,
            width: 80,
            speed: 800
          });
        }
      }
      isPointerDown = false;
    };

    const handlePointerLeave = () => {
      isPointerDown = false;
      mouseActive = false;
      mouse.set(-9999, -9999);
      tiltX = 0;
      tiltY = 0;
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointerleave", handlePointerLeave, { passive: true });

    // ── 5. GLSL SHADERS (CIRCULAR SOFT GLOWING POINTS) ──
    const vertexShader = `
      attribute float customSize;
      varying vec3 vColor;
      uniform float uPixelRatio;

      void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = customSize * uPixelRatio * (250.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const fragmentShader = `
      varying vec3 vColor;

      void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.4, 0.5, dist);
          gl_FragColor = vec4(vColor, alpha);
      }
    `;

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexColors: true,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const particleMesh = new THREE.Points(geometry, material);
    particleMesh.scale.set(0, 0, 0);
    particleMesh.visible = false;
    scene.add(particleMesh);

    let isReady = false;
    const entranceTimer = setTimeout(() => {
      particleMesh.visible = true;
      isReady = true;
    }, config.entranceDelayMs);

    // ── 6. SCROLL INTERACTION ──
    let scatter = config.scatterTop;
    let targetScatter = config.scatterTop;

    const handleScroll = () => {
      const scrollY = window.scrollY || window.pageYOffset;
      const progress = Math.min(1, Math.max(0, scrollY / (window.innerHeight * 1.1)));
      targetScatter = config.scatterTop - (config.scatterTop - config.scatterBottom) * progress;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    let unsubscribeMotionScroll: (() => void) | null = null;
    if (scrollYProgress && typeof scrollYProgress.on === "function") {
      unsubscribeMotionScroll = scrollYProgress.on("change", (latest: number) => {
        const clamped = Math.min(1, Math.max(0, latest * 2.5));
        targetScatter = config.scatterTop - (config.scatterTop - config.scatterBottom) * clamped;
      });
    }

    // ── 7. ANIMATION LOOP ──
    const clock = new THREE.Clock();
    let timeParam = -Math.PI / 2;
    let animTime = 0;
    let lingerTime = 0;
    let animId = 0;

    // Smoothed rotations
    let currentRotX = 0;
    let currentRotY = 0;
    let currentTiltX = 0;
    let currentTiltY = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = clock.getDelta();

      if (isReady) {
        lingerTime += dt;
        if (lingerTime > config.entranceLingerSeconds) {
          animTime += dt;
          const morphSpeed =
            (0.15 +
              ((3.5 + config.sparkCurveN) / 2 +
                ((3.5 - config.sparkCurveN) / 2) * Math.sin(timeParam) -
                (config.sparkCurveN - 0.1)) **
                2 *
                0.15) *
            1.2;
          timeParam += dt * morphSpeed;
        }
      }

      scatter += (targetScatter - scatter) * 0.1;

      // Morphing parameter n
      const n = (3.5 + config.sparkCurveN) / 2 + ((3.5 - config.sparkCurveN) / 2) * Math.sin(timeParam);

      // Expand ripple shockwaves
      rippleWaves.forEach((w) => (w.radius += dt * w.speed));
      while (rippleWaves.length > 0 && rippleWaves[0].radius >= 1600) {
        colorStateIndex = rippleWaves[0].stateIndex;
        rippleWaves.shift();
      }

      // Natural idle floating motion
      const rotTime = animTime * 0.22;
      const idleRotX = Math.sin(rotTime * 2) ** 3 * 0.55;
      const idleRotY = Math.sin(rotTime) ** 3 * 0.75;
      const idleRotZ = Math.sin(rotTime) ** 3 * -0.45;

      // Inertia & decay when user releases drag
      if (!isPointerDown) {
        userRotY += velRotY;
        userRotX += velRotX;
        velRotY *= 0.94; // Friction damping
        velRotX *= 0.94;

        // Smooth spring-back towards center alignment
        userRotY += (0 - userRotY) * 0.035;
        userRotX += (0 - userRotX) * 0.035;
      }

      // Smooth cursor parallax tilt
      currentTiltX += (tiltX - currentTiltX) * 0.08;
      currentTiltY += (tiltY - currentTiltY) * 0.08;

      // Combine user drag + cursor tilt + natural idle tumble
      currentRotX = userRotX + currentTiltX + idleRotX;
      currentRotY = userRotY + currentTiltY + idleRotY;

      particleMesh.rotation.x = currentRotX;
      particleMesh.rotation.y = currentRotY;
      particleMesh.rotation.z = idleRotZ;
      particleMesh.updateMatrixWorld();

      // Mouse Raycast on XY plane
      if (mouseActive) {
        raycaster.setFromCamera(mouse, camera);
        raycaster.ray.intersectPlane(plane, hitPoint);
        localHitPoint.copy(hitPoint);
        particleMesh.worldToLocal(localHitPoint);
      } else {
        localHitPoint.set(-9999, -9999, -9999);
      }

      const nextPaletteIdx = (nextColorIndex + 1) % primaryColors.length;
      const posArr = geometry.attributes.position.array as Float32Array;
      const colArr = geometry.attributes.color.array as Float32Array;
      const sizeArr = geometry.attributes.customSize.array as Float32Array;

      // Calculate 80,000 Particles
      for (let i = 0; i < count; i++) {
        const t = angles[i];
        const r = radPow[i];

        const cosT = Math.cos(t);
        const sinT = Math.sin(t);

        // Astroid / Superellipse equation
        const o = Math.abs(cosT) ** (2 / n) * sign(cosT);
        const s = Math.abs(sinT) ** (2 / n) * sign(sinT);

        const cos2T = Math.cos(2 * t) ** 2;
        const cornerRounding = config.roundingFactor * cos2T;

        let x = o * (1 - cornerRounding) + cosT * cornerRounding;
        let y = s * (1 - cornerRounding) + sinT * cornerRounding;

        const radialDist = 1 + r * scatter - 0.04;
        const z = zScatter[i] * radius * (0.1 + 1.2 * scatter);

        x *= radius * radialDist;
        y *= radius * radialDist;

        let pointDist = Math.sqrt(x * x + y * y + z * z);
        if (pointDist === 0) pointDist = 0.001;

        let activeColorIdx = colorStateIndex;
        let brightnessBoost = 1.0;

        // Wave shockwave illumination
        for (let w = 0; w < rippleWaves.length; w++) {
          const wave = rippleWaves[w];
          if (pointDist < wave.radius) activeColorIdx = wave.stateIndex;
          const distToWave = Math.abs(pointDist - wave.radius);
          if (distToWave < wave.width) {
            const waveFactor = 1 - distToWave / wave.width;
            brightnessBoost = Math.max(brightnessBoost, 1 + waveFactor * 1.5);
          }
        }

        // Mouse proximity glow & displacement
        let mouseGlow = 0;
        if (mouseActive) {
          const dx = x - localHitPoint.x;
          const dy = y - localHitPoint.y;
          const dz = z - localHitPoint.z;
          const dCursor = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dCursor < 85) {
            mouseGlow = 1 - smoothstep(0, 1, dCursor / 85);
            brightnessBoost = Math.max(brightnessBoost, 1 + mouseGlow * 0.95);
          }
        }

        const idx3 = i * 3;
        posArr[idx3] = x;
        posArr[idx3 + 1] = y;
        posArr[idx3 + 2] = z;

        // Core distance size attenuation
        const coreFade = 1 - Math.min(Math.max((pointDist - 40) / 220, 0), 1);
        sizeArr[i] = sizeScales[i] * (0.01 + coreFade * 1.8);

        // Color blending
        const colorA = primaryColors[activeColorIdx];
        const colorB = secondaryColors[activeColorIdx];
        const colorLerp = smoothstep(0, 1, smoothstep(0.08, 0.55, r));

        let cr = colorA.r + (colorB.r - colorA.r) * colorLerp;
        let cg = colorA.g + (colorB.g - colorA.g) * colorLerp;
        let cb = colorA.b + (colorB.b - colorA.b) * colorLerp;

        if (mouseGlow > 0) {
          const hoverColorA = primaryColors[nextPaletteIdx];
          const hoverColorB = secondaryColors[nextPaletteIdx];
          const hr = hoverColorA.r + (hoverColorB.r - hoverColorA.r) * colorLerp;
          const hg = hoverColorA.g + (hoverColorB.g - hoverColorA.g) * colorLerp;
          const hb = hoverColorA.b + (hoverColorB.b - hoverColorA.b) * colorLerp;

          cr += (hr - cr) * mouseGlow;
          cg += (hg - cg) * mouseGlow;
          cb += (hb - cb) * mouseGlow;
        }

        if (brightnessBoost > 1) {
          cr = Math.min(1, cr * brightnessBoost);
          cg = Math.min(1, cg * brightnessBoost);
          cb = Math.min(1, cb * brightnessBoost);
        }

        colArr[idx3] = cr;
        colArr[idx3 + 1] = cg;
        colArr[idx3 + 2] = cb;
      }

      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
      geometry.attributes.customSize.needsUpdate = true;

      // Entrance scale lerp
      if (isReady) {
        particleMesh.scale.lerp(new THREE.Vector3(1, 1, 1), dt * config.entranceGrowSpeed);
      }

      renderer.render(scene, camera);
    };

    animate();

    // ── 8. WINDOW RESIZE HANDLER ──
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
    };

    window.addEventListener("resize", handleResize, { passive: true });

    // ── 9. CLEANUP ON UNMOUNT ──
    return () => {
      clearTimeout(entranceTimer);
      cancelAnimationFrame(animId);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointerleave", handlePointerLeave);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      if (unsubscribeMotionScroll) unsubscribeMotionScroll();

      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [scrollYProgress]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0 h-full w-full pointer-events-auto cursor-grab active:cursor-grabbing"
      style={{ overflow: "hidden" }}
    />
  );
}
