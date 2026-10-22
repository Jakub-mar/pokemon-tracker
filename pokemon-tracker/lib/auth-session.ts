'use client';

import { useMemo, useSyncExternalStore } from 'react';
import type { AppUser } from '@/types/user';

const STORAGE_KEY = 'pokemon-tracker-user';
const AUTH_CHANGE_EVENT = 'pokemon-tracker-auth-change';

function notifyAuthChange() {
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function saveAuthUser(user: AppUser) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  notifyAuthChange();
}

export function readAuthUser(): AppUser | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AppUser) : null;
  } catch {
    return null;
  }
}

function readAuthSnapshot() {
  return typeof window === 'undefined' ? null : window.localStorage.getItem(STORAGE_KEY);
}

export function clearAuthUser() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
  notifyAuthChange();
}

export function useAuthUser() {
  const rawUser = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener(AUTH_CHANGE_EVENT, onStoreChange);
      window.addEventListener('storage', onStoreChange);
      return () => {
        window.removeEventListener(AUTH_CHANGE_EVENT, onStoreChange);
        window.removeEventListener('storage', onStoreChange);
      };
    },
    readAuthSnapshot,
    () => null,
  );

  return useMemo(() => {
    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser) as AppUser;
    } catch {
      return null;
    }
  }, [rawUser]);
}
