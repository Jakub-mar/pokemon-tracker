import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-yellow-500">PokéTracker</p>
          <h1 className="mt-3 text-4xl font-bold text-white">Přihlášení</h1>
        </div>

        <div className="flex justify-center">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
