import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { toAppUser } from '@/lib/user-presenter';
import { updateUserDisplayName } from '@/lib/user-store';

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: 'Přihlášení vypršelo. Přihlas se prosím znovu.' }, { status: 401 });
  }

  return NextResponse.json({ user: toAppUser(user) });
}

export async function PATCH(request: Request) {
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

  const displayName =
    body && typeof body === 'object' && 'displayName' in body && typeof body.displayName === 'string'
      ? body.displayName.trim()
      : '';
  if (!displayName || displayName.length > 60) {
    return NextResponse.json(
      { error: 'Zobrazované jméno musí mít 1 až 60 znaků.' },
      { status: 400 },
    );
  }

  try {
    const updatedUser = await updateUserDisplayName(user.id, displayName);
    return NextResponse.json({ user: toAppUser(updatedUser) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Profil se nepodařilo uložit.' },
      { status: 500 },
    );
  }
}
