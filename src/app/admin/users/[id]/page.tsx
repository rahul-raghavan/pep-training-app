'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import ReactMarkdown from 'react-markdown';

interface TraineeDetail {
  name: string;
  email?: string;
  created_at: string;
  last_active_at?: string;
}

interface ExerciseAttempt {
  transcription: string | null;
  audioUrl: string | null;
  feedback: string | null;
  score: number | null;
  correct: boolean | null;
  createdAt: string;
}

interface ExerciseInfo {
  exerciseId: string;
  exerciseType: string;
  questionText: string;
  attempts: ExerciseAttempt[];
}

interface SectionInfo {
  id: string;
  title: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  avgScore: number | null;
  needsAttention: boolean;
  exercises: ExerciseInfo[];
  totalResponses: number;
}

interface AssessmentAttemptData {
  id: string;
  score: number;
  total: number;
  created_at: string;
}

interface StatsData {
  completedSections: number;
  totalSections: number;
  progressPercent: number;
  overallAvgScore: number | null;
  totalResponses: number;
  sectionsNeedingAttention: number;
  assessmentAttempts: number;
  bestAssessmentScore: number | null;
}

function FeedbackDisplay({ feedback, compact }: { feedback: string; score?: number | null; compact?: boolean }) {
  return (
    <div className={compact ? 'text-sm' : ''}>
      <div className="text-xs text-slate-500 mb-1">AI Feedback:</div>
      <div className="prose prose-sm max-w-none text-slate-700">
        <ReactMarkdown>{feedback}</ReactMarkdown>
      </div>
    </div>
  );
}

export default function UserDetailPage() {
  const { loading: authLoading } = useAuth('admin');
  const params = useParams();
  const traineeId = params.id as string;

  const [trainee, setTrainee] = useState<TraineeDetail | null>(null);
  const [sections, setSections] = useState<SectionInfo[]>([]);
  const [assessmentAttempts, setAssessmentAttempts] = useState<AssessmentAttemptData[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [programInfo, setProgramInfo] = useState<{ passingScore: number; totalAssessmentQuestions: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/manager/trainee/${traineeId}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setTrainee(data.trainee);
      setSections(data.sections);
      setAssessmentAttempts(data.assessmentAttempts);
      setStats(data.stats);
      if (data.programInfo) setProgramInfo(data.programInfo);
    } catch {
      // error handled by empty state
    } finally {
      setLoading(false);
    }
  }, [traineeId]);

  useEffect(() => {
    if (!authLoading) fetchData();
  }, [authLoading, fetchData]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!trainee || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-slate-900 mb-2">User Not Found</h1>
          <Link href="/admin/dashboard" className="text-blue-600 hover:text-blue-800">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link href="/admin/dashboard" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to dashboard
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{trainee.name}</h1>
            <p className="text-slate-600">{trainee.email || 'No email provided'}</p>
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
              stats.bestAssessmentScore >= (programInfo?.passingScore ?? 12) ? 'text-green-600' :
              stats.bestAssessmentScore >= Math.floor((programInfo?.passingScore ?? 12) * 0.8) ? 'text-amber-600' : 'text-red-600'
            }`}>
              {stats.bestAssessmentScore !== null ? `${stats.bestAssessmentScore}/${programInfo?.totalAssessmentQuestions ?? stats.bestAssessmentScore}` : 'N/A'}
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
            {sections.map((section, sectionIndex) => (
              <div key={section.id}>
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
                        <span className="text-xs">{sectionIndex + 1}</span>
                      )}
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-slate-900 flex items-center gap-2">
                        {section.title}
                        {section.needsAttention && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Needs attention</span>
                        )}
                      </div>
                      <div className="text-sm text-slate-500">
                        {section.totalResponses} responses
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

                {expandedSection === section.id && section.exercises.length > 0 && (
                  <div className="px-4 pb-4">
                    <div className="ml-12 space-y-4">
                      {section.exercises.map((exercise) => (
                        <div key={exercise.exerciseId} className="space-y-2">
                          {exercise.questionText && (
                            <div className="bg-white border border-slate-200 rounded-lg p-3 mb-2">
                              <div className="text-xs text-slate-500 mb-1">
                                {exercise.exerciseType === 'voice' ? 'Scenario:' : 'Question:'}
                              </div>
                              <p className="text-sm text-slate-800 italic">{exercise.questionText}</p>
                            </div>
                          )}

                          {exercise.attempts.length === 0 ? (
                            <div className="bg-slate-50 rounded-lg p-4 text-center">
                              <span className="text-sm text-slate-400">No attempts yet</span>
                            </div>
                          ) : (
                            exercise.attempts.map((attempt, attemptIdx) => (
                              <div key={attemptIdx} className="bg-slate-50 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-slate-700">
                                      {exercise.exerciseType === 'voice' ? 'Voice' : 'MC'}
                                      {exercise.attempts.length > 1 && ` (Attempt ${attemptIdx + 1})`}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                      {new Date(attempt.createdAt).toLocaleDateString('en-US', {
                                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                                      })}
                                    </span>
                                  </div>
                                  {exercise.exerciseType === 'multiple_choice' && attempt.correct !== null && (
                                    <span className={`text-sm font-medium px-2 py-1 rounded ${
                                      attempt.correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                      {attempt.correct ? 'Correct' : 'Incorrect'}
                                    </span>
                                  )}
                                  {exercise.exerciseType === 'voice' && attempt.score != null && (
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
                                    <audio src={attempt.audioUrl} controls className="w-full h-8" />
                                  </div>
                                )}
                                {attempt.feedback && (
                                  <FeedbackDisplay feedback={attempt.feedback} score={attempt.score} compact />
                                )}
                              </div>
                            ))
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
            <h2 className="font-medium text-slate-900">Assessment Attempts</h2>
          </div>
          {assessmentAttempts.length === 0 ? (
            <div className="p-6 text-center text-slate-500">No assessment attempts yet</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {assessmentAttempts.map((attempt, index) => {
                const passed = attempt.score >= (programInfo?.passingScore ?? 12);
                const percentage = Math.round((attempt.score / attempt.total) * 100);
                return (
                  <div key={attempt.id} className="p-4 flex items-center justify-between">
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
                        <div className="font-medium text-slate-900">Attempt {assessmentAttempts.length - index}</div>
                        <div className="text-sm text-slate-500">{formatDate(attempt.created_at)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xl font-semibold ${passed ? 'text-green-600' : 'text-red-600'}`}>
                        {attempt.score}/{attempt.total}
                      </div>
                      <div className={`text-sm ${passed ? 'text-green-600' : 'text-red-600'}`}>
                        {percentage}% — {passed ? 'Passed' : 'Not Passed'}
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
