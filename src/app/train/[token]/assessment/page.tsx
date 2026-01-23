'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { assessmentQuestions, PASSING_SCORE, TOTAL_QUESTIONS } from '@/content/assessment';
import { sections } from '@/content/sections';

interface AssessmentAttempt {
  id: string;
  score: number;
  total: number;
  answers: Record<string, number>;
  created_at: string;
}

export default function AssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [traineeId, setTraineeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [allSectionsComplete, setAllSectionsComplete] = useState(false);
  const [previousAttempts, setPreviousAttempts] = useState<AssessmentAttempt[]>([]);

  // Assessment state
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<{
    score: number;
    total: number;
    passed: boolean;
    details: { questionId: string; correct: boolean; selectedIndex: number; correctIndex: number }[];
  } | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/trainee?token=${token}`);
        if (!res.ok) throw new Error('Invalid link');
        const data = await res.json();

        setTraineeId(data.trainee.id);

        // Check if all sections are complete
        const completedSections = data.progress.filter(
          (p: { status: string }) => p.status === 'completed'
        ).length;
        setAllSectionsComplete(completedSections >= sections.length);

        // Fetch previous assessment attempts
        const attemptsRes = await fetch(`/api/assessment?traineeId=${data.trainee.id}`);
        if (attemptsRes.ok) {
          const attemptsData = await attemptsRes.json();
          setPreviousAttempts(attemptsData.attempts || []);
        }
      } catch {
        router.push('/');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [token, router]);

  const handleAnswerSelect = (questionId: string, optionIndex: number) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmit = async () => {
    if (!traineeId) return;

    // Check all questions answered
    const unanswered = assessmentQuestions.filter(q => answers[q.id] === undefined);
    if (unanswered.length > 0) {
      alert(`Please answer all questions. ${unanswered.length} question(s) remaining.`);
      return;
    }

    setSubmitting(true);

    // Calculate results
    const details = assessmentQuestions.map(q => ({
      questionId: q.id,
      correct: answers[q.id] === q.correctIndex,
      selectedIndex: answers[q.id],
      correctIndex: q.correctIndex
    }));

    const score = details.filter(d => d.correct).length;
    const passed = score >= PASSING_SCORE;

    // Save to database
    try {
      await fetch('/api/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          traineeId,
          score,
          total: TOTAL_QUESTIONS,
          answers
        })
      });
    } catch (error) {
      console.error('Failed to save assessment:', error);
    }

    setResults({ score, total: TOTAL_QUESTIONS, passed, details });
    setSubmitted(true);
    setSubmitting(false);
  };

  const handleRetake = () => {
    setAnswers({});
    setSubmitted(false);
    setResults(null);
    setStarted(true);
    window.scrollTo(0, 0);
  };

  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / TOTAL_QUESTIONS) * 100;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  // Not all sections complete
  if (!allSectionsComplete) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Complete All Modules First</h1>
          <p className="text-slate-600 mb-6">
            You need to complete all {sections.length} training modules before taking the final assessment.
          </p>
          <Link
            href={`/train/${token}`}
            className="inline-block px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Return to Training
          </Link>
        </div>
      </div>
    );
  }

  // Show results
  if (submitted && results) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-3xl mx-auto px-4 py-6">
            <Link href={`/train/${token}`} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Training
            </Link>
            <h1 className="text-2xl font-semibold text-slate-900">Assessment Results</h1>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-8">
          {/* Score Card */}
          <div className={`rounded-lg p-8 mb-8 text-center ${results.passed ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
            <div className={`text-6xl font-bold mb-2 ${results.passed ? 'text-green-600' : 'text-amber-600'}`}>
              {results.score}/{results.total}
            </div>
            <div className={`text-lg font-medium mb-4 ${results.passed ? 'text-green-800' : 'text-amber-800'}`}>
              {results.passed ? 'Congratulations! You passed!' : 'Not quite there yet'}
            </div>
            <p className={`text-sm ${results.passed ? 'text-green-700' : 'text-amber-700'}`}>
              {results.passed
                ? 'You\'ve demonstrated a strong understanding of PEP\'s admissions approach.'
                : `You need ${PASSING_SCORE} correct answers (80%) to pass. Review the modules and try again.`}
            </p>
          </div>

          {/* Question-by-Question Review */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h2 className="font-medium text-slate-900">Question Review</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {assessmentQuestions.map((question, index) => {
                const detail = results.details.find(d => d.questionId === question.id);
                const isCorrect = detail?.correct;

                return (
                  <div key={question.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {isCorrect ? (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-slate-400">Q{index + 1}</span>
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{question.module}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-900 mb-2">{question.question}</p>

                        {!isCorrect && (
                          <div className="text-sm space-y-1 mb-2">
                            <p className="text-red-600">
                              Your answer: {question.options[detail?.selectedIndex ?? 0]}
                            </p>
                            <p className="text-green-600">
                              Correct answer: {question.options[question.correctIndex]}
                            </p>
                          </div>
                        )}

                        <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
                          {question.explanation}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex gap-4 justify-center">
            <Link
              href={`/train/${token}`}
              className="px-6 py-3 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Back to Training
            </Link>
            {!results.passed && (
              <button
                onClick={handleRetake}
                className="px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                Retake Assessment
              </button>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Start screen
  if (!started) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-3xl mx-auto px-4 py-6">
            <Link href={`/train/${token}`} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Training
            </Link>
            <h1 className="text-2xl font-semibold text-slate-900">Final Assessment</h1>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg border border-slate-200 p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Ready to Test Your Knowledge?</h2>
              <p className="text-slate-600">
                This assessment covers all {sections.length} training modules.
              </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-slate-900 mb-3">Assessment Details</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {TOTAL_QUESTIONS} multiple choice questions
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Passing score: {PASSING_SCORE}/{TOTAL_QUESTIONS} ({Math.round(PASSING_SCORE/TOTAL_QUESTIONS*100)}%)
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  You can retake the assessment if needed
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Answer all questions before submitting
                </li>
              </ul>
            </div>

            {/* Previous Attempts */}
            {previousAttempts.length > 0 && (
              <div className="mb-6">
                <h3 className="font-medium text-slate-900 mb-3">Previous Attempts</h3>
                <div className="space-y-2">
                  {previousAttempts.map((attempt, index) => (
                    <div key={attempt.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-2 text-sm">
                      <span className="text-slate-600">
                        Attempt {previousAttempts.length - index} — {new Date(attempt.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <span className={`font-medium ${attempt.score >= PASSING_SCORE ? 'text-green-600' : 'text-amber-600'}`}>
                        {attempt.score}/{attempt.total}
                        {attempt.score >= PASSING_SCORE && ' ✓'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setStarted(true)}
              className="w-full py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
            >
              Start Assessment
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Assessment in progress
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky header with progress */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-semibold text-slate-900">Final Assessment</h1>
            <span className="text-sm text-slate-500">{answeredCount}/{TOTAL_QUESTIONS} answered</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {assessmentQuestions.map((question, index) => (
            <div key={question.id} className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2 py-1 rounded">
                  Q{index + 1}
                </span>
                <span className="text-xs text-slate-400">{question.module}</span>
              </div>

              <h3 className="text-slate-900 font-medium mb-4">{question.question}</h3>

              <div className="space-y-2">
                {question.options.map((option, optIndex) => {
                  const isSelected = answers[question.id] === optIndex;

                  return (
                    <button
                      key={optIndex}
                      onClick={() => handleAnswerSelect(question.id, optIndex)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                        }`}>
                          {isSelected && (
                            <div className="w-2 h-2 bg-white rounded-full" />
                          )}
                        </div>
                        <span className="text-slate-700">{option}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Submit button */}
        <div className="mt-8 sticky bottom-4">
          <button
            onClick={handleSubmit}
            disabled={submitting || answeredCount < TOTAL_QUESTIONS}
            className={`w-full py-4 rounded-lg font-medium transition-colors ${
              answeredCount === TOTAL_QUESTIONS
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : 'bg-slate-200 text-slate-500 cursor-not-allowed'
            }`}
          >
            {submitting ? 'Submitting...' : answeredCount === TOTAL_QUESTIONS ? 'Submit Assessment' : `Answer all questions (${TOTAL_QUESTIONS - answeredCount} remaining)`}
          </button>
        </div>
      </main>
    </div>
  );
}
