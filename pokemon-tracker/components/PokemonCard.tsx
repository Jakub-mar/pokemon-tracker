import type { PokemonCard as PokemonCardData } from '@/types/pokemon';

type PokemonCardProps = {
  card: PokemonCardData;
};

export function PokemonCard({ card }: PokemonCardProps) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4 transition hover:border-yellow-500/60">
      <img src={card.images.small} alt={`${card.name} karta`} className="w-full rounded-xl" />
      <span className="mt-4 block text-xs font-bold uppercase tracking-widest text-yellow-500">
        {card.set.name}
      </span>
      <h3 className="mt-1 text-lg font-bold">
        {card.name} <span className="text-slate-500">#{card.number}</span>
      </h3>
    </article>
  );
}
