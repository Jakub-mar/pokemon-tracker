import { NextResponse } from 'next/server';
import { createAuthSession } from '@/lib/auth-session-store';
import { setAuthCookie } from '@/lib/auth-server';
import { createUser, findUserByEmail, findUserByUsername } from '@/lib/user-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = String(body.username ?? '').trim();
    const email = String(body.email ?? '').trim();
    const password = String(body.password ?? '');

    if (!username || !email || !password) {
      return NextResponse.json({ error: 'Uživatelské jméno, e-mail a heslo jsou povinné.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Heslo musí mít alespoň 6 znaků.' }, { status: 400 });
    }

    if (await findUserByEmail(email)) {
      return NextResponse.json({ error: 'Uživatel s tímto e-mailem již existuje.' }, { status: 409 });
    }

    if (await findUserByUsername(username)) {
      return NextResponse.json({ error: 'Uživatelské jméno je již zabrané.' }, { status: 409 });
    }

    const createdUser = await createUser({ username, email, password });
    const session = await createAuthSession(createdUser.id);
    const response = NextResponse.json({
      user: {
        id: createdUser.id,
        username: createdUser.username,
        email: createdUser.email,
        displayName: createdUser.displayName,
        role: createdUser.role,
      },
    });
    setAuthCookie(response, session.token);
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Registrace se nepodařila.' },
      { status: 500 },
    );
  }
}
