'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

interface ProgramInfo {
  id: string;
  slug: string;
  title: string;
  description: string | null;
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
            {programs.map(program => (
              <Link
                key={program.id}
                href={`/learn/${program.slug}`}
                className="bg-white rounded-lg border border-slate-200 p-6 hover:border-slate-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {program.title}
                    </h2>
                    {program.description && (
                      <p className="text-slate-600 mt-1">{program.description}</p>
                    )}
                  </div>
                  <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors flex-shrink-0 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
