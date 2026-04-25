'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { PageShell, TopBar, PaperCard, Pill, Ring, Stickie } from '@/components/paper';

interface ProgramInfo {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  totalSections: number;
  completedSections: number;
  status: 'locked' | 'not_started' | 'in_progress' | 'sections_complete' | 'passed';
  locked?: boolean;
  prerequisite?: {
    slug: string;
    title: string;
    enrolled: boolean;
    passed: boolean;
  } | null;
  bestScore: number | null;
  bestTotal: number | null;
}

function progressPct(p: ProgramInfo): number {
  if (p.status === 'passed') return 100;
  if (p.totalSections === 0) return 0;
  return Math.round((p.completedSections / p.totalSections) * 100);
}

/** Pick the next program to resume — most-progressed in_progress, else first started. */
function pickResume(programs: ProgramInfo[]): ProgramInfo | null {
  const inProgress = programs.filter(p => p.status === 'in_progress' && !p.locked);
  if (inProgress.length > 0) {
    return inProgress.sort((a, b) => progressPct(b) - progressPct(a))[0];
  }
  const sectionsComplete = programs.find(p => p.status === 'sections_complete' && !p.locked);
  if (sectionsComplete) return sectionsComplete;
  return programs.find(p => p.status === 'not_started' && !p.locked) ?? null;
}

function StateLabel({ p }: { p: ProgramInfo }) {
  switch (p.status) {
    case 'passed':
      return <span className="text-[12px] text-good font-medium">✓ Completed</span>;
    case 'sections_complete':
      return <span className="text-[12px] text-ink-2">Ready for assessment</span>;
    case 'in_progress':
      return <span className="text-[12px] text-ink-2">{p.completedSections} of {p.totalSections} sections</span>;
    case 'locked':
      return <span className="text-[12px] text-ink-3">Locked</span>;
    default:
      return <span className="text-[12px] text-ink-2">Not started</span>;
  }
}

export default function LearnPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [programs, setPrograms] = useState<ProgramInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/my-programs');
        if (!res.ok) {
          setError('Failed to load your programs.');
          return;
        }
        const data = await res.json();
        setPrograms(data.programs || []);
      } catch {
        setError('Something went wrong loading your programs.');
      } finally {
        setLoading(false);
      }
    }
    if (!authLoading && user) fetchData();
  }, [authLoading, user]);

  if (authLoading || loading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-rule border-t-ink rounded-full animate-spin" />
        </div>
      </PageShell>
    );
  }

  const firstName = (user?.name || 'there').split(' ')[0];
  const resume = pickResume(programs);

  // Total completed across active programs (proxy for "modules done")
  const totalComplete = programs.reduce((acc, p) => acc + p.completedSections, 0);

  return (
    <PageShell maxWidth={1080}>
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

      {error ? (
        <PaperCard className="text-center mt-8">
          <h2 className="text-lg font-semibold mb-1.5">Something went wrong</h2>
          <p className="text-ink-2">{error}</p>
        </PaperCard>
      ) : programs.length === 0 ? (
        <EmptyState name={firstName} />
      ) : (
        <>
          {/* Hero row: Resume + Sections-done tile */}
          <div className="grid md:grid-cols-[1.5fr_1fr] gap-4 mt-2 mb-6">
            {/* Resume card */}
            <div
              className="border border-rule rounded-lg p-5 shadow-sm"
              style={{ background: 'var(--accent-soft)' }}
            >
              <div className="text-[13px] text-ink-2 font-medium uppercase tracking-wide">
                Welcome back, {firstName}
              </div>
              {resume ? (
                <>
                  <div className="text-[13px] text-ink-2 mt-1.5">Pick up where you left off:</div>
                  <div className="flex justify-between items-center mt-2 gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-[18px] font-semibold tracking-tight text-ink truncate">
                        {resume.title}
                      </div>
                      <div className="text-[12px] text-ink-2 mt-0.5">
                        {resume.status === 'sections_complete'
                          ? 'All sections done · final assessment ready'
                          : `${resume.completedSections} of ${resume.totalSections} sections done`}
                      </div>
                    </div>
                    <Link
                      href={
                        resume.status === 'sections_complete'
                          ? `/learn/${resume.slug}/assessment`
                          : `/learn/${resume.slug}`
                      }
                      className="inline-flex items-center px-3 py-1.5 rounded-md bg-ink text-paper text-[13px] font-medium hover:opacity-90"
                    >
                      Resume →
                    </Link>
                  </div>
                </>
              ) : (
                <div className="text-[13px] text-ink-2 mt-1.5">
                  Everything assigned to you is complete. Nice work.
                </div>
              )}
            </div>

            {/* Sections-done tile */}
            <div className="border border-rule rounded-lg p-5 shadow-sm bg-paper flex flex-col justify-center">
              <div className="text-[11px] uppercase tracking-wide text-ink-2 font-medium">
                Sections done
              </div>
              <div className="text-[32px] font-semibold tracking-tight mt-1 leading-none">
                {totalComplete}
              </div>
              <div className="text-[13px] text-ink-2 mt-1">across all your courses</div>
            </div>
          </div>

          {/* Course grid */}
          <div className="flex items-baseline gap-3 mb-3">
            <h2 className="text-[16px] font-semibold tracking-tight">Your courses</h2>
            <span className="text-[12px] text-ink-3">{programs.length} assigned</span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {programs.map(p => (
              <CourseCard key={p.id} program={p} />
            ))}
          </div>

          <div className="mt-8 pt-4 border-t border-rule text-[13px] text-ink-2">
            Self-paced. Resume any time. Your admin sees overall progress, not your individual answers.
          </div>
        </>
      )}
    </PageShell>
  );
}

function CourseCard({ program }: { program: ProgramInfo }) {
  const pct = progressPct(program);
  const locked = program.status === 'locked' || program.locked;
  const isDone = program.status === 'passed';

  const inner = (
    <div
      className={`bg-paper border border-rule rounded-lg p-4 flex flex-col gap-3 h-full transition-shadow ${
        locked ? 'opacity-70' : 'hover:shadow-md hover:border-slate-300'
      }`}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="text-[15px] font-semibold tracking-tight leading-snug flex-1">
          {program.title}
        </div>
        <Ring pct={pct} size={38} />
      </div>
      {program.description && (
        <div className="text-[13px] text-ink-2 leading-snug line-clamp-2">
          {program.description}
        </div>
      )}
      <div className="flex justify-between items-center mt-auto pt-1">
        <StateLabel p={program} />
        {!locked && !isDone && (
          <Pill>{program.status === 'not_started' ? 'Start' : 'Continue'}</Pill>
        )}
        {locked && program.prerequisite && (
          <span className="text-[11px] text-ink-3 truncate ml-2">
            unlock: {program.prerequisite.title}
          </span>
        )}
      </div>
    </div>
  );

  if (locked) {
    return <div className="block">{inner}</div>;
  }
  return (
    <Link href={`/learn/${program.slug}`} className="block">
      {inner}
    </Link>
  );
}

function EmptyState({ name }: { name: string }) {
  return (
    <PaperCard className="mt-8">
      <div className="text-center px-6 py-10 border border-dashed border-rule rounded-lg bg-paper-2">
        <div className="w-14 h-14 mx-auto rounded-full bg-paper border border-rule flex items-center justify-center text-ink-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <h2 className="text-[20px] font-semibold tracking-tight mt-3">Welcome, {name}.</h2>
        <p className="text-[14px] text-ink-2 mt-2 max-w-md mx-auto leading-relaxed">
          Your courses will appear here once your center admin assigns them.
          Usually within a day of joining.
        </p>
        <div className="flex gap-2 justify-center mt-4 flex-wrap">
          <a
            href="mailto:training@pepschoolv2.com"
            className="inline-flex items-center px-3 py-1.5 rounded-md bg-ink text-paper text-[13px] font-medium hover:opacity-90"
          >
            Email training
          </a>
        </div>
      </div>
      <div className="mt-4">
        <Stickie>
          Once assigned, you can always pick up where you left off from this page.
        </Stickie>
      </div>
    </PaperCard>
  );
}
