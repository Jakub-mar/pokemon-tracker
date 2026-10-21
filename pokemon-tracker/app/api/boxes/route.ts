import { NextRequest, NextResponse } from 'next/server';
import type { PokemonBox } from '@/types/box';

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function matchesBoxQuery(box: PokemonBox, query: string) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return true;
  }

  const haystack = normalizeText(
    [box.name, box.series, box.set?.name, box.type].filter(Boolean).join(' '),
  );

  return haystack.includes(normalizedQuery) || normalizedQuery.includes(haystack);
}

function getFallbackBoxes(query: string): PokemonBox[] {
  const normalizedQuery = normalizeText(query);
  const items: PokemonBox[] = [
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

  return items.filter((box) => matchesBoxQuery(box, normalizedQuery));
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query')?.trim();

  if (!query) {
    return NextResponse.json({ error: 'Chybí vyhledávaný box.' }, { status: 400 });
  }

  const apiUrl = new URL('https://api.pokemontcg.io/v2/sets');
  apiUrl.searchParams.set('q', `name:${query}*`);
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
      .filter((box) => /box|booster/i.test(box.name) || /box|booster/i.test(box.series ?? ''))
      .map((box): PokemonBox => ({
        id: box.id,
        name: box.name,
        type: /booster/i.test(box.name) ? 'booster-box' : 'box',
        set: { name: box.name },
        series: box.series,
        releaseDate: box.releaseDate,
        printedTotal: box.printedTotal,
        images: box.images,
      }))
      .filter((box) => matchesBoxQuery(box, query));

    return NextResponse.json(boxes.length ? boxes : getFallbackBoxes(query));
  } catch {
    return NextResponse.json(getFallbackBoxes(query), { status: 200 });
  }
}
