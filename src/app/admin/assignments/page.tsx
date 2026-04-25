'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { PageShell, TopBar, PaperCard, Stickie, AdminNav } from '@/components/paper';

/** Short header label: "ELEM 101: ..." → "ELEM 101", "PTM Preparation — Elementary" → "PTM Preparation". */
function shortLabel(title: string): string {
  const colonIdx = title.indexOf(':');
  if (colonIdx > 0) return title.slice(0, colonIdx).trim();
  const dashMatch = title.match(/\s+[—–-]\s+/);
  if (dashMatch && dashMatch.index! > 0) return title.slice(0, dashMatch.index!).trim();
  return title;
}

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

export default function AssignmentsPage() {
  const { user, loading: authLoading } = useAuth('admin');

  const [centers, setCenters] = useState<Center[]>([]);
  const [center, setCenter] = useState<Center | null>(null);
  const [programs, setPrograms] = useState<ProgramTrackBlock[]>([]);
  const [scopeLocked, setScopeLocked] = useState(false);
  const [migrationApplied, setMigrationApplied] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** trainee_id__course_id keys currently flipping (so we can disable cells) */
  const [flipping, setFlipping] = useState<Set<string>>(new Set());

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

  const toggle = async (traineeId: string, courseId: string, currentlyOn: boolean) => {
    const key = `${traineeId}__${courseId}`;
    if (flipping.has(key)) return;

    // Optimistic update
    setFlipping(prev => new Set(prev).add(key));
    setPrograms(prev =>
      prev.map(p => ({
        ...p,
        teachers: p.teachers.map(t =>
          t.id === traineeId
            ? {
                ...t,
                courseIds: currentlyOn
                  ? t.courseIds.filter(c => c !== courseId)
                  : [...t.courseIds, courseId],
              }
            : t
        ),
      }))
    );

    try {
      const res = await fetch('/api/admin/assignments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ traineeId, courseId, on: !currentlyOn }),
      });
      if (!res.ok) {
        // Roll back on failure
        const errBody = await res.json().catch(() => ({}));
        setError(errBody.error || 'Failed to update assignment');
        setPrograms(prev =>
          prev.map(p => ({
            ...p,
            teachers: p.teachers.map(t =>
              t.id === traineeId
                ? {
                    ...t,
                    courseIds: currentlyOn
                      ? [...t.courseIds, courseId]
                      : t.courseIds.filter(c => c !== courseId),
                  }
                : t
            ),
          }))
        );
      } else {
        // Clear any previous error after a successful flip
        setError(null);
      }
    } catch {
      setError('Network error updating assignment');
    } finally {
      setFlipping(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  if (authLoading || loading) {
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

      <div className="flex items-baseline gap-3 mb-3 flex-wrap">
        <h1 className="text-[20px] font-semibold tracking-tight">Bulk assignments</h1>
        <span className="text-[12px] text-ink-3">
          Center-wide grid · click a cell to toggle
        </span>
        <span className="ml-auto text-[12px] text-ink-3">
          Per-course view: open any course →{' '}
          <Link href="/admin/programs" className="underline hover:text-ink">
            Roster tab
          </Link>
        </span>
      </div>

      {!migrationApplied && (
        <div className="mb-4">
          <Stickie>
            Centers + program tracks haven&apos;t been seeded yet — apply{' '}
            <code>migrations/migration-add-centers-and-programs.sql</code> first.
          </Stickie>
        </div>
      )}

      {migrationApplied && centers.length > 0 && (
        <div
          className="border border-rule rounded-lg bg-paper p-3 mb-4 flex items-center gap-2 flex-wrap"
        >
          <div className="text-[11px] uppercase tracking-wide font-medium text-ink-2">
            Center
          </div>
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
                : 'Pick a center to start assigning courses.'}
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
        <div className="space-y-5">
          {programs.map(p => (
            <ProgramMatrix
              key={p.id}
              program={p}
              centerName={center?.name ?? ''}
              onToggle={toggle}
              flipping={flipping}
            />
          ))}
        </div>
      )}

      <Stickie>
        Tip: a teacher must be in a track (set on the Add user form) to appear here. Courses
        without a track mapping show up as zero-width columns until a super_admin maps them.
      </Stickie>
    </PageShell>
  );
}

interface ProgramMatrixProps {
  program: ProgramTrackBlock;
  centerName: string;
  onToggle: (traineeId: string, courseId: string, currentlyOn: boolean) => void;
  flipping: Set<string>;
}

function ProgramMatrix({ program, centerName, onToggle, flipping }: ProgramMatrixProps) {
  const courseAssignedCounts = program.courses.map(c => ({
    courseId: c.id,
    count: program.teachers.filter(t => t.courseIds.includes(c.id)).length,
  }));

  return (
    <PaperCard>
      <div className="flex items-baseline gap-3 mb-4 pb-2.5 border-b border-rule flex-wrap">
        <h2 className="text-[18px] font-semibold tracking-tight">
          {program.name} <span className="text-ink-3 font-normal text-[14px]">· {centerName}</span>
        </h2>
        <span className="text-[12px] text-ink-3">
          {program.teachers.length} teacher{program.teachers.length === 1 ? '' : 's'} ·{' '}
          {program.courses.length} course{program.courses.length === 1 ? '' : 's'} mapped
        </span>
      </div>

      {program.teachers.length === 0 ? (
        <div className="text-[13px] text-ink-3 italic py-4 text-center">
          No teachers assigned to this track yet.
        </div>
      ) : program.courses.length === 0 ? (
        <div className="text-[13px] text-ink-3 italic py-4 text-center">
          No courses are mapped to {program.name} yet. Map a course to this track from the
          Programs CMS to start assigning.
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
                <tr key={t.id}>
                  <td className="py-2 pr-3 align-middle border-t border-rule">
                    <div className="text-[13px] font-medium text-ink truncate">{t.name}</div>
                    <div className="text-[11px] text-ink-3 font-mono truncate">{t.email}</div>
                  </td>
                  {program.courses.map(c => {
                    const on = t.courseIds.includes(c.id);
                    const key = `${t.id}__${c.id}`;
                    const inFlight = flipping.has(key);
                    return (
                      <td
                        key={c.id}
                        className="px-1 py-1 border-t border-rule"
                        style={{ width: 88, minWidth: 88, maxWidth: 88 }}
                      >
                        <button
                          type="button"
                          onClick={() => onToggle(t.id, c.id, on)}
                          disabled={inFlight}
                          aria-label={`${on ? 'Unassign' : 'Assign'} ${c.title} to ${t.name}`}
                          className={`w-10 h-10 mx-auto rounded-md border flex items-center justify-center transition-colors ${
                            on
                              ? 'bg-[color:var(--accent)] text-paper border-[color:var(--accent)] hover:opacity-90'
                              : 'bg-paper text-ink-3 border-rule hover:border-[color:var(--accent)]/40 hover:text-ink'
                          } ${inFlight ? 'opacity-50 cursor-wait' : ''}`}
                        >
                          {on ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            ''
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Footer row: per-course assigned count */}
              <tr>
                <td className="text-[11px] uppercase tracking-wide font-medium text-ink-3 pt-2 pr-3 border-t border-rule">
                  Assigned to
                </td>
                {courseAssignedCounts.map(c => (
                  <td
                    key={c.courseId}
                    className="text-center text-[12px] text-ink-2 font-mono pt-2 border-t border-rule"
                    style={{ width: 88, minWidth: 88, maxWidth: 88 }}
                  >
                    {c.count}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </PaperCard>
  );
}
