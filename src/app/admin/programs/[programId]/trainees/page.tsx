'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

interface EnrolledTrainee {
  id: string;
  name: string;
  email?: string;
  access_token: string;
  enrolled_at: string;
  last_active_at?: string;
  completedSections: number;
  totalSections: number;
  progressPercent: number;
}

interface AvailableTrainee {
  id: string;
  name: string;
  email?: string;
}

export default function ProgramTraineesPage() {
  const params = useParams();
  const { user, loading: authLoading } = useAuth('admin');
  const programId = params.programId as string;

  const [trainees, setTrainees] = useState<EnrolledTrainee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEnroll, setShowEnroll] = useState(false);
  const [availableTrainees, setAvailableTrainees] = useState<AvailableTrainee[]>([]);
  const [selectedTraineeId, setSelectedTraineeId] = useState('');
  const [enrolling, setEnrolling] = useState(false);

  const fetchTrainees = async () => {
    try {
      const res = await fetch(`/api/programs/${programId}/trainees`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTrainees(data.trainees || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchTrainees();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId, authLoading, user]);

  const openEnrollModal = async () => {
    // Fetch all trainees to show available ones
    const res = await fetch('/api/manager?all=true');
    if (!res.ok) return;
    const data = await res.json();
    const enrolledIds = new Set(trainees.map(t => t.id));
    setAvailableTrainees(
      (data.trainees || []).filter((t: AvailableTrainee) => !enrolledIds.has(t.id))
    );
    setShowEnroll(true);
  };

  const handleEnroll = async () => {
    if (!selectedTraineeId) return;
    setEnrolling(true);
    try {
      const res = await fetch(`/api/programs/${programId}/trainees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainee_id: selectedTraineeId }),
      });
      if (res.ok) {
        setShowEnroll(false);
        setSelectedTraineeId('');
        fetchTrainees();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to enroll');
      }
    } finally {
      setEnrolling(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (loading) {
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
          <Link href={`/admin/programs/${programId}`} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Program
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-slate-900">Enrolled Trainees ({trainees.length})</h1>
            <button onClick={openEnrollModal} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Enroll Trainee
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {trainees.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-500">
            No trainees enrolled yet.
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200">
            <div className="divide-y divide-slate-100">
              {trainees.map(trainee => (
                <div key={trainee.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-medium text-slate-600">
                      {trainee.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{trainee.name}</div>
                      {trainee.email && (
                        <div className="text-sm text-slate-500">{trainee.email}</div>
                      )}
                      <div className="text-sm text-slate-400">
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
                        <div className="h-full bg-blue-500" style={{ width: `${trainee.progressPercent}%` }} />
                      </div>
                    </div>
                    <Link href={`/admin/users/${trainee.id}`} className="text-sm text-blue-600 hover:text-blue-800">
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {showEnroll && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Enroll Trainee</h2>
              {availableTrainees.length === 0 ? (
                <p className="text-slate-500 mb-4">All trainees are already enrolled in this program.</p>
              ) : (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Select Trainee</label>
                  <select
                    value={selectedTraineeId}
                    onChange={(e) => setSelectedTraineeId(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                  >
                    <option value="">Choose a trainee...</option>
                    {availableTrainees.map(t => (
                      <option key={t.id} value={t.id}>{t.name}{t.email ? ` (${t.email})` : ''}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setShowEnroll(false)} className="flex-1 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50">Cancel</button>
                {availableTrainees.length > 0 && (
                  <button onClick={handleEnroll} disabled={enrolling || !selectedTraineeId}
                    className="flex-1 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50">
                    {enrolling ? 'Enrolling...' : 'Enroll'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
