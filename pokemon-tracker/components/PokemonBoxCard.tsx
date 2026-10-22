import Image from 'next/image';
import type { PokemonBox } from '@/types/box';

type PokemonBoxCardProps = {
  box: PokemonBox;
};

export function PokemonBoxCard({ box }: PokemonBoxCardProps) {
  const image = box.images?.product ?? box.images?.logo;

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4 transition hover:border-yellow-500/60">
      {image && (
        <Image
          src={image}
          alt={
            box.images?.product
              ? `Obrázek produktu ${box.name}`
              : `Logo edice ${box.set?.name ?? box.name}`
          }
          width={600}
          height={400}
          unoptimized
          className="h-56 w-full rounded-xl bg-slate-950 object-contain p-2"
        />
      )}
      <span className="mt-4 block text-xs font-bold uppercase tracking-widest text-yellow-500">
        {box.series ?? 'Pokémon TCG'}
      </span>
      <h3 className="mt-1 text-lg font-bold">{box.name}</h3>
      {box.releaseDate && (
        <p className="mt-1 text-sm text-slate-400">Vydáno: {box.releaseDate}</p>
      )}
    </article>
  );
}
