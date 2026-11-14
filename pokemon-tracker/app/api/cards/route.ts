import { NextRequest, NextResponse } from 'next/server';
import { getBoxSetQuery } from '@/lib/box-api';
import type { PokemonCard } from '@/types/pokemon';

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

type ParsedSearchQuery = {
  name: string;
  number: string;
  denominator: string;
};

function parseSearchQuery(query: string): ParsedSearchQuery {
  const trimmed = query.trim();
  const numberMatch =
    /#\s*(\d+)(?:\s*\/\s*(\d+))?|\b(\d+)\s*\/\s*(\d+)/i.exec(trimmed) ??
    /(?:^|\s)(\d+)$/.exec(trimmed);

  if (!numberMatch) {
    return { name: trimmed, number: '', denominator: '' };
  }

  const number = numberMatch[1] ?? numberMatch[3] ?? numberMatch[1];
  const denominator = numberMatch[2] ?? numberMatch[4] ?? '';
  const name = `${trimmed.slice(0, numberMatch.index)} ${trimmed.slice(numberMatch.index + numberMatch[0].length)}`
    .replace(/\s+/g, ' ')
    .trim();

  return {
    name,
    number,
    denominator,
  };
}

function matchesQuery(card: PokemonCard, parsedQuery: ParsedSearchQuery) {
  const { name, number, denominator } = parsedQuery;
  const normalizedName = normalizeText(name);
  const normalizedCardName = normalizeText(card.name);
  const nameMatches =
    !name ||
    normalizedCardName.includes(normalizedName) ||
    normalizedName.includes(normalizedCardName);

  const [cardNumber, cardNumberDenominator] = (card.number ?? '').split('/');
  const cardDenominator = cardNumberDenominator ?? String(card.set?.printedTotal ?? '');
  const numberMatches =
    !number ||
    (cardNumber === number && (!denominator || cardDenominator === denominator));

  return nameMatches && numberMatches;
}

type TcgDexCardSummary = {
  id: string;
  localId: string;
  name: string;
  image?: string;
};

type TcgDexSetSummary = {
  id: string;
  name: string;
  cardCount?: { official?: number };
};

async function searchTcgDexCards(parsedQuery: ParsedSearchQuery) {
  const cardsUrl = new URL('https://api.tcgdex.net/v2/en/cards');
  if (parsedQuery.name) {
    cardsUrl.searchParams.set('name', parsedQuery.name);
  } else {
    cardsUrl.searchParams.set('localId', parsedQuery.number);
  }

  const [cardsResponse, setsResponse] = await Promise.all([
    fetch(cardsUrl, { next: { revalidate: 300 } }),
    fetch('https://api.tcgdex.net/v2/en/sets', { next: { revalidate: 3600 } }),
  ]);

  if (!cardsResponse.ok || !setsResponse.ok) {
    throw new Error('TCGdex search failed.');
  }

  const [result, sets]: [TcgDexCardSummary[], TcgDexSetSummary[]] = await Promise.all([
    cardsResponse.json(),
    setsResponse.json(),
  ]);
  const setsById = new Map(sets.map((set) => [set.id, set]));
  const cards: PokemonCard[] = result
    .filter((card) => card.image)
    .map((card): PokemonCard => {
      const setId = card.id.slice(0, -(card.localId.length + 1));
      const set = setsById.get(setId);
      const image = card.image!.replace(/\/$/, '');

      return {
        id: card.id,
        name: card.name,
        number: card.localId,
        set: { name: set?.name ?? setId, printedTotal: set?.cardCount?.official },
        images: {
          small: `${image}/low.png`,
          large: `${image}/high.png`,
        },
        dataSource: 'tcgdex',
      };
    })
    .filter((card) => matchesQuery(card, parsedQuery));

  return cards;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query')?.trim();

  if (!query) {
    return NextResponse.json({ error: 'Chybí vyhledávaný název.' }, { status: 400 });
  }

  const parsedQuery = parseSearchQuery(getBoxSetQuery(query));
  const { name, number } = parsedQuery;
  if (!name && !number) {
    return NextResponse.json({ error: 'Zadej název karty nebo číslo karty.' }, { status: 400 });
  }

  const apiUrl = new URL('https://api.pokemontcg.io/v2/cards');
  const searchTerms = [
    ...normalizeText(name)
      .split(/\s+/)
      .filter(Boolean)
      .map((term) => `name:${term}*`),
    number ? `number:${number}*` : '',
  ].filter(Boolean);
  apiUrl.searchParams.set('q', searchTerms.join(' '));
  apiUrl.searchParams.set('pageSize', '250');

  let pokemonTcgResponse: Response | undefined;
  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        pokemonTcgResponse = await fetch(apiUrl, { next: { revalidate: 300 } });
      } catch (error) {
        if (attempt === 1) {
          throw error;
        }
      }

      if (
        pokemonTcgResponse?.ok ||
        (pokemonTcgResponse && pokemonTcgResponse.status < 500) ||
        attempt === 1
      ) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (pokemonTcgResponse?.ok) {
      const result: { data?: PokemonCard[] } = await pokemonTcgResponse.json();
      const cards = (result.data ?? []).filter((card) => matchesQuery(card, parsedQuery));
      return NextResponse.json(cards);
    }
  } catch {
    // Try TCGdex if the primary API is unavailable.
  }

  try {
    const cards = await searchTcgDexCards(parsedQuery);
    return NextResponse.json(cards);
  } catch {
    if (pokemonTcgResponse && !pokemonTcgResponse.ok) {
      return NextResponse.json(
        { error: 'Databáze karet jsou dočasně nedostupné. Zkus to prosím za chvíli znovu.' },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { error: 'Databáze karet jsou momentálně nedostupné.' },
      { status: 502 },
    );
  }
}