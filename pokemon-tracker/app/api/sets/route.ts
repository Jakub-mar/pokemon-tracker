import { NextRequest, NextResponse } from 'next/server';
import type { PokemonSet } from '@/types/box';

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function matchesSetQuery(set: PokemonSet, query: string) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return true;
  }

  const haystack = normalizeText([set.name, set.series].filter(Boolean).join(' '));
  return haystack.includes(normalizedQuery) || normalizedQuery.includes(haystack);
}

function getFallbackSets(query: string): PokemonSet[] {
  const normalizedQuery = normalizeText(query);
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
    {
      id: 'swsh12',
      name: 'Silver Tempest',
      type: 'set',
      series: 'Sword & Shield',
      releaseDate: '2023-02-03',
      printedTotal: 195,
      images: { logo: 'https://images.pokemontcg.io/swsh12/logo.png' },
    },
  ];

  return items.filter((set) => matchesSetQuery(set, normalizedQuery));
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query')?.trim();

  if (!query) {
    return NextResponse.json({ error: 'Chybí vyhledávaný set.' }, { status: 400 });
  }

  const apiUrl = new URL('https://api.pokemontcg.io/v2/sets');
  apiUrl.searchParams.set('q', `name:${query}*`);
  apiUrl.searchParams.set('pageSize', '250');

  try {
    const response = await fetch(apiUrl, { next: { revalidate: 60 } });

    if (!response.ok) {
      return NextResponse.json(getFallbackSets(query));
    }

    const result: {
      data?: Array<{
        id: string;
        name: string;
        series?: string;
        printedTotal?: number;
        releaseDate?: string;
        images?: { logo?: string; symbol?: string };
      }>;
    } = await response.json();

    const sets: PokemonSet[] = (result.data ?? [])
      .map((set): PokemonSet => ({
        id: set.id,
        name: set.name,
        type: 'set',
        series: set.series,
        releaseDate: set.releaseDate,
        printedTotal: set.printedTotal,
        images: set.images,
      }))
      .filter((set) => matchesSetQuery(set, query));

    return NextResponse.json(sets.length ? sets : getFallbackSets(query));
  } catch {
    return NextResponse.json(getFallbackSets(query), { status: 200 });
  }
}
