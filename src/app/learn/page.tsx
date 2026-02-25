'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

interface ProgramInfo {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  totalSections: number;
  completedSections: number;
  status: 'not_started' | 'in_progress' | 'sections_complete' | 'passed';
  bestScore: number | null;
  bestTotal: number | null;
}

function StatusBadge({ status }: { status: ProgramInfo['status'] }) {
  switch (status) {
    case 'passed':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Completed
        </span>
      );
    case 'sections_complete':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
          Assessment Ready
        </span>
      );
    case 'in_progress':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
          In Progress
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
          Not Started
        </span>
      );
  }
}

export default function LearnPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [programs, setPrograms] = useState<ProgramInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/my-programs');
        if (!res.ok) {
          setError('Failed to load your programs.');
          return;
        }
        const data = await res.json();
        setPrograms(data.programs || []);
      } catch {
        setError('Something went wrong loading your programs.');
      } finally {
        setLoading(false);
      }
    }
    if (!authLoading && user) fetchData();
  }, [authLoading, user]);

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
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">My Training</h1>
            <p className="text-slate-600">Welcome, {user?.name || 'Trainee'}</p>
          </div>
          <button
            onClick={logout}
            className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {error ? (
          <div className="bg-white rounded-lg border border-red-200 p-8 text-center">
            <h2 className="text-lg font-medium text-slate-900 mb-2">Error</h2>
            <p className="text-slate-500">{error}</p>
          </div>
        ) : programs.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-slate-900 mb-2">No Programs Yet</h2>
            <p className="text-slate-500">
              You haven&apos;t been enrolled in any training programs yet. Contact your administrator to get started.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {programs.map(program => {
              const progressPercent = program.totalSections > 0
                ? Math.round((program.completedSections / program.totalSections) * 100)
                : 0;

              return (
                <Link
                  key={program.id}
                  href={`/learn/${program.slug}`}
                  className="bg-white rounded-lg border border-slate-200 p-6 hover:border-slate-300 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {program.title}
                        </h2>
                        <StatusBadge status={program.status} />
                      </div>
                      {program.description && (
                        <p className="text-slate-600 text-sm">{program.description}</p>
                      )}
                    </div>
                    <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors flex-shrink-0 ml-4 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>

                  {/* Progress bar */}
                  {program.totalSections > 0 && (
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="text-slate-500">
                          {program.completedSections} of {program.totalSections} sections
                        </span>
                        {program.status === 'passed' && program.bestScore !== null && (
                          <span className="text-green-600 font-medium">
                            Assessment: {program.bestScore}/{program.bestTotal}
                          </span>
                        )}
                        {program.status !== 'passed' && (
                          <span className="text-slate-400">{progressPercent}%</span>
                        )}
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            program.status === 'passed'
                              ? 'bg-green-500'
                              : progressPercent > 0
                              ? 'bg-blue-500'
                              : 'bg-slate-200'
                          }`}
                          style={{ width: `${program.status === 'passed' ? 100 : progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
