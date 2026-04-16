import {
  deleteAsync,
  documentDirectory,
  EncodingType,
  getInfoAsync,
  makeDirectoryAsync,
  readAsStringAsync,
  writeAsStringAsync,
} from "expo-file-system/legacy";
import { Platform } from "react-native";

import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";

import { buildStoredRoomMessageCache, sanitizeStoredRoomMessageCache } from "./mobileRoomMessageCacheUtils";

const ROOM_MESSAGE_CACHE_DIRECTORY_NAME = "tuanchat-mobile-room-messages";
const ROOM_MESSAGE_CACHE_STORAGE_KEY_PREFIX = "tuanchat.mobile.room-messages";

function isPositiveRoomId(roomId: number): boolean {
  return Number.isInteger(roomId) && roomId > 0;
}

function isWebStorageAvailable() {
  return Platform.OS === "web" && typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function buildRoomMessageCacheStorageKey(roomId: number) {
  return `${ROOM_MESSAGE_CACHE_STORAGE_KEY_PREFIX}.${roomId}`;
}

function buildNativeRoomMessageCacheDirectoryUri() {
  if (!documentDirectory) {
    return null;
  }

  return `${documentDirectory}${ROOM_MESSAGE_CACHE_DIRECTORY_NAME}`;
}

function buildNativeRoomMessageCacheFileUri(roomId: number) {
  const directoryUri = buildNativeRoomMessageCacheDirectoryUri();
  if (!directoryUri) {
    return null;
  }

  return `${directoryUri}/${roomId}.json`;
}

async function ensureNativeRoomMessageCacheDirectory() {
  const directoryUri = buildNativeRoomMessageCacheDirectoryUri();
  if (!directoryUri) {
    return null;
  }

  const directoryInfo = await getInfoAsync(directoryUri);
  if (!directoryInfo.exists) {
    await makeDirectoryAsync(directoryUri, {
      intermediates: true,
    });
  }

  return directoryUri;
}

async function readRoomMessageCacheRaw(roomId: number) {
  if (isWebStorageAvailable()) {
    return window.localStorage.getItem(buildRoomMessageCacheStorageKey(roomId));
  }

  const fileUri = buildNativeRoomMessageCacheFileUri(roomId);
  if (!fileUri) {
    return null;
  }

  const fileInfo = await getInfoAsync(fileUri);
  if (!fileInfo.exists) {
    return null;
  }

  return await readAsStringAsync(fileUri, {
    encoding: EncodingType.UTF8,
  });
}

async function writeRoomMessageCacheRaw(roomId: number, value: string) {
  if (isWebStorageAvailable()) {
    window.localStorage.setItem(buildRoomMessageCacheStorageKey(roomId), value);
    return;
  }

  await ensureNativeRoomMessageCacheDirectory();
  const fileUri = buildNativeRoomMessageCacheFileUri(roomId);
  if (!fileUri) {
    return;
  }

  await writeAsStringAsync(fileUri, value, {
    encoding: EncodingType.UTF8,
  });
}

export async function readCachedRoomMessages(roomId: number): Promise<ChatMessageResponse[]> {
  if (!isPositiveRoomId(roomId)) {
    return [];
  }

  try {
    const raw = await readRoomMessageCacheRaw(roomId);
    if (!raw) {
      return [];
    }

    const cached = sanitizeStoredRoomMessageCache(JSON.parse(raw));
    if (!cached || cached.roomId !== roomId) {
      return [];
    }

    return cached.messages;
  }
  catch {
    return [];
  }
}

export async function writeCachedRoomMessages(roomId: number, messages: ChatMessageResponse[]) {
  const cache = buildStoredRoomMessageCache(roomId, messages);
  if (!cache) {
    return;
  }

  await writeRoomMessageCacheRaw(roomId, JSON.stringify(cache));
}

export async function clearCachedRoomMessages(roomId: number) {
  if (!isPositiveRoomId(roomId)) {
    return;
  }

  if (isWebStorageAvailable()) {
    window.localStorage.removeItem(buildRoomMessageCacheStorageKey(roomId));
    return;
  }

  const fileUri = buildNativeRoomMessageCacheFileUri(roomId);
  if (!fileUri) {
    return;
  }

  const fileInfo = await getInfoAsync(fileUri);
  if (!fileInfo.exists) {
    return;
  }

  await deleteAsync(fileUri, {
    idempotent: true,
  });
}
