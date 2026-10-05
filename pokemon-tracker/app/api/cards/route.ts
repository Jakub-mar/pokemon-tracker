import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query')?.trim();

  if (!query) {
    return NextResponse.json({ error: 'Chybí vyhledávaný název.' }, { status: 400 });
  }

  const apiUrl = new URL('https://api.pokemontcg.io/v2/cards');
  apiUrl.searchParams.set('q', `name:${query}*`);
  apiUrl.searchParams.set('pageSize', '12');

  try {
    const response = await fetch(apiUrl, { next: { revalidate: 60 } });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Databáze karet je momentálně nedostupná.' },
        { status: 502 },
      );
    }

    const result = await response.json();
    return NextResponse.json(result.data ?? []);
  } catch {
    return NextResponse.json(
      { error: 'Databáze karet je momentálně nedostupná.' },
      { status: 502 },
    );
  }
}