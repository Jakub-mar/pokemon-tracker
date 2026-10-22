'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveAuthUser } from '@/lib/auth-session';
import type { AppUser } from '@/types/user';

export default function GoogleAuthSuccessPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetch('/api/auth/account', { cache: 'no-store' });
        const data: { user?: AppUser; error?: string } = await response.json();

        if (!response.ok || !data.user) {
          throw new Error(data.error || 'Nepodařilo se načíst přihlášený účet.');
        }

        saveAuthUser(data.user);
        router.replace('/');
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Přihlášení se nepodařilo.');
      }
    }

    void loadUser();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="max-w-md text-center">
        {error ? (
          <>
            <p className="text-rose-400" role="alert">{error}</p>
            <a href="/login" className="mt-5 inline-block text-yellow-400 hover:text-yellow-300">
              Zpět na přihlášení
            </a>
          </>
        ) : (
          <p className="text-slate-300" role="status">Dokončuji přihlášení přes Google…</p>
        )}
      </div>
    </main>
  );
}
