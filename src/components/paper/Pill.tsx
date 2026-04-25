import { ReactNode } from "react";

type Kind = "default" | "accent" | "good" | "warn" | "bad";

interface PillProps {
  children: ReactNode;
  kind?: Kind;
  className?: string;
  onClick?: () => void;
  as?: "span" | "button";
  title?: string;
}

const KIND_CLASSES: Record<Kind, string> = {
  default: "bg-paper-2 text-ink-2 border-rule",
  accent: "bg-accent-soft text-[color:var(--accent)] border-[color:var(--accent)]/30",
  good: "bg-good-soft text-[color:var(--good)] border-[color:var(--good)]/25",
  warn: "bg-warn-soft text-[color:var(--warn-ink)] border-[color:var(--warn)]/30",
  bad: "bg-bad-soft text-[color:var(--bad)] border-[color:var(--bad)]/25",
};

export default function Pill({ children, kind = "default", className = "", onClick, as, title }: PillProps) {
  const Tag = (as ?? (onClick ? "button" : "span")) as "span" | "button";
  return (
    <Tag
      onClick={onClick}
      title={title}
      className={`inline-flex items-center whitespace-nowrap border rounded-full px-2.5 py-0.5 text-[12px] font-medium leading-snug ${KIND_CLASSES[kind]} ${onClick ? "cursor-pointer hover:opacity-90" : ""} ${className}`}
    >
      {children}
    </Tag>
  );
}
