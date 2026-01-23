'use client';

import { useState } from 'react';
import { MultipleChoiceExercise } from '@/content/types';

interface Props {
  exercise: MultipleChoiceExercise;
  onComplete: (correct: boolean) => void;
  previousAttempts?: number;
  previouslyCorrect?: boolean;
}

export default function MultipleChoice({ exercise, onComplete, previousAttempts = 0, previouslyCorrect }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (selected === null) return;
    setSubmitted(true);
    onComplete(selected === exercise.correctIndex);
  };

  const handleRetry = () => {
    setSelected(null);
    setSubmitted(false);
  };

  const isCorrect = selected === exercise.correctIndex;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 my-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 text-slate-600 text-xs font-medium px-2 py-1 rounded">
            Knowledge Check
          </div>
          {previousAttempts > 0 && (
            <div className={`text-xs px-2 py-1 rounded ${
              previouslyCorrect
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {previousAttempts} previous attempt{previousAttempts > 1 ? 's' : ''}
              {previouslyCorrect && ' (answered correctly)'}
            </div>
          )}
        </div>
      </div>

      <h4 className="text-lg font-medium text-slate-900 mb-4">{exercise.question}</h4>

      <div className="space-y-3">
        {exercise.options.map((option, index) => {
          const isSelected = selected === index;
          const isCorrectOption = index === exercise.correctIndex;

          let optionClass = 'border-slate-200 hover:border-slate-300 hover:bg-slate-50';

          if (submitted) {
            if (isCorrectOption) {
              optionClass = 'border-green-500 bg-green-50';
            } else if (isSelected && !isCorrectOption) {
              optionClass = 'border-red-500 bg-red-50';
            }
          } else if (isSelected) {
            optionClass = 'border-blue-500 bg-blue-50';
          }

          return (
            <button
              key={index}
              onClick={() => !submitted && setSelected(index)}
              disabled={submitted}
              className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${optionClass} ${
                submitted ? 'cursor-default' : 'cursor-pointer'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  isSelected ? 'border-current' : 'border-slate-300'
                }`}>
                  {submitted && isCorrectOption && (
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {submitted && isSelected && !isCorrectOption && (
                    <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span className="text-slate-700">{option}</span>
              </div>
            </button>
          );
        })}
      </div>

      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={selected === null}
          className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Check Answer
        </button>
      )}

      {submitted && (
        <div className={`mt-4 p-4 rounded-lg ${isCorrect ? 'bg-green-50' : 'bg-amber-50'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {isCorrect ? (
                <>
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium text-green-800">Correct!</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium text-amber-800">Not quite</span>
                </>
              )}
            </div>
            <button
              onClick={handleRetry}
              className="text-sm text-slate-600 hover:text-slate-800 underline"
            >
              Try again
            </button>
          </div>
          <p className="text-sm text-slate-700">{exercise.explanation}</p>
        </div>
      )}
    </div>
  );
}
