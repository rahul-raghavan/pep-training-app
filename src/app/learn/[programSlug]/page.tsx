'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Trainee, Progress } from '@/content/types';
import { PageShell, TopBar, PaperCard, Ring, Stickie } from '@/components/paper';

interface ProgramInfo {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  passing_score: number;
}

interface SectionInfo {
  id: string;
  slug: string;
  title: string;
  estimatedMinutes: number;
}

interface PrerequisiteInfo {
  slug: string;
  title: string;
  enrolled: boolean;
  passed: boolean;
}

export default function ProgramDashboard() {
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const programSlug = params.programSlug as string;

  const [trainee, setTrainee] = useState<Trainee | null>(null);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [program, setProgram] = useState<ProgramInfo | null>(null);
  const [sections, setSections] = useState<SectionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lockedPrerequisite, setLockedPrerequisite] = useState<PrerequisiteInfo | null>(null);
  const [assessmentPassed, setAssessmentPassed] = useState(false);
  const [bestScore, setBestScore] = useState<{ score: number; total: number } | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [traineeRes, programRes] = await Promise.all([
          fetch('/api/trainee?include=progress'),
          fetch(`/api/program-content?programSlug=${programSlug}`),
        ]);

        if (!traineeRes.ok) throw new Error('Could not load your training data');

        const traineeData = await traineeRes.json();
        if (programRes.status === 423) {
          const lockData = await programRes.json();
          setTrainee(traineeData.trainee);
          setProgress(traineeData.progress);
          setLockedPrerequisite(lockData.prerequisite || null);
          return;
        }
        if (!programRes.ok) throw new Error('Program not found');

        const programData = await programRes.json();

        setTrainee(traineeData.trainee);
        setProgress(traineeData.progress);
        setProgram(programData.program);
        setSections(programData.sections);

        const attemptsRes = await fetch(
          `/api/assessment?traineeId=${traineeData.trainee.id}&programId=${programData.program.id}`
        );
        if (attemptsRes.ok) {
          const attemptsData = await attemptsRes.json();
          const attempts = attemptsData.attempts || [];
          const passingScore = programData.program.passing_score || 80;

          let best: { score: number; total: number } | null = null;
          for (const a of attempts) {
            if (!best || a.score > best.score) best = { score: a.score, total: a.total };
          }
          if (best) {
            setBestScore(best);
            if ((best.score / best.total) * 100 >= passingScore) setAssessmentPassed(true);
          }
        }
      } catch {
        setError("This program was not found or you don't have access.");
      } finally {
        setLoading(false);
      }
    }
    if (!authLoading && user) fetchData();
  }, [authLoading, user, programSlug]);

  if (authLoading || loading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-rule border-t-ink rounded-full animate-spin" />
        </div>
      </PageShell>
    );
  }

  if (lockedPrerequisite && trainee) {
    return (
      <PageShell maxWidth={560}>
        <TopBar />
        <PaperCard className="mt-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-paper-2 border border-rule flex items-center justify-center text-ink-3 mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-[20px] font-semibold tracking-tight">Course locked</h1>
          <p className="text-[14px] text-ink-2 mt-2 max-w-sm mx-auto">
            Pass <b>{lockedPrerequisite.title}</b> to unlock this course.
          </p>
          <div className="flex justify-center gap-2 mt-5">
            {lockedPrerequisite.enrolled ? (
              <Link
                href={`/learn/${lockedPrerequisite.slug}`}
                className="inline-flex items-center px-3 py-1.5 rounded-md bg-ink text-paper text-[13px] font-medium hover:opacity-90"
              >
                Go to prerequisite →
              </Link>
            ) : (
              <Link
                href="/learn"
                className="inline-flex items-center px-3 py-1.5 rounded-md border border-rule text-[13px] hover:bg-paper-2"
              >
                Back to my training
              </Link>
            )}
          </div>
        </PaperCard>
      </PageShell>
    );
  }

  if (error || !trainee || !program) {
    return (
      <PageShell maxWidth={560}>
        <TopBar />
        <PaperCard className="mt-8 text-center">
          <h1 className="text-[20px] font-semibold tracking-tight">Not found</h1>
          <p className="text-ink-2 mt-2 text-[14px]">{error}</p>
          <Link href="/learn" className="text-accent underline mt-3 inline-block text-[14px]">
            Back to my training
          </Link>
        </PaperCard>
      </PageShell>
    );
  }

  const sectionProgress = sections.map(section => {
    const prog = progress.find(p => p.section_id === section.id);
    return {
      id: section.id,
      slug: section.slug,
      title: section.title,
      status: (prog?.status || 'not_started') as 'not_started' | 'in_progress' | 'completed',
      estimatedMinutes: section.estimatedMinutes,
    };
  });

  const completedCount = sectionProgress.filter(s => s.status === 'completed').length;
  const overallPct = sections.length > 0 ? Math.round((completedCount / sections.length) * 100) : 0;
  const totalMinutes = sections.reduce((sum, s) => sum + s.estimatedMinutes, 0);
  const completedMinutes = sectionProgress
    .filter(s => s.status === 'completed')
    .reduce((sum, s) => sum + s.estimatedMinutes, 0);
  const remainingMinutes = Math.max(0, totalMinutes - completedMinutes);

  const nextSection = sectionProgress.find(s => s.status !== 'completed');
  const allComplete = !nextSection;

  return (
    <PageShell maxWidth={1080}>
      <TopBar right={<span>{user?.email ?? ''}</span>} />

      {/* breadcrumbs + title */}
      <div className="flex items-baseline gap-2.5 flex-wrap mt-2 mb-2">
        <Link href="/learn" className="text-[13px] text-ink-2 hover:text-ink">
          ← Your courses
        </Link>
        <span className="text-ink-3">/</span>
        <h1 className="text-[22px] font-semibold tracking-tight">{program.title}</h1>
        <span className="ml-auto text-[12px] text-ink-3">
          {sections.length} sections · {totalMinutes} min total
        </span>
      </div>

      {program.description && (
        <p className="text-[14px] text-ink-2 leading-relaxed mb-5 max-w-2xl">
          {program.description}
        </p>
      )}

      {/* Hero stats */}
      <div className="grid sm:grid-cols-[1.4fr_1fr_1fr] gap-3 mb-6">
        <div
          className="border border-rule rounded-lg p-5 shadow-sm flex items-center gap-4"
          style={{ background: 'var(--accent-soft)' }}
        >
          <Ring pct={overallPct} size={56} />
          <div className="flex-1 min-w-0">
            <div className="text-[18px] font-semibold tracking-tight">
              {allComplete ? (assessmentPassed ? 'Done!' : 'Ready for the final') : `${overallPct}% done`}
            </div>
            <div className="text-[12px] text-ink-2 mt-0.5">
              {completedCount} of {sections.length} sections complete
            </div>
            {!allComplete && nextSection && (
              <Link
                href={`/learn/${programSlug}/${nextSection.slug}`}
                className="inline-flex items-center px-3 py-1.5 rounded-md bg-ink text-paper text-[13px] font-medium hover:opacity-90 mt-2.5"
              >
                {nextSection.status === 'in_progress' ? 'Continue' : 'Start'} →
              </Link>
            )}
            {allComplete && !assessmentPassed && (
              <Link
                href={`/learn/${programSlug}/assessment`}
                className="inline-flex items-center px-3 py-1.5 rounded-md bg-ink text-paper text-[13px] font-medium hover:opacity-90 mt-2.5"
              >
                Take final assessment →
              </Link>
            )}
          </div>
        </div>

        <div className="border border-rule rounded-lg p-5 shadow-sm bg-paper flex flex-col justify-center">
          <div className="text-[11px] uppercase tracking-wide text-ink-2 font-medium">Time left</div>
          <div className="text-[28px] font-semibold tracking-tight mt-1 leading-none">
            {remainingMinutes}
            <span className="text-[14px] font-normal text-ink-2 ml-1">min</span>
          </div>
          <div className="text-[12px] text-ink-2 mt-1">estimated</div>
        </div>

        <div className="border border-rule rounded-lg p-5 shadow-sm bg-paper flex flex-col justify-center">
          <div className="text-[11px] uppercase tracking-wide text-ink-2 font-medium">
            Final assessment
          </div>
          {assessmentPassed && bestScore ? (
            <>
              <div className="text-[24px] font-semibold tracking-tight mt-1 leading-none text-good">
                {bestScore.score}/{bestScore.total}
              </div>
              <div className="text-[12px] text-good mt-1">passed ✓</div>
            </>
          ) : (
            <>
              <div className="text-[20px] font-semibold tracking-tight mt-1 leading-none text-ink-2">
                {allComplete ? 'Ready' : 'Locked'}
              </div>
              <div className="text-[12px] text-ink-2 mt-1">
                pass at {program.passing_score}%
              </div>
            </>
          )}
        </div>
      </div>

      {/* Section list */}
      <div className="flex items-baseline gap-3 mb-3">
        <h2 className="text-[16px] font-semibold tracking-tight">Sections</h2>
        <span className="text-[12px] text-ink-3">
          {completedCount} of {sections.length} done
        </span>
      </div>

      <div className="border border-rule rounded-lg bg-paper overflow-hidden divide-y divide-rule">
        {sectionProgress.map((s, i) => {
          const accessible =
            i === 0 || sectionProgress[i - 1].status === 'completed' || s.status !== 'not_started';
          const inner = (
            <div
              className="px-4 py-3 flex items-center gap-3 transition-colors"
              style={{
                background: s.status === 'in_progress' ? 'var(--accent-soft)' : 'transparent',
              }}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold flex-shrink-0 ${
                  s.status === 'completed'
                    ? 'bg-good-soft text-good'
                    : s.status === 'in_progress'
                    ? 'bg-accent-soft text-[color:var(--accent)]'
                    : 'bg-paper-2 text-ink-3'
                }`}
              >
                {s.status === 'completed' ? '✓' : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={`text-[15px] font-medium leading-snug truncate ${
                    !accessible ? 'text-ink-3' : 'text-ink'
                  }`}
                >
                  {s.title}
                </div>
                <div className="text-[12px] text-ink-2 mt-0.5">{s.estimatedMinutes} min</div>
              </div>
              {accessible ? (
                <span
                  className={`text-[13px] font-medium ${
                    s.status === 'completed' ? 'text-ink-2' : 'text-accent'
                  }`}
                >
                  {s.status === 'completed' ? 'Review' : s.status === 'in_progress' ? 'Continue' : 'Start'}
                </span>
              ) : (
                <span className="text-[12px] text-ink-3">Locked</span>
              )}
            </div>
          );

          if (!accessible) return <div key={s.id}>{inner}</div>;
          return (
            <Link key={s.id} href={`/learn/${programSlug}/${s.slug}`} className="block hover:bg-paper-2/40">
              {inner}
            </Link>
          );
        })}
      </div>

      {assessmentPassed && bestScore && (
        <div
          className="mt-6 border rounded-lg p-5 flex items-center gap-4 shadow-sm"
          style={{ borderColor: '#86efac', background: 'var(--good-soft)' }}
        >
          <div className="w-14 h-14 border border-rule rounded-full bg-paper flex flex-col items-center justify-center flex-shrink-0">
            <span className="text-[20px] font-semibold leading-none text-good">{bestScore.score}</span>
            <span className="text-[10px] text-ink-2 mt-0.5">of {bestScore.total}</span>
          </div>
          <div className="flex-1">
            <div className="text-[18px] font-semibold tracking-tight">Program complete</div>
            <div className="text-[13px] text-ink-2 mt-1">
              You passed the final assessment. Sections stay open if you want to revisit anytime.
            </div>
          </div>
          <Link
            href={`/learn/${programSlug}/assessment`}
            className="inline-flex items-center px-3 py-1.5 rounded-md border border-rule bg-paper text-[13px] hover:bg-paper-2"
          >
            View results
          </Link>
        </div>
      )}

      {allComplete && !assessmentPassed && (
        <div className="mt-6">
          <Stickie>
            All sections done — final assessment is unlocked above.
          </Stickie>
        </div>
      )}
    </PageShell>
  );
}
