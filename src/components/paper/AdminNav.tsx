'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AdminNavProps {
  rightSlot?: React.ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  /** Match by prefix — Teachers area covers /admin/users, /admin/cohort, /admin/voice-perf. */
  matchPrefixes: string[];
}

const ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', matchPrefixes: ['/admin/dashboard'] },
  {
    label: 'Teachers',
    href: '/admin/users',
    matchPrefixes: ['/admin/users', '/admin/cohort', '/admin/voice-perf'],
  },
  {
    label: 'Courses',
    href: '/admin/programs',
    matchPrefixes: ['/admin/programs', '/admin/voice-audit'],
  },
];

/**
 * Top-level admin nav — sits below the PEP Training wordmark.
 * Highlights the active section based on the current pathname.
 */
export default function AdminNav({ rightSlot }: AdminNavProps) {
  const pathname = usePathname() ?? '';

  return (
    <div className="flex items-center justify-between gap-3 border-b border-rule pb-2 mb-4 flex-wrap">
      <nav className="flex items-center gap-1">
        {ITEMS.map(item => {
          const active = item.matchPrefixes.some(p => pathname.startsWith(p));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`text-[14px] font-medium px-3 py-1.5 rounded-md transition-colors ${
                active
                  ? 'bg-ink text-paper'
                  : 'text-ink-2 hover:text-ink hover:bg-paper-2'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      {rightSlot && <div className="flex items-center gap-2">{rightSlot}</div>}
    </div>
  );
}
