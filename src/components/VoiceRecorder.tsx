'use client';

import { useState, useRef, useEffect } from 'react';
import { VoiceExercise } from '@/content/types';
import FeedbackDisplay from './FeedbackDisplay';

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
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Get the best previous score
  const bestPreviousScore = previousAttempts.length > 0
    ? Math.max(...previousAttempts.map(a => a.score))
    : null;

  // Check if audio is still available (within 30 days)
  const isAudioAvailable = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const daysDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 30;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setState('recording');
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } catch (err) {
      setError('Could not access microphone. Please ensure you have granted permission.');
      console.error('Error accessing microphone:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setState('recorded');
    }
  };

  const resetRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
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

      // Upload audio and get transcription
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const transcribeRes = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!transcribeRes.ok) {
        const errorData = await transcribeRes.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to transcribe audio');
      }

      const { transcription: text, audioUrl: uploadedUrl } = await transcribeRes.json();
      setTranscription(text);
      if (uploadedUrl) {
        setAudioUrl(uploadedUrl);
      }

      // Get AI feedback
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
        setError('Could not transcribe your recording. Your recording may be too long — try keeping it under 2 minutes.');
      } else if (message.includes('feedback')) {
        setError('Could not generate feedback. Please try submitting again.');
      } else {
        setError('Something went wrong. Please try again.');
      }
      console.error('Error submitting recording:', err);
      setState('recorded');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 my-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded">
            Voice Exercise
          </div>
          {previousAttempts.length > 0 && (
            <div className={`text-xs px-2 py-1 rounded ${
              bestPreviousScore && bestPreviousScore >= 4
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {previousAttempts.length} previous attempt{previousAttempts.length > 1 ? 's' : ''}
              {bestPreviousScore && ` (best: ${bestPreviousScore}/5)`}
            </div>
          )}
        </div>
        {previousAttempts.length > 0 && (
          <button
            onClick={() => setShowPreviousAttempts(!showPreviousAttempts)}
            className="text-xs text-slate-500 hover:text-slate-700 underline"
          >
            {showPreviousAttempts ? 'Hide' : 'Show'} previous attempts
          </button>
        )}
      </div>

      {/* Previous attempts */}
      {showPreviousAttempts && previousAttempts.length > 0 && (
        <div className="mb-6 space-y-3">
          {previousAttempts.map((attempt, idx) => (
            <div key={idx} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">
                  Attempt {idx + 1}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">
                    {new Date(attempt.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    attempt.score >= 4 ? 'bg-green-100 text-green-700' :
                    attempt.score >= 3 ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {attempt.score}/5
                  </span>
                </div>
              </div>
              {attempt.audioUrl && isAudioAvailable(attempt.createdAt) ? (
                <audio src={attempt.audioUrl} controls className="w-full h-8 mb-2" />
              ) : attempt.audioUrl ? (
                <p className="text-xs text-slate-400 italic mb-2">Audio recording expired</p>
              ) : null}
              <p className="text-sm text-slate-600 mb-2">{attempt.transcription}</p>
              <details className="text-xs">
                <summary className="text-slate-500 cursor-pointer hover:text-slate-700">View feedback</summary>
                <div className="mt-2">
                  <FeedbackDisplay feedback={attempt.feedback} score={attempt.score} compact />
                </div>
              </details>
            </div>
          ))}
        </div>
      )}

      {/* Scenario */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-slate-500 mb-2">Scenario</h4>
        <p className="text-lg text-slate-900 italic">&ldquo;{exercise.scenario}&rdquo;</p>
      </div>

      {/* Guidance (collapsible hint) */}
      <details className="mb-6">
        <summary className="text-sm text-slate-600 cursor-pointer hover:text-slate-800">
          Show guidance (what a good response includes)
        </summary>
        <div className="mt-2 p-3 bg-slate-50 rounded text-sm text-slate-700 whitespace-pre-wrap">
          {exercise.guidance}
        </div>
      </details>

      {/* Recording controls */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col items-center gap-4">
        {/* Recording button */}
        {state === 'idle' && (
          <button
            onClick={startRecording}
            className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
            Start Recording
          </button>
        )}

        {state === 'recording' && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-lg font-mono">{formatTime(recordingTime)}</span>
            </div>
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-full hover:bg-slate-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
              </svg>
              Stop Recording
            </button>
          </div>
        )}

        {state === 'recorded' && audioUrl && (
          <div className="flex flex-col items-center gap-4 w-full">
            <audio src={audioUrl} controls className="w-full max-w-md" />
            <div className="flex gap-3">
              <button
                onClick={resetRecording}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Re-record
              </button>
              <button
                onClick={submitRecording}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                Submit for Feedback
              </button>
            </div>
          </div>
        )}

        {(state === 'transcribing' || state === 'getting-feedback') && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
            <p className="text-slate-600">
              {state === 'transcribing' ? 'Transcribing your response...' : 'Getting feedback...'}
            </p>
          </div>
        )}

        {state === 'complete' && (
          <div className="w-full space-y-4">
            {/* Audio playback */}
            {audioUrl && (
              <div>
                <h5 className="text-sm font-medium text-slate-500 mb-2">Your Recording</h5>
                <audio src={audioUrl} controls className="w-full max-w-md" />
              </div>
            )}

            {/* Transcription */}
            {transcription && (
              <div>
                <h5 className="text-sm font-medium text-slate-500 mb-2">Transcription</h5>
                <p className="text-slate-700 bg-slate-50 p-3 rounded">{transcription}</p>
              </div>
            )}

            {/* Feedback */}
            <FeedbackDisplay feedback={feedback} score={score} />

            {/* Re-record option - always available */}
            <button
              onClick={resetRecording}
              className="text-sm text-slate-600 hover:text-slate-800 underline"
            >
              Try again with a new recording
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
