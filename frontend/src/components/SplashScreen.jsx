import { useState, useEffect } from 'react';
import './SplashScreen.css';

const HOLD_MS = 2800;
const FADE_MS = 500;
const BUFFER  = 60;

const LETTER_BASE_DELAY = 0.30;
const LETTER_STAGGER    = 0.055;

/* ── Shared logo SVG — same #febd69 fill used everywhere in the app ── */
export function TravelloopLogo({ size = 48, className = '' }) {
  return (
    <svg
      width={size}
      height={Math.round(size * 46 / 48)}
      viewBox="0 0 48 46"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <path
        fill="#febd69"
        d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937
           a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788
           l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237
           c-.92 0-1.456-1.04-.92-1.788L10.013.474
           c.214-.297.556-.474.92-.474h28.894
           c.92 0 1.456 1.04.92 1.788l-7.48 10.471
           c-1.07 1.498 0 3.579 1.842 3.579h11.377
           c.943 0 1.473 1.088.89 1.83L25.947 44.94z"
      />
    </svg>
  );
}

/* Renders a word as individually-animated letters */
function AnimatedWord({ text, className, startIndex = 0 }) {
  return (
    <span className={className}>
      {text.split('').map((char, i) => (
        <span
          key={i}
          className="splash__letter"
          style={{ animationDelay: `${LETTER_BASE_DELAY + (startIndex + i) * LETTER_STAGGER}s` }}
        >
          {char}
        </span>
      ))}
    </span>
  );
}

/* Amazon smile-arc underline — orange gradient */
function SmileArc() {
  return (
    <svg
      className="splash__arc"
      viewBox="0 0 280 6"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#e47911" />
          <stop offset="50%"  stopColor="#febd69" />
          <stop offset="100%" stopColor="#f0c14b" stopOpacity="0.7" />
        </linearGradient>
      </defs>
      <path
        d="M 4 2 Q 140 8 276 2"
        stroke="url(#arcGrad)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export default function SplashScreen({ onFinish }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const holdTimer = window.setTimeout(() => setExiting(true), HOLD_MS);
    const doneTimer = window.setTimeout(onFinish, HOLD_MS + FADE_MS + BUFFER);
    return () => {
      window.clearTimeout(holdTimer);
      window.clearTimeout(doneTimer);
    };
  }, [onFinish]);

  return (
    <div
      className={`splash${exiting ? ' splash--exit' : ''}`}
      role="status"
      aria-label="Loading Traveloop"
      aria-busy={!exiting}
    >
      {/* Logo icon — #febd69 Amazon yellow, matches sidebar & auth */}
      <div className="splash__icon-wrap">
        <TravelloopLogo size={80} className="splash__icon" />
      </div>

      {/* Wordmark */}
      <div className="splash__wordmark" aria-hidden="true">
        <AnimatedWord text="Travel" className="splash__travel" startIndex={0} />
        <AnimatedWord text="oop"    className="splash__oop"    startIndex={6} />
      </div>

      {/* Amazon-style orange smile arc */}
      <div className="splash__arc-wrap" aria-hidden="true">
        <SmileArc />
      </div>

      {/* Tagline */}
      <p className="splash__tagline">Plan smarter. Travel better.</p>

      {/* Loading dots — Amazon orange */}
      <div className="splash__dots" aria-hidden="true">
        <span className="splash__dot" />
        <span className="splash__dot" />
        <span className="splash__dot" />
      </div>
    </div>
  );
}
