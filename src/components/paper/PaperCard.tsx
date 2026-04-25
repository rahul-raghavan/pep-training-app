import { ReactNode, CSSProperties } from "react";

interface PaperCardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Slightly stronger border for "framed" cards. */
  framed?: boolean;
  as?: "div" | "section" | "article";
}

export default function PaperCard({
  children,
  className = "",
  style,
  framed = true,
  as = "div",
}: PaperCardProps) {
  const Tag = as as "div";
  const base = framed
    ? "bg-paper border border-rule rounded-lg p-5 shadow-sm"
    : "bg-paper border border-rule rounded-lg p-4";
  return (
    <Tag className={`${base} ${className}`} style={style}>
      {children}
    </Tag>
  );
}
