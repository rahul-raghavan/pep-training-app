'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { sections, getSection, getNextSection, getPreviousSection } from '@/content/sections';
import { Trainee, Progress, Response as ResponseType, Exercise } from '@/content/types';
import ContentBlock from '@/components/ContentBlock';
import MultipleChoice from '@/components/MultipleChoice';
import VoiceRecorder from '@/components/VoiceRecorder';

export default function SectionPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const sectionId = params.section as string;

  const [trainee, setTrainee] = useState<Trainee | null>(null);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [responses, setResponses] = useState<ResponseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());

  const section = getSection(sectionId);
  const nextSection = getNextSection(sectionId);
  const prevSection = getPreviousSection(sectionId);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/trainee?token=${token}`);
      if (!res.ok) throw new Error('Invalid link');
      const data = await res.json();
      setTrainee(data.trainee);
      setProgress(data.progress);
      setResponses(data.responses);

      // Build set of completed exercises
      const completed = new Set<string>();
      data.responses.forEach((r: ResponseType) => {
        if (r.section_id === sectionId) {
          completed.add(r.exercise_id);
        }
      });
      setCompletedExercises(completed);
    } catch {
      setError('Invalid link');
    } finally {
      setLoading(false);
    }
  }, [token, sectionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Mark section as in_progress when first viewed
  useEffect(() => {
    if (trainee && section) {
      const currentProgress = progress.find(p => p.section_id === sectionId);
      if (!currentProgress || currentProgress.status === 'not_started') {
        fetch('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            traineeId: trainee.id,
            sectionId,
            status: 'in_progress',
          }),
        });
      }
    }
  }, [trainee, section, sectionId, progress]);

  const handleExerciseComplete = async (exerciseId: string, exerciseType: string, responseText: string, correct?: boolean) => {
    if (!trainee) return;

    // Store response
    await fetch('/api/progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        traineeId: trainee.id,
        sectionId,
        exerciseId,
        exerciseType,
        responseText,
        correct,
      }),
    });

    setCompletedExercises(prev => new Set([...prev, exerciseId]));
  };

  const handleVoiceComplete = (exerciseId: string) => {
    setCompletedExercises(prev => new Set([...prev, exerciseId]));
  };

  const markSectionComplete = async () => {
    if (!trainee) return;

    await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        traineeId: trainee.id,
        sectionId,
        status: 'completed',
      }),
    });

    if (nextSection) {
      router.push(`/train/${token}/${nextSection.id}`);
    } else {
      router.push(`/train/${token}`);
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
          <Link href={`/train/${token}`} className="text-blue-600 hover:text-blue-800">
            Return to dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Check if all exercises are complete
  const allExercisesComplete = section.exercises.every(ex => completedExercises.has(ex.id));
  const currentSectionProgress = progress.find(p => p.section_id === sectionId);
  const isAlreadyComplete = currentSectionProgress?.status === 'completed';

  // Find existing responses for this section
  const getExistingResponse = (exerciseId: string) => {
    return responses.find(r => r.section_id === sectionId && r.exercise_id === exerciseId);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link href={`/train/${token}`} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to dashboard
              </Link>
              <h1 className="text-lg font-semibold text-slate-900 mt-1">{section.title}</h1>
            </div>
            <div className="text-sm text-slate-500">
              {sections.findIndex(s => s.id === sectionId) + 1} of {sections.length}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg border border-slate-200 p-6 md:p-8">
          {/* Estimated time */}
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Estimated time: {section.estimatedMinutes} minutes
          </div>

          {/* Content blocks */}
          <div className="space-y-6">
            {section.content.map((block, index) => (
              <ContentBlock key={index} block={block} />
            ))}
          </div>

          {/* Exercises */}
          {section.exercises.length > 0 && (
            <div className="mt-12 pt-8 border-t border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900 mb-6">Exercises</h2>

              {section.exercises.map((exercise: Exercise) => {
                const existingResponse = getExistingResponse(exercise.id);
                const isComplete = completedExercises.has(exercise.id);

                if (exercise.type === 'multiple_choice') {
                  return (
                    <MultipleChoice
                      key={exercise.id}
                      exercise={exercise}
                      onComplete={(correct) => {
                        handleExerciseComplete(
                          exercise.id,
                          'multiple_choice',
                          exercise.options[correct ? exercise.correctIndex : -1] || '',
                          correct
                        );
                      }}
                      disabled={isComplete || isAlreadyComplete}
                    />
                  );
                }

                if (exercise.type === 'voice') {
                  return (
                    <VoiceRecorder
                      key={exercise.id}
                      exercise={exercise}
                      traineeId={trainee.id}
                      sectionId={sectionId}
                      onComplete={() => handleVoiceComplete(exercise.id)}
                      existingResponse={existingResponse ? {
                        transcription: existingResponse.response_text || '',
                        feedback: existingResponse.ai_feedback || '',
                        score: existingResponse.ai_score || 0,
                        audioUrl: existingResponse.audio_url,
                      } : undefined}
                    />
                  );
                }

                return null;
              })}
            </div>
          )}

          {/* Navigation */}
          <div className="mt-12 pt-8 border-t border-slate-200 flex items-center justify-between">
            {prevSection ? (
              <Link
                href={`/train/${token}/${prevSection.id}`}
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
                {nextSection ? 'Complete & Continue' : 'Complete Training'}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : nextSection ? (
              <Link
                href={`/train/${token}/${nextSection.id}`}
                className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
              >
                Next Section
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <Link
                href={`/train/${token}`}
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
