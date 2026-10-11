import type { AppUser } from '@/types/user';

export const demoUser: AppUser = {
  id: 'user-1',
  username: 'jankopr',
  email: 'jan@poketracker.cz',
  displayName: 'Jan Kovář',
  role: 'user',
  plan: 'Premium',
  portfolioValue: 28400,
  cardsOwned: 128,
  isVerified: true,
};

export async function signIn(email: string, password: string) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Přihlášení se nepodařilo.');
  }

  return {
    ...demoUser,
    ...data.user,
    role: data.user.role ?? 'user',
    plan: data.user.role === 'admin' ? 'Premium' : 'Free',
    portfolioValue: data.user.role === 'admin' ? 28400 : 0,
    cardsOwned: data.user.role === 'admin' ? 128 : 0,
    isVerified: data.user.role === 'admin',
  } as AppUser;
}

export async function signUp(username: string, email: string, password: string) {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Registrace se nepodařila.');
  }

  return {
    ...demoUser,
    ...data.user,
    role: data.user.role ?? 'user',
    plan: 'Free',
    portfolioValue: 0,
    cardsOwned: 0,
    isVerified: false,
  } as AppUser;
}
