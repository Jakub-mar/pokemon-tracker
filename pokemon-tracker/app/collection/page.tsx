'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { SiteHeader } from '@/components/SiteHeader';
import { getCardDetailHref } from '@/components/PokemonCard';
import { saveAuthUser, useAuthUser } from '@/lib/auth-session';
import type { CollectionItem, CardCondition } from '@/types/collection';
import type { PokemonCard } from '@/types/pokemon';
import type { AppUser } from '@/types/user';

type GroupMode = 'series' | 'value';
type ApiResult = {
  items?: CollectionItem[];
  user?: AppUser;
  warning?: string;
  error?: string;
};

const conditionOptions: CardCondition[] = ['Mint', 'Near Mint', 'Excellent', 'Good', 'Played', 'Poor'];
const variantLabels: Record<string, string> = {
  normal: 'Normal',
  holofoil: 'Holo',
  reverseHolofoil: 'Reverse holo',
  '1stEditionHolofoil': 'Holo 1. edice',
  unlimitedHolofoil: 'Unlimited holo',
};

function formatCurrency(value: number | null) {
  return value === null || !Number.isFinite(value)
    ? '—'
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function getProductName(item: CollectionItem) {
  return item.product.type === 'card' ? item.product.card.name : item.product.box.name;
}

function getProductImage(item: CollectionItem) {
  return item.product.type === 'card'
    ? item.product.card.images.small
    : item.product.box.images?.product ?? item.product.box.images?.logo;
}

function getProductSeries(item: CollectionItem) {
  if (item.product.type === 'card') {
    return item.product.card.set.series || item.product.card.set.name;
  }

  return item.product.box.series || item.product.box.set?.name || item.product.box.name;
}

function getValueGroup(item: CollectionItem) {
  if (item.currentPrice === null) {
    return 'Cena není dostupná';
  }

  const total = item.currentPrice * item.quantity;
  if (total >= 100) {
    return 'Hodnota od $100';
  }
  if (total >= 25) {
    return 'Hodnota $25–99.99';
  }
  return 'Hodnota do $24.99';
}

function calculateTotals(items: CollectionItem[]) {
  let marketValue = 0;
  let investedValue = 0;
  let pricedItems = 0;
  let itemsWithCost = 0;
  let comparableMarketValue = 0;
  let comparableInvestedValue = 0;
  let cardsOwned = 0;
  let boxesOwned = 0;

  for (const item of items) {
    if (item.currentPrice !== null) {
      marketValue += item.currentPrice * item.quantity;
      pricedItems += 1;
    }
    if (item.purchasePrice !== null) {
      investedValue += item.purchasePrice * item.quantity;
      itemsWithCost += 1;
    }
    if (item.currentPrice !== null && item.purchasePrice !== null) {
      comparableMarketValue += item.currentPrice * item.quantity;
      comparableInvestedValue += item.purchasePrice * item.quantity;
    }
    if (item.product.type === 'card') {
      cardsOwned += item.quantity;
    } else {
      boxesOwned += item.quantity;
    }
  }

  return {
    marketValue: pricedItems ? marketValue : null,
    investedValue: itemsWithCost ? investedValue : null,
    cardsOwned,
    boxesOwned,
    change: comparableMarketValue - comparableInvestedValue,
    returnPercent: comparableInvestedValue > 0
      ? ((comparableMarketValue - comparableInvestedValue) / comparableInvestedValue) * 100
      : null,
    hasComparableItems: items.some((item) => item.currentPrice !== null && item.purchasePrice !== null),
  };
}

function getCardPrice(card: PokemonCard, variant: string) {
  const price = Object.entries(card.tcgplayer?.prices ?? {})
    .find(([key]) => key === variant)?.[1]?.market;
  return typeof price === 'number' && Number.isFinite(price) && price >= 0 ? price : null;
}

type CollectionItemCardProps = {
  item: CollectionItem;
  onSave: (item: CollectionItem, changes: Record<string, unknown>) => Promise<void>;
  onDelete: (item: CollectionItem) => Promise<void>;
};

function CollectionItemCard({ item, onSave, onDelete }: CollectionItemCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [purchasePrice, setPurchasePrice] = useState(item.purchasePrice?.toString() ?? '');
  const [currentPrice, setCurrentPrice] = useState(item.currentPrice?.toString() ?? '');
  const [condition, setCondition] = useState(
    item.product.type === 'card' ? item.product.condition : 'Near Mint',
  );
  const [variant, setVariant] = useState(
    item.product.type === 'card' ? item.product.variant : 'normal',
  );
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const image = getProductImage(item);
  const name = getProductName(item);
  const card = item.product.type === 'card' ? item.product.card : null;
  const totalValue = item.currentPrice === null ? null : item.currentPrice * item.quantity;
  const totalCost = item.purchasePrice === null ? null : item.purchasePrice * item.quantity;
  const change = totalValue !== null && totalCost !== null ? totalValue - totalCost : null;
  const variants = item.product.type === 'card'
    ? Object.keys(item.product.card.tcgplayer?.prices ?? {}).filter((key) => key in variantLabels)
    : [];
  const detailHref = item.product.type === 'card'
    ? getCardDetailHref(item.product.card)
    : null;

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const parsedQuantity = Number(quantity);
    const parsedPurchasePrice = purchasePrice.trim() ? Number(purchasePrice) : null;
    const parsedCurrentPrice = currentPrice.trim() ? Number(currentPrice) : null;
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1 || parsedQuantity > 9999) {
      setError('Počet kusů musí být celé číslo od 1 do 9 999.');
      return;
    }
    if (parsedPurchasePrice !== null && (!Number.isFinite(parsedPurchasePrice) || parsedPurchasePrice < 0)) {
      setError('Pořizovací cena musí být nezáporná částka.');
      return;
    }
    if (parsedCurrentPrice !== null && (!Number.isFinite(parsedCurrentPrice) || parsedCurrentPrice < 0)) {
      setError('Aktuální cena musí být nezáporná částka.');
      return;
    }

    const changes: Record<string, unknown> = {
      quantity: parsedQuantity,
      purchasePrice: parsedPurchasePrice,
      currentPrice: parsedCurrentPrice,
    };
    if (item.product.type === 'card') {
      changes.condition = condition;
      changes.variant = variant;
    }

    setIsSaving(true);
    try {
      await onSave(item, changes);
      setIsEditing(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Změny se nepodařilo uložit.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Odebrat „${name}“ ze sbírky?`)) {
      return;
    }
    setError('');
    try {
      await onDelete(item);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Položku se nepodařilo odebrat.');
    }
  }

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex gap-4">
        {image && (
          <div className="flex h-32 w-24 shrink-0 items-center justify-center rounded-xl bg-slate-950 p-2">
            <Image src={image} alt={`${name}`} width={245} height={342} unoptimized className="max-h-full w-auto object-contain" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-yellow-500">
            {item.product.type === 'card' ? 'Karta' : 'Box'} · {getProductSeries(item)}
          </p>
          <h3 className="mt-1 break-words text-lg font-bold text-white">
            {detailHref ? <Link href={detailHref} className="hover:text-yellow-300">{name}</Link> : name}
          </h3>
          {item.product.type === 'card' && (
            <p className="mt-1 text-sm text-slate-400">
              #{item.product.card.number} · {item.product.condition} · {variantLabels[item.product.variant] ?? item.product.variant}
            </p>
          )}
          <p className="mt-1 text-sm text-slate-400">Počet: {item.quantity} ks</p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <p><span className="block text-xs text-slate-500">Tržní hodnota</span><strong className="text-white">{formatCurrency(totalValue)}</strong></p>
            <p><span className="block text-xs text-slate-500">Pořizovací cena</span><strong className="text-white">{formatCurrency(totalCost)}</strong></p>
            <p>
              <span className="block text-xs text-slate-500">Změna</span>
              <strong className={change === null ? 'text-slate-400' : change >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                {change === null ? '—' : `${change >= 0 ? '+' : ''}${formatCurrency(change)}`}
              </strong>
            </p>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {item.priceUpdatedAt
              ? `Cena aktualizována ${new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'medium' }).format(new Date(item.priceUpdatedAt))}`
              : item.currentPrice === null
                ? 'Tržní cena není dostupná.'
                : item.product.type === 'box'
                  ? 'Cena boxu zadaná ručně.'
                  : 'Cena zadaná ručně.'}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-800 pt-3">
        <button
          type="button"
          onClick={() => {
            setError('');
            setIsEditing((editing) => !editing);
          }}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-300 hover:border-yellow-500 hover:text-yellow-300"
        >
          {isEditing ? 'Zavřít úpravy' : 'Upravit'}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="rounded-lg border border-rose-900/70 px-3 py-1.5 text-sm font-medium text-rose-300 hover:bg-rose-950"
        >
          Odebrat
        </button>
      </div>

      {isEditing && (
        <form onSubmit={handleSave} className="mt-4 grid gap-3 border-t border-slate-800 pt-4 sm:grid-cols-2">
          <label className="text-sm text-slate-300">
            Počet kusů
            <input
              type="number"
              min="1"
              max="9999"
              step="1"
              required
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-yellow-400 focus:outline-none"
            />
          </label>
          <label className="text-sm text-slate-300">
            Pořizovací cena za kus ($)
            <input
              type="number"
              min="0"
              step="0.01"
              value={purchasePrice}
              onChange={(event) => setPurchasePrice(event.target.value)}
              placeholder="Nevyplněno"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-yellow-400 focus:outline-none"
            />
          </label>
          <label className="text-sm text-slate-300">
            Aktuální cena za kus ($)
            <input
              type="number"
              min="0"
              step="0.01"
              value={currentPrice}
              onChange={(event) => setCurrentPrice(event.target.value)}
              placeholder="Neznámá"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-yellow-400 focus:outline-none"
            />
          </label>
          {item.product.type === 'card' && (
            <>
              <label className="text-sm text-slate-300">
                Stav karty
                <select
                  value={condition}
                  onChange={(event) => setCondition(event.target.value as CardCondition)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-yellow-400 focus:outline-none"
                >
                  {conditionOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <label className="text-sm text-slate-300">
                Varianta
                <select
                  value={variant}
                  onChange={(event) => {
                    setVariant(event.target.value);
                    setCurrentPrice(card ? getCardPrice(card, event.target.value)?.toString() ?? '' : '');
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-yellow-400 focus:outline-none"
                >
                  {[...new Set([...variants, variant])].map((option) => (
                    <option key={option} value={option}>{variantLabels[option] ?? option}</option>
                  ))}
                </select>
              </label>
            </>
          )}
          {error && <p className="text-sm text-rose-300 sm:col-span-2" role="alert">{error}</p>}
          <div className="flex justify-end sm:col-span-2">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-yellow-400 disabled:opacity-60"
            >
              {isSaving ? 'Ukládám…' : 'Uložit změny'}
            </button>
          </div>
        </form>
      )}
      {!isEditing && error && <p className="mt-3 text-sm text-rose-300" role="alert">{error}</p>}
    </article>
  );
}

export default function CollectionPage() {
  const user = useAuthUser();
  const isAuthenticated = Boolean(user);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [groupMode, setGroupMode] = useState<GroupMode>('series');

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let active = true;
    async function loadCollection() {
      try {
        const response = await fetch('/api/collection');
        const result = await response.json() as ApiResult;
        if (!response.ok) {
          throw new Error(result.error ?? 'Sbírku se nepodařilo načíst.');
        }

        if (active) {
          setItems(result.items ?? []);
          setWarning(result.warning ?? '');
          setError('');
          if (result.user) {
            saveAuthUser(result.user);
          }
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Sbírku se nepodařilo načíst.');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadCollection();
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const totals = useMemo(() => calculateTotals(items), [items]);
  const groups = useMemo(() => {
    const grouped = new Map<string, CollectionItem[]>();
    for (const item of items) {
      const key = groupMode === 'series' ? getProductSeries(item) : getValueGroup(item);
      const groupItems = grouped.get(key) ?? [];
      groupItems.push(item);
      grouped.set(key, groupItems);
    }

    const valueOrder = ['Hodnota od $100', 'Hodnota $25–99.99', 'Hodnota do $24.99', 'Cena není dostupná'];
    return [...grouped.entries()]
      .sort(([a], [b]) => groupMode === 'series'
        ? a.localeCompare(b, 'cs')
        : valueOrder.indexOf(a) - valueOrder.indexOf(b))
      .map(([name, groupItems]) => ({
        name,
        items: groupItems.sort((a, b) => (b.currentPrice ?? -1) - (a.currentPrice ?? -1)),
      }));
  }, [groupMode, items]);

  async function saveItem(item: CollectionItem, changes: Record<string, unknown>) {
    const response = await fetch('/api/collection', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, ...changes }),
    });
    const result = await response.json() as ApiResult;
    if (!response.ok) {
      throw new Error(result.error ?? 'Změny se nepodařilo uložit.');
    }
    setItems(result.items ?? []);
    if (result.user) {
      saveAuthUser(result.user);
    }
  }

  async function removeItem(item: CollectionItem) {
    const response = await fetch('/api/collection', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id }),
    });
    const result = await response.json() as ApiResult;
    if (!response.ok) {
      throw new Error(result.error ?? 'Položku se nepodařilo odebrat.');
    }
    setItems(result.items ?? []);
    if (result.user) {
      saveAuthUser(result.user);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-white">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-yellow-500">Osobní portfolio</p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">Moje sbírka</h1>
            <p className="mt-2 text-sm text-slate-400">Přehled vlastních karet a boxů, jejich hodnoty a vývoje cen.</p>
          </div>
          <Link href="/#search" className="inline-flex w-fit rounded-xl bg-yellow-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-yellow-400">
            + Přidat kartu nebo box
          </Link>
        </div>

        {!user && (
          <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-bold">Přihlas se ke své sbírce</h2>
            <p className="mt-2 text-sm text-slate-400">Sbírka je soukromá a dostupná po přihlášení.</p>
            <Link href="/login" className="mt-4 inline-block font-semibold text-yellow-400 hover:text-yellow-300">
              Přejít na přihlášení →
            </Link>
          </section>
        )}

        {user && (
          <>
            <section aria-label="Souhrn portfolia" className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-400">Odhadovaná hodnota</p>
                <p className="mt-2 text-2xl font-black text-white">{formatCurrency(totals.marketValue)}</p>
                <p className="mt-1 text-xs text-slate-500">Součet dostupných cen karet a boxů</p>
              </article>
              <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-400">Pořizovací náklady</p>
                <p className="mt-2 text-2xl font-black text-white">{formatCurrency(totals.investedValue)}</p>
                <p className="mt-1 text-xs text-slate-500">Součet zadaných nákupních cen</p>
              </article>
              <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-400">Změna hodnoty</p>
                <p className={`mt-2 text-2xl font-black ${totals.change >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {totals.hasComparableItems ? `${totals.change >= 0 ? '+' : ''}${formatCurrency(totals.change)}` : '—'}
                </p>
                <p className="mt-1 text-xs text-slate-500">Jen položky s oběma cenami</p>
              </article>
              <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-400">Vlastní položky</p>
                <p className="mt-2 text-2xl font-black text-white">{totals.cardsOwned} karet · {totals.boxesOwned} boxů</p>
                <p className="mt-1 text-xs text-slate-500">
                  Návratnost {totals.returnPercent === null ? '—' : `${totals.returnPercent >= 0 ? '+' : ''}${totals.returnPercent.toFixed(1)} %`}
                </p>
              </article>
            </section>

            {warning && <p className="mt-5 rounded-xl border border-amber-900/70 bg-amber-950/30 px-4 py-3 text-sm text-amber-200" role="status">{warning}</p>}
            {error && <p className="mt-5 rounded-xl border border-rose-900/70 bg-rose-950/30 px-4 py-3 text-sm text-rose-200" role="alert">{error}</p>}

            <section className="mt-8">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold">Položky sbírky</h2>
                  <p className="mt-1 text-sm text-slate-400">{items.length} záznamů · ceny karet se průběžně obnovují</p>
                </div>
                <label className="flex items-center gap-3 text-sm text-slate-300">
                  Zobrazit podle
                  <select
                    value={groupMode}
                    onChange={(event) => setGroupMode(event.target.value as GroupMode)}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:border-yellow-400 focus:outline-none"
                  >
                    <option value="series">Edice / série</option>
                    <option value="value">Tržní hodnoty</option>
                  </select>
                </label>
              </div>

              {isLoading ? (
                <p className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">Načítám sbírku a aktuální ceny…</p>
              ) : !items.length ? (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-10 text-center">
                  <h3 className="text-lg font-bold text-white">Tvoje sbírka je zatím prázdná</h3>
                  <p className="mt-2 text-sm text-slate-400">Najdi kartu nebo box v katalogu a přidej ho do svého portfolia.</p>
                  <Link href="/#search" className="mt-5 inline-block rounded-xl bg-yellow-500 px-4 py-2 font-bold text-slate-950 hover:bg-yellow-400">
                    Otevřít katalog
                  </Link>
                </div>
              ) : (
                <div className="space-y-8">
                  {groups.map((group) => (
                    <section key={group.name} aria-label={group.name}>
                      <h3 className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2 text-lg font-bold">
                        <span>{group.name}</span>
                        <span className="text-xs font-medium text-slate-500">{group.items.length} položek</span>
                      </h3>
                      <div className="grid gap-4 lg:grid-cols-2">
                        {group.items.map((item) => (
                          <CollectionItemCard
                            key={item.id}
                            item={item}
                            onSave={saveItem}
                            onDelete={removeItem}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
