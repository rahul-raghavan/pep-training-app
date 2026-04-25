import { ReactNode } from "react";

interface PageShellProps {
  children: ReactNode;
  /** Max width of the inner content. Defaults to a comfortable reading width. */
  maxWidth?: number | string;
  /** Removes the standard top/bottom padding when true (use when child controls it). */
  bare?: boolean;
  className?: string;
}

/**
 * The outer paper-textured page wrapper. Sits inside the body so multiple PageShells
 * compose cleanly (e.g. nav + content). Always full-height to keep the warm gradient
 * visible even on short pages.
 */
export default function PageShell({ children, maxWidth = 1200, bare = false, className = "" }: PageShellProps) {
  return (
    <div className={`min-h-screen ${bare ? "" : "py-7 px-5 md:px-8"} ${className}`}>
      <div className="mx-auto w-full" style={{ maxWidth }}>
        {children}
      </div>
    </div>
  );
}
