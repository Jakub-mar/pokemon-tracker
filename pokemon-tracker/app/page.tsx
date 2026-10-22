'use client';

import { useState, type FormEvent } from 'react';
import { PokemonBoxCard } from '@/components/PokemonBoxCard';
import { PokemonCard } from '@/components/PokemonCard';
import { ProfileCard } from '@/components/auth/ProfileCard';
import { SearchForm } from '@/components/SearchForm';
import { SiteHeader } from '@/components/SiteHeader';
import { getFallbackBoxes, searchPokemonBoxes } from '@/lib/box-api';
import { getFallbackCards, searchPokemonCards } from '@/lib/pokemon-api';
import type { PokemonBox } from '@/types/box';
import type { PokemonCard as PokemonCardData } from '@/types/pokemon';

export default function Home() {
  const [search, setSearch] = useState('');
  const [cards, setCards] = useState<PokemonCardData[]>([]);
  const [boxes, setBoxes] = useState<PokemonBox[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function searchCards(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();

    if (!query) {
      setCards([]);
      setBoxes([]);
      setError('Zadej název karty, Pokémona nebo boxu.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const [cardResults, boxResults] = await Promise.all([
        searchPokemonCards(query).catch(() => getFallbackCards(query)),
        searchPokemonBoxes(query).catch(() => getFallbackBoxes(query)),
      ]);
      setCards(cardResults);
      setBoxes(boxResults);

      if (!cardResults.length && !boxResults.length) {
        setError(`Pro „${query}“ jsme žádnou kartu ani box nenašli.`);
      }
    } catch {
      setCards([]);
      setBoxes([]);
      setError('Karty ani boxy se teď nepodařilo načíst. Zkus to prosím znovu.');
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

        {!cards.length && !boxes.length && !error && !isLoading && (
          <div className="py-16 text-center text-slate-500">
            <p className="text-lg font-semibold text-slate-300">Vyhledej svou první kartu nebo box</p>
            <p className="mt-2 text-sm">Výsledky se objeví tady po zadání názvu.</p>
          </div>
        )}

        {cards.length > 0 && (
          <section className="mb-10">
            <h3 className="mb-4 text-xl font-bold">Karty</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {cards.map((card) => <PokemonCard key={card.id} card={card} />)}
            </div>
          </section>
        )}

        {boxes.length > 0 && (
          <section>
            <h3 className="mb-4 text-xl font-bold">Boxy</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {boxes.map((box) => <PokemonBoxCard key={box.id} box={box} />)}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}