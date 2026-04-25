'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { PageShell, TopBar, PaperCard, Pill, Stickie } from '@/components/paper';

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

interface ResultDetail {
  questionId: string;
  correct: boolean;
  selectedIndex: number;
  correctIndex: number;
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

  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<{
    score: number;
    total: number;
    passed: boolean;
    details: ResultDetail[];
  } | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const traineeRes = await fetch('/api/trainee?include=progress');
        if (!traineeRes.ok) throw new Error('Could not load your training data');
        const traineeData = await traineeRes.json();
        setTraineeId(traineeData.trainee.id);

        const programRes = await fetch(`/api/program-content?programSlug=${programSlug}`);
        if (!programRes.ok) throw new Error('Program not found');
        const programData = await programRes.json();
        setProgramTitle(programData.program.title);
        setSectionCount(programData.sections.length);

        const sectionIds = programData.sections.map((s: { id: string }) => s.id);
        const completedSections = traineeData.progress.filter(
          (p: { section_id: string; status: string }) =>
            sectionIds.includes(p.section_id) && p.status === 'completed'
        ).length;
        setAllSectionsComplete(completedSections >= programData.sections.length);

        const assessmentRes = await fetch(`/api/program-assessment?programSlug=${programSlug}`);
        if (!assessmentRes.ok) throw new Error('Assessment not found');
        const assessmentData = await assessmentRes.json();
        setQuestions(assessmentData.questions);
        setTotalQuestions(assessmentData.totalQuestions);
        setPassingScore(assessmentData.passingScore);

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
      alert(`Please answer all questions. ${unanswered.length} remaining.`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/program-assessment/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programSlug, answers }),
      });
      if (!res.ok) throw new Error('Failed to submit assessment');
      const data = await res.json();
      setQuestions(prev =>
        prev.map(q => {
          const detail = data.details.find((d: { questionId: string }) => d.questionId === q.id);
          if (detail) return { ...q, correctIndex: detail.correctIndex, explanation: detail.explanation };
          return q;
        })
      );
      setResults({
        score: data.score,
        total: data.total,
        passed: data.passed,
        details: data.details,
      });
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
    setCurrentIndex(0);
    setStarted(true);
    window.scrollTo(0, 0);
  };

  const answeredCount = Object.keys(answers).length;

  if (authLoading || loading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-rule border-t-ink rounded-full animate-spin" />
        </div>
      </PageShell>
    );
  }

  if (!allSectionsComplete) {
    return (
      <PageShell maxWidth={520}>
        <TopBar />
        <PaperCard className="mt-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-warn-soft flex items-center justify-center text-warn-ink mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-[20px] font-semibold tracking-tight">Finish all modules first</h1>
          <p className="text-[14px] text-ink-2 mt-2 max-w-sm mx-auto">
            You need to complete all {sectionCount} sections before taking the final assessment.
          </p>
          <Link
            href={`/learn/${programSlug}`}
            className="inline-flex items-center px-4 py-2 rounded-md bg-ink text-paper text-[13px] font-medium hover:opacity-90 mt-5"
          >
            Return to course →
          </Link>
        </PaperCard>
      </PageShell>
    );
  }

  if (submitted && results) {
    return <ResultsView
      results={results}
      questions={questions}
      programSlug={programSlug}
      programTitle={programTitle}
      passingScore={passingScore}
      onRetake={handleRetake}
      userEmail={user?.email}
    />;
  }

  // ============================================================
  // START SCREEN
  // ============================================================
  if (!started) {
    return (
      <PageShell maxWidth={760}>
        <TopBar right={<span>{user?.email}</span>} />
        <div className="flex items-baseline gap-2.5 mt-2 mb-3 flex-wrap">
          <Link href={`/learn/${programSlug}`} className="text-[13px] text-ink-2 hover:text-ink">
            ← {programTitle}
          </Link>
          <span className="text-ink-3">/</span>
          <h1 className="text-[22px] font-semibold tracking-tight">Final assessment</h1>
        </div>

        <PaperCard className="mt-2">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-[11px] uppercase tracking-wide font-medium text-ink-2">
              {totalQuestions} questions · pass at {passingScore}/{totalQuestions}
            </span>
            <Pill kind="warn">no instant feedback</Pill>
          </div>
          <h2 className="text-[22px] font-semibold tracking-tight">Ready to test what stuck?</h2>
          <p className="text-[14px] text-ink-2 mt-2 leading-relaxed max-w-xl">
            Answer everything before submitting — you&apos;ll get one full results screen at the end.
            You can re-take if you don&apos;t pass.
          </p>

          <div className="mt-4 grid sm:grid-cols-3 gap-3">
            <div className="border border-rule rounded-md p-3 bg-paper-2">
              <div className="text-[11px] uppercase tracking-wide font-medium text-ink-2">Questions</div>
              <div className="text-[24px] font-semibold leading-none mt-1.5">{totalQuestions}</div>
            </div>
            <div className="border border-rule rounded-md p-3 bg-paper-2">
              <div className="text-[11px] uppercase tracking-wide font-medium text-ink-2">Pass at</div>
              <div className="text-[24px] font-semibold leading-none mt-1.5 text-good">
                {passingScore}/{totalQuestions}
              </div>
            </div>
            <div className="border border-rule rounded-md p-3 bg-paper-2">
              <div className="text-[11px] uppercase tracking-wide font-medium text-ink-2">Re-takes</div>
              <div className="text-[24px] font-semibold leading-none mt-1.5">unlimited</div>
            </div>
          </div>

          {previousAttempts.length > 0 && (
            <div className="mt-5">
              <div className="text-[11px] uppercase tracking-wide font-medium text-ink-2 mb-2">
                Your attempts
              </div>
              <div className="flex flex-col gap-2">
                {previousAttempts.map((attempt, index) => {
                  const passed = attempt.score >= passingScore;
                  return (
                    <div
                      key={attempt.id}
                      className="flex items-center justify-between border border-rule rounded-md px-3 py-2 text-[13px]"
                      style={{ background: passed ? 'var(--good-soft)' : 'var(--warn-soft)' }}
                    >
                      <span className="text-ink-2">
                        Attempt {previousAttempts.length - index} ·{' '}
                        {new Date(attempt.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <Pill kind={passed ? 'good' : 'warn'}>
                        {attempt.score}/{attempt.total}
                        {passed && ' ✓'}
                      </Pill>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setStarted(true)}
              className="text-[14px] font-medium rounded-md px-5 py-2 bg-ink text-paper hover:opacity-90 transition-opacity"
            >
              Start assessment →
            </button>
          </div>
        </PaperCard>

        <div className="mt-5">
          <Stickie>Take your time. There&apos;s no clock — just one careful pass through the questions.</Stickie>
        </div>
      </PageShell>
    );
  }

  // ============================================================
  // TAKING IT — single-question with progress dots header
  // ============================================================
  const currentQuestion = questions[currentIndex];
  const remaining = totalQuestions - answeredCount;

  return (
    <PageShell maxWidth={780}>
      <TopBar right={<span>{user?.email}</span>} />

      <div className="flex items-baseline gap-3 mt-2 mb-3 flex-wrap">
        <h1 className="text-[20px] font-semibold tracking-tight">Final assessment</h1>
        <span className="text-[12px] text-ink-3">
          pass at {passingScore}/{totalQuestions}
        </span>
        <span className="ml-auto text-[12px] text-ink-2">
          {answeredCount} of {totalQuestions} answered
        </span>
      </div>

      {/* progress dots */}
      <div className="border border-rule rounded-lg p-3 flex flex-wrap gap-1.5 items-center mb-5 bg-paper">
        {questions.map((q, i) => {
          const answered = answers[q.id] !== undefined;
          const current = i === currentIndex;
          return (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className="flex items-center justify-center text-[11px] font-medium transition-colors"
              style={{
                width: 26,
                height: 26,
                borderRadius: 4,
                border: current ? '2px solid var(--accent)' : '1px solid var(--rule)',
                background: answered ? 'var(--ink)' : 'var(--paper)',
                color: answered ? 'var(--paper)' : 'var(--ink-3)',
              }}
            >
              {i + 1}
            </button>
          );
        })}
        <span className="ml-auto text-[11px] text-ink-3">jump to any</span>
      </div>

      {/* current question */}
      {currentQuestion && (
        <div className="border border-rule rounded-lg bg-paper p-5 shadow-sm mb-4">
          <div className="flex items-baseline gap-3 mb-2 flex-wrap">
            <span className="text-[11px] uppercase tracking-wide font-medium text-ink-2">
              Question {currentIndex + 1} of {totalQuestions}
            </span>
            {currentQuestion.module && (
              <span className="text-[12px] text-ink-3">module: {currentQuestion.module}</span>
            )}
          </div>
          <h2 className="text-[18px] font-semibold tracking-tight leading-snug mb-4">
            {currentQuestion.question}
          </h2>
          <div className="flex flex-col gap-2.5">
            {currentQuestion.options.map((option, i) => {
              const isSelected = answers[currentQuestion.id] === i;
              return (
                <button
                  key={i}
                  onClick={() => handleAnswerSelect(currentQuestion.id, i)}
                  className={`text-left p-3 rounded-md flex items-start gap-3 transition-colors ${
                    isSelected ? 'border-2' : 'border border-rule hover:border-slate-300'
                  }`}
                  style={{
                    borderColor: isSelected ? 'var(--accent)' : undefined,
                    background: isSelected ? 'var(--accent-soft)' : 'var(--paper)',
                  }}
                >
                  <div
                    className="w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 text-[11px] font-semibold"
                    style={{
                      borderColor: isSelected ? 'var(--accent)' : 'var(--ink-3)',
                      color: isSelected ? 'var(--accent)' : 'var(--ink-3)',
                    }}
                  >
                    {isSelected ? '●' : String.fromCharCode(65 + i)}
                  </div>
                  <span className="text-[14px] leading-snug">{option}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* sticky footer */}
      <div className="sticky bottom-3 z-10 border border-rule rounded-lg bg-paper p-3 flex items-center gap-2 flex-wrap shadow-md">
        <button
          onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          className="text-[13px] font-medium border border-rule rounded-md px-3 py-1.5 disabled:opacity-40 hover:bg-paper-2 transition-colors"
        >
          ← Previous
        </button>
        <button
          onClick={() => setCurrentIndex(i => Math.min(totalQuestions - 1, i + 1))}
          disabled={currentIndex === totalQuestions - 1}
          className="text-[13px] font-medium border border-rule rounded-md px-3 py-1.5 disabled:opacity-40 hover:bg-paper-2 transition-colors"
        >
          Next →
        </button>
        <span className="ml-auto text-[12px] text-ink-2 hidden sm:inline">
          {remaining > 0
            ? `Submit once all ${totalQuestions} are answered`
            : 'All answered — submit when ready'}
        </span>
        <button
          onClick={handleSubmit}
          disabled={submitting || remaining > 0}
          className={`text-[13px] font-medium rounded-md px-4 py-1.5 transition-colors ${
            remaining === 0
              ? 'bg-ink text-paper hover:opacity-90'
              : 'bg-paper-2 text-ink-3 cursor-not-allowed'
          }`}
        >
          {submitting ? 'Submitting…' : remaining === 0 ? 'Submit assessment' : `Submit (${remaining} left)`}
        </button>
      </div>
    </PageShell>
  );
}

// ============================================================
// Results view
// ============================================================
function ResultsView({
  results,
  questions,
  programSlug,
  programTitle,
  passingScore,
  onRetake,
  userEmail,
}: {
  results: { score: number; total: number; passed: boolean; details: ResultDetail[] };
  questions: AssessmentQuestion[];
  programSlug: string;
  programTitle: string;
  passingScore: number;
  onRetake: () => void;
  userEmail?: string;
}) {
  const moduleStats = new Map<string, { got: number; of: number; missed: AssessmentQuestion[] }>();
  for (const q of questions) {
    const mod = q.module || 'Other';
    const detail = results.details.find(d => d.questionId === q.id);
    const cur = moduleStats.get(mod) ?? { got: 0, of: 0, missed: [] };
    cur.of += 1;
    if (detail?.correct) cur.got += 1;
    else cur.missed.push(q);
    moduleStats.set(mod, cur);
  }

  const missed = questions.filter(q => {
    const d = results.details.find(x => x.questionId === q.id);
    return d && !d.correct;
  });

  return (
    <PageShell maxWidth={920}>
      <TopBar right={<span>{userEmail}</span>} />

      <div className="flex items-baseline gap-2.5 mt-2 mb-3 flex-wrap">
        <Link href={`/learn/${programSlug}`} className="text-[13px] text-ink-2 hover:text-ink">
          ← {programTitle}
        </Link>
        <span className="text-ink-3">/</span>
        <h1 className="text-[20px] font-semibold tracking-tight">Final assessment · result</h1>
      </div>

      {/* big result band */}
      <div
        className="p-5 border rounded-lg flex items-center gap-5 mb-5 shadow-sm"
        style={{
          borderColor: results.passed ? '#86efac' : '#fde68a',
          background: results.passed ? 'var(--good-soft)' : 'var(--warn-soft)',
        }}
      >
        <div className="w-16 h-16 border border-rule rounded-full bg-paper flex flex-col items-center justify-center flex-shrink-0">
          <span
            className="text-[24px] font-semibold leading-none"
            style={{ color: results.passed ? 'var(--good)' : 'var(--warn-ink)' }}
          >
            {results.score}
          </span>
          <span className="text-[10px] text-ink-2 mt-0.5">of {results.total}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[22px] font-semibold tracking-tight">
            {results.passed ? 'You passed.' : 'Almost there.'}
          </div>
          <div className="text-[14px] mt-1.5 text-ink-2 leading-relaxed">
            {results.passed
              ? `Strong work on ${programTitle}. You can revisit any section anytime — your progress stays saved.`
              : `You need ${passingScore}/${results.total} to pass. The modules below need a quick revisit before retaking.`}
          </div>
        </div>
      </div>

      {/* By-module breakdown */}
      <div className="text-[11px] uppercase tracking-wide font-medium text-ink-2 mb-2">
        By module
      </div>
      <div className="flex flex-col gap-2 mb-5">
        {[...moduleStats.entries()].map(([mod, s]) => {
          const ok = s.got === s.of;
          return (
            <div
              key={mod}
              className="flex items-center gap-3 px-3 py-2 border border-rule rounded-md text-[13px]"
              style={{ background: ok ? 'var(--paper)' : 'var(--warn-soft)' }}
            >
              <span className="flex-1 truncate">{mod}</span>
              <span
                className="text-[12px] font-semibold"
                style={{ color: ok ? 'var(--good)' : 'var(--warn-ink)' }}
              >
                {s.got}/{s.of}
              </span>
            </div>
          );
        })}
      </div>

      {/* What you missed */}
      {missed.length > 0 && (
        <div
          className="p-4 border rounded-lg mb-5"
          style={{ borderColor: '#fde68a', background: 'var(--warn-soft)' }}
        >
          <div className="text-[16px] font-semibold tracking-tight" style={{ color: 'var(--warn-ink)' }}>
            {results.passed
              ? `The ${missed.length === 1 ? 'one' : missed.length} you missed`
              : "What to brush up on"}
          </div>
          <ol className="text-[13px] list-decimal pl-5 mt-3 space-y-3 leading-relaxed">
            {missed.map((q) => {
              const d = results.details.find(x => x.questionId === q.id);
              const correctText = q.correctIndex !== undefined ? q.options[q.correctIndex] : '';
              const yourText = d ? q.options[d.selectedIndex] : '';
              return (
                <li key={q.id}>
                  <span className="font-semibold">Q{questions.indexOf(q) + 1} · {q.module ?? 'Module'}.</span>{' '}
                  {q.question}
                  <div className="mt-1 text-ink-2">
                    Your answer: <span className="text-bad">&ldquo;{yourText}&rdquo;</span>
                    {' · '}
                    Correct: <span className="text-good">&ldquo;{correctText}&rdquo;</span>
                  </div>
                  {q.explanation && (
                    <div className="mt-1 text-ink-2 italic">{q.explanation}</div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Retake / back actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-rule">
        <Link
          href={`/learn/${programSlug}`}
          className="text-[14px] font-medium border border-rule rounded-md px-4 py-2 hover:bg-paper-2"
        >
          ← Back to course
        </Link>
        <button
          onClick={onRetake}
          className={`text-[14px] font-medium rounded-md px-4 py-2 ${
            results.passed
              ? 'border border-rule hover:bg-paper-2'
              : 'bg-ink text-paper hover:opacity-90'
          }`}
        >
          {results.passed ? 'Re-take to improve score' : 'Re-take assessment'}
        </button>
      </div>
    </PageShell>
  );
}
