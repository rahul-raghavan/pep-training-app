'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

interface TraineeSummary {
  id: string;
  name: string;
  email?: string;
  created_at: string;
  last_active_at?: string;
  completedSections: number;
  totalSections: number;
  progressPercent: number;
  avgScore: number | null;
  status: 'not_started' | 'in_progress' | 'completed';
  exerciseCount: number;
  programs: { title: string; slug: string }[];
}

export default function AdminDashboard() {
  const { user, loading: authLoading, logout } = useAuth('admin');
  const [trainees, setTrainees] = useState<TraineeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterProgram, setFilterProgram] = useState<string>('all');

  const fetchTrainees = async () => {
    try {
      const res = await fetch('/api/manager');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setTrainees(data.trainees);
    } catch {
      setError('Failed to load trainees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchTrainees();
    }
  }, [authLoading, user]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Build list of unique program names for filtering
  const allProgramNames = Array.from(
    new Set(trainees.flatMap(t => t.programs.map(p => p.title)))
  ).sort();

  // Filter trainees
  const filteredTrainees = filterProgram === 'all'
    ? trainees
    : trainees.filter(t => t.programs.some(p => p.title === filterProgram));

  const stats = {
    total: filteredTrainees.length,
    inProgress: filteredTrainees.filter(t => t.status === 'in_progress').length,
    completed: filteredTrainees.filter(t => t.status === 'completed').length,
    notStarted: filteredTrainees.filter(t => t.status === 'not_started').length,
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
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Training Dashboard</h1>
            <p className="text-slate-600">Manage and monitor trainee progress</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/users"
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Users
            </Link>
            <Link
              href="/admin/programs"
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Programs
            </Link>
            <button
              onClick={logout}
              className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
        )}

        {/* Program filter */}
        {allProgramNames.length > 1 && (
          <div className="mb-6 flex items-center gap-2">
            <span className="text-sm text-slate-500">Filter by program:</span>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilterProgram('all')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  filterProgram === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                All Programs
              </button>
              {allProgramNames.map(name => (
                <button
                  key={name}
                  onClick={() => setFilterProgram(name)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filterProgram === name
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stats overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-sm text-slate-500">Total Trainees</div>
            <div className="text-2xl font-semibold text-slate-900">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-sm text-slate-500">In Progress</div>
            <div className="text-2xl font-semibold text-blue-600">{stats.inProgress}</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-sm text-slate-500">Completed</div>
            <div className="text-2xl font-semibold text-green-600">{stats.completed}</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-sm text-slate-500">Not Started</div>
            <div className="text-2xl font-semibold text-slate-400">{stats.notStarted}</div>
          </div>
        </div>

        {/* Trainee list */}
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h2 className="font-medium text-slate-900">
              {filterProgram === 'all' ? 'All Trainees' : filterProgram}
            </h2>
          </div>

          {filteredTrainees.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              {trainees.length === 0
                ? 'No trainees yet. Go to Users to add one.'
                : 'No trainees in this program.'}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredTrainees.map(trainee => (
                <Link
                  key={trainee.id}
                  href={`/admin/users/${trainee.id}`}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      trainee.status === 'completed'
                        ? 'bg-green-100 text-green-600'
                        : trainee.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                      {trainee.status === 'completed' ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span className="text-sm font-medium">
                          {trainee.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{trainee.name}</div>
                      <div className="text-sm text-slate-500">
                        {trainee.email && <>{trainee.email} &middot; </>}
                        {filterProgram === 'all' && <>{trainee.programs.map(p => p.title).join(', ')} &middot; </>}
                        Last active: {formatDate(trainee.last_active_at)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm font-medium text-slate-900">
                        {trainee.completedSections}/{trainee.totalSections} sections
                      </div>
                      <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full ${trainee.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'}`}
                          style={{ width: `${trainee.progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {trainee.avgScore !== null && (
                      <div className="text-right w-16">
                        <div className="text-sm text-slate-500">Avg Score</div>
                        <div className={`font-medium ${
                          trainee.avgScore >= 4 ? 'text-green-600' : trainee.avgScore >= 3 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {trainee.avgScore}/5
                        </div>
                      </div>
                    )}

                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

    </div>
  );
}
