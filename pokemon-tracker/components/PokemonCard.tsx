import type { PokemonCard as PokemonCardData } from '@/types/pokemon';

type PokemonCardProps = {
  card: PokemonCardData;
};

export function PokemonCard({ card }: PokemonCardProps) {
  const variantLabels: Record<string, string> = {
    normal: 'Normal',
    holofoil: 'Holo',
    reverseHolofoil: 'Reverse holo',
    '1stEditionHolofoil': '1. edice holo',
    unlimitedHolofoil: 'Unlimited holo',
  };
  const variants = Object.keys(card.tcgplayer?.prices ?? {})
    .map((variant) => variantLabels[variant])
    .filter((variant): variant is string => Boolean(variant));

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4 transition hover:border-yellow-500/60">
      <img src={card.images.small} alt={`${card.name} karta`} className="w-full rounded-xl" />
      <span className="mt-4 block text-xs font-bold uppercase tracking-widest text-yellow-500">
        {card.set.name}
      </span>
      <h3 className="mt-1 text-lg font-bold">
        {card.name} <span className="text-slate-500">#{card.number}</span>
      </h3>
      {card.rarity && <p className="mt-1 text-sm text-slate-400">{card.rarity}</p>}
      {variants.length > 0 && (
        <p className="mt-2 text-xs text-slate-300">Varianty: {variants.join(', ')}</p>
      )}
    </article>
  );
}
