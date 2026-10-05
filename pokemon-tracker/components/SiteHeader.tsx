export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-800 bg-slate-900/50 px-6 py-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="text-2xl">⚡</span>
        <h1 className="text-xl font-bold tracking-wider text-yellow-400">PokéTracker</h1>
      </div>
      <nav className="flex gap-4" aria-label="Hlavní navigace">
        <button className="text-sm text-slate-300 transition hover:text-white">Katalog</button>
        <button className="text-sm text-slate-300 transition hover:text-white">Moje sbírka</button>
        <button className="text-sm text-slate-300 transition hover:text-white">Skenování AI</button>
      </nav>
    </header>
  );
}
