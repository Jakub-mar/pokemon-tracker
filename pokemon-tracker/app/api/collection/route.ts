import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';
import {
  addCollectionItem,
  deleteCollectionItem,
  getUserCollection,
  updateCollectionItem,
  updateCollectionMarketPrices,
} from '@/lib/user-store';
import { toAppUser } from '@/lib/user-presenter';
import type { CollectionItem, CardCondition, CollectionProduct } from '@/types/collection';
import type { PokemonBox } from '@/types/box';
import type { PokemonCard } from '@/types/pokemon';

const cardConditions: CardCondition[] = ['Mint', 'Near Mint', 'Excellent', 'Good', 'Played', 'Poor'];
const priceVariants = ['normal', 'holofoil', 'reverseHolofoil', '1stEditionHolofoil', 'unlimitedHolofoil'] as const;
type PriceVariant = (typeof priceVariants)[number];

function isPriceVariant(value: unknown): value is PriceVariant {
  return typeof value === 'string' && (priceVariants as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isMoney(value: unknown): value is number | null {
  return value === null || (
    typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1_000_000_000
  );
}

function isPokemonCard(value: unknown): value is PokemonCard {
  if (!isRecord(value) || !isRecord(value.set) || !isRecord(value.images)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    /^[\w.-]{1,100}$/.test(value.id) &&
    typeof value.name === 'string' &&
    value.name.length <= 120 &&
    typeof value.number === 'string' &&
    value.number.length <= 30 &&
    typeof value.set.name === 'string' &&
    value.set.name.length <= 120 &&
    typeof value.images.small === 'string' &&
    typeof value.images.large === 'string'
  );
}

function isPokemonBox(value: unknown): value is PokemonBox {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    /^[\w.-]{1,120}$/.test(value.id) &&
    typeof value.name === 'string' &&
    value.name.length <= 160 &&
    (value.type === 'box' || value.type === 'booster-box')
  );
}

function getCardMarketPrice(card: PokemonCard, variant: string) {
  const price = card.tcgplayer?.prices?.[variant as PriceVariant]?.market;
  return typeof price === 'number' && Number.isFinite(price) && price >= 0 ? price : null;
}

async function refreshMarketPrices(items: CollectionItem[]) {
  const cardIds = new Set<string>();

  for (const item of items) {
    if (item.product.type !== 'card' || item.product.card.dataSource === 'tcgdex') {
      continue;
    }

    cardIds.add(item.product.card.id);
  }

  const prices = new Map<string, { card: PokemonCard; price: number | null; updatedAt: string }>();
  const ids = [...cardIds];
  let warning: string | undefined;

  for (let offset = 0; offset < ids.length; offset += 100) {
    const batch = ids.slice(offset, offset + 100);
    const url = new URL('https://api.pokemontcg.io/v2/cards');
    url.searchParams.set('q', batch.map((id) => `id:${id}`).join(' OR '));
    url.searchParams.set('pageSize', String(batch.length));

    try {
      const response = await fetch(url, { next: { revalidate: 300 } });
      if (!response.ok) {
        throw new Error(`Pokémon TCG API returned ${response.status}.`);
      }

      const result: { data?: PokemonCard[] } = await response.json();
      const refreshedCards = new Map((result.data ?? []).map((card) => [card.id, card]));

      for (const id of batch) {
        const card = refreshedCards.get(id);
        if (!card) {
          continue;
        }

        for (const item of items) {
          if (item.product.type === 'card' && item.product.card.id === id) {
            const sourceUpdatedAt = card.tcgplayer?.updatedAt;
            const sourceDate = sourceUpdatedAt ? new Date(sourceUpdatedAt.replace(/\//g, '-')) : null;
            prices.set(`${id}:${item.product.variant}`, {
              card,
              price: getCardMarketPrice(card, item.product.variant),
              updatedAt: sourceDate && Number.isFinite(sourceDate.getTime())
                ? sourceDate.toISOString()
                : item.priceUpdatedAt ?? new Date().toISOString(),
            });
          }
        }
      }
    } catch (error) {
      console.error('Collection market price refresh failed:', error);
      warning = 'Aktuální ceny se nepodařilo načíst. Zobrazuji poslední uložené hodnoty.';
    }
  }

  return { prices, warning };
}

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Přihlášení vypršelo. Přihlas se prosím znovu.' }, { status: 401 });
  }

  try {
    let items: CollectionItem[];
    try {
      items = await getUserCollection(user.id);
    } catch (error) {
      console.error('Collection item could not be loaded for editing:', error);
      return NextResponse.json({ error: 'Položku sbírky se nepodařilo načíst.' }, { status: 500 });
    }
    const { prices, warning } = await refreshMarketPrices(items);
    const updatedUser = prices.size
      ? await updateCollectionMarketPrices(user.id, prices)
      : user;

    return NextResponse.json({
      items: updatedUser.collection ?? items,
      user: toAppUser(updatedUser),
      warning,
    });
  } catch (error) {
    console.error('Collection could not be loaded:', error);
    return NextResponse.json({ error: 'Sbírku se nepodařilo načíst.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Přihlášení vypršelo. Přihlas se prosím znovu.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Požadavek není platný.' }, { status: 400 });
  }

  if (!isRecord(body) || !Number.isInteger(body.quantity) || (body.quantity as number) < 1 || (body.quantity as number) > 9999) {
    return NextResponse.json({ error: 'Počet kusů musí být celé číslo od 1 do 9 999.' }, { status: 400 });
  }
  if (!isMoney(body.purchasePrice)) {
    return NextResponse.json({ error: 'Pořizovací cena musí být nezáporná částka nebo prázdná.' }, { status: 400 });
  }

  let product: CollectionProduct;
  let currentPrice: number | null;
  if (body.type === 'card' && isPokemonCard(body.card)) {
    const variant = body.variant;
    const condition = body.condition;
    if (!isPriceVariant(variant) || !cardConditions.includes(condition as CardCondition)) {
      return NextResponse.json({ error: 'Varianta nebo stav karty není platný.' }, { status: 400 });
    }

    product = { type: 'card', card: body.card, variant, condition: condition as CardCondition };
    currentPrice = getCardMarketPrice(body.card, variant);
  } else if (body.type === 'box' && isPokemonBox(body.box)) {
    if (!isMoney(body.currentPrice)) {
      return NextResponse.json({ error: 'Aktuální cena boxu musí být nezáporná částka nebo prázdná.' }, { status: 400 });
    }

    product = { type: 'box', box: body.box };
    currentPrice = body.currentPrice;
  } else {
    return NextResponse.json({ error: 'Údaje o kartě nebo boxu nejsou platné.' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const item: CollectionItem = {
    id: crypto.randomUUID(),
    product,
    quantity: body.quantity as number,
    purchasePrice: body.purchasePrice,
    currentPrice,
    addedAt: now,
    priceUpdatedAt: currentPrice === null ? null : now,
  };

  try {
    const updatedUser = await addCollectionItem(user.id, item);
    return NextResponse.json({ item, user: toAppUser(updatedUser) }, { status: 201 });
  } catch (error) {
    console.error('Collection item could not be added:', error);
    return NextResponse.json({ error: 'Položku se nepodařilo přidat do sbírky.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Přihlášení vypršelo. Přihlas se prosím znovu.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Požadavek není platný.' }, { status: 400 });
  }

  if (!isRecord(body) || typeof body.id !== 'string' || !body.id) {
    return NextResponse.json({ error: 'Chybí položka, kterou chceš upravit.' }, { status: 400 });
  }

  const changes: Partial<Pick<CollectionItem, 'quantity' | 'purchasePrice' | 'currentPrice' | 'product'>> = {};
  if ('quantity' in body) {
    if (!Number.isInteger(body.quantity) || (body.quantity as number) < 1 || (body.quantity as number) > 9999) {
      return NextResponse.json({ error: 'Počet kusů musí být celé číslo od 1 do 9 999.' }, { status: 400 });
    }
    changes.quantity = body.quantity as number;
  }
  if ('purchasePrice' in body) {
    if (!isMoney(body.purchasePrice)) {
      return NextResponse.json({ error: 'Pořizovací cena musí být nezáporná částka nebo prázdná.' }, { status: 400 });
    }
    changes.purchasePrice = body.purchasePrice;
  }
  if ('currentPrice' in body) {
    if (!isMoney(body.currentPrice)) {
      return NextResponse.json({ error: 'Aktuální cena musí být nezáporná částka nebo prázdná.' }, { status: 400 });
    }
    changes.currentPrice = body.currentPrice;
  }

  const items = await getUserCollection(user.id);
  const item = items.find((collectionItem) => collectionItem.id === body.id);
  if (!item) {
    return NextResponse.json({ error: 'Položka sbírky nebyla nalezena.' }, { status: 404 });
  }

  if ('condition' in body || 'variant' in body) {
    if (
      item.product.type !== 'card' ||
      ('condition' in body && !cardConditions.includes(body.condition as CardCondition)) ||
      ('variant' in body && !isPriceVariant(body.variant))
    ) {
      return NextResponse.json({ error: 'Stav nebo varianta karty není platná.' }, { status: 400 });
    }

    changes.product = {
      ...item.product,
      condition: 'condition' in body ? body.condition as CardCondition : item.product.condition,
      variant: 'variant' in body ? body.variant as PriceVariant : item.product.variant,
    };
    if ('variant' in body) {
      changes.currentPrice = getCardMarketPrice(item.product.card, body.variant as PriceVariant);
    }
  }

  if (!Object.keys(changes).length) {
    return NextResponse.json({ error: 'Vyber alespoň jednu hodnotu ke změně.' }, { status: 400 });
  }

  try {
    const updatedUser = await updateCollectionItem(user.id, body.id, changes);
    return NextResponse.json({ items: updatedUser.collection ?? [], user: toAppUser(updatedUser) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Položku se nepodařilo upravit.';
    const status = message === 'Položka sbírky nebyla nalezena.' ? 404 : 500;
    if (status === 500) {
      console.error('Collection item could not be updated:', error);
    }
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Přihlášení vypršelo. Přihlas se prosím znovu.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Požadavek není platný.' }, { status: 400 });
  }

  if (!isRecord(body) || typeof body.id !== 'string' || !body.id) {
    return NextResponse.json({ error: 'Chybí položka, kterou chceš odebrat.' }, { status: 400 });
  }

  try {
    const updatedUser = await deleteCollectionItem(user.id, body.id);
    return NextResponse.json({ items: updatedUser.collection ?? [], user: toAppUser(updatedUser) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Položku se nepodařilo odebrat.';
    const status = message === 'Položka sbírky nebyla nalezena.' ? 404 : 500;
    if (status === 500) {
      console.error('Collection item could not be deleted:', error);
    }
    return NextResponse.json({ error: message }, { status });
  }
}
