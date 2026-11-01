'use client';

import React, { useEffect, useState } from 'react';
import { useToast } from '@/components/providers/ToastProvider';
import type { User, UserRole } from '@/lib/types';

export default function UsersPage() {
  const { addToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Create form
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', role: 'viewer' as UserRole });
  const [createLoading, setCreateLoading] = useState(false);

  // Reset password form
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      addToast('error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });

      const data = await res.json();
      if (res.ok) {
        addToast('success', `User "${createForm.name}" created`);
        setShowCreateModal(false);
        setCreateForm({ name: '', email: '', password: '', role: 'viewer' });
        fetchUsers();
      } else {
        addToast('error', data.error);
      }
    } catch {
      addToast('error', 'Failed to create user');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdateUser = async (id: string, updates: Partial<User>) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        addToast('success', 'User updated');
        setEditingUser(null);
        fetchUsers();
      } else {
        const data = await res.json();
        addToast('error', data.error);
      }
    } catch {
      addToast('error', 'Failed to update user');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showResetModal) return;
    setResetLoading(true);

    try {
      const res = await fetch(`/api/users/${showResetModal}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });

      if (res.ok) {
        addToast('success', 'Password reset successfully');
        setShowResetModal(null);
        setNewPassword('');
      } else {
        const data = await res.json();
        addToast('error', data.error);
      }
    } catch {
      addToast('error', 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    await handleUpdateUser(user.id, { is_active: !user.is_active });
  };

  const roleColors: Record<string, string> = {
    admin: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    editor: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    viewer: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
  };

  const inputClass = 'w-full px-4 py-2.5 rounded-lg bg-bg-input border border-border-primary text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-accent input-glow transition-all text-sm';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-heading">User Management</h1>
          <p className="text-text-muted text-sm mt-1">{users.length} users</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add User
        </button>
      </div>

      {/* Users Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th className="w-48">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j}><div className="h-4 skeleton rounded w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-text-muted">No users found</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td className="font-medium text-text-primary">{user.name}</td>
                    <td className="font-mono text-xs">{user.email}</td>
                    <td>
                      {editingUser?.id === user.id ? (
                        <select
                          value={editingUser.role}
                          onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                          className="px-2 py-1 rounded bg-bg-input border border-border-primary text-sm text-text-primary"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span className={`badge border ${roleColors[user.role]}`}>
                          {user.role}
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleActive(user)}
                        className={`badge border cursor-pointer transition-all hover:scale-105 ${
                          user.is_active
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-red-500/15 text-red-400 border-red-500/30'
                        }`}
                      >
                        {user.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="text-xs text-text-muted">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        {editingUser?.id === user.id ? (
                          <>
                            <button
                              onClick={() => handleUpdateUser(user.id, { role: editingUser.role })}
                              className="px-3 py-1 rounded-md bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-all"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingUser(null)}
                              className="px-3 py-1 rounded-md text-text-muted hover:text-text-primary text-xs transition-all"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setEditingUser(user)}
                              className="p-1.5 rounded-md text-text-muted hover:text-accent hover:bg-accent-muted transition-all"
                              title="Edit role"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                              </svg>
                            </button>
                            <button
                              onClick={() => { setShowResetModal(user.id); setNewPassword(''); }}
                              className="p-1.5 rounded-md text-text-muted hover:text-warning hover:bg-warning-muted transition-all"
                              title="Reset password"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative w-full max-w-md glass-card p-6 animate-fade-in">
            <h2 className="text-lg font-bold text-text-heading mb-6">Create New User</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Full Name</label>
                <input type="text" required value={createForm.name} onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))} className={inputClass} placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
                <input type="email" required value={createForm.email} onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))} className={inputClass} placeholder="john@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Password</label>
                <input type="password" required minLength={6} value={createForm.password} onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))} className={inputClass} placeholder="Minimum 6 characters" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Role</label>
                <select value={createForm.role} onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value as UserRole }))} className={inputClass}>
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border-primary">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-lg border border-border-primary text-text-secondary hover:text-text-primary text-sm font-medium transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={createLoading} className="px-6 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-all disabled:opacity-50">
                  {createLoading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowResetModal(null)} />
          <div className="relative w-full max-w-sm glass-card p-6 animate-fade-in">
            <h2 className="text-lg font-bold text-text-heading mb-4">Reset Password</h2>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">New Password</label>
                <input type="password" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} placeholder="Minimum 6 characters" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border-primary">
                <button type="button" onClick={() => setShowResetModal(null)} className="px-4 py-2 rounded-lg border border-border-primary text-text-secondary text-sm font-medium transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={resetLoading} className="px-6 py-2 rounded-lg bg-warning hover:bg-warning/90 text-black text-sm font-semibold transition-all disabled:opacity-50">
                  {resetLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
