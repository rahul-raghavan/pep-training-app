'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

interface Program {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  passing_score: number;
  is_active: boolean;
}

interface Section {
  id: string;
  slug: string;
  title: string;
  estimated_minutes: number;
  sort_order: number;
  preview?: string;
}

export default function ProgramEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth('admin');
  const programId = params.programId as string;

  const [program, setProgram] = useState<Program | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', slug: '', description: '', passing_score: 80, is_active: true });
  const [saving, setSaving] = useState(false);

  // New section form
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionSlug, setNewSectionSlug] = useState('');
  const [newSectionMinutes, setNewSectionMinutes] = useState(15);
  const [addingSection, setAddingSection] = useState(false);

  const fetchData = async () => {
    try {
      const [programRes, sectionsRes] = await Promise.all([
        fetch(`/api/programs/${programId}`),
        fetch(`/api/programs/${programId}/sections`),
      ]);
      if (!programRes.ok) { router.push('/admin/programs'); return; }

      const programData = await programRes.json();
      const sectionsData = await sectionsRes.json();

      setProgram(programData.program);
      setSections(sectionsData.sections || []);
      setEditForm({
        title: programData.program.title,
        slug: programData.program.slug,
        description: programData.program.description || '',
        passing_score: programData.program.passing_score,
        is_active: programData.program.is_active,
      });
    } catch {
      router.push('/admin/programs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId, authLoading, user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/programs/${programId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to save');
        return;
      }
      const data = await res.json();
      setProgram(data.program);
      setEditing(false);
    } catch {
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this program? This will delete all sections, content, and exercises.')) return;
    try {
      await fetch(`/api/programs/${programId}`, { method: 'DELETE' });
      router.push('/admin/programs');
    } catch {
      alert('Failed to delete');
    }
  };

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingSection(true);
    try {
      const res = await fetch(`/api/programs/${programId}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newSectionTitle, slug: newSectionSlug, estimated_minutes: newSectionMinutes }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to create section');
        return;
      }
      setShowAddSection(false);
      setNewSectionTitle('');
      setNewSectionSlug('');
      setNewSectionMinutes(15);
      fetchData();
    } catch {
      alert('Failed to create section');
    } finally {
      setAddingSection(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (loading || !program) {
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
          <Link href="/admin/programs" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            All Programs
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">{program.title}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  program.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {program.is_active ? 'Active' : 'Inactive'}
                </span>
                <span className="text-sm text-slate-500">/{program.slug}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/programs/${programId}/preview`}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Preview
              </Link>
              <Link
                href={`/admin/programs/${programId}/trainees`}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Trainees
              </Link>
              <Link
                href={`/admin/programs/${programId}/assessment`}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Assessment
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Program Settings */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-slate-900">Program Settings</h2>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="text-sm text-blue-600 hover:text-blue-800">
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="text-sm text-blue-600 hover:text-blue-800">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>

          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Slug</label>
                <input
                  type="text"
                  value={editForm.slug}
                  onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  rows={3}
                />
              </div>
              <div className="flex gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Passing Score (%)</label>
                  <input
                    type="number"
                    value={editForm.passing_score}
                    onChange={(e) => setEditForm({ ...editForm, passing_score: parseInt(e.target.value) || 80 })}
                    className="w-24 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={editForm.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setEditForm({ ...editForm, is_active: e.target.value === 'active' })}
                    className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <button onClick={handleDelete} className="text-sm text-red-600 hover:text-red-800">
                  Delete Program
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm text-slate-600">
              {program.description && <p>{program.description}</p>}
              <p>Passing score: {program.passing_score}%</p>
            </div>
          )}
        </div>

        {/* Sections */}
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-medium text-slate-900">Sections ({sections.length})</h2>
            <button
              onClick={() => setShowAddSection(true)}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Section
            </button>
          </div>

          {sections.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No sections yet. Add your first section to start building content.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {sections.map((section, index) => (
                <Link
                  key={section.id}
                  href={`/admin/programs/${programId}/sections/${section.id}`}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-medium text-slate-600">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{section.title}</div>
                      <div className="text-sm text-slate-500">
                        /{section.slug} &middot; {section.estimated_minutes} min
                      </div>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Section Modal */}
      {showAddSection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Add Section</h2>
              <form onSubmit={handleAddSection}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Title *</label>
                  <input
                    type="text"
                    value={newSectionTitle}
                    onChange={(e) => {
                      setNewSectionTitle(e.target.value);
                      if (!newSectionSlug || newSectionSlug === generateSlug(newSectionTitle)) {
                        setNewSectionSlug(generateSlug(e.target.value));
                      }
                    }}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Slug *</label>
                  <input
                    type="text"
                    value={newSectionSlug}
                    onChange={(e) => setNewSectionSlug(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono text-sm"
                    required
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Estimated Minutes</label>
                  <input
                    type="number"
                    value={newSectionMinutes}
                    onChange={(e) => setNewSectionMinutes(parseInt(e.target.value) || 15)}
                    className="w-24 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowAddSection(false); setNewSectionTitle(''); setNewSectionSlug(''); }}
                    className="flex-1 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingSection || !newSectionTitle || !newSectionSlug}
                    className="flex-1 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
                  >
                    {addingSection ? 'Adding...' : 'Add Section'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
