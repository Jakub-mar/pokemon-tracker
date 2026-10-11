import { NextResponse } from 'next/server';
import { verifyUserLogin } from '@/lib/user-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? '').trim();
    const password = String(body.password ?? '');

    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail a heslo jsou povinné.' }, { status: 400 });
    }

    const user = await verifyUserLogin(email, password);

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Přihlášení se nepodařilo.' },
      { status: 401 },
    );
  }
}
