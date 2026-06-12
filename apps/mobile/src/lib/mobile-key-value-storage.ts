import type { MobileCacheScopeOptions, MobileKeyValueEntry } from "@tuanchat/local-db";

import { Platform } from "react-native";

import { getMobileKeyValueRepository } from "./mobile-local-db";

const WEB_KEY_PREFIX = "tuanchat.mobile.kv";

type MobileKeyValueOptions = MobileCacheScopeOptions & {
  now?: number;
};

function isWebStorageAvailable() {
  return Platform.OS === "web" && typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeScope(scope: string | null | undefined) {
  return scope?.trim() ?? "";
}

function normalizeUserId(userId: number | null | undefined) {
  return Number.isInteger(userId) && Number(userId) > 0 ? Number(userId) : 0;
}

function getWebStorageKey(key: string, options: MobileCacheScopeOptions = {}) {
  return [
    WEB_KEY_PREFIX,
    normalizeUserId(options.userId),
    normalizeScope(options.scope),
    key,
  ].join(":");
}

function parseWebEntry<T>(key: string, raw: string | null, options: MobileCacheScopeOptions = {}): MobileKeyValueEntry<T> | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { updatedAt?: unknown; value?: unknown };
    return {
      key,
      scope: normalizeScope(options.scope),
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
      userId: normalizeUserId(options.userId) || null,
      value: parsed.value as T,
    };
  }
  catch {
    window.localStorage.removeItem(getWebStorageKey(key, options));
    return null;
  }
}

export async function readMobileKeyValue<T>(
  key: string,
  options: MobileCacheScopeOptions = {},
): Promise<MobileKeyValueEntry<T> | null> {
  if (isWebStorageAvailable()) {
    return parseWebEntry<T>(key, window.localStorage.getItem(getWebStorageKey(key, options)), options);
  }

  const repository = await getMobileKeyValueRepository();
  return repository.readValue<T>(key, options);
}

export async function writeMobileKeyValue<T>(
  key: string,
  value: T,
  options: MobileKeyValueOptions = {},
) {
  if (isWebStorageAvailable()) {
    window.localStorage.setItem(
      getWebStorageKey(key, options),
      JSON.stringify({ updatedAt: options.now ?? Date.now(), value }),
    );
    return;
  }

  const repository = await getMobileKeyValueRepository();
  await repository.writeValue(key, value, options);
}

export async function removeMobileKeyValue(key: string, options: MobileCacheScopeOptions = {}) {
  if (isWebStorageAvailable()) {
    window.localStorage.removeItem(getWebStorageKey(key, options));
    return;
  }

  const repository = await getMobileKeyValueRepository();
  await repository.removeValue(key, options);
}

export async function removeMobileKeyValuesByPrefix(prefix: string, options: MobileCacheScopeOptions = {}) {
  if (isWebStorageAvailable()) {
    const storagePrefix = getWebStorageKey(prefix, options);
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(storagePrefix)) {
        window.localStorage.removeItem(key);
      }
    }
    return;
  }

  const repository = await getMobileKeyValueRepository();
  await repository.removeValuesByPrefix(prefix, options);
}

export async function clearMobileUserKeyValues(userId: number) {
  if (isWebStorageAvailable()) {
    const userPrefix = `${WEB_KEY_PREFIX}:${normalizeUserId(userId)}:`;
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(userPrefix)) {
        window.localStorage.removeItem(key);
      }
    }
    return;
  }

  const repository = await getMobileKeyValueRepository();
  await repository.clearUserValues(userId);
}
