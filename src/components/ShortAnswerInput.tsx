'use client';

import { useState } from 'react';
import { ShortAnswerExercise } from '@/content/types';
import Pill from '@/components/paper/Pill';

interface PreviousAttempt {
  responseText: string;
  createdAt: string;
}

interface Props {
  exercise: ShortAnswerExercise;
  onComplete: (responseText: string) => Promise<void> | void;
  previousAttempts?: PreviousAttempt[];
}

export default function ShortAnswerInput({ exercise, onComplete, previousAttempts = [] }: Props) {
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const latestAttempt = previousAttempts[previousAttempts.length - 1];
  const canSubmit = response.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onComplete(response.trim());
      setSubmitted(true);
      setResponse('');
    } catch {
      setError('Could not save your response. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border border-rule rounded-lg bg-paper p-4 sm:p-5 my-5 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="text-[11px] uppercase tracking-wide font-medium text-ink-2">
          Reflection
        </div>
        {previousAttempts.length > 0 && (
          <Pill kind="default">
            {previousAttempts.length} response{previousAttempts.length > 1 ? 's' : ''}
          </Pill>
        )}
      </div>

      <h4 className="text-[16px] font-semibold tracking-tight leading-snug mb-3">
        {exercise.question}
      </h4>

      {latestAttempt && !submitted && (
        <details className="mb-4">
          <summary className="text-[13px] text-ink-2 cursor-pointer hover:text-ink">
            Show previous response
          </summary>
          <div className="mt-2 p-3 text-[13px] leading-relaxed rounded-md bg-paper-2 whitespace-pre-wrap">
            {latestAttempt.responseText}
          </div>
        </details>
      )}

      <textarea
        value={response}
        onChange={e => setResponse(e.target.value)}
        rows={4}
        className="w-full rounded-md border border-rule bg-paper-2 px-3 py-2 text-[14px] leading-relaxed text-ink outline-none focus:border-ink resize-y"
        placeholder="Type your response..."
      />

      {exercise.sampleAnswer && (
        <details className="mt-3">
          <summary className="text-[13px] text-ink-2 cursor-pointer hover:text-ink">
            Show guidance
          </summary>
          <div className="mt-2 p-3 text-[13px] leading-relaxed rounded-md bg-paper-2 whitespace-pre-wrap">
            {exercise.sampleAnswer}
          </div>
        </details>
      )}

      {error && (
        <div
          className="mt-3 p-3 border rounded-md text-[13px]"
          style={{ borderColor: '#fecaca', background: 'var(--bad-soft)', color: 'var(--bad)' }}
        >
          {error}
        </div>
      )}

      {submitted && (
        <div
          className="mt-3 p-3 border rounded-md text-[13px]"
          style={{ borderColor: '#86efac', background: 'var(--good-soft)', color: 'var(--good)' }}
        >
          Response saved.
        </div>
      )}

      <div className="flex justify-end mt-4">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="text-[13px] font-medium rounded-md px-4 py-2 bg-ink text-paper hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {submitting ? 'Saving...' : 'Save response'}
        </button>
      </div>
    </div>
  );
}
