export type PokemonCard = {
  id: string;
  name: string;
  number: string;
  set: { name: string; printedTotal?: number };
  images: { small: string; large: string };
  rarity?: string;
  tcgplayer?: {
    prices?: Partial<
      Record<
        'normal' | 'holofoil' | 'reverseHolofoil' | '1stEditionHolofoil' | 'unlimitedHolofoil',
        { low?: number; mid?: number; high?: number; market?: number; directLow?: number }
      >
    >;
  };
};
