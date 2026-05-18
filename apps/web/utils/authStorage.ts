type TokenStorageMode = 'session' | 'local';

const TOKEN_KEY = 'access_token';
const ISSUED_AT_KEY = 'access_token_issued_at';
const LAST_ACTIVE_AT_KEY = 'access_token_last_active_at';

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};

const storageMode: TokenStorageMode =
  env.VITE_AUTH_TOKEN_STORAGE === 'local' ? 'local' : 'session';

const idleTimeoutMs = minutesToMs(env.VITE_AUTH_IDLE_TIMEOUT_MINUTES, 120);
const absoluteTimeoutMs = hoursToMs(env.VITE_AUTH_ABSOLUTE_TIMEOUT_HOURS, 8);

function minutesToMs(value: string | undefined, fallbackMinutes: number) {
  const minutes = Number(value ?? fallbackMinutes);
  return Number.isFinite(minutes) && minutes > 0 ? minutes * 60 * 1000 : fallbackMinutes * 60 * 1000;
}

function hoursToMs(value: string | undefined, fallbackHours: number) {
  const hours = Number(value ?? fallbackHours);
  return Number.isFinite(hours) && hours > 0 ? hours * 60 * 60 * 1000 : fallbackHours * 60 * 60 * 1000;
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;

  try {
    return storageMode === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function clearStorage(storage: Storage | null) {
  storage?.removeItem(TOKEN_KEY);
  storage?.removeItem(ISSUED_AT_KEY);
  storage?.removeItem(LAST_ACTIVE_AT_KEY);
}

function clearLegacyLocalToken() {
  if (typeof window === 'undefined' || storageMode === 'local') return;

  try {
    clearStorage(window.localStorage);
  } catch {
    // Ignore storage access failures.
  }
}

function readTimestamp(storage: Storage, key: string, fallback: number) {
  const value = Number(storage.getItem(key));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function isExpired(storage: Storage, now: number) {
  const issuedAt = readTimestamp(storage, ISSUED_AT_KEY, now);
  const lastActiveAt = readTimestamp(storage, LAST_ACTIVE_AT_KEY, issuedAt);

  return now - issuedAt > absoluteTimeoutMs || now - lastActiveAt > idleTimeoutMs;
}

export function getAuthToken(options: { touch?: boolean } = {}) {
  clearLegacyLocalToken();

  const storage = getStorage();
  if (!storage) return null;

  const token = storage.getItem(TOKEN_KEY);
  if (!token) return null;

  const now = Date.now();
  if (isExpired(storage, now)) {
    clearStorage(storage);
    return null;
  }

  if (options.touch ?? true) {
    storage.setItem(LAST_ACTIVE_AT_KEY, String(now));
  }

  return token;
}

export function setAuthToken(token: string) {
  clearAuthToken();

  const storage = getStorage();
  if (!storage) return;

  const now = Date.now();
  storage.setItem(TOKEN_KEY, token);
  storage.setItem(ISSUED_AT_KEY, String(now));
  storage.setItem(LAST_ACTIVE_AT_KEY, String(now));
}

export function clearAuthToken() {
  clearStorage(getStorage());

  if (typeof window === 'undefined') return;
  try {
    clearStorage(window.localStorage);
    clearStorage(window.sessionStorage);
  } catch {
    // Ignore storage access failures.
  }
}

export function hasAuthToken() {
  return Boolean(getAuthToken({ touch: false }));
}
