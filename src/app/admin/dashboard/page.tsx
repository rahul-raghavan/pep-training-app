'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { PageShell, TopBar, PaperCard, AdminNav, Stickie } from '@/components/paper';

interface DashboardPayload {
  scope: {
    role: 'super_admin' | 'admin' | 'user';
    centerName: string | null;
    centerId: string | null;
    centers: { id: string; slug: string; name: string }[];
    trackNames: string[];
    scopeLocked: boolean;
    isAllCenters: boolean;
  };
  attention: {
    stalledCount: number;
    belowThresholdCount: number;
    unmappedCoursesCount: number;
    pendingScopeUsersCount: number;
  };
  stats: {
    teachers: number;
    courses: number;
    avgProgress: number | null;
    voiceAttempts: number;
  };
  migrationApplied: boolean;
}

interface AttentionItem {
  count: number;
  label: string;
  href: string;
  tone: 'bad' | 'warn' | 'default';
  hint: string;
}

function progressColor(pct: number | null): string {
  if (pct === null) return 'var(--ink-3)';
  if (pct >= 70) return 'var(--good)';
  if (pct >= 40) return 'var(--warn-ink)';
  return 'var(--bad)';
}

export default function AdminDashboard() {
  const { user, loading: authLoading, logout } = useAuth('admin');
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (centerId: string | null) => {
    setLoading(true);
    setError(null);
    try {
      // null / "" → omit the param so the backend uses its default ("all" for super_admin).
      const url = centerId
        ? `/api/admin/dashboard?centerId=${centerId}`
        : '/api/admin/dashboard';
      const res = await fetch(url);
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        setError(e.error || 'Failed to load');
        return;
      }
      setData(await res.json());
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) load(null);
  }, [authLoading, user, load]);

  if (authLoading || loading || !data) {
    return (
      <PageShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-rule border-t-ink rounded-full animate-spin" />
        </div>
      </PageShell>
    );
  }

  const firstName = (user?.name ?? user?.email ?? '').split(/[ @]/)[0] || 'there';

  const scopeLine =
    data.scope.role === 'super_admin'
      ? data.scope.isAllCenters
        ? 'Super admin · all centers'
        : `Super admin · ${data.scope.centerName ?? 'no center'}`
      : data.scope.centerName
      ? `Admin of ${data.scope.centerName}${
          data.scope.trackNames.length > 0 ? ` · ${data.scope.trackNames.join(', ')}` : ''
        }`
      : 'Admin';

  // Build the attention items
  const attentionItems: AttentionItem[] = [];
  if (data.attention.stalledCount > 0) {
    attentionItems.push({
      count: data.attention.stalledCount,
      label: `teacher${data.attention.stalledCount === 1 ? '' : 's'} stalled`,
      hint: 'no progress, inactive 14+ days',
      href: '/admin/cohort',
      tone: 'bad',
    });
  }
  if (data.attention.belowThresholdCount > 0) {
    attentionItems.push({
      count: data.attention.belowThresholdCount,
      label: `below voice threshold`,
      hint: 'avg < 3/5 over recent attempts',
      href: '/admin/voice-perf',
      tone: 'warn',
    });
  }
  if (data.attention.unmappedCoursesCount > 0 && data.scope.role === 'super_admin') {
    attentionItems.push({
      count: data.attention.unmappedCoursesCount,
      label: `course${data.attention.unmappedCoursesCount === 1 ? '' : 's'} not mapped to a track`,
      hint: 'won\u2019t appear in cohort or assignments',
      href: '/admin/programs',
      tone: 'warn',
    });
  }
  if (data.attention.pendingScopeUsersCount > 0 && data.scope.role === 'super_admin') {
    attentionItems.push({
      count: data.attention.pendingScopeUsersCount,
      label: `teacher${data.attention.pendingScopeUsersCount === 1 ? '' : 's'} missing a track`,
      hint: 'in your center but no program track set',
      href: '/admin/users',
      tone: 'warn',
    });
  }

  return (
    <PageShell maxWidth={1200}>
      <TopBar
        right={
          <span className="flex items-center gap-3">
            <span>{user?.email ?? ''}</span>
            <button onClick={logout} className="hover:text-ink underline underline-offset-2">
              Sign out
            </button>
          </span>
        }
      />

      <AdminNav
        rightSlot={
          data.scope.role === 'super_admin' && data.scope.centers.length > 0 ? (
            <CenterPicker
              centers={data.scope.centers}
              activeId={data.scope.isAllCenters ? null : data.scope.centerId}
              onPick={id => load(id)}
            />
          ) : null
        }
      />

      {/* Greeting */}
      <div className="flex items-baseline gap-3 mt-1 mb-5 flex-wrap">
        <h1 className="text-[24px] font-semibold tracking-tight">
          Hi {firstName}
        </h1>
        <span className="text-[13px] text-ink-3">· {scopeLine}</span>
      </div>

      {!data.migrationApplied && (
        <div className="mb-5">
          <Stickie>
            Centers + program tracks haven&apos;t been seeded yet. Apply the schema migration
            first.
          </Stickie>
        </div>
      )}

      {error && (
        <div
          className="mb-5 p-3 border rounded-md text-[13px]"
          style={{ borderColor: '#fecaca', background: 'var(--bad-soft)', color: 'var(--bad)' }}
        >
          {error}
        </div>
      )}

      {/* Attention */}
      <PaperCard className="mb-5" framed>
        <div className="flex items-baseline gap-3 mb-3 pb-2 border-b border-rule">
          <h2 className="text-[15px] font-semibold tracking-tight">⚡️ Needs your attention</h2>
          <span className="text-[12px] text-ink-3">
            {attentionItems.length === 0 ? 'all clear' : `${attentionItems.length} item${attentionItems.length === 1 ? '' : 's'}`}
          </span>
        </div>
        {attentionItems.length === 0 ? (
          <div className="text-[14px] text-ink-2 py-2">
            Nothing flagged. Cohort is on track.
          </div>
        ) : (
          <ul className="space-y-2">
            {attentionItems.map((it, i) => (
              <li key={i}>
                <Link
                  href={it.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md border transition-colors hover:opacity-90"
                  style={{
                    borderColor:
                      it.tone === 'bad' ? '#fecaca' : it.tone === 'warn' ? '#fde68a' : 'var(--rule)',
                    background:
                      it.tone === 'bad'
                        ? 'var(--bad-soft)'
                        : it.tone === 'warn'
                        ? 'var(--warn-soft)'
                        : 'var(--paper-2)',
                  }}
                >
                  <span
                    className="text-[20px] font-semibold leading-none"
                    style={{
                      color:
                        it.tone === 'bad'
                          ? 'var(--bad)'
                          : it.tone === 'warn'
                          ? 'var(--warn-ink)'
                          : 'var(--ink-2)',
                      minWidth: 36,
                    }}
                  >
                    {it.count}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium text-ink">{it.label}</div>
                    <div className="text-[11px] text-ink-3 mt-0.5">{it.hint}</div>
                  </div>
                  <span className="text-[12px] text-accent">review →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PaperCard>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Tile label="Teachers" value={String(data.stats.teachers)} sub="in your scope" />
        <Tile label="Courses" value={String(data.stats.courses)} sub="active" />
        <Tile
          label="Avg progress"
          value={data.stats.avgProgress === null ? '—' : `${data.stats.avgProgress}%`}
          color={progressColor(data.stats.avgProgress)}
          sub="across all enrollments"
        />
        <Tile
          label="Voice attempts"
          value={String(data.stats.voiceAttempts)}
          sub="last 30 days"
        />
      </div>

      {/* Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Shortcut
          href="/admin/cohort"
          title="Cohort"
          blurb="Heatmap of progress by program track"
        />
        <Shortcut
          href="/admin/voice-perf"
          title="Voice performance"
          blurb="Cohort-wide voice score rollup, sparklines & triage"
        />
        <Shortcut
          href="/admin/users/new"
          title="Add a teacher"
          blurb="Pre-register a user with center + program scope"
        />
        <Shortcut
          href="/admin/programs"
          title="Courses"
          blurb="Edit content, sections, tracks & rosters"
        />
      </div>
    </PageShell>
  );
}

function Tile({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="border border-rule rounded-lg bg-paper p-3 shadow-sm">
      <div className="text-[11px] uppercase tracking-wide font-medium text-ink-2">{label}</div>
      <div
        className="text-[28px] font-semibold leading-none mt-1"
        style={{ color: color ?? 'var(--ink)' }}
      >
        {value}
      </div>
      {sub && <div className="text-[11px] text-ink-3 mt-1">{sub}</div>}
    </div>
  );
}

function Shortcut({
  href,
  title,
  blurb,
  accent = false,
}: {
  href: string;
  title: string;
  blurb: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block border rounded-lg p-4 hover:shadow-md transition-shadow ${
        accent
          ? 'bg-ink text-paper border-ink hover:opacity-90'
          : 'bg-paper border-rule hover:border-slate-300'
      }`}
    >
      <div
        className={`text-[14px] font-semibold tracking-tight ${
          accent ? 'text-paper' : 'text-ink'
        }`}
      >
        {title} →
      </div>
      <div
        className={`text-[12px] mt-1 leading-snug ${accent ? 'text-paper/80' : 'text-ink-3'}`}
      >
        {blurb}
      </div>
    </Link>
  );
}

function CenterPicker({
  centers,
  activeId,
  onPick,
}: {
  centers: { id: string; name: string }[];
  /** null when "All centers" is selected. */
  activeId: string | null;
  /** Receives null for "All", or the center id otherwise. */
  onPick: (id: string | null) => void;
}) {
  return (
    <select
      value={activeId ?? ''}
      onChange={e => onPick(e.target.value === '' ? null : e.target.value)}
      className="text-[12px] border border-rule rounded-md bg-paper px-2 py-1 cursor-pointer"
    >
      <option value="">All centers</option>
      {centers.map(c => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
