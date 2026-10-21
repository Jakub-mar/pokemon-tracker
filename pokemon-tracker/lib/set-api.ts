import type { PokemonSet } from '@/types/box';

export async function searchPokemonSets(query: string): Promise<PokemonSet[]> {
  const response = await fetch(`/api/sets?query=${encodeURIComponent(query)}`);

  if (!response.ok) {
    throw new Error('Vyhledávání setů se nepodařilo.');
  }

  const sets = await response.json();
  return Array.isArray(sets) ? sets : [];
}

export function getFallbackSets(query: string): PokemonSet[] {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return [];
  }

  const items: PokemonSet[] = [
    {
      id: 'sv',
      name: 'Scarlet & Violet',
      type: 'set',
      series: 'Scarlet & Violet',
      releaseDate: '2023-03-31',
      printedTotal: 198,
      images: { logo: 'https://images.pokemontcg.io/sv/logo.png' },
    },
    {
      id: 'cel25',
      name: 'Celebrations',
      type: 'set',
      series: 'Celebrations',
      releaseDate: '2021-10-08',
      printedTotal: 193,
      images: { logo: 'https://images.pokemontcg.io/cel/logo.png' },
    },
  ];

  return items.filter((set) => {
    const haystack = `${set.name} ${set.series ?? ''}`.toLowerCase();
    return haystack.includes(normalized);
  });
}
