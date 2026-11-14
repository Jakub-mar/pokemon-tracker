'use client';

import { useEffect, useState } from 'react';
import type { PointerEvent } from 'react';

type TimeRange = '1M' | '3M' | '6M' | '1Y';

type PricePoint = {
  timestamp: number;
  price: number;
};

type PriceHistoryVariant = {
  id: string;
  condition: string;
  printing: string;
  currentPrice: number | null;
  lastUpdated: number | null;
  points: PricePoint[];
};

type PriceHistoryResponse = {
  variants: PriceHistoryVariant[];
};

const ranges: TimeRange[] = ['1M', '3M', '6M', '1Y'];

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

function formatDate(timestamp: number, includeYear = false) {
  return new Date(timestamp).toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'short',
    ...(includeYear ? { year: 'numeric' } : {}),
  });
}

function getErrorMessage(payload: unknown) {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const error = payload.error;
    if (typeof error === 'string') return error;
  }

  return 'Historická data se nepodařilo načíst.';
}

export function PriceChart({
  name,
  setName,
  number,
  productUrl,
}: {
  name: string;
  setName: string;
  number: string;
  productUrl?: string;
}) {
  const [range, setRange] = useState<TimeRange>('1Y');
  const [history, setHistory] = useState<PriceHistoryResponse | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ name, set: setName, number, range });

    async function loadHistory() {
      setLoading(true);
      setError(null);
      setHistory(null);

      try {
        const response = await fetch(`/api/price-history?${query}`, {
          signal: controller.signal,
        });
        const payload: unknown = await response.json();

        if (!response.ok) {
          throw new Error(getErrorMessage(payload));
        }

        const result = payload as PriceHistoryResponse;
        setHistory(result);
        setSelectedVariantId((current) => (
          result.variants.some((variant) => variant.id === current)
            ? current
            : result.variants.find((variant) => variant.printing.toLowerCase().includes('holofoil'))?.id
              ?? result.variants[0]?.id
              ?? null
        ));
        setActivePointIndex(null);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setError(requestError instanceof Error ? requestError.message : 'Historická data se nepodařilo načíst.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadHistory();
    return () => controller.abort();
  }, [name, number, range, setName]);

  const selectedVariant = history?.variants.find((variant) => variant.id === selectedVariantId)
    ?? history?.variants[0];
  const points = selectedVariant?.points ?? [];
  const selectedPoint = points.length
    ? points[activePointIndex ?? points.length - 1]
    : null;

  const width = 720;
  const height = 320;
  const margin = { top: 24, right: 24, bottom: 46, left: 70 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const minimum = points.length ? Math.min(...points.map((point) => point.price)) : 0;
  const maximum = points.length ? Math.max(...points.map((point) => point.price)) : 1;
  const padding = maximum === minimum ? Math.max(maximum * 0.1, 0.1) : (maximum - minimum) * 0.12;
  const axisMinimum = Math.max(0, minimum - padding);
  const axisMaximum = maximum + padding || 1;
  const firstTimestamp = points[0]?.timestamp ?? 0;
  const lastTimestamp = points[points.length - 1]?.timestamp ?? firstTimestamp;
  const timestampRange = lastTimestamp - firstTimestamp;
  const layoutPoints = points.map((point, index) => {
    const x = margin.left + (timestampRange > 0
      ? ((point.timestamp - firstTimestamp) / timestampRange) * chartWidth
      : chartWidth / 2);
    const y = margin.top + (1 - (point.price - axisMinimum) / (axisMaximum - axisMinimum)) * chartHeight;
    return { ...point, x, y, index };
  });
  const linePath = layoutPoints.map((point, index) => (
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  )).join(' ');
  const areaPath = layoutPoints.length
    ? `${linePath} L ${layoutPoints[layoutPoints.length - 1].x} ${margin.top + chartHeight} L ${layoutPoints[0].x} ${margin.top + chartHeight} Z`
    : '';
  const activeLayoutPoint = selectedPoint
    ? layoutPoints[activePointIndex ?? layoutPoints.length - 1]
    : null;

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (!layoutPoints.length) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width) return;
    const pointerX = ((event.clientX - bounds.left) / bounds.width) * width;
    const nearestPoint = layoutPoints.reduce((nearest, point) => (
      Math.abs(point.x - pointerX) < Math.abs(nearest.x - pointerX) ? point : nearest
    ));
    setActivePointIndex(nearestPoint.index);
  }

  return (
    <section className="overflow-hidden rounded-md border border-slate-800 bg-slate-900 shadow-sm" aria-label="Historický vývoj ceny karty">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <div>
          <h3 className="font-semibold text-slate-100">Historický vývoj ceny</h3>
          <p className="mt-1 text-xs text-slate-400">Near Mint · USD</p>
        </div>
        <div className="flex rounded-md border border-slate-700 bg-slate-950 p-1" aria-label="Období grafu">
          {ranges.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setRange(item)}
              aria-pressed={range === item}
              className={`rounded px-2.5 py-1 text-xs font-semibold transition ${
                range === item ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </header>

      {history && history.variants.length > 1 && (
        <div className="flex flex-wrap gap-2 border-b border-slate-800 px-4 py-3">
          {history.variants.map((variant) => {
            const label = `${variant.condition} ${variant.printing}`;
            const active = selectedVariant?.id === variant.id;
            return (
              <button
                key={variant.id}
                type="button"
                onClick={() => {
                  setSelectedVariantId(variant.id);
                  setActivePointIndex(null);
                }}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  active
                    ? 'border-sky-500 bg-sky-500/15 text-sky-200'
                    : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="flex h-[280px] items-center justify-center text-sm text-slate-400" role="status">
          Načítám skutečnou historii cen…
        </div>
      ) : error ? (
        <div className="flex min-h-[220px] items-center justify-center px-6 text-center">
          <div>
            <p className="font-semibold text-slate-100">Historická data nejsou dostupná</p>
            <p className="mt-2 text-sm text-slate-400">{error}</p>
          </div>
        </div>
      ) : points.length === 0 ? (
        <div className="flex min-h-[220px] items-center justify-center px-6 text-center">
          <div>
            <p className="font-semibold text-slate-100">Pro tuto variantu zatím nejsou historické cenové body.</p>
            <p className="mt-2 text-sm text-slate-400">Graf zobrazuje pouze ceny zaznamenané JustTCG, žádné hodnoty nedopočítává.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="px-2 pt-3">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="h-[280px] w-full touch-none"
              role="img"
              aria-label={`Historický graf ceny varianty ${selectedVariant?.printing ?? ''}`}
              onPointerMove={handlePointerMove}
              onPointerLeave={() => setActivePointIndex(null)}
            >
              <defs>
                <linearGradient id="price-area-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {[0, 1, 2, 3, 4].map((step) => {
                const fraction = step / 4;
                const y = margin.top + (1 - fraction) * chartHeight;
                const value = axisMinimum + (axisMaximum - axisMinimum) * fraction;

                return (
                  <g key={step}>
                    <line x1={margin.left} x2={width - margin.right} y1={y} y2={y} stroke="#334155" strokeDasharray="3 5" />
                    <text x={margin.left - 10} y={y + 4} textAnchor="end" fill="#94a3b8" fontSize="11">
                      {formatCurrency(value)}
                    </text>
                  </g>
                );
              })}

              {areaPath && <path d={areaPath} fill="url(#price-area-fill)" />}
              {linePath && (
                <path d={linePath} fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
              )}
              {activeLayoutPoint && (
                <g>
                  <line
                    x1={activeLayoutPoint.x}
                    x2={activeLayoutPoint.x}
                    y1={margin.top}
                    y2={margin.top + chartHeight}
                    stroke="#7dd3fc"
                    strokeDasharray="4 4"
                    opacity="0.75"
                  />
                  <circle cx={activeLayoutPoint.x} cy={activeLayoutPoint.y} r="5" fill="#0f172a" stroke="#7dd3fc" strokeWidth="3" />
                </g>
              )}

              <text x={margin.left} y={height - 13} textAnchor="start" fill="#94a3b8" fontSize="11">
                {formatDate(firstTimestamp)}
              </text>
              <text x={width - margin.right} y={height - 13} textAnchor="end" fill="#94a3b8" fontSize="11">
                {formatDate(lastTimestamp, true)}
              </text>
            </svg>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 bg-slate-950/60 px-4 py-3">
            <div>
              <p className="text-xs text-slate-400">{selectedVariant?.condition} {selectedVariant?.printing}</p>
              <p className="mt-1 font-semibold text-slate-100">
                {selectedPoint ? formatCurrency(selectedPoint.price) : '—'}
              </p>
            </div>
            {selectedPoint && (
              <p className="text-sm text-slate-300">{formatDate(selectedPoint.timestamp, true)}</p>
            )}
          </div>
        </>
      )}

      <footer className="border-t border-slate-800 px-4 py-2 text-xs text-slate-500">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>Historická data: JustTCG; odpověď se ukládá do cache na 24 hodin. API neposkytuje počty prodaných kusů, proto graf zobrazuje pouze skutečné cenové body.</span>
          {productUrl && (
            <a href={productUrl} target="_blank" rel="noreferrer" className="font-semibold text-sky-300 hover:text-sky-200">
              Otevřít na TCGplayeru ↗
            </a>
          )}
        </div>
      </footer>
    </section>
  );
}
