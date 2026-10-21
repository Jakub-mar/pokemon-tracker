export type PokemonSet = {
  id: string;
  name: string;
  type: 'set';
  series?: string;
  releaseDate?: string;
  printedTotal?: number;
  images?: {
    logo?: string;
    symbol?: string;
  };
};

export type PokemonBox = {
  id: string;
  name: string;
  type: 'box' | 'booster-box';
  set?: { name: string };
  series?: string;
  releaseDate?: string;
  printedTotal?: number;
  images?: {
    logo?: string;
    symbol?: string;
  };
};
