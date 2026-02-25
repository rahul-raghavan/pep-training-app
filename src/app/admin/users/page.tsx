'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: 'super_admin' | 'admin' | 'user';
  is_active: boolean;
  created_at: string;
  traineeId: string | null;
  enrollments: { program_id: string; title: string; slug: string }[];
}

export default function UsersPage() {
  const { user: authUser, loading: authLoading, logout } = useAuth('admin');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<string>('all');

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
    }
  }, [authLoading, authUser]);

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

  const filteredUsers = filterRole === 'all'
    ? users
    : users.filter(u => u.role === filterRole);

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
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <Link href="/admin/dashboard" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Dashboard
            </Link>
            <h1 className="text-2xl font-semibold text-slate-900">User Management</h1>
            <p className="text-slate-600">Manage users and their roles</p>
          </div>
          <div className="flex items-center gap-3">
            {isSuperAdmin && (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create User
              </button>
            )}
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
        <div className="mb-6 flex items-center gap-2">
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
              {filteredUsers.map(userItem => (
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
                        {!userItem.is_active && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Deactivated</span>
                        )}
                      </div>
                      <div className="text-sm text-slate-500">
                        {userItem.email} &middot; Joined {formatDate(userItem.created_at)}
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

                    <div className="text-sm text-slate-500">
                      {userItem.enrollments.length > 0
                        ? `${userItem.enrollments.length} program${userItem.enrollments.length > 1 ? 's' : ''}`
                        : 'No programs'}
                    </div>

                    {/* Only super_admin can change roles */}
                    {isSuperAdmin && userItem.id !== authUser.id && (
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
                  </div>
                </div>
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
    </div>
  );
}
