import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const STORAGE_KEY = "tc:command-request-once:v1";
const STORAGE_LIMIT = 500;

function isWebStorageAvailable() {
  return Platform.OS === "web" && typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readRaw(): string | null {
  if (isWebStorageAvailable()) {
    return window.localStorage.getItem(STORAGE_KEY);
  }
  return SecureStore.getItem(STORAGE_KEY);
}

function writeRaw(value: string): void {
  if (isWebStorageAvailable()) {
    window.localStorage.setItem(STORAGE_KEY, value);
    return;
  }
  void SecureStore.setItemAsync(STORAGE_KEY, value);
}

function buildBucketKey(userId: number): string {
  const normalized = Number.isFinite(userId) && userId > 0 ? userId : 0;
  return String(normalized);
}

export function buildConsumeKey(roomId: number, messageId: number): string {
  return `${roomId}:${messageId}`;
}

export function readConsumedKeys(userId: number): Set<string> {
  try {
    const raw = readRaw();
    if (!raw)
      return new Set();
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const bucket = parsed?.[buildBucketKey(userId)];
    if (!Array.isArray(bucket))
      return new Set();
    return new Set(bucket.filter((item): item is string => typeof item === "string"));
  }
  catch {
    return new Set();
  }
}

export function writeConsumedKeys(userId: number, keys: Set<string>): void {
  try {
    const raw = readRaw();
    const parsed = raw ? JSON.parse(raw) as Record<string, unknown> : {};
    parsed[buildBucketKey(userId)] = Array.from(keys).slice(-STORAGE_LIMIT);
    writeRaw(JSON.stringify(parsed));
  }
  catch {
    // ignore persistence failure
  }
}
