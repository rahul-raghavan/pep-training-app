'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { PageShell, TopBar, AdminNav, AdminSubNav } from '@/components/paper';
import { trackSortIndex } from '@/lib/course-order';

const TEACHERS_TABS = [
  { label: 'All teachers', href: '/admin/users' },
  { label: 'Cohort', href: '/admin/cohort' },
  { label: 'Voice perf', href: '/admin/voice-perf' },
];

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: 'super_admin' | 'admin' | 'user';
  is_active: boolean;
  created_at: string;
  traineeId: string | null;
  enrollments: { program_id: string; title: string; slug: string }[];
  center: { id: string; slug: string; name: string } | null;
  programTracks: { id: string; slug: string; name: string }[];
  isTestAccount?: boolean;
  pending?: boolean;
}

interface Program {
  id: string;
  title: string;
  slug: string;
  is_active: boolean;
}

interface UserCenterGroup {
  centerName: string;
  users: UserProfile[];
}

interface UserProgramGroup {
  id: string;
  slug: string;
  name: string;
  centers: UserCenterGroup[];
}

function displayName(user: UserProfile): string {
  return user.name || user.email;
}

function buildUserGroups(users: UserProfile[]): UserProgramGroup[] {
  const groups = new Map<string, { id: string; slug: string; name: string; users: UserProfile[] }>();

  for (const user of users) {
    const tracks = user.programTracks.length
      ? user.programTracks
      : [{ id: 'unmapped', slug: 'unmapped', name: 'No program track' }];

    for (const track of tracks) {
      const existing = groups.get(track.id) ?? { ...track, users: [] };
      existing.users.push(user);
      groups.set(track.id, existing);
    }
  }

  return [...groups.values()]
    .sort((a, b) => {
      const byFlow = trackSortIndex(a.slug) - trackSortIndex(b.slug);
      if (byFlow !== 0) return byFlow;
      if (a.slug === 'unmapped') return 1;
      if (b.slug === 'unmapped') return -1;
      return a.name.localeCompare(b.name);
    })
    .map(group => {
      const centerMap = new Map<string, UserProfile[]>();
      for (const user of group.users) {
        const centerName = user.center?.name || 'No center mapped';
        const arr = centerMap.get(centerName) ?? [];
        arr.push(user);
        centerMap.set(centerName, arr);
      }
      const centers = [...centerMap.entries()]
        .sort(([a], [b]) => {
          if (a === 'No center mapped') return 1;
          if (b === 'No center mapped') return -1;
          return a.localeCompare(b);
        })
        .map(([centerName, centerUsers]) => ({
          centerName,
          users: centerUsers.sort((a, b) => displayName(a).localeCompare(displayName(b))),
        }));
      return { id: group.id, slug: group.slug, name: group.name, centers };
    });
}

export default function UsersPage() {
  const { user: authUser, loading: authLoading, logout } = useAuth('admin');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [hideInactive, setHideInactive] = useState(true);
  const [enrollDropdownUserId, setEnrollDropdownUserId] = useState<string | null>(null);
  const [enrollingProgramId, setEnrollingProgramId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Create user modal state
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<string>('user');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    if (!authLoading && authUser) {
      fetchUsers();
      fetchPrograms();
    }
  }, [authLoading, authUser]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setEnrollDropdownUserId(null);
      }
    };
    if (enrollDropdownUserId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [enrollDropdownUserId]);

  const fetchPrograms = async () => {
    try {
      const res = await fetch('/api/programs');
      if (res.ok) {
        const data = await res.json();
        setPrograms((data.programs || []).filter((p: Program) => p.is_active));
      }
    } catch {
      // ignore
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, name: newName, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || 'Failed to create user');
        return;
      }
      setShowCreate(false);
      setNewEmail('');
      setNewName('');
      setNewRole('user');
      fetchUsers();
    } catch {
      setCreateError('Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivate = async (userId: string) => {
    if (!confirm('Deactivate this user? They will no longer be able to log in.')) return;
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      if (res.ok) fetchUsers();
    } catch {
      // ignore
    }
  };

  const handleReactivate = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: true }),
      });
      if (res.ok) fetchUsers();
    } catch {
      // ignore
    }
  };

  const handleDeletePending = async (traineeId: string) => {
    if (!confirm('Permanently delete this pre-registered user? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/users/pending/${traineeId}`, { method: 'DELETE' });
      if (res.ok) fetchUsers();
    } catch {
      // ignore
    }
  };

  const handleToggleEnrollment = async (userItem: UserProfile, programId: string) => {
    if (!userItem.traineeId || enrollingProgramId) return;
    setEnrollingProgramId(programId);

    const isEnrolled = userItem.enrollments.some(e => e.program_id === programId);

    try {
      const res = isEnrolled
        ? await fetch(`/api/enrollments?traineeId=${userItem.traineeId}&programId=${programId}`, { method: 'DELETE' })
        : await fetch('/api/enrollments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ traineeId: userItem.traineeId, programId }),
          });

      if (res.ok) {
        // Update local state immediately
        const program = programs.find(p => p.id === programId);
        setUsers(prev => prev.map(u => {
          if (u.id !== userItem.id) return u;
          return {
            ...u,
            enrollments: isEnrolled
              ? u.enrollments.filter(e => e.program_id !== programId)
              : [...u.enrollments, { program_id: programId, title: program?.title || '', slug: program?.slug || '' }],
          };
        }));
      }
    } catch {
      // ignore
    } finally {
      setEnrollingProgramId(null);
    }
  };

  const filteredUsers = users.filter(u => {
    if (filterRole !== 'all' && u.role !== filterRole) return false;
    if (hideInactive && !u.is_active && !u.pending) return false;
    return true;
  });
  const groupedUsers = buildUserGroups(filteredUsers);

  const roleCounts = {
    total: users.length,
    super_admin: users.filter(u => u.role === 'super_admin').length,
    admin: users.filter(u => u.role === 'admin').length,
    user: users.filter(u => u.role === 'user').length,
  };

  const isSuperAdmin = authUser?.role === 'super_admin';

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <PageShell maxWidth={1200}>
      <TopBar
        right={
          <span className="flex items-center gap-3">
            <span>{authUser?.email ?? ''}</span>
            <button onClick={logout} className="hover:text-ink underline underline-offset-2">
              Sign out
            </button>
          </span>
        }
      />
      <AdminNav
        rightSlot={
          isSuperAdmin ? (
            <Link
              href="/admin/users/new"
              className="inline-flex items-center px-3 py-1.5 rounded-md bg-ink text-paper text-[13px] font-medium hover:opacity-90"
            >
              + Create user
            </Link>
          ) : null
        }
      />
      <AdminSubNav items={TEACHERS_TABS} />
      <main>
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-sm text-slate-500">Total Users</div>
            <div className="text-2xl font-semibold text-slate-900">{roleCounts.total}</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-sm text-slate-500">Super Admins</div>
            <div className="text-2xl font-semibold text-purple-600">{roleCounts.super_admin}</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-sm text-slate-500">Admins</div>
            <div className="text-2xl font-semibold text-blue-600">{roleCounts.admin}</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-sm text-slate-500">Users</div>
            <div className="text-2xl font-semibold text-slate-600">{roleCounts.user}</div>
          </div>
        </div>

        {/* Role filter */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Filter:</span>
            <div className="flex gap-2">
              {['all', 'super_admin', 'admin', 'user'].map(role => (
                <button
                  key={role}
                  onClick={() => setFilterRole(role)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filterRole === role
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {role === 'all' ? 'All' : role === 'super_admin' ? 'Super Admin' : role === 'admin' ? 'Admin' : 'User'}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer">
            <input
              type="checkbox"
              checked={!hideInactive}
              onChange={(e) => setHideInactive(!e.target.checked)}
              className="rounded border-slate-300"
            />
            Show deactivated
          </label>
        </div>

        {/* User list */}
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h2 className="font-medium text-slate-900">
              {filterRole === 'all' ? 'All Users' : `${filterRole.replace('_', ' ')} Users`} ({filteredUsers.length})
            </h2>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No users found.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {groupedUsers.map(group => (
                <section key={group.id} className="divide-y divide-slate-100">
                  <div className="px-4 py-3 bg-slate-50 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-800">{group.name}</h3>
                    <span className="text-xs text-slate-500">
                      {group.centers.reduce((sum, center) => sum + center.users.length, 0)} teacher
                      {group.centers.reduce((sum, center) => sum + center.users.length, 0) === 1 ? '' : 's'}
                    </span>
                  </div>
                  {group.centers.map(center => (
                    <div key={`${group.id}-${center.centerName}`}>
                      <div className="px-4 py-2 bg-white text-[12px] uppercase tracking-wide text-slate-400 font-semibold">
                        {center.centerName}
                      </div>
                      <div className="divide-y divide-slate-100">
                        {center.users.map(userItem => (
                <div
                  key={userItem.id}
                  className={`flex items-center justify-between p-4 hover:bg-slate-50 transition-colors ${
                    !userItem.is_active ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      userItem.role === 'super_admin'
                        ? 'bg-purple-100 text-purple-600'
                        : userItem.role === 'admin'
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      <span className="text-sm font-medium">
                        {(userItem.name || userItem.email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-slate-900 flex items-center gap-2">
                        {userItem.name || userItem.email}
                        {userItem.pending && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Pending</span>
                        )}
                        {!userItem.is_active && !userItem.pending && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Deactivated</span>
                        )}
                        {userItem.isTestAccount && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">Test</span>
                        )}
                      </div>
                      <div className="text-sm text-slate-500">
                        {userItem.email} &middot; {userItem.pending ? 'Pre-registered' : `Joined ${formatDate(userItem.created_at)}`}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {userItem.center && (
                          <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                            {userItem.center.name}
                          </span>
                        )}
                        {userItem.programTracks.map(track => (
                          <span
                            key={track.id}
                            className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full"
                          >
                            {track.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      userItem.role === 'super_admin'
                        ? 'bg-purple-100 text-purple-700'
                        : userItem.role === 'admin'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {userItem.role === 'super_admin' ? 'Super Admin' : userItem.role === 'admin' ? 'Admin' : 'User'}
                    </span>

                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEnrollDropdownUserId(enrollDropdownUserId === userItem.id ? null : userItem.id);
                        }}
                        disabled={!userItem.traineeId}
                        className={`text-sm flex items-center gap-1 rounded-lg px-2 py-1 transition-colors ${
                          userItem.traineeId
                            ? 'text-slate-600 hover:bg-slate-100 cursor-pointer'
                            : 'text-slate-400 cursor-not-allowed'
                        }`}
                        title={userItem.traineeId ? 'Click to assign programs' : 'No trainee record'}
                      >
                        {userItem.enrollments.length > 0
                          ? `${userItem.enrollments.length} course${userItem.enrollments.length > 1 ? 's' : ''}`
                          : 'No courses'}
                        {userItem.traineeId && (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                      </button>

                      {enrollDropdownUserId === userItem.id && programs.length > 0 && (
                        <div
                          ref={dropdownRef}
                          className="absolute right-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-20"
                        >
                          <div className="p-2 border-b border-slate-100">
                            <div className="text-xs font-medium text-slate-500 px-2 py-1">Assign courses</div>
                          </div>
                          <div className="p-1 max-h-48 overflow-y-auto">
                            {programs.map(program => {
                              const isEnrolled = userItem.enrollments.some(e => e.program_id === program.id);
                              const isLoading = enrollingProgramId === program.id;
                              return (
                                <button
                                  key={program.id}
                                  onClick={() => handleToggleEnrollment(userItem, program.id)}
                                  disabled={isLoading}
                                  className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-slate-50 text-left transition-colors"
                                >
                                  <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                                    isEnrolled ? 'bg-slate-900 border-slate-900' : 'border-slate-300'
                                  }`}>
                                    {isEnrolled && (
                                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                    {isLoading && (
                                      <div className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />
                                    )}
                                  </div>
                                  <span className="text-sm text-slate-700">{program.title}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Super_admin controls for active (non-pending) users */}
                    {isSuperAdmin && !userItem.pending && userItem.id !== authUser.id && (
                      <>
                        <select
                          value={userItem.role}
                          onChange={async (e) => {
                            const newRoleValue = e.target.value;
                            const res = await fetch(`/api/users/${userItem.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ role: newRoleValue }),
                            });
                            if (res.ok) fetchUsers();
                          }}
                          className="text-sm border border-slate-200 rounded-lg px-2 py-1"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                          <option value="super_admin">Super Admin</option>
                        </select>

                        {userItem.is_active ? (
                          <button
                            onClick={() => handleDeactivate(userItem.id)}
                            className="text-sm text-red-600 hover:text-red-800 whitespace-nowrap"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivate(userItem.id)}
                            className="text-sm text-green-600 hover:text-green-800 whitespace-nowrap"
                          >
                            Reactivate
                          </button>
                        )}
                      </>
                    )}

                    {/* Pending users — show hint + delete option */}
                    {isSuperAdmin && userItem.pending && (
                      <>
                        <span className="text-xs text-amber-600">Hasn&apos;t logged in yet</span>
                        <button
                          onClick={() => handleDeletePending(userItem.traineeId!)}
                          className="text-sm text-red-600 hover:text-red-800 whitespace-nowrap"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create User Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-1">Create User</h2>
              <p className="text-sm text-slate-500 mb-4">
                Pre-register a user. They&apos;ll get the assigned role on first Google login.
              </p>
              {createError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {createError}
                </div>
              )}
              <form onSubmit={handleCreateUser}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email *</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="name@pepschoolv2.com"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="Full name"
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowCreate(false); setNewEmail(''); setNewName(''); setNewRole('user'); setCreateError(''); }}
                    className="flex-1 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !newEmail}
                    className="flex-1 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
