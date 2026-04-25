'use client';

import { useEffect, useState } from 'react';

interface ProgramTrack {
  id: string;
  slug: string;
  name: string;
}

interface Props {
  programId: string;
  canEdit?: boolean;
}

/**
 * Editable Tracks card for /admin/programs/[programId].
 * Maps the course to one or more program tracks (Primary, Elementary, etc.).
 * Without this mapping, the course doesn't appear as a column in
 * /admin/assignments for any teacher in those tracks.
 */
export default function TracksEditor({ programId, canEdit = false }: Props) {
  const [tracks, setTracks] = useState<ProgramTrack[]>([]);
  const [migrationApplied, setMigrationApplied] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [lookupsRes, tracksRes] = await Promise.all([
          fetch('/api/admin/lookups'),
          fetch(`/api/admin/programs/${programId}/tracks`),
        ]);
        if (lookupsRes.ok) {
          const l = await lookupsRes.json();
          setTracks(l.programTracks || []);
          setMigrationApplied(l.migrationApplied ?? true);
        }
        if (tracksRes.ok) {
          const t = await tracksRes.json();
          setSelectedIds(t.trackIds || []);
        }
      } catch {
        // ignore
      } finally {
        setLoaded(true);
      }
    }
    load();
  }, [programId]);

  const startEdit = () => {
    setDraftIds([...selectedIds]);
    setEditing(true);
    setError(null);
  };

  const cancelEdit = () => {
    setEditing(false);
    setError(null);
  };

  const toggle = (id: string) =>
    setDraftIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/programs/${programId}/tracks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackIds: draftIds }),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || 'Failed to save');
        return;
      }
      setSelectedIds(draftIds);
      setEditing(false);
      setSavedAt(Date.now());
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 mb-8 animate-pulse">
        <div className="h-5 w-24 bg-slate-100 rounded mb-3" />
        <div className="h-4 w-2/3 bg-slate-100 rounded" />
      </div>
    );
  }

  const view = editing ? draftIds : selectedIds;
  const trackName = (id: string) => tracks.find(t => t.id === id)?.name ?? '?';

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 mb-8">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-medium text-slate-900">Program Tracks</h2>
          <p className="text-sm text-slate-500">
            Which tracks (Primary, Elementary, …) is this course offered to?
          </p>
        </div>
        <div className="flex items-center gap-3">
          {savedAt && Date.now() - savedAt < 4000 && (
            <span className="text-xs text-green-600">Saved</span>
          )}
          {!editing ? (
            <button
              onClick={startEdit}
              disabled={!canEdit}
              className="text-sm text-blue-600 hover:text-blue-800 disabled:text-slate-400 disabled:cursor-not-allowed"
            >
              {canEdit ? 'Edit' : 'Super admin only'}
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={cancelEdit}
                disabled={saving}
                className="text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </div>

      {!migrationApplied && (
        <div className="mb-3 px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-sm text-amber-900">
          Program tracks haven&apos;t been seeded yet. Apply the schema migration first.
        </div>
      )}

      {error && (
        <div className="mb-3 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {!editing ? (
        view.length === 0 ? (
          <div className="text-sm text-slate-500 italic">
            Not mapped to any track yet — teachers won&apos;t see this course in the assignments matrix.
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {view.map(id => (
              <span
                key={id}
                className="inline-flex items-center border border-slate-200 bg-slate-50 text-slate-700 rounded-full px-2.5 py-0.5 text-xs font-medium"
              >
                {trackName(id)}
              </span>
            ))}
          </div>
        )
      ) : (
        <div className="flex flex-wrap gap-2">
          {tracks.length === 0 ? (
            <div className="text-sm text-slate-500 italic">No program tracks seeded yet.</div>
          ) : (
            tracks.map(t => {
              const on = draftIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggle(t.id)}
                  className={`inline-flex items-center gap-1.5 border rounded-full px-3 py-1 text-sm transition-colors ${
                    on
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {on && <span aria-hidden>✓</span>}
                  {t.name}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
