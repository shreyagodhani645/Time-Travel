import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/* ═══════════════════════════════════════════════════════════
   CONSTANTS & DESIGN TOKENS
   ═══════════════════════════════════════════════════════════ */
const mono = "'Share Tech Mono', monospace";
const display = "'Orbitron', sans-serif";

const LOCATIONS = [
  'Hawkins, Indiana',
  'New York City',
  'London, England',
  'Tokyo, Japan',
  'Cairo, Egypt',
  'Sydney, Australia',
  'Paris, France',
  'Moscow, Russia',
  'Rio de Janeiro, Brazil',
  'The Upside Down',
];

/* ═══════════════════════════════════════════════════════════
   AUDIO ENGINE — Synthesized sci-fi sounds via Web Audio API
   ═══════════════════════════════════════════════════════════ */
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.ambientNode = null;
    this.ambientGain = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
    } catch (e) {
      console.log('Web Audio not available');
    }
  }

  /* Low droning ambient loop */
  startAmbient() {
    if (!this.ctx) return;
    if (this.ambientNode) return;

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.value = 0.06;
    this.ambientGain.connect(this.ctx.destination);

    // Deep drone
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 55;
    const f1 = this.ctx.createBiquadFilter();
    f1.type = 'lowpass';
    f1.frequency.value = 200;
    osc1.connect(f1);
    f1.connect(this.ambientGain);
    osc1.start();

    // High eerie tone
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 440;
    const g2 = this.ctx.createGain();
    g2.gain.value = 0.015;
    osc2.connect(g2);
    g2.connect(this.ambientGain);
    osc2.start();

    // Slow LFO modulation
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.3;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 15;
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfo.start();

    this.ambientNode = { osc1, osc2, lfo };
  }

  stopAmbient() {
    if (this.ambientNode) {
      try {
        this.ambientNode.osc1.stop();
        this.ambientNode.osc2.stop();
        this.ambientNode.lfo.stop();
      } catch (e) {}
      this.ambientNode = null;
    }
  }

  /* Short confirmation beep */
  playSuccess() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(1320, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  /* Glitchy error buzz */
  playError() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.15;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 2;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    source.start();
  }

  /* Transition whoosh */
  playTransition() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2000, this.ctx.currentTime + 0.15);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.4);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 3000;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }

  /* Dramatic warp sound */
  playWarp() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(4000, this.ctx.currentTime + 2);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 3.5);
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 1.5);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 3.5);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 3.5);
  }

  destroy() {
    this.stopAmbient();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
    }
  }
}

const audioEngine = new AudioEngine();

/* ═══════════════════════════════════════════════════════════
   FLOATING PARTICLES — Ambient red embers
   ═══════════════════════════════════════════════════════════ */
function useParticles(count = 35) {
  useEffect(() => {
    const container = document.createElement('div');
    container.id = 'chrono-particles';
    Object.assign(container.style, {
      position: 'fixed', top: '0', left: '0',
      width: '100%', height: '100%',
      zIndex: '2', pointerEvents: 'none',
    });
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      const size = 2 + Math.random() * 3;
      Object.assign(el.style, {
        position: 'absolute',
        left: Math.random() * 100 + '%',
        top: Math.random() * 100 + '%',
        width: size + 'px',
        height: size + 'px',
        borderRadius: '50%',
        background: Math.random() > 0.7 ? '#ff6b6b' : '#ff0000',
        boxShadow: `0 0 ${4 + Math.random() * 6}px ${Math.random() > 0.5 ? '#ff0000' : '#cc0000'}`,
        opacity: '0',
        animation: `floatUp ${4 + Math.random() * 6}s linear ${Math.random() * 8}s infinite`,
      });
      container.appendChild(el);
    }
    document.body.appendChild(container);
    return () => container.remove();
  }, [count]);
}

/* ═══════════════════════════════════════════════════════════
   BURST PARTICLES — Explosion effect for arrival
   ═══════════════════════════════════════════════════════════ */
function BurstParticles({ color = '#00ff88' }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    for (let i = 0; i < 80; i++) {
      const el = document.createElement('div');
      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 250;
      const size = 2 + Math.random() * 5;
      Object.assign(el.style, {
        position: 'absolute', left: '50%', top: '50%',
        width: size + 'px', height: size + 'px', borderRadius: '50%',
        background: color,
        boxShadow: `0 0 ${size * 2}px ${color}`,
        pointerEvents: 'none',
        '--dx': Math.cos(angle) * dist + 'px',
        '--dy': Math.sin(angle) * dist + 'px',
        animation: `burstParticle ${1 + Math.random() * 1.5}s ease-out ${Math.random() * 0.4}s forwards`,
      });
      c.appendChild(el);
    }
  }, [color]);
  return <div ref={ref} style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }} />;
}

/* ═══════════════════════════════════════════════════════════
   PROGRESS INDICATOR — Step tracker (HCI: Visibility of Status)
   ═══════════════════════════════════════════════════════════ */
function ProgressBar({ currentStep, totalSteps = 8 }) {
  const pct = Math.min(100, (currentStep / totalSteps) * 100);
  return (
    <div style={{
      padding: '8px 20px',
      background: 'rgba(0,0,0,0.6)',
      borderBottom: '1px solid #1a0000',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontFamily: mono, fontSize: 9, color: '#888', letterSpacing: 2 }}>
          MISSION PROGRESS
        </span>
        <span style={{ fontFamily: mono, fontSize: 9, color: '#ff6b6b', letterSpacing: 2 }}>
          STEP {currentStep}/{totalSteps}
        </span>
      </div>
      <div style={{
        height: 4, background: '#1a0000', borderRadius: 2, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: pct + '%',
          background: 'linear-gradient(90deg, #cc0000, #ff0000, #ff4444)',
          boxShadow: '0 0 8px #cc0000',
          borderRadius: 2,
          transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SYSTEM STATUS INDICATOR — Floating telemetry (Screen 13)
   ═══════════════════════════════════════════════════════════ */
function SystemStatusOverlay({ data, currentStep }) {
  const [stability, setStability] = useState(78.4);
  const [flicker, setFlicker] = useState(false);

  useEffect(() => {
    const iv = setInterval(() => {
      setStability(s => {
        const delta = (Math.random() - 0.5) * 4;
        return Math.max(50, Math.min(99, s + delta));
      });
      setFlicker(true);
      setTimeout(() => setFlicker(false), 100);
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  if (currentStep < 2 || currentStep > 11) return null;

  return (
    <div style={{
      position: 'fixed', top: 16, right: 16, zIndex: 150,
      background: 'rgba(5,0,0,0.92)',
      border: '1px solid #440000',
      borderRadius: 4,
      padding: '10px 14px',
      fontFamily: mono,
      fontSize: 10,
      letterSpacing: '0.1em',
      backdropFilter: 'blur(8px)',
      animation: flicker ? 'flickerSubtle 0.1s' : 'none',
      maxWidth: 200,
      boxShadow: '0 0 20px rgba(255,0,0,0.15)',
    }}>
      <div style={{ color: '#ff6b6b', marginBottom: 6, fontSize: 8, letterSpacing: 3 }}>
        ◈ SYSTEM TELEMETRY
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, color: '#aaa' }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: stability > 70 ? '#00ff88' : '#ff0000',
          boxShadow: `0 0 6px ${stability > 70 ? '#00ff88' : '#ff0000'}`,
          animation: 'statusPulse 2s infinite',
        }} />
        STABILITY: <span style={{ color: stability > 70 ? '#00ff88' : '#ff0000' }}>{stability.toFixed(1)}%</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, color: '#aaa' }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#ff6b6b',
          animation: 'statusPulse 2s infinite',
        }} />
        DURATION: <span style={{ color: '#fff' }}>{data.days || 0}D {data.hours || 0}H</span>
      </div>
      <div style={{ height: 3, background: '#1a0000', borderRadius: 2, marginTop: 6 }}>
        <div style={{
          height: '100%', width: stability + '%',
          background: stability > 70 ? '#00ff88' : '#ff0000',
          borderRadius: 2,
          transition: 'width 0.5s',
        }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   NAV BAR
   ═══════════════════════════════════════════════════════════ */
function NavBar() {
  return (
    <div style={{
      background: 'rgba(0,0,0,0.95)',
      borderBottom: '1px solid #220000',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 20px',
      fontFamily: mono, fontSize: 10, letterSpacing: 2,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 8, height: 8, background: '#ff0000', borderRadius: '50%',
          animation: 'statusPulse 2s infinite',
        }} />
        <span style={{ color: '#ff6b6b', fontFamily: display, fontWeight: 700, fontSize: 12, letterSpacing: 3 }}>
          CHRONOGATE
        </span>
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        {['MISSIONS', 'INTEL', 'LOGS'].map(l => (
          <span key={l} style={{ color: l === 'MISSIONS' ? '#ff0000' : '#555', cursor: 'default' }}>{l}</span>
        ))}
      </div>
      <span style={{ color: '#444' }}>
        UPSIDE-DOWN FEED{' '}
        <span style={{ animation: 'blink 1.2s step-end infinite', color: '#ff0000' }}>[ACTIVE]</span>
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   NEON BUTTON — Primary CTA
   ═══════════════════════════════════════════════════════════ */
function NeonButton({ text, onClick, id, disabled = false, variant = 'primary' }) {
  const [hover, setHover] = useState(false);

  const isPrimary = variant === 'primary';
  const baseColor = isPrimary ? '#ff0000' : '#666';
  const glowColor = isPrimary ? 'rgba(255,0,0,0.4)' : 'rgba(100,100,100,0.2)';

  return (
    <button
      id={id}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={disabled}
      style={{
        background: hover && !disabled ? 'rgba(255,0,0,0.1)' : 'transparent',
        border: `2px solid ${disabled ? '#333' : baseColor}`,
        color: disabled ? '#555' : '#fff',
        fontFamily: mono,
        fontSize: '0.85rem',
        fontWeight: 'bold',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        padding: '14px 36px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative',
        transition: 'all 0.25s ease',
        boxShadow: hover && !disabled
          ? `0 0 20px ${glowColor}, 0 0 40px ${glowColor}, inset 0 0 10px ${glowColor}`
          : `0 0 8px ${glowColor}`,
        textShadow: disabled ? 'none' : `0 0 10px ${baseColor}`,
        borderRadius: 2,
        minWidth: 160,
      }}
    >
      {text}
      {!disabled && (
        <>
          <div style={{
            position: 'absolute', top: -1, left: -8,
            width: 12, height: 1, background: baseColor,
            boxShadow: `0 0 4px ${baseColor}`,
          }} />
          <div style={{
            position: 'absolute', bottom: -1, right: -8,
            width: 12, height: 1, background: baseColor,
            boxShadow: `0 0 4px ${baseColor}`,
          }} />
        </>
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════
   GLOWING INPUT — Consistent form control
   ═══════════════════════════════════════════════════════════ */
function GlowInput({ value, onChange, placeholder, type = 'text', disabled = false, error = false, id }) {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? '#ff4444' : focused ? '#ff0000' : '#660000';

  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        background: disabled ? '#0a0a0a' : '#050000',
        border: `2px solid ${borderColor}`,
        boxShadow: focused
          ? `0 0 12px rgba(255,0,0,0.3), 0 0 4px rgba(255,0,0,0.2) inset`
          : error
            ? '0 0 8px rgba(255,68,68,0.3)'
            : '0 0 3px rgba(255,0,0,0.1) inset',
        color: disabled ? '#666' : '#fff',
        fontFamily: mono,
        fontSize: '0.9rem',
        height: 44,
        paddingLeft: 14,
        paddingRight: 14,
        width: '100%',
        outline: 'none',
        letterSpacing: '0.08em',
        borderRadius: 2,
        transition: 'all 0.25s ease',
      }}
    />
  );
}

/* ═══════════════════════════════════════════════════════════
   FEEDBACK TOAST — Immediate feedback display
   ═══════════════════════════════════════════════════════════ */
function FeedbackToast({ message, type = 'success' }) {
  if (!message) return null;
  const isError = type === 'error';
  return (
    <div style={{
      marginTop: 16,
      padding: '10px 20px',
      background: isError ? 'rgba(255,0,0,0.1)' : 'rgba(0,255,136,0.08)',
      border: `1px solid ${isError ? '#ff4444' : '#00ff88'}`,
      borderRadius: 4,
      fontFamily: mono,
      fontSize: '0.8rem',
      color: isError ? '#ff6b6b' : '#00ff88',
      textAlign: 'center',
      letterSpacing: '0.1em',
      animation: 'fadeIn 0.3s ease',
      display: 'inline-block',
    }}>
      {isError ? '⚠ ' : '✓ '}{message}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SECTION LABEL — Consistent heading component
   ═══════════════════════════════════════════════════════════ */
function SectionLabel({ children }) {
  return (
    <div style={{
      fontFamily: mono, fontSize: 10, color: '#666',
      letterSpacing: 3, textTransform: 'uppercase',
      marginBottom: 8,
    }}>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCREEN WRAPPER — Consistent container
   ═══════════════════════════════════════════════════════════ */
function ScreenWrapper({ children, animate = true }) {
  return (
    <div style={{
      padding: '32px 24px',
      minHeight: 420,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      animation: animate ? 'fadeIn 0.5s ease' : 'none',
    }}>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCREEN TITLE — Consistent title component
   ═══════════════════════════════════════════════════════════ */
function ScreenTitle({ title, subtitle }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 28 }}>
      <h2 style={{
        fontFamily: display,
        fontSize: 'clamp(1.1rem, 3vw, 1.6rem)',
        color: '#ff0000',
        letterSpacing: '0.2em',
        fontWeight: 700,
        textShadow: '0 0 20px rgba(255,0,0,0.5)',
        margin: 0,
      }}>
        {title}
      </h2>
      {subtitle && (
        <div style={{
          fontFamily: mono, fontSize: '0.7rem', color: '#666',
          letterSpacing: '0.15em', marginTop: 8,
        }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   HERO SVG — Vortex visual
   ═══════════════════════════════════════════════════════════ */
function VortexSVG() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', top: 0, left: 0, zIndex: 1, opacity: 0.7 }}>
      <defs>
        <filter id="glow"><feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id="vortexGrad" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#ff0000" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="400" cy="200" r="180" fill="url(#vortexGrad)" />

      {[220, 170, 130, 90, 55, 30].map((rx, i) => (
        <ellipse key={i} cx="400" cy="200"
          rx={rx} ry={rx * 0.4}
          fill="none" stroke="#880000" strokeWidth={0.8}
          opacity={0.2 + i * 0.05}
          style={{ animation: `rotateDialSlow ${20 + i * 5}s linear infinite${i % 2 ? ' reverse' : ''}` }}
          transform={`rotate(${i * 12} 400 200)`}
        />
      ))}

      {/* Lightning bolts */}
      <path d="M400,200 L370,130 L385,138 L360,70 L380,82 L358,20"
        stroke="#cc0000" strokeWidth="1.5" fill="none" opacity="0.4" filter="url(#glow)" />
      <path d="M400,200 L435,125 L420,132 L450,60 L432,72 L455,15"
        stroke="#cc0000" strokeWidth="1.5" fill="none" opacity="0.4" filter="url(#glow)" />
      <path d="M400,200 L310,148 L325,145 L260,100"
        stroke="#990000" strokeWidth="1" fill="none" opacity="0.3" filter="url(#glow)" />
      <path d="M400,200 L490,148 L475,145 L540,100"
        stroke="#990000" strokeWidth="1" fill="none" opacity="0.3" filter="url(#glow)" />

      {/* Silhouettes */}
      <path d="M200,400 L200,345 L195,345 L195,320 C195,308 207,300 212,294 L208,292 C208,280 216,272 216,272 C216,272 224,280 224,292 L220,294 C225,300 237,308 237,320 L237,345 L232,345 L232,400 Z" fill="#050505" />
      <path d="M560,400 L560,350 L555,350 L555,328 C555,316 566,310 570,304 L567,302 C567,290 574,282 574,282 C574,282 581,290 581,302 L578,304 C582,310 593,316 593,328 L593,350 L588,350 L588,400 Z" fill="#050505" />

      {/* Glow dots */}
      {[[130, 80], [270, 50], [400, 30], [530, 55], [680, 90], [180, 300], [620, 310], [350, 340], [460, 350]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={1.5 + Math.random() * 2}
          fill="#cc0000" filter="url(#glow)" opacity={0.4 + Math.random() * 0.3} />
      ))}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCREEN 1 — INTRO / LANDING
   Auto-transition, cinematic, no buttons
   ═══════════════════════════════════════════════════════════ */
function ScreenIntro({ onNext }) {
  const [phase, setPhase] = useState(0); // 0=dark, 1=title, 2=subtitle, 3=fade
  const onNextRef = useRef(onNext);
  onNextRef.current = onNext;

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),
      setTimeout(() => setPhase(2), 2200),
      setTimeout(() => setPhase(3), 4000),
      setTimeout(() => {
        audioEngine.playTransition();
        onNextRef.current();
      }, 5000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div style={{
      height: '100%', minHeight: 500,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 60%, #2a0000 0%, #0a0000 40%, #000 80%)',
      position: 'relative', overflow: 'hidden',
      transition: 'opacity 1s',
      opacity: phase === 3 ? 0 : 1,
    }}>
      <VortexSVG />

      {/* Title */}
      <div style={{
        zIndex: 5, textAlign: 'center',
        opacity: phase >= 1 ? 1 : 0,
        transform: phase >= 1 ? 'translateY(0)' : 'translateY(30px)',
        transition: 'all 1.2s ease',
      }}>
        <div style={{
          fontFamily: display, fontSize: 'clamp(1.8rem, 5vw, 3.2rem)',
          fontWeight: 900, color: '#ff0000',
          letterSpacing: '0.15em',
          textShadow: '0 0 30px rgba(255,0,0,0.6), 0 0 60px rgba(255,0,0,0.3)',
          animation: phase >= 1 ? 'flickerSubtle 3s infinite' : 'none',
          lineHeight: 1.2,
        }}>
          CHRONOGATE
        </div>
        <div style={{
          fontFamily: mono, fontSize: 'clamp(0.8rem, 2vw, 1.1rem)',
          color: '#ff6b6b', letterSpacing: '0.3em',
          marginTop: 8,
        }}>
          TIME MACHINE
        </div>
      </div>

      {/* Subtitle */}
      <div style={{
        zIndex: 5, marginTop: 40,
        fontFamily: mono, fontSize: '0.75rem', color: '#666',
        letterSpacing: '0.2em',
        opacity: phase >= 2 ? 1 : 0,
        transition: 'opacity 0.8s ease',
      }}>
        ESTABLISHING TEMPORAL LINK...
      </div>

      {/* Loading bar */}
      <div style={{
        zIndex: 5, marginTop: 20, width: 200,
        height: 3, background: '#1a0000', borderRadius: 2,
        overflow: 'hidden',
        opacity: phase >= 2 ? 1 : 0,
        transition: 'opacity 0.5s',
      }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg, #cc0000, #ff0000)',
          boxShadow: '0 0 8px #ff0000',
          animation: phase >= 2 ? 'loadBar 2.5s ease forwards' : 'none',
        }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCREEN 2 — IDENTITY INPUT
   Name + Email with inline validation
   ═══════════════════════════════════════════════════════════ */
function ScreenIdentity({ onNext, onError }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [feedback, setFeedback] = useState('');

  // Live inline validation
  const validateName = (v) => {
    setName(v);
    setFeedback('');
    if (v.length > 0 && v.trim().length < 2) {
      setNameError('Name must be at least 2 characters');
    } else {
      setNameError('');
    }
  };

  const validateEmail = (v) => {
    setEmail(v);
    setFeedback('');
    if (v.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      setEmailError('Enter a valid email (e.g. agent@hawkins.gov)');
    } else {
      setEmailError('');
    }
  };

  const handleSubmit = () => {
    let hasError = false;
    if (!name.trim() || name.trim().length < 2) {
      setNameError('Name is required (min 2 characters)');
      hasError = true;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Valid email is required');
      hasError = true;
    }
    if (hasError) {
      audioEngine.playError();
      onError(name, email, nameError || 'Name is required', emailError || 'Valid email is required');
      return;
    }
    audioEngine.playSuccess();
    setFeedback('Identity Registered');
    setTimeout(() => {
      audioEngine.playTransition();
      onNext({ name: name.trim(), email: email.trim() });
    }, 900);
  };

  return (
    <ScreenWrapper>
      <ScreenTitle title="IDENTITY VERIFICATION" subtitle="TEMPORAL ACCESS REQUIRES IDENTITY CONFIRMATION" />

      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ marginBottom: 20, animation: 'slideInLeft 0.4s ease' }}>
          <SectionLabel>AGENT NAME</SectionLabel>
          <GlowInput
            id="input-name"
            value={name}
            onChange={e => validateName(e.target.value)}
            placeholder="Enter your full name"
            error={!!nameError}
          />
          {nameError && (
            <div style={{ fontFamily: mono, fontSize: '0.7rem', color: '#ff4444', marginTop: 6, animation: 'fadeIn 0.2s' }}>
              ⚠ {nameError}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 24, animation: 'slideInRight 0.5s ease' }}>
          <SectionLabel>EMAIL ADDRESS</SectionLabel>
          <GlowInput
            id="input-email"
            value={email}
            onChange={e => validateEmail(e.target.value)}
            placeholder="agent@hawkins.gov"
            type="email"
            error={!!emailError}
          />
          {emailError && (
            <div style={{ fontFamily: mono, fontSize: '0.7rem', color: '#ff4444', marginTop: 6, animation: 'fadeIn 0.2s' }}>
              ⚠ {emailError}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center' }}>
          <NeonButton text="REGISTER IDENTITY" onClick={handleSubmit} id="btn-register" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <FeedbackToast message={feedback} />
        </div>
      </div>
    </ScreenWrapper>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCREEN 3 — IDENTITY ERROR
   Specific error messages + field highlights + suggestions
   ═══════════════════════════════════════════════════════════ */
function ScreenIdentityError({ onRetry, errorName, errorEmail, valName, valEmail }) {
  return (
    <ScreenWrapper>
      <div style={{
        textAlign: 'center',
        animation: 'glitchShift 0.1s linear 3',
      }}>
        <div style={{
          fontFamily: display, fontSize: 'clamp(1.2rem, 3vw, 1.8rem)',
          color: '#ff0000', fontWeight: 900, marginBottom: 8,
          animation: 'flicker 0.15s linear infinite',
          textShadow: '0 0 20px #ff0000',
        }}>
          ⚠ IDENTITY VERIFICATION FAILED
        </div>

        <div style={{
          maxWidth: 480, margin: '20px auto',
          border: '1px solid #660000', background: 'rgba(30,0,0,0.6)',
          padding: 20, borderRadius: 4, textAlign: 'left',
        }}>
          {errorName && (
            <div style={{ marginBottom: 14, animation: 'slideInLeft 0.3s ease' }}>
              <div style={{ fontFamily: mono, fontSize: '0.75rem', color: '#ff6b6b', marginBottom: 4 }}>
                ▸ NAME FIELD ERROR
              </div>
              <div style={{ fontFamily: mono, fontSize: '0.7rem', color: '#ccc', lineHeight: 1.6 }}>
                {errorName}
              </div>
              {valName && (
                <div style={{ fontFamily: mono, fontSize: '0.65rem', color: '#888', marginTop: 4 }}>
                  Current value: "{valName}"
                </div>
              )}
            </div>
          )}
          {errorEmail && (
            <div style={{ animation: 'slideInLeft 0.4s ease' }}>
              <div style={{ fontFamily: mono, fontSize: '0.75rem', color: '#ff6b6b', marginBottom: 4 }}>
                ▸ EMAIL FIELD ERROR
              </div>
              <div style={{ fontFamily: mono, fontSize: '0.7rem', color: '#ccc', lineHeight: 1.6 }}>
                {errorEmail}
              </div>
              {valEmail && (
                <div style={{ fontFamily: mono, fontSize: '0.65rem', color: '#888', marginTop: 4 }}>
                  Current value: "{valEmail}" — Suggestion: ensure format user@domain.com
                </div>
              )}
            </div>
          )}
        </div>

        <NeonButton text="CORRECT ERRORS" onClick={onRetry} id="btn-identity-retry" />
      </div>
    </ScreenWrapper>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCREEN 4 — DESTINATION SELECTION
   Location search with globe visual
   ═══════════════════════════════════════════════════════════ */
function ScreenDestination({ onNext }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('');
  const [feedback, setFeedback] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return LOCATIONS;
    return LOCATIONS.filter(l => l.toLowerCase().includes(query.toLowerCase()));
  }, [query]);

  const handleSelect = (loc) => {
    setSelected(loc);
    setQuery(loc);
    audioEngine.playSuccess();
  };

  const handleConfirm = () => {
    const dest = selected || query.trim();
    if (!dest) return;
    setFeedback('Coordinates Locked');
    setTimeout(() => {
      audioEngine.playTransition();
      onNext(dest);
    }, 900);
  };

  return (
    <ScreenWrapper>
      <ScreenTitle title="DESTINATION SELECTION" subtitle="SELECT TARGET LOCATION ON EARTH" />

      <div style={{ display: 'flex', gap: 30, width: '100%', maxWidth: 700, flexWrap: 'wrap', justifyContent: 'center' }}>
        {/* Globe */}
        <div style={{ flex: '0 0 180px', animation: 'fadeInScale 0.6s ease' }}>
          <svg width="180" height="180" viewBox="0 0 180 180" style={{ animation: 'portalPulse 4s ease-in-out infinite' }}>
            <defs>
              <filter id="globeGlow"><feGaussianBlur stdDeviation="3" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <circle cx="90" cy="90" r="78" fill="#080000" stroke="#cc0000" strokeWidth="1.5" filter="url(#globeGlow)" />
            <ellipse cx="90" cy="60" rx="70" ry="10" fill="none" stroke="#ff0000" strokeWidth="0.6" opacity="0.4" />
            <ellipse cx="90" cy="90" rx="78" ry="14" fill="none" stroke="#ff0000" strokeWidth="0.7" opacity="0.5" />
            <ellipse cx="90" cy="120" rx="65" ry="9" fill="none" stroke="#ff0000" strokeWidth="0.6" opacity="0.4" />
            <path d="M90,12 Q125,90 90,168" fill="none" stroke="#ff0000" strokeWidth="0.6" opacity="0.4" />
            <path d="M90,12 Q55,90 90,168" fill="none" stroke="#ff0000" strokeWidth="0.6" opacity="0.4" />
            <line x1="90" y1="12" x2="90" y2="168" stroke="#ff0000" strokeWidth="0.7" opacity="0.4" />
            {selected && (
              <g transform="translate(105,72)">
                <line x1="-5" y1="-5" x2="5" y2="5" stroke="#ff0000" strokeWidth="2" />
                <line x1="5" y1="-5" x2="-5" y2="5" stroke="#ff0000" strokeWidth="2" />
                <circle cx="0" cy="0" r="8" fill="none" stroke="#ff0000" strokeWidth="1" opacity="0.7" />
                <text x="14" y="4" fill="#ff0000" fontFamily={mono} fontSize="7" letterSpacing="1">LOCKED</text>
              </g>
            )}
          </svg>
        </div>

        {/* Search */}
        <div style={{ flex: 1, minWidth: 250 }}>
          <SectionLabel>SEARCH LOCATION</SectionLabel>
          <GlowInput
            id="input-destination"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(''); setFeedback(''); }}
            placeholder="Type to search..."
          />

          <div style={{
            marginTop: 12, maxHeight: 180, overflowY: 'auto',
            border: '1px solid #220000', background: '#050000', borderRadius: 2,
          }}>
            {filtered.map(loc => (
              <div
                key={loc}
                onClick={() => handleSelect(loc)}
                style={{
                  padding: '10px 14px',
                  fontFamily: mono, fontSize: '0.8rem',
                  color: selected === loc ? '#ff0000' : '#aaa',
                  background: selected === loc ? 'rgba(255,0,0,0.08)' : 'transparent',
                  cursor: 'pointer',
                  borderBottom: '1px solid #150000',
                  transition: 'all 0.15s',
                  letterSpacing: '0.05em',
                }}
                onMouseEnter={e => { if (selected !== loc) e.target.style.background = 'rgba(255,0,0,0.04)'; }}
                onMouseLeave={e => { if (selected !== loc) e.target.style.background = 'transparent'; }}
              >
                {selected === loc ? '◈ ' : '○ '}{loc}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <NeonButton text="LOCK COORDINATES" onClick={handleConfirm} id="btn-lock-dest" disabled={!selected && !query.trim()} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <FeedbackToast message={feedback} />
          </div>
        </div>
      </div>
    </ScreenWrapper>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCREEN 5 — TIME SELECTION
   Date input + Past/Future toggle + Timeline slider
   ═══════════════════════════════════════════════════════════ */
function ScreenTime({ onNext, onError }) {
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [direction, setDirection] = useState('PAST');
  const [slider, setSlider] = useState(50);
  const [feedback, setFeedback] = useState('');

  const sliderYear = useMemo(() => {
    const minY = direction === 'PAST' ? 1800 : 2026;
    const maxY = direction === 'PAST' ? 2025 : 2300;
    return Math.round(minY + (slider / 100) * (maxY - minY));
  }, [slider, direction]);

  const handleSubmit = () => {
    const d = parseInt(day), m = parseInt(month), y = parseInt(year);
    if (!d || !m || !y || d < 1 || d > 31 || m < 1 || m > 12 || y < 1800 || y > 2300) {
      audioEngine.playError();
      onError(`Invalid date: ${day || '??'}/${month || '??'}/${year || '????'}. Day must be 1-31, Month 1-12, Year 1800-2300.`);
      return;
    }
    audioEngine.playSuccess();
    setFeedback('Timeline Calibrated');
    setTimeout(() => {
      audioEngine.playTransition();
      onNext({ day: d, month: m, year: y, direction });
    }, 900);
  };

  return (
    <ScreenWrapper>
      <ScreenTitle title="TEMPORAL COORDINATES" subtitle="SET YOUR TARGET TIME DESTINATION" />

      <div style={{ width: '100%', maxWidth: 500 }}>
        {/* Past / Future toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 0, marginBottom: 24, animation: 'fadeIn 0.3s' }}>
          {['PAST', 'FUTURE'].map(d => (
            <button key={d} onClick={() => { setDirection(d); setFeedback(''); }}
              style={{
                background: direction === d ? 'rgba(255,0,0,0.15)' : 'transparent',
                border: `2px solid ${direction === d ? '#ff0000' : '#330000'}`,
                color: direction === d ? '#ff0000' : '#555',
                fontFamily: mono, fontSize: '0.8rem', letterSpacing: '0.15em',
                padding: '10px 28px', cursor: 'pointer',
                transition: 'all 0.25s',
                borderRadius: d === 'PAST' ? '4px 0 0 4px' : '0 4px 4px 0',
                boxShadow: direction === d ? '0 0 12px rgba(255,0,0,0.2)' : 'none',
              }}
            >
              {d === 'PAST' ? '◄ ' : ''}{d}{d === 'FUTURE' ? ' ►' : ''}
            </button>
          ))}
        </div>

        {/* Date inputs */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, animation: 'slideInLeft 0.4s' }}>
          {[
            ['DD', day, setDay, '06'],
            ['MM', month, setMonth, '11'],
            ['YYYY', year, setYear, '1983'],
          ].map(([label, val, setter, ph]) => (
            <div key={label} style={{ flex: label === 'YYYY' ? 2 : 1, textAlign: 'center' }}>
              <SectionLabel>{label}</SectionLabel>
              <GlowInput
                value={val}
                onChange={e => { setter(e.target.value); setFeedback(''); }}
                placeholder={ph}
                type="text"
              />
            </div>
          ))}
        </div>

        {/* Timeline slider */}
        <div style={{ marginBottom: 24, animation: 'slideInRight 0.5s' }}>
          <SectionLabel>TIMELINE CALIBRATION — {sliderYear}</SectionLabel>
          <input
            type="range" min="0" max="100"
            value={slider}
            onChange={e => setSlider(parseInt(e.target.value))}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontFamily: mono, fontSize: 9, color: '#666' }}>
              {direction === 'PAST' ? '1800' : '2026'}
            </span>
            <span style={{ fontFamily: mono, fontSize: 9, color: '#ff6b6b' }}>
              {sliderYear}
            </span>
            <span style={{ fontFamily: mono, fontSize: 9, color: '#666' }}>
              {direction === 'PAST' ? '2025' : '2300'}
            </span>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <NeonButton text="SET COORDINATES" onClick={handleSubmit} id="btn-set-time" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <FeedbackToast message={feedback} />
        </div>
      </div>
    </ScreenWrapper>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCREEN 6 — TIME ERROR
   Context-aware + suggested valid range
   ═══════════════════════════════════════════════════════════ */
function ScreenTimeError({ onRetry, errorMsg }) {
  return (
    <ScreenWrapper>
      <div style={{ textAlign: 'center', animation: 'glitchShift 0.1s linear 3' }}>
        <div style={{
          fontFamily: display, fontSize: 'clamp(1.1rem, 3vw, 1.6rem)',
          color: '#ff0000', fontWeight: 900,
          animation: 'flicker 0.15s linear infinite',
          textShadow: '0 0 20px #ff0000',
          marginBottom: 8,
        }}>
          TEMPORAL PARADOX DETECTED
        </div>
        <div style={{
          fontFamily: mono, fontSize: '0.9rem', color: '#ff6b6b',
          animation: 'blink 0.8s step-end infinite',
          marginBottom: 20,
        }}>
          CRITICAL ANOMALY
        </div>

        <div style={{
          maxWidth: 480, margin: '0 auto',
          border: '1px solid #660000', background: 'rgba(30,0,0,0.6)',
          padding: 20, borderRadius: 4,
        }}>
          <div style={{ fontFamily: mono, fontSize: '0.75rem', color: '#ccc', lineHeight: 1.8, marginBottom: 12 }}>
            {errorMsg}
          </div>
          <div style={{ fontFamily: mono, fontSize: '0.7rem', color: '#888' }}>
            ▸ SUGGESTED RANGE: Day 1–31 / Month 1–12 / Year 1800–2300<br />
            ▸ FORMAT: DD / MM / YYYY<br />
            ▸ EXAMPLE: 06 / 11 / 1983 (Hawkins Event)
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <NeonButton text="RECALIBRATE" onClick={onRetry} id="btn-time-retry" />
        </div>
      </div>
    </ScreenWrapper>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCREEN 7 — DURATION SELECTION
   Days + Hours with rotating dial visual
   ═══════════════════════════════════════════════════════════ */
function ScreenDuration({ onNext }) {
  const [days, setDays] = useState('');
  const [hours, setHours] = useState('');
  const [feedback, setFeedback] = useState('');

  const totalHours = (parseInt(days) || 0) * 24 + (parseInt(hours) || 0);
  const dialRotation = Math.min(totalHours * 2, 360);

  const handleSubmit = () => {
    const d = parseInt(days) || 0;
    const h = parseInt(hours) || 0;
    if (d === 0 && h === 0) return;
    audioEngine.playSuccess();
    setFeedback('Duration Set');
    setTimeout(() => {
      audioEngine.playTransition();
      onNext({ days: d, hours: h });
    }, 900);
  };

  return (
    <ScreenWrapper>
      <ScreenTitle title="DURATION OF STAY" subtitle="SPECIFY TEMPORAL RESIDENCE PERIOD" />

      <div style={{ display: 'flex', gap: 30, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: 600 }}>
        {/* Rotating dial */}
        <div style={{ flex: '0 0 140px', animation: 'fadeInScale 0.5s ease' }}>
          <svg width="140" height="140" viewBox="0 0 140 140">
            <defs>
              <filter id="dialGlow"><feGaussianBlur stdDeviation="2" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            {/* Outer ring */}
            <circle cx="70" cy="70" r="62" fill="none" stroke="#330000" strokeWidth="2" strokeDasharray="4,4"
              style={{ animation: 'rotateDialSlow 30s linear infinite' }}
              transform-origin="70 70" />
            {/* Mid ring */}
            <circle cx="70" cy="70" r="50" fill="none" stroke="#660000" strokeWidth="1.5" />
            {/* Progress arc */}
            <circle cx="70" cy="70" r="50" fill="none" stroke="#ff0000" strokeWidth="3"
              strokeDasharray={`${(dialRotation / 360) * 314} 314`}
              strokeLinecap="round"
              transform="rotate(-90 70 70)"
              filter="url(#dialGlow)"
              style={{ transition: 'stroke-dasharray 0.5s ease' }} />
            {/* Inner ring */}
            <circle cx="70" cy="70" r="35" fill="#0a0000" stroke="#440000" strokeWidth="1" />
            {/* Needle */}
            <line x1="70" y1="70" x2="70" y2="28" stroke="#ff0000" strokeWidth="2"
              transform={`rotate(${dialRotation} 70 70)`}
              style={{ transition: 'transform 0.5s ease', transformOrigin: '70px 70px' }}
              filter="url(#dialGlow)" />
            {/* Center dot */}
            <circle cx="70" cy="70" r="4" fill="#ff0000" filter="url(#dialGlow)" />
            {/* Value */}
            <text x="70" y="85" textAnchor="middle" fill="#ff6b6b" fontFamily={mono} fontSize="9">
              {totalHours}H
            </text>
          </svg>
        </div>

        {/* Inputs */}
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
            <div style={{ flex: 1, animation: 'slideInLeft 0.3s ease' }}>
              <SectionLabel>DAYS</SectionLabel>
              <GlowInput
                id="input-days"
                type="number"
                value={days}
                onChange={e => { setDays(e.target.value); setFeedback(''); }}
                placeholder="0"
              />
            </div>
            <div style={{ flex: 1, animation: 'slideInRight 0.4s ease' }}>
              <SectionLabel>HOURS</SectionLabel>
              <GlowInput
                id="input-hours"
                type="number"
                value={hours}
                onChange={e => { setHours(e.target.value); setFeedback(''); }}
                placeholder="0"
              />
            </div>
          </div>

          <div style={{
            fontFamily: mono, fontSize: '0.7rem', color: '#666', marginBottom: 20,
            textAlign: 'center',
          }}>
            TOTAL: {totalHours} HOURS ({(parseInt(days) || 0)} DAYS + {(parseInt(hours) || 0)} HRS)
          </div>

          <div style={{ textAlign: 'center' }}>
            <NeonButton text="CONFIRM DURATION" onClick={handleSubmit} id="btn-duration" disabled={totalHours === 0} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <FeedbackToast message={feedback} />
          </div>
        </div>
      </div>
    </ScreenWrapper>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCREEN 8 — RETURN LOCATION
   With "Same as origin" smart autofill
   ═══════════════════════════════════════════════════════════ */
function ScreenReturnLocation({ originDest, onNext }) {
  const [loc, setLoc] = useState('');
  const [sameAsOrigin, setSameAsOrigin] = useState(false);
  const [feedback, setFeedback] = useState('');

  const handleSameToggle = (checked) => {
    setSameAsOrigin(checked);
    if (checked) {
      setLoc(originDest);
      audioEngine.playSuccess();
    } else {
      setLoc('');
    }
    setFeedback('');
  };

  const handleSubmit = () => {
    const finalLoc = sameAsOrigin ? originDest : loc.trim();
    if (!finalLoc) return;
    audioEngine.playSuccess();
    setFeedback('Return Coordinates Stored');
    setTimeout(() => {
      audioEngine.playTransition();
      onNext(finalLoc);
    }, 900);
  };

  return (
    <ScreenWrapper>
      <ScreenTitle title="RETURN COORDINATES" subtitle="DEFINE YOUR EXTRACTION POINT" />

      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ marginBottom: 16, animation: 'slideInLeft 0.3s ease' }}>
          <SectionLabel>RETURN DESTINATION</SectionLabel>
          <GlowInput
            id="input-return-loc"
            value={sameAsOrigin ? originDest : loc}
            onChange={e => setLoc(e.target.value)}
            placeholder="Enter return location..."
            disabled={sameAsOrigin}
          />
        </div>

        <label style={{
          display: 'flex', alignItems: 'center', gap: 10,
          fontFamily: mono, fontSize: '0.75rem', color: '#aaa',
          cursor: 'pointer', padding: '8px 0',
          marginBottom: 20,
          animation: 'slideInRight 0.4s ease',
        }}>
          <input
            type="checkbox"
            checked={sameAsOrigin}
            onChange={e => handleSameToggle(e.target.checked)}
          />
          <span>SAME AS ORIGIN — <span style={{ color: '#ff6b6b' }}>{originDest}</span></span>
        </label>

        <div style={{ textAlign: 'center' }}>
          <NeonButton text="STORE COORDINATES" onClick={handleSubmit} id="btn-return-loc"
            disabled={!sameAsOrigin && !loc.trim()} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <FeedbackToast message={feedback} />
        </div>
      </div>
    </ScreenWrapper>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCREEN 9 — SUMMARY
   All data displayed, editable via clickable sections
   ═══════════════════════════════════════════════════════════ */
function ScreenSummary({ data, onEdit, onConfirm }) {
  const MONTHS_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const dateStr = data.day && data.month && data.year
    ? `${MONTHS_SHORT[(data.month - 1) % 12]} ${data.day}, ${data.year}`
    : 'NOT SET';

  const fields = [
    { label: 'AGENT NAME', value: data.name, step: 2 },
    { label: 'EMAIL', value: data.email, step: 2 },
    { label: 'DESTINATION', value: data.destination, step: 4 },
    { label: 'TIME TARGET', value: `${dateStr} [${data.direction}]`, step: 5 },
    { label: 'DURATION', value: `${data.days} Days / ${data.hours} Hours`, step: 7 },
    { label: 'RETURN POINT', value: data.returnLoc, step: 8 },
  ];

  return (
    <ScreenWrapper>
      <ScreenTitle title="MISSION DOSSIER" subtitle="REVIEW ALL PARAMETERS — CLICK TO EDIT" />

      <div style={{
        width: '100%', maxWidth: 600,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: 10,
      }}>
        {fields.map((f, i) => (
          <div
            key={f.label}
            onClick={() => onEdit(f.step)}
            style={{
              border: '1px solid #330000',
              background: 'rgba(10,0,0,0.6)',
              padding: '14px 16px',
              cursor: 'pointer',
              borderRadius: 2,
              transition: 'all 0.2s',
              animation: `fadeIn ${0.2 + i * 0.1}s ease`,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#cc0000';
              e.currentTarget.style.boxShadow = '0 0 12px rgba(255,0,0,0.15)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#330000';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{
              fontFamily: mono, fontSize: 9, color: '#ff6b6b',
              letterSpacing: 2, marginBottom: 6,
              display: 'flex', justifyContent: 'space-between',
            }}>
              {f.label}
              <span style={{ color: '#555', fontSize: 8 }}>✎ EDIT</span>
            </div>
            <div style={{ fontFamily: mono, fontSize: '0.85rem', color: '#fff', letterSpacing: '0.05em' }}>
              {f.value || '—'}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 28 }}>
        <NeonButton text="CONFIRM ALL PARAMETERS" onClick={() => { audioEngine.playTransition(); onConfirm(); }} id="btn-confirm-all" />
      </div>
    </ScreenWrapper>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCREEN 10 — CONFIRMATION + COUNTDOWN
   Dramatic red glow + 5-second ticking countdown
   ═══════════════════════════════════════════════════════════ */
function ScreenConfirmation({ onReady }) {
  const [count, setCount] = useState(5);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    audioEngine.playTransition();
  }, []);

  useEffect(() => {
    if (count > 0) {
      const t = setTimeout(() => setCount(c => c - 1), 1000);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => onReadyRef.current(), 600);
      return () => clearTimeout(t);
    }
  }, [count]);

  return (
    <div style={{
      minHeight: 500,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 50%, rgba(60,0,0,0.5) 0%, #0a0000 60%, #000 100%)',
      boxShadow: 'inset 0 0 150px rgba(255,0,0,0.15)',
      position: 'relative',
    }}>
      {/* Pulsing ring */}
      <div style={{
        position: 'absolute',
        width: 280, height: 280, borderRadius: '50%',
        border: '2px solid rgba(255,0,0,0.3)',
        animation: 'pulseGlow 1s infinite',
      }} />

      <div style={{
        fontFamily: display,
        fontSize: count > 0 ? 'clamp(4rem, 15vw, 8rem)' : 'clamp(2rem, 6vw, 3.5rem)',
        fontWeight: 900,
        color: '#ff0000',
        zIndex: 2,
        animation: count > 0 ? 'countdownPulse 1s infinite' : 'fadeInScale 0.5s ease',
        textShadow: '0 0 40px #ff0000, 0 0 80px rgba(255,0,0,0.5)',
        transition: 'font-size 0.3s',
      }}>
        {count > 0 ? count : 'JUMP'}
      </div>

      <div style={{
        fontFamily: mono, fontSize: '0.9rem', color: '#ff6b6b',
        marginTop: 30, zIndex: 2, letterSpacing: '0.2em',
        animation: 'blink 0.6s step-end infinite',
      }}>
        {count > 0 ? 'PREPARING TIME JUMP...' : 'INITIATING WARP SEQUENCE'}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCREEN 11 — TIME TRAVEL ANIMATION
   Full immersive warp + glitch + upside-down transition
   ═══════════════════════════════════════════════════════════ */
function ScreenAnimation({ onComplete }) {
  const [phase, setPhase] = useState(0); // 0=warp, 1=flash, 2=upsideDown
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    audioEngine.playWarp();
    const timers = [
      setTimeout(() => setPhase(1), 1500),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => onCompleteRef.current(), 4000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div style={{
      minHeight: 500,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#000',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Warp vortex */}
      <div style={{
        position: 'absolute', inset: 0,
        animation: phase === 0 ? 'warpZoom 2s ease-in forwards' : 'none',
        opacity: phase >= 1 ? 0 : 1,
        transition: 'opacity 0.3s',
      }}>
        <VortexSVG />
      </div>

      {/* White flash */}
      <div style={{
        position: 'absolute', inset: 0,
        background: '#fff',
        opacity: phase === 1 ? 0.9 : 0,
        transition: 'opacity 0.3s',
        zIndex: 20,
      }} />

      {/* Upside down phase */}
      {phase >= 2 && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, #0a0a0a, #0a0020, #0a0a0a)',
          animation: 'fadeIn 1s ease',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Floating ash/spores */}
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              width: 2 + Math.random() * 3,
              height: 2 + Math.random() * 3,
              borderRadius: '50%',
              background: '#6666ff',
              opacity: 0.3 + Math.random() * 0.4,
              animation: `floatUp ${3 + Math.random() * 4}s linear ${Math.random() * 2}s infinite`,
            }} />
          ))}
        </div>
      )}

      {/* Glitch scanlines */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 25,
        background: 'repeating-linear-gradient(0deg, rgba(255,0,0,0.06) 0px, transparent 2px, transparent 4px)',
        animation: phase >= 2 ? 'flickerSubtle 0.1s infinite' : 'none',
        pointerEvents: 'none',
      }} />

      {/* Text */}
      <div style={{
        zIndex: 30, textAlign: 'center',
        animation: phase >= 2 ? 'glitchShift 0.15s linear infinite' : 'none',
      }}>
        <div style={{
          fontFamily: display,
          fontSize: 'clamp(1.2rem, 4vw, 2.5rem)',
          fontWeight: 900,
          color: phase >= 2 ? '#8888ff' : '#ff0000',
          letterSpacing: '0.15em',
          textShadow: phase >= 2
            ? '0 0 30px rgba(100,100,255,0.6)'
            : '0 0 30px rgba(255,0,0,0.6)',
          transform: phase >= 2 ? 'scaleY(-1)' : 'none',
          transition: 'color 0.5s',
        }}>
          {phase >= 2 ? 'THE UPSIDE DOWN' : 'WARPING'}
        </div>
        {phase >= 2 && (
          <div style={{
            fontFamily: mono, fontSize: '0.8rem', color: '#6666aa',
            marginTop: 16, letterSpacing: '0.2em',
            animation: 'fadeIn 0.5s ease',
          }}>
            TRAVERSING DIMENSIONAL BOUNDARY...
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCREEN 12 — ARRIVAL
   Destination + time reached + atmospheric animation
   ═══════════════════════════════════════════════════════════ */
function ScreenArrival({ data, onRestart }) {
  const MONTHS_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const dateStr = data.day && data.month && data.year
    ? `${MONTHS_SHORT[(data.month - 1) % 12]} ${data.day}, ${data.year}`
    : 'UNKNOWN';

  useEffect(() => {
    const t = setTimeout(() => audioEngine.playSuccess(), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      minHeight: 500,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 60%, #002211 0%, #001a0f 30%, #000 80%)',
      position: 'relative',
      padding: 40,
    }}>
      <BurstParticles color="#00ff88" />

      {/* Atmospheric particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: Math.random() * 100 + '%',
          top: Math.random() * 100 + '%',
          width: 2, height: 2, borderRadius: '50%',
          background: '#00ff88', opacity: 0.2 + Math.random() * 0.3,
          animation: `floatUp ${5 + Math.random() * 5}s linear ${Math.random() * 3}s infinite`,
        }} />
      ))}

      <div style={{
        fontFamily: display,
        fontSize: 'clamp(1.5rem, 5vw, 2.8rem)',
        fontWeight: 900, color: '#00ff88',
        letterSpacing: '0.2em', zIndex: 5,
        textShadow: '0 0 30px rgba(0,255,136,0.5)',
        animation: 'arrivalGlow 3s ease-in-out infinite',
        marginBottom: 24,
      }}>
        YOU HAVE ARRIVED
      </div>

      <div style={{ zIndex: 5, textAlign: 'center' }}>
        <div style={{ fontFamily: mono, fontSize: '0.8rem', color: '#88ddaa', marginBottom: 6, letterSpacing: '0.15em' }}>
          DESTINATION
        </div>
        <div style={{
          fontFamily: display, fontSize: 'clamp(1rem, 3vw, 1.5rem)',
          color: '#fff', fontWeight: 700, marginBottom: 20, letterSpacing: '0.1em',
        }}>
          {data.destination}
        </div>

        <div style={{ fontFamily: mono, fontSize: '0.8rem', color: '#88ddaa', marginBottom: 6, letterSpacing: '0.15em' }}>
          TIME
        </div>
        <div style={{
          fontFamily: display, fontSize: 'clamp(0.9rem, 2.5vw, 1.3rem)',
          color: '#fff', fontWeight: 700, marginBottom: 30, letterSpacing: '0.1em',
        }}>
          {dateStr} [{data.direction}]
        </div>
      </div>

      <div style={{ zIndex: 5, marginTop: 10 }}>
        <NeonButton text="INITIATE NEW JUMP" onClick={() => {
          audioEngine.playTransition();
          onRestart();
        }} id="btn-new-jump" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   APP — Main Controller
   Screen state machine + audio + overlays
   ═══════════════════════════════════════════════════════════ */
export default function App() {
  const [screen, setScreen] = useState(1);

  // Master mission data
  const [data, setData] = useState({
    name: '', email: '',
    destination: '',
    day: 0, month: 0, year: 0, direction: 'PAST',
    days: 0, hours: 0,
    returnLoc: '',
  });

  // Error messages for error screens
  const [identityErrors, setIdentityErrors] = useState({ name: '', email: '', valName: '', valEmail: '' });
  const [timeError, setTimeError] = useState('');

  const updateData = useCallback((patch) => {
    setData(d => ({ ...d, ...patch }));
  }, []);

  // Initialize audio on first interaction
  useEffect(() => {
    const initAudio = () => {
      audioEngine.init();
      audioEngine.startAmbient();
    };
    document.addEventListener('click', initAudio, { once: true });
    return () => {
      document.removeEventListener('click', initAudio);
      audioEngine.destroy();
    };
  }, []);

  // Floating particles
  useParticles(35);

  // Map screen number to step number for progress bar
  const stepMap = { 1: 0, 2: 1, 3: 1, 4: 2, 5: 3, 6: 3, 7: 4, 8: 5, 9: 6, 10: 7, 11: 8, 12: 8 };
  const currentStep = stepMap[screen] ?? 0;

  const goToScreen = useCallback((s) => setScreen(s), []);

  const resetAll = useCallback(() => {
    setData({
      name: '', email: '',
      destination: '',
      day: 0, month: 0, year: 0, direction: 'PAST',
      days: 0, hours: 0,
      returnLoc: '',
    });
    setScreen(1);
  }, []);

  const renderScreen = () => {
    switch (screen) {
      case 1:
        return <ScreenIntro onNext={() => goToScreen(2)} />;
      case 2:
        return (
          <ScreenIdentity
            onNext={(d) => { updateData(d); goToScreen(4); }}
            onError={(vName, vEmail, eName, eEmail) => {
              setIdentityErrors({ name: eName, email: eEmail, valName: vName, valEmail: vEmail });
              goToScreen(3);
            }}
          />
        );
      case 3:
        return (
          <ScreenIdentityError
            onRetry={() => goToScreen(2)}
            errorName={identityErrors.name}
            errorEmail={identityErrors.email}
            valName={identityErrors.valName}
            valEmail={identityErrors.valEmail}
          />
        );
      case 4:
        return <ScreenDestination onNext={(dest) => { updateData({ destination: dest }); goToScreen(5); }} />;
      case 5:
        return (
          <ScreenTime
            onNext={(d) => { updateData(d); goToScreen(7); }}
            onError={(msg) => { setTimeError(msg); goToScreen(6); }}
          />
        );
      case 6:
        return <ScreenTimeError onRetry={() => goToScreen(5)} errorMsg={timeError} />;
      case 7:
        return <ScreenDuration onNext={(d) => { updateData(d); goToScreen(8); }} />;
      case 8:
        return <ScreenReturnLocation originDest={data.destination} onNext={(loc) => { updateData({ returnLoc: loc }); goToScreen(9); }} />;
      case 9:
        return <ScreenSummary data={data} onEdit={(step) => goToScreen(step)} onConfirm={() => goToScreen(10)} />;
      case 10:
        return <ScreenConfirmation onReady={() => goToScreen(11)} />;
      case 11:
        return <ScreenAnimation onComplete={() => goToScreen(12)} />;
      case 12:
        return <ScreenArrival data={data} onRestart={resetAll} />;
      default:
        return <ScreenIntro onNext={() => goToScreen(2)} />;
    }
  };

  const showChrome = screen !== 1 && screen !== 11;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: 'url(/bg.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      color: '#fff',
      position: 'relative',
      fontFamily: mono,
    }}>
      {/* Dark overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1,
        background: 'rgba(0,0,0,0.55)',
        pointerEvents: 'none',
      }} />

      {/* Scanline overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'repeating-linear-gradient(0deg, rgba(255,10,10,0.03) 0px, rgba(255,10,10,0.03) 1px, transparent 1px, transparent 3px)',
        pointerEvents: 'none',
      }} />

      {/* System Status Overlay (Screen 13 requirement) */}
      <SystemStatusOverlay data={data} currentStep={screen} />

      {/* Page content */}
      <div style={{ position: 'relative', zIndex: 10 }}>

        {/* Title header */}
        {showChrome && (
          <div style={{ textAlign: 'center', padding: '24px 16px 4px' }}>
            <img src="/11.png" alt="ChronoGate"
              style={{
                width: 'min(70%, 800px)', display: 'inline-block',
                animation: 'flickerSubtle 4s infinite',
              }} />
            <div style={{
              fontFamily: mono, fontSize: 'clamp(0.65rem, 1.5vw, 0.8rem)',
              color: '#ff4444', letterSpacing: '0.2em',
              textShadow: '0 0 8px rgba(255,0,0,0.4)', marginTop: 6,
            }}>
              CHRONO-NAVIGATE THE UPSIDE DOWN — EXPLORE PAST &amp; FUTURE
            </div>
          </div>
        )}

        {/* Main panel */}
        <div style={{
          width: showChrome ? 'min(92%, 1020px)' : '100%',
          maxWidth: showChrome ? 1020 : '100%',
          margin: showChrome ? '16px auto 50px' : '0 auto',
          background: showChrome ? 'rgba(3,0,0,0.88)' : 'transparent',
          border: showChrome ? '2px solid #440000' : 'none',
          borderRadius: showChrome ? 6 : 0,
          overflow: 'hidden',
          boxShadow: showChrome ? '0 0 40px rgba(255,0,0,0.08), 0 4px 30px rgba(0,0,0,0.5)' : 'none',
        }}>
          {showChrome && <NavBar />}
          {showChrome && screen >= 2 && screen <= 9 && (
            <ProgressBar currentStep={currentStep} totalSteps={8} />
          )}
          {renderScreen()}
        </div>
      </div>
    </div>
  );
}
