"use client";

import { useEffect, useRef } from "react";

/**
 * HeroCanvas — a rich, layered financial visualization with scroll-driven convergence.
 * As user scrolls, scattered financial fragments converge toward a central structured compass/mandala.
 * Scrolling backwards smoothly disperses them back.
 * Pure canvas, RAF, GPU-optimized.
 */

const FRAG_BACK = [
  "₹1,24,500", "Portfolio", "₹85,000", "Mutual Fund", "₹3,20,000",
  "Net Worth", "₹14,200", "SIP", "HDFC Bank", "₹2,80,000",
];
const FRAG_MID = [
  "Food ₹8,340", "Rent ₹24,000", "Salary ₹85,000", "Transport ₹3,100",
  "Goal: Car 60%", "EMI ₹12,500", "Groceries ₹4,200",
];
const FRAG_FRONT = [
  "₹340", "₹480", "₹5,000", "₹200", "₹1,890", "₹550",
];

function rnd(min, max) { return Math.random() * (max - min) + min; }
function lerp(a, b, t) { return a + (b - a) * t; }
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function HeroCanvas({ className = "" }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const scrollRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Build particles with ambient floating coords + structured target coords
    function buildParticles(texts, count, sizeRange, alphaRange, speedRange, targetRadius, depthWeight) {
      return Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2;
        return {
          // Floating coords (0 to 1)
          x: rnd(0.04, 0.96),
          y: rnd(0.06, 0.94),
          vx: rnd(-speedRange, speedRange),
          vy: rnd(-speedRange * 0.7, speedRange * 0.7),
          // Structured target coords (center at 0.5, 0.46)
          tx: 0.5 + Math.cos(angle) * targetRadius * 1.3,
          ty: 0.46 + Math.sin(angle) * targetRadius,
          text: texts[i % texts.length],
          size: rnd(...sizeRange),
          alpha: rnd(...alphaRange),
          alphaDelta: rnd(-0.001, 0.001),
          depth: depthWeight,
        };
      });
    }

    const back  = buildParticles(FRAG_BACK,  10, [20, 32], [0.10, 0.22], 0.00007, 0.32, 0.4);
    const mid   = buildParticles(FRAG_MID,   7,  [12, 16], [0.22, 0.42], 0.00012, 0.22, 0.7);
    const front = buildParticles(FRAG_FRONT, 6,  [11, 14], [0.35, 0.65], 0.00018, 0.14, 1.0);

    // 12 Hub nodes forming the central nucleus when converged
    const nodes = Array.from({ length: 12 }, (_, i) => {
      const angle = (i / 12) * Math.PI * 2;
      return {
        x: rnd(0.08, 0.92),
        y: rnd(0.08, 0.92),
        vx: rnd(-0.00008, 0.00008),
        vy: rnd(-0.00006, 0.00006),
        tx: 0.5 + Math.cos(angle) * 0.15,
        ty: 0.46 + Math.sin(angle) * 0.12,
        r: rnd(2.8, 5.5),
        alpha: rnd(0.4, 0.8),
        alphaDelta: rnd(-0.003, 0.003),
        gold: i % 2 === 0,
      };
    });

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width  = canvas.offsetWidth  * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const W = () => canvas.offsetWidth;
    const H = () => canvas.offsetHeight;

    function onScroll() {
      const h = window.innerHeight || 800;
      scrollRef.current = Math.min(Math.max(window.scrollY / (h * 0.85), 0), 1);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    function onMouse(e) {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = (e.clientX - rect.left) / rect.width;
      mouseRef.current.y = (e.clientY - rect.top)  / rect.height;
    }
    window.addEventListener("mousemove", onMouse, { passive: true });

    function draw(ts) {
      const w = W(), h = H();
      ctx.clearRect(0, 0, w, h);

      const factor = easeInOutCubic(scrollRef.current);
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // Draw all text particle layers
      function renderLayer(layer, parallaxMult) {
        for (const p of layer) {
          if (!reduced) {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0.02) p.vx = Math.abs(p.vx);
            if (p.x > 0.98) p.vx = -Math.abs(p.vx);
            if (p.y < 0.04) p.vy = Math.abs(p.vy);
            if (p.y > 0.96) p.vy = -Math.abs(p.vy);
            p.alpha += p.alphaDelta;
            if (p.alpha > 0.7)  p.alphaDelta = -Math.abs(p.alphaDelta);
            if (p.alpha < 0.08) p.alphaDelta =  Math.abs(p.alphaDelta);
          }

          // Smooth interpolation between floating position and converged target position
          const curX = lerp(p.x, p.tx, factor);
          const curY = lerp(p.y, p.ty, factor);

          // Parallax offset (damped as it converges)
          const paraX = (mx - 0.5) * w * parallaxMult * p.depth * (1 - factor * 0.7);
          const paraY = (my - 0.5) * h * parallaxMult * 0.7 * p.depth * (1 - factor * 0.7);

          const px = curX * w + paraX;
          const py = curY * h + paraY;

          ctx.font = `${p.size}px "SF Mono","IBM Plex Mono",monospace`;
          // Color shifts subtly toward electric lime as it converges
          if (factor > 0.4) {
            ctx.fillStyle = `rgba(214,255,98,${p.alpha * (0.4 + factor * 0.5)})`;
          } else {
            ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
          }
          ctx.fillText(p.text, px, py);
        }
      }

      renderLayer(back, 0.04);
      renderLayer(mid, 0.07);

      // Draw nodes & connector paths
      for (const n of nodes) {
        if (!reduced) {
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < 0.04) n.vx = Math.abs(n.vx);
          if (n.x > 0.96) n.vx = -Math.abs(n.vx);
          if (n.y < 0.04) n.vy = Math.abs(n.vy);
          if (n.y > 0.96) n.vy = -Math.abs(n.vy);
          n.alpha += n.alphaDelta;
          if (n.alpha > 0.85) n.alphaDelta = -Math.abs(n.alphaDelta);
          if (n.alpha < 0.2)  n.alphaDelta =  Math.abs(n.alphaDelta);
        }

        const curX = lerp(n.x, n.tx, factor);
        const curY = lerp(n.y, n.ty, factor);

        const nx = curX * w + (mx - 0.5) * 20 * (1 - factor * 0.8);
        const ny = curY * h + (my - 0.5) * 15 * (1 - factor * 0.8);

        // Radiant glow halo
        const grad = ctx.createRadialGradient(nx, ny, 0, nx, ny, n.r * (3.5 + factor * 2));
        grad.addColorStop(0, n.gold ? `rgba(212,168,38,${n.alpha * 0.7})` : `rgba(214,255,98,${n.alpha * 0.6})`);
        grad.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(nx, ny, n.r * (3.5 + factor * 2), 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Node dot
        ctx.beginPath();
        ctx.arc(nx, ny, n.r + factor, 0, Math.PI * 2);
        ctx.fillStyle = n.gold ? `rgba(255,235,140,${n.alpha})` : `rgba(214,255,98,${n.alpha})`;
        ctx.fill();
      }

      // Connecting lines between nodes
      const threshold = w * (0.2 + factor * 0.15);
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const ax = lerp(a.x, a.tx, factor) * w;
          const ay = lerp(a.y, a.ty, factor) * h;
          const bx = lerp(b.x, b.tx, factor) * w;
          const by = lerp(b.y, b.ty, factor) * h;

          const dx = ax - bx;
          const dy = ay - by;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < threshold) {
            const lineAlpha = (1 - dist / threshold) * (0.18 + factor * 0.35);
            const offset = (ts * 0.04) % 20;

            ctx.setLineDash([5, 12]);
            ctx.lineDashOffset = -offset;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by);
            ctx.strokeStyle = `rgba(214,255,98,${lineAlpha})`;
            ctx.lineWidth = 0.85 + factor * 0.6;
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }

      // When converging (factor > 0.25), draw central financial compass mandala
      if (factor > 0.15) {
        const cx = 0.5 * w;
        const cy = 0.46 * h;
        const coreAlpha = (factor - 0.15) / 0.85;

        // Central glowing core
        const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 75 * factor);
        coreGrad.addColorStop(0, `rgba(214,255,98,${coreAlpha * 0.25})`);
        coreGrad.addColorStop(0.5, `rgba(212,168,38,${coreAlpha * 0.12})`);
        coreGrad.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(cx, cy, 75 * factor, 0, Math.PI * 2);
        ctx.fillStyle = coreGrad;
        ctx.fill();

        // Concentric geometric rings
        ctx.beginPath();
        ctx.arc(cx, cy, 45 * factor, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(214,255,98,${coreAlpha * 0.45})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, 90 * factor, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(212,168,38,${coreAlpha * 0.35})`;
        ctx.setLineDash([4, 6]);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Foreground layer
      renderLayer(front, 0.1);

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMouse);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`block w-full h-full ${className}`}
      aria-hidden="true"
    />
  );
}
