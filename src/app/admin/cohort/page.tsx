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

interface TeacherEntry {
  id: string;
  name: string;
  email: string;
  courseIds: string[];
  coursePct: Record<string, number>;
  overallPct: number;
  lastActiveAt: string | null;
  needsAttention: { kind: 'stalled' | 'stuck' | 'low_score'; reason: string } | null;
}

interface ProgramTrackBlock {
  id: string;
  slug: string;
  name: string;
  teachers: TeacherEntry[];
  courses: { id: string; slug: string; title: string }[];
}

interface CohortPayload {
  center: Center | null;
  centers: Center[];
  programs: ProgramTrackBlock[];
  migrationApplied: boolean;
  scopeLocked: boolean;
}

interface AttentionRow {
  trackName: string;
  teacher: TeacherEntry;
}

/** Map a 0-100 progress value to a heatmap cell color. Greener as it climbs. */
function heatColor(pct: number, assigned: boolean): { bg: string; ink: string } {
  if (!assigned) return { bg: 'transparent', ink: 'var(--ink-3)' };
  if (pct === 0) return { bg: 'var(--paper-2)', ink: 'var(--ink-3)' };
  // Step palette — feels less candy-coloured than a continuous gradient
  if (pct < 25) return { bg: '#fde68a', ink: '#7c2d12' }; // amber-200 / amber-900
  if (pct < 50) return { bg: '#fcd34d', ink: '#7c2d12' }; // amber-300
  if (pct < 75) return { bg: '#a7f3d0', ink: '#064e3b' }; // emerald-200
  if (pct < 100) return { bg: '#6ee7b7', ink: '#064e3b' }; // emerald-300
  return { bg: '#34d399', ink: '#064e3b' };                // emerald-400
}

/** Derive a short, header-friendly label from a course title. */
function shortLabel(title: string): string {
  // "ELEM 101: The Child …" → "ELEM 101"
  const colonIdx = title.indexOf(':');
  if (colonIdx > 0) return title.slice(0, colonIdx).trim();
  // "PTM Preparation — Elementary Program" → "PTM Preparation"
  const dashMatch = title.match(/\s+[—–-]\s+/);
  if (dashMatch && dashMatch.index! > 0) return title.slice(0, dashMatch.index!).trim();
  return title;
}

function formatRelative(iso: string | null): string {
  if (!iso) return 'never';
  const days = (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
  if (days < 1) return 'today';
  if (days < 2) return 'yesterday';
  if (days < 7) return `${Math.floor(days)}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const ATTENTION_KINDS: Record<TeacherEntry['needsAttention'] extends infer A
  ? A extends { kind: infer K }
    ? K extends string
      ? K
      : never
    : never
  : never, { label: string; pillKind: 'bad' | 'warn' | 'default' }> = {
  stalled: { label: 'stalled', pillKind: 'bad' },
  stuck:   { label: 'stuck',   pillKind: 'warn' },
  low_score: { label: 'low score', pillKind: 'warn' },
};

export default function CohortPage() {
  const { user, loading: authLoading } = useAuth('admin');

  const [centers, setCenters] = useState<Center[]>([]);
  const [center, setCenter] = useState<Center | null>(null);
  const [programs, setPrograms] = useState<ProgramTrackBlock[]>([]);
  const [scopeLocked, setScopeLocked] = useState(false);
  const [migrationApplied, setMigrationApplied] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCohort = useCallback(async (centerId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = centerId ? `/api/admin/cohort?centerId=${centerId}` : '/api/admin/cohort';
      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to load cohort');
        return;
      }
      const data: CohortPayload = await res.json();
      setCenters(data.centers);
      setCenter(data.center);
      setPrograms(data.programs);
      setScopeLocked(data.scopeLocked);
      setMigrationApplied(data.migrationApplied);
    } catch {
      setError('Network error loading cohort');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) loadCohort();
  }, [authLoading, user, loadCohort]);

  if (authLoading || loading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-rule border-t-ink rounded-full animate-spin" />
        </div>
      </PageShell>
    );
  }

  // Aggregate "needs attention" rows across program blocks
  const attentionRows: AttentionRow[] = [];
  for (const p of programs) {
    for (const t of p.teachers) {
      if (t.needsAttention) attentionRows.push({ trackName: p.name, teacher: t });
    }
  }

  const totalTeachers = programs.reduce(
    (acc, p) => acc + p.teachers.length,
    0
  );

  return (
    <PageShell maxWidth={1320}>
      <TopBar right={<span>{user?.email}</span>} />
      <AdminNav />
      <AdminSubNav items={TEACHERS_TABS} />

      <div className="flex items-baseline gap-3 mb-3 flex-wrap">
        <h1 className="text-[20px] font-semibold tracking-tight">Cohort</h1>
        {center && (
          <span className="text-[13px] text-ink-2">
            {center.name} ·{' '}
            <span className="text-ink-3">
              {programs.length} program{programs.length === 1 ? '' : 's'} · {totalTeachers} teacher
              {totalTeachers === 1 ? '' : 's'}
            </span>
          </span>
        )}
        <span className="ml-auto text-[12px] text-ink-3">Click a row to drill into a teacher</span>
      </div>

      {!migrationApplied && (
        <div className="mb-4">
          <Stickie>
            Centers + program tracks haven&apos;t been seeded yet — apply the schema migration first.
          </Stickie>
        </div>
      )}

      {migrationApplied && centers.length > 0 && (
        <div className="border border-rule rounded-lg bg-paper p-3 mb-4 flex items-center gap-2 flex-wrap">
          <div className="text-[11px] uppercase tracking-wide font-medium text-ink-2">Center</div>
          {centers.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => !scopeLocked && loadCohort(c.id)}
              disabled={scopeLocked && c.id !== center?.id}
              className={`inline-flex items-center border rounded-full px-3 py-0.5 text-[13px] font-medium transition-colors ${
                center?.id === c.id
                  ? 'bg-accent-soft text-[color:var(--accent)] border-[color:var(--accent)]/30'
                  : 'bg-paper text-ink-2 border-rule hover:border-slate-300'
              } ${scopeLocked && c.id !== center?.id ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {c.name}
            </button>
          ))}
          {scopeLocked && (
            <span className="ml-auto text-[11px] text-ink-3">
              You&apos;re pinned to {center?.name}
            </span>
          )}
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

      {migrationApplied && programs.length === 0 ? (
        <PaperCard>
          <div className="text-center py-10 text-ink-2">
            <p className="text-[14px]">
              {center
                ? `No teachers in ${center.name} yet.`
                : 'Pick a center to view its cohort.'}
            </p>
            <Link
              href="/admin/users/new"
              className="inline-flex items-center px-4 py-2 mt-4 rounded-md bg-ink text-paper text-[13px] font-medium hover:opacity-90"
            >
              + Add a teacher
            </Link>
          </div>
        </PaperCard>
      ) : (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
          <div className="space-y-5 min-w-0">
            {programs.map(p => (
              <ProgramHeatmap key={p.id} program={p} centerName={center?.name ?? ''} />
            ))}

            {/* Color legend */}
            {programs.some(p => p.courses.length > 0) && (
              <div className="flex items-center justify-end gap-2 text-[11px] text-ink-3 px-2">
                <span>0%</span>
                <div className="flex">
                  {[0, 24, 49, 74, 99, 100].map(v => (
                    <div
                      key={v}
                      className="w-4 h-3 border border-rule"
                      style={{ background: heatColor(v, true).bg }}
                    />
                  ))}
                </div>
                <span>100%</span>
              </div>
            )}
          </div>

          <NeedsAttentionPanel rows={attentionRows} />
        </div>
      )}
    </PageShell>
  );
}

interface ProgramHeatmapProps {
  program: ProgramTrackBlock;
  centerName: string;
}

function ProgramHeatmap({ program, centerName }: ProgramHeatmapProps) {
  return (
    <PaperCard>
      <div className="flex items-baseline gap-3 mb-4 pb-2.5 border-b border-rule flex-wrap">
        <h2 className="text-[18px] font-semibold tracking-tight">
          {program.name}{' '}
          <span className="text-ink-3 font-normal text-[14px]">· {centerName}</span>
        </h2>
        <span className="text-[12px] text-ink-3">
          {program.teachers.length} teacher{program.teachers.length === 1 ? '' : 's'} ·{' '}
          {program.courses.length} course{program.courses.length === 1 ? '' : 's'}
        </span>
      </div>

      {program.teachers.length === 0 ? (
        <div className="text-[13px] text-ink-3 italic py-4 text-center">
          No teachers in this track yet.
        </div>
      ) : program.courses.length === 0 ? (
        <div className="text-[13px] text-ink-3 italic py-4 text-center">
          No courses are mapped to {program.name} yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="border-separate border-spacing-0">
            <thead>
              <tr>
                <th
                  className="text-left text-[12px] font-medium text-ink-3 align-bottom pb-2 pr-3"
                  style={{ minWidth: 200, width: 200 }}
                >
                  Teacher
                </th>
                {program.courses.map(c => (
                  <th
                    key={c.id}
                    className="text-center align-bottom px-1 pb-2"
                    style={{ width: 88, minWidth: 88, maxWidth: 88 }}
                  >
                    <div
                      className="text-[12px] font-medium text-ink leading-tight"
                      title={c.title}
                    >
                      {shortLabel(c.title)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {program.teachers.map(t => (
                <tr
                  key={t.id}
                  className={t.needsAttention ? 'bg-bad-soft/30' : ''}
                >
                  <td className="py-2 pr-3 align-middle border-t border-rule">
                    <Link
                      href={`/admin/users/${t.id}`}
                      className="block hover:opacity-80 transition-opacity"
                    >
                      <div className="text-[13px] font-medium text-ink truncate">{t.name}</div>
                      <div className="text-[11px] text-ink-3 font-mono truncate flex items-center gap-1.5">
                        <span>active {formatRelative(t.lastActiveAt)}</span>
                        {t.needsAttention && (
                          <span style={{ color: 'var(--bad)' }}>· ⚑ {ATTENTION_KINDS[t.needsAttention.kind].label}</span>
                        )}
                      </div>
                    </Link>
                  </td>
                  {program.courses.map(c => {
                    const assigned = t.courseIds.includes(c.id);
                    const pct = t.coursePct[c.id] ?? 0;
                    const { bg, ink } = heatColor(pct, assigned);
                    return (
                      <td
                        key={c.id}
                        className="px-1 py-1 border-t border-rule"
                        style={{ width: 88, minWidth: 88, maxWidth: 88 }}
                      >
                        <div
                          title={`${t.name} · ${c.title} · ${
                            assigned ? `${pct}% complete` : 'not assigned'
                          }`}
                          className="w-10 h-10 rounded-md border flex items-center justify-center text-[10px] font-mono mx-auto"
                          style={{
                            background: bg,
                            color: ink,
                            borderColor: assigned ? 'var(--rule)' : 'transparent',
                            borderStyle: assigned ? 'solid' : 'dashed',
                          }}
                        >
                          {assigned ? `${pct}` : '·'}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PaperCard>
  );
}

interface NeedsAttentionProps {
  rows: AttentionRow[];
}

function NeedsAttentionPanel({ rows }: NeedsAttentionProps) {
  return (
    <aside className="border border-rule rounded-lg bg-paper p-4 lg:sticky lg:top-4 self-start shadow-sm">
      <div className="flex items-baseline gap-2 mb-2.5 pb-2 border-b border-rule">
        <h3 className="text-[15px] font-semibold tracking-tight">Needs attention</h3>
        <span className="text-[11px] text-ink-3">auto-flagged</span>
        <span className="ml-auto text-[12px] font-mono text-ink-2">{rows.length}</span>
      </div>

      {rows.length === 0 ? (
        <div className="text-[13px] text-ink-3 italic py-3 text-center">
          Everyone&apos;s on track.
        </div>
      ) : (
        <ul className="divide-y divide-rule">
          {rows.map(({ trackName, teacher }) => {
            const k = teacher.needsAttention!;
            const meta = ATTENTION_KINDS[k.kind];
            return (
              <li key={`${teacher.id}-${k.kind}`} className="py-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/admin/users/${teacher.id}`}
                    className="text-[14px] font-medium text-ink hover:underline truncate"
                  >
                    {teacher.name}
                  </Link>
                  <Pill kind={meta.pillKind}>{meta.label}</Pill>
                </div>
                <div className="text-[11px] text-ink-3 mt-0.5">{trackName}</div>
                <div className="text-[12px] text-ink-2 mt-1 leading-snug">{k.reason}</div>
                <div className="flex gap-1.5 mt-2">
                  <a
                    href={`mailto:${teacher.email}?subject=Quick%20training%20check-in`}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-rule bg-paper text-[12px] hover:bg-paper-2"
                  >
                    Nudge
                  </a>
                  <Link
                    href={`/admin/users/${teacher.id}`}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-rule bg-paper text-[12px] hover:bg-paper-2"
                  >
                    Open
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
