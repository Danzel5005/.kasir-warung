import { useState, useEffect } from "react";

export function SnakeLoader({ visible, minDuration = 1200, size = 24, color = "#fff" }) {
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

  const strokeWidth = Math.max(2, size / 12);
  const radius = (size - strokeWidth) / 2;

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
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeOpacity="0.2"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={radius * Math.PI * 0.65}
          strokeDashoffset={radius * Math.PI * 0.15}
          style={{
            animation: "spin 0.8s linear infinite",
            transformOrigin: "center",
            transformBox: "fill-box",
          }}
        />
      </svg>
    </div>
  );
}

export default SnakeLoader;