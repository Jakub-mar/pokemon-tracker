import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

type StoredSession = {
  tokenHash: string;
  userId: string;
  expiresAt: string;
};

function isStoredSession(value: unknown): value is StoredSession {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return (
    'tokenHash' in value &&
    typeof value.tokenHash === 'string' &&
    'userId' in value &&
    typeof value.userId === 'string' &&
    'expiresAt' in value &&
    typeof value.expiresAt === 'string'
  );
}

const SESSIONS_FILE = path.join(process.cwd(), 'data', 'sessions.json');
export const AUTH_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

async function readSessions(): Promise<StoredSession[]> {
  await fs.mkdir(path.dirname(SESSIONS_FILE), { recursive: true });

  try {
    const content = await fs.readFile(SESSIONS_FILE, 'utf8');
    const parsed: unknown = JSON.parse(content.replace(/^\uFEFF/, ''));
    if (!Array.isArray(parsed) || !parsed.every(isStoredSession)) {
      throw new Error('Soubor přihlašovacích relací má neplatný formát.');
    }
    return parsed;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      await fs.writeFile(SESSIONS_FILE, '[]', 'utf8');
      return [];
    }
    throw error;
  }
}

async function writeSessions(sessions: StoredSession[]) {
  await fs.writeFile(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf8');
}

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createAuthSession(userId: string) {
  const sessions = await readSessions();
  const now = Date.now();
  const expiresAt = new Date(now + AUTH_SESSION_MAX_AGE_SECONDS * 1000).toISOString();
  const token = crypto.randomBytes(32).toString('hex');
  const activeSessions = sessions.filter((session) => Date.parse(session.expiresAt) > now);
  activeSessions.push({ tokenHash: hashToken(token), userId, expiresAt });
  await writeSessions(activeSessions);

  return { token, expiresAt };
}

export async function findAuthSession(token: string) {
  const sessions = await readSessions();
  const tokenHash = hashToken(token);
  const session = sessions.find(
    (storedSession) =>
      storedSession.tokenHash === tokenHash && Date.parse(storedSession.expiresAt) > Date.now(),
  );

  return session ?? null;
}

export async function deleteAuthSession(token: string) {
  const sessions = await readSessions();
  const tokenHash = hashToken(token);
  await writeSessions(sessions.filter((session) => session.tokenHash !== tokenHash));
}

export async function deleteAuthSessionsForUser(userId: string) {
  const sessions = await readSessions();
  await writeSessions(sessions.filter((session) => session.userId !== userId));
}

export async function deleteOtherAuthSessions(userId: string, currentToken: string) {
  const sessions = await readSessions();
  const currentTokenHash = hashToken(currentToken);
  await writeSessions(
    sessions.filter(
      (session) => session.userId !== userId || session.tokenHash === currentTokenHash,
    ),
  );
}
