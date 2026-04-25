'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface SubNavItem {
  label: string;
  href: string;
  /** Match exactly (default) or by prefix. */
  match?: 'exact' | 'prefix';
  badge?: string | number;
}

interface AdminSubNavProps {
  items: SubNavItem[];
  className?: string;
}

/**
 * Sub-tab strip rendered below the main AdminNav. Used by Teachers and Courses
 * areas to switch between views (All teachers / Cohort / Voice perf, etc.).
 */
export default function AdminSubNav({ items, className = '' }: AdminSubNavProps) {
  const pathname = usePathname() ?? '';

  return (
    <div className={`flex items-center gap-1 border-b border-rule mb-4 -mt-2 flex-wrap ${className}`}>
      {items.map(item => {
        const active =
          item.match === 'prefix' ? pathname.startsWith(item.href) : pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`text-[13px] font-medium px-3 py-2 -mb-px border-b-2 transition-colors ${
              active
                ? 'border-ink text-ink'
                : 'border-transparent text-ink-3 hover:text-ink hover:border-rule'
            }`}
          >
            {item.label}
            {item.badge !== undefined && (
              <span className="ml-1.5 text-[10px] text-ink-3 font-mono">{item.badge}</span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
