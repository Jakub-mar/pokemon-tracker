import type { PokemonBox } from '@/types/box';
import type { PokemonCard } from '@/types/pokemon';

export type CardCondition = 'Mint' | 'Near Mint' | 'Excellent' | 'Good' | 'Played' | 'Poor';

export type CollectionProduct =
  | {
      type: 'card';
      card: PokemonCard;
      variant: string;
      condition: CardCondition;
    }
  | {
      type: 'box';
      box: PokemonBox;
    };

export type CollectionItem = {
  id: string;
  product: CollectionProduct;
  quantity: number;
  purchasePrice: number | null;
  currentPrice: number | null;
  addedAt: string;
  priceUpdatedAt: string | null;
};
