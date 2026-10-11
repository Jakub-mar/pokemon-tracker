import { LoginForm } from '@/components/auth/LoginForm';

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-yellow-500">PokéTracker</p>
          <h1 className="mt-3 text-4xl font-bold text-white">Registrace</h1>
        </div>

        <div className="mx-auto max-w-xl">
          <LoginForm initialMode="register" />
        </div>
      </div>
    </main>
  );
}
