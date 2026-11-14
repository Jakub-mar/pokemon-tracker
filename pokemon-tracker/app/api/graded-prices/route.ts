import { NextRequest, NextResponse } from 'next/server';

type PriceChartingProduct = {
  id?: unknown;
  'product-name'?: unknown;
  'console-name'?: unknown;
  'loose-price'?: unknown;
  [key: string]: unknown;
};

type PriceChartingSearchResponse = {
  status?: unknown;
  products?: unknown;
};

class PriceChartingRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const priceFields = [
  { grade: 7, field: 'grade-7-price' },
  { grade: 8, field: 'grade-8-price' },
  { grade: 9, field: 'grade-9-price' },
  { grade: 9.5, field: 'grade-9.5-price' },
  { grade: 10, field: 'grade-10-price' },
];

function asString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeCardNumber(value: string) {
  const number = normalize(value.split('/')[0]);
  return number.replace(/^0+(?=\d)/, '');
}

function parsePrice(value: unknown) {
  const amount = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number(value.replace(/[$,\s]/g, ''))
      : Number.NaN;

  return Number.isFinite(amount) && amount > 0 ? amount / 100 : null;
}

function matchesSet(candidate: string, requested: string) {
  const normalizedCandidate = normalize(candidate);
  const normalizedRequested = normalize(requested);
  if (normalizedCandidate.includes(normalizedRequested)) return true;

  const requestedTokens = requested.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  if (!requestedTokens.length) return false;
  const candidateTokens = new Set(candidate.toLowerCase().match(/[a-z0-9]+/g) ?? []);
  const sharedTokens = requestedTokens.filter((token) => candidateTokens.has(token)).length;
  return sharedTokens >= Math.min(2, requestedTokens.length)
    && sharedTokens / requestedTokens.length >= 0.5;
}

function findMatchingProduct(
  products: PriceChartingProduct[],
  name: string,
  setName: string,
  number: string,
) {
  const normalizedName = normalize(name);
  const normalizedNumber = normalizeCardNumber(number);

  return products.find((product) => {
    const productName = asString(product['product-name']);
    const consoleName = asString(product['console-name']);
    const productNumber = productName.match(/#\s*([a-z0-9][a-z0-9./-]*)/i)?.[1] ?? '';

    return normalize(productName).includes(normalizedName)
      && normalizeCardNumber(productNumber) === normalizedNumber
      && matchesSet(consoleName, setName);
  });
}

async function priceChartingRequest(
  path: string,
  params: Record<string, string>,
  token: string,
) {
  const url = new URL(`https://www.pricecharting.com/api/${path}`);
  Object.entries({ ...params, t: token }).forEach(([key, value]) => url.searchParams.set(key, value));

  let response: Response;
  try {
    response = await fetch(url, { next: { revalidate: 1800 } });
  } catch {
    throw new PriceChartingRequestError('PriceCharting se nepodařilo kontaktovat.', 502);
  }

  if (!response.ok) {
    const message = response.status === 401 || response.status === 403
      ? 'PriceCharting odmítlo API token. Ověř token a přístup k API ve svém tarifu.'
      : response.status === 429
        ? 'PriceCharting omezilo počet požadavků. Zkus to později.'
        : `PriceCharting vrátilo chybu (${response.status}).`;
    throw new PriceChartingRequestError(message, response.status === 429 ? 429 : 502);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new PriceChartingRequestError('PriceCharting vrátilo neplatná cenová data.', 502);
  }

  if (!payload || typeof payload !== 'object' || !('status' in payload)) {
    throw new PriceChartingRequestError('PriceCharting vrátilo neočekávanou odpověď.', 502);
  }

  if (payload.status !== 'success') {
    throw new PriceChartingRequestError('PriceCharting požadavek nedokončilo.', 502);
  }

  return payload;
}

async function searchProducts(query: string, token: string) {
  const payload = await priceChartingRequest('products', { q: query }, token) as PriceChartingSearchResponse;
  return Array.isArray(payload.products) ? payload.products as PriceChartingProduct[] : [];
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const name = searchParams.get('name')?.trim();
  const setName = searchParams.get('set')?.trim();
  const number = searchParams.get('number')?.trim();

  if (!name || !setName || !number) {
    return NextResponse.json({ error: 'Chybí název, edice nebo číslo karty.' }, { status: 400 });
  }

  const token = process.env.PRICECHARTING_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: 'Na serveru není nastavený PRICECHARTING_API_TOKEN. Přidej svůj PriceCharting API token do .env.local a restartuj aplikaci.' },
      { status: 503 },
    );
  }

  try {
    const query = `${name} #${number} ${setName}`;
    let matchedProduct = findMatchingProduct(
      await searchProducts(query, token),
      name,
      setName,
      number,
    );

    if (!matchedProduct) {
      matchedProduct = findMatchingProduct(
        await searchProducts(`${name} #${number}`, token),
        name,
        setName,
        number,
      );
    }

    const productId = asString(matchedProduct?.id);
    if (!productId) {
      return NextResponse.json(
        { error: 'PriceCharting nenašlo přesnou shodu karty, edice a čísla.' },
        { status: 404 },
      );
    }

    const product = await priceChartingRequest('product', { id: productId }, token) as PriceChartingProduct;
    const variants = [
      {
        id: `${productId}-raw`,
        type: 'raw',
        printing: 'Normal',
        grade: null,
        label: 'Neohodnocená',
        price: parsePrice(product['loose-price']),
      },
      ...priceFields.map(({ grade, field }) => ({
        id: `${productId}-psa-${grade}`,
        type: 'graded',
        printing: 'Normal',
        grade,
        label: `PSA ${grade}`,
        price: parsePrice(product[field]),
      })),
    ];

    return NextResponse.json({ variants });
  } catch (error) {
    if (error instanceof PriceChartingRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('PriceCharting graded price lookup failed.');
    return NextResponse.json({ error: 'Ceny z PriceCharting se nepodařilo načíst.' }, { status: 502 });
  }
}
