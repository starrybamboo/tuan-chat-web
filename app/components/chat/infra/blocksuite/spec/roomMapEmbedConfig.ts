import { EmbedIframeConfigExtension } from "@blocksuite/affine-shared/services";

const ROOM_MAP_PATH_REGEX = /^\/room-map\/\d+\/\d+(?:\/|$)/;
const ROOM_MAP_URL_REGEX = /^(?:https?:\/\/[^/]+)?\/room-map\/\d+\/\d+(?:[/?#].*)?$/i;
const FALLBACK_ORIGIN = "http://localhost";

export function isRoomMapUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl, FALLBACK_ORIGIN);
    return ROOM_MAP_PATH_REGEX.test(url.pathname);
  }
  catch {
    return false;
  }
}

export function normalizeRoomMapUrl(rawUrl: string): string | null {
  try {
    const base = typeof window === "undefined" ? FALLBACK_ORIGIN : window.location.origin;
    const url = new URL(rawUrl, base);
    if (!ROOM_MAP_PATH_REGEX.test(url.pathname)) {
      return null;
    }
    return url.toString();
  }
  catch {
    return null;
  }
}

export const RoomMapEmbedIframeConfigExtension = EmbedIframeConfigExtension({
  name: "tuan-chat-room-map",
  match: isRoomMapUrl,
  buildOEmbedUrl: (rawUrl: string) => normalizeRoomMapUrl(rawUrl) ?? undefined,
  useOEmbedUrlDirectly: true,
  options: {
    widthInSurface: 960,
    heightInSurface: 640,
    heightInNote: 560,
    widthPercent: 100,
    style: "border: none; border-radius: 12px; overflow: hidden;",
    allow: "clipboard-read; clipboard-write; fullscreen",
    allowFullscreen: true,
    referrerpolicy: "no-referrer-when-downgrade",
  },
});

export { ROOM_MAP_URL_REGEX };
