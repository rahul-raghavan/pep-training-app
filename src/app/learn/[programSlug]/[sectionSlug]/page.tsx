'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Trainee, Progress, Response as ResponseType, Exercise, ContentBlock as ContentBlockType } from '@/content/types';
import ContentBlock from '@/components/ContentBlock';
import MultipleChoice from '@/components/MultipleChoice';
import ShortAnswerInput from '@/components/ShortAnswerInput';
import VoiceRecorder from '@/components/VoiceRecorder';
import { PageShell, TopBar, Pill, Stickie } from '@/components/paper';

interface SectionData {
  id: string;
  slug: string;
  title: string;
  estimatedMinutes: number;
  index: number;
  totalSections: number;
}

interface SectionStub {
  id: string;
  slug: string;
  title: string;
  estimatedMinutes: number;
}

interface ProgramInfo {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  passing_score: number;
}

interface NavigationData {
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
}

type SectionState = 'done' | 'current' | 'open' | 'locked';

function classifySection(
  s: SectionStub,
  index: number,
  currentId: string,
  progress: Progress[]
): SectionState {
  const p = progress.find(x => x.section_id === s.id);
  if (s.id === currentId) return 'current';
  if (p?.status === 'completed') return 'done';
  if (p?.status === 'in_progress') return 'open';
  // Locked when prior section isn't completed (and not the first).
  if (index === 0) return 'open';
  return 'open';
}

function StateDot({ state, index }: { state: SectionState; index?: number }) {
  const cls = 'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0';
  if (state === 'done') {
    return <div className={`${cls} bg-good-soft text-good`}>✓</div>;
  }
  if (state === 'current') {
    return <div className={`${cls} bg-accent-soft text-[color:var(--accent)]`}>●</div>;
  }
  if (state === 'locked') {
    return <div className={`${cls} bg-paper-2 text-ink-3`}>✕</div>;
  }
  return <div className={`${cls} bg-paper-2 text-ink-3`}>{index !== undefined ? index + 1 : '○'}</div>;
}

export default function ProgramSectionPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const programSlug = params.programSlug as string;
  const sectionSlug = params.sectionSlug as string;

  const [trainee, setTrainee] = useState<Trainee | null>(null);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [responses, setResponses] = useState<ResponseType[]>([]);
  const [section, setSection] = useState<SectionData | null>(null);
  const [content, setContent] = useState<ContentBlockType[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [navigation, setNavigation] = useState<NavigationData>({ prev: null, next: null });
  const [allSections, setAllSections] = useState<SectionStub[]>([]);
  const [program, setProgram] = useState<ProgramInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      // Parallel: section-with-content + program outline (for left rail).
      const [sectionRes, contentRes] = await Promise.all([
        fetch(`/api/learn/section?programSlug=${programSlug}&sectionSlug=${sectionSlug}`),
        fetch(`/api/program-content?programSlug=${programSlug}`),
      ]);
      if (!sectionRes.ok) throw new Error('Section not found');

      const data = await sectionRes.json();
      setTrainee(data.trainee);
      setProgress(data.progress);
      setResponses(data.responses);
      setSection(data.section);
      setContent(data.content);
      setExercises(data.exercises);
      setNavigation(data.navigation);

      const completed = new Set<string>();
      data.responses.forEach((r: ResponseType) => completed.add(r.exercise_id));
      setCompletedExercises(completed);

      if (contentRes.ok) {
        const cd = await contentRes.json();
        setProgram(cd.program);
        setAllSections(
          (cd.sections || []).map((s: { id: string; slug: string; title: string; estimatedMinutes: number }) => ({
            id: s.id,
            slug: s.slug,
            title: s.title,
            estimatedMinutes: s.estimatedMinutes,
          }))
        );
      }
    } catch {
      setError('Section not found');
    } finally {
      setLoading(false);
    }
  }, [programSlug, sectionSlug]);

  useEffect(() => {
    if (!authLoading && user) fetchData();
  }, [authLoading, user, fetchData]);

  // Mark in_progress on first view
  useEffect(() => {
    if (trainee && section) {
      const cur = progress.find(p => p.section_id === section.id);
      if (!cur || cur.status === 'not_started') {
        fetch('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            traineeId: trainee.id,
            sectionId: section.id,
            status: 'in_progress',
          }),
        });
      }
    }
  }, [trainee, section, progress]);

  const handleExerciseComplete = async (
    exerciseId: string,
    exerciseType: string,
    responseText: string,
    correct?: boolean
  ) => {
    if (!trainee || !section) return;
    const res = await fetch('/api/progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        traineeId: trainee.id,
        sectionId: section.id,
        exerciseId,
        exerciseType,
        responseText,
        correct,
      }),
    });
    if (!res.ok) throw new Error('Failed to save exercise response');
    const { response: newResponse } = await res.json();
    if (newResponse) setResponses(prev => [...prev, newResponse]);
    setCompletedExercises(prev => new Set([...prev, exerciseId]));
  };

  const handleVoiceComplete = (exerciseId: string) => {
    setCompletedExercises(prev => new Set([...prev, exerciseId]));
  };

  const markSectionComplete = async () => {
    if (!trainee || !section) return;
    await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        traineeId: trainee.id,
        sectionId: section.id,
        status: 'completed',
      }),
    });
    if (navigation.next) {
      router.push(`/learn/${programSlug}/${navigation.next.slug}`);
    } else {
      router.push(`/learn/${programSlug}`);
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

  if (error || !trainee || !section) {
    return (
      <PageShell maxWidth={520}>
        <div className="text-center mt-12 border border-ink-2 rounded bg-paper p-6 shadow-[2px_2px_0_rgba(0,0,0,0.08)]">
          <h1 className="text-[20px] font-semibold tracking-tight">Section not found</h1>
          <p className="text-ink-2 mt-2 mb-4">
            This section doesn&apos;t exist or you don&apos;t have access to it.
          </p>
          <Link href={`/learn/${programSlug}`} className="text-accent underline">
            Return to course
          </Link>
        </div>
      </PageShell>
    );
  }

  const allExercisesComplete = exercises.every(ex => completedExercises.has(ex.id));
  const currentSectionProgress = progress.find(p => p.section_id === section.id);
  const isAlreadyComplete = currentSectionProgress?.status === 'completed';

  const getExerciseResponses = (exerciseId: string) =>
    responses.filter(r => r.section_id === section.id && r.exercise_id === exerciseId);
  const wasEverCorrect = (exerciseId: string) =>
    getExerciseResponses(exerciseId).some(r => r.correct === true);
  const countCorrectAttempts = (exerciseId: string) =>
    getExerciseResponses(exerciseId).filter(r => r.correct === true).length;

  const exerciseCount = exercises.length;
  const completedExerciseCount = exercises.filter(ex => completedExercises.has(ex.id)).length;
  const itemsTotal = content.length + exerciseCount;
  const itemsDone = (isAlreadyComplete ? content.length : Math.min(content.length, 0)) + completedExerciseCount;

  return (
    <PageShell maxWidth={1240}>
      <TopBar
        right={
          <span>
            {program?.title && <span>{program.title} · </span>}
            <span>{user?.email}</span>
          </span>
        }
      />

      {/* breadcrumbs + section title + status, all in one row */}
      <div className="flex items-baseline gap-3 mt-2 mb-1.5 flex-wrap">
        <Link href={`/learn/${programSlug}`} className="text-[13px] text-ink-2 hover:text-ink">
          ← {program?.title ?? 'Course'}
        </Link>
        <span className="text-ink-3">/</span>
        <h1 className="text-[22px] font-semibold tracking-tight leading-tight">{section.title}</h1>
        <Pill kind={isAlreadyComplete ? 'good' : 'accent'}>
          {isAlreadyComplete ? 'Completed' : 'In progress'}
        </Pill>
      </div>
      <div className="text-[12px] text-ink-3 mb-3">
        Section {section.index + 1} of {section.totalSections} · ~{section.estimatedMinutes} min
        {itemsTotal > 0 && ` · ${itemsDone} of ${itemsTotal} items done`}
      </div>

      {/* 2-col layout: left rail + main */}
      <div className="grid lg:grid-cols-[260px_1fr] gap-5 items-start">
        {/* LEFT — outline */}
        <aside className="border border-rule rounded-lg bg-paper px-1 lg:sticky lg:top-4 self-start shadow-sm">
          <div className="text-[11px] uppercase tracking-wide font-medium text-ink-2 px-2 pt-3 pb-2">Outline</div>
          {allSections.map((s, i) => {
            const st = classifySection(s, i, section.id, progress);
            return (
              <Link
                key={s.id}
                href={`/learn/${programSlug}/${s.slug}`}
                className={`block ${i < allSections.length - 1 ? 'border-b border-rule' : ''}`}
              >
                <div
                  className={`flex items-center gap-3 py-2.5 px-2.5 transition-colors hover:bg-paper-2/40 ${
                    st === 'current' ? 'bg-accent-soft' : ''
                  }`}
                >
                  <StateDot state={st} index={i} />
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-[14px] font-medium leading-snug truncate"
                      style={{ color: st === 'locked' ? 'var(--ink-3)' : 'var(--ink)' }}
                    >
                      {s.title}
                    </div>
                    <div className="text-[11px] text-ink-3 mt-0.5">
                      {s.estimatedMinutes} min
                    </div>
                  </div>
                  {st === 'current' && <Pill kind="accent">Now</Pill>}
                </div>
              </Link>
            );
          })}
          <div className="px-2 py-2.5 flex gap-3 text-[11px] text-ink-3 flex-wrap border-t border-rule">
            <span>Reading</span>
            <span>·</span>
            <span>MCQ</span>
            <span>·</span>
            <span>Voice</span>
          </div>
        </aside>

        {/* RIGHT — content + exercises */}
        <main>
          {/* Content */}
          {content.length > 0 && (
            <div className="space-y-2">
              {content.map((block, i) => (
                <ContentBlock key={i} block={block} />
              ))}
            </div>
          )}

          {/* Exercises */}
          {exercises.length > 0 && (
            <div className="mt-8 pt-5 border-t border-rule">
              <h3 className="text-[18px] font-semibold tracking-tight mb-3">Exercises</h3>
              {exercises.map((exercise: Exercise) => {
                if (exercise.type === 'multiple_choice') {
                  const previousResponses = getExerciseResponses(exercise.id);
                  return (
                    <MultipleChoice
                      key={exercise.id}
                      exercise={exercise}
                      onComplete={(correct, selectedIndex) =>
                        handleExerciseComplete(exercise.id, 'multiple_choice', String(selectedIndex), correct).catch(() => {})
                      }
                      previousAttempts={previousResponses.length}
                      previouslyCorrect={wasEverCorrect(exercise.id)}
                      correctAttempts={countCorrectAttempts(exercise.id)}
                    />
                  );
                }
                if (exercise.type === 'voice') {
                  const voiceAttempts = getExerciseResponses(exercise.id).map(r => ({
                    transcription: r.response_text || '',
                    feedback: r.ai_feedback || '',
                    score: r.ai_score ?? null,
                    audioUrl: r.audio_url,
                    createdAt: r.created_at,
                  }));
                  return (
                    <VoiceRecorder
                      key={exercise.id}
                      exercise={exercise}
                      traineeId={trainee.id}
                      sectionId={section.id}
                      onComplete={() => handleVoiceComplete(exercise.id)}
                      previousAttempts={voiceAttempts}
                    />
                  );
                }
                if (exercise.type === 'short_answer') {
                  const shortAnswerAttempts = getExerciseResponses(exercise.id).map(r => ({
                    responseText: r.response_text || '',
                    createdAt: r.created_at,
                  }));
                  return (
                    <ShortAnswerInput
                      key={exercise.id}
                      exercise={exercise}
                      onComplete={responseText =>
                        handleExerciseComplete(exercise.id, 'short_answer', responseText)
                      }
                      previousAttempts={shortAnswerAttempts}
                    />
                  );
                }
                return null;
              })}
            </div>
          )}

          {/* Navigation */}
          <div className="mt-7 pt-5 border-t border-rule flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 flex-wrap">
            {navigation.prev ? (
              <Link
                href={`/learn/${programSlug}/${navigation.prev.slug}`}
                className="text-[13px] flex items-center gap-1.5 text-ink-2 hover:text-ink"
              >
                <span>←</span> Previous · {navigation.prev.title}
              </Link>
            ) : (
              <span />
            )}

            <span className="text-[12px] text-ink-2 hidden sm:inline">
              <span className="kbd">←</span> / <span className="kbd">→</span> to navigate
            </span>

            {!isAlreadyComplete ? (
              <button
                onClick={markSectionComplete}
                disabled={!allExercisesComplete}
                className={`text-[13px] font-medium rounded-md px-4 py-2 transition-colors ${
                  allExercisesComplete
                    ? 'bg-ink text-paper hover:opacity-90'
                    : 'bg-paper-2 text-ink-3 cursor-not-allowed'
                }`}
              >
                {navigation.next ? `Complete & continue →` : 'Finish course →'}
              </button>
            ) : navigation.next ? (
              <Link
                href={`/learn/${programSlug}/${navigation.next.slug}`}
                className="text-[13px] font-medium rounded-md px-4 py-2 bg-ink text-paper hover:opacity-90"
              >
                Next: {navigation.next.title} →
              </Link>
            ) : (
              <Link
                href={`/learn/${programSlug}`}
                className="text-[13px] font-medium rounded-md px-4 py-2 text-good border"
                style={{ background: 'var(--good-soft)', borderColor: '#86efac' }}
              >
                View course summary →
              </Link>
            )}
          </div>

          {!allExercisesComplete && !isAlreadyComplete && exercises.length > 0 && (
            <p className="mt-3 text-[12px] text-ink-2 text-center">
              Complete all exercises above to continue.
            </p>
          )}

          {exercises.some(ex => ex.type === 'voice') && (
            <div className="mt-5">
              <Stickie>
                Re-attempts are always allowed. Your last attempt&apos;s feedback shows below the recorder.
              </Stickie>
            </div>
          )}
        </main>
      </div>
    </PageShell>
  );
}
