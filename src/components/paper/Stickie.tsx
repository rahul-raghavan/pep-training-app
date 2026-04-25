import { ReactNode } from "react";

interface StickieProps {
  children: ReactNode;
  /** Kept for backwards compatibility — ignored in clean aesthetic. */
  rotate?: number;
  className?: string;
}

/** Quiet inline note — amber tinted info callout. */
export default function Stickie({ children, className = "" }: StickieProps) {
  return <div className={`stickie ${className}`}>{children}</div>;
}
