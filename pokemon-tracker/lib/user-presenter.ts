import type { AppUser } from '@/types/user';
import type { StoredUser } from '@/lib/user-store';

export function toAppUser(user: StoredUser): AppUser {
  const isAdmin = user.role === 'admin';

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    plan: isAdmin ? 'Premium' : 'Free',
    portfolioValue: isAdmin ? 28400 : 0,
    cardsOwned: isAdmin ? 128 : 0,
    isVerified: isAdmin,
  };
}
