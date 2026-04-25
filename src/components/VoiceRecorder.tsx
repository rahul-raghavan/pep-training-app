'use client';

import { useState, useRef, useEffect } from 'react';
import { VoiceExercise } from '@/content/types';
import FeedbackDisplay from './FeedbackDisplay';
import Pill from '@/components/paper/Pill';

interface PreviousAttempt {
  transcription: string;
  feedback: string;
  score: number;
  audioUrl?: string;
  createdAt: string;
}

interface Props {
  exercise: VoiceExercise;
  traineeId: string;
  sectionId: string;
  onComplete: (feedback: string, score: number) => void;
  previousAttempts?: PreviousAttempt[];
}

type RecordingState = 'idle' | 'recording' | 'recorded' | 'transcribing' | 'getting-feedback' | 'complete';

const WAVE = [3, 7, 4, 9, 12, 6, 10, 14, 8, 5, 11, 7, 4, 9, 13, 8, 5, 3, 6, 9, 12, 7, 4, 8, 11, 6, 9, 5, 3, 7, 10, 5, 8, 4, 9, 6, 3, 8];

function FakeWaveform({ animated = false }: { animated?: boolean }) {
  return (
    <div className="flex items-end gap-[2px] h-[18px]">
      {WAVE.map((h, i) => (
        <div
          key={i}
          style={{
            width: 3,
            height: h,
            background: animated ? 'var(--accent)' : 'var(--ink-3)',
            animation: animated ? `wave 1.2s ease-in-out infinite ${(i % 8) * 0.08}s` : undefined,
          }}
        />
      ))}
      {animated && (
        <style jsx>{`
          @keyframes wave {
            0%, 100% { transform: scaleY(0.5); }
            50%      { transform: scaleY(1.2); }
          }
        `}</style>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function isAudioAvailable(createdAt: string): boolean {
  const created = new Date(createdAt);
  const days = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
  return days <= 30;
}

export default function VoiceRecorder({ exercise, traineeId, sectionId, onComplete, previousAttempts = [] }: Props) {
  const [state, setState] = useState<RecordingState>('idle');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const [score, setScore] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showPreviousAttempts, setShowPreviousAttempts] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const bestPreviousScore = previousAttempts.length > 0
    ? Math.max(...previousAttempts.map(a => a.score))
    : null;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setState('recording');
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (err) {
      setError('Could not access microphone. Please ensure you have granted permission.');
      console.error('Error accessing microphone:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      setState('recorded');
    }
  };

  const resetRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAudioBlob(null);
    setTranscription('');
    setFeedback('');
    setScore(0);
    setRecordingTime(0);
    setState('idle');
  };

  const submitRecording = async () => {
    if (!audioBlob) return;
    try {
      setError(null);
      setState('transcribing');

      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const transcribeRes = await fetch('/api/transcribe', { method: 'POST', body: formData });
      if (!transcribeRes.ok) {
        const errorData = await transcribeRes.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to transcribe audio');
      }

      const { transcription: text, audioUrl: uploadedUrl } = await transcribeRes.json();
      setTranscription(text);
      if (uploadedUrl) setAudioUrl(uploadedUrl);

      setState('getting-feedback');

      const feedbackRes = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          traineeId,
          sectionId,
          exerciseId: exercise.id,
          scenario: exercise.scenario,
          guidance: exercise.guidance,
          aiPrompt: exercise.aiPrompt,
          transcription: text,
          audioUrl: uploadedUrl,
        }),
      });
      if (!feedbackRes.ok) {
        const errorData = await feedbackRes.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get feedback');
      }

      const { feedback: fb, score: sc } = await feedbackRes.json();
      setFeedback(fb);
      setScore(sc);
      setState('complete');
      onComplete(fb, sc);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      if (message.includes('transcribe')) {
        setError('Could not transcribe your recording. Try keeping it under 2 minutes.');
      } else if (message.includes('feedback')) {
        setError('Could not generate feedback. Please try submitting again.');
      } else {
        setError('Something went wrong. Please try again.');
      }
      console.error('Error submitting recording:', err);
      setState('recorded');
    }
  };

  return (
    <div className="border border-rule rounded-lg bg-paper p-4 sm:p-5 my-5 shadow-sm">
      {/* Eyebrow */}
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="text-[11px] uppercase tracking-wide font-medium text-ink-2">
          Voice exercise
        </div>
        {previousAttempts.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Pill kind={bestPreviousScore && bestPreviousScore >= 4 ? 'good' : 'warn'}>
              {previousAttempts.length} attempt{previousAttempts.length > 1 ? 's' : ''}
              {bestPreviousScore && ` · best ${bestPreviousScore}/5`}
            </Pill>
            <button
              onClick={() => setShowPreviousAttempts(!showPreviousAttempts)}
              className="text-[12px] text-ink-2 hover:text-ink underline underline-offset-2"
            >
              {showPreviousAttempts ? 'Hide' : 'Show'} previous
            </button>
          </div>
        )}
      </div>

      {/* Scenario card */}
      <div className="text-[15px] leading-relaxed border border-rule rounded-md p-4 mb-4 bg-paper-2">
        <span className="font-semibold">Scenario.</span> {exercise.scenario}
        <div className="mt-2 italic text-ink-2 text-[13px]">
          Record your response. Pretend you&apos;re really there.
        </div>
      </div>

      {/* Optional guidance */}
      {exercise.guidance && (
        <details className="mb-4">
          <summary className="text-[13px] text-ink-2 cursor-pointer hover:text-ink">
            Show guidance (what a strong response includes)
          </summary>
          <div className="mt-2 p-3 text-[13px] leading-relaxed whitespace-pre-wrap rounded-md bg-paper-2">
            {exercise.guidance}
          </div>
        </details>
      )}

      {/* Previous attempts (collapsible) */}
      {showPreviousAttempts && previousAttempts.length > 0 && (
        <div className="mb-5">
          <div className="text-[11px] uppercase tracking-wide font-medium text-ink-2 mb-2">
            Previous attempts ({previousAttempts.length})
          </div>
          <div className="flex flex-col gap-2.5">
            {previousAttempts.map((attempt, idx) => (
              <div key={idx} className="p-3 border border-rule rounded-md bg-paper">
                <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                  <span className="text-[14px] font-semibold">Attempt {idx + 1}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-ink-3">
                      {new Date(attempt.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <Pill kind={attempt.score >= 4 ? 'good' : attempt.score >= 3 ? 'warn' : 'bad'}>
                      {attempt.score}/5
                    </Pill>
                  </div>
                </div>
                {attempt.audioUrl && isAudioAvailable(attempt.createdAt) ? (
                  <audio src={attempt.audioUrl} controls className="w-full h-8 mb-2" />
                ) : attempt.audioUrl ? (
                  <p className="text-[11px] italic text-ink-3 mb-2">Audio expired (kept 30 days)</p>
                ) : null}
                <p className="text-[13px] text-ink mb-2 leading-relaxed">
                  {attempt.transcription}
                </p>
                <details className="text-[12px]">
                  <summary className="text-ink-2 cursor-pointer hover:text-ink underline underline-offset-2">
                    View feedback
                  </summary>
                  <div className="mt-2">
                    <FeedbackDisplay feedback={attempt.feedback} score={attempt.score} compact />
                  </div>
                </details>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="mb-4 p-3 border rounded-md text-[13px]"
          style={{ borderColor: '#fecaca', background: 'var(--bad-soft)', color: 'var(--bad)' }}
        >
          {error}
        </div>
      )}

      {/* Recording panel */}
      {(state === 'idle' || state === 'recording' || state === 'recorded') && (
        <div className="border border-rule rounded-lg p-4 bg-paper-2">
          <div className="flex items-center gap-4">
            {/* Big circular record button */}
            {state === 'idle' && (
              <button
                onClick={startRecording}
                aria-label="Start recording"
                className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 hover:opacity-90 transition-opacity shadow-sm"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                <span className="text-[28px] leading-none">●</span>
              </button>
            )}

            {state === 'recording' && (
              <button
                onClick={stopRecording}
                aria-label="Stop recording"
                className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 hover:opacity-90 transition-opacity shadow-sm"
                style={{ background: 'var(--ink)', color: '#fff' }}
              >
                <span className="text-[20px] leading-none">■</span>
              </button>
            )}

            {state === 'recorded' && (
              <div className="w-16 h-16 rounded-full border border-rule bg-paper flex items-center justify-center flex-shrink-0 text-good">
                <span className="text-[24px] leading-none">✓</span>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="text-[16px] font-semibold tracking-tight">
                {state === 'idle' && 'Tap to record'}
                {state === 'recording' && (
                  <span className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block animate-pulse"
                      style={{ background: 'var(--bad)' }}
                    />
                    Recording · {formatTime(recordingTime)}
                  </span>
                )}
                {state === 'recorded' && 'Listen back'}
              </div>
              <div className="text-[13px] text-ink-2 mt-1">
                {state === 'idle' && "Aim for 30–60 sec. You'll see a transcript + AI feedback after."}
                {state === 'recording' && 'Stop when you\'re done — re-record anytime.'}
                {state === 'recorded' && 'Re-record or submit for feedback.'}
              </div>
              <div className="mt-2.5">
                <FakeWaveform animated={state === 'recording'} />
              </div>
            </div>
          </div>

          {state === 'recorded' && audioUrl && (
            <div className="mt-4 flex flex-col gap-3">
              <audio src={audioUrl} controls className="w-full" />
              <div className="flex gap-2 justify-end flex-wrap">
                <button
                  onClick={resetRecording}
                  className="text-[13px] font-medium border border-rule rounded-md px-3 py-1.5 hover:bg-paper-2 transition-colors"
                >
                  Re-record
                </button>
                <button
                  onClick={submitRecording}
                  className="text-[13px] font-medium rounded-md px-3 py-1.5 bg-ink text-paper hover:opacity-90 transition-opacity"
                >
                  Submit for feedback
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Working state */}
      {(state === 'transcribing' || state === 'getting-feedback') && (
        <div className="flex flex-col items-center gap-3 py-10">
          <div className="w-8 h-8 border-2 border-rule border-t-ink rounded-full animate-spin" />
          <p className="text-[14px] text-ink-2">
            {state === 'transcribing' ? 'Transcribing your response…' : 'Getting feedback…'}
          </p>
        </div>
      )}

      {/* Complete state — show full feedback */}
      {state === 'complete' && (
        <div className="flex flex-col gap-4">
          {/* Recording playback + transcript */}
          <div className="grid sm:grid-cols-2 gap-3.5">
            {audioUrl && (
              <div className="border border-rule rounded-md p-3 bg-paper">
                <div className="text-[11px] uppercase tracking-wide font-medium text-ink-2 mb-2">
                  Your recording
                </div>
                <audio src={audioUrl} controls className="w-full mb-2" />
                <FakeWaveform />
                <div className="text-[11px] text-ink-2 mt-2">
                  Audio kept for 30 days. After that only the transcript stays.
                </div>
              </div>
            )}
            {transcription && (
              <div className="border border-rule rounded-md p-3 bg-paper">
                <div className="text-[11px] uppercase tracking-wide font-medium text-ink-2 mb-2">
                  Transcript
                </div>
                <p className="text-[13px] leading-relaxed text-ink">
                  &ldquo;{transcription}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* Score band + parsed feedback */}
          <FeedbackDisplay feedback={feedback} score={score} />

          {/* Try again */}
          <div className="flex justify-between items-center pt-3 border-t border-rule flex-wrap gap-2">
            <span className="text-[12px] text-ink-2">Re-attempts always allowed.</span>
            <button
              onClick={resetRecording}
              className="text-[13px] font-medium border border-rule rounded-md px-3 py-1.5 hover:bg-paper-2 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
