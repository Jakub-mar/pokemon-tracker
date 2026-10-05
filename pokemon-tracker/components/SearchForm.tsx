import type { FormEvent } from 'react';

type SearchFormProps = {
  search: string;
  isLoading: boolean;
  onSearchChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function SearchForm({
  search,
  isLoading,
  onSearchChange,
  onSubmit,
}: SearchFormProps) {
  return (
    <form onSubmit={onSubmit} className="mx-auto flex max-w-xl gap-2">
      <input
        type="text"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Zadej název karty (např. Charizard, Pikachu)..."
        aria-label="Název karty"
        className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm transition focus:border-yellow-400 focus:outline-none"
      />
      <button
        type="submit"
        disabled={isLoading}
        className="rounded-xl bg-yellow-500 px-6 py-3 font-bold text-slate-950 transition hover:bg-yellow-400 disabled:opacity-60"
      >
        {isLoading ? 'Hledám...' : 'Hledat'}
      </button>
    </form>
  );
}
