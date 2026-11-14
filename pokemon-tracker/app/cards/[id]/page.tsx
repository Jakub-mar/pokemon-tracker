import Image from 'next/image';
import Link from 'next/link';
import { GradedPrices } from '@/components/GradedPrices';
import { PriceChart } from '@/components/PriceChart';
import { CollectionAddButton } from '@/components/collection/CollectionAddButton';
import type {
  PokemonCard as PokemonCardData,
  PokemonCardAttack,
  PokemonCardModifier,
} from '@/types/pokemon';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

type TcgDexCardDetails = {
  category?: string;
  rarity?: string;
  stage?: string;
  hp?: number;
  types?: string[];
  attacks?: Array<{
    name: string;
    cost?: string[];
    damage?: string | number;
    effect?: string;
  }>;
  weaknesses?: PokemonCardModifier[];
  resistances?: PokemonCardModifier[];
  retreat?: number;
};

const variantLabels: Record<string, string> = {
  normal: 'Normal',
  holofoil: 'Holo',
  reverseHolofoil: 'Reverse holo',
  '1stEditionHolofoil': '1. edice holo',
  unlimitedHolofoil: 'Unlimited holo',
};

const pricePrintings: Record<string, string> = {
  normal: 'Normal',
  holofoil: 'Holofoil',
  reverseHolofoil: 'Reverse Holofoil',
  '1stEditionHolofoil': '1st Edition Holofoil',
  unlimitedHolofoil: 'Unlimited Holofoil',
};

const attackCostSymbols: Record<string, string> = {
  Colorless: 'C',
  Darkness: 'D',
  Dragon: 'N',
  Fairy: 'Y',
  Fighting: 'F',
  Fire: 'R',
  Grass: 'G',
  Lightning: 'L',
  Metal: 'M',
  Psychic: 'P',
  Water: 'W',
};

function formatCurrency(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—';
  }

  return `$${value.toFixed(2)}`;
}

function formatAttackCost(cost: string[] = []) {
  const colorlessCount = cost.filter((energy) => energy === 'Colorless').length;
  const typedEnergy = cost
    .filter((energy) => energy !== 'Colorless')
    .map((energy) => attackCostSymbols[energy] ?? energy);
  return `${colorlessCount || ''}${typedEnergy.join('')}` || '—';
}

function formatModifiers(modifiers: PokemonCardModifier[] = []) {
  return modifiers.length
    ? modifiers.map(({ type, value }) => `${type}${value ? ` ${value}` : ''}`).join(', ')
    : '—';
}

export default async function CardDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const rawCard = resolvedSearchParams.card;
  const cardParam = Array.isArray(rawCard) ? rawCard[0] : rawCard;

  let card: PokemonCardData | null = null;

  if (cardParam) {
    try {
      card = JSON.parse(decodeURIComponent(cardParam)) as PokemonCardData;
    } catch {
      card = null;
    }
  }

  if (!card || card.id !== id) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-yellow-500">Karta</p>
          <h1 className="mt-4 text-3xl font-black">Detail karty nebyl nalezen</h1>
          <p className="mt-3 text-slate-400">Vyhledaná karta neexistuje nebo nebyla správně předána.</p>
          <Link href="/" className="mt-6 inline-block rounded-full bg-yellow-500 px-5 py-2 font-semibold text-slate-950 transition hover:bg-yellow-400">
            Zpět na vyhledávání
          </Link>
        </div>
      </main>
    );
  }

  let detailsLoadError = false;
  if (card.dataSource === 'tcgdex') {
    try {
      const response = await fetch(`https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(card.id)}`, {
        next: { revalidate: 3600 },
      });

      if (!response.ok) {
        detailsLoadError = true;
      } else {
        const details: TcgDexCardDetails = await response.json();
        card = {
          ...card,
          rarity: details.rarity ?? card.rarity,
          supertype: details.category === 'Pokemon' ? 'Pokémon' : details.category,
          stage: details.stage,
          hp: details.hp,
          types: details.types,
          attacks: details.attacks?.map((attack): PokemonCardAttack => ({
            name: attack.name,
            cost: attack.cost,
            damage: attack.damage,
            text: attack.effect,
          })),
          weaknesses: details.weaknesses,
          resistances: details.resistances,
          convertedRetreatCost: details.retreat,
        };
      }
    } catch (error) {
      console.error(`TCGdex card details request failed for ${card.id}:`, error);
      detailsLoadError = true;
    }
  }

  const displayedNumber = card.number.includes('/')
    ? card.number
    : card.set.printedTotal
      ? `${card.number}/${card.set.printedTotal}`
      : card.number;
  const stage = card.stage
    ?? card.subtypes?.find((subtype) => /^(basic|stage \d+|restored)$/i.test(subtype))
    ?? '—';
  const cardType = card.types?.join(', ') || card.supertype || '—';
  const retreatCost = card.retreatCost?.length ?? card.convertedRetreatCost ?? '—';

  const variantPrices = Object.entries(card.tcgplayer?.prices ?? {})
    .map(([variant, prices]) => ({
      variant: variantLabels[variant] ?? variant,
      value: prices?.market,
    }))
    .filter((item): item is { variant: string; value: number } =>
      typeof item.value === 'number' && Number.isFinite(item.value),
    )
    .sort((a, b) => b.value - a.value);

  const currentPrice = variantPrices[0]?.value;
  const ungradedPrices = Object.entries(card.tcgplayer?.prices ?? [])
    .flatMap(([variant, prices]) => (
      typeof prices?.market === 'number' && Number.isFinite(prices.market) && pricePrintings[variant]
        ? [{ printing: pricePrintings[variant], price: prices.market }]
        : []
    ));

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-4">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {card.name} #{card.number} — {card.set.name}
          </h1>
          <p className="mt-1 text-sm text-slate-400">{card.set.name}{card.rarity ? ` · ${card.rarity}` : ''}</p>
        </header>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-sky-800 bg-sky-950/60 px-4 py-3 text-sm text-sky-100">
          <p><span className="mr-2 font-bold">ⓘ</span>Ceny jsou uvedeny v USD. Dostupnost nabídek se může lišit.</p>
          <span className="rounded border border-sky-700 px-3 py-1 text-xs font-semibold">Informace o cenách</span>
        </div>

        <section className="grid items-start gap-5 lg:grid-cols-[minmax(220px,310px)_minmax(260px,1fr)_minmax(210px,270px)]">
          <div className="flex min-h-[300px] items-center justify-center rounded-md border border-slate-800 bg-slate-900 p-5">
            <Image
              src={card.images.large || card.images.small}
              alt={`${card.name} karta`}
              width={600}
              height={840}
              unoptimized
              className="max-h-[390px] w-auto max-w-full rounded-sm object-contain"
            />
          </div>

          <section aria-labelledby="product-details-title" className="text-sm leading-6 text-slate-300">
            <h2 id="product-details-title" className="mb-1 font-bold text-slate-100">Detaily produktu</h2>
            <p>
              <strong className="text-slate-100">Číslo karty / Vzácnost:</strong>{' '}
              {displayedNumber} / {card.rarity ?? '—'}
            </p>
            <p>
              <strong className="text-slate-100">Typ / HP / Fáze:</strong>{' '}
              {cardType} / {card.hp ?? '—'} / {stage}
            </p>
            <div className="mt-1">
              <strong className="text-slate-100">Útoky:</strong>
              {card.attacks?.length ? (
                <ul className="space-y-2">
                  {card.attacks.map((attack, index) => (
                    <li key={`${attack.name}-${index}`}>
                      <p>
                        <strong className="text-slate-100">Útok {index + 1}:</strong>{' '}
                        <span className="text-slate-400">[{formatAttackCost(attack.cost)}]</span>{' '}
                        {attack.name}
                        {attack.damage != null && attack.damage !== '' ? ` (${attack.damage})` : ''}
                      </p>
                      {attack.text && <p className="text-slate-400">{attack.text}</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-400">—</p>
              )}
            </div>
            <p>
              <strong className="text-slate-100">Slabost / Odolnost / Ústup:</strong>{' '}
              {formatModifiers(card.weaknesses)} / {formatModifiers(card.resistances)} / {retreatCost}
            </p>
            {detailsLoadError && (
              <p className="mt-2 text-xs text-amber-300">
                Některé údaje se nepodařilo načíst ze záložní databáze karet.
              </p>
            )}
          </section>

          <aside className="rounded-md border border-slate-800 bg-slate-900 p-5 text-center">
            <p className="text-sm font-semibold text-slate-200">
              {variantPrices.length ? 'Cenové údaje jsou k dispozici.' : 'K této kartě nejsou aktuální nabídky.'}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              {variantPrices.length ? 'Tržní cena podle dostupných dat.' : 'Zkus později nebo prohlédni další karty.'}
            </p>
            <Link href="/" className="mt-4 inline-flex rounded-md bg-yellow-500 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-yellow-400">
              Procházet Pokémon karty
            </Link>
            <CollectionAddButton type="card" card={card} />
          </aside>
        </section>

        <div className="mt-5">
          <GradedPrices
            name={card.name}
            setName={card.set.name}
            number={card.number}
            ungradedPrices={ungradedPrices}
          />
        </div>

        <section className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,1fr)]">
          <div>
            <h2 className="mb-2 text-base font-bold text-slate-100">Historický vývoj ceny</h2>
            <p className="mb-2 text-xs text-slate-400">
              Skutečná historická data pro období 1M, 3M, 6M a 1Y. Graf neobsahuje odhadované ani dopočítané ceny.
            </p>
            <PriceChart
              name={card.name}
              setName={card.set.name}
              number={card.number}
              productUrl={card.tcgplayer?.url}
            />
          </div>

          <div className="space-y-5">
            <section>
              <h2 className="text-base font-bold text-slate-100">Srovnání cen podle varianty</h2>
              <p className="mb-2 text-xs text-slate-400">Dostupné ceny karet v jednotlivých variantách</p>
              <div className="divide-y divide-slate-800 rounded-md border border-slate-800 bg-slate-900 text-sm">
                {variantPrices.length ? variantPrices.map((price) => (
                  <div key={price.variant} className="flex justify-between gap-4 px-3 py-2">
                    <span className="font-medium text-slate-300">{price.variant}</span>
                    <span className="font-semibold text-slate-100">{formatCurrency(price.value)}</span>
                  </div>
                )) : (
                  <div className="flex justify-between gap-4 px-3 py-3 text-slate-400">
                    <span>Tržní cena</span>
                    <span>N/A</span>
                  </div>
                )}
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between gap-3">
                <h2 className="text-base font-bold text-slate-100">Cenové body</h2>
                <span className="text-xs text-yellow-400">{variantPrices[0]?.variant ?? 'Bez varianty'}</span>
              </div>
              <div className="overflow-hidden rounded-md border border-slate-800 bg-slate-900">
                <div className="flex items-start justify-between gap-4 p-3">
                  <div>
                    <p className="font-semibold text-slate-100">Tržní cena</p>
                    <p className="text-xs text-slate-400">Poslední dostupná hodnota</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-100">{variantPrices.length ? formatCurrency(currentPrice) : 'N/A'}</p>
                    <p className="text-xs text-slate-400">Zdroj: ceny variant</p>
                  </div>
                </div>
                <div className="border-t border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-400">
                  {variantPrices.length ? `Dostupné varianty: ${variantPrices.map((price) => price.variant).join(', ')}` : 'Pro tuto kartu zatím nejsou cenová data.'}
                </div>
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-100">Roční přehled</h2>
                <span className="text-xs text-slate-400">Aktuální tržní ceny</span>
              </div>
              <div className="grid grid-cols-2 gap-3 rounded-md border border-slate-800 bg-slate-900 p-3 text-sm">
                <div>
                  <p className="text-xs text-slate-400">Nejnižší cena varianty</p>
                  <p className="mt-1 font-semibold text-slate-100">
                    {variantPrices.length ? formatCurrency(Math.min(...variantPrices.map((price) => price.value))) : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Nejvyšší cena varianty</p>
                  <p className="mt-1 font-semibold text-slate-100">
                    {variantPrices.length ? formatCurrency(Math.max(...variantPrices.map((price) => price.value))) : 'N/A'}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </section>

        <div className="mt-8 border-t border-slate-800 pt-4">
          <Link href="/" className="text-sm font-medium text-yellow-400 hover:text-yellow-300">← Zpět na výsledky hledání</Link>
        </div>
      </div>
    </main>
  );
}
