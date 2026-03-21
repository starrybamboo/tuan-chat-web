import { useChatComposerStore } from "@/components/chat/stores/chatComposerStore";
import {
  areAnnotationsEqual,
  normalizeAnnotations,
} from "@/types/messageAnnotations";

export type MediaAnnotationPreferenceType = "image" | "audio";

type RoomMediaAnnotationPreference = {
  image?: string[];
  audio?: string[];
  updatedAt: number;
};

type RoomMediaAnnotationPreferenceMap = Record<string, RoomMediaAnnotationPreference>;

const STORAGE_KEY = "tc:chat:room-media-annotation-preferences";

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readPreferenceMap(): RoomMediaAnnotationPreferenceMap {
  if (!canUseLocalStorage()) {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as RoomMediaAnnotationPreferenceMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  }
  catch {
    return {};
  }
}

function writePreferenceMap(next: RoomMediaAnnotationPreferenceMap) {
  if (!canUseLocalStorage()) {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  catch {
    // ignore
  }
}

function getRoomPreferenceRecord(map: RoomMediaAnnotationPreferenceMap, roomId: number) {
  return map[String(roomId)];
}

export function getRoomMediaAnnotationPreference(roomId: number, mediaType: MediaAnnotationPreferenceType) {
  if (!(roomId > 0)) {
    return undefined;
  }
  const map = readPreferenceMap();
  const record = getRoomPreferenceRecord(map, roomId);
  if (!record || !(mediaType in record)) {
    return undefined;
  }
  const raw = record[mediaType];
  return normalizeAnnotations(Array.isArray(raw) ? raw : []);
}

export function setRoomMediaAnnotationPreference(
  roomId: number,
  mediaType: MediaAnnotationPreferenceType,
  annotations: string[],
) {
  if (!(roomId > 0)) {
    return;
  }
  const normalized = normalizeAnnotations(annotations);
  const map = readPreferenceMap();
  const roomKey = String(roomId);
  const prev = map[roomKey];
  const prevValue = Array.isArray(prev?.[mediaType]) ? normalizeAnnotations(prev[mediaType] ?? []) : undefined;
  if (prevValue && areAnnotationsEqual(prevValue, normalized)) {
    return;
  }
  map[roomKey] = {
    ...(prev ?? { updatedAt: 0 }),
    [mediaType]: normalized,
    updatedAt: Date.now(),
  };
  writePreferenceMap(map);
}

export function resolveTempAnnotationsForMedia(
  roomId: number,
  mediaType: MediaAnnotationPreferenceType,
) {
  const preferred = getRoomMediaAnnotationPreference(roomId, mediaType);
  return preferred ?? [];
}

export function applyRoomMediaAnnotationPreferenceToComposer(roomId: number, mediaType: MediaAnnotationPreferenceType) {
  const state = useChatComposerStore.getState();
  const next = resolveTempAnnotationsForMedia(roomId, mediaType);
  if (!areAnnotationsEqual(state.tempAnnotations, next)) {
    state.setTempAnnotations(next);
  }
  state.setTempAnnotationPreferenceSource(mediaType);
}
