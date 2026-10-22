import { NextRequest, NextResponse } from 'next/server';
import { getBoxProductSuffix, getBoxSetQuery } from '@/lib/box-api';
import type { PokemonBox } from '@/types/box';

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function getFallbackBoxes(query: string): PokemonBox[] {
  const setQuery = getBoxSetQuery(query);
  const terms = setQuery.split(' ').filter(Boolean);
  const items: PokemonBox[] = [
    {
      id: 'ascended-heroes-booster-box',
      name: 'Ascended Heroes Elite Trainer Box',
      type: 'box',
      set: { name: 'Ascended Heroes' },
      images: { product: '/images/ascended-heroes-box.png' },
    },
    {
      id: 'celebrations-booster-box',
      name: 'Celebrations Booster Box',
      type: 'booster-box',
      set: { name: 'Celebrations' },
      series: 'Celebrations',
      releaseDate: '2021-10-08',
      printedTotal: 216,
      images: { logo: 'https://images.pokemontcg.io/cel/logo.png' },
    },
    {
      id: 'scarlet-violet-booster-box',
      name: 'Scarlet & Violet Booster Box',
      type: 'booster-box',
      set: { name: 'Scarlet & Violet' },
      series: 'Scarlet & Violet',
      releaseDate: '2023-03-31',
      printedTotal: 216,
      images: { logo: 'https://images.pokemontcg.io/sv/logo.png' },
    },
  ];

  return items
    .filter((box) => {
      const name = normalizeText(box.set?.name ?? box.name);
      return terms.length > 0 && terms.every((term) => name.includes(term));
    })
    .map((box) => {
      const suffix = getBoxProductSuffix(query);
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

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query')?.trim();

  if (!query) {
    return NextResponse.json({ error: 'Chybí vyhledávaný box.' }, { status: 400 });
  }

  const setTerms = getBoxSetQuery(query).split(' ').filter(Boolean);
  if (!setTerms.length) {
    return NextResponse.json([]);
  }

  const apiUrl = new URL('https://api.pokemontcg.io/v2/sets');
  apiUrl.searchParams.set('q', setTerms.map((term) => `name:${term}*`).join(' '));
  apiUrl.searchParams.set('pageSize', '250');

  try {
    const response = await fetch(apiUrl, { next: { revalidate: 60 } });

    if (!response.ok) {
      return NextResponse.json(getFallbackBoxes(query));
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

    const boxes: PokemonBox[] = (result.data ?? [])
      .filter((set) => {
        const name = normalizeText(set.name);
        return setTerms.every((term) => name.includes(term));
      })
      .map((set): PokemonBox => {
        const suffix = getBoxProductSuffix(query);
        const isAscendedHeroes = normalizeText(set.name) === 'ascended heroes';
        return {
          id: `${set.id}-${normalizeText(suffix).replace(/\s+/g, '-')}`,
          name: `${set.name} ${suffix}`,
          type: suffix === 'Booster Box' ? 'booster-box' : 'box',
          set: { name: set.name },
          series: set.series,
          releaseDate: set.releaseDate,
          printedTotal: set.printedTotal,
          images:
            isAscendedHeroes && suffix === 'Elite Trainer Box'
              ? { ...set.images, product: '/images/ascended-heroes-box.png' }
              : set.images,
        };
      });

    return NextResponse.json(boxes.length ? boxes : getFallbackBoxes(query));
  } catch {
    return NextResponse.json(getFallbackBoxes(query), { status: 200 });
  }
}
