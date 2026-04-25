import { ReactNode } from "react";
import Link from "next/link";

interface TopBarProps {
  /** Right-aligned content (typically user email + sign out). */
  right?: ReactNode;
  className?: string;
}

/** Page-level top bar with the PEP Training wordmark linking back to /learn. */
export default function TopBar({ right, className = "" }: TopBarProps) {
  return (
    <div className={`flex items-center justify-between gap-3 border-b border-rule pb-3 mb-4 ${className}`}>
      <Link
        href="/learn"
        className="text-[18px] font-semibold tracking-tight whitespace-nowrap hover:opacity-80 transition-opacity"
        style={{ color: "var(--accent)" }}
      >
        PEP Training
      </Link>
      {right && <div className="text-[12px] text-ink-2">{right}</div>}
    </div>
  );
}
