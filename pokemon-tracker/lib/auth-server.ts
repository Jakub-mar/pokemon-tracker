import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { AUTH_SESSION_MAX_AGE_SECONDS, findAuthSession } from '@/lib/auth-session-store';
import { findUserById, type StoredUser } from '@/lib/user-store';

export const AUTH_COOKIE_NAME = 'pokemon-tracker-session';

async function getUserForToken(token: string | undefined): Promise<StoredUser | null> {
  if (!token) {
    return null;
  }

  const session = await findAuthSession(token);
  if (!session) {
    return null;
  }

  const user = await findUserById(session.userId);
  return user && !user.isBlocked ? user : null;
}

export function getAuthTokenFromRequest(request: Request) {
  const cookieHeader = request.headers.get('cookie') ?? '';
  return cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${AUTH_COOKIE_NAME}=`))
    ?.slice(AUTH_COOKIE_NAME.length + 1);
}

export async function getAuthenticatedUser(request: Request) {
  return getUserForToken(getAuthTokenFromRequest(request));
}

export async function getCurrentAuthenticatedUser() {
  const cookieStore = await cookies();
  return getUserForToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);
}

export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: AUTH_SESSION_MAX_AGE_SECONDS,
  });
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}
