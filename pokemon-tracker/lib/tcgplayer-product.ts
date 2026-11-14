type TcgplayerProduct = {
  productId?: unknown;
  name?: unknown;
};

type TcgplayerResponse = {
  success?: unknown;
  results?: unknown;
};

type TcgplayerCredentials = {
  publicKey: string;
  privateKey: string;
};

export class TcgplayerApiError extends Error {
  constructor(message: string) {
    super(message);
  }
}

const apiBase = 'https://api.tcgplayer.com/v1.39.0';
const productLookupCache = new Map<string, { productId: string; expiresAt: number }>();
let accessTokenCache: { value: string; expiresAt: number } | null = null;

function getCredentials(): TcgplayerCredentials | null {
  const publicKey = process.env.TCGPLAYER_PUBLIC_KEY?.trim();
  const privateKey = process.env.TCGPLAYER_PRIVATE_KEY?.trim();
  if (!publicKey && !privateKey) return null;
  if (!publicKey || !privateKey) {
    throw new TcgplayerApiError('Nastav obě proměnné TCGPLAYER_PUBLIC_KEY a TCGPLAYER_PRIVATE_KEY.');
  }
  return { publicKey, privateKey };
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[★☆*]/g, 'star').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

function normalizeCardNumber(value: string) {
  return normalize(value.split('/')[0]).replace(/^0+(?=\d)/, '');
}

async function getAccessToken(credentials: TcgplayerCredentials) {
  if (accessTokenCache && accessTokenCache.expiresAt > Date.now() + 60_000) {
    return accessTokenCache.value;
  }

  let response: Response;
  try {
    response = await fetch('https://api.tcgplayer.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: credentials.publicKey,
        client_secret: credentials.privateKey,
      }),
      cache: 'no-store',
    });
  } catch {
    throw new TcgplayerApiError('TCGplayer API se nepodařilo kontaktovat.');
  }

  if (!response.ok) {
    throw new TcgplayerApiError('TCGplayer odmítl API přístupové údaje.');
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new TcgplayerApiError('TCGplayer vrátil neplatnou odpověď při ověřování.');
  }

  if (
    !payload
    || typeof payload !== 'object'
    || !('access_token' in payload)
    || typeof payload.access_token !== 'string'
  ) {
    throw new TcgplayerApiError('TCGplayer nevrátil přístupový token.');
  }

  const expiresIn = 'expires_in' in payload && typeof payload.expires_in === 'number'
    ? payload.expires_in
    : 3600;
  accessTokenCache = {
    value: payload.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
  };
  return accessTokenCache.value;
}

async function readApiResponse(response: Response) {
  if (!response.ok) {
    throw new TcgplayerApiError(
      response.status === 401 || response.status === 403
        ? 'TCGplayer odmítl API přístupové údaje.'
        : response.status === 429
          ? 'TCGplayer omezil počet požadavků.'
          : `TCGplayer vrátil chybu (${response.status}).`,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new TcgplayerApiError('TCGplayer vrátil neplatná produktová data.');
  }

  if (
    !payload
    || typeof payload !== 'object'
    || !('success' in payload)
    || payload.success !== true
  ) {
    throw new TcgplayerApiError('TCGplayer požadavek nedokončil.');
  }

  return payload as TcgplayerResponse;
}

async function searchProducts(token: string, searchTerm: string, setName: string) {
  let response: Response;
  try {
    response = await fetch(`${apiBase}/catalog/categories/3/search`, {
      method: 'POST',
      headers: {
        Authorization: `bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        limit: 50,
        offset: 0,
        filters: [
          { name: 'ProductName', values: [searchTerm] },
          { name: 'SetName', values: [setName] },
        ],
      }),
      cache: 'no-store',
    });
  } catch {
    throw new TcgplayerApiError('Vyhledávání v TCGplayeru se nezdařilo.');
  }

  const payload = await readApiResponse(response);
  return Array.isArray(payload.results)
    ? payload.results.filter((id): id is number => typeof id === 'number' && Number.isInteger(id) && id > 0)
    : [];
}

async function getProducts(token: string, ids: number[]) {
  let response: Response;
  try {
    response = await fetch(`${apiBase}/catalog/products/${ids.join(',')}`, {
      headers: { Authorization: `bearer ${token}` },
      cache: 'no-store',
    });
  } catch {
    throw new TcgplayerApiError('Detail produktu z TCGplayeru se nepodařilo načíst.');
  }

  const payload = await readApiResponse(response);
  return Array.isArray(payload.results) ? payload.results as TcgplayerProduct[] : [];
}

function findProduct(products: TcgplayerProduct[], name: string, number: string) {
  const requestedNumber = normalizeCardNumber(number);
  const numberedProducts = products.filter((product) => {
    const tokens = asString(product.name).toLowerCase().match(/[a-z0-9]+/g) ?? [];
    return tokens.some((token) => normalizeCardNumber(token) === requestedNumber);
  });

  if (numberedProducts.length === 1) return numberedProducts[0];

  const normalizedName = normalize(name);
  const namedProducts = (numberedProducts.length ? numberedProducts : products).filter((product) => {
    const productName = normalize(asString(product.name));
    return productName.includes(normalizedName) || normalizedName.includes(productName);
  });
  if (namedProducts.length === 1) return namedProducts[0];
  if (!numberedProducts.length && products.length === 1) return products[0];
  return undefined;
}

export async function findTcgplayerProductId(name: string, setName: string, number: string) {
  const credentials = getCredentials();
  if (!credentials) return null;

  const cacheKey = `${normalize(name)}:${normalize(setName)}:${normalizeCardNumber(number)}`;
  const cachedProduct = productLookupCache.get(cacheKey);
  if (cachedProduct && cachedProduct.expiresAt > Date.now()) return cachedProduct.productId;

  const token = await getAccessToken(credentials);
  const normalizedSearchName = name.replace(/[★☆*]/g, 'Star').trim();
  const searchTerms = Array.from(new Set([
    normalizedSearchName,
    ...(normalizedSearchName.match(/[a-z0-9]+/gi) ?? []).filter((term) => term.length >= 3),
  ])).slice(0, 3);

  for (const searchTerm of searchTerms) {
    const productIds = await searchProducts(token, searchTerm, setName);
    if (!productIds.length) continue;

    const products = await getProducts(token, productIds);
    const product = findProduct(products, name, number);
    const productId = product?.productId;
    if (typeof productId !== 'number' && typeof productId !== 'string') continue;

    const result = String(productId);
    productLookupCache.set(cacheKey, { productId: result, expiresAt: Date.now() + 86_400_000 });
    return result;
  }

  return null;
}
