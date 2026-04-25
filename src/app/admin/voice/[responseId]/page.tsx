'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/hooks/useAuth';
import { PageShell, TopBar, PaperCard, Pill } from '@/components/paper';

interface HistoryEntry {
  id: string;
  score: number | null;
  createdAt: string;
  transcriptionExcerpt: string;
  isCurrent: boolean;
}

interface VoicePayload {
  id: string;
  createdAt: string;
  score: number | null;
  transcription: string | null;
  audioUrl: string | null;
  rawFeedback: string | null;
  exercise: { id: string; scenario: string; guidance: string | null };
  section: { id: string; title: string; slug: string };
  course: { id: string; title: string; slug: string };
  trainee: { id: string; name: string; email: string };
  history: HistoryEntry[];
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function scoreColor(score: number | null): string {
  if (score === null) return 'var(--ink-3)';
  if (score >= 4) return 'var(--good)';
  if (score >= 3) return 'var(--warn-ink)';
  return 'var(--bad)';
}

export default function VoiceAttemptPage() {
  const { user, loading: authLoading } = useAuth('admin');
  const params = useParams();
  const responseId = params.responseId as string;

  const [data, setData] = useState<VoicePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triage, setTriage] = useState<'coach' | 'fine' | 'redo' | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/voice/${responseId}`);
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        setError(e.error || 'Failed to load attempt');
        return;
      }
      setData(await res.json());
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [responseId]);

  useEffect(() => {
    if (!authLoading) fetchData();
  }, [authLoading, fetchData]);

  if (authLoading || loading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-rule border-t-ink rounded-full animate-spin" />
        </div>
      </PageShell>
    );
  }

  if (error || !data) {
    return (
      <PageShell maxWidth={520}>
        <TopBar right={<span>{user?.email}</span>} />
        <PaperCard className="mt-8 text-center">
          <h1 className="text-[20px] font-semibold tracking-tight">Voice attempt not found</h1>
          <p className="text-ink-2 mt-2 text-[14px]">{error}</p>
          <Link href="/admin/cohort" className="text-accent underline mt-3 inline-block text-[14px]">
            Back to cohort
          </Link>
        </PaperCard>
      </PageShell>
    );
  }

  const currentIdx = data.history.findIndex(h => h.isCurrent);
  const historyLine = data.history.map(h =>
    h.score === null ? '–' : String(h.score)
  );

  return (
    <PageShell maxWidth={1080}>
      <TopBar right={<span>{user?.email}</span>} />

      {/* Crumb */}
      <div className="flex items-baseline gap-3 mt-2 mb-3 flex-wrap">
        <Link
          href={`/admin/users/${data.trainee.id}`}
          className="text-[13px] text-ink-2 hover:text-ink"
        >
          ← {data.trainee.name}
        </Link>
        <span className="text-ink-3">/</span>
        <h1 className="text-[20px] font-semibold tracking-tight">
          {data.section.title}
        </h1>
        <Pill>
          {data.course.title}
        </Pill>
        <span className="ml-auto text-[12px] text-ink-3">
          attempt {currentIdx + 1} of {data.history.length} · {formatFullDate(data.createdAt)}
        </span>
      </div>

      {/* 3-col top band */}
      <div className="grid grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)_220px] gap-3 mb-4">
        {/* Score */}
        <PaperCard framed>
          <div className="text-[10px] uppercase tracking-wide font-medium text-ink-2">Score</div>
          <div
            className="text-[44px] font-semibold leading-none mt-2"
            style={{ color: scoreColor(data.score) }}
          >
            {data.score ?? '—'}
          </div>
          <div className="text-[11px] text-ink-3 mt-1">of 5</div>
          {data.history.length > 1 && (
            <div className="text-[11px] text-ink-2 mt-3 font-mono">
              {data.history.map((h, i) => (
                <span key={h.id}>
                  <span
                    style={{
                      color: scoreColor(h.score),
                      fontWeight: h.isCurrent ? 600 : 400,
                    }}
                  >
                    {historyLine[i]}
                  </span>
                  {i < data.history.length - 1 && <span className="text-ink-3"> → </span>}
                </span>
              ))}
            </div>
          )}
        </PaperCard>

        {/* Raw model verdict */}
        <PaperCard framed>
          <div className="text-[10px] uppercase tracking-wide font-medium text-ink-2">
            Model output (raw)
          </div>
          <div className="text-[11px] text-ink-3 mt-0.5 mb-2">
            What the AI returned. Teachers see a coaching-styled rendering of this.
          </div>
          <div className="font-mono text-[12px] text-ink leading-relaxed bg-paper-2 border border-rule rounded p-3 max-h-[280px] overflow-auto whitespace-pre-wrap">
            {data.rawFeedback ?? '(no feedback recorded)'}
          </div>
        </PaperCard>

        {/* Triage */}
        <PaperCard framed>
          <div className="text-[10px] uppercase tracking-wide font-medium text-ink-2 mb-2">
            Triage
          </div>
          <div className="flex flex-col gap-1.5">
            <TriageButton
              active={triage === 'coach'}
              onClick={() => setTriage(t => (t === 'coach' ? null : 'coach'))}
              label="● Coach"
              variant="accent"
            />
            <TriageButton
              active={triage === 'fine'}
              onClick={() => setTriage(t => (t === 'fine' ? null : 'fine'))}
              label="✓ Looks fine"
              variant="good"
            />
            <TriageButton
              active={triage === 'redo'}
              onClick={() => setTriage(t => (t === 'redo' ? null : 'redo'))}
              label="↻ Ask to re-do"
              variant="warn"
            />
            <div className="border-t border-rule my-1" />
            {data.trainee.email && (
              <a
                href={`mailto:${data.trainee.email}?subject=Quick%20note%20on%20your%20voice%20attempt`}
                className="block text-center px-3 py-1.5 rounded-md border border-rule bg-paper hover:bg-paper-2 text-[12px]"
              >
                📨 Send a nudge
              </a>
            )}
            <div className="text-[10px] text-ink-3 mt-1 italic leading-relaxed">
              Triage state isn&apos;t saved yet — wire up when you want to track per-attempt review.
            </div>
          </div>
        </PaperCard>
      </div>

      {/* Recording + transcript */}
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <PaperCard framed>
          <div className="text-[10px] uppercase tracking-wide font-medium text-ink-2 mb-2">
            Recording
          </div>
          {data.audioUrl ? (
            <audio src={data.audioUrl} controls className="w-full mb-2" />
          ) : (
            <div className="text-[12px] text-ink-3 italic">
              No audio file (may have expired — kept 30 days).
            </div>
          )}
          <div className="text-[11px] text-ink-3 mt-2 leading-relaxed">
            Captured {formatFullDate(data.createdAt)}.
          </div>
        </PaperCard>

        <PaperCard framed>
          <div className="text-[10px] uppercase tracking-wide font-medium text-ink-2 mb-2">
            Transcript
          </div>
          <p className="text-[14px] text-ink leading-relaxed">
            {data.transcription ? `“${data.transcription}”` : '(no transcript)'}
          </p>
        </PaperCard>
      </div>

      {/* Scenario */}
      <PaperCard framed className="mb-4">
        <div className="text-[10px] uppercase tracking-wide font-medium text-ink-2 mb-2">
          Scenario
        </div>
        <p className="text-[14px] text-ink leading-relaxed italic">
          {data.exercise.scenario || '(no scenario recorded)'}
        </p>
        {data.exercise.guidance && (
          <details className="mt-3">
            <summary className="text-[12px] text-ink-2 cursor-pointer hover:text-ink">
              ▸ Show coach guidance (what a strong response includes)
            </summary>
            <div className="mt-2 p-3 text-[13px] leading-relaxed whitespace-pre-wrap bg-paper-2 border border-rule rounded">
              {data.exercise.guidance}
            </div>
          </details>
        )}
      </PaperCard>

      {/* Coaching gloss (what teacher saw) */}
      <PaperCard framed className="mb-4">
        <div className="text-[10px] uppercase tracking-wide font-medium text-ink-2 mb-2">
          What the teacher saw (coaching gloss)
        </div>
        {data.rawFeedback ? (
          <div className="prose max-w-none text-[14px] leading-relaxed">
            <ReactMarkdown>{data.rawFeedback}</ReactMarkdown>
          </div>
        ) : (
          <div className="text-[12px] text-ink-3 italic">No feedback to show.</div>
        )}
      </PaperCard>

      {/* Attempt history */}
      {data.history.length > 1 && (
        <PaperCard framed>
          <div className="flex items-baseline gap-3 mb-3 pb-2 border-b border-rule">
            <h2 className="text-[16px] font-semibold tracking-tight">
              Attempt history ({data.history.length})
            </h2>
            <span className="text-[12px] text-ink-3">same exercise, same teacher</span>
          </div>
          <ul className="divide-y divide-rule">
            {data.history.map((h, i) => (
              <li key={h.id}>
                <Link
                  href={`/admin/voice/${h.id}`}
                  className={`block py-2 px-2 -mx-2 rounded hover:bg-paper-2/40 ${
                    h.isCurrent ? 'bg-accent-soft' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-ink-3 font-mono w-[120px] flex-shrink-0">
                      {formatFullDate(h.createdAt)}
                    </span>
                    <span className="text-[12px] text-ink-2 flex-shrink-0">
                      Attempt {i + 1}
                    </span>
                    <span className="text-[12px] text-ink truncate flex-1 italic">
                      {h.transcriptionExcerpt
                        ? `“${h.transcriptionExcerpt}${
                            h.transcriptionExcerpt.length >= 80 ? '…' : ''
                          }”`
                        : '—'}
                    </span>
                    <Pill kind={h.score === null ? 'default' : h.score >= 4 ? 'good' : h.score >= 3 ? 'warn' : 'bad'}>
                      {h.score === null ? '–' : `${h.score}/5`}
                    </Pill>
                    {h.isCurrent && <span className="text-[11px] text-accent">viewing</span>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </PaperCard>
      )}
    </PageShell>
  );
}

function TriageButton({
  active,
  onClick,
  label,
  variant,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  variant: 'accent' | 'good' | 'warn';
}) {
  const VARIANTS = {
    accent: { bg: 'var(--accent)', text: '#fff', border: 'var(--accent)' },
    good: { bg: '#86efac', text: '#064e3b', border: '#86efac' },
    warn: { bg: '#fde68a', text: '#7c2d12', border: '#fde68a' },
  };
  const v = VARIANTS[variant];
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-center px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors"
      style={{
        background: active ? v.bg : 'var(--paper)',
        color: active ? v.text : 'var(--ink)',
        border: active ? `1px solid ${v.border}` : '1px solid var(--rule)',
      }}
    >
      {label}
    </button>
  );
}
