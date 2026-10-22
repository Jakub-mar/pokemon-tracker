import { AccountSettings } from '@/components/auth/AccountSettings';
import { SiteHeader } from '@/components/SiteHeader';
import { getCurrentAuthenticatedUser } from '@/lib/auth-server';
import { toAppUser } from '@/lib/user-presenter';
import { redirect } from 'next/navigation';

export default async function AccountPage() {
  const user = await getCurrentAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-yellow-500">PokéTracker</p>
          <h1 className="mt-3 text-4xl font-bold">Správa účtu</h1>
        </div>
        <AccountSettings initialUser={toAppUser(user)} />
      </main>
    </div>
  );
}
