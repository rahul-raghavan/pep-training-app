'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { PageShell, TopBar, PaperCard, Pill, Stickie, AdminNav, AdminSubNav } from '@/components/paper';

interface RosterTeacher {
  id: string;
  name: string;
  email: string;
  centerName: string | null;
  trackNames: string[];
  enrolled: boolean;
  progressPct: number;
  lastActiveAt: string | null;
}

interface RosterPayload {
  course: { id: string; slug: string; title: string };
  trackNames: string[];
  teachers: RosterTeacher[];
  needsTracks: boolean;
}

function courseTabs(programId: string) {
  return [
    { label: 'Settings', href: `/admin/programs/${programId}` },
    { label: 'Roster', href: `/admin/programs/${programId}/roster` },
    { label: 'Assessment', href: `/admin/programs/${programId}/assessment` },
    { label: 'Preview', href: `/admin/programs/${programId}/preview` },
  ];
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

function progressColor(pct: number, enrolled: boolean): string {
  if (!enrolled) return 'var(--ink-3)';
  if (pct === 0) return 'var(--ink-3)';
  if (pct >= 70) return 'var(--good)';
  if (pct >= 40) return 'var(--warn-ink)';
  return 'var(--bad)';
}

export default function RosterPage() {
  const { user, loading: authLoading } = useAuth('admin');
  const params = useParams();
  const programId = params.programId as string;

  const [data, setData] = useState<RosterPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Trainee ids that are currently being toggled (so we can disable the rows). */
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/programs/${programId}/roster`);
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
  }, [programId]);

  useEffect(() => {
    if (!authLoading && user) load();
  }, [authLoading, user, load]);

  const callMutate = async (add: string[], remove: string[]) => {
    if (add.length === 0 && remove.length === 0) return;
    const touched = new Set<string>([...add, ...remove]);
    setPending(prev => new Set([...prev, ...touched]));

    // Optimistic flip
    setData(prev => {
      if (!prev) return prev;
      const addSet = new Set(add);
      const removeSet = new Set(remove);
      return {
        ...prev,
        teachers: prev.teachers.map(t =>
          addSet.has(t.id) ? { ...t, enrolled: true } : removeSet.has(t.id) ? { ...t, enrolled: false } : t
        ),
      };
    });

    try {
      const res = await fetch(`/api/admin/programs/${programId}/roster`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ add, remove }),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || 'Failed to save');
        await load(); // re-sync from server
        return;
      }
      setSavedAt(Date.now());
    } catch {
      setError('Network error');
      await load();
    } finally {
      setPending(prev => {
        const next = new Set(prev);
        for (const id of touched) next.delete(id);
        return next;
      });
    }
  };

  const toggleOne = (teacher: RosterTeacher) =>
    callMutate(teacher.enrolled ? [] : [teacher.id], teacher.enrolled ? [teacher.id] : []);

  const enrolledCount = useMemo(
    () => (data?.teachers.filter(t => t.enrolled).length ?? 0),
    [data]
  );
  const totalCount = data?.teachers.length ?? 0;

  if (authLoading || loading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-rule border-t-ink rounded-full animate-spin" />
        </div>
      </PageShell>
    );
  }

  if (!data) {
    return (
      <PageShell maxWidth={520}>
        <TopBar right={<span>{user?.email}</span>} />
        <AdminNav />
        <PaperCard className="mt-6 text-center">
          <h1 className="text-[20px] font-semibold tracking-tight">Course not found</h1>
          <Link href="/admin/programs" className="text-accent underline mt-3 inline-block text-[14px]">
            Back to courses
          </Link>
        </PaperCard>
      </PageShell>
    );
  }

  const someEnrolled = enrolledCount > 0;
  const allEnrolled = enrolledCount === totalCount && totalCount > 0;

  return (
    <PageShell maxWidth={1100}>
      <TopBar right={<span>{user?.email}</span>} />
      <AdminNav />

      <div className="flex items-baseline gap-3 mb-2 flex-wrap">
        <Link href="/admin/programs" className="text-[13px] text-ink-2 hover:text-ink">
          ← All courses
        </Link>
        <span className="text-ink-3">/</span>
        <h1 className="text-[20px] font-semibold tracking-tight">{data.course.title}</h1>
        <span className="text-[12px] text-ink-3 font-mono">/{data.course.slug}</span>
      </div>

      <AdminSubNav items={courseTabs(programId)} />

      <div className="flex items-baseline gap-3 mb-4 flex-wrap">
        <h2 className="text-[16px] font-semibold tracking-tight">Roster</h2>
        <span className="text-[12px] text-ink-3">
          {enrolledCount} of {totalCount} eligible teacher{totalCount === 1 ? '' : 's'} enrolled
        </span>
        {data.trackNames.length > 0 && (
          <div className="flex items-center gap-1.5">
            {data.trackNames.map(n => (
              <Pill key={n}>{n}</Pill>
            ))}
          </div>
        )}
        {savedAt && Date.now() - savedAt < 4000 && (
          <span className="text-[11px] text-good">Saved</span>
        )}
        <span className="ml-auto text-[12px] text-ink-3">
          Click a row to toggle enrollment
        </span>
      </div>

      {data.needsTracks && (
        <div className="mb-4">
          <Stickie>
            This course isn&apos;t mapped to any program track yet. Open the{' '}
            <Link
              href={`/admin/programs/${programId}`}
              className="underline hover:text-ink"
            >
              Settings tab
            </Link>{' '}
            and pick at least one track first — that&apos;s how teachers become eligible.
          </Stickie>
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

      {!data.needsTracks && data.teachers.length === 0 && (
        <PaperCard>
          <div className="text-center py-10 text-ink-2 text-[14px]">
            <p>No teachers in {data.trackNames.join(', ') || 'these tracks'} yet.</p>
            <Link
              href="/admin/users/new"
              className="inline-flex items-center px-3 py-1.5 mt-4 rounded-md bg-ink text-paper text-[13px] font-medium hover:opacity-90"
            >
              + Add a teacher
            </Link>
          </div>
        </PaperCard>
      )}

      {data.teachers.length > 0 && (
        <PaperCard framed>
          {/* Bulk actions */}
          <div className="flex items-center gap-2 pb-3 border-b border-rule mb-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                const toAdd = data.teachers.filter(t => !t.enrolled).map(t => t.id);
                if (toAdd.length === 0) return;
                callMutate(toAdd, []);
              }}
              disabled={allEnrolled}
              className="text-[13px] font-medium px-3 py-1.5 rounded-md border border-rule bg-paper hover:bg-paper-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Assign all ({totalCount - enrolledCount})
            </button>
            <button
              type="button"
              onClick={() => {
                if (!confirm(`Unenroll all ${enrolledCount} teachers from this course?`)) return;
                const toRemove = data.teachers.filter(t => t.enrolled).map(t => t.id);
                callMutate([], toRemove);
              }}
              disabled={!someEnrolled}
              className="text-[13px] font-medium px-3 py-1.5 rounded-md border border-rule bg-paper hover:bg-paper-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Unenroll all
            </button>
            <span className="ml-auto text-[11px] text-ink-3">
              eligible = teachers in {data.trackNames.length ? data.trackNames.join(' / ') : 'this course\u2019s tracks'}
            </span>
          </div>

          <ul className="divide-y divide-rule -mx-1">
            {data.teachers.map(t => {
              const isPending = pending.has(t.id);
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => !isPending && toggleOne(t)}
                    disabled={isPending}
                    className={`w-full text-left px-3 py-3 flex items-center gap-3 rounded transition-colors ${
                      t.enrolled ? 'bg-accent-soft/40' : ''
                    } ${isPending ? 'opacity-50 cursor-wait' : 'hover:bg-paper-2/40'}`}
                  >
                    {/* Checkbox */}
                    <span
                      className="w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors"
                      style={{
                        borderColor: t.enrolled ? 'var(--accent)' : 'var(--rule)',
                        background: t.enrolled ? 'var(--accent)' : 'transparent',
                      }}
                    >
                      {t.enrolled && (
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="#fff"
                          viewBox="0 0 24 24"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </span>

                    {/* Identity */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[14px] font-medium text-ink truncate">
                          {t.name}
                        </span>
                        {t.trackNames.length > 0 && (
                          <span className="text-[11px] text-ink-3">
                            · {t.trackNames.join(', ')}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-ink-3 mt-0.5 truncate font-mono">
                        {t.email} · active {formatRelative(t.lastActiveAt)}
                      </div>
                    </div>

                    {/* Progress */}
                    {t.enrolled ? (
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-paper-2 rounded-full overflow-hidden">
                          <div
                            className="h-full"
                            style={{
                              width: `${t.progressPct}%`,
                              background: progressColor(t.progressPct, true),
                            }}
                          />
                        </div>
                        <span
                          className="text-[11px] font-mono w-10 text-right"
                          style={{ color: progressColor(t.progressPct, true) }}
                        >
                          {t.progressPct}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-ink-3 italic">not enrolled</span>
                    )}

                    <Link
                      href={`/admin/users/${t.id}`}
                      onClick={e => e.stopPropagation()}
                      className="text-[11px] text-accent hover:underline ml-2"
                    >
                      open →
                    </Link>
                  </button>
                </li>
              );
            })}
          </ul>
        </PaperCard>
      )}
    </PageShell>
  );
}
