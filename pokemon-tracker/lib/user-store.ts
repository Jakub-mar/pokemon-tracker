import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

export type StoredUser = {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  displayName: string;
  role: 'admin' | 'user';
  createdAt: string;
};

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

async function ensureUsersFile() {
  const dir = path.dirname(USERS_FILE);
  await fs.mkdir(dir, { recursive: true });

  try {
    await fs.access(USERS_FILE);
  } catch {
    const seedUsers: StoredUser[] = [
      {
        id: crypto.randomUUID(),
        username: 'admin',
        email: 'admin@poketracker.cz',
        displayName: 'Admin',
        role: 'admin',
        passwordHash: hashPassword('Admin123!'),
        createdAt: new Date().toISOString(),
      },
    ];

    await fs.writeFile(USERS_FILE, JSON.stringify(seedUsers, null, 2), 'utf8');
  }
}

export async function readUsers(): Promise<StoredUser[]> {
  await ensureUsersFile();

  const content = await fs.readFile(USERS_FILE, 'utf8');

  try {
    const normalizedContent = content.replace(/^\uFEFF/, '');
    const parsed = JSON.parse(normalizedContent);
    const users = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object'
        ? [parsed]
        : [];

    if (!users.length) {
      const adminUser: StoredUser = {
        id: crypto.randomUUID(),
        username: 'admin',
        email: 'admin@poketracker.cz',
        displayName: 'Admin',
        role: 'admin',
        passwordHash: hashPassword('Admin123!'),
        createdAt: new Date().toISOString(),
      };

      await writeUsers([adminUser]);
      return [adminUser];
    }

    return users as StoredUser[];
  } catch {
    return [];
  }
}

export async function writeUsers(users: StoredUser[]) {
  await ensureUsersFile();
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

export function hashPassword(password: string) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function findUserByEmail(email: string) {
  const users = await readUsers();
  return users.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

export async function findUserByUsername(username: string) {
  const users = await readUsers();
  return users.find((user) => user.username.toLowerCase() === username.toLowerCase());
}

export async function createUser(input: { username: string; email: string; password: string }) {
  const users = await readUsers();

  if (users.some((user) => user.email.toLowerCase() === input.email.toLowerCase())) {
    throw new Error('Uživatel s tímto e-mailem již existuje.');
  }

  if (users.some((user) => user.username.toLowerCase() === input.username.toLowerCase())) {
    throw new Error('Uživatelské jméno je již zabrané.');
  }

  const newUser: StoredUser = {
    id: crypto.randomUUID(),
    username: input.username.trim(),
    email: input.email.trim(),
    displayName: input.username.trim(),
    role: 'user',
    passwordHash: hashPassword(input.password),
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  await writeUsers(users);

  return newUser;
}

export async function verifyUserLogin(email: string, password: string) {
  const user = await findUserByEmail(email);

  if (!user) {
    throw new Error('Uživatel neexistuje.');
  }

  if (user.passwordHash !== hashPassword(password)) {
    throw new Error('Nesprávné heslo.');
  }

  return user;
}
