'use client';

import { useEffect, useState } from 'react';

type UserRecord = {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
};

export function AdminUsersPanel() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadUsers() {
      try {
        const response = await fetch('/api/admin/users');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Nepodařilo se načíst seznam uživatelů.');
        }

        setUsers(data.users ?? []);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Nepodařilo se načíst seznam uživatelů.');
      }
    }

    loadUsers();
  }, []);

  return (
    <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-500">Admin</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Správa uživatelů</h2>
        </div>
        <span className="rounded-full border border-yellow-500/40 bg-yellow-500/10 px-2 py-1 text-xs font-medium text-yellow-300">
          {users.length} uživatelů
        </span>
      </div>

      {error ? (
        <p className="text-sm text-rose-400">{error}</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <table className="min-w-full text-left text-sm text-slate-200">
            <thead className="bg-slate-950/80 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Uživatel</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-slate-800 bg-slate-900/50">
                  <td className="px-4 py-3 font-medium text-white">{user.username}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        user.role === 'admin'
                          ? 'bg-yellow-500/10 text-yellow-300'
                          : 'bg-emerald-500/10 text-emerald-300'
                      }`}
                    >
                      {user.role === 'admin' ? 'Admin' : 'Uživatel'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
