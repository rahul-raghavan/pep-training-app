'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { sections } from '@/content/sections';
import ProgressBar from '@/components/ProgressBar';
import { Trainee, Progress } from '@/content/types';

export default function TraineeDashboard() {
  const params = useParams();
  const token = params.token as string;

  const [trainee, setTrainee] = useState<Trainee | null>(null);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/trainee?token=${token}`);
        if (!res.ok) {
          throw new Error('Invalid or expired link');
        }
        const data = await res.json();
        setTrainee(data.trainee);
        setProgress(data.progress);
      } catch {
        setError('This training link is invalid or has expired. Please contact your manager for a new link.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !trainee) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Link Not Found</h1>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  // Build section progress data
  const sectionProgress = sections.map(section => {
    const prog = progress.find(p => p.section_id === section.id);
    return {
      id: section.id,
      title: section.title,
      status: (prog?.status || 'not_started') as 'not_started' | 'in_progress' | 'completed',
      estimatedMinutes: section.estimatedMinutes,
    };
  });

  // Find next incomplete section
  const nextSection = sectionProgress.find(s => s.status !== 'completed');
  const allComplete = !nextSection;

  // Calculate total time
  const totalMinutes = sections.reduce((sum, s) => sum + s.estimatedMinutes, 0);
  const completedMinutes = sectionProgress
    .filter(s => s.status === 'completed')
    .reduce((sum, s) => sum + s.estimatedMinutes, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-sm text-slate-500 mb-1">Admissions Training</div>
          <h1 className="text-2xl font-semibold text-slate-900">Welcome, {trainee.name}</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress overview */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
          <h2 className="text-lg font-medium text-slate-900 mb-4">Your Progress</h2>
          <ProgressBar sections={sectionProgress} />

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
            <span className="text-slate-600">
              Estimated time remaining: {Math.max(0, totalMinutes - completedMinutes)} minutes
            </span>
            {!allComplete && nextSection && (
              <Link
                href={`/train/${token}/${nextSection.id}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                {nextSection.status === 'in_progress' ? 'Continue' : 'Start'} Training
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}
          </div>
        </div>

        {/* Section list */}
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h2 className="font-medium text-slate-900">All Sections</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {sectionProgress.map((section, index) => {
              const isAccessible = index === 0 || sectionProgress[index - 1].status === 'completed' || section.status !== 'not_started';

              return (
                <div key={section.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      section.status === 'completed'
                        ? 'bg-green-100 text-green-600'
                        : section.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                      {section.status === 'completed' ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span className="text-sm font-medium">{index + 1}</span>
                      )}
                    </div>
                    <div>
                      <div className={`font-medium ${section.status === 'completed' ? 'text-slate-500' : 'text-slate-900'}`}>
                        {section.title}
                      </div>
                      <div className="text-sm text-slate-500">
                        {section.estimatedMinutes} minutes
                      </div>
                    </div>
                  </div>

                  {isAccessible ? (
                    <Link
                      href={`/train/${token}/${section.id}`}
                      className={`text-sm font-medium ${
                        section.status === 'completed'
                          ? 'text-slate-500 hover:text-slate-700'
                          : 'text-blue-600 hover:text-blue-800'
                      }`}
                    >
                      {section.status === 'completed' ? 'Review' : section.status === 'in_progress' ? 'Continue' : 'Start'}
                    </Link>
                  ) : (
                    <span className="text-sm text-slate-400">Locked</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Completion message */}
        {allComplete && (
          <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-green-900 mb-2">Training Complete!</h3>
            <p className="text-green-800">
              Congratulations! You&apos;ve completed all sections. Your manager will review your progress and reach out about next steps.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
