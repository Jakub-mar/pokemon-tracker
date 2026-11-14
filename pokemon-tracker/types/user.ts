export type AppUser = {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
  portfolioValue: number;
  cardsOwned: number;
  isVerified: boolean;
};
