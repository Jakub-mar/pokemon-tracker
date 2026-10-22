import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { deleteAuthSessionsForUser } from '@/lib/auth-session-store';
import { deleteManagedUser, readUsers, updateManagedUser } from '@/lib/user-store';

export async function GET(request: Request) {
  try {
    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Přihlášení vypršelo. Přihlas se prosím znovu.' }, { status: 401 });
    }
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'K této části nemáš přístup.' }, { status: 403 });
    }

    const users = await readUsers();

    return NextResponse.json({
      users: users.map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        isBlocked: user.isBlocked ?? false,
        createdAt: user.createdAt,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Nepodařilo se načíst seznam uživatelů.' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const currentUser = await getAuthenticatedUser(request);
  if (!currentUser) {
    return NextResponse.json({ error: 'Přihlášení vypršelo. Přihlas se prosím znovu.' }, { status: 401 });
  }
  if (currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'K této části nemáš přístup.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Požadavek není platný.' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Požadavek není platný.' }, { status: 400 });
  }

  const id = 'id' in body && typeof body.id === 'string' ? body.id : '';
  const displayName = 'displayName' in body && typeof body.displayName === 'string'
    ? body.displayName.trim()
    : undefined;
  const role = 'role' in body ? body.role : undefined;
  const isBlocked = 'isBlocked' in body ? body.isBlocked : undefined;

  if (!id || (displayName === undefined && role === undefined && isBlocked === undefined)) {
    return NextResponse.json({ error: 'Vyber účet a změnu, kterou chceš provést.' }, { status: 400 });
  }
  if (displayName !== undefined && (!displayName || displayName.length > 60)) {
    return NextResponse.json({ error: 'Jméno musí mít 1 až 60 znaků.' }, { status: 400 });
  }
  if (role !== undefined && role !== 'admin' && role !== 'user') {
    return NextResponse.json({ error: 'Zadaná role není platná.' }, { status: 400 });
  }
  if (isBlocked !== undefined && typeof isBlocked !== 'boolean') {
    return NextResponse.json({ error: 'Stav blokace není platný.' }, { status: 400 });
  }

  try {
    const user = await updateManagedUser(id, currentUser.id, { displayName, role, isBlocked });
    if (isBlocked === true || role === 'user') {
      await deleteAuthSessionsForUser(user.id);
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        isBlocked: user.isBlocked ?? false,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Uživatele se nepodařilo upravit.';
    const status = message === 'Uživatel nebyl nalezen.' ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request) {
  const currentUser = await getAuthenticatedUser(request);
  if (!currentUser) {
    return NextResponse.json({ error: 'Přihlášení vypršelo. Přihlas se prosím znovu.' }, { status: 401 });
  }
  if (currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'K této části nemáš přístup.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Požadavek není platný.' }, { status: 400 });
  }

  const id = body && typeof body === 'object' && 'id' in body && typeof body.id === 'string'
    ? body.id
    : '';
  if (!id) {
    return NextResponse.json({ error: 'Chybí účet, který chceš smazat.' }, { status: 400 });
  }

  try {
    const user = await deleteManagedUser(id, currentUser.id);
    await deleteAuthSessionsForUser(user.id);
    return NextResponse.json({ message: 'Uživatel byl smazán.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Uživatele se nepodařilo smazat.';
    const status = message === 'Uživatel nebyl nalezen.' ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
