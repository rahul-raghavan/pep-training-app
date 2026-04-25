interface RingProps {
  pct: number;
  size?: number;
  showLabel?: boolean;
  className?: string;
}

export default function Ring({ pct, size = 44, showLabel = true, className = "" }: RingProps) {
  const safe = Math.max(0, Math.min(100, Math.round(pct)));
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - safe / 100);
  const isDone = safe >= 100;

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label={`${safe}% complete`}
    >
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--rule)" strokeWidth={3} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={isDone ? "var(--good)" : "var(--accent)"}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={off}
        style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
      />
      {showLabel && (
        <text
          x={size / 2}
          y={size / 2 + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="var(--font-geist-sans), system-ui, sans-serif"
          fontSize={Math.max(10, Math.round(size * 0.28))}
          fontWeight={600}
          fill="var(--ink)"
        >
          {safe}
        </text>
      )}
    </svg>
  );
}
