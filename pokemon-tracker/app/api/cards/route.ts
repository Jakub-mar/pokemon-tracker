import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query')?.trim();

  if (!query) {
    return NextResponse.json({ error: 'Chybí vyhledávaný název.' }, { status: 400 });
  }

  const parsedQuery = parseSearchQuery(query);
  const { name, number } = parsedQuery;
  if (!name && !number) {
    return NextResponse.json({ error: 'Zadej název karty nebo číslo karty.' }, { status: 400 });
  }

  const apiUrl = new URL('https://api.pokemontcg.io/v2/cards');
  const searchTerms = [
    name ? `name:${name}*` : '',
    number ? `number:${number}*` : '',
  ].filter(Boolean);
  apiUrl.searchParams.set('q', searchTerms.join(' '));
  apiUrl.searchParams.set('pageSize', '250');

  try {
    const cards: PokemonCard[] = [];
    let page = 1;
    let totalCount = 0;

    while (page === 1 || (page - 1) * 250 < totalCount) {
      apiUrl.searchParams.set('page', String(page));
      const response = await fetch(apiUrl, { next: { revalidate: 60 } });

      if (!response.ok) {
        return NextResponse.json(
          { error: 'Databázi karet se nepodařilo vyhledat.' },
          { status: 502 },
        );
      }

      const result: { data?: PokemonCard[]; totalCount?: number } = await response.json();
      const pageCards = (result.data ?? []).filter((card) => matchesQuery(card, parsedQuery));
      cards.push(...pageCards);

      if (typeof result.totalCount !== 'number') {
        break;
      }

      totalCount = result.totalCount;
      if (!(result.data?.length)) {
        break;
      }

      page += 1;
    }

    return NextResponse.json(cards);
  } catch {
    return NextResponse.json(
      { error: 'Databáze karet je momentálně nedostupná.' },
      { status: 502 },
    );
  }
}