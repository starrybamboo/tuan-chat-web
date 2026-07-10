import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const AUTH_SESSION_STORAGE_KEY = "tuanchat.mobile.auth.session";
let cachedAuthSession: StoredAuthSession | null | undefined;

export type StoredAuthSession = {
  token: string;
  userId?: number;
  username?: string;
};

function cacheAuthSession(session: StoredAuthSession | null) {
  cachedAuthSession = session;
}

function isWebStorageAvailable() {
  return Platform.OS === "web" && typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

async function readAuthSessionRaw() {
  if (isWebStorageAvailable()) {
    return window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
  }

  return SecureStore.getItemAsync(AUTH_SESSION_STORAGE_KEY);
}

async function writeAuthSessionRaw(value: string) {
  if (isWebStorageAvailable()) {
    window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, value);
    return;
  }

  await SecureStore.setItemAsync(AUTH_SESSION_STORAGE_KEY, value);
}

export async function readStoredAuthSession(): Promise<StoredAuthSession | null> {
  const raw = await readAuthSessionRaw();
  if (!raw) {
    cacheAuthSession(null);
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredAuthSession>;
    const token = typeof parsed.token === "string" ? parsed.token.trim() : "";
    if (!token) {
      cacheAuthSession(null);
      return null;
    }

    const session = {
      token,
      userId: typeof parsed.userId === "number" && parsed.userId > 0 ? parsed.userId : undefined,
      username: typeof parsed.username === "string" && parsed.username.trim().length > 0
        ? parsed.username.trim()
        : undefined,
    };
    cacheAuthSession(session);
    return session;
  }
  catch {
    cacheAuthSession(null);
    return null;
  }
}

export async function getStoredAuthToken() {
  if (cachedAuthSession !== undefined) {
    return cachedAuthSession?.token ?? null;
  }

  return (await readStoredAuthSession())?.token ?? null;
}

export async function writeStoredAuthSession(session: StoredAuthSession) {
  await writeAuthSessionRaw(JSON.stringify(session));
  cacheAuthSession(session);
}

export async function clearStoredAuthSession() {
  if (isWebStorageAvailable()) {
    window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    cacheAuthSession(null);
    return;
  }

  await SecureStore.deleteItemAsync(AUTH_SESSION_STORAGE_KEY);
  cacheAuthSession(null);
}
