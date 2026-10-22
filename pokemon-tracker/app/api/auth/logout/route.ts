import { NextResponse } from 'next/server';
import { clearAuthCookie, getAuthTokenFromRequest } from '@/lib/auth-server';
import { deleteAuthSession } from '@/lib/auth-session-store';

export async function POST(request: Request) {
  const token = getAuthTokenFromRequest(request);
  if (token) {
    await deleteAuthSession(token);
  }

  const response = NextResponse.json({ message: 'Byl jsi odhlášen.' });
  clearAuthCookie(response);
  return response;
}
