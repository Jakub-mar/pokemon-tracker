'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveAuthUser } from '@/lib/auth-session';
import { signIn, signUp } from '@/lib/auth';
import type { AppUser } from '@/types/user';

type AuthMode = 'login' | 'register';

type LoginFormProps = {
  initialMode?: AuthMode;
  initialError?: string;
  onAuthSuccess?: (user: AppUser) => void;
};

export function LoginForm({ initialMode = 'login', initialError = '', onAuthSuccess }: LoginFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('jan@poketracker.cz');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [userName, setUserName] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (mode === 'register') {
        if (password !== confirmPassword) {
          throw new Error('Hesla se neshodují.');
        }

        const user = await signUp(username, email, password);
        setUserName(user.displayName);
        saveAuthUser(user);
        onAuthSuccess?.(user);
        router.replace('/');
        return;
      }

      const user = await signIn(email, password);
      setUserName(user.displayName);
      saveAuthUser(user);
      onAuthSuccess?.(user);
      router.replace('/');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Operace se nepodařila.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
      <div className="mb-6">
        <div className="inline-flex rounded-xl border border-slate-700 bg-slate-950 p-1">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              mode === 'login' ? 'bg-yellow-500 text-slate-950' : 'text-slate-300 hover:text-white'
            }`}
          >
            Přihlášení
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              mode === 'register' ? 'bg-yellow-500 text-slate-950' : 'text-slate-300 hover:text-white'
            }`}
          >
            Registrace
          </button>
        </div>

        <h1 className="mt-5 text-3xl font-bold text-white">
          {mode === 'login' ? 'Vítej zpět' : 'Vytvoř si účet'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {mode === 'register' && (
          <div>
            <label htmlFor="username" className="mb-2 block text-sm font-medium text-slate-300">
              Uživatelské jméno
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-yellow-500"
              placeholder="janek123"
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-300">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-yellow-500"
            placeholder="jan@poketracker.cz"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-300">
            Heslo
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-yellow-500"
            placeholder="••••••••"
          />
        </div>

        {mode === 'register' && (
          <div>
            <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-slate-300">
              Potvrdit heslo
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-yellow-500"
              placeholder="••••••••"
            />
          </div>
        )}

        {mode === 'login' && (
          <div className="flex items-center justify-between text-sm text-slate-400">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-600 bg-slate-950" />
              Zapamatovat si mě
            </label>
            <a href="#" className="text-yellow-500 hover:text-yellow-400">
              Zapomněli jste heslo?
            </a>
          </div>
        )}

        {error && <p className="text-sm text-rose-400">{error}</p>}
        {userName && (
          <p className="text-sm text-emerald-400">
            {mode === 'login' ? 'Přihlášení úspěšné pro' : 'Registrace dokončena pro'} {userName}.
          </p>
        )}

        {mode === 'register' && !error && userName && (
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setUserName('');
              setPassword('');
              setConfirmPassword('');
            }}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-yellow-500 hover:text-yellow-300"
          >
            Přesunout na přihlášení
          </button>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-xl bg-yellow-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading
            ? mode === 'login'
              ? 'Přihlašování...'
              : 'Vytváření účtu...'
            : mode === 'login'
              ? 'Přihlásit se'
              : 'Registrovat se'}
        </button>
      </form>
      <div className="my-5 flex items-center gap-3 text-xs text-slate-500">
        <span className="h-px flex-1 bg-slate-800" />
        nebo
        <span className="h-px flex-1 bg-slate-800" />
      </div>
      <a
        href="/api/auth/google"
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-900"
      >
        <span aria-hidden="true" className="text-lg font-bold text-white">G</span>
        {mode === 'login' ? 'Přihlásit se přes Google' : 'Registrovat přes Google'}
      </a>
    </div>
  );
}
