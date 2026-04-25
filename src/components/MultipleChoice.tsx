'use client';

import { useState } from 'react';
import { MultipleChoiceExercise } from '@/content/types';
import Pill from '@/components/paper/Pill';

interface Props {
  exercise: MultipleChoiceExercise;
  onComplete: (correct: boolean, selectedIndex: number) => void;
  previousAttempts?: number;
  previouslyCorrect?: boolean;
  correctAttempts?: number;
}

type OptionState = 'idle' | 'selected' | 'correct' | 'wrong' | 'revealed-correct' | 'dim';

function optionStyle(state: OptionState): { borderClass: string; bg: string; markColor: string; mark: string } {
  switch (state) {
    case 'selected':
      return { borderClass: 'border-2', bg: 'var(--accent-soft)', markColor: 'var(--accent)', mark: '●' };
    case 'correct':
      return { borderClass: 'border-2', bg: 'var(--good-soft)', markColor: 'var(--good)', mark: '✓' };
    case 'wrong':
      return { borderClass: 'border-2', bg: 'var(--bad-soft)', markColor: 'var(--bad)', mark: '✕' };
    case 'revealed-correct':
      return { borderClass: 'border-2', bg: 'var(--good-soft)', markColor: 'var(--good)', mark: '✓' };
    case 'dim':
      return { borderClass: 'border', bg: 'var(--paper)', markColor: 'var(--ink-3)', mark: '' };
    default:
      return { borderClass: 'border', bg: 'var(--paper)', markColor: 'var(--ink-3)', mark: '' };
  }
}

function stateBorderColor(state: OptionState): string {
  switch (state) {
    case 'selected':
      return 'var(--accent)';
    case 'correct':
    case 'revealed-correct':
      return 'var(--good)';
    case 'wrong':
      return 'var(--bad)';
    case 'dim':
      return 'var(--rule)';
    default:
      return 'var(--rule)';
  }
}

export default function MultipleChoice({
  exercise,
  onComplete,
  previousAttempts = 0,
  previouslyCorrect,
  correctAttempts = 0,
}: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (selected === null) return;
    setSubmitted(true);
    onComplete(selected === exercise.correctIndex, selected);
  };

  const handleRetry = () => {
    setSelected(null);
    setSubmitted(false);
  };

  const isCorrect = selected === exercise.correctIndex;

  return (
    <div className="border border-rule rounded-lg bg-paper p-4 sm:p-5 my-5 shadow-sm">
      {/* Eyebrow */}
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="text-[11px] uppercase tracking-wide font-medium text-ink-2">
          Knowledge check
        </div>
        {previousAttempts > 0 && (
          <Pill kind={previouslyCorrect ? 'good' : 'warn'}>
            {previousAttempts} attempt{previousAttempts > 1 ? 's' : ''}
            {correctAttempts > 0 && ` · ${correctAttempts} correct`}
            {correctAttempts === 0 && ` · none correct yet`}
          </Pill>
        )}
      </div>

      <h4 className="text-[17px] font-semibold tracking-tight leading-snug mb-4">{exercise.question}</h4>

      <div className="flex flex-col gap-2.5">
        {exercise.options.map((option, index) => {
          const isSelected = selected === index;
          const isCorrectOption = index === exercise.correctIndex;

          let state: OptionState;
          if (submitted) {
            if (isCorrectOption && isSelected) state = 'correct';
            else if (!isCorrectOption && isSelected) state = 'wrong';
            else if (isCorrectOption && !isSelected) state = 'revealed-correct';
            else state = 'dim';
          } else if (isSelected) {
            state = 'selected';
          } else {
            state = 'idle';
          }

          const s = optionStyle(state);

          return (
            <button
              key={index}
              onClick={() => !submitted && setSelected(index)}
              disabled={submitted}
              className={`w-full text-left p-3 sm:p-3.5 rounded-md ${s.borderClass} flex items-start gap-3 transition-colors ${
                submitted ? 'cursor-default' : 'cursor-pointer hover:border-slate-300'
              }`}
              style={{
                borderColor: stateBorderColor(state),
                background: s.bg,
                color: state === 'dim' ? 'var(--ink-3)' : 'var(--ink)',
              }}
            >
              <div
                className="w-6 h-6 border rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-semibold"
                style={{ borderColor: s.markColor, color: s.markColor }}
              >
                {s.mark || String.fromCharCode(65 + index)}
              </div>
              <span className="text-[14px] leading-snug break-words flex-1">
                {option}
              </span>
            </button>
          );
        })}
      </div>

      {!submitted && (
        <div className="flex justify-end mt-4">
          <button
            onClick={handleSubmit}
            disabled={selected === null}
            className="text-[13px] font-medium rounded-md px-4 py-2 bg-ink text-paper hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            Check answer
          </button>
        </div>
      )}

      {submitted && (
        <div
          className="mt-4 p-3.5 rounded-md border"
          style={{
            borderColor: isCorrect ? '#86efac' : '#fde68a',
            background: isCorrect ? 'var(--good-soft)' : 'var(--warn-soft)',
          }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            {isCorrect ? (
              <span className="text-[14px] font-semibold text-good">✓ Correct</span>
            ) : (
              <span className="text-[14px] font-semibold" style={{ color: 'var(--warn-ink)' }}>
                Not quite
              </span>
            )}
            <span className="ml-auto">
              <button
                onClick={handleRetry}
                className="text-[12px] text-ink-2 hover:text-ink underline underline-offset-2"
              >
                Try again
              </button>
            </span>
          </div>
          <p className="text-[14px] leading-relaxed text-ink">
            {exercise.explanation}
          </p>
        </div>
      )}
    </div>
  );
}
