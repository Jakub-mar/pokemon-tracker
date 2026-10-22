import { NextResponse } from 'next/server';
import { getAuthenticatedUser, getAuthTokenFromRequest } from '@/lib/auth-server';
import { deleteOtherAuthSessions } from '@/lib/auth-session-store';
import { updateUserPassword } from '@/lib/user-store';

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: 'Přihlášení vypršelo. Přihlas se prosím znovu.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Požadavek není platný.' }, { status: 400 });
  }

  const currentPassword =
    body && typeof body === 'object' && 'currentPassword' in body && typeof body.currentPassword === 'string'
      ? body.currentPassword
      : '';
  const newPassword =
    body && typeof body === 'object' && 'newPassword' in body && typeof body.newPassword === 'string'
      ? body.newPassword
      : '';

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Vyplň současné i nové heslo.' }, { status: 400 });
  }

  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'Nové heslo musí mít alespoň 6 znaků.' }, { status: 400 });
  }

  try {
    await updateUserPassword(user.id, currentPassword, newPassword);
    const currentToken = getAuthTokenFromRequest(request);
    if (currentToken) {
      await deleteOtherAuthSessions(user.id, currentToken);
    }

    return NextResponse.json({ message: 'Heslo bylo změněno.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Heslo se nepodařilo změnit.';
    const status = message === 'Současné heslo není správné.' ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
