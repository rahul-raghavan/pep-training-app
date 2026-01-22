'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface TraineeSummary {
  id: string;
  name: string;
  email?: string;
  access_token: string;
  created_at: string;
  last_active_at?: string;
  completedSections: number;
  totalSections: number;
  progressPercent: number;
  avgScore: number | null;
  status: 'not_started' | 'in_progress' | 'completed';
  exerciseCount: number;
}

export default function ManagerDashboard() {
  const router = useRouter();
  const [trainees, setTrainees] = useState<TraineeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewTraineeModal, setShowNewTraineeModal] = useState(false);
  const [newTraineeName, setNewTraineeName] = useState('');
  const [newTraineeEmail, setNewTraineeEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [newTraineeLink, setNewTraineeLink] = useState<string | null>(null);

  const fetchTrainees = async () => {
    try {
      const res = await fetch('/api/manager');
      if (res.status === 401) {
        router.push('/manager');
        return;
      }
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
    fetchTrainees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createTrainee = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch('/api/trainee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTraineeName, email: newTraineeEmail }),
      });

      if (!res.ok) throw new Error('Failed to create');

      const data = await res.json();
      const fullUrl = `${window.location.origin}${data.accessUrl}`;
      setNewTraineeLink(fullUrl);
      fetchTrainees();
    } catch {
      alert('Failed to create trainee link');
    } finally {
      setCreating(false);
    }
  };

  const copyLink = () => {
    if (newTraineeLink) {
      navigator.clipboard.writeText(newTraineeLink);
      alert('Link copied to clipboard!');
    }
  };

  const closeModal = () => {
    setShowNewTraineeModal(false);
    setNewTraineeName('');
    setNewTraineeEmail('');
    setNewTraineeLink(null);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Training Dashboard</h1>
            <p className="text-slate-600">Manage and monitor trainee progress</p>
          </div>
          <button
            onClick={() => setShowNewTraineeModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Trainee Link
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Stats overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-sm text-slate-500">Total Trainees</div>
            <div className="text-2xl font-semibold text-slate-900">{trainees.length}</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-sm text-slate-500">In Progress</div>
            <div className="text-2xl font-semibold text-blue-600">
              {trainees.filter(t => t.status === 'in_progress').length}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-sm text-slate-500">Completed</div>
            <div className="text-2xl font-semibold text-green-600">
              {trainees.filter(t => t.status === 'completed').length}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-sm text-slate-500">Not Started</div>
            <div className="text-2xl font-semibold text-slate-400">
              {trainees.filter(t => t.status === 'not_started').length}
            </div>
          </div>
        </div>

        {/* Trainee list */}
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h2 className="font-medium text-slate-900">All Trainees</h2>
          </div>

          {trainees.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No trainees yet. Click &quot;New Trainee Link&quot; to create one.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {trainees.map(trainee => (
                <Link
                  key={trainee.id}
                  href={`/manager/trainee/${trainee.id}`}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Status indicator */}
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
                        Last active: {formatDate(trainee.last_active_at)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Progress */}
                    <div className="text-right">
                      <div className="text-sm font-medium text-slate-900">
                        {trainee.completedSections}/{trainee.totalSections} sections
                      </div>
                      <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full ${
                            trainee.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${trainee.progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Score */}
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

      {/* New Trainee Modal */}
      {showNewTraineeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                {newTraineeLink ? 'Training Link Created' : 'Create New Trainee Link'}
              </h2>

              {newTraineeLink ? (
                <div>
                  <p className="text-slate-600 mb-4">
                    Share this link with {newTraineeName} to start their training:
                  </p>
                  <div className="bg-slate-50 p-3 rounded-lg mb-4 break-all text-sm font-mono">
                    {newTraineeLink}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={copyLink}
                      className="flex-1 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      Copy Link
                    </button>
                    <button
                      onClick={closeModal}
                      className="flex-1 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={createTrainee}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Trainee Name *
                    </label>
                    <input
                      type="text"
                      value={newTraineeName}
                      onChange={(e) => setNewTraineeName(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                      placeholder="Enter trainee's name"
                      required
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Email (optional)
                    </label>
                    <input
                      type="email"
                      value={newTraineeEmail}
                      onChange={(e) => setNewTraineeEmail(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                      placeholder="trainee@email.com"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex-1 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creating || !newTraineeName}
                      className="flex-1 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
                    >
                      {creating ? 'Creating...' : 'Create Link'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
