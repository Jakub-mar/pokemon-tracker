export type TcgPlayerPriceMap = Partial<
  Record<
    'normal' | 'holofoil' | 'reverseHolofoil' | '1stEditionHolofoil' | 'unlimitedHolofoil',
    {
      low?: number | null;
      mid?: number | null;
      high?: number | null;
      market?: number | null;
      directLow?: number | null;
    }
  >
>;

export type PokemonCardAttack = {
  name: string;
  cost?: string[];
  damage?: string | number;
  text?: string;
};

export type PokemonCardModifier = {
  type: string;
  value?: string;
};

export type PokemonCard = {
  id: string;
  name: string;
  number: string;
  set: { id?: string; name: string; series?: string; printedTotal?: number };
  images: { small: string; large: string };
  rarity?: string;
  supertype?: string;
  subtypes?: string[];
  stage?: string;
  hp?: string | number;
  types?: string[];
  attacks?: PokemonCardAttack[];
  weaknesses?: PokemonCardModifier[];
  resistances?: PokemonCardModifier[];
  retreatCost?: string[];
  convertedRetreatCost?: number;
  dataSource?: 'tcgdex';
  tcgplayer?: {
    url?: string;
    updatedAt?: string;
    prices?: TcgPlayerPriceMap;
  };
};
