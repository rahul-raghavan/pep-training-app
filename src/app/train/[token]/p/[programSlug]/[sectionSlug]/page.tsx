'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trainee, Progress, Response as ResponseType, Exercise, ContentBlock as ContentBlockType } from '@/content/types';
import ContentBlock from '@/components/ContentBlock';
import MultipleChoice from '@/components/MultipleChoice';
import VoiceRecorder from '@/components/VoiceRecorder';

interface SectionData {
  id: string;
  slug: string;
  title: string;
  estimatedMinutes: number;
  index: number;
  totalSections: number;
}

interface NavigationData {
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
}

export default function ProgramSectionPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const programSlug = params.programSlug as string;
  const sectionSlug = params.sectionSlug as string;

  const [trainee, setTrainee] = useState<Trainee | null>(null);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [responses, setResponses] = useState<ResponseType[]>([]);
  const [section, setSection] = useState<SectionData | null>(null);
  const [content, setContent] = useState<ContentBlockType[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [navigation, setNavigation] = useState<NavigationData>({ prev: null, next: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      // Fetch trainee data and program content in parallel
      const [traineeRes, contentRes] = await Promise.all([
        fetch(`/api/trainee?token=${token}`),
        fetch(`/api/program-content?programSlug=${programSlug}&sectionSlug=${sectionSlug}`),
      ]);

      if (!traineeRes.ok) throw new Error('Invalid link');
      if (!contentRes.ok) throw new Error('Section not found');

      const [traineeData, contentData] = await Promise.all([
        traineeRes.json(),
        contentRes.json(),
      ]);

      setTrainee(traineeData.trainee);
      setProgress(traineeData.progress);
      setResponses(traineeData.responses);
      setSection(contentData.section);
      setContent(contentData.content);
      setExercises(contentData.exercises);
      setNavigation(contentData.navigation);

      // Build set of completed exercises
      const completed = new Set<string>();
      traineeData.responses.forEach((r: ResponseType) => {
        if (r.section_id === contentData.section.id) {
          completed.add(r.exercise_id);
        }
      });
      setCompletedExercises(completed);
    } catch {
      setError('Section not found');
    } finally {
      setLoading(false);
    }
  }, [token, programSlug, sectionSlug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Mark section as in_progress when first viewed
  useEffect(() => {
    if (trainee && section) {
      const currentProgress = progress.find(p => p.section_id === section.id);
      if (!currentProgress || currentProgress.status === 'not_started') {
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

  const handleExerciseComplete = async (exerciseId: string, exerciseType: string, responseText: string, correct?: boolean) => {
    if (!trainee || !section) return;

    await fetch('/api/progress', {
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

    setCompletedExercises(prev => new Set([...prev, exerciseId]));
    await fetchData();
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
      router.push(`/train/${token}/p/${programSlug}/${navigation.next.slug}`);
    } else {
      router.push(`/train/${token}/p/${programSlug}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !trainee || !section) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Section Not Found</h1>
          <p className="text-slate-600 mb-4">This section doesn&apos;t exist or you don&apos;t have access to it.</p>
          <Link href={`/train/${token}/p/${programSlug}`} className="text-blue-600 hover:text-blue-800">
            Return to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const allExercisesComplete = exercises.every(ex => completedExercises.has(ex.id));
  const currentSectionProgress = progress.find(p => p.section_id === section.id);
  const isAlreadyComplete = currentSectionProgress?.status === 'completed';

  const getExerciseResponses = (exerciseId: string) => {
    return responses.filter(r => r.section_id === section.id && r.exercise_id === exerciseId);
  };

  const wasEverCorrect = (exerciseId: string) => {
    return getExerciseResponses(exerciseId).some(r => r.correct === true);
  };

  const countCorrectAttempts = (exerciseId: string) => {
    return getExerciseResponses(exerciseId).filter(r => r.correct === true).length;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link href={`/train/${token}/p/${programSlug}`} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to dashboard
              </Link>
              <h1 className="text-lg font-semibold text-slate-900 mt-1">{section.title}</h1>
            </div>
            <div className="text-sm text-slate-500">
              {section.index + 1} of {section.totalSections}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg border border-slate-200 p-6 md:p-8">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Estimated time: {section.estimatedMinutes} minutes
          </div>

          <div className="space-y-6">
            {content.map((block, index) => (
              <ContentBlock key={index} block={block} />
            ))}
          </div>

          {exercises.length > 0 && (
            <div className="mt-12 pt-8 border-t border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900 mb-6">Exercises</h2>

              {exercises.map((exercise: Exercise) => {
                if (exercise.type === 'multiple_choice') {
                  const previousResponses = getExerciseResponses(exercise.id);
                  return (
                    <MultipleChoice
                      key={exercise.id}
                      exercise={exercise}
                      onComplete={(correct, selectedIndex) => {
                        handleExerciseComplete(
                          exercise.id,
                          'multiple_choice',
                          String(selectedIndex),
                          correct
                        );
                      }}
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
                    score: r.ai_score || 0,
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

                return null;
              })}
            </div>
          )}

          {/* Navigation */}
          <div className="mt-12 pt-8 border-t border-slate-200 flex items-center justify-between">
            {navigation.prev ? (
              <Link
                href={`/train/${token}/p/${programSlug}/${navigation.prev.slug}`}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </Link>
            ) : (
              <div />
            )}

            {!isAlreadyComplete ? (
              <button
                onClick={markSectionComplete}
                disabled={!allExercisesComplete}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                  allExercisesComplete
                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                {navigation.next ? 'Complete & Continue' : 'Complete Training'}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : navigation.next ? (
              <Link
                href={`/train/${token}/p/${programSlug}/${navigation.next.slug}`}
                className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
              >
                Next Section
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <Link
                href={`/train/${token}/p/${programSlug}`}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                View Summary
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </Link>
            )}
          </div>

          {!allExercisesComplete && !isAlreadyComplete && (
            <p className="mt-4 text-sm text-slate-500 text-center">
              Complete all exercises above to continue to the next section.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
