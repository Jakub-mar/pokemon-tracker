import type { AppUser } from '@/types/user';

type UserPanelProps = {
  user: AppUser;
};

export function UserPanel({ user }: UserPanelProps) {
  return (
    <aside className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Uživatel</p>
          <h2 className="mt-2 text-2xl font-bold text-white">{user.displayName}</h2>
        </div>
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400">
          {user.isVerified ? 'Ověřeno' : 'Neověřeno'}
        </span>
      </div>

      <div className="mt-6 space-y-4 text-sm text-slate-300">
        <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
          <span>Uživatelské jméno</span>
          <span className="font-semibold text-white">{user.username}</span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
          <span>E-mail</span>
          <span className="font-semibold text-white">{user.email}</span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
          <span>Tarif</span>
          <span className="font-semibold text-yellow-400">{user.plan}</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Portfolio</p>
          <p className="mt-2 text-2xl font-bold text-white">{user.cardsOwned}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Hodnota</p>
          <p className="mt-2 text-2xl font-bold text-white">{user.portfolioValue.toLocaleString('cs-CZ')} Kč</p>
        </div>
      </div>
    </aside>
  );
}
