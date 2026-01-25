'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import FeedbackDisplay from '@/components/FeedbackDisplay';

interface ExerciseAttempt {
  transcription?: string;
  audioUrl?: string;
  feedback?: string;
  score?: number;
  correct?: boolean;
  createdAt: string;
}

interface ExerciseSummary {
  exerciseId: string;
  exerciseType: string;
  questionText?: string;
  attempts: ExerciseAttempt[];
}

interface SectionSummary {
  id: string;
  title: string;
  status: 'not_started' | 'in_progress' | 'completed';
  startedAt?: string;
  completedAt?: string;
  avgScore: number | null;
  needsAttention: boolean;
  exercises: ExerciseSummary[];
  totalResponses: number;
}

interface AssessmentAttempt {
  id: string;
  score: number;
  total: number;
  answers: Record<string, number>;
  created_at: string;
}

interface TraineeDetail {
  trainee: {
    id: string;
    name: string;
    email?: string;
    access_token: string;
    created_at: string;
    last_active_at?: string;
  };
  sections: SectionSummary[];
  assessmentAttempts: AssessmentAttempt[];
  stats: {
    completedSections: number;
    totalSections: number;
    progressPercent: number;
    overallAvgScore: number | null;
    totalResponses: number;
    sectionsNeedingAttention: number;
    assessmentAttempts: number;
    bestAssessmentScore: number | null;
  };
}

export default function TraineeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const traineeId = params.id as string;

  const [data, setData] = useState<TraineeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/manager/trainee/${traineeId}`);
        if (res.status === 401) {
          router.push('/manager');
          return;
        }
        if (!res.ok) throw new Error('Failed to fetch');
        const result = await res.json();
        setData(result);
      } catch {
        alert('Failed to load trainee data');
        router.push('/manager/dashboard');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [traineeId, router]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const copyTrainingLink = () => {
    if (data) {
      const link = `${window.location.origin}/train/${data.trainee.access_token}`;
      navigator.clipboard.writeText(link);
      alert('Training link copied!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const { trainee, sections, assessmentAttempts, stats } = data;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link href="/manager/dashboard" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">{trainee.name}</h1>
              <p className="text-slate-600">{trainee.email || 'No email provided'}</p>
            </div>
            <button
              onClick={copyTrainingLink}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              Copy training link
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-sm text-slate-500">Progress</div>
            <div className="text-2xl font-semibold text-slate-900">{stats.progressPercent}%</div>
            <div className="text-xs text-slate-500">{stats.completedSections}/{stats.totalSections} sections</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-sm text-slate-500">Avg Score</div>
            <div className={`text-2xl font-semibold ${
              stats.overallAvgScore === null ? 'text-slate-400' :
              stats.overallAvgScore >= 4 ? 'text-green-600' :
              stats.overallAvgScore >= 3 ? 'text-amber-600' : 'text-red-600'
            }`}>
              {stats.overallAvgScore !== null ? `${stats.overallAvgScore}/5` : 'N/A'}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-sm text-slate-500">Responses</div>
            <div className="text-2xl font-semibold text-slate-900">{stats.totalResponses}</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-sm text-slate-500">Assessment</div>
            <div className={`text-2xl font-semibold ${
              stats.bestAssessmentScore === null ? 'text-slate-400' :
              stats.bestAssessmentScore >= 12 ? 'text-green-600' :
              stats.bestAssessmentScore >= 10 ? 'text-amber-600' : 'text-red-600'
            }`}>
              {stats.bestAssessmentScore !== null ? `${stats.bestAssessmentScore}/15` : 'N/A'}
            </div>
            <div className="text-xs text-slate-500">{stats.assessmentAttempts} attempt{stats.assessmentAttempts !== 1 ? 's' : ''}</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-sm text-slate-500">Needs Attention</div>
            <div className={`text-2xl font-semibold ${stats.sectionsNeedingAttention > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {stats.sectionsNeedingAttention}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-8">
          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="text-slate-500">Started:</span>{' '}
              <span className="text-slate-900">{formatDate(trainee.created_at)}</span>
            </div>
            <div>
              <span className="text-slate-500">Last active:</span>{' '}
              <span className="text-slate-900">{formatDate(trainee.last_active_at)}</span>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h2 className="font-medium text-slate-900">Section Progress</h2>
          </div>

          <div className="divide-y divide-slate-100">
            {sections.map((section) => (
              <div key={section.id}>
                {/* Section header */}
                <button
                  onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      section.status === 'completed'
                        ? 'bg-green-100 text-green-600'
                        : section.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                      {section.status === 'completed' ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span className="text-xs">{sections.indexOf(section) + 1}</span>
                      )}
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-slate-900 flex items-center gap-2">
                        {section.title}
                        {section.needsAttention && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                            Needs attention
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-500">
                        {section.totalResponses} responses • {section.exercises.length} exercises
                        {section.avgScore !== null && ` • Avg: ${section.avgScore}/5`}
                      </div>
                    </div>
                  </div>
                  <svg
                    className={`w-5 h-5 text-slate-400 transition-transform ${expandedSection === section.id ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Expanded content */}
                {expandedSection === section.id && section.exercises.length > 0 && (
                  <div className="px-4 pb-4">
                    <div className="ml-12 space-y-4">
                      {section.exercises.map((exercise) => (
                        <div key={exercise.exerciseId} className="space-y-2">
                          {/* Exercise question/scenario header */}
                          {exercise.questionText && (
                            <div className="bg-white border border-slate-200 rounded-lg p-3 mb-2">
                              <div className="text-xs text-slate-500 mb-1">
                                {exercise.exerciseType === 'voice' ? 'Scenario:' : 'Question:'}
                              </div>
                              <p className="text-sm text-slate-800 italic">
                                {exercise.exerciseType === 'voice' ? `"${exercise.questionText}"` : exercise.questionText}
                              </p>
                            </div>
                          )}

                          {exercise.attempts.length === 0 ? (
                            <div className="bg-slate-50 rounded-lg p-4 text-center">
                              <span className="text-sm text-slate-400">
                                {exercise.exerciseType === 'voice' ? 'Voice Exercise' : 'Knowledge Check'} — No attempts yet
                              </span>
                            </div>
                          ) : (
                            <>
                              {exercise.attempts.length > 1 && (
                                <div className="text-xs text-slate-500 font-medium">
                                  {exercise.exerciseType === 'voice' ? 'Voice Exercise' : 'Knowledge Check'} — {exercise.attempts.length} attempts
                                </div>
                              )}
                              {exercise.attempts.map((attempt, attemptIdx) => (
                                <div key={attemptIdx} className="bg-slate-50 rounded-lg p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-slate-700">
                                        {exercise.exerciseType === 'voice' ? 'Voice Exercise' : 'Knowledge Check'}
                                        {exercise.attempts.length > 1 && (
                                          <span className="text-slate-400 font-normal"> (Attempt {attemptIdx + 1})</span>
                                        )}
                                      </span>
                                      <span className="text-xs text-slate-400">
                                        {new Date(attempt.createdAt).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </span>
                                    </div>
                                    {exercise.exerciseType === 'multiple_choice' && attempt.correct !== undefined && (
                                      <span className={`text-sm font-medium px-2 py-1 rounded ${
                                        attempt.correct
                                          ? 'bg-green-100 text-green-700'
                                          : 'bg-red-100 text-red-700'
                                      }`}>
                                        {attempt.correct ? 'Correct' : 'Incorrect'}
                                      </span>
                                    )}
                                    {exercise.exerciseType === 'voice' && attempt.score !== undefined && (
                                      <span className={`text-sm font-medium ${
                                        attempt.score >= 4 ? 'text-green-600' :
                                        attempt.score >= 3 ? 'text-amber-600' : 'text-red-600'
                                      }`}>
                                        {attempt.score}/5
                                      </span>
                                    )}
                                  </div>

                                  {attempt.transcription && (
                                    <div className="mb-3">
                                      <div className="text-xs text-slate-500 mb-1">Response:</div>
                                      <p className="text-sm text-slate-700 bg-white p-2 rounded border border-slate-200">{attempt.transcription}</p>
                                    </div>
                                  )}

                                  {attempt.audioUrl && (
                                    <div className="mb-3">
                                      <div className="text-xs text-slate-500 mb-1">Recording:</div>
                                      <audio src={attempt.audioUrl} controls className="w-full h-8" />
                                    </div>
                                  )}

                                  {attempt.feedback && (
                                    <FeedbackDisplay
                                      feedback={attempt.feedback}
                                      score={attempt.score}
                                      compact
                                    />
                                  )}
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Assessment Attempts */}
        <div className="bg-white rounded-lg border border-slate-200 mt-8">
          <div className="p-4 border-b border-slate-200">
            <h2 className="font-medium text-slate-900">Final Assessment Attempts</h2>
          </div>

          {assessmentAttempts.length === 0 ? (
            <div className="p-6 text-center text-slate-500">
              {stats.progressPercent === 100
                ? 'No assessment attempts yet'
                : 'Assessment unlocks after completing all modules'}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {assessmentAttempts.map((attempt, index) => {
                const passed = attempt.score >= 12;
                const percentage = Math.round((attempt.score / attempt.total) * 100);

                return (
                  <div key={attempt.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          passed ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {passed ? (
                            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">
                            Attempt {assessmentAttempts.length - index}
                            {index === 0 && assessmentAttempts.length > 1 && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                Most Recent
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-slate-500">
                            {formatDate(attempt.created_at)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xl font-semibold ${
                          passed ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {attempt.score}/{attempt.total}
                        </div>
                        <div className={`text-sm ${passed ? 'text-green-600' : 'text-red-600'}`}>
                          {percentage}% — {passed ? 'Passed' : 'Not Passed'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
