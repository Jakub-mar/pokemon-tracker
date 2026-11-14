import type { AppUser } from '@/types/user';
import type { StoredUser } from '@/lib/user-store';

export function toAppUser(user: StoredUser): AppUser {
  const isAdmin = user.role === 'admin';
  const collection = user.collection ?? [];

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    portfolioValue: collection.reduce(
      (total, item) => total + (item.currentPrice ?? 0) * item.quantity,
      0,
    ),
    cardsOwned: collection.reduce(
      (total, item) => total + (item.product.type === 'card' ? item.quantity : 0),
      0,
    ),
    isVerified: isAdmin,
  };
}
