import { NextResponse } from 'next/server';
import { createAuthSession } from '@/lib/auth-session-store';
import { setAuthCookie } from '@/lib/auth-server';
import { verifyUserLogin } from '@/lib/user-store';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Požadavek není platný.' }, { status: 400 });
  }

  const email =
    body && typeof body === 'object' && 'email' in body && typeof body.email === 'string'
      ? body.email.trim()
      : '';
  const password =
    body && typeof body === 'object' && 'password' in body && typeof body.password === 'string'
      ? body.password
      : '';

  if (!email || !password) {
    return NextResponse.json({ error: 'E-mail a heslo jsou povinné.' }, { status: 400 });
  }

  let user;
  try {
    user = await verifyUserLogin(email, password);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Přihlášení se nepodařilo.';
    const status =
      message === 'Uživatel neexistuje.' ||
      message === 'Nesprávné heslo.' ||
      message === 'Tento účet používá přihlášení přes Google.'
        ? 401
        : 500;
    return NextResponse.json(
      { error: message },
      { status },
    );
  }

  const session = await createAuthSession(user.id);
  const response = NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    },
  });
  setAuthCookie(response, session.token);
  return response;
}
