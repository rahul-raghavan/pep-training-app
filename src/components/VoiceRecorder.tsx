'use client';

import { useState, useRef, useEffect } from 'react';
import { VoiceExercise } from '@/content/types';

interface Props {
  exercise: VoiceExercise;
  traineeId: string;
  sectionId: string;
  onComplete: (feedback: string, score: number) => void;
  existingResponse?: {
    transcription: string;
    feedback: string;
    score: number;
    audioUrl?: string;
  };
}

type RecordingState = 'idle' | 'recording' | 'recorded' | 'transcribing' | 'getting-feedback' | 'complete';

export default function VoiceRecorder({ exercise, traineeId, sectionId, onComplete, existingResponse }: Props) {
  const [state, setState] = useState<RecordingState>(existingResponse ? 'complete' : 'idle');
  const [audioUrl, setAudioUrl] = useState<string | null>(existingResponse?.audioUrl || null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcription, setTranscription] = useState<string>(existingResponse?.transcription || '');
  const [feedback, setFeedback] = useState<string>(existingResponse?.feedback || '');
  const [score, setScore] = useState<number>(existingResponse?.score || 0);
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl && !existingResponse?.audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl, existingResponse?.audioUrl]);

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
    if (audioUrl && !existingResponse?.audioUrl) {
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
        throw new Error('Failed to transcribe audio');
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
        throw new Error('Failed to get feedback');
      }

      const { feedback: fb, score: sc } = await feedbackRes.json();
      setFeedback(fb);
      setScore(sc);
      setState('complete');
      onComplete(fb, sc);
    } catch (err) {
      setError('Something went wrong. Please try again.');
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
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded">
          Voice Exercise
        </div>
      </div>

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
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              {/* Score header */}
              <div className={`px-4 py-3 flex items-center justify-between ${
                score >= 4 ? 'bg-green-50 border-b border-green-100' :
                score >= 3 ? 'bg-amber-50 border-b border-amber-100' :
                'bg-red-50 border-b border-red-100'
              }`}>
                <span className="font-medium text-slate-700">AI Feedback</span>
                <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  score >= 4 ? 'bg-green-100 text-green-700' :
                  score >= 3 ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {score}/5
                </div>
              </div>

              {/* Feedback content */}
              <div className="p-4 space-y-3 text-sm">
                {feedback.split('\n\n').map((paragraph, idx) => {
                  // Check if it's a header line (starts with **)
                  if (paragraph.startsWith('**') && paragraph.includes(':**')) {
                    const [header, ...rest] = paragraph.split(':**');
                    const headerText = header.replace(/\*\*/g, '');
                    const content = rest.join(':**').replace(/\*\*/g, '');
                    return (
                      <div key={idx}>
                        <h6 className="font-semibold text-slate-800 mb-1">{headerText}</h6>
                        <p className="text-slate-600">{content}</p>
                      </div>
                    );
                  }
                  // Check for bullet points
                  if (paragraph.includes('\n-')) {
                    const lines = paragraph.split('\n');
                    return (
                      <div key={idx}>
                        {lines[0] && !lines[0].startsWith('-') && (
                          <h6 className="font-semibold text-slate-800 mb-1">
                            {lines[0].replace(/\*\*/g, '')}
                          </h6>
                        )}
                        <ul className="list-disc list-inside space-y-1 text-slate-600">
                          {lines.filter(l => l.startsWith('-')).map((line, i) => (
                            <li key={i}>{line.substring(1).trim()}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  }
                  // Regular paragraph
                  return (
                    <p key={idx} className="text-slate-600">
                      {paragraph.replace(/\*\*/g, '')}
                    </p>
                  );
                })}
              </div>
            </div>

            {/* Re-record option */}
            {!existingResponse && (
              <button
                onClick={resetRecording}
                className="text-sm text-slate-600 hover:text-slate-800 underline"
              >
                Try again with a new recording
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
