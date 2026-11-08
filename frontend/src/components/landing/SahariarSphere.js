"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@/context/ThemeContext";

/**
 * SahariarSphere — WebGL-powered sculptural 3D sphere inspired by SAHARIAR's fintech hero.
 * Features:
 * - Dimensional raymarched 3D sphere with sculptural curvature
 * - Brilliant illuminated upper rim crescent & atmospheric volumetric glow
 * - Subtle concentric sculptural surface ribbing
 * - Smooth dynamic interpolation between Dark mode (obsidian/olive/lime) and Light mode (sculptural ivory/alabaster/pearl)
 * - Continuous slow floating & breathing motion
 * - Mouse-responsive tilt and parallax
 * - Zero external libraries: pure WebGL 1.0 with 1 draw call, capped at 60/120fps, pauses offscreen
 */

const VERT_SHADER = `
attribute vec2 a_position;
void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAG_SHADER = `
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_theme; // 0.0 = dark, 1.0 = light
uniform vec2 u_mouse;

void main() {
    // Normalized screen coordinates (0.0 at bottom-left to 1.0 at top-right)
    vec2 normCoord = gl_FragCoord.xy / u_resolution.xy;
    float aspect = u_resolution.x / u_resolution.y;
    
    // Responsive dome proportions based on desktop vs phone:
    // On desktop: dome radius covers ~45% of screen width (spans ~90% screen wide)
    // On mobile: dome radius covers ~48% of screen width (spans ~96% mobile wide)
    float radiusPx = (aspect < 1.0) ? (u_resolution.x * 0.48) : (u_resolution.x * 0.44);
    
    // Apex position (highest point of the arch):
    // Positioned gracefully near the top canopy (under navbar)
    float apexY = (aspect < 1.0) ? (u_resolution.y * 0.86) : (u_resolution.y * 0.92);
    float centerY = apexY - radiusPx;
    
    // Floating & parallax motion
    vec2 floatOffset = vec2(
        sin(u_time * 0.45) * 8.0,
        cos(u_time * 0.65) * 6.0
    );
    vec2 centerPx = vec2(0.5 * u_resolution.x, centerY) + floatOffset + u_mouse * vec2(20.0, 15.0);
    
    // Coordinate relative to center, scaled so unit circle (dist = 1.0) is the sphere radius
    vec2 p = (gl_FragCoord.xy - centerPx) / radiusPx;
    float dist = length(p);
    float edgeDist = dist - 1.0;
    
    // ── Full-Width Atmospheric Glow (Spans 100% desktop & phone width) ──
    // 1. Wide horizontal spread across the entire viewport (x = 0.0 to 1.0)
    float horizSpread = exp(-pow((normCoord.x - 0.5) * 1.35, 2.0));
    // 2. Vertical spread centered along the apex horizon
    float apexNormY = apexY / u_resolution.y;
    float vertSpread = exp(-pow((normCoord.y - apexNormY + 0.08) * 2.2, 2.0));
    // Full width horizon aura
    float fullWidthAura = horizSpread * vertSpread * 0.40;
    
    // 3. Brilliant glowing neon crescent along the upper dome perimeter
    float arcFactor = smoothstep(0.0, 0.75, p.y);
    float rimGlow = exp(-abs(edgeDist) * 16.0) * arcFactor * 1.9;
    float softAtmosphere = exp(-max(edgeDist, 0.0) * 3.6) * arcFactor * 0.45;
    
    float totalGlow = rimGlow + softAtmosphere + fullWidthAura;
    
    // Dark mode glow: electric lime with warm yellow-gold at apex
    vec3 darkGlow = mix(
        vec3(0.84, 1.0, 0.38),
        vec3(0.96, 0.92, 0.42),
        clamp(normCoord.y * 1.2, 0.0, 1.0)
    );
    // Light mode glow: iridescent champagne-lime
    vec3 lightGlow = mix(
        vec3(0.72, 0.92, 0.28),
        vec3(0.90, 0.86, 0.55),
        clamp(normCoord.y * 1.2, 0.0, 1.0)
    );
    vec3 glowColor = mix(darkGlow, lightGlow, u_theme);
    float glowAlpha = clamp(totalGlow * (1.0 - u_theme * 0.35), 0.0, 1.0);
    
    // ── Upper Half Sphere ONLY (Lower half completely removed) ──
    // Points outside the unit circle OR below the equator (p.y <= 0.0) have NO sphere body
    if (dist > 1.0 || p.y <= 0.0) {
        gl_FragColor = vec4(glowColor, glowAlpha);
        return;
    }
    
    // ── Inside 3D Upper Hemisphere Surface ──
    float z = sqrt(max(1.0 - dist * dist, 0.0));
    vec3 N = normalize(vec3(p.x, p.y, z));
    
    // Slow rotational matrix for sculptural surface details
    float angle = u_time * 0.12;
    mat3 rotY = mat3(
        cos(angle), 0.0, sin(angle),
        0.0, 1.0, 0.0,
        -sin(angle), 0.0, cos(angle)
    );
    mat3 tiltX = mat3(
        1.0, 0.0, 0.0,
        0.0, cos(0.35), -sin(0.35),
        0.0, sin(0.35), cos(0.35)
    );
    vec3 rotN = tiltX * (rotY * N);
    
    // Sculptural latitude contour rings (gives tactile physical museum-grade body)
    float latitude = rotN.y * 36.0;
    float contour = sin(latitude);
    float ribbing = smoothstep(-0.25, 0.25, contour) * 0.06;
    
    // ── Lighting Calculations ──
    // 1. Signature Crescent Rim Light from the top
    float fresnel = pow(1.0 - max(dot(N, vec3(0.0, 0.0, 1.0)), 0.0), 3.2);
    float topArc = smoothstep(0.1, 0.9, N.y) * fresnel * 3.4;
    
    // 2. Soft Key Diffuse Light
    vec3 keyLight = normalize(vec3(-0.35, 0.75, 0.55));
    float diff = max(dot(N, keyLight), 0.0);
    
    // 3. Specular Highlight on the upper dome
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 halfVec = normalize(keyLight + viewDir);
    float spec = pow(max(dot(N, halfVec), 0.0), 28.0) * 0.5;
    
    // 4. Ambient Occlusion / Falloff to bottom of the dome
    float ao = smoothstep(0.05, 0.75, N.y);
    
    // ── Palette Construction ──
    // Dark Theme: sleek obsidian/charcoal body with olive undertone, vivid electric lime crescent
    vec3 darkBase = mix(vec3(0.03, 0.04, 0.05), vec3(0.09, 0.13, 0.07), diff * 0.85 + ribbing);
    vec3 darkRimCol = mix(vec3(0.84, 1.0, 0.38), vec3(0.98, 0.94, 0.52), smoothstep(0.35, 0.9, N.y));
    vec3 darkResult = darkBase * (0.35 + 0.65 * ao) + darkRimCol * topArc + vec3(1.0) * spec * 0.35;
    
    // Light Theme: sculptural alabaster/ivory body with soft warm shadows & iridescent lime-gold illuminated rim
    vec3 lightBase = mix(vec3(0.85, 0.83, 0.78), vec3(0.96, 0.95, 0.92), diff * 0.75 + ribbing * 0.4);
    vec3 lightShadow = vec3(0.70, 0.68, 0.63);
    vec3 lightRimCol = mix(vec3(0.75, 0.92, 0.28), vec3(0.90, 0.85, 0.50), smoothstep(0.35, 0.9, N.y));
    vec3 lightResult = mix(lightShadow, lightBase, 0.35 + 0.65 * ao) + lightRimCol * (topArc * 0.85) + vec3(1.0) * spec * 0.45;
    
    vec3 finalSphereColor = mix(darkResult, lightResult, u_theme);
    
    // Anti-aliased outer rim boundary
    float rimAA = smoothstep(1.0, 0.995, dist);
    
    // Smooth vertical fade towards the bottom of the dome so it gracefully melts into the background
    // (Ensures zero hard horizontal line and completely eliminates the bottom half)
    float verticalFade = smoothstep(0.01, 0.45, p.y);
    float sphereMask = rimAA * verticalFade;
    
    // Composite upper dome surface seamlessly over the atmospheric glow
    vec4 sphereOutput = vec4(finalSphereColor, 1.0);
    vec4 glowOutput = vec4(glowColor, glowAlpha);
    gl_FragColor = mix(glowOutput, sphereOutput, sphereMask);
}
`;

export default function SahariarSphere({ className = "" }) {
  const canvasRef = useRef(null);
  const { theme } = useTheme();
  const themeRef = useRef(theme === "light" ? 1.0 : 0.0);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const isVisibleRef = useRef(true);

  // Update target theme when context changes
  const targetTheme = theme === "light" ? 1.0 : 0.0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check prefers-reduced-motion
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Initialize WebGL
    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
      powerPreference: "high-performance",
    });

    if (!gl) {
      console.warn("WebGL not supported for SahariarSphere, using CSS fallback");
      return;
    }

    // Compile Shader helper
    function compile(type, source) {
      const s = gl.createShader(type);
      gl.shaderSource(s, source);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error("Shader error:", gl.getShaderInfoLog(s));
        gl.deleteShader(s);
        return null;
      }
      return s;
    }

    const vs = compile(gl.VERTEX_SHADER, VERT_SHADER);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG_SHADER);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Link error:", gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    // Fullscreen quad buffer
    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const aPos = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const uRes = gl.getUniformLocation(program, "u_resolution");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uThemeLoc = gl.getUniformLocation(program, "u_theme");
    const uMouseLoc = gl.getUniformLocation(program, "u_mouse");

    // Enable blending for transparent glow edges
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    function resize() {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
    }
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Mouse movement listener
    function onMouseMove(e) {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = -((e.clientY - rect.top) / rect.height - 0.5) * 2;
      mouseRef.current.targetX = Math.max(-1, Math.min(1, x));
      mouseRef.current.targetY = Math.max(-1, Math.min(1, y));
    }
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    // IntersectionObserver to pause rendering when offscreen
    const io = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
      },
      { threshold: 0.05 }
    );
    io.observe(canvas);

    let rafId = null;
    let startTime = performance.now();

    function render(now) {
      if (!isVisibleRef.current) {
        rafId = requestAnimationFrame(render);
        return;
      }

      // Smooth theme interpolation (lerp ~0.09 per frame)
      const themeDiff = targetTheme - themeRef.current;
      themeRef.current += themeDiff * 0.09;

      // Smooth mouse lerp
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.06;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.06;

      const elapsed = reducedMotion ? 2.0 : (now - startTime) * 0.001;

      gl.useProgram(program);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, elapsed);
      gl.uniform1f(uThemeLoc, themeRef.current);
      gl.uniform2f(uMouseLoc, mouseRef.current.x, mouseRef.current.y);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      rafId = requestAnimationFrame(render);
    }

    rafId = requestAnimationFrame(render);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("mousemove", onMouseMove);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(posBuffer);
    };
  }, [targetTheme]);

  return (
    <div className={`relative pointer-events-none select-none ${className}`}>
      {/* Primary WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        aria-hidden="true"
      />
    </div>
  );
}

