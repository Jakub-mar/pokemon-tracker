import { NextRequest, NextResponse } from 'next/server';
import { findMatchingJustTcgCard, normalizeJustTcgSearchName } from '@/lib/justtcg-card';
import { findTcgplayerProductId } from '@/lib/tcgplayer-product';

type TimeRange = '1M' | '3M' | '6M' | '1Y';

type JustTcgPoint = {
  p?: unknown;
  t?: unknown;
};

type JustTcgVariant = {
  id?: unknown;
  condition?: unknown;
  printing?: unknown;
  price?: unknown;
  lastUpdated?: unknown;
  priceHistory?: unknown;
};

type JustTcgCard = {
  name?: unknown;
  set_name?: unknown;
  number?: unknown;
  tcgplayerId?: unknown;
  variants?: unknown;
};

const rangeMilliseconds: Record<TimeRange, number> = {
  '1M': 30 * 24 * 60 * 60 * 1000,
  '3M': 90 * 24 * 60 * 60 * 1000,
  '6M': 180 * 24 * 60 * 60 * 1000,
  '1Y': 365 * 24 * 60 * 60 * 1000,
};
const justTcgCacheSeconds = 24 * 60 * 60;

function isTimeRange(value: string | null): value is TimeRange {
  return value === '1M' || value === '3M' || value === '6M' || value === '1Y';
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function asFiniteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const name = searchParams.get('name')?.trim();
  const setName = searchParams.get('set')?.trim();
  const number = searchParams.get('number')?.trim();
  const range = searchParams.get('range');

  if (!name || !setName || !number || !isTimeRange(range)) {
    return NextResponse.json({ error: 'Chybí údaje karty nebo je zvolené neplatné období.' }, { status: 400 });
  }

  const apiKey = process.env.JUSTTCG_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Na serveru není nastavený JUSTTCG_API_KEY. Doplň ho do prostředí serveru a restartuj aplikaci.' },
      { status: 503 },
    );
  }

  let tcgplayerProductId: string | null = null;
  try {
    tcgplayerProductId = await findTcgplayerProductId(name, setName, number);
  } catch {
    console.error('TCGplayer product lookup failed; falling back to JustTCG name search.');
  }

  let payload: unknown;
  let matchedCard: JustTcgCard | undefined;
  const searchNames = normalizeJustTcgSearchName(name)
    .split(/\s+/)
    .filter((term) => term.length >= 3);
  const searchTerms: Array<string | null> = tcgplayerProductId
    ? [null]
    : Array.from(new Set([normalizeJustTcgSearchName(name), ...searchNames])).slice(0, 3);

  try {
    for (const searchTerm of searchTerms) {
      const url = new URL('https://api.justtcg.com/v1/cards');
      url.searchParams.set('game', 'pokemon');
      url.searchParams.set('condition', 'NM');
      url.searchParams.set('priceHistoryDuration', '1y');
      url.searchParams.set('limit', '20');
      if (tcgplayerProductId) {
        url.searchParams.set('tcgplayerId', tcgplayerProductId);
      } else {
        url.searchParams.set('q', searchTerm ?? '');
        url.searchParams.set('number', number);
      }

      const upstreamResponse = await fetch(url, {
        headers: { 'x-api-key': apiKey },
        next: { revalidate: justTcgCacheSeconds },
      });

      if (!upstreamResponse.ok) {
        if (upstreamResponse.status === 429) {
          return NextResponse.json({ error: 'Byl dosažen limit požadavků JustTCG. Zkus to později.' }, { status: 429 });
        }

        return NextResponse.json(
          {
            error: upstreamResponse.status === 401
              ? 'JustTCG odmítlo API klíč. Zkontroluj nastavení JUSTTCG_API_KEY na serveru.'
              : `JustTCG vrátilo chybu (${upstreamResponse.status}).`,
          },
          { status: 502 },
        );
      }

      try {
        payload = await upstreamResponse.json();
      } catch {
        console.error('JustTCG returned invalid price history JSON.');
        return NextResponse.json({ error: 'JustTCG vrátilo neplatná cenová data.' }, { status: 502 });
      }

      if (!payload || typeof payload !== 'object' || !('data' in payload) || !Array.isArray(payload.data)) {
        return NextResponse.json({ error: 'Odpověď JustTCG neobsahuje očekávaná data.' }, { status: 502 });
      }

      const cards = payload.data as JustTcgCard[];
      matchedCard = tcgplayerProductId
        ? cards.find((card) => String(card.tcgplayerId ?? '') === tcgplayerProductId)
          ?? findMatchingJustTcgCard(cards, name, setName, number)
        : findMatchingJustTcgCard(cards, name, setName, number);
      if (matchedCard) break;
    }
  } catch {
    console.error('JustTCG price history request failed.');
    return NextResponse.json({ error: 'JustTCG se nepodařilo kontaktovat.' }, { status: 502 });
  }

  if (!matchedCard) {
    return NextResponse.json(
      { error: 'JustTCG nenašlo přesnou shodu karty, edice a čísla.' },
      { status: 404 },
    );
  }

  const variants = Array.isArray(matchedCard.variants) ? matchedCard.variants as JustTcgVariant[] : [];
  const earliestTimestamp = Date.now() - rangeMilliseconds[range];
  const resultVariants = variants
    .filter((variant) => {
      const condition = asString(variant.condition).trim().toLowerCase();
      return condition === 'near mint' || condition === 'nm';
    })
    .map((variant) => {
      const history = Array.isArray(variant.priceHistory) ? variant.priceHistory as JustTcgPoint[] : [];
      const points = history
        .map((point) => {
          const price = asFiniteNumber(point.p);
          const timestamp = asFiniteNumber(point.t);
          if (price === null || timestamp === null || timestamp <= 0 || price < 0) return null;
          return { timestamp: timestamp * 1000, price };
        })
        .filter((point): point is { timestamp: number; price: number } => (
          point !== null && point.timestamp >= earliestTimestamp
        ))
        .sort((a, b) => a.timestamp - b.timestamp);

      const updatedAt = asFiniteNumber(variant.lastUpdated);
      return {
        id: asString(variant.id),
        condition: asString(variant.condition) || 'Near Mint',
        printing: asString(variant.printing) || 'Normal',
        currentPrice: asFiniteNumber(variant.price),
        lastUpdated: updatedAt === null ? null : updatedAt * 1000,
        points,
      };
    })
    .filter((variant) => variant.id.length > 0)
    .sort((a, b) => a.printing.localeCompare(b.printing));

  return NextResponse.json({ variants: resultVariants });
}
