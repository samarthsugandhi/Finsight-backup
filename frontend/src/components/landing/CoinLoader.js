"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import "./CoinLoader.css";

/* ─────────────────────────────────────────────────────────────────── */
/* SVG Embossed FinSight Brand Mark (Front Face)                       */
/* ─────────────────────────────────────────────────────────────────── */
function CoinMark() {
  return (
    <svg
      viewBox="0 0 100 100"
      className="absolute inset-0 m-auto h-[74%] w-[74%]"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <filter id="embossDepth" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="-1" dy="-1" stdDeviation="0.7" floodColor="#ffe880" floodOpacity="0.8" />
          <feDropShadow dx="1.5" dy="2" stdDeviation="1" floodColor="#3d2a02" floodOpacity="0.9" />
        </filter>
        <linearGradient id="markGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff8cf" />
          <stop offset="40%" stopColor="#f3c93e" />
          <stop offset="80%" stopColor="#b6830d" />
          <stop offset="100%" stopColor="#7a5502" />
        </linearGradient>
      </defs>

      {/* Decorative center ring */}
      <circle cx="50" cy="50" r="38" stroke="rgba(255, 240, 140, 0.3)" strokeWidth="1" strokeDasharray="3 2" fill="none" />

      {/* Finnova "F" ledger bar */}
      <g filter="url(#embossDepth)">
        <path
          d="M34 70V32a6.5 6.5 0 0 1 6.5-6.5H58"
          stroke="url(#markGoldGrad)"
          strokeWidth="5.5"
          strokeLinecap="round"
        />
        <path
          d="M34 49h17"
          stroke="url(#markGoldGrad)"
          strokeWidth="5.5"
          strokeLinecap="round"
        />
        {/* Upward market trend flourish */}
        <path
          d="M50 68l6.5-11 5 6 9-16"
          stroke="#d6ff62"
          strokeWidth="3.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Compass / Astrolabe radial markers */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = Math.round((50 + 43 * Math.cos(rad)) * 100) / 100;
        const y1 = Math.round((50 + 43 * Math.sin(rad)) * 100) / 100;
        const x2 = Math.round((50 + 39 * Math.cos(rad)) * 100) / 100;
        const y2 = Math.round((50 + 39 * Math.sin(rad)) * 100) / 100;
        return (
          <line
            key={deg}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="rgba(255, 245, 170, 0.45)"
            strokeWidth="1.2"
          />
        );
      })}
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* SVG Geometric Rosette (Back Face)                                   */
/* ─────────────────────────────────────────────────────────────────── */
function CoinBackMark() {
  return (
    <svg
      viewBox="0 0 100 100"
      className="absolute inset-0 m-auto h-[74%] w-[74%]"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="50" cy="50" r="42" stroke="rgba(255,240,120,0.35)" strokeWidth="1.2" fill="none" />
      <circle cx="50" cy="50" r="26" stroke="rgba(255,240,120,0.22)" strokeWidth="0.8" fill="none" />
      <circle cx="50" cy="50" r="5" fill="#f5ce47" />

      {/* 8-pointed guilloche star */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <line
            key={deg}
            x1={Math.round((50 + 8 * Math.cos(rad)) * 100) / 100}
            y1={Math.round((50 + 8 * Math.sin(rad)) * 100) / 100}
            x2={Math.round((50 + 26 * Math.cos(rad)) * 100) / 100}
            y2={Math.round((50 + 26 * Math.sin(rad)) * 100) / 100}
            stroke="rgba(255,240,140,0.35)"
            strokeWidth="1.2"
          />
        );
      })}
      {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <circle
            key={deg}
            cx={Math.round((50 + 34 * Math.cos(rad)) * 100) / 100}
            cy={Math.round((50 + 34 * Math.sin(rad)) * 100) / 100}
            r="1.8"
            fill="rgba(255,240,160,0.3)"
          />
        );
      })}
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* Dynamic Specular Light Sweep responding to angle                    */
/* ─────────────────────────────────────────────────────────────────── */
function DynamicSpecular({ rotationRef }) {
  const specRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    function tick() {
      if (specRef.current) {
        const currentRot = rotationRef.current || 0;
        const specAngle = (210 + currentRot * 0.75) % 360;
        specRef.current.style.setProperty("--spec-angle", `${specAngle}deg`);
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [rotationRef]);

  return <div ref={specRef} className="coin-specular" aria-hidden="true" />;
}

/* ─────────────────────────────────────────────────────────────────── */
/* Main CoinLoader Component                                           */
/* ─────────────────────────────────────────────────────────────────── */
export default function CoinLoader({ onComplete }) {
  const bodyControls = useAnimation();
  const sceneControls = useAnimation();
  const shadowControls = useAnimation();
  const gleamControls = useAnimation();
  const logoControls = useAnimation();
  const wrapControls = useAnimation();

  const [logoVisible, setLogoVisible] = useState(false);
  const [done, setDone] = useState(false);
  const skipRef = useRef(false);
  const rotationRef = useRef(0);

  const reducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  useEffect(() => {
    if (reducedMotion) {
      onComplete?.();
      return;
    }

    async function runMedallionSequence() {
      // 1 ── Emergence: Coin lifts up from dark floor, shadow sharpens
      sceneControls.start({
        y: [70, 0],
        opacity: [0, 1],
        scale: [0.88, 1],
        transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] },
      });
      shadowControls.start({
        scale: [0.6, 1],
        opacity: [0.2, 0.85],
        transition: { duration: 0.9, ease: "easeOut" },
      });

      await new Promise((r) => setTimeout(r, 650));

      // 2 ── Multi-stage 3D Tumble: 720° rotation showing thickness & milled edge
      bodyControls.start({
        rotateY: 720,
        rotateX: [0, -8, 6, 0],
        transition: {
          rotateY: { duration: 2.1, ease: [0.12, 0, 0.28, 1] },
          rotateX: { duration: 2.1, ease: "easeInOut" },
        },
      });

      // Track rotation value for specular reflection
      const startTime = performance.now();
      const rotDuration = 2100;
      function trackRot() {
        const elapsed = performance.now() - startTime;
        const p = Math.min(elapsed / rotDuration, 1);
        // Custom easing approximation [0.12, 0, 0.28, 1]
        const eased = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        rotationRef.current = eased * 720;
        if (p < 1) requestAnimationFrame(trackRot);
        else rotationRef.current = 0;
      }
      requestAnimationFrame(trackRot);

      await new Promise((r) => setTimeout(r, 2150));

      // 3 ── Settle with physics overshoot bounce
      await bodyControls.start({
        rotateY: [720, 708, 720],
        rotateX: [0, 4, 0],
        scale: [1, 1.05, 1],
        transition: { duration: 0.45, ease: "easeOut" },
      });

      // 4 ── High-speed gleam light streak across embossed mark
      gleamControls.start({
        x: ["-100%", "150%"],
        transition: { duration: 0.7, ease: [0.25, 1, 0.5, 1] },
      });

      await new Promise((r) => setTimeout(r, 350));

      // 5 ── Logo text reveal
      setLogoVisible(true);
      logoControls.start({
        opacity: [0, 1],
        y: [14, 0],
        transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
      });

      await new Promise((r) => setTimeout(r, 750));

      // 6 ── Scale & elegant fade transition into home page
      sceneControls.start({
        scale: 0.9,
        y: -10,
        transition: { duration: 0.5, ease: "easeInOut" },
      });
      await wrapControls.start({
        opacity: 0,
        transition: { duration: 0.6, ease: "easeInOut" },
      });

      setDone(true);
      onComplete?.();
    }

    runMedallionSequence();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSkip() {
    if (skipRef.current) return;
    skipRef.current = true;
    bodyControls.stop();
    sceneControls.stop();
    wrapControls
      .start({ opacity: 0, transition: { duration: 0.3 } })
      .then(() => {
        setDone(true);
        onComplete?.();
      });
  }

  if (done) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="coin-loader-wrap"
        animate={wrapControls}
        initial={{ opacity: 1 }}
        role="status"
        aria-label="Loading FinSight"
      >
        {/* Atmospheric background */}
        <div className="coin-loader-bg" aria-hidden="true" />
        <div className="coin-bg-particles" aria-hidden="true" />

        {/* 3D Scene Container */}
        <motion.div
          animate={sceneControls}
          initial={{ y: 70, opacity: 0, scale: 0.88 }}
          className="coin-scene"
        >
          <motion.div
            className="coin-body"
            animate={bodyControls}
            initial={{ rotateY: 0 }}
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* ── Extruded cylindrical depth layers (Z-depth slices) ── */}
            {[-6, -4, -2, 0, 2, 4, 6].map((z) => (
              <div
                key={z}
                className="coin-layer"
                style={{ transform: `translateZ(${z}px)` }}
                aria-hidden="true"
              />
            ))}

            {/* Milled fluted edge on center slice */}
            <div
              className="coin-milled-edge"
              style={{ transform: "translateZ(0px)" }}
              aria-hidden="true"
            />

            {/* ── Front Face (+8px along Z) ── */}
            <div className="coin-face coin-front">
              <DynamicSpecular rotationRef={rotationRef} />
              <div className="coin-rim-outer" />
              <div className="coin-rim-beaded" />
              <div className="coin-rim-inner" />
              <CoinMark />
              <div className="coin-lime-ring" />
              {/* Gleam light streak */}
              <motion.div
                className="coin-gleam-streak"
                animate={gleamControls}
                initial={{ x: "-100%" }}
              />
            </div>

            {/* ── Back Face (-8px along Z, rotated 180deg) ── */}
            <div className="coin-face coin-back">
              <div className="coin-rim-outer" />
              <div className="coin-rim-beaded" />
              <div className="coin-rim-inner" />
              <CoinBackMark />
            </div>
          </motion.div>

          {/* Floor Shadow & Ambient Light Halo */}
          <motion.div
            className="coin-shadow"
            animate={shadowControls}
            initial={{ scale: 0.6, opacity: 0.2 }}
            aria-hidden="true"
          />
          <div className="coin-halo" aria-hidden="true" />
        </motion.div>

        {/* Logo Reveal below Medallion */}
        <motion.div
          className="coin-logo-reveal"
          animate={logoControls}
          initial={{ opacity: 0, y: 14 }}
        >
          {logoVisible && (
            <>
              <div className="flex items-center gap-3">
                <svg viewBox="0 0 40 40" fill="none" className="h-7 w-7" aria-hidden="true">
                  <rect
                    x="1.25"
                    y="1.25"
                    width="37.5"
                    height="37.5"
                    rx="10"
                    fill="#d6ff62"
                    fillOpacity="0.14"
                    stroke="#d6ff62"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M13 29V14a3 3 0 0 1 3-3h9"
                    stroke="#d6ff62"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                  />
                  <path
                    d="M13 20.5h7.5"
                    stroke="#d6ff62"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                  />
                  <path
                    d="M23 28.5l3.2-5.5 2.6 3 4.2-7.5"
                    stroke="#d6ff62"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.9"
                  />
                </svg>
                <span>FinSight</span>
              </div>
              <p className="coin-logo-tagline">Clarity for your money</p>
              <div className="coin-progress-line" />
            </>
          )}
        </motion.div>

        {/* Skip Button */}
        <button
          type="button"
          className="coin-skip"
          onClick={handleSkip}
          aria-label="Skip introductory animation"
        >
          Skip intro
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
