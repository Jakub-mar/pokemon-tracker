export type AppUser = {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
  plan: 'Free' | 'Premium';
  portfolioValue: number;
  cardsOwned: number;
  isVerified: boolean;
};
