import type {
  MobileCacheScopeOptions,
  QuerySnapshotEntry,
  QuerySnapshotReadOptions,
  QuerySnapshotWriteInput,
} from "@tuanchat/local-db";

import { Platform } from "react-native";

import { getMobileQuerySnapshotRepository } from "./mobile-local-db";

const WEB_KEY_PREFIX = "tuanchat.mobile.querySnapshot";

// 移动端 query snapshot 是恢复快照，不是业务事实源；query 成功后由网络数据重新写入。
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

function parseWebSnapshot<T>(
  key: string,
  raw: string | null,
  options: QuerySnapshotReadOptions = {},
): QuerySnapshotEntry<T> | null {
  if (!raw) {
    return null;
  }

  const storageKey = getWebStorageKey(key, options);
  try {
    const parsed = JSON.parse(raw) as {
      expiresAt?: unknown;
      payload?: unknown;
      updatedAt?: unknown;
    };
    const expiresAt = typeof parsed.expiresAt === "number" ? parsed.expiresAt : null;
    if (expiresAt !== null && expiresAt <= (options.now ?? Date.now())) {
      window.localStorage.removeItem(storageKey);
      return null;
    }

    return {
      expiresAt,
      key,
      payload: parsed.payload as T,
      scope: normalizeScope(options.scope),
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
      userId: normalizeUserId(options.userId) || null,
    };
  }
  catch {
    window.localStorage.removeItem(storageKey);
    return null;
  }
}

export async function readMobileQuerySnapshot<T>(
  key: string,
  options: QuerySnapshotReadOptions = {},
): Promise<QuerySnapshotEntry<T> | null> {
  if (isWebStorageAvailable()) {
    return parseWebSnapshot<T>(key, window.localStorage.getItem(getWebStorageKey(key, options)), options);
  }

  const repository = await getMobileQuerySnapshotRepository();
  return repository.readSnapshot<T>(key, options);
}

export async function writeMobileQuerySnapshot<T>(input: QuerySnapshotWriteInput<T>) {
  if (isWebStorageAvailable()) {
    const now = input.now ?? Date.now();
    const expiresAt = input.expiresAt === undefined
      ? typeof input.ttlMs === "number" ? now + input.ttlMs : null
      : input.expiresAt;
    window.localStorage.setItem(
      getWebStorageKey(input.key, input),
      JSON.stringify({
        expiresAt,
        payload: input.payload,
        updatedAt: now,
      }),
    );
    return;
  }

  const repository = await getMobileQuerySnapshotRepository();
  await repository.writeSnapshot(input);
}

export async function removeMobileQuerySnapshot(key: string, options: MobileCacheScopeOptions = {}) {
  if (isWebStorageAvailable()) {
    window.localStorage.removeItem(getWebStorageKey(key, options));
    return;
  }

  const repository = await getMobileQuerySnapshotRepository();
  await repository.removeSnapshot(key, options);
}

export async function removeMobileQuerySnapshotsByPrefix(prefix: string, options: MobileCacheScopeOptions = {}) {
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

  const repository = await getMobileQuerySnapshotRepository();
  await repository.removeSnapshotsByPrefix(prefix, options);
}

export async function removeExpiredMobileQuerySnapshots(now = Date.now()) {
  if (isWebStorageAvailable()) {
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(WEB_KEY_PREFIX)) {
        continue;
      }
      const raw = window.localStorage.getItem(key);
      try {
        const parsed = raw ? JSON.parse(raw) as { expiresAt?: unknown } : null;
        if (typeof parsed?.expiresAt === "number" && parsed.expiresAt <= now) {
          window.localStorage.removeItem(key);
        }
      }
      catch {
        window.localStorage.removeItem(key);
      }
    }
    return;
  }

  const repository = await getMobileQuerySnapshotRepository();
  await repository.removeExpiredSnapshots(now);
}

export async function clearMobileUserQuerySnapshots(userId: number) {
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

  const repository = await getMobileQuerySnapshotRepository();
  await repository.clearUserSnapshots(userId);
}
