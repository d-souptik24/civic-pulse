import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Eye, PlusCircle, ThumbsUp, Map, Sparkles,
  BrainCircuit, ChevronDown, Shield, Server, Database,
  Globe, Copy, MapPin, CheckCircle
} from 'lucide-react';
import { useTypewriter } from '../hooks/useTypewriter';

// ── Static data ───────────────────────────────────────────────────────────────
const VERBS = [
  { title: 'Identify',  desc: 'Upload a photo. Gemini AI instantly auto-detects category, severity, and authenticity.',     icon: Eye,        step: '01' },
  { title: 'Report',    desc: 'Pin the precise location on the map and submit. Form fields are auto-filled by AI.',          icon: PlusCircle, step: '02' },
  { title: 'Validate',  desc: 'Community upvotes and AI geo-deduplication confirm reports within a 200m radius.',            icon: ThumbsUp,   step: '03' },
  { title: 'Track',     desc: 'Monitor real-time progress on status feeds, timelines, and predictive heatmaps.',             icon: Map,        step: '04' },
  { title: 'Resolve',   desc: 'Gemini visual auditor compares before & after photos to verify municipal fixes.',             icon: Sparkles,   step: '05' },
];

const PIPELINES = [
  { name: 'Vision Categorizer & Authenticity Verifier', role: 'Parses images to classify issue, estimate severity, and detect fake or irrelevant reports.',              num: '01' },
  { name: 'Geo-Deduplication Agent',                    role: 'Uses Geohashes to locate existing reports of the same category within 200m to prevent spam.',            num: '02' },
  { name: 'Predictive Hotspot Mapper',                  role: 'Analyzes spatial density clusters and queries Gemini for localized region-wide health insights.',        num: '03' },
  { name: 'Autonomous Escalation Agent',                role: 'Auto-detects stagnant popular issues, batches them, and drafts official civic emails.',                  num: '04' },
  { name: 'Dual-Vision Resolution Auditor',             role: 'Runs AI comparative visual diffs to audit resolved issues and execute point reward updates.',            num: '05' },
];

const TECH = [
  { icon: Sparkles, title: 'Gemini Flash Lite',  desc: 'Vision categorization & comparative visual audits at sub-second latency' },
  { icon: Database, title: 'Firebase Firestore', desc: 'Real-time database with radius geospatial geohash queries' },
  { icon: Globe,    title: 'Google Maps API',    desc: 'Dynamic coordinate mapping, heatmaps, and custom stone-paper style' },
  { icon: Server,   title: 'Google Cloud Run',   desc: 'Scalable Express + React monorepo with zero cold-start penalty' },
];

// ── Inline Logo — same as Navbar ──────────────────────────────────────────────
function BrandLogo({ size = 'md', onDark = false }) {
  const iconSize = size === 'lg' ? 40 : 32;
  const pinSize  = size === 'lg' ? 20 : 16;
  const textSize = size === 'lg' ? '22px' : '18px';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width={iconSize} 
        height={iconSize} 
        viewBox="212 212 600 600"
        style={{ flexShrink: 0 }}
      >
        <path fill={onDark ? '#ffffff' : 'var(--color-plum)'} d="M498.699 319.289C509.176 318.768 519.572 319.055 530.032 319.743C559.827 321.701 621.879 329.866 647.471 342.46C658.729 347.999 667.977 355.754 676.188 365.185C681.998 371.823 686.791 379.286 690.41 387.331C695.518 398.464 700.068 415.575 702.713 427.607C710.841 463.024 713.907 499.414 711.819 535.691C704.542 535.705 674.017 537.508 669.6 533.972C667.762 532.501 666.95 529.496 666.632 527.287C665.955 522.571 666.484 517.309 666.516 512.536L666.583 480.586C666.586 474.841 667.057 468.615 666.272 462.937C665.795 459.488 664.76 456.637 661.582 454.89C650.401 448.745 595.059 456.411 588.1 450.715C585.977 448.977 584.674 446.082 584.224 443.424C583.073 436.636 583.998 428.252 584.016 421.303L584.14 382.896C584.166 374.853 584.381 365.991 583.866 358.051C582.03 354.839 579.282 351.625 575.24 351.474C553.589 350.663 531.745 351.425 510.071 351.645C503.363 351.713 500.846 356.204 500.241 362.387C500.271 371.66 501.794 416.172 498.527 421.656C497.019 424.188 493.96 425.282 491.208 425.822C483.964 427.246 475.427 426.321 467.999 426.32L421.565 426.346C416.23 426.349 407.889 425.387 402.996 427.374C400.807 428.263 399.083 430.725 398.426 432.925C396.958 437.839 397.717 444.733 397.733 449.844C397.758 457.805 398.91 505.619 396.979 509.783C396.418 510.993 395.359 511.833 394.005 511.998C392.814 512.143 391.882 511.855 391.015 511.004C387.325 507.385 389.359 488.895 389.189 483.33C389.134 481.53 388.861 478.464 387.13 477.38C383.303 474.982 353.976 475.645 347.964 476.039C345.467 476.202 340.519 477 339.126 479.451C336.551 483.981 339.751 519.151 338.601 528.072C338.388 529.726 337.83 531.287 336.672 532.518C332.005 537.48 318.489 535.725 311.864 535.661L311.813 534.784C309.298 489.834 314.396 441.538 328.649 398.59C336.051 376.283 348.67 359.214 368.764 346.382C378.888 339.917 392.03 336.441 403.591 333.076C434.575 324.054 466.595 321.08 498.699 319.289Z"/>
        <path fill={onDark ? '#ffffff' : 'var(--color-plum)'} d="M471.232 568.327C472.104 569.151 477.3 596.667 478.501 600.987C483.86 620.261 490.762 641.784 500.533 659.19C504.811 666.811 514.006 677.1 522.685 678.822C529.023 680.08 535.781 678.696 541.016 675.015C569.105 655.261 580.528 599.679 587.513 567.921C616.909 617.284 649.106 611.063 698.499 611.582C692.337 644.379 672.181 671.38 641.132 684.312C632.727 687.683 624.127 690.546 615.378 692.885C597.721 697.717 581.826 699.795 563.709 701.937C514.22 707.786 463.891 705.3 415.292 694.178C393.372 688.943 371.91 683.285 355.216 667.147C337.124 649.657 331.155 634.878 324.911 611.516C337.489 611.226 352.581 611.481 365.183 611.711C410.282 612.533 448.093 614.281 471.232 568.327Z"/>
        <path fill={onDark ? '#ffffff' : 'var(--color-plum)'} d="M474.01 453.086C497.898 450.498 508.813 527.334 512.378 544.317C515.405 559.274 518.88 574.136 522.798 588.884C523.748 592.577 525.531 605.538 528.944 606.201C532.528 603.894 551.918 528.815 555.058 518.196C556.494 513.37 558.149 508.613 560.017 503.937C563.269 495.948 567.554 488.058 573.501 481.737C576.318 478.742 579.958 476.157 584.236 476.203C604.266 476.415 618.541 528.325 625.569 542.863C627.933 547.753 631.148 552.617 635.027 556.44C638.814 560.171 643.402 562.646 648.54 563.955C657.993 566.362 668.748 565.311 678.459 565.209L708.275 564.903C707.614 571.56 704.189 587.744 702.676 594.62C693.102 594.423 682.335 594.553 672.692 594.614C653.153 594.737 641.616 594.818 625.093 583.113C617.786 577.915 611.677 571.213 607.177 563.457C602.336 555.142 589.436 520.362 583.915 516.296L583.177 516.664C579.611 522.84 574.623 550.865 572.708 559.617C568.912 580.457 563.014 603.997 555.28 623.669C552.46 630.729 548.661 637.317 544.996 643.955C541.339 650.58 535.717 662.242 526.495 660.795C524.086 660.419 521.85 659.313 520.09 657.626C501.88 640.25 487.773 558.56 482.255 533.058C481.068 527.572 478.572 511.409 475.946 507.77L474.969 507.741C474.109 508.411 473.359 509.462 473.08 510.518C466.427 535.706 459.328 559.881 440.917 579.419C423.23 598.188 403.586 594.585 380.152 594.564L320.765 594.579C318.81 585.22 316.818 574.509 315.743 565C330.63 564.7 345.827 565.192 360.732 565.033C374.893 564.882 389.284 566.152 402.977 562.101C411.543 559.653 419.152 554.637 424.777 547.728C443.566 524.187 444.527 461.675 474.01 453.086Z"/>
      </svg>
      <span style={{
        fontFamily: 'var(--font-body)',
        fontWeight: 700,
        fontSize: textSize,
        letterSpacing: '-0.02em',
        color: onDark ? '#ffffff' : 'var(--color-ink)',
      }}>
        Civic<span style={{ color: onDark ? 'rgba(255,255,255,0.7)' : 'var(--color-plum)' }}>Pulse</span>
      </span>
    </div>
  );
}

// ── Stamped Case-ID Hero Visual (per DESIGN_IDEA_1 spec) ─────────────────────
function HeroCaseStamp() {
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: '420px',
      margin: '0 auto',
    }}>
      {/* Main stamp card — slightly rotated */}
      <div style={{
        backgroundColor: 'var(--color-stone-white)',
        border: '1.5px dashed var(--color-stone-line)',
        borderRadius: '12px',
        padding: '36px 40px',
        transform: 'rotate(-2deg)',
        boxShadow: '0 8px 32px rgba(75, 46, 70, 0.12)',
        position: 'relative',
        zIndex: 2,
      }}>
        {/* FILED stamp overlay */}
        <div style={{
          position: 'absolute',
          top: '18px',
          right: '24px',
          border: '2px solid rgba(62, 122, 84, 0.5)',
          borderRadius: '4px',
          padding: '3px 8px',
          transform: 'rotate(8deg)',
          color: 'rgba(62, 122, 84, 0.7)',
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          fontSize: '11px',
          letterSpacing: '0.15em',
        }}>FILED</div>

        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-fog)', letterSpacing: '0.08em', marginBottom: '12px' }}>
          CIVIC REPORT — NEW DELHI DISTRICT
        </div>

        <div style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          fontSize: '28px',
          color: 'var(--color-plum)',
          letterSpacing: '-0.01em',
          marginBottom: '8px',
        }}>CP-2847</div>

        <div style={{
          fontFamily: 'var(--font-body)',
          fontWeight: 600,
          fontSize: '15px',
          color: 'var(--color-ink)',
          marginBottom: '6px',
        }}>Severe road damage & potholes</div>

        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-fog)' }}>
          Mahadev Mandir Chowk · 28.6139° N
        </div>

        {/* Status bar */}
        <div style={{
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid var(--color-stone-line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{
            backgroundColor: 'var(--color-signal-amber)',
            color: 'var(--color-ink)',
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            fontSize: '11px',
            padding: '3px 8px',
            borderRadius: '4px',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}>In Progress</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-fog)' }}>15d ago · 7 upvotes</span>
        </div>
      </div>

      {/* Background card — slightly offset, peeking behind */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: 'var(--color-stone-paper)',
        border: '1.5px dashed var(--color-stone-line)',
        borderRadius: '12px',
        transform: 'rotate(2deg) translateY(6px)',
        zIndex: 1,
      }} aria-hidden="true" />

      {/* Third card — furthest back */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(75, 46, 70, 0.04)',
        border: '1.5px dashed rgba(75, 46, 70, 0.12)',
        borderRadius: '12px',
        transform: 'rotate(-4deg) translateY(12px)',
        zIndex: 0,
      }} aria-hidden="true" />
    </div>
  );
}

// ── IntersectionObserver fade-in hook ─────────────────────────────────────────
function useFadeIn() {
  const refs = useRef([]);
  const register = (el) => {
    if (el && !refs.current.includes(el)) refs.current.push(el);
  };
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.style.opacity = '1';
          if (!prefersReduced) e.target.style.transform = 'translateY(0)';
          observer.unobserve(e.target);
        }
      }),
      { threshold: 0.12 }
    );
    refs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return register;
}

// ── LANDING PAGE ──────────────────────────────────────────────────────────────
export default function LandingPage({ onGetStarted }) {
  const [emailCopied, setEmailCopied] = useState(false);
  const register = useFadeIn();
  const canvasRef = useRef(null);
  const [isSequenceReady, setIsSequenceReady] = useState(false);

  const SUBTITLE = 'CivicPulse turns your photo into a filed report, tracked by AI, validated by your community, and escalated to the right authority — automatically.';
  const { displayed, done } = useTypewriter(SUBTITLE);

  // True 3D Image Sequence Scrubbing (Instant)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false }); // Optimize for no transparency

    const TOTAL_FRAMES = 30;
    const frames = [];
    let loadedCount = 0;
    
    // Start at frame 8
    let targetFrame = 8;
    let currentFrame = 8;
    let frameId;

    let isCancelled = false;

    // 1. Preload all 30 frames silently in the background
    const checkAllLoaded = () => {
      if (isCancelled) return;
      loadedCount++;
      if (loadedCount === TOTAL_FRAMES) {
        // 2. Once all frames loaded, initialize canvas and start animation loop
        if (frames[0].naturalWidth) {
          canvas.width = frames[0].naturalWidth;
          canvas.height = frames[0].naturalHeight;
        } else {
          canvas.width = 1920; // fallback resolution
          canvas.height = 1080;
        }
        ctx.drawImage(frames[8], 0, 0);
        setIsSequenceReady(true);
        frameId = requestAnimationFrame(animate);
      }
    };

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      frames.push(img); // Push immediately to keep indices correct
      
      // Attach listeners BEFORE setting src to catch cached images instantly
      img.onload = checkAllLoaded;
      img.onerror = checkAllLoaded; // Increment even on error so it doesn't hang!
      
      img.src = `/frames/frame_${String(i).padStart(2, '0')}.webp`;
    }

    const animate = () => {
      // Smooth lerp for buttery head rotation
      currentFrame += (targetFrame - currentFrame) * 0.15;
      
      const frameIndex = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(currentFrame)));
      
      if (frames[frameIndex] && frames[frameIndex].complete && frames[0].naturalWidth) {
         ctx.drawImage(frames[frameIndex], 0, 0, canvas.width, canvas.height);
      }
      
      frameId = requestAnimationFrame(animate);
    };

    // Desktop: mouse tracking
    const onMouseMove = (e) => {
      const ratio = e.clientX / window.innerWidth;
      targetFrame = ratio * (TOTAL_FRAMES - 1);
    };

    // Mobile: touch tracking
    const onTouchMove = (e) => {
      const ratio = e.touches[0].clientX / window.innerWidth;
      targetFrame = ratio * (TOTAL_FRAMES - 1);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    return () => {
      isCancelled = true;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, []);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('hello-civicpulse@proton.me');
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2000);
  };

  const scrollToFeatures = () => {
    document.getElementById('verbs-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{ backgroundColor: 'var(--color-stone-paper)', minHeight: '100vh' }}>

      {/* ── SECTION 1: HERO ──────────────────────────────────────────────── */}
      <section
        aria-labelledby="hero-heading"
        style={{
          backgroundColor: 'var(--color-stone-paper)',
          borderBottom: '1px solid var(--color-stone-line)',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background: True Image Sequence Scrubber */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          {/* Phase 1: Static WebP image loads instantly */}
          <img
            src="/robot-hero.webp"
            alt=""
            aria-hidden="true"
            className="hero-bg-media"
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'var(--hero-media-position, center)',
              display: 'block',
              opacity: isSequenceReady ? 0 : 'var(--hero-media-opacity, 0.45)',
              filter: 'saturate(0.85)',
              transition: 'opacity 0.4s ease',
              position: 'absolute', inset: 0,
            }}
          />
          {/* Phase 2: Canvas sequence takes over seamlessly once frames are loaded */}
          <canvas
            ref={canvasRef}
            className="hero-bg-media"
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'var(--hero-media-position, center)',
              display: 'block',
              opacity: isSequenceReady ? 'var(--hero-media-opacity, 0.45)' : 0,
              filter: 'saturate(0.85)',
              transition: 'opacity 0.4s ease',
              position: 'absolute', inset: 0,
            }}
          />
          {/* Mobile-only gradient: fades from stone-paper (left/text area) to
              transparent (right/robot area) so the headline stays legible on
              narrow portrait viewports without hiding the animation entirely. */}
          <div className="hero-mobile-gradient" aria-hidden="true" />
        </div>
        {/* Top nav bar — matches app Navbar style */}
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(222, 218, 210, 0.6)',
            boxShadow: '0 4px 20px -2px rgba(34, 31, 38, 0.05)',
          }}
          className="fixed top-0 inset-x-0 z-50 h-14 flex items-center justify-between px-4 sm:px-6 rounded-2xl"
        >
          <Link
            to="/"
            className="navbar-logo-container flex items-center focus-visible:outline-none rounded-lg no-underline hover:no-underline"
          >
            <BrandLogo />
          </Link>
        </div>

        {/* Hero body */}
        <div style={{
          flex: 1,
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          zIndex: 1,
        }} className="hero-grid px-6 py-16 sm:px-12 sm:py-24">

          {/* Left — headline & CTAs */}
          <div style={{ maxWidth: '600px' }}>
            {/* Overline removed */}

            {/* Headline — Fraunces per spec */}
            <h1
              id="hero-heading"
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: 'clamp(36px, 5vw, 56px)',
                lineHeight: 1.05,
                color: 'var(--color-ink)',
                letterSpacing: '-0.02em',
                marginBottom: '24px',
              }}
            >
              Real change<br />starts locally.
            </h1>

            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: '18px',
              lineHeight: 1.6,
              color: 'var(--color-fog)',
              maxWidth: '420px',
              marginBottom: '40px',
              minHeight: '5rem'
            }}>
              {displayed}
              {!done && (
                <span className="inline-block w-[2px] h-[1em] bg-current align-middle ml-[1px] animate-blink" />
              )}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-stretch sm:items-center">
              <button
                onClick={onGetStarted}
                className="btn-primary w-full sm:w-auto text-center"
                style={{ fontSize: '15px', padding: '12px 24px' }}
              >
                Launch Dashboard
              </button>
              <button
                onClick={scrollToFeatures}
                className="btn-secondary w-full sm:w-auto text-center"
                style={{ fontSize: '15px', padding: '12px 24px' }}
              >
                How it works
              </button>
              <button
                onClick={handleCopyEmail}
                className="btn-ghost w-full sm:w-auto text-center"
                style={{ fontSize: '14px', padding: '10px 16px' }}
              >
                <Copy size={13} style={{ display: 'inline', marginRight: '5px' }} aria-hidden="true" />
                {emailCopied ? 'Email copied!' : 'Contact'}
              </button>
            </div>

            {/* Trust line */}
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              color: 'var(--color-fog)',
              marginTop: '20px',
            }}>
              One click with Google. Zero setup. First report in under 60 seconds.
            </p>
          </div>

        </div>

        {/* Scroll indicator */}
        <button
          onClick={scrollToFeatures}
          aria-label="Scroll to explore features"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            marginBottom: '32px',
            marginLeft: 'auto',
            marginRight: 'auto',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-ink)',
            fontFamily: 'var(--font-body)',
            fontSize: '11px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            transition: 'color 0.2s',
            position: 'relative',
            zIndex: 10,
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--color-plum)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--color-ink)'}
        >
          <span>Explore</span>
          <ChevronDown size={16} aria-hidden="true" style={{ animation: 'bounce 2s ease-in-out infinite' }} />
        </button>
      </section>

      {/* ── SECTION 2: STATS STRIP ──────────────────────────────────────── */}
      <section
        aria-label="Key statistics"
        style={{
          backgroundColor: 'var(--color-stone-white)',
          borderBottom: '1px solid var(--color-stone-line)',
        }}
      >
        <div
          style={{
            maxWidth: '900px',
            margin: '0 auto',
          }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-0 px-6 py-12 sm:px-12 sm:py-16"
        >
          {[
            { num: '5',    label: 'Autonomous AI Pipelines' },
            { num: '200m', label: 'Geo-Deduplication Radius' },
            { num: '60s',  label: 'Report to Live Dashboard' },
          ].map(({ num, label }, i) => (
            <div
              key={label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
              }}
              className={`px-4 pb-6 md:pb-0 border-b md:border-b-0 md:border-r border-stone-line last:border-0 last:pb-0`}
            >
              <span style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: '48px',
                lineHeight: 1,
                color: 'var(--color-plum)',
                letterSpacing: '-0.03em',
              }}>{num}</span>
              <span style={{
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                color: 'var(--color-fog)',
                marginTop: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 3: THE PROBLEM ──────────────────────────────────────── */}
      <section
        id="problem-section"
        aria-labelledby="problem-heading"
        style={{
          backgroundColor: 'var(--color-stone-paper)',
          borderBottom: '1px solid var(--color-stone-line)',
        }}
      >
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '80px',
          alignItems: 'center',
        }} className="two-col-grid px-6 py-16 sm:px-12 sm:py-24">
          {/* Left */}
          <div
            ref={register}
            style={{ opacity: 0, transform: 'translateY(24px)', transition: 'opacity 0.6s ease, transform 0.6s ease', willChange: 'opacity, transform' }}
          >
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--color-plum)',
            }}>The Challenge</span>
            <h2
              id="problem-heading"
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: '32px',
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
                color: 'var(--color-ink)',
                marginTop: '12px',
                marginBottom: '24px',
              }}
            >
              Hyperlocal issues shouldn't get lost in municipal noise.
            </h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', lineHeight: 1.7, color: 'var(--color-fog)', marginBottom: '16px' }}>
              Broken streetlights, giant potholes, leakages, and illegal waste dumps compromise neighborhood safety and property values. Traditional feedback loops stall resolutions for weeks.
            </p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', lineHeight: 1.7, color: 'var(--color-fog)' }}>
              CivicPulse short-circuits this drag by combining community upvotes and image audits with agentic AI workflows that escalate automatically.
            </p>
          </div>

          {/* Right — problem card */}
          <div
            ref={register}
            className="card-white p-5 sm:p-8"
            style={{
              opacity: 0,
              transform: 'translateY(24px)',
              transition: 'opacity 0.6s ease 0.15s, transform 0.6s ease 0.15s',
              willChange: 'opacity, transform',
              borderLeft: '3px solid var(--color-signal-red)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
              <Shield size={18} style={{ color: 'var(--color-signal-red)', flexShrink: 0 }} aria-hidden="true" />
              <h3 style={{
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                fontSize: '15px',
                color: 'var(--color-ink)',
              }}>Civic Inefficiency Impact</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {[
                { num: '01', title: 'Unresolved Hazards',  body: 'Open potholes and dark alleys are major safety risks for nighttime commuters.' },
                { num: '02', title: 'Resource Spillage',   body: 'Water pipeline leaks average 24+ hours of waste before local dispatch notices.' },
                { num: '03', title: 'Municipal Silence',   body: 'Reports sink into single channels without public status tracking or accountability.' },
              ].map(({ num, title, body }) => (
                <div key={num} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '22px',
                    fontWeight: 700,
                    color: 'rgba(178, 59, 46, 0.2)',
                    flexShrink: 0,
                    lineHeight: 1,
                    paddingTop: '2px',
                    userSelect: 'none',
                  }}>{num}</div>
                  <div>
                    <h4 style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '14px', color: 'var(--color-ink)', marginBottom: '4px' }}>{title}</h4>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--color-fog)', lineHeight: 1.6 }}>{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: THE 5 VERBS ──────────────────────────────────────── */}
      <section
        id="verbs-section"
        aria-labelledby="verbs-heading"
        style={{
          backgroundColor: 'var(--color-stone-white)',
          borderBottom: '1px solid var(--color-stone-line)',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }} className="px-6 py-16 sm:px-12 sm:py-24">
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--color-plum)',
            }}>Core Workflow</span>
            <h2
              id="verbs-heading"
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: '32px',
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
                color: 'var(--color-ink)',
                marginTop: '12px',
                marginBottom: '16px',
              }}
            >
              The Five Verbs of Civic Action
            </h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--color-fog)', maxWidth: '520px', margin: '0 auto', lineHeight: 1.7 }}>
              Five seamless steps — from photo to resolution — powered by Gemini AI.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '16px',
          }} className="verbs-grid">
            {VERBS.map((v, i) => {
              const Icon = v.icon;
              return (
                <div
                  key={v.title}
                  ref={register}
                  className="card-white p-5 sm:p-6"
                  style={{
                    opacity: 0,
                    transform: 'translateY(20px)',
                    transition: `opacity 0.5s ease ${i * 80}ms, transform 0.5s ease ${i * 80}ms`,
                    willChange: 'opacity, transform',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0',
                    cursor: 'default',
                  }}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    backgroundColor: 'rgba(75, 46, 70, 0.08)',
                    border: '1px solid rgba(75, 46, 70, 0.15)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-plum)',
                    marginBottom: '16px',
                    flexShrink: 0,
                  }}>
                    <Icon size={17} aria-hidden="true" />
                  </div>
                  <h3 style={{
                    fontFamily: 'var(--font-body)',
                    fontWeight: 600,
                    fontSize: '15px',
                    color: 'var(--color-ink)',
                    marginBottom: '8px',
                  }}>{v.title}</h3>
                  <p style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    color: 'var(--color-fog)',
                    lineHeight: 1.6,
                    flex: 1,
                  }}>{v.desc}</p>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '24px',
                    fontWeight: 700,
                    color: 'rgba(75, 46, 70, 0.1)',
                    textAlign: 'right',
                    marginTop: '16px',
                    userSelect: 'none',
                  }}>{v.step}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SECTION 5: AI PIPELINES ─────────────────────────────────────── */}
      <section
        aria-labelledby="pipelines-heading"
        style={{
          backgroundColor: 'var(--color-plum)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }} className="px-6 py-16 sm:px-12 sm:py-24">
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.5)',
            }}>Agentic Intelligence</span>
            <h2
              id="pipelines-heading"
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: '32px',
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
                color: '#ffffff',
                marginTop: '12px',
                marginBottom: '16px',
              }}
            >
              Five Autonomous AI Pipelines
            </h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'rgba(255,255,255,0.6)', maxWidth: '520px', margin: '0 auto', lineHeight: 1.7 }}>
              Powered by Gemini. Operating without central administrative intervention.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {PIPELINES.map((p, i) => (
              <div
                key={p.name}
                ref={register}
                style={{
                  opacity: 0,
                  transform: 'translateY(16px)',
                  transition: `opacity 0.5s ease ${i * 70}ms, transform 0.5s ease ${i * 70}ms`,
                  willChange: 'opacity, transform',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                }}
                className="p-5 sm:p-6 flex flex-row gap-3.5 sm:gap-5 items-start sm:items-center"
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgba(255,255,255,0.7)',
                  flexShrink: 0,
                }}>
                  <BrainCircuit size={17} aria-hidden="true" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <h3 style={{
                      fontFamily: 'var(--font-body)',
                      fontWeight: 600,
                      fontSize: '15px',
                      color: '#ffffff',
                    }}>{p.name}</h3>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.4)',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '4px',
                      padding: '2px 7px',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                    }}>Pipeline {p.num}</span>
                  </div>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>{p.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 6: TECH STACK ───────────────────────────────────────── */}
      <section
        aria-labelledby="tech-heading"
        style={{
          backgroundColor: 'var(--color-stone-paper)',
          borderBottom: '1px solid var(--color-stone-line)',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }} className="px-6 py-16 sm:px-12 sm:py-24">
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--color-plum)',
            }}>Technology</span>
            <h2
              id="tech-heading"
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: '32px',
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
                color: 'var(--color-ink)',
                marginTop: '12px',
                marginBottom: '16px',
              }}
            >
              Built with Modern Google Architecture
            </h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--color-fog)', maxWidth: '480px', margin: '0 auto', lineHeight: 1.7 }}>
              Optimized for performance, horizontal scaling, and secure data verification.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
          }} className="tech-grid">
            {TECH.map(({ icon: Icon, title, desc }, i) => (
              <div
                key={title}
                ref={register}
                className="card-white"
                style={{
                  opacity: 0,
                  transform: 'translateY(20px)',
                  transition: `opacity 0.5s ease ${i * 80}ms, transform 0.5s ease ${i * 80}ms`,
                  willChange: 'opacity, transform',
                  padding: '28px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '0',
                }}
              >
                <div style={{
                  width: '44px',
                  height: '44px',
                  backgroundColor: 'rgba(75, 46, 70, 0.08)',
                  border: '1px solid rgba(75, 46, 70, 0.15)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-plum)',
                  marginBottom: '16px',
                }}>
                  <Icon size={20} aria-hidden="true" />
                </div>
                <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '14px', color: 'var(--color-ink)', marginBottom: '8px' }}>{title}</h3>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--color-fog)', lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 7: FINAL CTA ────────────────────────────────────────── */}
      <section
        aria-labelledby="cta-heading"
        style={{
          backgroundColor: 'var(--color-stone-white)',
          borderBottom: '1px solid var(--color-stone-line)',
        }}
      >
        <div
          style={{
            maxWidth: '720px',
            margin: '0 auto',
            textAlign: 'center',
          }}
          className="px-6 py-16 sm:px-12 sm:py-24"
        >
          {/* Plum rule above */}
          <div style={{ width: '40px', height: '3px', backgroundColor: 'var(--color-plum)', borderRadius: '2px', margin: '0 auto 32px' }} aria-hidden="true" />

          <h2
            id="cta-heading"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 'clamp(28px, 4vw, 44px)',
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              color: 'var(--color-ink)',
              marginBottom: '20px',
            }}
          >
            Ready to empower your city?
          </h2>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '17px',
            lineHeight: 1.7,
            color: 'var(--color-fog)',
            maxWidth: '480px',
            margin: '0 auto 40px',
          }}>
            Sign in with Google in one click — no passwords, no setup. Report your first issue in under 60 seconds and watch Gemini categorize it in real time.
          </p>
          <button
            onClick={onGetStarted}
            className="btn-primary w-full sm:w-auto text-center"
            style={{ fontSize: '16px', padding: '14px 36px' }}
          >
            Get Started Now
          </button>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
            color: 'var(--color-fog)',
            marginTop: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}>
            <CheckCircle size={13} style={{ color: 'var(--color-signal-green)' }} aria-hidden="true" />
            One click with your Google account. Zero configuration required.
          </p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer style={{
        backgroundColor: 'var(--color-stone-paper)',
        borderTop: '1px solid var(--color-stone-line)',
      }} className="px-6 py-8 sm:px-12">
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          textAlign: 'center',
        }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--color-fog)' }}>
            © 2026 CivicPulse · Built for Vibe2Ship Hackathon by Souptik Dutta
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-stone-line)', letterSpacing: '0.06em' }}>
            Google Cloud · Coding Ninjas
          </p>
        </div>
      </footer>

      {/* ── RESPONSIVE STYLES ───────────────────────────────────────────── */}
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(5px); }
        }
        .hero-bg-media {
          --hero-media-opacity: 0.45;
          --hero-media-position: center;
        }
        @media (max-width: 1024px) {
          .hero-bg-media {
            --hero-media-opacity: 0.35;
            --hero-media-position: 65% center;
          }
        }
        @media (max-width: 640px) {
          .hero-bg-media {
            --hero-media-opacity: 0.28;
            --hero-media-position: 68% center;
          }
        }
        @media (max-width: 900px) {
          .hero-grid    { grid-template-columns: 1fr !important; gap: 48px !important; }
          .two-col-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .verbs-grid   { grid-template-columns: repeat(2, 1fr) !important; }
          .tech-grid    { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 600px) {
          .verbs-grid { grid-template-columns: 1fr !important; }
          .tech-grid  { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
