'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { clearAuthUser, saveAuthUser } from '@/lib/auth-session';
import type { AppUser } from '@/types/user';

type AccountSettingsProps = {
  initialUser: AppUser;
};

export function AccountSettings({ initialUser }: AccountSettingsProps) {
  const [user, setUser] = useState(initialUser);
  const [displayName, setDisplayName] = useState(initialUser.displayName);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  async function updateDisplayName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      const response = await fetch('/api/auth/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName }),
      });
      const data: { user?: AppUser; error?: string } = await response.json();

      if (!response.ok || !data.user) {
        throw new Error(data.error || 'Změnu jména se nepodařilo uložit.');
      }

      setUser(data.user);
      setDisplayName(data.user.displayName);
      saveAuthUser(data.user);
      setSuccess('Zobrazované jméno bylo změněno.');
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Změnu jména se nepodařilo uložit.');
    } finally {
      setIsSaving(false);
    }
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Nová hesla se neshodují.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data: { message?: string; error?: string } = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Heslo se nepodařilo změnit.');
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(data.message || 'Heslo bylo změněno.');
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Heslo se nepodařilo změnit.');
    } finally {
      setIsSaving(false);
    }
  }

  async function logout() {
    setError('');

    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Odhlášení se nepodařilo. Zkus to prosím znovu.');
      }

      clearAuthUser();
      router.replace('/');
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : 'Odhlášení se nepodařilo.');
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Přihlášený účet</p>
        <h2 className="mt-2 text-2xl font-bold">{user.displayName}</h2>
        <p className="mt-1 text-sm text-slate-400">{user.email}</p>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
        <h2 className="text-xl font-bold">Zobrazované jméno</h2>
        <form onSubmit={updateDisplayName} className="mt-5 space-y-4">
          <div>
            <label htmlFor="display-name" className="mb-2 block text-sm font-medium text-slate-300">
              Jméno, které uvidí ostatní
            </label>
            <input
              id="display-name"
              type="text"
              autoComplete="name"
              maxLength={60}
              required
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-yellow-500"
            />
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-xl bg-yellow-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Uložit jméno
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
        <h2 className="text-xl font-bold">Změna hesla</h2>
        <form onSubmit={updatePassword} className="mt-5 space-y-4">
          <PasswordField
            id="current-password"
            label="Současné heslo"
            value={currentPassword}
            onChange={setCurrentPassword}
            autoComplete="current-password"
          />
          <PasswordField
            id="new-password"
            label="Nové heslo (alespoň 6 znaků)"
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
            minLength={6}
          />
          <PasswordField
            id="confirm-password"
            label="Potvrzení nového hesla"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            minLength={6}
          />
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-xl border border-slate-700 bg-slate-950 px-5 py-3 font-semibold text-slate-200 transition hover:border-yellow-500 hover:text-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Změnit heslo
          </button>
        </form>
      </section>

      {(error || success) && (
        <p className={`text-sm ${error ? 'text-rose-400' : 'text-emerald-400'}`} role="status">
          {error || success}
        </p>
      )}

      <button
        type="button"
        onClick={logout}
        className="rounded-xl border border-rose-500/50 bg-rose-500/10 px-5 py-3 font-semibold text-rose-300 transition hover:bg-rose-500 hover:text-white"
      >
        Odhlásit se
      </button>
    </div>
  );
}

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  minLength?: number;
};

function PasswordField({ id, label, value, onChange, autoComplete, minLength }: PasswordFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-slate-300">
        {label}
      </label>
      <input
        id={id}
        type="password"
        autoComplete={autoComplete}
        minLength={minLength}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-yellow-500"
      />
    </div>
  );
}
