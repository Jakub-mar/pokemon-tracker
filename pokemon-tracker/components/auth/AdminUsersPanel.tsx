'use client';

import { useEffect, useState, type FormEvent } from 'react';

type UserRecord = {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
  isBlocked: boolean;
  createdAt: string;
};

export function AdminUsersPanel() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState('');

  useEffect(() => {
    async function loadUsers() {
      try {
        const response = await fetch('/api/admin/users');
        const data: { users?: UserRecord[]; error?: string } = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Nepodařilo se načíst seznam uživatelů.');
        }

        setUsers(data.users ?? []);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Nepodařilo se načíst seznam uživatelů.');
      } finally {
        setIsLoading(false);
      }
    }

    void loadUsers();
  }, []);

  async function updateUser(id: string, changes: Partial<Pick<UserRecord, 'displayName' | 'role' | 'isBlocked'>>) {
    setBusyUserId(id);
    setError('');

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...changes }),
      });
      const data: { user?: UserRecord; error?: string } = await response.json();

      if (!response.ok || !data.user) {
        throw new Error(data.error || 'Změnu uživatele se nepodařilo uložit.');
      }

      const updatedUser = data.user;
      setUsers((currentUsers) => currentUsers.map((user) => (user.id === id ? updatedUser : user)));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Změnu uživatele se nepodařilo uložit.');
    } finally {
      setBusyUserId('');
    }
  }

  async function saveDisplayName(event: FormEvent<HTMLFormElement>, user: UserRecord) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const displayName = String(formData.get('displayName') ?? '').trim();
    await updateUser(user.id, { displayName });
  }

  async function deleteUser(user: UserRecord) {
    if (!window.confirm(`Opravdu chceš smazat účet ${user.username}?`)) {
      return;
    }

    setBusyUserId(user.id);
    setError('');
    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id }),
      });
      const data: { error?: string } = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Uživatele se nepodařilo smazat.');
      }

      setUsers((currentUsers) => currentUsers.filter((currentUser) => currentUser.id !== user.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Uživatele se nepodařilo smazat.');
    } finally {
      setBusyUserId('');
    }
  }

  return (
    <section className="w-full rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-500">Admin</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Správa uživatelů</h2>
        </div>
        <span className="rounded-full border border-yellow-500/40 bg-yellow-500/10 px-2 py-1 text-xs font-medium text-yellow-300">
          {users.length} uživatelů
        </span>
      </div>

      {error && <p className="mb-4 text-sm text-rose-400" role="alert">{error}</p>}
      {isLoading ? (
        <p className="text-sm text-slate-400">Načítání uživatelů…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="min-w-full text-left text-sm text-slate-200">
            <thead className="bg-slate-950/80 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Uživatelský účet</th>
                <th className="px-4 py-3 font-medium">Zobrazované jméno</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Stav</th>
                <th className="px-4 py-3 font-medium">Akce</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-slate-800 bg-slate-900/50 align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{user.username}</p>
                    <p className="mt-1 text-xs text-slate-400">{user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <form onSubmit={(event) => void saveDisplayName(event, user)} className="flex min-w-56 gap-2">
                      <input
                        name="displayName"
                        aria-label={`Zobrazované jméno: ${user.username}`}
                        defaultValue={user.displayName}
                        maxLength={60}
                        required
                        className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-yellow-500"
                      />
                      <button
                        type="submit"
                        disabled={busyUserId === user.id}
                        className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium hover:border-yellow-500 hover:text-yellow-300 disabled:opacity-50"
                      >
                        Uložit
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      aria-label={`Role: ${user.username}`}
                      value={user.role}
                      disabled={busyUserId === user.id}
                      onChange={(event) => {
                        const role = event.target.value;
                        if (role === 'admin' || role === 'user') {
                          void updateUser(user.id, { role });
                        }
                      }}
                      className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-yellow-500 disabled:opacity-50"
                    >
                      <option value="user">Uživatel</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={user.isBlocked ? 'text-rose-300' : 'text-emerald-300'}>
                      {user.isBlocked ? 'Zablokován' : 'Aktivní'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-32 flex-col gap-2">
                      <button
                        type="button"
                        disabled={busyUserId === user.id}
                        onClick={() => void updateUser(user.id, { isBlocked: !user.isBlocked })}
                        className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium hover:border-yellow-500 hover:text-yellow-300 disabled:opacity-50"
                      >
                        {user.isBlocked ? 'Odblokovat' : 'Zablokovat'}
                      </button>
                      <button
                        type="button"
                        disabled={busyUserId === user.id}
                        onClick={() => void deleteUser(user)}
                        className="rounded-lg border border-rose-500/40 px-3 py-2 text-xs font-medium text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                      >
                        Smazat
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!users.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    Zatím tu nejsou žádní uživatelé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
