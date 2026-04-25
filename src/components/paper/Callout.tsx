import { ReactNode } from "react";

type Variant = "tip" | "warn" | "good" | "bad";

const VARIANTS: Record<Variant, { border: string; bg: string; ink: string; label: string; symbol: string }> = {
  tip: {
    border: "rgba(234, 88, 12, 0.25)",  // accent terracotta @ 25%
    bg: "var(--accent-soft)",
    ink: "var(--accent)",
    label: "Tip",
    symbol: "ⓘ",
  },
  warn: {
    border: "#fde68a",                   // amber-200
    bg: "var(--warn-soft)",
    ink: "var(--warn-ink)",
    label: "Watch out",
    symbol: "⚠",
  },
  good: {
    border: "#86efac",                   // green-300
    bg: "var(--good-soft)",
    ink: "var(--good)",
    label: "Note",
    symbol: "✓",
  },
  bad: {
    border: "#fecaca",                   // red-200
    bg: "var(--bad-soft)",
    ink: "var(--bad)",
    label: "Heads up",
    symbol: "✕",
  },
};

interface CalloutProps {
  children: ReactNode;
  variant?: Variant;
  label?: string;
}

export default function Callout({ children, variant = "tip", label }: CalloutProps) {
  const v = VARIANTS[variant];
  return (
    <div
      style={{
        margin: "16px 0",
        padding: "12px 16px",
        border: `1px solid ${v.border}`,
        background: v.bg,
        borderRadius: 8,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: v.ink,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          fontWeight: 600,
          marginBottom: 4,
        }}
      >
        {v.symbol} {label ?? v.label}
      </div>
      <div style={{ color: "var(--ink)", lineHeight: 1.6, fontSize: 14 }}>
        {children}
      </div>
    </div>
  );
}
