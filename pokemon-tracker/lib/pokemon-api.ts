import type { PokemonCard } from '@/types/pokemon';

const charizardFallback: PokemonCard = {
  id: 'base1-4',
  name: 'Charizard',
  number: '4',
  set: { name: 'Base Set' },
  images: {
    small: 'https://images.pokemontcg.io/base1/4.png',
    large: 'https://images.pokemontcg.io/base1/4_hires.png',
  },
};

const charizardExFallback: PokemonCard = {
  id: 'cel23-223',
  name: 'Charizard ex',
  number: '223/197',
  set: { name: 'Celebrations' },
  rarity: 'Rare Holo',
  images: {
    small: 'https://images.pokemontcg.io/cel/223.png',
    large: 'https://images.pokemontcg.io/cel/223_hires.png',
  },
  tcgplayer: {
    prices: {
      holofoil: {
        low: 18,
        mid: 24,
        high: 31,
        market: 26,
      },
    },
  },
};

export async function searchPokemonCards(query: string): Promise<PokemonCard[]> {
  const response = await fetch(`/api/cards?query=${encodeURIComponent(query)}`);

  if (!response.ok) {
    throw new Error('Vyhledávání se nepodařilo.');
  }

  const cards = await response.json();

  return cards;
}

export function getFallbackCards(query: string): PokemonCard[] {
  const normalized = query.toLowerCase();
  const numberMatch =
    /#\s*(\d+)(?:\s*\/\s*(\d+))?|\b(\d+)\s*\/\s*(\d+)/i.exec(query) ??
    /(?:^|\s)(\d+)$/.exec(query);
  const cardNumber = numberMatch ? numberMatch[1] ?? numberMatch[3] : '';
  const denominator = numberMatch ? numberMatch[2] ?? numberMatch[4] ?? '' : '';

  if (
    normalized.includes('charizard ex') &&
    (!cardNumber || (cardNumber === '223' && (!denominator || denominator === '197')))
  ) {
    return [charizardExFallback];
  }

  if (
    normalized.includes('charizard') &&
    !normalized.includes('charizard ex') &&
    (!cardNumber || (cardNumber === '4' && !denominator))
  ) {
    return [charizardFallback];
  }

  return [];
}
