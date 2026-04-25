'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/hooks/useAuth';
import { PageShell, TopBar, PaperCard, Pill, AdminNav, AdminSubNav } from '@/components/paper';

const TEACHERS_TABS = [
  { label: 'All teachers', href: '/admin/users' },
  { label: 'Cohort', href: '/admin/cohort' },
  { label: 'Voice perf', href: '/admin/voice-perf' },
];
import ScopeEditor from './ScopeEditor';

interface TraineeDetail {
  id: string;
  name: string;
  email?: string;
  created_at: string;
  last_active_at?: string;
  is_test_account?: boolean;
}

interface ExerciseAttempt {
  id?: string;
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
  scoreType: 'voice' | 'mcq' | null;
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

interface CourseStats {
  completedSections: number;
  totalSections: number;
  progressPercent: number;
  overallAvgScore: number | null;
  overallScoreType: 'voice' | 'mcq' | null;
  totalResponses: number;
  sectionsNeedingAttention: number;
  assessmentAttempts: number;
  bestAssessmentScore: number | null;
}

interface CourseBlock {
  courseId: string;
  slug: string;
  title: string;
  passingScore: number;
  totalAssessmentQuestions: number;
  sections: SectionInfo[];
  assessmentAttempts: AssessmentAttemptData[];
  stats: CourseStats;
}

interface ScopeData {
  centerId: string | null;
  programTrackIds: string[];
  role: 'super_admin' | 'admin' | 'user';
  trainee: { id: string; name: string; email: string; userId: string | null };
}

interface Lookups {
  centers: { id: string; name: string }[];
  programTracks: { id: string; name: string }[];
}

function formatDate(iso?: string): string {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelativeFromIso(iso?: string): string {
  if (!iso) return 'never';
  const days = (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
  if (days < 1) return 'today';
  if (days < 2) return 'yesterday';
  if (days < 7) return `${Math.floor(days)}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function UserDetailPage() {
  const { user, loading: authLoading } = useAuth('admin');
  const params = useParams();
  const router = useRouter();
  const traineeId = params.id as string;
  const isSuperAdmin = user?.role === 'super_admin';

  const [trainee, setTrainee] = useState<TraineeDetail | null>(null);
  const [courses, setCourses] = useState<CourseBlock[]>([]);
  const [scope, setScope] = useState<ScopeData | null>(null);
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [profileActive, setProfileActive] = useState<boolean>(true);

  const [loading, setLoading] = useState(true);
  /** Set of `${courseId}::${sectionId}` keys that are currently expanded. */
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [manageError, setManageError] = useState<string | null>(null);
  const [manageSavedAt, setManageSavedAt] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [detailRes, scopeRes, lookupsRes] = await Promise.all([
        fetch(`/api/manager/trainee/${traineeId}`),
        fetch(`/api/admin/users/${traineeId}/scope`),
        fetch('/api/admin/lookups'),
      ]);
      if (!detailRes.ok) return;
      const data = await detailRes.json();
      setTrainee(data.trainee);
      setCourses(data.courses ?? []);
      if (scopeRes.ok) {
        const s = await scopeRes.json();
        setScope(s);
      }
      if (lookupsRes.ok) {
        const l = await lookupsRes.json();
        setLookups({ centers: l.centers ?? [], programTracks: l.programTracks ?? [] });
      }
    } catch {
      // empty state will catch
    } finally {
      setLoading(false);
    }
  }, [traineeId]);

  useEffect(() => {
    if (!authLoading) fetchData();
  }, [authLoading, fetchData]);

  const toggleSection = (key: string) =>
    setExpandedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const handleManageToggle = async (key: 'isActive' | 'isTestAccount', next: boolean) => {
    setManageError(null);
    try {
      const res = await fetch(`/api/admin/users/${traineeId}/manage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: next }),
      });
      const result = await res.json();
      if (!res.ok) {
        setManageError(result.error || 'Failed to save');
        return;
      }
      if (key === 'isActive') setProfileActive(next);
      if (key === 'isTestAccount' && trainee) {
        setTrainee({ ...trainee, is_test_account: next });
      }
      setManageSavedAt(Date.now());
    } catch {
      setManageError('Network error');
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

  if (!trainee) {
    return (
      <PageShell maxWidth={520}>
        <TopBar right={<span>{user?.email}</span>} />
        <PaperCard className="mt-8 text-center">
          <h1 className="text-[20px] font-semibold tracking-tight">User not found</h1>
          <Link href="/admin/dashboard" className="text-accent underline mt-3 inline-block text-[14px]">
            Back to dashboard
          </Link>
        </PaperCard>
      </PageShell>
    );
  }

  const centerName =
    lookups && scope?.centerId
      ? lookups.centers.find(c => c.id === scope.centerId)?.name
      : null;
  const programNames =
    lookups && scope
      ? scope.programTrackIds
          .map(id => lookups.programTracks.find(p => p.id === id)?.name)
          .filter(Boolean)
      : [];

  // Aggregate flagged sections across all courses
  const flagged = courses.flatMap(c =>
    c.sections.filter(s => s.needsAttention).map(s => ({ course: c, section: s }))
  );

  const totalEnrollments = courses.length;

  return (
    <PageShell maxWidth={1280}>
      <TopBar right={<span>{user?.email}</span>} />
      <AdminNav />
      <AdminSubNav items={TEACHERS_TABS} />

      {/* Crumb + identity */}
      <div className="flex items-baseline gap-3 mb-2 flex-wrap">
        <Link href="/admin/users" className="text-[13px] text-ink-2 hover:text-ink">
          ← All teachers
        </Link>
        <span className="text-ink-3">/</span>
        <h1 className="text-[20px] font-semibold tracking-tight">{trainee.name}</h1>
        {centerName && <Pill>{centerName}</Pill>}
        {programNames.map((n, i) => (
          <Pill key={i}>{n}</Pill>
        ))}
        {trainee.is_test_account && <Pill kind="warn">test account</Pill>}
        <span className="ml-auto text-[12px] text-ink-3">
          {trainee.email && <>{trainee.email} · </>}
          joined {formatRelativeFromIso(trainee.created_at)} ·{' '}
          last active {formatRelativeFromIso(trainee.last_active_at)}
        </span>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-5 items-start">
        {/* LEFT — scope + courses + flagged */}
        <div className="min-w-0 flex flex-col gap-4">
          {isSuperAdmin && <ScopeEditor traineeId={traineeId} />}

          {/* Course summary headline */}
          <div className="text-[12px] text-ink-3">
            {totalEnrollments === 0
              ? 'Not enrolled in any courses yet.'
              : `${totalEnrollments} course${totalEnrollments === 1 ? '' : 's'} enrolled · stats are per-course.`}
          </div>

          {/* Per-course blocks */}
          {courses.map(course => (
            <CourseBlockCard
              key={course.courseId}
              course={course}
              expandedKeys={expandedKeys}
              onToggle={(sectionId) => toggleSection(`${course.courseId}::${sectionId}`)}
            />
          ))}

          {/* Aggregated needs-attention coaching panel */}
          {flagged.length > 0 && (
            <div
              className="border rounded-lg p-4 shadow-sm"
              style={{ borderColor: '#fecaca', background: 'var(--bad-soft)' }}
            >
              <h3
                className="text-[15px] font-semibold tracking-tight"
                style={{ color: 'var(--bad)' }}
              >
                ⚑ {flagged.length} section{flagged.length === 1 ? '' : 's'} need attention
              </h3>
              <ul className="mt-2 space-y-2 text-[13px] text-ink leading-snug">
                {flagged.map(({ course, section }) => (
                  <li key={`${course.courseId}-${section.id}`}>
                    <span className="font-medium">{section.title}</span>{' '}
                    <span className="text-ink-2">· {course.title}</span>
                    {' — '}
                    {section.scoreType === 'voice'
                      ? `avg voice ${section.avgScore}/5 across ${section.totalResponses} attempts`
                      : `low MCQ pass rate (${section.avgScore}%)`}
                    .{' '}
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedKeys(prev => {
                          const next = new Set(prev);
                          next.add(`${course.courseId}::${section.id}`);
                          return next;
                        })
                      }
                      className="underline text-[color:var(--bad)] hover:opacity-80"
                    >
                      Listen / view attempts
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2 mt-3">
                {trainee.email && (
                  <a
                    href={`mailto:${trainee.email}?subject=Quick%20training%20check-in`}
                    className="inline-flex items-center px-3 py-1 rounded-full border border-rule bg-paper text-[12px] hover:bg-paper-2"
                  >
                    📨 Send a nudge
                  </a>
                )}
                <button
                  type="button"
                  className="inline-flex items-center px-3 py-1 rounded-full border border-rule bg-paper text-[12px] hover:bg-paper-2"
                  onClick={() =>
                    alert(
                      'Calendar integration not wired up yet. For now, schedule manually and DM the teacher.'
                    )
                  }
                >
                  📅 Schedule a 1:1
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — manage actions */}
        <div className="flex flex-col gap-4">
          {isSuperAdmin && (
            <PaperCard framed>
              <div className="flex items-baseline gap-3 mb-3 pb-2 border-b border-rule">
                <h2 className="text-[16px] font-semibold tracking-tight">Manage</h2>
                {manageSavedAt && Date.now() - manageSavedAt < 4000 && (
                  <span className="text-[11px] text-good">Saved</span>
                )}
              </div>

              {manageError && (
                <div
                  className="mb-3 p-2.5 border rounded-md text-[13px]"
                  style={{ borderColor: '#fecaca', background: 'var(--bad-soft)', color: 'var(--bad)' }}
                >
                  {manageError}
                </div>
              )}

              <div className="space-y-2.5">
                <Link
                  href="/admin/assignments"
                  className="block w-full text-left px-3 py-2 rounded-md border border-rule bg-paper hover:bg-paper-2 text-[13px]"
                >
                  → Assign / unassign courses
                </Link>

                <ToggleRow
                  label="Test account"
                  hint="Hide from cohort + dashboard stats."
                  active={!!trainee.is_test_account}
                  onChange={next => handleManageToggle('isTestAccount', next)}
                />

                {scope?.trainee.userId && (
                  <ToggleRow
                    label="Active"
                    hint={
                      profileActive
                        ? 'Sign-in allowed.'
                        : 'Sign-in blocked — can re-enable any time.'
                    }
                    active={profileActive}
                    onChange={next => handleManageToggle('isActive', next)}
                  />
                )}
              </div>
              <div className="text-[11px] text-ink-3 mt-3 leading-relaxed">
                Need to delete? Use the user list at{' '}
                <button
                  type="button"
                  onClick={() => router.push('/admin/users')}
                  className="underline hover:text-ink"
                >
                  /admin/users
                </button>
                .
              </div>
            </PaperCard>
          )}
        </div>
      </div>
    </PageShell>
  );
}

function CourseBlockCard({
  course,
  expandedKeys,
  onToggle,
}: {
  course: CourseBlock;
  expandedKeys: Set<string>;
  onToggle: (sectionId: string) => void;
}) {
  return (
    <PaperCard framed>
      <div className="flex items-baseline gap-3 pb-2 border-b border-rule mb-3 flex-wrap">
        <h2 className="text-[16px] font-semibold tracking-tight truncate">
          {course.title}
        </h2>
        <Link
          href={`/admin/programs/${course.courseId}`}
          className="text-[12px] text-ink-3 hover:text-ink underline-offset-2 hover:underline"
        >
          /{course.slug}
        </Link>
      </div>

      {/* 5 stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 mb-3">
        <StatCard
          label="Progress"
          value={`${course.stats.progressPercent}%`}
          sub={`${course.stats.completedSections}/${course.stats.totalSections} sections`}
        />
        <StatCard
          label="Avg score"
          value={
            course.stats.overallAvgScore === null
              ? '—'
              : course.stats.overallScoreType === 'mcq'
              ? `${course.stats.overallAvgScore}%`
              : `${course.stats.overallAvgScore}/5`
          }
          color={
            course.stats.overallAvgScore === null
              ? 'var(--ink-3)'
              : course.stats.overallScoreType === 'mcq'
              ? course.stats.overallAvgScore >= 80
                ? 'var(--good)'
                : course.stats.overallAvgScore >= 60
                ? 'var(--warn-ink)'
                : 'var(--bad)'
              : course.stats.overallAvgScore >= 4
              ? 'var(--good)'
              : course.stats.overallAvgScore >= 3
              ? 'var(--warn-ink)'
              : 'var(--bad)'
          }
          sub={
            course.stats.overallScoreType === 'voice'
              ? 'voice'
              : course.stats.overallScoreType === 'mcq'
              ? 'MCQ'
              : ''
          }
        />
        <StatCard label="Responses" value={String(course.stats.totalResponses)} sub="" />
        <StatCard
          label="Final"
          value={
            course.stats.bestAssessmentScore === null
              ? '—'
              : `${course.stats.bestAssessmentScore}/${course.totalAssessmentQuestions || course.stats.bestAssessmentScore}`
          }
          color={
            course.stats.bestAssessmentScore === null
              ? 'var(--ink-3)'
              : course.stats.bestAssessmentScore >= course.passingScore
              ? 'var(--good)'
              : 'var(--warn-ink)'
          }
          sub={`${course.stats.assessmentAttempts} attempt${
            course.stats.assessmentAttempts === 1 ? '' : 's'
          }`}
        />
        <StatCard
          label="Needs attn."
          value={String(course.stats.sectionsNeedingAttention)}
          color={course.stats.sectionsNeedingAttention > 0 ? 'var(--bad)' : 'var(--good)'}
          sub={course.stats.sectionsNeedingAttention > 0 ? 'flagged' : 'on track'}
        />
      </div>

      {/* Sections */}
      {course.sections.length > 0 && (
        <ul className="divide-y divide-rule -mx-1 mb-2">
          {course.sections.map((section, idx) => {
            const expanded = expandedKeys.has(`${course.courseId}::${section.id}`);
            return (
              <li key={section.id}>
                <button
                  onClick={() => onToggle(section.id)}
                  className="w-full text-left px-2 py-2.5 hover:bg-paper-2/40 transition-colors flex items-center gap-3 rounded"
                >
                  <SectionStateDot status={section.status} index={idx} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-medium text-ink truncate">
                        {section.title}
                      </span>
                      {section.needsAttention && <Pill kind="bad">needs attention</Pill>}
                    </div>
                    <div className="text-[11px] text-ink-3 mt-0.5">
                      {section.totalResponses} response{section.totalResponses === 1 ? '' : 's'}
                      {section.avgScore !== null && (
                        <>
                          {' · avg '}
                          <span
                            style={{
                              color:
                                section.scoreType === 'mcq'
                                  ? section.avgScore >= 80
                                    ? 'var(--good)'
                                    : section.avgScore >= 60
                                    ? 'var(--warn-ink)'
                                    : 'var(--bad)'
                                  : section.avgScore >= 4
                                  ? 'var(--good)'
                                  : section.avgScore >= 3
                                  ? 'var(--warn-ink)'
                                  : 'var(--bad)',
                            }}
                          >
                            {section.scoreType === 'mcq'
                              ? `${section.avgScore}%`
                              : `${section.avgScore}/5`}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <span
                    className="text-ink-3 text-[14px] transition-transform"
                    style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}
                  >
                    ▾
                  </span>
                </button>
                {expanded && (
                  <div className="px-3 pb-3 pl-12">
                    <SectionExercises section={section} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Assessment attempts strip */}
      {course.assessmentAttempts.length > 0 && (
        <div className="mt-2 pt-2 border-t border-rule">
          <div className="text-[11px] uppercase tracking-wide font-medium text-ink-2 mb-1.5">
            Assessment attempts
          </div>
          <ul className="flex flex-wrap gap-1.5">
            {course.assessmentAttempts.map((attempt, index) => {
              const passed = attempt.score >= course.passingScore;
              return (
                <li
                  key={attempt.id}
                  className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border text-[12px]"
                  style={{
                    borderColor: passed ? '#86efac' : '#fde68a',
                    background: passed ? 'var(--good-soft)' : 'var(--warn-soft)',
                  }}
                >
                  <span className="text-ink-3">
                    {formatDate(attempt.created_at)}
                  </span>
                  <span className="text-ink-2">
                    Attempt {course.assessmentAttempts.length - index}
                  </span>
                  <Pill kind={passed ? 'good' : 'warn'}>
                    {attempt.score}/{attempt.total}
                    {passed && ' ✓'}
                  </Pill>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </PaperCard>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="border border-rule rounded-md bg-paper p-2.5">
      <div className="text-[10px] uppercase tracking-wide font-medium text-ink-2 truncate">
        {label}
      </div>
      <div
        className="text-[18px] font-semibold leading-none mt-1"
        style={{ color: color ?? 'var(--ink)' }}
      >
        {value}
      </div>
      {sub && <div className="text-[10px] text-ink-3 mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

function SectionStateDot({ status, index }: { status: string; index: number }) {
  const cls =
    'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0';
  if (status === 'completed') return <div className={`${cls} bg-good-soft text-good`}>✓</div>;
  if (status === 'in_progress')
    return <div className={`${cls} bg-accent-soft text-[color:var(--accent)]`}>●</div>;
  return <div className={`${cls} bg-paper-2 text-ink-3`}>{index + 1}</div>;
}

function ToggleRow({
  label,
  hint,
  active,
  onChange,
}: {
  label: string;
  hint?: string;
  active: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!active)}
      className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-md border border-rule bg-paper hover:bg-paper-2"
    >
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-ink">{label}</div>
        {hint && <div className="text-[11px] text-ink-3 mt-0.5">{hint}</div>}
      </div>
      <div
        className="w-9 h-5 rounded-full relative transition-colors flex-shrink-0"
        style={{ background: active ? 'var(--ink)' : 'var(--rule)' }}
        aria-pressed={active}
      >
        <span
          className="absolute top-0.5 w-4 h-4 rounded-full bg-paper transition-all"
          style={{ left: active ? 'calc(100% - 18px)' : '2px' }}
        />
      </div>
    </button>
  );
}

function SectionExercises({ section }: { section: SectionInfo }) {
  if (section.exercises.length === 0) {
    return (
      <div className="text-[13px] text-ink-3 italic py-2">No exercises in this section.</div>
    );
  }
  return (
    <div className="space-y-3">
      {section.exercises.map(exercise => (
        <div key={exercise.exerciseId}>
          {exercise.questionText && (
            <div className="bg-paper-2 border border-rule rounded-md p-2.5 mb-2">
              <div className="text-[10px] uppercase tracking-wide font-medium text-ink-2 mb-1">
                {exercise.exerciseType === 'voice' ? 'Scenario' : 'Question'}
              </div>
              <p className="text-[13px] text-ink italic">{exercise.questionText}</p>
            </div>
          )}
          {exercise.attempts.length === 0 ? (
            <div className="text-[12px] text-ink-3 italic py-1">No attempts yet</div>
          ) : (
            <div className="space-y-2">
              {exercise.attempts.map((attempt, i) => (
                <ExerciseAttemptCard
                  key={attempt.id ?? i}
                  attempt={attempt}
                  exerciseType={exercise.exerciseType}
                  index={i}
                  total={exercise.attempts.length}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ExerciseAttemptCard({
  attempt,
  exerciseType,
  index,
  total,
}: {
  attempt: ExerciseAttempt;
  exerciseType: string;
  index: number;
  total: number;
}) {
  return (
    <div className="bg-paper-2 border border-rule rounded-md p-3">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-ink-2">
            {exerciseType === 'voice' ? 'Voice' : 'MCQ'}
            {total > 1 && ` · attempt ${index + 1}`}
          </span>
          <span className="text-[11px] text-ink-3">{formatDate(attempt.createdAt)}</span>
        </div>
        <div className="flex items-center gap-2">
          {exerciseType === 'multiple_choice' && attempt.correct !== null && (
            <Pill kind={attempt.correct ? 'good' : 'bad'}>
              {attempt.correct ? 'Correct' : 'Incorrect'}
            </Pill>
          )}
          {exerciseType === 'voice' && attempt.score != null && (
            <Pill kind={attempt.score >= 4 ? 'good' : attempt.score >= 3 ? 'warn' : 'bad'}>
              {attempt.score}/5
            </Pill>
          )}
          {exerciseType === 'voice' && attempt.id && (
            <Link
              href={`/admin/voice/${attempt.id}`}
              className="text-[11px] text-accent hover:underline"
            >
              admin view →
            </Link>
          )}
        </div>
      </div>
      {attempt.transcription && (
        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-wide font-medium text-ink-2 mb-1">
            Response
          </div>
          <p className="text-[13px] text-ink bg-paper border border-rule rounded p-2 leading-relaxed">
            {attempt.transcription}
          </p>
        </div>
      )}
      {attempt.audioUrl && (
        <audio src={attempt.audioUrl} controls className="w-full h-8 mb-2" />
      )}
      {attempt.feedback && (
        <details className="text-[12px]">
          <summary className="text-ink-2 cursor-pointer hover:text-ink underline underline-offset-2">
            View AI feedback
          </summary>
          <div className="mt-2 prose max-w-none text-[13px] leading-relaxed">
            <ReactMarkdown>{attempt.feedback}</ReactMarkdown>
          </div>
        </details>
      )}
    </div>
  );
}
