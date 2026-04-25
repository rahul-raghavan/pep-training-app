import { ReactNode } from "react";

interface ChromeBarProps {
  left: ReactNode;
  right?: ReactNode;
  className?: string;
}

export default function ChromeBar({ left, right, className = "" }: ChromeBarProps) {
  return (
    <div
      className={`flex items-center justify-between gap-3 border-b border-rule pb-2 mb-3 text-[14px] ${className}`}
    >
      <div className="truncate min-w-0 font-medium text-ink">{left}</div>
      {right && (
        <div className="text-[12px] text-ink-2 truncate min-w-0">{right}</div>
      )}
    </div>
  );
}
