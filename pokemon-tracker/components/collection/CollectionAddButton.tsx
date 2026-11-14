'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { saveAuthUser, useAuthUser } from '@/lib/auth-session';
import type { PokemonBox } from '@/types/box';
import type { PokemonCard } from '@/types/pokemon';
import type { AppUser } from '@/types/user';

type CollectionAddButtonProps =
  | { type: 'card'; card: PokemonCard }
  | { type: 'box'; box: PokemonBox };

const variantLabels: Record<string, string> = {
  normal: 'Normal',
  holofoil: 'Holo',
  reverseHolofoil: 'Reverse holo',
  '1stEditionHolofoil': 'Holo 1. edice',
  unlimitedHolofoil: 'Unlimited holo',
};

const conditionOptions = [
  { value: 'Mint', label: 'Mint' },
  { value: 'Near Mint', label: 'Near Mint' },
  { value: 'Excellent', label: 'Excellent' },
  { value: 'Good', label: 'Good' },
  { value: 'Played', label: 'Played' },
  { value: 'Poor', label: 'Poor' },
];

export function CollectionAddButton(props: CollectionAddButtonProps) {
  const user = useAuthUser();
  const [isOpen, setIsOpen] = useState(false);
  const [quantity, setQuantity] = useState('1');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [currentBoxPrice, setCurrentBoxPrice] = useState('');
  const [condition, setCondition] = useState('Near Mint');
  const cardVariants = props.type === 'card'
    ? Object.keys(props.card.tcgplayer?.prices ?? {}).filter((key) => key in variantLabels)
    : [];
  const [variant, setVariant] = useState(cardVariants[0] ?? 'normal');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const title = props.type === 'card' ? props.card.name : props.box.name;
  const image = props.type === 'card'
    ? props.card.images.small
    : props.box.images?.product ?? props.box.images?.logo;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const parsedQuantity = Number(quantity);
    const parsedPurchasePrice = purchasePrice.trim() ? Number(purchasePrice) : null;
    const parsedCurrentPrice = currentBoxPrice.trim() ? Number(currentBoxPrice) : null;
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1 || parsedQuantity > 9999) {
      setError('Počet kusů musí být celé číslo od 1 do 9 999.');
      return;
    }
    if (parsedPurchasePrice !== null && (!Number.isFinite(parsedPurchasePrice) || parsedPurchasePrice < 0)) {
      setError('Pořizovací cena musí být nezáporná částka.');
      return;
    }
    if (
      props.type === 'box' &&
      parsedCurrentPrice !== null &&
      (!Number.isFinite(parsedCurrentPrice) || parsedCurrentPrice < 0)
    ) {
      setError('Aktuální cena musí být nezáporná částka.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = props.type === 'card'
        ? {
            type: 'card',
            card: props.card,
            quantity: parsedQuantity,
            purchasePrice: parsedPurchasePrice,
            condition,
            variant,
          }
        : {
            type: 'box',
            box: props.box,
            quantity: parsedQuantity,
            purchasePrice: parsedPurchasePrice,
            currentPrice: parsedCurrentPrice,
          };
      const response = await fetch('/api/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as { error?: string; user?: AppUser };

      if (!response.ok) {
        throw new Error(result.error ?? 'Položku se nepodařilo přidat do sbírky.');
      }

      if (result.user) {
        saveAuthUser(result.user);
      }
      setIsOpen(false);
      setSuccess('Přidáno do sbírky.');
      setQuantity('1');
      setPurchasePrice('');
      setCurrentBoxPrice('');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Položku se nepodařilo přidat do sbírky.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError('');
          setIsOpen(true);
        }}
        className="mt-4 w-full rounded-xl border border-yellow-500/60 bg-yellow-500/10 px-4 py-2 text-sm font-bold text-yellow-300 transition hover:bg-yellow-500 hover:text-slate-950"
      >
        + Přidat do sbírky
      </button>
      {success && <p className="mt-2 text-center text-xs text-emerald-300" role="status">{success}</p>}

      {isOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="collection-add-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
          >
            <div className="flex items-start gap-4">
              {image && (
                <Image
                  src={image}
                  alt=""
                  width={72}
                  height={100}
                  unoptimized
                  className="h-24 w-16 rounded-lg bg-slate-950 object-contain"
                />
              )}
              <div className="min-w-0 flex-1">
                <h2 id="collection-add-title" className="text-xl font-bold text-white">Přidat do sbírky</h2>
                <p className="mt-1 truncate text-sm text-slate-400">{title}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Zavřít formulář"
                className="rounded-full px-3 py-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            {user ? (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <label className="block text-sm font-medium text-slate-300">
                  Počet kusů
                  <input
                    type="number"
                    min="1"
                    max="9999"
                    step="1"
                    required
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-yellow-400 focus:outline-none"
                  />
                </label>

                {props.type === 'card' ? (
                  <>
                    <label className="block text-sm font-medium text-slate-300">
                      Varianta
                      <select
                        value={variant}
                        onChange={(event) => setVariant(event.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-yellow-400 focus:outline-none"
                      >
                        {(cardVariants.length ? cardVariants : ['normal']).map((item) => (
                          <option key={item} value={item}>{variantLabels[item] ?? item}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm font-medium text-slate-300">
                      Stav karty
                      <select
                        value={condition}
                        onChange={(event) => setCondition(event.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-yellow-400 focus:outline-none"
                      >
                        {conditionOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <p className="text-xs text-slate-400">
                      Aktuální cena se načte z dostupných tržních údajů; pro kartu bez ceny zůstane prázdná.
                    </p>
                  </>
                ) : (
                  <label className="block text-sm font-medium text-slate-300">
                    Aktuální tržní cena za kus ($)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={currentBoxPrice}
                      onChange={(event) => setCurrentBoxPrice(event.target.value)}
                      placeholder="Neznámá"
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-yellow-400 focus:outline-none"
                    />
                    <span className="mt-1 block text-xs text-slate-500">Pro boxy katalog cenu neposkytuje.</span>
                  </label>
                )}

                <label className="block text-sm font-medium text-slate-300">
                  Pořizovací cena za kus ($)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={purchasePrice}
                    onChange={(event) => setPurchasePrice(event.target.value)}
                    placeholder="Nevyplněno"
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-yellow-400 focus:outline-none"
                  />
                </label>

                {error && <p className="text-sm text-rose-300" role="alert">{error}</p>}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800"
                  >
                    Zrušit
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-xl bg-yellow-500 px-5 py-2 text-sm font-bold text-slate-950 hover:bg-yellow-400 disabled:opacity-60"
                  >
                    {isSaving ? 'Ukládám…' : 'Uložit'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-sm text-slate-300">Pro správu své sbírky se nejprve přihlas.</p>
                <Link href="/login" className="mt-3 inline-block font-semibold text-yellow-400 hover:text-yellow-300">
                  Přejít na přihlášení →
                </Link>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
