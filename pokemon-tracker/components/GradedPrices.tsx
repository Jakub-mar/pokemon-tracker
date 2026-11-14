'use client';

import { useEffect, useMemo, useState } from 'react';

type GradedVariant = {
  id: string;
  type: 'raw' | 'graded';
  printing: string;
  grade: number | null;
  label: string;
  price: number | null;
};

type GradedPricesResponse = {
  variants: GradedVariant[];
};

type UngradedPrice = {
  printing: string;
  price: number;
};

const commonGrades = [7, 8, 9, 9.5, 10];

function normalizePrinting(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

function getErrorMessage(payload: unknown) {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const error = payload.error;
    if (typeof error === 'string') return error;
  }

  return 'Ceny hodnocení PSA se nepodařilo načíst.';
}

function PriceTile({
  title,
  variant,
  fallbackPrice,
  fallbackSource,
}: {
  title: string;
  variant?: GradedVariant;
  fallbackPrice?: number;
  fallbackSource?: string;
}) {
  const currentPrice = variant?.price ?? fallbackPrice ?? null;

  return (
    <article className="min-w-[150px] flex-1 rounded border border-slate-600 bg-slate-800 px-3 py-2">
      <h4 className="truncate text-sm font-bold text-slate-100" title={title}>{title}</h4>
      <p className={`mt-1 text-lg font-bold ${currentPrice !== null ? 'text-sky-400' : 'text-slate-500'}`}>
        {currentPrice !== null ? formatCurrency(currentPrice) : '—'}
      </p>
      <p className="mt-1 truncate text-[11px] text-slate-300">
        {variant?.price !== null && variant?.price !== undefined ? 'PriceCharting' : fallbackSource ?? 'PriceCharting'}
      </p>
    </article>
  );
}

export function GradedPrices({
  name,
  setName,
  number,
  ungradedPrices,
}: {
  name: string;
  setName: string;
  number: string;
  ungradedPrices: UngradedPrice[];
}) {
  const [variants, setVariants] = useState<GradedVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrinting, setSelectedPrinting] = useState<string | null>(null);
  const [showMoreGrades, setShowMoreGrades] = useState(false);

  const query = useMemo(() => new URLSearchParams({ name, set: setName, number }), [name, number, setName]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPrices() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/graded-prices?${query}`, { signal: controller.signal });
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error(getErrorMessage(payload));
        setVariants((payload as GradedPricesResponse).variants);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setError(requestError instanceof Error ? requestError.message : 'Ceny hodnocení PSA se nepodařilo načíst.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadPrices();
    return () => controller.abort();
  }, [query]);

  const printings = useMemo(() => {
    const values = [
      ...variants.map((variant) => variant.printing),
      ...ungradedPrices.map((price) => price.printing),
    ];
    return Array.from(new Set(values));
  }, [ungradedPrices, variants]);

  const activePrinting = printings.includes(selectedPrinting ?? '')
    ? selectedPrinting!
    : ungradedPrices.reduce<UngradedPrice | null>((best, item) => (
      !best || item.price > best.price ? item : best
    ), null)?.printing ?? printings[0] ?? 'Normal';

  const printingKey = normalizePrinting(activePrinting);
  const rawVariant = variants.find((variant) => (
    variant.type === 'raw' && normalizePrinting(variant.printing) === printingKey
  ));
  const fallbackRawPrice = ungradedPrices.find((item) => normalizePrinting(item.printing) === printingKey)?.price;
  const psaVariants = variants.filter((variant) => variant.type === 'graded');
  const additionalGrades = Array.from(new Set(
    psaVariants
      .map((variant) => variant.grade)
      .filter((grade): grade is number => grade !== null && !commonGrades.includes(grade)),
  )).sort((a, b) => a - b);
  const visibleGrades = showMoreGrades
    ? [...commonGrades, ...additionalGrades].sort((a, b) => a - b)
    : commonGrades;

  return (
    <section className="overflow-hidden rounded-md border border-slate-700 bg-slate-900" aria-label="Ceny podle PSA hodnocení">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 px-4 py-3">
        <div>
          <h2 className="font-semibold text-slate-100">Ceny podle PSA hodnocení</h2>
          <p className="mt-1 text-xs text-slate-400">Tržní ceny podle PriceCharting · USD</p>
        </div>
        {loading && <span className="text-xs text-slate-400" role="status">Načítám PSA ceny…</span>}
      </header>

      {printings.length > 1 && (
        <>
          <div className="flex flex-wrap gap-2 border-b border-slate-700 px-4 py-3">
            {printings.map((printing) => (
              <button
                key={printing}
                type="button"
                onClick={() => setSelectedPrinting(printing)}
                aria-pressed={activePrinting === printing}
                className={`rounded-full border px-3 py-1 text-xs ${
                  activePrinting === printing
                    ? 'border-sky-500 bg-sky-500/15 text-sky-200'
                    : 'border-slate-600 text-slate-400 hover:text-slate-100'
                }`}
              >
                {printing}
              </button>
            ))}
          </div>
          <p className="border-b border-slate-700 px-4 py-2 text-[11px] text-slate-400">
            Volba varianty mění neohodnocenou cenu; PSA ceny PriceCharting uvádí pro kartu jako celek.
          </p>
        </>
      )}

      <div className="flex items-stretch gap-2 overflow-x-auto bg-slate-950/50 p-3">
        <PriceTile
          title="Neohodnocená"
          variant={rawVariant}
          fallbackPrice={fallbackRawPrice}
          fallbackSource="TCGplayer"
        />
        {visibleGrades.flatMap((grade) => {
          const matchingVariants = psaVariants.filter((variant) => variant.grade === grade);
          if (matchingVariants.length) {
            return matchingVariants.map((variant) => (
              <PriceTile
                key={variant.id}
                title={variant.label}
                variant={variant}
              />
            ));
          }

          return (
            <PriceTile
              key={`missing-psa-${grade}`}
              title={`PSA ${grade}`}
            />
          );
        })}
        {additionalGrades.length > 0 && (
          <button
            type="button"
            onClick={() => setShowMoreGrades((visible) => !visible)}
            aria-label={showMoreGrades ? 'Skrýt další PSA hodnocení' : 'Zobrazit další PSA hodnocení'}
            aria-expanded={showMoreGrades}
            className="min-w-12 rounded border border-slate-600 bg-sky-700 px-3 text-xl font-bold text-white hover:bg-sky-600"
          >
            {showMoreGrades ? '−' : '+'}
          </button>
        )}
      </div>

      {error && (
        <p className="border-t border-slate-700 px-4 py-2 text-xs text-amber-300">
          PSA ceny nejsou dostupné: {error}
        </p>
      )}
      {!loading && !error && psaVariants.length === 0 && (
        <p className="border-t border-slate-700 px-4 py-2 text-xs text-slate-400">
          PriceCharting zatím nemá pro tuto kartu dostupné ceny PSA.
        </p>
      )}
    </section>
  );
}
