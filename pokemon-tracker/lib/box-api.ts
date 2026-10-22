import type { PokemonBox } from '@/types/box';

const boxProductTerms = /\b(?:elite trainer box|etb|booster box|booster|collection box|collection|boxes|box)\b/g;

export function getBoxSetQuery(query: string) {
  return query.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(boxProductTerms, ' ').replace(/\s+/g, ' ').trim();
}

export function getBoxProductSuffix(query: string) {
  const normalized = query.toLowerCase();

  if (/\bbooster\b/.test(normalized)) {
    return 'Booster Box';
  }

  if (/\b(?:elite trainer box|etb)\b/.test(normalized)) {
    return 'Elite Trainer Box';
  }

  if (/\b(?:collection box|collection)\b/.test(normalized)) {
    return 'Collection Box';
  }

  if (getBoxSetQuery(query) === 'ascended heroes') {
    return 'Elite Trainer Box';
  }

  return 'Booster Box';
}

function matchesBoxSetQuery(box: PokemonBox, query: string) {
  const terms = getBoxSetQuery(query).split(' ').filter(Boolean);
  const setName = (box.set?.name ?? box.name).toLowerCase();

  return terms.length > 0 && terms.every((term) => setName.includes(term));
}

const boosterBoxFallbacks: PokemonBox[] = [
  {
    id: 'ascended-heroes-booster-box',
    name: 'Ascended Heroes Elite Trainer Box',
    type: 'box',
    set: { name: 'Ascended Heroes' },
    images: { product: '/images/ascended-heroes-box.png' },
  },
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
  const suffix = getBoxProductSuffix(query);

  return boosterBoxFallbacks
    .filter((box) => matchesBoxSetQuery(box, query))
    .map((box) => {
      if (box.images?.product && suffix === 'Elite Trainer Box') {
        return box;
      }

      return {
        ...box,
        name: `${box.set?.name ?? box.name.replace(/ Booster Box$/, '')} ${suffix}`,
        type: suffix === 'Booster Box' ? 'booster-box' : 'box',
        images: box.images?.product
          ? { logo: box.images.logo, symbol: box.images.symbol }
          : box.images,
      };
    });
}
