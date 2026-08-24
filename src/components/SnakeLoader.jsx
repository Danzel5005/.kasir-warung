import { useState, useEffect } from "react";

// SnakeLoader — minimal "snake" loading indicator.
// Shows a smooth animated snake that scales in/out.
// Usage: <SnakeLoader visible={isLoading} minDuration={300} />
// - visible: controls visibility
// - minDuration: minimum ms to show loader (default 300ms) even if visible becomes false quickly

export function SnakeLoader({ visible, minDuration = 300, size = 40, color = "#1a7f37" }) {
  const [show, setShow] = useState(false);
  const [startTime, setStartTime] = useState(0);

  useEffect(() => {
    if (visible) {
      setStartTime(Date.now());
      setShow(true);
    } else if (show) {
      const elapsed = Date.now() - startTime;
      const remaining = minDuration - elapsed;
      if (remaining <= 0) {
        setShow(false);
      } else {
        setTimeout(() => setShow(false), remaining);
      }
    }
  }, [visible, show, startTime, minDuration]);

  if (!show) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
      }}
      role="status"
      aria-label="Memuat..."
    >
      <style>{`
        @keyframes snake-move {
          0% { transform: translateX(-100%) rotate(-45deg); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateX(200%) rotate(45deg); opacity: 0; }
        }
        @keyframes snake-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
      `}</style>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        style={{ animation: "snake-pulse 1.2s ease-in-out infinite" }}
      >
        <defs>
          <linearGradient id="snake-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0.9" />
            <stop offset="50%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.7" />
          </linearGradient>
        </defs>
        {/* Snake body segments */}
        <g stroke="url(#snake-gradient)" strokeWidth="4" strokeLinecap="round" fill="none">
          <path d="M 4 20 Q 14 10 20 20 Q 26 30 36 20" opacity="0.3" />
        </g>
        {/* Moving head */}
        <g transform="translate(-10, 0)">
          <path
            d="M 0 20 Q 10 10 20 20 Q 30 30 40 20"
            stroke="url(#snake-gradient)"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
            style={{ animation: "snake-move 1.4s ease-in-out infinite" }}
          />
        </g>
        {/* Snake head dot */}
        <circle
          cx="8"
          cy="20"
          r="4"
          fill={color}
          style={{ animation: "snake-move 1.4s ease-in-out infinite" }}
        />
      </svg>
    </div>
  );
}

export default SnakeLoader;