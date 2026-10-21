import type { PokemonBox } from '@/types/box';

const boosterBoxFallbacks: PokemonBox[] = [
  {
    id: 'celbox-1',
    name: 'Celebrations Booster Box',
    type: 'booster-box',
    set: { name: 'Celebrations' },
    series: 'Celebrations',
    releaseDate: '2021-10-08',
    printedTotal: 216,
    images: {
      logo: 'https://images.pokemontcg.io/cel/logo.png',
    },
  },
  {
    id: 'svbox-1',
    name: 'Scarlet & Violet Booster Box',
    type: 'booster-box',
    set: { name: 'Scarlet & Violet' },
    series: 'Scarlet & Violet',
    releaseDate: '2023-03-31',
    printedTotal: 216,
    images: {
      logo: 'https://images.pokemontcg.io/sv/logo.png',
    },
  },
];

export async function searchPokemonBoxes(query: string): Promise<PokemonBox[]> {
  const response = await fetch(`/api/boxes?query=${encodeURIComponent(query)}`);

  if (!response.ok) {
    throw new Error('Vyhledávání boxů se nepodařilo.');
  }

  const boxes = await response.json();
  return Array.isArray(boxes) ? boxes : [];
}

export function getFallbackBoxes(query: string): PokemonBox[] {
  const normalized = query.toLowerCase();

  if (!normalized) {
    return [];
  }

  return boosterBoxFallbacks.filter((box) => {
    const haystack = `${box.name} ${box.series ?? ''} ${box.set?.name ?? ''}`.toLowerCase();
    return haystack.includes(normalized) || normalized.includes(box.name.toLowerCase());
  });
}
