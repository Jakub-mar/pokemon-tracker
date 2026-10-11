'use client';

import { useState, type FormEvent } from 'react';
import { PokemonCard } from '@/components/PokemonCard';
import { ProfileCard } from '@/components/auth/ProfileCard';
import { SearchForm } from '@/components/SearchForm';
import { SiteHeader } from '@/components/SiteHeader';
import { getFallbackCards, searchPokemonCards } from '@/lib/pokemon-api';
import type { PokemonCard as PokemonCardData } from '@/types/pokemon';

export default function Home() {
  const [search, setSearch] = useState('');
  const [cards, setCards] = useState<PokemonCardData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function searchCards(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();

    if (!query) {
      setCards([]);
      setError('Zadej název karty nebo Pokémona.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const results = await searchPokemonCards(query);
      setCards(results);

      if (!results.length) {
        setError(`Pro „${query}“ jsme žádnou kartu nenašli.`);
      }
    } catch {
      const fallbackCards = getFallbackCards(query);

      if (fallbackCards.length) {
        setCards(fallbackCards);
      } else {
        setCards([]);
        setError('Karty se teď nepodařilo načíst. Zkus to prosím znovu.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      <SiteHeader />

      <main className="max-w-6xl mx-auto px-6 py-10">
        <ProfileCard />

        <div className="mb-10 text-center">
          <h2 className="text-4xl font-extrabold mb-3">Sleduj ceny Pokémon karet a boxů</h2>
          <p className="text-slate-400 mb-6">Aktuální přehled tržních cen, PSA ohodnocení a odkazů na nákup.</p>
          <SearchForm
            search={search}
            isLoading={isLoading}
            onSearchChange={setSearch}
            onSubmit={searchCards}
          />
        </div>

        {error && <p className="mb-8 text-center text-rose-400">{error}</p>}

        {!cards.length && !error && !isLoading && (
          <div className="py-16 text-center text-slate-500">
            <p className="text-lg font-semibold text-slate-300">Vyhledej svou první kartu</p>
            <p className="mt-2 text-sm">Výsledky se objeví tady po zadání názvu.</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => <PokemonCard key={card.id} card={card} />)}
        </div>

      </main>
    </div>
  );
}