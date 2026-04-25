'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { PageShell, TopBar, PaperCard, Pill, Stickie, AdminNav, AdminSubNav } from '@/components/paper';

const TEACHERS_TABS = [
  { label: 'All teachers', href: '/admin/users' },
  { label: 'Cohort', href: '/admin/cohort' },
  { label: 'Voice perf', href: '/admin/voice-perf' },
];

interface Center {
  id: string;
  slug: string;
  name: string;
}

interface TeacherRow {
  id: string;
  name: string;
  email: string;
  attempts: number;
  avgScore: number | null;
  trend: number;
  series: number[];
  weakestSection: string | null;
  flag: 'needs-attention' | 'idle' | null;
}

interface VoicePerfPayload {
  center: Center | null;
  centers: Center[];
  filterDays: number;
  scopeLocked: boolean;
  migrationApplied: boolean;
  stats: {
    teachersActive: { count: number; total: number };
    totalAttempts: number;
    meanScore: number | null;
    belowThreshold: number;
  };
  distribution: { bucket: string; n: number; pct: number }[];
  teachers: TeacherRow[];
  triage: { teacherId: string; name: string; reason: string }[];
}

function scoreColor(score: number | null): string {
  if (score === null) return 'var(--ink-3)';
  if (score >= 4) return 'var(--good)';
  if (score >= 3) return 'var(--warn-ink)';
  return 'var(--bad)';
}

function bucketColor(bucket: string): string {
  const n = parseInt(bucket, 10);
  if (n >= 4) return 'var(--good)';
  if (n === 3) return 'var(--warn-ink)';
  return 'var(--bad)';
}

const WINDOWS = [
  { days: 7, label: 'Last 7 days' },
  { days: 30, label: 'Last 30 days' },
  { days: 90, label: 'Last 90 days' },
  { days: 365, label: 'Last year' },
];

export default function VoicePerfPage() {
  const { user, loading: authLoading } = useAuth('admin');

  const [data, setData] = useState<VoicePerfPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeWindow, setActiveWindow] = useState(30);
  const [activeCenterId, setActiveCenterId] = useState<string | null>(null);

  const load = useCallback(
    async (centerId: string | null, days: number) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (centerId) params.set('centerId', centerId);
        params.set('days', String(days));
        const res = await fetch(`/api/admin/voice-perf?${params.toString()}`);
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          setError(e.error || 'Failed to load');
          return;
        }
        const payload: VoicePerfPayload = await res.json();
        setData(payload);
        if (!activeCenterId && payload.center) setActiveCenterId(payload.center.id);
      } catch {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    },
    [activeCenterId]
  );

  useEffect(() => {
    if (!authLoading && user) load(null, 30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const onCenterClick = (id: string) => {
    if (data?.scopeLocked) return;
    setActiveCenterId(id);
    load(id, activeWindow);
  };

  const onWindowClick = (days: number) => {
    setActiveWindow(days);
    load(activeCenterId, days);
  };

  if (authLoading || loading || !data) {
    return (
      <PageShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-rule border-t-ink rounded-full animate-spin" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth={1280}>
      <TopBar right={<span>{user?.email}</span>} />
      <AdminNav />
      <AdminSubNav items={TEACHERS_TABS} />

      <div className="flex items-baseline gap-3 mb-3 flex-wrap">
        <h1 className="text-[20px] font-semibold tracking-tight">Voice performance</h1>
        {data.center && (
          <span className="text-[13px] text-ink-2">
            {data.center.name} ·{' '}
            <span className="text-ink-3">
              {data.stats.teachersActive.total} teacher
              {data.stats.teachersActive.total === 1 ? '' : 's'} in scope
            </span>
          </span>
        )}
      </div>

      {!data.migrationApplied && (
        <div className="mb-4">
          <Stickie>Centers + program tracks haven&apos;t been seeded yet — apply the schema migration.</Stickie>
        </div>
      )}

      {/* Filters */}
      {data.migrationApplied && (
        <div className="border border-rule rounded-lg bg-paper p-3 mb-4 flex items-center gap-2 flex-wrap">
          {data.centers.length > 0 && (
            <>
              <div className="text-[11px] uppercase tracking-wide font-medium text-ink-2">
                Center
              </div>
              {data.centers.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onCenterClick(c.id)}
                  disabled={data.scopeLocked && c.id !== data.center?.id}
                  className={`inline-flex items-center border rounded-full px-3 py-0.5 text-[13px] font-medium transition-colors ${
                    data.center?.id === c.id
                      ? 'bg-accent-soft text-[color:var(--accent)] border-[color:var(--accent)]/30'
                      : 'bg-paper text-ink-2 border-rule hover:border-slate-300'
                  } ${
                    data.scopeLocked && c.id !== data.center?.id
                      ? 'opacity-40 cursor-not-allowed'
                      : 'cursor-pointer'
                  }`}
                >
                  {c.name}
                </button>
              ))}
              <span className="mx-1 text-ink-3">·</span>
            </>
          )}
          <div className="text-[11px] uppercase tracking-wide font-medium text-ink-2">
            Window
          </div>
          {WINDOWS.map(w => (
            <button
              key={w.days}
              type="button"
              onClick={() => onWindowClick(w.days)}
              className={`inline-flex items-center border rounded-full px-3 py-0.5 text-[13px] font-medium transition-colors ${
                data.filterDays === w.days
                  ? 'bg-accent-soft text-[color:var(--accent)] border-[color:var(--accent)]/30'
                  : 'bg-paper text-ink-2 border-rule hover:border-slate-300 cursor-pointer'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div
          className="mb-4 p-3 border rounded-md text-[13px]"
          style={{ borderColor: '#fecaca', background: 'var(--bad-soft)', color: 'var(--bad)' }}
        >
          {error}
        </div>
      )}

      {/* 4 stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatTile
          label="Teachers active"
          value={`${data.stats.teachersActive.count} / ${data.stats.teachersActive.total}`}
          sub={
            data.stats.teachersActive.total - data.stats.teachersActive.count > 0
              ? `${data.stats.teachersActive.total - data.stats.teachersActive.count} not yet started`
              : 'all engaged'
          }
        />
        <StatTile
          label="Voice attempts"
          value={String(data.stats.totalAttempts)}
          sub={
            data.stats.teachersActive.count > 0
              ? `avg ${(data.stats.totalAttempts / data.stats.teachersActive.count).toFixed(1)} per active teacher`
              : ''
          }
        />
        <StatTile
          label="Mean score"
          value={data.stats.meanScore === null ? '—' : `${data.stats.meanScore}`}
          sub="of 5 · cohort"
          color={scoreColor(data.stats.meanScore)}
        />
        <StatTile
          label="Below threshold"
          value={String(data.stats.belowThreshold)}
          sub={
            data.stats.belowThreshold > 0 ? `avg < 3.0 / 5` : 'all above 3.0'
          }
          color={data.stats.belowThreshold > 0 ? 'var(--bad)' : 'var(--good)'}
        />
      </div>

      {data.teachers.length === 0 ? (
        <PaperCard>
          <div className="text-center py-10 text-ink-2 text-[14px]">
            No teachers in scope yet.
          </div>
        </PaperCard>
      ) : (
        <div className="grid lg:grid-cols-[260px_minmax(0,1fr)] gap-4 items-start">
          {/* Distribution */}
          <PaperCard framed>
            <h2 className="text-[15px] font-semibold tracking-tight mb-2">Score distribution</h2>
            <div className="text-[11px] text-ink-3 mb-3">
              {data.stats.totalAttempts} attempt{data.stats.totalAttempts === 1 ? '' : 's'} · this center
            </div>
            <div className="flex flex-col gap-1.5">
              {data.distribution.map(b => (
                <div key={b.bucket} className="flex items-center gap-2 text-[11px] font-mono">
                  <span className="w-9 text-ink-2">{b.bucket}</span>
                  <div className="flex-1 h-3 border border-rule rounded relative bg-paper-2 overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0"
                      style={{
                        width: `${b.pct}%`,
                        background: bucketColor(b.bucket),
                      }}
                    />
                  </div>
                  <span className="w-7 text-right text-ink-2">{b.n}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-rule text-[11px] text-ink-3 italic leading-relaxed">
              4–5/5 strong · 3/5 borderline · 1–2/5 needs work.
            </div>
          </PaperCard>

          {/* Per-teacher table */}
          <div className="min-w-0 flex flex-col gap-4">
            <PaperCard framed>
              <div className="flex items-baseline gap-3 pb-2 mb-3 border-b border-rule">
                <h2 className="text-[15px] font-semibold tracking-tight">By teacher</h2>
                <span className="text-[11px] text-ink-3">
                  needs attention first
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wide font-medium text-ink-2">
                      <th className="text-left pb-2 pr-3" style={{ minWidth: 180 }}>
                        Teacher
                      </th>
                      <th className="text-center pb-2 px-2" style={{ width: 70 }}>
                        Attempts
                      </th>
                      <th className="text-center pb-2 px-2" style={{ width: 70 }}>
                        Avg
                      </th>
                      <th className="text-left pb-2 px-2" style={{ width: 90 }}>
                        Trend
                      </th>
                      <th className="text-left pb-2 px-2">Last attempts</th>
                      <th className="text-left pb-2 pl-3" style={{ width: 200 }}>
                        Weakest section
                      </th>
                      <th className="text-right pb-2 pl-2" style={{ width: 80 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {data.teachers.map(t => (
                      <tr
                        key={t.id}
                        className="border-t border-rule"
                        style={{
                          background:
                            t.flag === 'needs-attention'
                              ? 'var(--bad-soft)'
                              : t.flag === 'idle'
                              ? 'var(--paper-2)'
                              : 'transparent',
                        }}
                      >
                        <td className="py-2 pr-3 align-middle">
                          <Link
                            href={`/admin/users/${t.id}`}
                            className="block hover:opacity-80"
                          >
                            <div className="text-[13px] font-medium text-ink truncate">
                              {t.name}
                              {t.flag === 'needs-attention' && (
                                <span style={{ color: 'var(--bad)' }}> · ⚑</span>
                              )}
                            </div>
                            <div className="text-[11px] text-ink-3 truncate font-mono">
                              {t.email}
                            </div>
                          </Link>
                        </td>
                        <td
                          className="text-center px-2 text-[12px] font-mono"
                          style={{ color: t.attempts === 0 ? 'var(--ink-3)' : 'var(--ink)' }}
                        >
                          {t.attempts}
                        </td>
                        <td
                          className="text-center px-2 text-[12px] font-mono font-semibold"
                          style={{ color: scoreColor(t.avgScore) }}
                        >
                          {t.avgScore === null ? '—' : `${t.avgScore}/5`}
                        </td>
                        <td className="px-2">
                          <TrendCell trend={t.trend} attempts={t.attempts} />
                        </td>
                        <td className="px-2">
                          {t.attempts === 0 ? (
                            <span className="text-[12px] text-ink-3 italic">
                              no attempts yet
                            </span>
                          ) : (
                            <Sparkline values={t.series} />
                          )}
                        </td>
                        <td className="pl-3 text-[11px] text-ink-2 font-mono truncate max-w-[200px]">
                          {t.weakestSection ?? '—'}
                        </td>
                        <td className="pl-2 text-right">
                          {t.attempts === 0 && t.email ? (
                            <a
                              href={`mailto:${t.email}?subject=Quick%20training%20check-in`}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-rule bg-paper text-[11px] hover:bg-paper-2"
                            >
                              📨 Nudge
                            </a>
                          ) : (
                            <Link
                              href={`/admin/users/${t.id}`}
                              className="text-[11px] text-accent hover:underline"
                            >
                              open →
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </PaperCard>

            {/* Triage queue */}
            {data.triage.length > 0 && (
              <div
                className="border rounded-lg p-4 shadow-sm"
                style={{ borderColor: '#fecaca', background: 'var(--bad-soft)' }}
              >
                <h2
                  className="text-[15px] font-semibold tracking-tight"
                  style={{ color: 'var(--bad)' }}
                >
                  ⚑ Triage queue ({data.triage.length})
                </h2>
                <ul className="mt-2 space-y-1.5 text-[13px] leading-snug">
                  {data.triage.map(t => (
                    <li key={t.teacherId} className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/admin/users/${t.teacherId}`}
                        className="font-medium text-ink hover:underline"
                      >
                        {t.name}
                      </Link>
                      <span className="text-ink-2">— {t.reason}</span>
                      <Pill kind="bad" className="ml-auto">
                        review
                      </Pill>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </PageShell>
  );
}

function StatTile({
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
        className="text-[26px] font-semibold leading-none mt-1"
        style={{ color: color ?? 'var(--ink)' }}
      >
        {value}
      </div>
      {sub && <div className="text-[11px] text-ink-3 mt-1">{sub}</div>}
    </div>
  );
}

function TrendCell({ trend, attempts }: { trend: number; attempts: number }) {
  if (attempts < 4) {
    return <span className="text-[11px] text-ink-3 font-mono">need 4+ attempts</span>;
  }
  if (Math.abs(trend) < 0.15) {
    return <span className="text-[11px] text-ink-3 font-mono">→ flat</span>;
  }
  const up = trend > 0;
  return (
    <span
      className="text-[11px] font-mono"
      style={{ color: up ? 'var(--good)' : 'var(--bad)' }}
    >
      {up ? '↗' : '↘'} {up ? '+' : ''}
      {trend.toFixed(1)}
    </span>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const w = 8;
  const gap = 2;
  return (
    <div className="flex items-end gap-[2px] h-6" style={{ minWidth: values.length * (w + gap) }}>
      {values.map((v, i) => (
        <div
          key={i}
          style={{
            width: w,
            height: Math.max(2, (v / 5) * 22),
            background: scoreColor(v),
            borderRadius: 1,
          }}
        />
      ))}
    </div>
  );
}
