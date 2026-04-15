import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const AUTH_SESSION_STORAGE_KEY = "tuanchat.mobile.auth.session";

export type StoredAuthSession = {
  token: string;
  userId?: number;
  username?: string;
};

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
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredAuthSession>;
    const token = typeof parsed.token === "string" ? parsed.token.trim() : "";
    if (!token) {
      return null;
    }

    return {
      token,
      userId: typeof parsed.userId === "number" && parsed.userId > 0 ? parsed.userId : undefined,
      username: typeof parsed.username === "string" && parsed.username.trim().length > 0
        ? parsed.username.trim()
        : undefined,
    };
  }
  catch {
    return null;
  }
}

export async function getStoredAuthToken() {
  return (await readStoredAuthSession())?.token ?? null;
}

export async function writeStoredAuthSession(session: StoredAuthSession) {
  await writeAuthSessionRaw(JSON.stringify(session));
}

export async function clearStoredAuthSession() {
  if (isWebStorageAvailable()) {
    window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(AUTH_SESSION_STORAGE_KEY);
}
