'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

interface VoiceAuditProgram {
  id: string;
  slug: string;
  title: string;
  voiceCount: number;
}

interface VoiceAuditQuestion {
  id: string;
  title: string | null;
  scenario: string | null;
  guidance: string | null;
  aiPrompt: string | null;
  sortOrder: number;
  section: {
    id: string;
    slug: string;
    title: string;
    sortOrder: number;
  };
  program: {
    id: string;
    slug: string;
    title: string;
  };
}

type RecordingState = 'idle' | 'recording' | 'recorded' | 'transcribing' | 'evaluating' | 'complete';

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function VoiceAuditPage() {
  const { user, loading: authLoading } = useAuth('admin');
  const [programs, setPrograms] = useState<VoiceAuditProgram[]>([]);
  const [questions, setQuestions] = useState<VoiceAuditQuestion[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState('all');
  const [currentQuestion, setCurrentQuestion] = useState<VoiceAuditQuestion | null>(null);
  const [seenByPool, setSeenByPool] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [state, setState] = useState<RecordingState>('idle');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcription, setTranscription] = useState('');
  const [typedResponse, setTypedResponse] = useState('');
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [showRubric, setShowRubric] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const filteredQuestions = useMemo(() => {
    if (selectedProgramId === 'all') return questions;
    return questions.filter(question => question.program.id === selectedProgramId);
  }, [questions, selectedProgramId]);

  const poolKey = selectedProgramId;
  const selectedProgram = programs.find(program => program.id === selectedProgramId);
  const answeredInPool = (seenByPool[poolKey] || []).filter(id =>
    filteredQuestions.some(question => question.id === id)
  ).length;

  const resetAnswerState = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setState('idle');
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setTranscription('');
    setTypedResponse('');
    setFeedback('');
    setScore(null);
    setError(null);
    setShowRubric(false);
  }, [audioUrl]);

  const chooseRandomQuestion = useCallback(() => {
    if (filteredQuestions.length === 0) {
      setCurrentQuestion(null);
      return;
    }

    const validIds = new Set(filteredQuestions.map(question => question.id));
    const seenIds = (seenByPool[poolKey] || []).filter(id => validIds.has(id));
    const unseenQuestions = filteredQuestions.filter(question => !seenIds.includes(question.id));
    const candidates = unseenQuestions.length > 0 ? unseenQuestions : filteredQuestions;
    const nextQuestion = candidates[Math.floor(Math.random() * candidates.length)];

    setCurrentQuestion(nextQuestion);
    setSeenByPool(previous => {
      const previousSeen = (previous[poolKey] || []).filter(id => validIds.has(id));
      const nextSeen = unseenQuestions.length > 0 ? [...previousSeen, nextQuestion.id] : [nextQuestion.id];
      return { ...previous, [poolKey]: nextSeen };
    });
  }, [filteredQuestions, poolKey, seenByPool]);

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

  useEffect(() => {
    if (!authLoading && user) {
      const fetchQuestions = async () => {
        try {
          const res = await fetch('/api/admin/voice-audit/questions');
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to load voice assessments');
          setPrograms(data.programs || []);
          setQuestions(data.questions || []);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load voice assessments');
        } finally {
          setLoading(false);
        }
      };

      fetchQuestions();
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (!loading && filteredQuestions.length > 0 && !currentQuestion) {
      chooseRandomQuestion();
    }
  }, [chooseRandomQuestion, currentQuestion, filteredQuestions.length, loading]);

  const handleProgramChange = (programId: string) => {
    resetAnswerState();
    setSelectedProgramId(programId);
    setCurrentQuestion(null);
  };

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
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
        setRecordingTime(time => time + 1);
      }, 1000);
    } catch (err) {
      setError('Could not access the microphone. Check browser permission and try again.');
      console.error('Voice audit microphone error:', err);
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

  const evaluateTranscript = async (text: string) => {
    if (!currentQuestion || !text.trim()) return;

    setError(null);
    setState('evaluating');

    try {
      const res = await fetch('/api/admin/voice-audit/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseId: currentQuestion.id,
          transcription: text.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to evaluate response');

      setFeedback(data.feedback || '');
      setScore(typeof data.score === 'number' ? data.score : null);
      setState('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to evaluate response');
      setState(audioBlob ? 'recorded' : 'idle');
    }
  };

  const submitRecording = async () => {
    if (!audioBlob) return;

    setError(null);
    setState('transcribing');

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice-audit.webm');

      const transcribeRes = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      const transcribeData = await transcribeRes.json();
      if (!transcribeRes.ok) throw new Error(transcribeData.error || 'Failed to transcribe audio');

      const text = transcribeData.transcription || '';
      setTranscription(text);
      await evaluateTranscript(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transcribe audio');
      setState('recorded');
    }
  };

  const nextQuestion = () => {
    resetAnswerState();
    chooseRandomQuestion();
  };

  const evaluateTypedResponse = async () => {
    setTranscription(typedResponse);
    await evaluateTranscript(typedResponse);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Link href="/admin/programs" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Programs
          </Link>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Voice Assessment Audit</h1>
              <p className="text-slate-600">Random local testing for voice assessment prompts and AI rubrics.</p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm text-amber-800">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Local admin only
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Course</span>
              <select
                value={selectedProgramId}
                onChange={event => handleProgramChange(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="all">All courses ({questions.length} voice questions)</option>
                {programs.map(program => (
                  <option key={program.id} value={program.id}>
                    {program.title} ({program.voiceCount})
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={nextQuestion}
              disabled={filteredQuestions.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 12c0 1.232-.296 2.394-.82 3.42M4.5 12c0-1.232.296-2.394.82-3.42m11.36-3.26A7.47 7.47 0 0012 4.5a7.47 7.47 0 00-4.68 1.64M7.32 17.86A7.47 7.47 0 0012 19.5a7.47 7.47 0 004.68-1.64M3 8.5h3.5V5M17.5 19H21v-3.5" />
              </svg>
              Next random question
            </button>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            {selectedProgram ? selectedProgram.title : 'All courses'}: {answeredInPool} of {filteredQuestions.length} served in this cycle.
          </p>
        </section>

        {currentQuestion ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <section className="rounded-lg border border-slate-200 bg-white p-6">
              <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <span className="rounded bg-slate-100 px-2 py-1 text-slate-700">{currentQuestion.program.title}</span>
                <span>{currentQuestion.section.title}</span>
              </div>

              <h2 className="text-xl font-semibold text-slate-900">
                {currentQuestion.title || 'Untitled voice assessment'}
              </h2>

              {currentQuestion.scenario && (
                <div className="mt-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Scenario</h3>
                  <p className="mt-2 whitespace-pre-wrap leading-7 text-slate-800">{currentQuestion.scenario}</p>
                </div>
              )}

              {currentQuestion.guidance && (
                <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-700">Expected response guidance</h3>
                  <p className="mt-2 whitespace-pre-wrap leading-7 text-blue-950">{currentQuestion.guidance}</p>
                </div>
              )}

              {currentQuestion.aiPrompt && (
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={() => setShowRubric(show => !show)}
                    className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-950"
                  >
                    <svg className={`h-4 w-4 transition-transform ${showRubric ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    AI rubric
                  </button>
                  {showRubric && (
                    <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                      {currentQuestion.aiPrompt}
                    </pre>
                  )}
                </div>
              )}
            </section>

            <aside className="space-y-6">
              <section className="rounded-lg border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-semibold text-slate-900">Record response</h2>
                <div className="mt-4 flex items-center gap-3">
                  {state === 'recording' ? (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
                    >
                      <span className="h-2.5 w-2.5 rounded-sm bg-white" />
                      Stop {formatTime(recordingTime)}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startRecording}
                      disabled={state === 'transcribing' || state === 'evaluating'}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      <span className="h-3 w-3 rounded-full bg-red-500" />
                      Start recording
                    </button>
                  )}
                </div>

                {audioUrl && (
                  <audio controls src={audioUrl} className="mt-4 w-full" />
                )}

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={submitRecording}
                    disabled={!audioBlob || state === 'transcribing' || state === 'evaluating'}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {state === 'transcribing' ? 'Transcribing...' : state === 'evaluating' ? 'Evaluating...' : 'Assess audio'}
                  </button>
                  <button
                    type="button"
                    onClick={resetAnswerState}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Clear
                  </button>
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-semibold text-slate-900">Typed test response</h2>
                <textarea
                  value={typedResponse}
                  onChange={event => setTypedResponse(event.target.value)}
                  rows={6}
                  placeholder="Type a response here when you want to test the rubric without recording."
                  className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                <button
                  type="button"
                  onClick={evaluateTypedResponse}
                  disabled={!typedResponse.trim() || state === 'transcribing' || state === 'evaluating'}
                  className="mt-3 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {state === 'evaluating' ? 'Evaluating...' : 'Assess typed response'}
                </button>
              </section>
            </aside>
          </div>
        ) : (
          <section className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-600">
            No voice assessments found for this selection.
          </section>
        )}

        {(transcription || feedback) && (
          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Assessment result</h2>
                {score !== null && <p className="text-sm text-slate-500">Score: {score}/5</p>}
              </div>
              {state === 'complete' && (
                <button
                  type="button"
                  onClick={nextQuestion}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800"
                >
                  Next random question
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              )}
            </div>

            {transcription && (
              <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Transcript</h3>
                <p className="mt-2 whitespace-pre-wrap leading-7 text-slate-800">{transcription}</p>
              </div>
            )}

            {feedback && (
              <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-green-700">AI feedback</h3>
                <div className="mt-2 whitespace-pre-wrap leading-7 text-green-950">{feedback}</div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
