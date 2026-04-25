'use client';

import { useEffect, useState } from 'react';

interface Center {
  id: string;
  slug: string;
  name: string;
}

interface ProgramTrack {
  id: string;
  slug: string;
  name: string;
}

interface ScopeData {
  centerId: string | null;
  programTrackIds: string[];
  role: 'super_admin' | 'admin' | 'user';
  adminScopeTrackIds: string[];
}

const ROLES: { id: 'user' | 'admin' | 'super_admin'; label: string; blurb: string }[] = [
  { id: 'user',        label: 'Teacher',     blurb: 'Sees only their assigned courses.' },
  { id: 'admin',       label: 'Admin',       blurb: 'Manages everything within their scope below.' },
  { id: 'super_admin', label: 'Super Admin', blurb: 'Sees every center and program.' },
];

interface Props {
  traineeId: string;
}

/**
 * Editable scope card for /admin/users/[id]. Super-admin only.
 * Shows current center / programs / role / admin-of and lets you change them.
 * Auto-saves on Save click.
 */
export default function ScopeEditor({ traineeId }: Props) {
  const [centers, setCenters] = useState<Center[]>([]);
  const [tracks, setTracks] = useState<ProgramTrack[]>([]);
  const [migrationApplied, setMigrationApplied] = useState(true);

  const [data, setData] = useState<ScopeData | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Pending edits (only used while editing)
  const [draft, setDraft] = useState<ScopeData | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [lookupsRes, scopeRes] = await Promise.all([
          fetch('/api/admin/lookups'),
          fetch(`/api/admin/users/${traineeId}/scope`),
        ]);
        if (lookupsRes.ok) {
          const l = await lookupsRes.json();
          setCenters(l.centers || []);
          setTracks(l.programTracks || []);
          setMigrationApplied(l.migrationApplied ?? true);
        }
        if (scopeRes.ok) {
          const s = await scopeRes.json();
          setData(s);
        }
      } catch {
        // ignore — UI shows blank state
      }
    }
    load();
  }, [traineeId]);

  if (!data) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-6 animate-pulse">
        <div className="h-5 w-24 bg-slate-100 rounded mb-3" />
        <div className="h-4 w-2/3 bg-slate-100 rounded" />
      </div>
    );
  }

  const startEdit = () => {
    setDraft(JSON.parse(JSON.stringify(data)));
    setEditing(true);
    setError(null);
  };

  const cancelEdit = () => {
    setDraft(null);
    setEditing(false);
    setError(null);
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${traineeId}/scope`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centerId: draft.centerId,
          programTrackIds: draft.programTrackIds,
          role: draft.role,
          adminScopeTrackIds: draft.role === 'admin' ? draft.adminScopeTrackIds : [],
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || 'Failed to save');
        return;
      }
      setData({
        ...draft,
        adminScopeTrackIds: draft.role === 'admin' ? draft.adminScopeTrackIds : [],
      });
      setEditing(false);
      setDraft(null);
      setSavedAt(Date.now());
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  const view = editing && draft ? draft : data;

  const setCenter = (id: string) =>
    setDraft(prev => (prev ? { ...prev, centerId: prev.centerId === id ? null : id } : prev));

  const toggleTrack = (id: string) =>
    setDraft(prev => {
      if (!prev) return prev;
      const has = prev.programTrackIds.includes(id);
      const next = has ? prev.programTrackIds.filter(t => t !== id) : [...prev.programTrackIds, id];
      // also drop adminScope entries that are no longer in tracks
      const cleanedAdminScope = prev.adminScopeTrackIds.filter(t => next.includes(t));
      return { ...prev, programTrackIds: next, adminScopeTrackIds: cleanedAdminScope };
    });

  const toggleAdminTrack = (id: string) =>
    setDraft(prev => {
      if (!prev) return prev;
      const has = prev.adminScopeTrackIds.includes(id);
      return {
        ...prev,
        adminScopeTrackIds: has
          ? prev.adminScopeTrackIds.filter(t => t !== id)
          : [...prev.adminScopeTrackIds, id],
      };
    });

  const setRole = (id: 'user' | 'admin' | 'super_admin') =>
    setDraft(prev => (prev ? { ...prev, role: id } : prev));

  const centerName = centers.find(c => c.id === view.centerId)?.name;
  const trackName = (id: string) => tracks.find(t => t.id === id)?.name ?? '?';

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-medium text-slate-900">Scope</h2>
          <p className="text-sm text-slate-500">Center, programs, and role this user belongs to.</p>
        </div>
        <div className="flex items-center gap-3">
          {savedAt && Date.now() - savedAt < 4000 && (
            <span className="text-xs text-green-600">Saved</span>
          )}
          {!editing ? (
            <button
              onClick={startEdit}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Edit
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
          Centers + program tracks haven&apos;t been seeded yet. Apply the schema migration first.
        </div>
      )}

      {error && (
        <div className="mb-3 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Read-only view */}
      {!editing && (
        <dl className="space-y-2.5 text-sm">
          <Row label="Center">
            {view.centerId ? (
              <Tag>{centerName ?? '?'}</Tag>
            ) : (
              <span className="text-slate-400">—</span>
            )}
          </Row>
          <Row label="Programs">
            {view.programTrackIds.length === 0 ? (
              <span className="text-slate-400">—</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {view.programTrackIds.map(id => (
                  <Tag key={id}>{trackName(id)}</Tag>
                ))}
              </div>
            )}
          </Row>
          <Row label="Role">
            <Tag accent>{ROLES.find(r => r.id === view.role)?.label ?? view.role}</Tag>
          </Row>
          {view.role === 'admin' && (
            <Row label="Admin of">
              {view.adminScopeTrackIds.length === 0 ? (
                <span className="text-slate-400">—</span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {view.adminScopeTrackIds.map(id => (
                    <Tag key={id} accent>
                      {trackName(id)}
                    </Tag>
                  ))}
                </div>
              )}
            </Row>
          )}
        </dl>
      )}

      {/* Edit form */}
      {editing && draft && (
        <div className="space-y-4 text-sm">
          <Field label="Center" hint="One center per user">
            <Chips
              items={centers}
              selectedIds={draft.centerId ? [draft.centerId] : []}
              onToggle={setCenter}
              empty="No centers seeded yet."
              single
            />
          </Field>
          <Field label="Programs" hint="One or more program tracks">
            <Chips
              items={tracks}
              selectedIds={draft.programTrackIds}
              onToggle={toggleTrack}
              empty="No program tracks seeded yet."
            />
          </Field>
          <Field label="Role">
            <div className="flex flex-wrap gap-2">
              {ROLES.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id)}
                  className={`inline-flex items-center gap-1.5 border rounded-full px-3 py-1 text-sm transition-colors ${
                    draft.role === r.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {draft.role === r.id && <span aria-hidden>●</span>}
                  {r.label}
                </button>
              ))}
            </div>
            <div className="text-xs text-slate-500 mt-2">
              {ROLES.find(r => r.id === draft.role)?.blurb}
            </div>
          </Field>
          {draft.role === 'admin' && (
            <Field label="Admin of programs" hint="Within their center only">
              {draft.programTrackIds.length === 0 ? (
                <div className="text-xs text-slate-500 italic">Pick program(s) above first.</div>
              ) : (
                <Chips
                  items={tracks.filter(t => draft.programTrackIds.includes(t.id))}
                  selectedIds={draft.adminScopeTrackIds}
                  onToggle={toggleAdminTrack}
                />
              )}
            </Field>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <dt className="text-xs uppercase tracking-wide text-slate-500 w-[88px] flex-shrink-0">
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1.5">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        {hint && <span className="text-xs text-slate-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Tag({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span
      className={`inline-flex items-center border rounded-full px-2.5 py-0.5 text-xs font-medium ${
        accent
          ? 'border-blue-200 bg-blue-50 text-blue-700'
          : 'border-slate-200 bg-slate-50 text-slate-700'
      }`}
    >
      {children}
    </span>
  );
}

interface ChipsProps {
  items: { id: string; name: string }[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  single?: boolean;
  empty?: string;
}

function Chips({ items, selectedIds, onToggle, single = false, empty }: ChipsProps) {
  if (items.length === 0) {
    return <div className="text-xs text-slate-500 italic">{empty ?? 'No options.'}</div>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(it => {
        const on = selectedIds.includes(it.id);
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onToggle(it.id)}
            className={`inline-flex items-center gap-1.5 border rounded-full px-3 py-1 text-sm transition-colors ${
              on
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
          >
            {on && <span aria-hidden>{single ? '●' : '✓'}</span>}
            {it.name}
          </button>
        );
      })}
    </div>
  );
}
