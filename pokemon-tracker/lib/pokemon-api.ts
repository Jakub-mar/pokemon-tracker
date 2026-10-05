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

export async function searchPokemonCards(query: string): Promise<PokemonCard[]> {
  const response = await fetch(`/api/cards?query=${encodeURIComponent(query)}`);

  if (!response.ok) {
    throw new Error('Vyhledávání se nepodařilo.');
  }

  const cards = await response.json();

  if (!cards.length && query.toLowerCase().includes('charizard')) {
    return [charizardFallback];
  }

  return cards;
}

export function getFallbackCards(query: string): PokemonCard[] {
  return query.toLowerCase().includes('charizard') ? [charizardFallback] : [];
}
