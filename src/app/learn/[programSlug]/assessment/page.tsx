'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

interface AssessmentQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex?: number;
  explanation?: string;
  module: string | null;
}

interface AssessmentAttempt {
  id: string;
  score: number;
  total: number;
  answers: Record<string, number>;
  created_at: string;
}

export default function ProgramAssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const programSlug = params.programSlug as string;

  const [traineeId, setTraineeId] = useState<string | null>(null);
  const [programTitle, setProgramTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [allSectionsComplete, setAllSectionsComplete] = useState(false);
  const [previousAttempts, setPreviousAttempts] = useState<AssessmentAttempt[]>([]);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [passingScore, setPassingScore] = useState(0);
  const [sectionCount, setSectionCount] = useState(0);

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
        // Fetch trainee data
        const traineeRes = await fetch('/api/trainee?include=progress');
        if (!traineeRes.ok) throw new Error('Could not load your training data');
        const traineeData = await traineeRes.json();
        setTraineeId(traineeData.trainee.id);

        // Fetch program content to check section completion
        const programRes = await fetch(`/api/program-content?programSlug=${programSlug}`);
        if (!programRes.ok) throw new Error('Program not found');
        const programData = await programRes.json();
        setProgramTitle(programData.program.title);
        setSectionCount(programData.sections.length);

        // Check if all sections are complete
        const sectionIds = programData.sections.map((s: { id: string }) => s.id);
        const completedSections = traineeData.progress.filter(
          (p: { section_id: string; status: string }) =>
            sectionIds.includes(p.section_id) && p.status === 'completed'
        ).length;
        setAllSectionsComplete(completedSections >= programData.sections.length);

        // Fetch assessment questions
        const assessmentRes = await fetch(`/api/program-assessment?programSlug=${programSlug}`);
        if (!assessmentRes.ok) throw new Error('Assessment not found');
        const assessmentData = await assessmentRes.json();
        setQuestions(assessmentData.questions);
        setTotalQuestions(assessmentData.totalQuestions);
        setPassingScore(assessmentData.passingScore);

        // Fetch previous assessment attempts
        const attemptsRes = await fetch(`/api/assessment?traineeId=${traineeData.trainee.id}`);
        if (attemptsRes.ok) {
          const attemptsData = await attemptsRes.json();
          setPreviousAttempts(attemptsData.attempts || []);
        }
      } catch {
        router.push('/learn');
      } finally {
        setLoading(false);
      }
    }
    if (!authLoading && user) fetchData();
  }, [authLoading, user, programSlug, router]);

  const handleAnswerSelect = (questionId: string, optionIndex: number) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmit = async () => {
    if (!traineeId) return;

    const unanswered = questions.filter(q => answers[q.id] === undefined);
    if (unanswered.length > 0) {
      alert(`Please answer all questions. ${unanswered.length} question(s) remaining.`);
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/program-assessment/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programSlug, answers }),
      });

      if (!res.ok) {
        throw new Error('Failed to submit assessment');
      }

      const data = await res.json();

      // Update questions with server-provided correct answers for review screen
      setQuestions(prev => prev.map(q => {
        const detail = data.details.find((d: { questionId: string }) => d.questionId === q.id);
        if (detail) {
          return { ...q, correctIndex: detail.correctIndex, explanation: detail.explanation };
        }
        return q;
      }));

      setResults({
        score: data.score,
        total: data.total,
        passed: data.passed,
        details: data.details.map((d: { questionId: string; correct: boolean; selectedIndex: number; correctIndex: number }) => ({
          questionId: d.questionId,
          correct: d.correct,
          selectedIndex: d.selectedIndex,
          correctIndex: d.correctIndex,
        })),
      });
      setSubmitted(true);
    } catch (error) {
      console.error('Failed to submit assessment:', error);
      alert('Failed to submit assessment. Please try again.');
    }

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
  const progressPercent = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

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
            You need to complete all {sectionCount} training modules before taking the final assessment.
          </p>
          <Link
            href={`/learn/${programSlug}`}
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
            <Link href={`/learn/${programSlug}`} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Training
            </Link>
            <h1 className="text-2xl font-semibold text-slate-900">Assessment Results</h1>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-8">
          <div className={`rounded-lg p-6 sm:p-8 mb-8 text-center ${results.passed ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
            <div className={`text-4xl sm:text-6xl font-bold mb-2 ${results.passed ? 'text-green-600' : 'text-amber-600'}`}>
              {results.score}/{results.total}
            </div>
            <div className={`text-lg font-medium mb-4 ${results.passed ? 'text-green-800' : 'text-amber-800'}`}>
              {results.passed ? 'Congratulations! You passed!' : 'Not quite there yet'}
            </div>
            <p className={`text-sm ${results.passed ? 'text-green-700' : 'text-amber-700'}`}>
              {results.passed
                ? `You've demonstrated a strong understanding of ${programTitle}.`
                : `You need ${passingScore} correct answers to pass. Review the modules and try again.`}
            </p>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h2 className="font-medium text-slate-900">Question Review</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {questions.map((question, index) => {
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
                          {question.module && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{question.module}</span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-900 mb-2">{question.question}</p>

                        {!isCorrect && (
                          <div className="text-sm space-y-1 mb-2">
                            <p className="text-red-600">
                              Your answer: {question.options[detail?.selectedIndex ?? 0]}
                            </p>
                            <p className="text-green-600">
                              Correct answer: {question.correctIndex !== undefined ? question.options[question.correctIndex] : ''}
                            </p>
                          </div>
                        )}

                        {question.explanation && (
                          <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
                            {question.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link
              href={`/learn/${programSlug}`}
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
            <Link href={`/learn/${programSlug}`} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Training
            </Link>
            <h1 className="text-2xl font-semibold text-slate-900">Final Assessment</h1>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg border border-slate-200 p-5 sm:p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Ready to Test Your Knowledge?</h2>
              <p className="text-slate-600">
                This assessment covers all {sectionCount} training modules.
              </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-slate-900 mb-3">Assessment Details</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {totalQuestions} multiple choice questions
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Passing score: {passingScore}/{totalQuestions}
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  You can retake the assessment if needed
                </li>
              </ul>
            </div>

            {previousAttempts.length > 0 && (
              <div className="mb-6">
                <h3 className="font-medium text-slate-900 mb-3">Previous Attempts</h3>
                <div className="space-y-2">
                  {previousAttempts.map((attempt, index) => (
                    <div key={attempt.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 rounded-lg px-3 sm:px-4 py-2 text-sm gap-1">
                      <span className="text-slate-600">
                        Attempt {previousAttempts.length - index} — {new Date(attempt.created_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                      <span className={`font-medium ${attempt.score >= passingScore ? 'text-green-600' : 'text-amber-600'}`}>
                        {attempt.score}/{attempt.total}
                        {attempt.score >= passingScore && ' \u2713'}
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
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-semibold text-slate-900">Final Assessment</h1>
            <span className="text-sm text-slate-500">{answeredCount}/{totalQuestions} answered</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {questions.map((question, index) => (
            <div key={question.id} className="bg-white rounded-lg border border-slate-200 p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2 py-1 rounded">
                  Q{index + 1}
                </span>
                {question.module && (
                  <span className="text-xs text-slate-400">{question.module}</span>
                )}
              </div>

              <h3 className="text-slate-900 font-medium mb-4">{question.question}</h3>

              <div className="space-y-2">
                {question.options.map((option, optIndex) => {
                  const isSelected = answers[question.id] === optIndex;
                  return (
                    <button
                      key={optIndex}
                      onClick={() => handleAnswerSelect(question.id, optIndex)}
                      className={`w-full text-left p-3 sm:p-4 rounded-lg border-2 transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                        }`}>
                          {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                        <span className="text-slate-700 break-words">{option}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 sticky bottom-4">
          <button
            onClick={handleSubmit}
            disabled={submitting || answeredCount < totalQuestions}
            className={`w-full py-4 rounded-lg font-medium transition-colors ${
              answeredCount === totalQuestions
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : 'bg-slate-200 text-slate-500 cursor-not-allowed'
            }`}
          >
            {submitting ? 'Submitting...' : answeredCount === totalQuestions ? 'Submit Assessment' : `Answer all questions (${totalQuestions - answeredCount} remaining)`}
          </button>
        </div>
      </main>
    </div>
  );
}
