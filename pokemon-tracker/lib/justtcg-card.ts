type JustTcgCardIdentity = {
  name?: unknown;
  set_name?: unknown;
  number?: unknown;
};

function asString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[★☆*]/g, 'star').replace(/[^a-z0-9]/g, '');
}

export function normalizeJustTcgSearchName(value: string) {
  return value.replace(/[★☆*]/g, 'Star');
}

function normalizeCardNumber(value: string) {
  const cardNumber = normalize(value.split('/')[0]);
  return cardNumber.replace(/^0+(?=\d)/, '');
}

function matchesSet(candidate: string, requested: string) {
  const normalizedCandidate = normalize(candidate);
  const normalizedRequested = normalize(requested);
  return normalizedCandidate === normalizedRequested || normalizedCandidate.endsWith(normalizedRequested);
}

export function findMatchingJustTcgCard<T extends JustTcgCardIdentity>(
  cards: T[],
  name: string,
  setName: string,
  number: string,
) {
  const cardNumber = normalizeCardNumber(number);
  const identityMatches = cards.filter((card) => (
    matchesSet(asString(card.set_name), setName)
    && normalizeCardNumber(asString(card.number)) === cardNumber
  ));

  if (identityMatches.length === 1) return identityMatches[0];

  const nameMatches = identityMatches.filter((card) => (
    normalize(asString(card.name)) === normalize(name)
  ));
  return nameMatches.length === 1 ? nameMatches[0] : undefined;
}
