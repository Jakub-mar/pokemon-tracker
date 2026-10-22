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
  isBlocked?: boolean;
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
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function passwordsMatch(password: string, passwordHash: string) {
  if (passwordHash.startsWith('scrypt$')) {
    const [, salt, storedHash] = passwordHash.split('$');

    if (!salt || !storedHash) {
      return false;
    }

    const actualHash = crypto.scryptSync(password, salt, 64);
    const expectedHash = Buffer.from(storedHash, 'hex');
    return actualHash.length === expectedHash.length && crypto.timingSafeEqual(actualHash, expectedHash);
  }

  const actualHash = crypto.createHash('sha256').update(password).digest();
  const expectedHash = Buffer.from(passwordHash, 'hex');
  return actualHash.length === expectedHash.length && crypto.timingSafeEqual(actualHash, expectedHash);
}

export async function findUserByEmail(email: string) {
  const users = await readUsers();
  return users.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

export async function findUserByUsername(username: string) {
  const users = await readUsers();
  return users.find((user) => user.username.toLowerCase() === username.toLowerCase());
}

export async function findUserById(id: string) {
  const users = await readUsers();
  return users.find((user) => user.id === id);
}

export async function updateUserDisplayName(id: string, displayName: string) {
  const users = await readUsers();
  const user = users.find((storedUser) => storedUser.id === id);

  if (!user) {
    throw new Error('Uživatelský účet nebyl nalezen.');
  }

  user.displayName = displayName;
  await writeUsers(users);
  return user;
}

export async function updateUserPassword(id: string, currentPassword: string, newPassword: string) {
  const users = await readUsers();
  const user = users.find((storedUser) => storedUser.id === id);

  if (!user) {
    throw new Error('Uživatelský účet nebyl nalezen.');
  }

  if (!passwordsMatch(currentPassword, user.passwordHash)) {
    throw new Error('Současné heslo není správné.');
  }

  user.passwordHash = hashPassword(newPassword);
  await writeUsers(users);
}

export async function updateManagedUser(
  id: string,
  actingAdminId: string,
  changes: { displayName?: string; role?: 'admin' | 'user'; isBlocked?: boolean },
) {
  const users = await readUsers();
  const user = users.find((storedUser) => storedUser.id === id);

  if (!user) {
    throw new Error('Uživatel nebyl nalezen.');
  }

  if (id === actingAdminId && (changes.role === 'user' || changes.isBlocked === true)) {
    throw new Error('Svůj vlastní účet nemůžeš zablokovat ani odebrat mu roli admina.');
  }

  if (user.role === 'admin' && changes.role === 'user') {
    const adminCount = users.filter((storedUser) => storedUser.role === 'admin').length;
    if (adminCount <= 1) {
      throw new Error('V systému musí zůstat alespoň jeden admin.');
    }
  }

  if (changes.displayName !== undefined) {
    user.displayName = changes.displayName;
  }
  if (changes.role !== undefined) {
    user.role = changes.role;
  }
  if (changes.isBlocked !== undefined) {
    user.isBlocked = changes.isBlocked;
  }

  await writeUsers(users);
  return user;
}

export async function deleteManagedUser(id: string, actingAdminId: string) {
  const users = await readUsers();
  const user = users.find((storedUser) => storedUser.id === id);

  if (!user) {
    throw new Error('Uživatel nebyl nalezen.');
  }

  if (id === actingAdminId) {
    throw new Error('Svůj vlastní účet nemůžeš smazat.');
  }

  if (user.role === 'admin' && users.filter((storedUser) => storedUser.role === 'admin').length <= 1) {
    throw new Error('V systému musí zůstat alespoň jeden admin.');
  }

  await writeUsers(users.filter((storedUser) => storedUser.id !== id));
  return user;
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
    isBlocked: false,
    passwordHash: hashPassword(input.password),
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  await writeUsers(users);

  return newUser;
}

export async function verifyUserLogin(email: string, password: string) {
  const users = await readUsers();
  const user = users.find((storedUser) => storedUser.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    throw new Error('Uživatel neexistuje.');
  }

  if (user.isBlocked) {
    throw new Error('Tento účet byl zablokován.');
  }

  if (!passwordsMatch(password, user.passwordHash)) {
    throw new Error('Nesprávné heslo.');
  }

  if (!user.passwordHash.startsWith('scrypt$')) {
    user.passwordHash = hashPassword(password);
    await writeUsers(users);
  }

  return user;
}
