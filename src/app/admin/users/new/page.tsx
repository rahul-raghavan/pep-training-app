'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { PageShell, TopBar, PaperCard, Pill, Stickie, AdminNav, AdminSubNav } from '@/components/paper';

const TEACHERS_TABS = [
  { label: 'All teachers', href: '/admin/users' },
  { label: 'Cohort', href: '/admin/cohort' },
  { label: 'Voice perf', href: '/admin/voice-perf' },
];

interface Center {
  id: string;
  slug: string;
  name: string;
  city: string | null;
}

interface ProgramTrack {
  id: string;
  slug: string;
  name: string;
}

type Role = 'user' | 'admin' | 'super_admin';

const ROLES: { id: Role; label: string; blurb: string }[] = [
  {
    id: 'user',
    label: 'Teacher',
    blurb: 'Sees only courses assigned to them in their program(s).',
  },
  {
    id: 'admin',
    label: 'Admin',
    blurb: 'Manages everything within their center, for the programs they admin.',
  },
  {
    id: 'super_admin',
    label: 'Super Admin',
    blurb: 'Sees and manages everything across all centers and programs.',
  },
];

function FieldRow({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-3 md:gap-5 py-3 border-b border-rule">
      <div>
        <div className="text-[14px] font-semibold tracking-tight">
          {label} {required && <span className="text-bad">*</span>}
        </div>
        {hint && <div className="text-[12px] text-ink-3 mt-0.5">{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

interface ChipPickProps<T extends { id: string; name: string }> {
  items: T[];
  selected: string[];
  onToggle: (id: string) => void;
  /** Single-select (radio-ish) when true. */
  single?: boolean;
  empty?: string;
}

function ChipPick<T extends { id: string; name: string }>({
  items,
  selected,
  onToggle,
  single = false,
  empty,
}: ChipPickProps<T>) {
  if (items.length === 0) {
    return (
      <div className="text-[12px] text-ink-3 italic">
        {empty ?? 'No options yet — apply the schema migration first.'}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(it => {
        const on = selected.includes(it.id);
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onToggle(it.id)}
            className={`inline-flex items-center gap-1.5 border rounded-full px-3 py-1 text-[13px] font-medium transition-colors ${
              on
                ? 'bg-accent-soft text-[color:var(--accent)] border-[color:var(--accent)]/30'
                : 'bg-paper text-ink border-rule hover:border-slate-300'
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

export default function AddUserPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth('super_admin');

  const [centers, setCenters] = useState<Center[]>([]);
  const [programTracks, setProgramTracks] = useState<ProgramTrack[]>([]);
  const [migrationApplied, setMigrationApplied] = useState(true);
  const [lookupsLoading, setLookupsLoading] = useState(true);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [centerId, setCenterId] = useState<string[]>([]);
  const [trackIds, setTrackIds] = useState<string[]>([]);
  const [role, setRole] = useState<Role>('user');
  const [adminScopeIds, setAdminScopeIds] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/lookups');
        if (!res.ok) {
          setLookupsLoading(false);
          return;
        }
        const data = await res.json();
        setCenters(data.centers || []);
        setProgramTracks(data.programTracks || []);
        setMigrationApplied(data.migrationApplied ?? true);
      } catch (e) {
        console.error('lookups fetch failed', e);
      } finally {
        setLookupsLoading(false);
      }
    }
    if (!authLoading && user) load();
  }, [authLoading, user]);

  // Keep adminScopeIds within the picked program tracks
  useEffect(() => {
    setAdminScopeIds(prev => prev.filter(id => trackIds.includes(id)));
  }, [trackIds]);

  const togSingle = (current: string[], setter: (v: string[]) => void) => (id: string) =>
    setter(current.includes(id) ? [] : [id]);
  const togMulti = (current: string[], setter: (v: string[]) => void) => (id: string) =>
    setter(current.includes(id) ? current.filter(x => x !== id) : [...current, id]);

  const adminCandidateTracks = programTracks.filter(p => trackIds.includes(p.id));
  const centerNames = centerId.map(id => centers.find(c => c.id === id)?.name).filter(Boolean) as string[];
  const centerName = centerNames.length > 0 ? centerNames.join(', ') : '—';
  const ready =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    (role === 'super_admin' || (centerId.length > 0 && trackIds.length > 0));

  const handleSubmit = async () => {
    if (!ready) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
          centerId: centerId[0] ?? null,
          centerIds: centerId,
          programTrackIds: trackIds,
          adminScopeCenterIds: role === 'admin' ? centerId : [],
          adminScopeTrackIds: role === 'admin' ? adminScopeIds : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create user');
      } else {
        setSuccess(
          data.warnings?.length
            ? `User created. Warnings: ${data.warnings.join('; ')}`
            : 'User pre-registered. They\'ll get this scope on first Google sign-in.'
        );
        // Reset form
        setName('');
        setEmail('');
        setCenterId([]);
        setTrackIds([]);
        setRole('user');
        setAdminScopeIds([]);
      }
    } catch (e) {
      console.error('create user error', e);
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || lookupsLoading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-rule border-t-ink rounded-full animate-spin" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth={1080}>
      <TopBar right={<span>{user?.email}</span>} />
      <AdminNav />
      <AdminSubNav items={TEACHERS_TABS} />

      <div className="flex items-baseline gap-3 mb-4 flex-wrap">
        <Link href="/admin/users" className="text-[13px] text-ink-2 hover:text-ink">
          ← All teachers
        </Link>
        <span className="text-ink-3">/</span>
        <h1 className="text-[20px] font-semibold tracking-tight">Add user</h1>
      </div>

      {!migrationApplied && (
        <div className="mb-4">
          <Stickie>
            Centers + program tracks haven&apos;t been seeded yet — apply the migration in <code>migrations/migration-add-centers-and-programs.sql</code>, then come back here.
          </Stickie>
        </div>
      )}

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5 items-start">
        {/* Form */}
        <PaperCard>
          <div className="text-[18px] font-semibold tracking-tight">New user</div>
          <div className="text-[13px] text-ink-2 mt-1">
            They&apos;ll get a Google sign-in link tied to this profile. Roles + scope apply on first sign-in.
          </div>

          <div className="mt-4 border-t border-rule">
            <FieldRow label="Full name" required>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Anita Ramesh"
                className="w-full px-3 py-2 border border-rule rounded-md bg-paper text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            </FieldRow>

            <FieldRow label="Email" required hint="must be on an allowed school domain">
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="anita@pepschoolv2.com"
                className="w-full px-3 py-2 border border-rule rounded-md bg-paper text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
            </FieldRow>

            <FieldRow
              label="Center"
              required={role !== 'super_admin'}
              hint={role === 'admin' ? 'admins may manage multiple centers' : 'one center per teacher'}
            >
              <ChipPick
                items={centers}
                selected={centerId}
                onToggle={role === 'admin' ? togMulti(centerId, setCenterId) : togSingle(centerId, setCenterId)}
                single={role !== 'admin'}
                empty="No centers yet — seed them via the migration."
              />
            </FieldRow>

            <FieldRow
              label="Programs"
              required={role !== 'super_admin'}
              hint="user can belong to one or more program tracks"
            >
              <ChipPick
                items={programTracks}
                selected={trackIds}
                onToggle={togMulti(trackIds, setTrackIds)}
                empty="No program tracks yet — seed them via the migration."
              />
            </FieldRow>

            <FieldRow label="Role" required>
              <div className="flex flex-wrap gap-2 mb-2">
                {ROLES.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id)}
                    className={`inline-flex items-center gap-1.5 border rounded-full px-3 py-1 text-[13px] font-medium transition-colors ${
                      role === r.id
                        ? 'bg-accent-soft text-[color:var(--accent)] border-[color:var(--accent)]/30'
                        : 'bg-paper text-ink border-rule hover:border-slate-300'
                    }`}
                  >
                    {role === r.id && <span aria-hidden>●</span>}
                    {r.label}
                  </button>
                ))}
              </div>
              <div className="text-[12px] text-ink-3 leading-relaxed">
                {ROLES.find(r => r.id === role)?.blurb}
              </div>
            </FieldRow>

            {role === 'admin' && (
              <FieldRow
                label="Admin of programs"
                required
                hint={`scoped to ${centerName} only`}
              >
                {trackIds.length === 0 ? (
                  <div className="text-[12px] text-ink-3 italic">Pick program(s) above first.</div>
                ) : (
                  <ChipPick
                    items={adminCandidateTracks}
                    selected={adminScopeIds}
                    onToggle={togMulti(adminScopeIds, setAdminScopeIds)}
                  />
                )}
              </FieldRow>
            )}

            {role === 'super_admin' && (
              <div
                className="mt-3 p-3 rounded-md text-[13px]"
                style={{ background: 'var(--accent-soft)', border: '1px solid rgba(234, 88, 12, 0.25)' }}
              >
                Super admins see <b>all centers</b> and <b>all programs</b>. Center &amp; program selections become tags for context only.
              </div>
            )}
          </div>

          {error && (
            <div
              className="mt-4 p-3 border rounded-md text-[13px]"
              style={{ borderColor: '#fecaca', background: 'var(--bad-soft)', color: 'var(--bad)' }}
            >
              {error}
            </div>
          )}
          {success && (
            <div
              className="mt-4 p-3 border rounded-md text-[13px]"
              style={{ borderColor: '#86efac', background: 'var(--good-soft)', color: 'var(--good)' }}
            >
              {success}
            </div>
          )}

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={!ready || submitting}
              className={`text-[14px] font-medium rounded-md px-4 py-2 transition-colors ${
                ready && !submitting
                  ? 'bg-ink text-paper hover:opacity-90'
                  : 'bg-paper-2 text-ink-3 cursor-not-allowed'
              }`}
            >
              {submitting ? 'Creating…' : 'Create user'}
            </button>
            <button
              onClick={() => router.push('/admin/users')}
              className="text-[14px] font-medium rounded-md px-4 py-2 border border-rule hover:bg-paper-2 transition-colors"
            >
              Cancel
            </button>
            <span className="ml-auto text-[12px] text-ink-3">
              {ready ? 'Ready' : 'Fill required fields'}
            </span>
          </div>
        </PaperCard>

        {/* Live preview */}
        <PaperCard framed={false} className="bg-paper-2/40">
          <div className="text-[11px] uppercase tracking-wide font-medium text-ink-2 mb-3">
            What they&apos;ll see
          </div>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-paper border border-rule flex items-center justify-center text-[12px] font-semibold text-ink-2">
              {(name || '??').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || '??'}
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-semibold tracking-tight truncate">{name || '—'}</div>
              <div className="text-[11px] text-ink-3 font-mono truncate">{email || 'no email yet'}</div>
            </div>
          </div>

          <div className="space-y-2">
            <ScopeRow label="Center">
              {centerId.length > 0 ? (
                <Pill kind="accent">{centerName}</Pill>
              ) : (
                <span className="text-[12px] text-ink-3">—</span>
              )}
            </ScopeRow>
            <ScopeRow label="Programs">
              {trackIds.length > 0 ? (
                trackIds.map(id => (
                  <Pill key={id}>{programTracks.find(p => p.id === id)?.name ?? '?'}</Pill>
                ))
              ) : (
                <span className="text-[12px] text-ink-3">—</span>
              )}
            </ScopeRow>
            <ScopeRow label="Role">
              <Pill kind="accent">
                {ROLES.find(r => r.id === role)?.label}
              </Pill>
            </ScopeRow>
            {role === 'admin' && (
              <ScopeRow label="Admin of">
                {adminScopeIds.length > 0 ? (
                  adminScopeIds.map(id => (
                    <Pill key={id} kind="accent">
                      {programTracks.find(p => p.id === id)?.name ?? '?'}
                    </Pill>
                  ))
                ) : (
                  <span className="text-[12px] text-ink-3">—</span>
                )}
              </ScopeRow>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-rule">
            <div className="text-[11px] uppercase tracking-wide font-medium text-ink-2 mb-2">
              Can do
            </div>
            <ul className="text-[13px] text-ink space-y-1.5 list-disc pl-5 leading-relaxed">
              {role === 'user' ? (
                <>
                  <li>Take courses assigned to them</li>
                  <li>Record voice exercises, see AI feedback</li>
                  <li>See their own progress only</li>
                </>
              ) : role === 'admin' ? (
                <>
                  <li>
                    See cohort heatmaps for {centerName}
                    {adminScopeIds.length > 0 &&
                      ` · ${adminScopeIds.map(id => programTracks.find(p => p.id === id)?.name).filter(Boolean).join(', ')}`}
                  </li>
                  <li>Assign courses to teachers in their scope</li>
                  <li>Add and edit users in their scope</li>
                  <li className="text-ink-2">
                    <i>Cannot</i> see other centers
                  </li>
                </>
              ) : (
                <>
                  <li>See <b>every</b> center and <b>every</b> program</li>
                  <li>Create / edit courses, programs, centers</li>
                  <li>Add and edit users of any role</li>
                  <li>Promote and demote admins</li>
                </>
              )}
            </ul>
          </div>
        </PaperCard>
      </div>
    </PageShell>
  );
}

function ScopeRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[12px] text-ink-2 w-[68px] flex-shrink-0">{label}:</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}
