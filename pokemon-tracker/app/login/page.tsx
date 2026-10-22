import { LoginForm } from '@/components/auth/LoginForm';

type LoginPageProps = {
  searchParams: Promise<{ googleError?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { googleError } = await searchParams;
  const initialError = Array.isArray(googleError)
    ? googleError[0]
    : googleError;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-yellow-500">PokéTracker</p>
          <h1 className="mt-3 text-4xl font-bold text-white">Přihlášení</h1>
        </div>

        <div className="flex justify-center">
          <LoginForm
            initialError={
              initialError === 'not-configured'
                ? 'Přihlášení přes Google zatím není nakonfigurované.'
                : initialError
                  ? 'Přihlášení přes Google se nepodařilo. Zkus to prosím znovu.'
                  : ''
            }
          />
        </div>
      </div>
    </main>
  );
}
