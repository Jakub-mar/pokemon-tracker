import { NextResponse } from 'next/server';
import { readUsers } from '@/lib/user-store';

export async function GET() {
  try {
    const users = await readUsers();

    return NextResponse.json({
      users: users.map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
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
